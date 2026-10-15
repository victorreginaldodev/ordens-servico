import api from '@/services/api';
import type { Esquemas } from '@/api/tipos';

const endpoint = '/api/clientes/clientes/';

// `TipoInscricaoEnum` no schema: cnpj, cpf, cei, cno, caepf — não existe "outro" no backend.
export type TipoInscricao = 'cnpj' | 'cpf' | 'cei' | 'cno' | 'caepf';
// `TipoClienteEnum` no schema: gestao, avulso, fornecedor.
export type TipoCliente = 'gestao' | 'avulso' | 'fornecedor';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  address?: string;
  notes?: string;
  tipo_inscricao?: TipoInscricao;
  active?: boolean;
  chargeRevisionChange?: boolean;
  tipoCliente?: TipoCliente;
  representativeName?: string;
  representativeSector?: string;
  representativeEmail?: string;
  representativeContact?: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  cliente: string;
  nome: string;
  email: string;
  telefone: string;
  setor?: string;
}

type ClienteApi = {
  id: string | number;
  nome: string;
  tipo_inscricao: TipoInscricao;
  numero_inscricao: string;
  ativo?: boolean;
  cobranca_revisao_alteracao?: boolean;
  tipo_cliente?: TipoCliente;
  observacao?: string | null;
  data_criacao?: string;
  nome_representante?: string;
  setor_representante?: string;
  email_representante?: string;
  contato_representante?: string;
};

// Shape retornado pelo endpoint de LISTAGEM (`ClienteList` no schema), no que `getClients` usa.
type ClienteListApi = {
  id: string | number;
  nome: string;
  tipo_cliente?: TipoCliente;
  numero_inscricao: string;
  ativo?: boolean;
};

export type ClienteApiInput = Omit<ClienteApi, 'id'>;

export type ClienteUpsertPayload = {
  id?: string;
  nome: string;
  tipo_inscricao: ClienteApi['tipo_inscricao'];
  numero_inscricao: string;
  tipo_cliente?: TipoCliente;
  observacao?: string | null;
  nome_representante?: string | null;
  setor_representante?: string | null;
  email_representante?: string | null;
  contato_representante?: string | null;
  ativo?: boolean;
  cobranca_revisao_alteracao?: boolean;
};

const toClient = (c: ClienteApi): Client => ({
  id: String(c.id),
  name: (c.nome || '').toUpperCase(),
  email: c.email_representante || '',
  document: c.numero_inscricao,
  tipo_inscricao: c.tipo_inscricao,
  address: '',
  active: !!c.ativo,
  chargeRevisionChange: !!c.cobranca_revisao_alteracao,
  tipoCliente: c.tipo_cliente,
  notes: c.observacao || undefined,
  createdAt: c.data_criacao,
  representativeName: c.nome_representante,
  representativeSector: c.setor_representante,
  representativeEmail: c.email_representante,
  representativeContact: c.contato_representante,
});

export const getClients = async (): Promise<Client[]> => {
  const { data } = await api.get<ClienteListApi[]>(endpoint);
  return (data || [])
    .map((c) => toClient(c as ClienteApi))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Linha da listagem de clientes (`ClienteList` no schema). Desde 14/10/2026 traz tudo o que a
 * tabela mostra (documento, representante, cobrança de revisão, data de criação): uma requisição
 * para a tela inteira, sem buscar o detalhe de cada cliente.
 */
export type ClienteDaLista = Esquemas['ClienteList'];

export const getClientesDaLista = async (): Promise<ClienteDaLista[]> => {
  const { data } = await api.get<ClienteDaLista[] | { results: ClienteDaLista[] }>(endpoint);
  return Array.isArray(data) ? data : data?.results ?? [];
};

export const mudarAtivoCliente = async (id: number, ativo: boolean): Promise<Client> => {
  const { data } = await api.patch<ClienteApi>(`${endpoint}${id}/`, { ativo });
  return toClient(data);
};

export const getClient = async (id: string): Promise<Client> => {
  const { data } = await api.get<ClienteApi>(`${endpoint}${id}/`);
  return toClient(data);
};

export const upsertClient = async (payload: ClienteUpsertPayload): Promise<Client> => {
  if (payload.id) {
    const { id, ...body } = payload;
    const { data } = await api.patch<ClienteApi>(`${endpoint}${id}/`, body);
    return toClient(data);
  }
  const { data } = await api.post<ClienteApi>(endpoint, payload);
  return toClient(data);
};

export const deleteClient = async (id: string): Promise<string> => {
  await api.delete(`${endpoint}${id}/`);
  return id;
};

// ── Contatos são representantes do cliente — campo embarcado no modelo Cliente ──
// Não existe um endpoint separado de contatos nem uma lista com múltiplos contatos
// por cliente: cada cliente tem no máximo UM representante (nome/setor/e-mail/
// contato). "Editar um contato" == editar os campos de representante daquele cliente.

export type ContactApiInput = {
  cliente: number;
  nome: string;
  email: string;
  telefone: string;
  setor?: string;
};

const clientToContact = (c: Client): Contact => ({
  id: c.id,
  cliente: c.id,
  nome: c.representativeName ?? '',
  email: c.representativeEmail ?? '',
  telefone: c.representativeContact ?? '',
  setor: c.representativeSector,
});

export const getContacts = async (): Promise<Contact[]> => {
  // O endpoint de listagem não traz os campos de representante (serializer
  // reduzido) — buscamos o detalhe de cada cliente para saber quem tem contato.
  const { data } = await api.get<ClienteListApi[]>(endpoint, { params: { page_size: 500 } });
  const stubs = Array.isArray(data) ? data : [];
  const clients = await Promise.all(stubs.map((s) => getClient(String(s.id))));
  return clients.filter((c) => c.representativeName).map(clientToContact);
};

export const getContact = async (id: string): Promise<Contact> => {
  const client = await getClient(id);
  return clientToContact(client);
};

export const upsertContact = async (payload: ContactApiInput & { id?: string }): Promise<Contact> => {
  const clientId = payload.id ?? String(payload.cliente);
  const body = {
    nome_representante: payload.nome,
    email_representante: payload.email,
    contato_representante: payload.telefone,
    setor_representante: payload.setor ?? '',
  };
  const { data } = await api.patch<ClienteApi>(`${endpoint}${clientId}/`, body);
  return clientToContact(toClient(data));
};

export const deleteContact = async (id: string): Promise<string> => {
  await api.patch(`${endpoint}${id}/`, {
    nome_representante: '',
    email_representante: '',
    contato_representante: '',
    setor_representante: '',
  });
  return id;
};
