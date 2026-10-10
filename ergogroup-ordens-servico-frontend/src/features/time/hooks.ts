import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UsuarioApi,
  CreateUserPayload,
  UpdateUserPayload,
  ProfileResponse,
  UpdateProfilePayload,
  AlterarSenhaPayload,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  setUserAtivo,
  getMyProfile,
  getProfileDetail,
  updateProfile,
  alterarSenha,
} from './services';

// ── Gestão de usuários ────────────────────────────────────────────────────────

export const useUsers = () =>
  useQuery<UsuarioApi[]>({
    queryKey: ['time', 'lista'],
    queryFn: getUsers,
  });

export const useUpsertUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: (CreateUserPayload & { id?: number }) | (UpdateUserPayload & { id: number }),
    ) => {
      if ('id' in payload && payload.id !== undefined) {
        const { id, ...rest } = payload as UpdateUserPayload & { id: number };
        return updateUser(id, rest);
      }
      return createUser(payload as CreateUserPayload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['time', 'lista'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await deleteUser(id);
      return id;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['time', 'lista'] });
    },
  });
};

export const useSetUserAtivo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => setUserAtivo(id, ativo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['time'] });
    },
  });
};

// ── Perfil do usuário autenticado ────────────────────────────────────────────

export const useMyProfile = () =>
  useQuery<ProfileResponse>({
    queryKey: ['time', 'eu'],
    queryFn: getMyProfile,
  });

export const useProfileDetail = (id?: number | null) =>
  useQuery<ProfileResponse>({
    queryKey: ['time', 'pessoa', id],
    enabled: typeof id === 'number',
    queryFn: () => {
      if (typeof id !== 'number') throw new Error('missing id');
      return getProfileDetail(id);
    },
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProfilePayload }) => updateProfile(id, payload),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ['time', 'pessoa', id] });
      await qc.invalidateQueries({ queryKey: ['time', 'eu'] });
      await qc.invalidateQueries({ queryKey: ['time', 'lista'] });
    },
  });
};

export const useAlterarSenha = () =>
  useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AlterarSenhaPayload }) => alterarSenha(id, payload),
  });
