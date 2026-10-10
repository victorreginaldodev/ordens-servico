import { useMemo } from 'react';
import { useCatalogos } from '@/features/catalogo/hooks';
import type { CatalogoItem } from '@/features/catalogo/services';
import { useFuncoes, useMembros, useSetores } from './hooks';
import { funcaoLiberadaNoSetor, type Funcao, type Membro, type Setor } from './services';

export interface ResumoSetor {
  setor: Setor;
  membros: Membro[];
  /** Quem distribui o trabalho no setor (função com `tarefas.distribuir`). */
  gestores: Membro[];
  catalogos: CatalogoItem[];
  /** Funções que podem ser atribuídas neste setor. */
  funcoes: Funcao[];
}

/**
 * Setores com as pessoas, gestores e catálogos de cada um. A organização tem poucas dezenas de
 * pessoas, então os vínculos e catálogos são carregados uma vez e agrupados aqui.
 */
export function useResumoSetores() {
  const setores = useSetores();
  const membros = useMembros();
  const funcoes = useFuncoes();
  const catalogos = useCatalogos();

  const dados = useMemo(() => {
    const distribui = new Set(
      (funcoes.data ?? []).filter((f) => f.permissoes.includes('tarefas.distribuir')).map((f) => f.id),
    );
    const resumos: ResumoSetor[] = (setores.data ?? []).map((setor) => {
      const doSetor = (membros.data ?? []).filter((m) => m.setor === setor.id);
      return {
        setor,
        membros: doSetor,
        gestores: doSetor.filter((m) => distribui.has(m.funcao)),
        catalogos: (catalogos.data ?? []).filter((c) => c.setor === setor.id),
        funcoes: (funcoes.data ?? []).filter((f) => funcaoLiberadaNoSetor(f, setor.id)),
      };
    });
    const catalogosSemSetor = (catalogos.data ?? []).filter((c) => c.setor == null).length;
    return { resumos, catalogosSemSetor, todasAsFuncoes: funcoes.data ?? [] };
  }, [setores.data, membros.data, funcoes.data, catalogos.data]);

  return {
    ...dados,
    // `isPending` (ainda sem resposta), e não `isLoading`: com a aba sem foco o React Query pausa
    // as novas tentativas, e a tela mostraria "nenhum setor" em vez de carregando.
    isLoading: setores.isPending,
    isError: setores.isError,
    /** Contadores ainda carregando (vínculos, funções ou catálogos). */
    detalhesCarregando: membros.isPending || funcoes.isPending || catalogos.isPending,
  };
}
