import { formatCurrency, formatDate } from '@/lib/format';
import type { FormaPagamento, LiberarEm, TipoCondicao } from './services';

/**
 * Condição de pagamento da venda (ADR 0007, revisão de 13/10/2026): à vista ou parcelado. O vencimento
 * (no parcelado, o da 1ª parcela) é uma data combinada ou um número de dias após a emissão da nota.
 * As parcelas são sempre mensais, no mesmo dia do mês da 1ª. O sistema registra e avisa; quem controla
 * as parcelas é o sistema financeiro, fora daqui.
 */

/** Rótulos dos enums da venda (mesmos textos do backend). */
export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  boleto: 'Boleto',
  pix: 'PIX',
  transferencia: 'Transferência',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  outro: 'Outro',
};

export const LIBERAR_EM_LABEL: Record<LiberarEm, string> = {
  venda: 'Na venda',
  conclusao: 'Quando todos os serviços terminarem',
};

export const TIPO_CONDICAO_LABEL: Record<TipoCondicao, string> = {
  a_vista: 'À vista',
  parcelado: 'Parcelado',
};

/** Como o vencimento foi combinado. */
export type ModoDoVencimento = 'data' | 'apos_nota';

/** Parcelado: as parcelas da 2ª em diante vencem no mesmo dia do mês da 1ª ou num dia fixo (`dia_vencimento_demais`). */
export type ModoDasDemais = 'mesmo_dia' | 'dia_fixo';

export interface CamposDaCondicao {
  tipo_condicao: TipoCondicao;
  valor?: string | number | null;
  quantidade_parcelas?: number | string | null;
  data_acordada_cobranca?: string | null;
  vencimento_dias_apos_nota?: number | string | null;
  dia_vencimento_demais?: number | string | null;
}

/** "demais todo dia 10", ou null quando as demais vencem no mesmo dia do mês da 1ª. */
export function rotuloDasDemais(dia: number | string | null | undefined): string | null {
  const d = Number(dia);
  return d >= 1 && d <= 31 ? `demais todo dia ${d}` : null;
}

/** "10/08/2026", "21 dias após a nota" ou null. */
export function rotuloDoVencimento(c: { data_acordada_cobranca?: string | null; vencimento_dias_apos_nota?: number | string | null }): string | null {
  if (c.data_acordada_cobranca) return formatDate(c.data_acordada_cobranca);
  const dias = Number(c.vencimento_dias_apos_nota);
  if (dias) return `${dias} dia${dias > 1 ? 's' : ''} após a nota`;
  return null;
}

/** Valor de cada parcela, quando dá para calcular. */
export function valorDaParcela(c: CamposDaCondicao): number | null {
  const n = Number(c.quantidade_parcelas);
  const v = Number(c.valor);
  return c.tipo_condicao === 'parcelado' && n >= 2 && v > 0 ? v / n : null;
}

/**
 * As datas das parcelas, só para conferir (o sistema não controla parcelas). Regras decididas em 14/10/2026
 * (`faturamento/03`, seção 8.3): a 1ª é a data combinada; a 2ª em diante vence todo mês, no mesmo dia do mês da 1ª
 * ou no `diaDemais`, a começar no mês seguinte ao da 1ª; um dia que não existe no mês (ex.: 31) vira o último dia.
 */
export function datasDasParcelas(primeira: string, quantidade: number, diaDemais?: number | null): string[] {
  const [a, m, d] = primeira.split('-').map(Number);
  if (!a || !m || !d || quantidade < 1) return [];
  const dia = diaDemais && diaDemais >= 1 && diaDemais <= 31 ? diaDemais : d;
  return Array.from({ length: Math.min(quantidade, 60) }, (_, i) => {
    const alvo = i === 0 ? d : dia;
    const ultimoDia = new Date(a, m - 1 + i + 1, 0).getDate();
    const data = new Date(a, m - 1 + i, Math.min(alvo, ultimoDia));
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  });
}

/**
 * Prévia do `condicao_resumo` do backend (`OrdemServico.condicao_resumo`), só para a nova venda.
 * Depois de salva, a tela mostra sempre o texto que vem da API.
 */
export function previaDaCondicao(c: CamposDaCondicao): string {
  const vencimento = rotuloDoVencimento(c);
  if (c.tipo_condicao === 'parcelado') {
    const parcela = valorDaParcela(c);
    let texto = `Parcelado em ${c.quantidade_parcelas || '?'}x${parcela ? ` de ${formatCurrency(parcela)}` : ''} (mensais)`;
    if (vencimento) texto += `, 1ª parcela ${vencimento}`;
    const demais = rotuloDasDemais(c.dia_vencimento_demais);
    return demais ? `${texto}, ${demais}` : texto;
  }
  return vencimento ? `À vista, vence ${vencimento}` : 'À vista';
}

/** Regras do backend (`validar_condicao_pagamento`), conferidas antes de enviar. Devolve `{campo: mensagem}`. */
export function validarCondicao(c: CamposDaCondicao & { modo_vencimento: ModoDoVencimento; modo_demais?: ModoDasDemais }): Record<string, string> {
  const erros: Record<string, string> = {};
  const parcelado = c.tipo_condicao === 'parcelado';
  const n = Number(c.quantidade_parcelas);
  if (parcelado && (!n || n < 2)) erros.quantidade_parcelas = 'O parcelado precisa de pelo menos 2 parcelas.';
  if (c.modo_vencimento === 'data' && !c.data_acordada_cobranca) {
    erros.data_acordada_cobranca = parcelado ? 'Informe a data da 1ª parcela.' : 'Informe a data do vencimento.';
  }
  if (c.modo_vencimento === 'apos_nota') {
    const dias = Number(c.vencimento_dias_apos_nota);
    if (!dias || dias < 1 || dias > 365) erros.vencimento_dias_apos_nota = 'Informe de 1 a 365 dias após a nota.';
  }
  if (parcelado && c.modo_demais === 'dia_fixo') {
    const dia = Number(c.dia_vencimento_demais);
    if (!dia || dia < 1 || dia > 31) erros.dia_vencimento_demais = 'Informe um dia entre 1 e 31.';
  }
  return erros;
}

/**
 * Combinações que costumam dar problema, para avisar quem vende (não bloqueiam).
 * Ex.: a 1ª parcela vence numa data, mas o financeiro só é avisado quando os serviços terminarem.
 */
export function avisosDaCondicao(c: CamposDaCondicao & { modo_vencimento: ModoDoVencimento; liberar_em: LiberarEm }): string[] {
  const avisos: string[] = [];
  if (c.liberar_em === 'conclusao' && c.modo_vencimento === 'data' && c.data_acordada_cobranca) {
    avisos.push(
      `O vencimento é uma data fixa (${formatDate(c.data_acordada_cobranca)}), mas o financeiro só fica sabendo da venda quando todos os serviços terminarem. Se o serviço não terminar antes disso, a cobrança atrasa: escolha "Na venda" ou combine o vencimento em dias após a nota.`,
    );
  }
  if (c.liberar_em === 'venda' && c.modo_vencimento === 'apos_nota') {
    avisos.push('A nota é emitida logo depois da venda, então o prazo em dias começa a contar já na venda.');
  }
  return avisos;
}
