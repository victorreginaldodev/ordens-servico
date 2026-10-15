import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmarRecebimentoDeServicos,
  confirmarRecebimentoDeTarefas,
  darCiencia,
  distribuir,
  editarTarefa,
  excluirTarefa,
  getAlertas,
  getAndamento,
  getConcluidos,
  getDetalheDoServico,
  getEquipe,
  getFila,
  getMeusServicos,
  getSetoresAcompanhados,
  type CienciaPayload,
  type DistribuirPayload,
  type EdicaoDaTarefa,
  type FiltrosDaFila,
  type Periodo,
} from './services';

/** Um hook por bloco: cada bloco carrega, atualiza e trata o erro sozinho. */
export const execucaoKeys = {
  todos: ['execucao'] as const,
  setores: ['execucao', 'setores'] as const,
  doSetor: (setor: number) => ['execucao', 'setor', setor] as const,
  fila: (setor: number, filtros: FiltrosDaFila) => ['execucao', 'setor', setor, 'fila', filtros] as const,
  andamento: (setor: number, responsavel?: number) => ['execucao', 'setor', setor, 'andamento', responsavel ?? null] as const,
  alertas: (setor: number) => ['execucao', 'setor', setor, 'alertas'] as const,
  concluidos: (setor: number, periodo: Periodo) => ['execucao', 'setor', setor, 'concluidos', periodo] as const,
  equipe: (setor: number) => ['execucao', 'setor', setor, 'equipe'] as const,
  meusServicos: (opcoes: object) => ['execucao', 'meus-servicos', opcoes] as const,
  servico: (id: number) => ['execucao', 'servico', id] as const,
};

const MINUTO = 60_000;

export const useSetoresAcompanhados = (habilitado = true) =>
  useQuery({
    queryKey: execucaoKeys.setores,
    queryFn: getSetoresAcompanhados,
    enabled: habilitado,
    staleTime: MINUTO,
  });

export const useFila = (setor: number | undefined, filtros: FiltrosDaFila = {}) =>
  useQuery({
    queryKey: execucaoKeys.fila(setor ?? 0, filtros),
    queryFn: () => getFila(setor!, filtros),
    enabled: !!setor,
    staleTime: MINUTO,
  });

export const useAndamento = (setor: number | undefined, responsavel?: number) =>
  useQuery({
    queryKey: execucaoKeys.andamento(setor ?? 0, responsavel),
    queryFn: () => getAndamento(setor!, responsavel),
    enabled: !!setor,
    staleTime: MINUTO,
  });

export const useAlertas = (setor: number | undefined) =>
  useQuery({
    queryKey: execucaoKeys.alertas(setor ?? 0),
    queryFn: () => getAlertas(setor!),
    enabled: !!setor,
    staleTime: MINUTO,
  });

export const useConcluidos = (setor: number | undefined, periodo: Periodo = {}) =>
  useQuery({
    queryKey: execucaoKeys.concluidos(setor ?? 0, periodo),
    queryFn: () => getConcluidos(setor!, periodo),
    enabled: !!setor,
    staleTime: 5 * MINUTO,
  });

export const useEquipe = (setor: number | undefined) =>
  useQuery({
    queryKey: execucaoKeys.equipe(setor ?? 0),
    queryFn: () => getEquipe(setor!),
    enabled: !!setor,
    staleTime: MINUTO,
  });

export const useMeusServicos = (opcoes: { concluidas?: boolean } & Periodo = {}) =>
  useQuery({
    queryKey: execucaoKeys.meusServicos(opcoes),
    queryFn: () => getMeusServicos(opcoes),
    staleTime: MINUTO,
  });

export const useDetalheDoServico = (id: number | undefined) =>
  useQuery({
    queryKey: execucaoKeys.servico(id ?? 0),
    queryFn: () => getDetalheDoServico(id!),
    enabled: !!id,
  });

/**
 * Depois de distribuir ou dar ciência, tudo da execução pode ter mudado (fila, andamento, alertas,
 * equipe, contadores, meus serviços), além do andamento das vendas e das linhas do tempo.
 */
const useInvalidarAposAcao = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [execucaoKeys.todos, ['vendas'], ['linha-do-tempo']].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
};

export const useDistribuir = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({
    mutationFn: ({ servicoId, payload }: { servicoId: number; payload: DistribuirPayload }) =>
      distribuir(servicoId, payload),
    onSuccess: invalidar,
  });
};

export const useDarCiencia = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({
    mutationFn: ({ servicoId, payload }: { servicoId: number; payload: CienciaPayload }) =>
      darCiencia(servicoId, payload),
    onSuccess: invalidar,
  });
};

/** Ciência de recebimento do setor, em um ou vários serviços. */
export const useConfirmarRecebimentoDeServicos = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({ mutationFn: (servicos: number[]) => confirmarRecebimentoDeServicos(servicos), onSuccess: invalidar });
};

/** Ciência do responsável, em uma ou várias tarefas suas. */
export const useConfirmarRecebimentoDeTarefas = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({ mutationFn: (tarefas: number[]) => confirmarRecebimentoDeTarefas(tarefas), onSuccess: invalidar });
};

/** Mudar status, reatribuir, mudar prazo ou descrição de uma tarefa. */
export const useEditarTarefa = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({
    mutationFn: ({ tarefaId, payload }: { tarefaId: number; payload: EdicaoDaTarefa }) => editarTarefa(tarefaId, payload),
    onSuccess: invalidar,
  });
};

export const useExcluirTarefa = () => {
  const invalidar = useInvalidarAposAcao();
  return useMutation({ mutationFn: (tarefaId: number) => excluirTarefa(tarefaId), onSuccess: invalidar });
};
