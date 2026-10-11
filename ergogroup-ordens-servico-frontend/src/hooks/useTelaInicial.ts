import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TELAS_INICIAIS,
  gravarTelaPreferida,
  lerTelaPreferida,
  podeAbrir,
  telaPelasPermissoes,
  type TelaInicial,
  type TelaInicialId,
} from '@/lib/telaInicial';
import { useCurrentUser } from './useCurrentUser';
import { usePermissoes } from './usePermissoes';

const EVENTO = 'servix:tela-inicial';

export interface TelaInicialDaSessao {
  /** Tela onde a pessoa cai ao entrar: a escolhida, se ainda tiver acesso, ou a da regra. */
  tela: TelaInicial;
  /** A da regra por permissões. */
  automatica: TelaInicial;
  /** A escolhida em "Abrir sempre em…", ou `null` (automática). */
  preferida: TelaInicialId | null;
  /** Telas que a pessoa pode escolher. */
  opcoes: TelaInicial[];
  escolher: (id: TelaInicialId | null) => void;
}

export function useTelaInicial(): TelaInicialDaSessao {
  const { user } = useCurrentUser();
  const permissoes = usePermissoes();
  const usuarioId = user?.id;
  const [preferida, setPreferida] = useState(() => lerTelaPreferida(usuarioId));

  useEffect(() => {
    const reler = () => setPreferida(lerTelaPreferida(usuarioId));
    reler();
    window.addEventListener(EVENTO, reler);
    return () => window.removeEventListener(EVENTO, reler);
  }, [usuarioId]);

  const escolher = useCallback(
    (id: TelaInicialId | null) => {
      if (usuarioId == null) return;
      gravarTelaPreferida(usuarioId, id);
      window.dispatchEvent(new Event(EVENTO));
    },
    [usuarioId],
  );

  return useMemo(() => {
    const opcoes = TELAS_INICIAIS.filter((t) => podeAbrir(t, permissoes));
    const automatica = telaPelasPermissoes(permissoes);
    const escolhida = opcoes.find((t) => t.id === preferida);
    return { tela: escolhida ?? automatica, automatica, preferida: escolhida ? preferida : null, opcoes, escolher };
  }, [permissoes, preferida, escolher]);
}
