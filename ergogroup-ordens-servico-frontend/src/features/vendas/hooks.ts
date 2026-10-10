import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acrescentarServico,
  criarVenda,
  editarVenda,
  getResumoDaVenda,
  getVenda,
  getVendas,
  type EdicaoDaVendaPayload,
  type FiltrosDeVendas,
  type NovaVendaPayload,
  type NovoServicoPayload,
} from './services';

export const vendasKeys = {
  todos: ['vendas'] as const,
  lista: (filtros: FiltrosDeVendas) => ['vendas', 'lista', filtros] as const,
  venda: (id: number) => ['vendas', 'venda', id] as const,
  resumo: (id: number) => ['vendas', 'resumo', id] as const,
};

/**
 * Tudo que uma venda nova ou alterada afeta: vendas, filas dos setores, cobranças e linhas do tempo.
 * As chaves são literais para não criar import circular com os hooks dos outros domínios.
 */
const useInvalidarVendas = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [vendasKeys.todos, ['execucao'], ['financeiro'], ['linha-do-tempo']].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
};

export const useVendas = (filtros: FiltrosDeVendas = {}) =>
  useQuery({
    queryKey: vendasKeys.lista(filtros),
    queryFn: () => getVendas(filtros),
    staleTime: 60_000,
  });

export const useVenda = (id: number | undefined) =>
  useQuery({
    queryKey: vendasKeys.venda(id ?? 0),
    queryFn: () => getVenda(id!),
    enabled: !!id,
  });

export const useResumoDaVenda = (id: number | undefined) =>
  useQuery({
    queryKey: vendasKeys.resumo(id ?? 0),
    queryFn: () => getResumoDaVenda(id!),
    enabled: !!id,
  });

export const useCriarVenda = () => {
  const invalidar = useInvalidarVendas();
  return useMutation({ mutationFn: (payload: NovaVendaPayload) => criarVenda(payload), onSuccess: invalidar });
};

export const useEditarVenda = () => {
  const invalidar = useInvalidarVendas();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EdicaoDaVendaPayload }) => editarVenda(id, payload),
    onSuccess: invalidar,
  });
};

export const useAcrescentarServico = () => {
  const invalidar = useInvalidarVendas();
  return useMutation({ mutationFn: (payload: NovoServicoPayload) => acrescentarServico(payload), onSuccess: invalidar });
};
