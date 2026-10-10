import api from './api';
import type { ResumoPermissoes, Vinculo } from '@/lib/permissoes';

export interface UserDetail {
  id: number;
  username: string;
  email: string;
  nome_completo: string;
  first_name: string;
  last_name: string;
}

export interface UserProfile {
  id: number;
  user: UserDetail;
  /** Setores e funções da pessoa. Ausente em sessões gravadas antes da troca para permissões. */
  vinculos?: Vinculo[];
  permissoes?: ResumoPermissoes;
  is_superuser?: boolean;
  nivel_usuario: string;
  foto_perfil: string | null;
  ativo: boolean;
  criado_em: string;
  criado_por: string | null;
  cpf?: string;
  token?: string | null;
}

export interface UsuarioPayload {
  id: number;
  email: string;
  username: string;
  nome_completo: string;
  ativo: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  vinculos: Vinculo[];
  permissoes: ResumoPermissoes;
}

export interface TokenLoginResponse {
  refresh: string;
  access: string;
  usuario: UsuarioPayload;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const usuarioToUserProfile = (usuario: UsuarioPayload): UserProfile => ({
  id: usuario.id,
  user: {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    nome_completo: usuario.nome_completo,
    first_name: '',
    last_name: '',
  },
  vinculos: usuario.vinculos,
  permissoes: usuario.permissoes,
  is_superuser: usuario.is_superuser,
  nivel_usuario: 'normal',
  foto_perfil: null,
  ativo: usuario.ativo,
  criado_em: '',
  criado_por: null,
});

export const authService = {
  login: async (credentials: LoginCredentials): Promise<TokenLoginResponse> => {
    const response = await api.post<TokenLoginResponse>('/api/contas/auth/login/', {
      email: credentials.email,
      password: credentials.password,
    });

    const data = response.data;
    const userProfile = usuarioToUserProfile(data.usuario);

    const compatibleAuthData = {
      refresh: data.refresh,
      access: data.access,
      user: userProfile,
    };

    localStorage.setItem('auth_data', JSON.stringify(compatibleAuthData));
    localStorage.setItem('auth_raw', JSON.stringify(data));
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    return data;
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await api.post('/api/contas/auth/logout/', { refresh });
      } catch {
        // ignora erros de logout no backend
      }
    }
    localStorage.removeItem('auth_data');
    localStorage.removeItem('auth_raw');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getCurrentUser: (): UserProfile | null => {
    const authData = localStorage.getItem('auth_data');
    if (authData) {
      try {
        return JSON.parse(authData).user;
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Recarrega a pessoa logada do `/auth/me/` (setores, funções e permissões podem ter mudado
   * desde o login) e avisa a tela pelo evento `servix:auth-updated`.
   */
  refreshCurrentUser: async (): Promise<UserProfile | null> => {
    if (!localStorage.getItem('access_token')) return null;
    const { data } = await api.get<UsuarioPayload>('/api/contas/auth/me/');
    const profile = usuarioToUserProfile(data);
    authService.setCurrentUser(profile);
    window.dispatchEvent(new Event('servix:auth-updated'));
    return profile;
  },

  setCurrentUser: (profile: UserProfile) => {
    const authDataRaw = localStorage.getItem('auth_data');
    if (authDataRaw) {
      try {
        const authData = JSON.parse(authDataRaw);
        authData.user = profile;
        localStorage.setItem('auth_data', JSON.stringify(authData));
      } catch {
        localStorage.setItem('auth_data', JSON.stringify({ user: profile }));
      }
    } else {
      localStorage.setItem('auth_data', JSON.stringify({ user: profile }));
    }
  },

  requestPasswordReset: async (email: string) => {
    await api.post('/api/contas/auth/password/reset/', { email });
  },

  resetPassword: async (token: string, new_password: string) => {
    await api.post('/api/contas/auth/password/reset/confirm/', { token, new_password });
  },
};
