import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOperationalOrderList,
  getOperationalOrderPage,
  getOperationalOrderDetail,
  createOperationalOrder,
  updateOperationalOrder,
  deleteOperationalOrder,
  registrarCobrancaOperacional,
  CreateOperationalOrderPayload,
  UpdateOperationalOrderPayload,
  OperationalOrderListParams,
} from './servicesOperacional';

// ── Helpers ───────────────────────────────────────────────────────────────────

const invalidateList = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['operational-order-list'] });
  qc.invalidateQueries({ queryKey: ['operational-order-page'] });
};

// ── Operational Order queries ─────────────────────────────────────────────────

export const useOperationalOrderList = () =>
  useQuery({
    queryKey: ['operational-order-list'],
    queryFn: getOperationalOrderList,
    staleTime: 1000 * 60 * 2,
  });

export const useOperationalOrderPage = (params: OperationalOrderListParams) =>
  useQuery({
    queryKey: ['operational-order-page', params],
    queryFn: () => getOperationalOrderPage(params),
    staleTime: 1000 * 60 * 2,
  });

export const useOperationalOrderDetail = (id?: number) =>
  useQuery({
    queryKey: ['operational-order-detail', id],
    queryFn: () => getOperationalOrderDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ── Operational Order mutations ───────────────────────────────────────────────

export const useCreateOperationalOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOperationalOrderPayload) => createOperationalOrder(payload),
    onSuccess: () => invalidateList(qc),
  });
};

export const useUpdateOperationalOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOperationalOrderPayload }) =>
      updateOperationalOrder(id, payload),
    onSuccess: (_, { id }) => {
      invalidateList(qc);
      qc.invalidateQueries({ queryKey: ['operational-order-detail', id] });
    },
  });
};

export const useDeleteOperationalOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteOperationalOrder(id),
    onSuccess: () => invalidateList(qc),
  });
};

export const useRegistrarCobrancaOperacional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, numeroNf }: { id: number; numeroNf: string }) =>
      registrarCobrancaOperacional(id, numeroNf),
    onSuccess: (_, { id }) => {
      invalidateList(qc);
      qc.invalidateQueries({ queryKey: ['operational-order-detail', id] });
    },
  });
};
