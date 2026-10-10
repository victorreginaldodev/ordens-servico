import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageResult } from '@/services/pagination';
import {
  Client,
  Contact,
  ClientsPageParams,
  ClienteUpsertPayload,
  ContactApiInput,
  getClients,
  getClientsPage,
  getClient,
  upsertClient,
  deleteClient,
  getContacts,
  getContact,
  upsertContact,
  deleteContact,
} from './services';

// ── Clientes ──────────────────────────────────────────────────────────────────

export const useClients = () =>
  useQuery<Client[]>({
    queryKey: ['clientes-lista'],
    queryFn: getClients,
  });

export const useClientsPage = (params: ClientsPageParams) =>
  useQuery<PageResult<Client>>({
    queryKey: ['clientes-lista-paginada', params],
    queryFn: () => getClientsPage(params),
  });

export const useClient = (id?: string) =>
  useQuery<Client>({
    queryKey: ['clientes-detalhe', id],
    queryFn: async () => {
      if (!id) throw new Error('missing id');
      return getClient(id);
    },
    enabled: !!id,
  });

const invalidarClientes = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['clientes-lista'] });
  qc.invalidateQueries({ queryKey: ['clientes-lista-paginada'] });
};

export const useUpsertClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClienteUpsertPayload) => upsertClient(payload),
    onSuccess: async () => invalidarClientes(qc),
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: async () => invalidarClientes(qc),
  });
};

// ── Contatos (sub-recurso de cliente) ────────────────────────────────────────

export const useContacts = () =>
  useQuery<Contact[]>({
    queryKey: ['clientes-contatos'],
    queryFn: getContacts,
  });

export const useContact = (id?: string) =>
  useQuery<Contact>({
    queryKey: ['clientes-contato-detalhe', id],
    queryFn: async () => {
      if (!id) throw new Error('missing id');
      return getContact(id);
    },
    enabled: !!id,
  });

export const useUpsertContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContactApiInput & { id?: string }) => upsertContact(payload),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['clientes-contatos'] });
      invalidarClientes(qc);
    },
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['clientes-contatos'] });
      invalidarClientes(qc);
    },
  });
};
