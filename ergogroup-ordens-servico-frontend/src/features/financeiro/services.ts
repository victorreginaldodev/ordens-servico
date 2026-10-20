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
export type EventoDoResumo = Esquemas['EventoDoResumo'];
export type ServicoRealizado = Esquemas['ServicoRealizado'];
export type ServicoPendente = Esquemas['ServicoPendente'];
export type CodigoDaConferencia = Esquemas['CodigoDaConferenciaEnum'];
export type Conferencia = Esquemas['Conferencia'];
export type Verificacao = Esquemas['Verificacao'];
export type ItemDaConferencia = Esquemas['ItemDaConferencia'];
export type Correcao = Esquemas['Correcao'];
export type IndicadoresFinanceiros = Esquemas['FinanceiroAnaliseResponse'];
export type LancamentoPayload = Esquemas['PatchedRegistrarCobrancaRequestRequest'];
/** OS operacional nas Cobranças (19/10/2026): sem valor nem condição; o financeiro define o valor no lançamento. */
export type LinhaOperacional = Esquemas['LinhaDeCobrancaOperacional'];
export type SituacaoFinanceiraOperacional = Esquemas['SituacaoFinanceiraOperacional'];
export type LancamentoOperacionalPayload = Esquemas['PatchedRegistrarCobrancaOSORequestRequest'];
/** Auditoria das OS operacionais anteriores à regra do catálogo (20/10/2026). */
export type AuditoriaOperacional = Esquemas['AuditoriaOperacional'];
export type OsoDaAuditoria = Esquemas['OsoDaAuditoria'];
export type AlertaDaAuditoria = Esquemas['AlertasEnum'];
export type MotivoNaoCobrada = Esquemas['DeveriaSerCobradaEnum'];

export type FiltrosDeCobrancas = FiltrosDe<'financeiro_cobrancas_retrieve'>;

/**
 * As OS de uma situação (`a_faturar`, `faturadas` ou `previsao`; padrão `a_faturar`) ou das três (`todas`),
 * com os contadores das três sob os mesmos filtros, o que falta em cada OS da previsão (`pendentes`) e os
 * códigos da conferência (`pendencias`). As faturadas podem ser limitadas por `faturada_de`/`faturada_ate`.
 * Exige `financeiro.registrar_cobranca` e `financeiro.ver_valores`.
 */
export const getCobrancas = async (filtros: FiltrosDeCobrancas = {}): Promise<Cobrancas> => {
  const { data } = await api.get<Cobrancas>('/api/financeiro/cobrancas/', { params: filtros });
  return data;
};

/**
 * Resumo para faturar: condição, liberação, lançamento, os serviços realizados (setor, quem executou, início,
 * término e quem finalizou), as pendências da conferência e a linha do tempo. Exige `financeiro.ver_valores`.
 */
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

/**
 * Resumo para faturar a OS operacional: cliente, o que cobrar, execução, liberação, lançamento, regra de cobrança,
 * pendências da conferência e histórico. Exige `financeiro.registrar_cobranca` e `financeiro.ver_valores`.
 */
export const getSituacaoFinanceiraOperacional = async (id: number): Promise<SituacaoFinanceiraOperacional> => {
  const { data } = await api.get<SituacaoFinanceiraOperacional>(`/api/financeiro/operacionais/${id}/`);
  return data;
};

/** Registra o lançamento da OS operacional: referência (opcional) e data (padrão: hoje). 400 se não estiver liberada. */
export const registrarLancamentoOperacional = async (id: number, payload: LancamentoOperacionalPayload) => {
  const { data } = await api.patch<Esquemas['OrdemServicoOperacional']>(`/api/ordens-servico/operacionais/${id}/cobranca/`, payload);
  return data;
};

/**
 * Auditoria: todas as OS operacionais anteriores à regra do catálogo, sem filtro, com os alertas. Exige
 * `financeiro.ver_valores` e `auditoria.ver`.
 */
export const getAuditoriaOperacional = async (): Promise<AuditoriaOperacional> => {
  const { data } = await api.get<AuditoriaOperacional>('/api/financeiro/auditoria-operacionais/');
  return data;
};

/**
 * Baixa o Excel da auditoria (abas OS operacionais, Não cobradas por cliente e por mês, Resumo por serviço, Alertas
 * e Sobre). Com `cliente`, só as OS operacionais dele.
 */
export const baixarAuditoriaOperacionalExcel = async (cliente?: number | null): Promise<void> => {
  const resposta = await api.get<Blob>('/api/financeiro/auditoria-operacionais/excel/', {
    responseType: 'blob',
    params: cliente ? { cliente } : undefined,
  });
  const disposicao = String(resposta.headers['content-disposition'] ?? '');
  const nome = /filename="([^"]+)"/.exec(disposicao)?.[1] ?? 'auditoria-os-operacionais.xlsx';
  const url = URL.createObjectURL(resposta.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/** Indicadores: a faturar, faturado, previsão e por tipo de condição (à vista e parcelado). */
export const getIndicadoresFinanceiros = async (): Promise<IndicadoresFinanceiros> => {
  const { data } = await api.get<IndicadoresFinanceiros>('/api/analise/financeiro/');
  return data;
};

/**
 * Conferência do faturamento (faturamento/04): as garantias (devem dar 0) e as atenções, com a OS, o serviço, o
 * setor e quem está com ele. Calculada na hora. Exige `financeiro.registrar_cobranca` e `financeiro.ver_valores`.
 */
export const getConferencia = async (): Promise<Conferencia> => {
  const { data } = await api.get<Conferencia>('/api/financeiro/conferencia/');
  return data;
};

/** Refaz a sincronização dos serviços e das OS ainda não liberadas (o que a regra já manda). */
export const corrigirConferencia = async (): Promise<Correcao> => {
  const { data } = await api.post<Correcao>('/api/financeiro/conferencia/corrigir/');
  return data;
};
