import api from '@/services/api';
import type { Permissao } from '@/lib/permissoes';

const BASE = '/api/organizacoes';

export interface Setor {
  id: number;
  organizacao: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Funcao {
  id: number;
  organizacao: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  permissoes: Permissao[];
  /** Setores em que a função pode ser atribuída (obrigatório, ao menos um). */
  setores: number[];
  setores_detalhe: Array<{ id: number; nome: string }>;
  criado_em: string;
  atualizado_em: string;
}

/** A função pode ser usada neste setor? */
export const funcaoLiberadaNoSetor = (funcao: Pick<Funcao, 'setores'>, setor: number | null | undefined) =>
  setor != null && funcao.setores.includes(setor);

/** Substitui a lista de setores em que a função pode ser usada. */
export const atualizarSetoresDaFuncao = async (id: number, setores: number[]): Promise<Funcao> => {
  const { data } = await api.patch<Funcao>(`${BASE}/funcoes/${id}/`, { setores });
  return data;
};

/** Aceita tanto lista simples quanto resposta paginada do DRF. */
const lista = <T,>(data: unknown): T[] =>
  Array.isArray(data) ? (data as T[]) : ((data as { results?: T[] } | null)?.results ?? []);

export const getSetores = async (): Promise<Setor[]> => {
  const { data } = await api.get(`${BASE}/setores/`);
  return lista<Setor>(data);
};

export const getFuncoes = async (): Promise<Funcao[]> => {
  const { data } = await api.get(`${BASE}/funcoes/`);
  return lista<Funcao>(data);
};

export interface SetorPayload {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
}

export const criarSetor = async (organizacao: number, payload: SetorPayload): Promise<Setor> => {
  const { data } = await api.post<Setor>(`${BASE}/setores/`, { organizacao, ...payload });
  return data;
};

export const atualizarSetor = async (id: number, payload: Partial<SetorPayload>): Promise<Setor> => {
  const { data } = await api.patch<Setor>(`${BASE}/setores/${id}/`, payload);
  return data;
};

export const excluirSetor = async (id: number): Promise<void> => {
  await api.delete(`${BASE}/setores/${id}/`);
};

/** Vínculo pessoa + setor + função (`MembroSetor` na API). */
export interface Membro {
  id: number;
  usuario: number;
  usuario_nome: string;
  setor: number;
  setor_nome: string;
  funcao: number;
  funcao_nome: string;
}

export const getMembros = async (): Promise<Membro[]> => {
  const { data } = await api.get(`${BASE}/membros/`);
  return lista<Membro>(data);
};

export interface Organizacao {
  id: number;
  nome: string;
}

export const getOrganizacoes = async (): Promise<Organizacao[]> => {
  const { data } = await api.get(`${BASE}/organizacoes/`);
  return lista<Organizacao>(data);
};

/** Item do catálogo de permissões do backend (`funcoes/permissoes-disponiveis/`). */
export interface PermissaoDisponivel {
  codigo: Permissao;
  descricao: string;
  /** `setor`: vale só nos setores da pessoa; `global`: na empresa toda. */
  escopo: 'global' | 'setor';
}

export const getPermissoesDisponiveis = async (): Promise<PermissaoDisponivel[]> => {
  const { data } = await api.get(`${BASE}/funcoes/permissoes-disponiveis/`);
  return lista<PermissaoDisponivel>(data);
};

export interface FuncaoPayload {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  permissoes: Permissao[];
  setores: number[];
}

export const criarFuncao = async (organizacao: number, payload: FuncaoPayload): Promise<Funcao> => {
  const { data } = await api.post<Funcao>(`${BASE}/funcoes/`, { organizacao, ...payload });
  return data;
};

export const atualizarFuncao = async (id: number, payload: Partial<FuncaoPayload>): Promise<Funcao> => {
  const { data } = await api.patch<Funcao>(`${BASE}/funcoes/${id}/`, payload);
  return data;
};

export const excluirFuncao = async (id: number): Promise<void> => {
  await api.delete(`${BASE}/funcoes/${id}/`);
};
