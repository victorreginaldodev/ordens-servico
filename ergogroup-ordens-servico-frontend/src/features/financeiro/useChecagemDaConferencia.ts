import { useCallback, useRef, useState } from 'react';
import type { Conferencia } from './services';

export type FaseDaChecagem = 'parado' | 'rodando' | 'concluido' | 'erro';

/**
 * Estado da checagem animada da conferência (`components/ChecagemDaConferencia.tsx`): dispara a consulta e guarda a
 * resposta; o componente avança as etapas no seu ritmo. Uma checagem nova descarta a resposta de uma anterior.
 */
export function useChecagemDaConferencia(executar: () => Promise<Conferencia | undefined>) {
  const [fase, setFase] = useState<FaseDaChecagem>('parado');
  const [passo, setPasso] = useState(0);
  const [resultado, setResultado] = useState<Conferencia | null>(null);
  const execucao = useRef(0);

  const iniciar = useCallback(() => {
    const id = ++execucao.current;
    setResultado(null);
    setPasso(0);
    setFase('rodando');
    executar()
      .then((dados) => {
        if (execucao.current !== id) return;
        if (dados) setResultado(dados);
        else setFase('erro');
      })
      .catch(() => execucao.current === id && setFase('erro'));
  }, [executar]);

  return { fase, setFase, passo, setPasso, resultado, iniciar };
}
