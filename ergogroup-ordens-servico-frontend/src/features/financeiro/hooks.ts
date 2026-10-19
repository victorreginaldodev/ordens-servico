import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  corrigirConferencia,
  getCobrancas,
  getConferencia,
  getIndicadoresFinanceiros,
  getSituacaoFinanceira,
  getSituacaoFinanceiraOperacional,
  registrarLancamento,
  registrarLancamentoOperacional,
  type FiltrosDeCobrancas,
  type LancamentoOperacionalPayload,
  type LancamentoPayload,
} from './services';

export const financeiroKeys = {
  todos: ['financeiro'] as const,
  cobrancas: (filtros: FiltrosDeCobrancas) => ['financeiro', 'cobrancas', filtros] as const,
  situacao: (ordemId: number) => ['financeiro', 'situacao', ordemId] as const,
  situacaoOperacional: (id: number) => ['financeiro', 'situacao-operacional', id] as const,
  indicadores: ['financeiro', 'indicadores'] as const,
  conferencia: ['financeiro', 'conferencia'] as const,
};

export const useCobrancas = (filtros: FiltrosDeCobrancas = {}, habilitado = true) =>
  useQuery({
    queryKey: financeiroKeys.cobrancas(filtros),
    queryFn: () => getCobrancas(filtros),
    enabled: habilitado,
    staleTime: 60_000,
  });

export const useSituacaoFinanceira = (ordemId: number | undefined) =>
  useQuery({
    queryKey: financeiroKeys.situacao(ordemId ?? 0),
    queryFn: () => getSituacaoFinanceira(ordemId!),
    enabled: !!ordemId,
  });

export const useSituacaoFinanceiraOperacional = (id: number | undefined) =>
  useQuery({
    queryKey: financeiroKeys.situacaoOperacional(id ?? 0),
    queryFn: () => getSituacaoFinanceiraOperacional(id!),
    enabled: !!id,
  });

/** O lançamento da OS operacional muda as cobranças, a conferência e a lista de OS operacionais. */
export const useRegistrarLancamentoOperacional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LancamentoOperacionalPayload }) => registrarLancamentoOperacional(id, payload),
    onSuccess: () =>
      Promise.all(
        [financeiroKeys.todos, ['operational-order-list'], ['operational-order-detail']].map((queryKey) => qc.invalidateQueries({ queryKey })),
      ),
  });
};

export const useIndicadoresFinanceiros = (habilitado = true) =>
  useQuery({
    queryKey: financeiroKeys.indicadores,
    queryFn: getIndicadoresFinanceiros,
    enabled: habilitado,
    staleTime: 5 * 60_000,
  });

/** O lançamento muda cobranças, indicadores, a venda e a linha do tempo. */
export const useRegistrarLancamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ordemId, payload }: { ordemId: number; payload: LancamentoPayload }) =>
      registrarLancamento(ordemId, payload),
    onSuccess: () =>
      Promise.all(
        [financeiroKeys.todos, ['vendas'], ['linha-do-tempo']].map((queryKey) => qc.invalidateQueries({ queryKey })),
      ),
  });
};

/** Conferência do faturamento: calculada na hora no backend. */
export const useConferencia = (habilitado = true) =>
  useQuery({
    queryKey: financeiroKeys.conferencia,
    queryFn: getConferencia,
    enabled: habilitado,
    staleTime: 60_000,
  });

/** Corrigir a sincronização muda cobranças, a conferência, as vendas e a execução. */
export const useCorrigirConferencia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: corrigirConferencia,
    onSuccess: () =>
      Promise.all(
        [financeiroKeys.todos, ['vendas'], ['execucao'], ['linha-do-tempo']].map((queryKey) => qc.invalidateQueries({ queryKey })),
      ),
  });
};
