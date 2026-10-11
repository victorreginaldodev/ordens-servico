import { formatCurrency, formatDate } from '@/lib/format';
import type { FormaPagamento, LiberarEm, TipoCondicao } from './services';

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
  recorrente: 'Recorrente',
};

export interface CamposDaCondicao {
  tipo_condicao: TipoCondicao;
  quantidade_parcelas?: number | string | null;
  intervalo_parcelas_dias?: number | string | null;
  valor_mensal?: string | null;
  dia_fechamento?: number | string | null;
  dia_vencimento?: number | string | null;
  data_acordada_cobranca?: string | null;
}

/**
 * Prévia do `condicao_resumo` do backend (`OrdemServico.condicao_resumo`), só para a revisão da nova venda.
 * Depois de salva, a tela mostra sempre o texto que vem da API.
 */
export function previaDaCondicao(c: CamposDaCondicao): string {
  const partes: string[] = [];
  if (c.tipo_condicao === 'parcelado') {
    partes.push(`Parcelado em ${c.quantidade_parcelas || '?'}x${c.intervalo_parcelas_dias ? ` a cada ${c.intervalo_parcelas_dias} dias` : ''}`);
  } else if (c.tipo_condicao === 'recorrente') {
    partes.push(`Recorrente: ${c.quantidade_parcelas || '?'} meses${c.valor_mensal ? ` de ${formatCurrency(c.valor_mensal)}` : ''}`);
    if (c.dia_fechamento) partes.push(`fecha dia ${c.dia_fechamento}`);
    if (c.dia_vencimento) partes.push(`vence dia ${c.dia_vencimento}`);
  } else {
    partes.push('À vista');
  }
  if (c.data_acordada_cobranca) partes.push(`1º vencimento ${formatDate(c.data_acordada_cobranca)}`);
  return partes.join(', ');
}

/** Regras do backend (`validar_condicao_pagamento`), conferidas antes de enviar. Devolve `{campo: mensagem}`. */
export function validarCondicao(c: CamposDaCondicao): Record<string, string> {
  const erros: Record<string, string> = {};
  const n = Number(c.quantidade_parcelas);
  if (c.tipo_condicao === 'parcelado') {
    if (!n || n < 2) erros.quantidade_parcelas = 'O parcelado precisa de pelo menos 2 parcelas.';
    if (!c.data_acordada_cobranca) erros.data_acordada_cobranca = 'Informe o primeiro vencimento.';
  } else if (c.tipo_condicao === 'recorrente') {
    if (!n || n < 1) erros.quantidade_parcelas = 'Informe o número de meses do recorrente.';
    if (!c.dia_vencimento) erros.dia_vencimento = 'Informe o dia de vencimento do recorrente.';
    if (!c.valor_mensal) erros.valor_mensal = 'Informe o valor mensal do recorrente.';
  }
  for (const campo of ['dia_fechamento', 'dia_vencimento'] as const) {
    const d = Number(c[campo]);
    if (c[campo] && (d < 1 || d > 31)) erros[campo] = 'Use um dia entre 1 e 31.';
  }
  return erros;
}
