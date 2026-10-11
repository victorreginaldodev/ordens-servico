import { useState } from 'react';

/** Preferência de tela guardada só neste navegador (ex.: lista ou quadro). Sem armazenamento, vale o padrão. */
export function usePreferencia<T extends string>(chave: string, padrao: T, validos: readonly T[]): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const v = localStorage.getItem(chave) as T | null;
      return v && validos.includes(v) ? v : padrao;
    } catch {
      return padrao;
    }
  });
  const gravar = (v: T) => {
    setValor(v);
    try {
      localStorage.setItem(chave, v);
    } catch {
      /* preferência só desta sessão */
    }
  };
  return [valor, gravar];
}
