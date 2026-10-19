import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissoes } from '@/hooks/usePermissoes';
import {
  atualizarFuncao,
  atualizarSetor,
  atualizarSetoresDaFuncao,
  criarFuncao,
  excluirFuncao,
  getPermissoesDisponiveis,
  type FuncaoPayload,
  type PermissaoDisponivel,
  criarSetor,
  excluirSetor,
  getFuncoes,
  getMembros,
  getOrganizacoes,
  getSetores,
  type Funcao,
  type Membro,
  type Organizacao,
  type Setor,
  type SetorPayload,
} from './services';

export const organizacaoKeys = {
  todos: ['organizacao'] as const,
  setores: ['organizacao', 'setores'] as const,
  funcoes: ['organizacao', 'funcoes'] as const,
  membros: ['organizacao', 'membros'] as const,
  organizacoes: ['organizacao', 'organizacoes'] as const,
  permissoes: ['organizacao', 'permissoes-disponiveis'] as const,
};

/** Funções e permissões são cadastradas só por superusuários (regra do backend, 19/10/2026). */
export const usePodeEditarFuncao = () => {
  const { superusuario } = usePermissoes();
  return (_f: Pick<Funcao, 'permissoes'>) => superusuario;
};

/** Catálogo fixo de permissões: muda só com deploy do backend. */
export const usePermissoesDisponiveis = () =>
  useQuery<PermissaoDisponivel[]>({ queryKey: organizacaoKeys.permissoes, queryFn: getPermissoesDisponiveis, staleTime: Infinity });

export const useSetores = () => useQuery<Setor[]>({ queryKey: organizacaoKeys.setores, queryFn: getSetores });

export const useFuncoes = () => useQuery<Funcao[]>({ queryKey: organizacaoKeys.funcoes, queryFn: getFuncoes });

export const useMembros = () => useQuery<Membro[]>({ queryKey: organizacaoKeys.membros, queryFn: getMembros });

/** A organização da pessoa logada (o sistema atende uma organização). */
export const useOrganizacaoAtual = () =>
  useQuery<Organizacao[], Error, Organizacao | undefined>({
    queryKey: organizacaoKeys.organizacoes,
    queryFn: getOrganizacoes,
    select: (lista) => lista[0],
  });

/** Mudar setor afeta permissões e listas de pessoas: invalida o que depende dele. */
const useInvalidarSetores = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: organizacaoKeys.todos }),
      qc.invalidateQueries({ queryKey: ['time'] }),
      qc.invalidateQueries({ queryKey: ['auth-me'] }),
    ]);
};

export const useSalvarSetor = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: ({ id, organizacao, payload }: { id?: number; organizacao?: number; payload: SetorPayload }) => {
      if (id) return atualizarSetor(id, payload);
      if (!organizacao) throw new Error('Organização não carregada.');
      return criarSetor(organizacao, payload);
    },
    onSuccess: invalidar,
  });
};

export const useAlterarStatusSetor = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => atualizarSetor(id, { ativo }),
    onSuccess: invalidar,
  });
};

/** Libera ou retira funções de um setor, uma requisição por função alterada. */
export const useAlterarFuncoesDoSetor = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async (alteracoes: Array<{ funcao: Funcao; setores: number[] }>) => {
      for (const { funcao, setores } of alteracoes) await atualizarSetoresDaFuncao(funcao.id, setores);
    },
    // Também em erro: as funções salvas antes da falha precisam aparecer.
    onSettled: invalidar,
  });
};

export const useSalvarFuncao = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: ({ id, organizacao, payload }: { id?: number; organizacao?: number; payload: FuncaoPayload }) => {
      if (id) return atualizarFuncao(id, payload);
      if (!organizacao) throw new Error('Organização não carregada.');
      return criarFuncao(organizacao, payload);
    },
    onSuccess: invalidar,
  });
};

export const useAlterarStatusFuncao = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => atualizarFuncao(id, { ativo }),
    onSuccess: invalidar,
  });
};

export const useExcluirFuncao = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({ mutationFn: excluirFuncao, onSuccess: invalidar });
};

export const useExcluirSetor = () => {
  const invalidar = useInvalidarSetores();
  return useMutation({ mutationFn: excluirSetor, onSuccess: invalidar });
};
