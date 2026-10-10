import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortingState } from '@tanstack/react-table';

export type FacetFilters = Record<string, string[]>;

export interface TableUrlState {
  q: string;
  view: string | undefined;
  sorting: SortingState;
  page: number;
  filters: FacetFilters;
}

interface Options {
  enabled: boolean;
  defaultView?: string;
  defaultSort?: { id: string; desc?: boolean };
}

/*
 * Busca, visão, filtros, ordenação e página ficam na URL:
 *   ?q=metal&view=atrasadas&f.status=aberta,em_andamento&sort=-prazo&page=2
 * Assim, voltar do detalhe preserva a lista e o link pode ser compartilhado.
 * Valores padrão não são escritos, para a URL ficar limpa.
 */

const FACET_PREFIX = 'f.';

const sortToParam = (s: SortingState) => (s[0] ? `${s[0].desc ? '-' : ''}${s[0].id}` : '');
const paramToSort = (p: string | null): SortingState | null =>
  p ? [{ id: p.replace(/^-/, ''), desc: p.startsWith('-') }] : null;

export function useDataTableUrlState({ enabled, defaultView, defaultSort }: Options) {
  const [params, setParams] = useSearchParams();
  const defaultSorting: SortingState = useMemo(() => (defaultSort ? [{ id: defaultSort.id, desc: !!defaultSort.desc }] : []), [defaultSort]);

  const [local, setLocal] = useState<TableUrlState>({ q: '', view: defaultView, sorting: defaultSorting, page: 1, filters: {} });

  const fromUrl: TableUrlState = useMemo(() => {
    const filters: FacetFilters = {};
    params.forEach((value, key) => {
      if (key.startsWith(FACET_PREFIX) && value) filters[key.slice(FACET_PREFIX.length)] = value.split(',');
    });
    return {
      q: params.get('q') ?? '',
      view: params.get('view') ?? defaultView,
      sorting: paramToSort(params.get('sort')) ?? defaultSorting,
      page: Math.max(1, Number(params.get('page')) || 1),
      filters,
    };
  }, [params, defaultView, defaultSorting]);

  const state = enabled ? fromUrl : local;

  const update = useCallback(
    (patch: Partial<TableUrlState>) => {
      // Qualquer mudança que não seja de página volta para a página 1.
      const next: TableUrlState = { ...state, page: 1, ...patch };
      if (!enabled) {
        setLocal(next);
        return;
      }
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          [...p.keys()].filter((k) => k.startsWith(FACET_PREFIX)).forEach((k) => p.delete(k));
          const set = (key: string, value: string, isDefault: boolean) => (isDefault || !value ? p.delete(key) : p.set(key, value));
          set('q', next.q.trim(), false);
          set('view', next.view ?? '', next.view === defaultView);
          set('sort', sortToParam(next.sorting), sortToParam(next.sorting) === sortToParam(defaultSorting));
          set('page', String(next.page), next.page === 1);
          Object.entries(next.filters).forEach(([k, v]) => v.length && p.set(FACET_PREFIX + k, v.join(',')));
          return p;
        },
        { replace: true },
      );
    },
    [state, enabled, setParams, defaultView, defaultSorting],
  );

  return { state, update, defaultSorting };
}
