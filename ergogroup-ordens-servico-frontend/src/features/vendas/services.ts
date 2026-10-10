import api from '@/services/api';
import { comoLista, type ComValoresOcultaveis, type Esquemas, type FiltrosDe } from '@/api/tipos';

/**
 * A venda (OS) para o comercial: `/api/ordens-servico/ordens/` e `/api/comercial/` (backend, fases 7 e 9;
 * ADRs 0007 e 0008). A OS é o pacote comercial e a base do faturamento; a execução acontece nos serviços.
 *
 * Sem `financeiro.ver_valores`, valor e condição de pagamento somem da resposta (não vêm nulos) e são
 * ignorados na edição; na criação continuam aceitos, porque quem lança a venda informa a condição.
 */

const ORDENS = '/api/ordens-servico/ordens';

export type TipoCondicao = Esquemas['TipoCondicaoEnum'];
export type FormaPagamento = Esquemas['FormaPagamentoEnum'];
export type LiberarEm = Esquemas['LiberarEmEnum'];
export type StatusDaVenda = Esquemas['StatusOSETarefaEnum'];
export type Prioridade = Esquemas['PrioridadeEnum'];
export type Andamento = Esquemas['Andamento'];

/** Linha da lista de vendas, com o andamento da execução e quem vendeu. */
export type VendaDaLista = ComValoresOcultaveis<Esquemas['OrdemServicoList']>;
/** A venda completa (detalhe da OS). */
export type Venda = ComValoresOcultaveis<Esquemas['OrdemServico']>;
/** Resumo estruturado da venda; `condicoes` e `financeiro` vêm nulos sem `financeiro.ver_valores`. */
export type ResumoDaVenda = Esquemas['ResumoDaVenda'];
export type ServicoDoResumo = Esquemas['ServicoDoResumo'];

/**
 * Nova venda: dados, condição e os serviços vendidos, numa transação só. Ao final, o backend avisa por
 * e-mail os organizadores de cada setor que recebeu serviços. O catálogo precisa estar ativo.
 */
export type NovaVendaPayload = Esquemas['OrdemServicoRequest'];
export type ServicoVendidoPayload = Esquemas['ServicoDaVendaRequest'];
/** Edição: na edição `servicos` é somente leitura; use `acrescentarServico`. */
export type EdicaoDaVendaPayload = Omit<Esquemas['PatchedOrdemServicoRequest'], 'servicos'>;
export type NovoServicoPayload = Esquemas['ServicoRequest'];

export type FiltrosDeVendas = FiltrosDe<'ordens_servico_ordens_list'>;

export const getVendas = async (filtros: FiltrosDeVendas = {}): Promise<VendaDaLista[]> => {
  const { data } = await api.get(`${ORDENS}/`, { params: filtros });
  return comoLista<VendaDaLista>(data);
};

export const getVenda = async (id: number): Promise<Venda> => {
  const { data } = await api.get<Venda>(`${ORDENS}/${id}/`);
  return data;
};

export const getResumoDaVenda = async (id: number): Promise<ResumoDaVenda> => {
  const { data } = await api.get<ResumoDaVenda>(`/api/comercial/vendas/${id}/`);
  return data;
};

/**
 * Validações por tipo de condição (400 por campo): parcelado exige `quantidade_parcelas` ≥ 2 e
 * `data_acordada_cobranca`; recorrente exige `quantidade_parcelas` (meses), `dia_vencimento` e `valor_mensal`.
 */
export const criarVenda = async (payload: NovaVendaPayload): Promise<Venda> => {
  const { data } = await api.post<Venda>(`${ORDENS}/`, payload);
  return data;
};

export const editarVenda = async (id: number, payload: EdicaoDaVendaPayload): Promise<Venda> => {
  const { data } = await api.patch<Venda>(`${ORDENS}/${id}/`, payload);
  return data;
};

/** Serviço acrescentado a uma venda existente: avisa só o setor dele. */
export const acrescentarServico = async (payload: NovoServicoPayload): Promise<Esquemas['Servico']> => {
  const { data } = await api.post<Esquemas['Servico']>('/api/ordens-servico/servicos/', payload);
  return data;
};
