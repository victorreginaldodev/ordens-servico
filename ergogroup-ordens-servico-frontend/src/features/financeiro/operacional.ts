import { formatDate, formatDocumento, formatTelefone } from '@/lib/format';
import type { Campo } from './components/DadosDoLancamento';
import type { SituacaoFinanceiraOperacional } from './services';

/** De onde vem a cobrança: uma venda ou uma OS operacional (19/10/2026). */
export type Origem = 'venda' | 'oso';
export const ROTULO_DA_ORIGEM: Record<Origem, string> = { venda: 'Venda', oso: 'OS operacional' };

/** Campos do cliente para o lançamento, com copiar (os mesmos do "Faturar" da venda). */
export function camposDoCliente(s: SituacaoFinanceiraOperacional): Campo[] {
  const c = s.cliente;
  return [
    { rotulo: 'Razão social', valor: c.nome, copiar: true, forte: true },
    { rotulo: c.tipo_inscricao_display ?? 'Inscrição', valor: formatDocumento(c.tipo_inscricao, c.numero_inscricao, { withLabel: false }), copiar: true },
    { rotulo: 'Tipo de cliente', valor: c.tipo_cliente_display },
    { rotulo: 'Representante', valor: c.nome_representante, copiar: true },
    { rotulo: 'Setor do representante', valor: c.setor_representante },
    { rotulo: 'E-mail', valor: c.email_representante, copiar: true },
    { rotulo: 'Telefone', valor: formatTelefone(c.contato_representante), copiar: true },
    { rotulo: 'Situação', valor: c.ativo ? 'Ativo' : 'Inativo' },
  ];
}

/** O que cobrar: o item do catálogo operacional, a quantidade e a descrição, com a execução e a liberação. */
export function camposDoQueCobrar(s: SituacaoFinanceiraOperacional): Campo[] {
  return [
    { rotulo: 'OS operacional', valor: String(s.ordem_servico_operacional_id), copiar: true, forte: true },
    { rotulo: 'Serviço', valor: s.catalogo_operacional_nome.toLocaleUpperCase('pt-BR'), copiar: true, forte: true },
    { rotulo: 'Quantidade', valor: String(s.quantidade), copiar: true },
    { rotulo: 'Responsável', valor: s.responsavel_nome },
    { rotulo: 'Recebimento', valor: formatDate(s.data_recebimento) },
    { rotulo: 'Término', valor: formatDate(s.data_termino) },
    {
      rotulo: 'Liberada em',
      valor: s.liberada_para_cobranca_em
        ? `${formatDate(s.liberada_para_cobranca_em)}${s.liberada_para_cobranca_por_nome ? ` · ${s.liberada_para_cobranca_por_nome}` : ''}`
        : null,
    },
  ];
}

