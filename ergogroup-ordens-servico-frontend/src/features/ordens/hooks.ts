import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrdem,
  createServico,
  createTarefa,
  deleteServico,
  deleteTarefa,
  getAuditoriaTimeline,
  getOrdemDetalhe,
  getOrdensLista,
  getServicoDetalhe,
  getServicosDeOrdem,
  getServicosResumo,
  getTarefasDeServico,
  getTarefasResumo,
  registrarCobranca,
  updateOrdem,
  updateServico,
  updateTarefa,
  type CreateServicoPayload,
  type CreateTarefaPayload,
  type OrdemServicoDetalhe,
  type OrdemServicoItem,
  type OrdemServicoPayload,
  type RegistrarCobrancaPayload,
  type RegistroAuditoria,
  type ServicoDetalhe,
  type ServicoResumoItem,
  type TarefaDetalhe,
  type TarefaResumoItem,
  type UpdateServicoPayload,
  type UpdateTarefaPayload,
} from './services';

export const useOrdensLista = () =>
  useQuery<OrdemServicoItem[]>({
    queryKey: ['ordens-lista'],
    queryFn: getOrdensLista,
    staleTime: 1000 * 60 * 2,
  });

export const useOrdemDetalhe = (id?: number) =>
  useQuery<OrdemServicoDetalhe>({
    queryKey: ['ordens-detalhe', id],
    queryFn: () => getOrdemDetalhe(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useUpsertOrdem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: OrdemServicoPayload | Partial<OrdemServicoPayload> }) =>
      id === undefined ? createOrdem(payload as OrdemServicoPayload) : updateOrdem(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['ordens-lista'] });
      if (id !== undefined) qc.invalidateQueries({ queryKey: ['ordens-detalhe', id] });
    },
  });
};

export const useServicosDeOrdem = (ordemId?: number) =>
  useQuery<ServicoDetalhe[]>({
    queryKey: ['ordens-servicos', ordemId],
    queryFn: () => getServicosDeOrdem(ordemId!),
    enabled: !!ordemId,
    staleTime: 1000 * 60 * 2,
  });

export const useServicoDetalhe = (id?: number) =>
  useQuery<ServicoDetalhe>({
    queryKey: ['servico-detalhe', id],
    queryFn: () => getServicoDetalhe(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useTarefasDeServico = (servicoId?: number) =>
  useQuery<TarefaDetalhe[]>({
    queryKey: ['ordens-tarefas-servico', servicoId],
    queryFn: () => getTarefasDeServico(servicoId!),
    enabled: !!servicoId,
    staleTime: 1000 * 60 * 2,
  });

export const useTarefasDeServicos = (servicos?: ServicoDetalhe[]) =>
  useQueries({
    queries: (servicos ?? []).map((servico) => ({
      queryKey: ['ordens-tarefas-servico', servico.id],
      queryFn: () => getTarefasDeServico(servico.id),
      enabled: !!servico.id,
      staleTime: 1000 * 60 * 2,
    })),
    combine: (results) => {
      const tarefasPorServico: Record<number, TarefaDetalhe[]> = {};

      (servicos ?? []).forEach((servico, index) => {
        const tarefas = results[index]?.data;
        if (tarefas) tarefasPorServico[servico.id] = tarefas as TarefaDetalhe[];
      });

      return {
        tarefasPorServico,
        isLoading: results.some((query) => query.isLoading),
        isFetching: results.some((query) => query.isFetching),
      };
    },
  });

export const useServicosResumo = () =>
  useQuery<ServicoResumoItem[]>({
    queryKey: ['servicos-resumo'],
    queryFn: getServicosResumo,
    staleTime: 1000 * 60 * 2,
  });

export const useTarefasResumo = () =>
  useQuery<TarefaResumoItem[]>({
    queryKey: ['tarefas-resumo'],
    queryFn: getTarefasResumo,
    staleTime: 1000 * 60 * 2,
  });

export const useAuditoriaTimeline = (ordemId?: number) =>
  useQuery<RegistroAuditoria[]>({
    queryKey: ['auditoria-timeline', ordemId],
    queryFn: () => getAuditoriaTimeline(ordemId!),
    enabled: !!ordemId,
    staleTime: 1000 * 60 * 2,
  });

interface MutacaoContexto {
  servicoId: number;
  ordemId: number;
}

const invalidarContexto = (
  qc: ReturnType<typeof useQueryClient>,
  { servicoId, ordemId }: MutacaoContexto,
) => {
  qc.invalidateQueries({ queryKey: ['ordens-tarefas-servico', servicoId] });
  qc.invalidateQueries({ queryKey: ['ordens-servicos', ordemId] });
  qc.invalidateQueries({ queryKey: ['ordens-detalhe', ordemId] });
  qc.invalidateQueries({ queryKey: ['ordens-lista'] });
};

export const useCreateTarefa = (ctx: MutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTarefaPayload) => createTarefa(payload),
    onSuccess: () => invalidarContexto(qc, ctx),
  });
};

export const useUpdateTarefa = (ctx: MutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTarefaPayload }) =>
      updateTarefa(id, payload),
    onSuccess: () => invalidarContexto(qc, ctx),
  });
};

export const useDeleteTarefa = (ctx: MutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTarefa(id),
    onSuccess: () => invalidarContexto(qc, ctx),
  });
};

interface ServicoMutacaoContexto {
  ordemId: number;
}

const invalidarServicoContexto = (
  qc: ReturnType<typeof useQueryClient>,
  { ordemId }: ServicoMutacaoContexto,
) => {
  qc.invalidateQueries({ queryKey: ['ordens-servicos', ordemId] });
  qc.invalidateQueries({ queryKey: ['ordens-detalhe', ordemId] });
  qc.invalidateQueries({ queryKey: ['ordens-lista'] });
  qc.invalidateQueries({ queryKey: ['servicos-resumo'] });
};

export const useCreateServico = (ctx: ServicoMutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServicoPayload) => createServico(payload),
    onSuccess: () => invalidarServicoContexto(qc, ctx),
  });
};

export const useUpdateServico = (ctx: ServicoMutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateServicoPayload }) =>
      updateServico(id, payload),
    onSuccess: () => invalidarServicoContexto(qc, ctx),
  });
};

export const useDeleteServico = (ctx: ServicoMutacaoContexto) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteServico(id),
    onSuccess: () => invalidarServicoContexto(qc, ctx),
  });
};

export const useRegistrarCobranca = (ordemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegistrarCobrancaPayload) => registrarCobranca(ordemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordens-detalhe', ordemId] });
      qc.invalidateQueries({ queryKey: ['auditoria-timeline', ordemId] });
      qc.invalidateQueries({ queryKey: ['ordens-lista'] });
    },
  });
};
