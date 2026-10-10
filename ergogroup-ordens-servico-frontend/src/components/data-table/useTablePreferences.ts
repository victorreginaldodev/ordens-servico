import { useCallback, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import type { Density, Layout } from './types';

// Preferências por usuário, guardadas no navegador. localStorage pode falhar
// (modo privado, bloqueio de site data), então tudo tem fallback.

const read = <V,>(key: string, fallback: V): V => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as V);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* preferência é conveniência; sem storage, vale só nesta sessão */
  }
};

function usePersisted<V>(key: string, fallback: V) {
  const [value, setValue] = useState<V>(() => read(key, fallback));
  const set = useCallback(
    (next: V | ((prev: V) => V)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: V) => V)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, set] as const;
}

export function useTablePreferences(
  tableId: string,
  defaults: { pageSize: number; hiddenColumns: string[]; layout?: Layout },
) {
  // Densidade é global: quem prefere compacta prefere em todas as tabelas.
  const [density, setDensity] = usePersisted<Density>('table:density', 'comfortable');
  const [pageSize, setPageSize] = usePersisted<number>(`table:${tableId}:pageSize`, defaults.pageSize);
  const [columnVisibility, setColumnVisibility] = usePersisted<VisibilityState>(
    `table:${tableId}:columns`,
    Object.fromEntries(defaults.hiddenColumns.map((id) => [id, false])),
  );
  const [layout, setLayout] = usePersisted<Layout>(`table:${tableId}:layout`, defaults.layout ?? 'tabela');
  return { density, setDensity, pageSize, setPageSize, columnVisibility, setColumnVisibility, layout, setLayout };
}
