import api from '@/services/api';
import type { UserProfile } from '@/services/auth';
import type { ResumoPermissoes, Vinculo } from '@/lib/permissoes';

const endpoint = '/api/contas/usuarios/';

// Shape retornado pelo endpoint de LISTAGEM (`UsuarioList` no schema) — não inclui
// username/is_staff/is_superuser/last_login, que só vêm no detalhe (`UsuarioDetail`,
// ver `ProfileResponse` abaixo). Buscar o detalhe antes de editar um usuário.
export interface UsuarioApi {
  id: number;
  email: string;
  nome_completo: string;
  ativo: boolean;
  /** Setores e funções da pessoa. */
  vinculos: Vinculo[];
  data_criacao: string;
}

/** Setor e função na escrita de uma pessoa. Enviar a lista substitui todos os vínculos. */
export interface VinculoPayload {
  setor: number;
  funcao: number;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  nome_completo: string;
  ativo: boolean;
  vinculos?: VinculoPayload[];
  password: string;
  password_confirmacao: string;
}

export interface UpdateUserPayload {
  email?: string;
  username?: string;
  nome_completo?: string;
  ativo?: boolean;
  vinculos?: VinculoPayload[];
}

export const getUsers = async (): Promise<UsuarioApi[]> => {
  const res = await api.get<UsuarioApi[]>(endpoint);
  return Array.isArray(res.data) ? res.data : [];
};

export const createUser = async (payload: CreateUserPayload): Promise<UsuarioApi> => {
  const res = await api.post<UsuarioApi>(endpoint, payload);
  return res.data;
};

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<UsuarioApi> => {
  const res = await api.patch<UsuarioApi>(`${endpoint}${id}/`, payload);
  return res.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`${endpoint}${id}/`);
};

/** Desativada, a pessoa não entra mais no sistema; tarefas e histórico continuam. */
export const setUserAtivo = async (id: number, ativo: boolean): Promise<void> => {
  await api.patch(`${endpoint}${id}/${ativo ? 'ativar' : 'desativar'}/`);
};

// ── Perfil do usuário autenticado ────────────────────────────────────────────

export type ProfileResponse = {
  id: number;
  email: string;
  username: string;
  nome_completo: string;
  ativo: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  vinculos: Vinculo[];
  permissoes: ResumoPermissoes;
  data_criacao: string;
  last_login: string | null;
};

/** O próprio perfil: só dados cadastrais. Status, setores e funções ficam com quem gerencia o time. */
export type UpdateProfilePayload = {
  email?: string;
  username?: string;
  nome_completo?: string;
};

export type AlterarSenhaPayload = {
  senha_atual: string;
  nova_senha: string;
  nova_senha_confirmacao: string;
};

export const profileResponseToUserProfile = (profile: ProfileResponse): UserProfile => ({
  id: profile.id,
  user: {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    nome_completo: profile.nome_completo,
    first_name: '',
    last_name: '',
  },
  vinculos: profile.vinculos,
  permissoes: profile.permissoes,
  is_superuser: profile.is_superuser,
  nivel_usuario: 'normal',
  foto_perfil: null,
  ativo: profile.ativo,
  criado_em: profile.data_criacao,
  criado_por: null,
  cpf: undefined,
  token: null,
});

export const getMyProfile = async (): Promise<ProfileResponse> => {
  const { data } = await api.get<ProfileResponse>(`${endpoint}me/`);
  return data;
};

export const getProfileDetail = async (id: number): Promise<ProfileResponse> => {
  const { data } = await api.get<ProfileResponse>(`${endpoint}${id}/`);
  return data;
};

export const updateProfile = async (id: number, payload: UpdateProfilePayload): Promise<ProfileResponse> => {
  const { data } = await api.patch<ProfileResponse>(`${endpoint}${id}/`, payload);
  return data;
};

export const alterarSenha = async (id: number, payload: AlterarSenhaPayload) => {
  const { data } = await api.patch(`${endpoint}${id}/alterar-senha/`, payload);
  return data;
};
