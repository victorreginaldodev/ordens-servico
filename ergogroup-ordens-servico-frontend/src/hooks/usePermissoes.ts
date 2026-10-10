import { useMemo } from 'react';
import { criarVerificador, type Verificador, type Vinculo } from '@/lib/permissoes';
import { useCurrentUser } from './useCurrentUser';

export interface PermissoesDaSessao extends Verificador {
  /** Setores e funções da pessoa logada. */
  vinculos: Vinculo[];
  /** Verdadeiro quando as permissões por setor valem em qualquer setor (diretoria, superusuário). */
  todosOsSetores: boolean;
}

/**
 * Permissões da pessoa logada. Uso: `const { pode } = usePermissoes(); pode('tarefas.distribuir', servico.setor)`.
 * Sessões antigas, sem `permissoes` gravadas, não podem nada até o `/auth/me/` responder.
 */
export function usePermissoes(): PermissoesDaSessao {
  const { user } = useCurrentUser();
  return useMemo(() => {
    const superusuario = !!user?.is_superuser;
    return {
      ...criarVerificador(user?.permissoes, superusuario),
      vinculos: user?.vinculos ?? [],
      todosOsSetores: superusuario || !!user?.permissoes?.todos_os_setores,
    };
  }, [user]);
}
