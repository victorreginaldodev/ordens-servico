import { useEffect, useMemo, useState } from 'react';
import { authService, type UserProfile } from '@/services/auth';
import { getIniciais } from '@/lib/format';
import { descreverVinculos } from '@/lib/permissoes';

/** Usuário logado + nome/funções prontos para exibir. Atualiza quando o perfil muda. */
export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const refresh = () => setUser(authService.getCurrentUser());
    window.addEventListener('servix:auth-updated', refresh);
    return () => window.removeEventListener('servix:auth-updated', refresh);
  }, []);

  return useMemo(() => {
    // Nome completo por padrão; sem ele, o nome de usuário.
    const displayName = user?.user.nome_completo?.trim() || user?.user.username?.trim() || 'Usuário';
    return {
      user,
      displayName,
      email: user?.user.email ?? '',
      initials: getIniciais(displayName),
      roleLabel: descreverVinculos(user?.vinculos),
      photo: user?.foto_perfil ?? null,
    };
  }, [user]);
}
