import { useMemo } from 'react';
import { usePermissoes } from '@/hooks/usePermissoes';
import { modulosVisiveis, type ModuloDaAjuda } from './conteudo';

/** Módulos e páginas da Ajuda que a pessoa logada pode ver (o resto some do índice e da busca). */
export function useAjuda(): ModuloDaAjuda[] {
  const { podeAlguma } = usePermissoes();
  return useMemo(() => modulosVisiveis(podeAlguma), [podeAlguma]);
}
