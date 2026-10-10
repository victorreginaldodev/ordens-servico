import api from '@/services/api';
import type { Esquemas, FiltrosDe } from '@/api/tipos';

/**
 * Controle do financeiro: `/api/financeiro/` e `/api/analise/financeiro/` (backend, fase 10; ADRs 0007 e 0008).
 * O sistema não gerencia parcelas: registra a condição, avisa a liberação e guarda o "check" do lançamento
 * no sistema financeiro externo. "Faturar" = dar o OK aqui e lançar lá.
 */

export type SituacaoDeCobranca = Esquemas['SituacaoEnum'];
export type Cobrancas = Esquemas['Cobrancas'];
export type LinhaDeCobranca = Esquemas['LinhaDeCobranca'];
export type Contadores = Esquemas['Contadores'];
export type SituacaoFinanceira = Esquemas['SituacaoFinanceira'];
export type EventoFinanceiro = Esquemas['EventoFinanceiro'];
export type IndicadoresFinanceiros = Esquemas['FinanceiroAnaliseResponse'];
export type LancamentoPayload = Esquemas['PatchedRegistrarCobrancaRequestRequest'];

export type FiltrosDeCobrancas = FiltrosDe<'financeiro_cobrancas_retrieve'>;

/**
 * As OS de uma situação (`a_faturar`, `faturadas` ou `previsao`; padrão `a_faturar`), com os contadores
 * das três sob os mesmos filtros. Exige `financeiro.registrar_cobranca`.
 */
export const getCobrancas = async (filtros: FiltrosDeCobrancas = {}): Promise<Cobrancas> => {
  const { data } = await api.get<Cobrancas>('/api/financeiro/cobrancas/', { params: filtros });
  return data;
};

/** Condição, liberação, lançamento, serviços e eventos financeiros da OS. Exige `financeiro.ver_valores`. */
export const getSituacaoFinanceira = async (ordemId: number): Promise<SituacaoFinanceira> => {
  const { data } = await api.get<SituacaoFinanceira>(`/api/financeiro/ordens/${ordemId}/`);
  return data;
};

/**
 * Registra o lançamento ("faturar"): referência no sistema externo (texto) e data. Exige
 * `financeiro.registrar_cobranca`; 400 se a OS não estiver liberada.
 */
export const registrarLancamento = async (ordemId: number, payload: LancamentoPayload): Promise<Esquemas['OrdemServico']> => {
  const { data } = await api.patch<Esquemas['OrdemServico']>(`/api/ordens-servico/ordens/${ordemId}/cobranca/`, payload);
  return data;
};

/** Indicadores: a faturar, faturado, previsão, por tipo de condição e receita recorrente mensal. */
export const getIndicadoresFinanceiros = async (): Promise<IndicadoresFinanceiros> => {
  const { data } = await api.get<IndicadoresFinanceiros>('/api/analise/financeiro/');
  return data;
};
