import type { CellContext } from '@tanstack/react-table';
import {
  COBRANCA_DEFS,
  CobrancaBadge,
  PRIORIDADE_DEFS,
  PessoaChip,
  PrazoIndicator,
  PrioridadeIndicator,
  STATUS_DEFS,
  StatusBadge,
  getCobrancaSituacao,
  type StatusEntity,
  type ToneDef,
} from '@/components/kit';
import { parseDate, type DateInput } from '@/lib/format';
import {
  CellAvatar,
  CellBooleano,
  CellContato,
  CellData,
  CellMoeda,
  CellNivel,
  CellNumero,
  CellRegistro,
  CellSituacao,
  CellTexto,
} from './cells';
import type { ColumnPriority, DataTableColumn, FacetOption } from './types';

/**
 * Fábricas de coluna: cada tipo de coluna do design system já sai com célula,
 * alinhamento, ordenação e regra de vazio. Uma tela só declara:
 *
 *   col.status('status', 'Status', (r) => r.status, { entity: 'os' })
 */

type Getter<T, V> = (row: T) => V;

export interface ColumnOptions {
  priority?: ColumnPriority;
  financial?: boolean;
  width?: string;
  enableSorting?: boolean;
}

const defsToOptions = (defs: Record<string, ToneDef>): FacetOption[] =>
  Object.entries(defs).map(([value, def]) => ({ value, label: def.label }));

const orderIndex = (defs: Record<string, ToneDef>) => {
  const keys = Object.keys(defs);
  return (value: string | null | undefined) => {
    const i = value ? keys.indexOf(value) : -1;
    return i === -1 ? undefined : i;
  };
};

/** `undefined` faz o TanStack mandar o vazio para o fim (sortUndefined: 'last'). */
const orUndefined = <V,>(v: V | null | undefined) => (v === null || v === '' ? undefined : v);
const timestamp = (value: DateInput) => parseDate(value)?.getTime();

function base<T>(
  id: string,
  header: string,
  accessor: Getter<T, unknown>,
  cell: (ctx: CellContext<T, unknown>) => React.ReactNode,
  opts: ColumnOptions & {
    align?: 'left' | 'right';
    sortingFn?: 'textPtBr' | 'basic';
    facetValue?: (row: T) => string | null | undefined;
    facetOptions?: FacetOption[];
  },
): DataTableColumn<T> {
  // Só as chaves conhecidas vão para o meta: as opções próprias de cada fábrica
  // (ex.: `label` do booleano) não podem sobrescrever o nome da coluna.
  const { priority = 1, financial, width, enableSorting = true, align = 'left', sortingFn = 'basic', facetValue, facetOptions } = opts;
  return {
    id,
    header,
    accessorFn: (row: T) => orUndefined(accessor(row)),
    cell,
    enableSorting,
    sortingFn,
    sortUndefined: 'last',
    meta: { label: header, align, priority, financial, width, facetValue, facetOptions },
  };
}

export const col = {
  /** Coluna principal: título + subtítulo (ex.: cliente / `OS 1042 · CNPJ …`). */
  registro<T>(
    id: string,
    header: string,
    o: ColumnOptions & {
      title: Getter<T, string | null | undefined>;
      subtitle?: Getter<T, React.ReactNode>;
      sortBy?: Getter<T, string | number | null | undefined>;
      /** Mostra o avatar de iniciais do título (listagens de pessoas). */
      avatar?: boolean;
    },
  ) {
    return base<T>(
      id,
      header,
      o.sortBy ?? o.title,
      ({ row, table }) => {
        const density = table.options.meta?.density;
        const title = o.title(row.original);
        return (
          <CellRegistro
            title={title}
            subtitle={o.subtitle?.(row.original)}
            density={density}
            leading={o.avatar ? <CellAvatar nome={title ?? ''} density={density} /> : undefined}
          />
        );
      },
      { ...o, sortingFn: o.sortBy ? 'basic' : 'textPtBr' },
    );
  },

  texto<T>(id: string, header: string, get: Getter<T, string | null | undefined>, o: ColumnOptions & { facet?: boolean } = {}) {
    return base<T>(id, header, get, ({ row }) => <CellTexto value={get(row.original)} />, {
      ...o,
      sortingFn: 'textPtBr',
      facetValue: o.facet ? get : undefined,
    });
  },

  status<T>(id: string, header: string, get: Getter<T, string | null | undefined>, o: ColumnOptions & { entity: StatusEntity }) {
    const defs = STATUS_DEFS[o.entity] as Record<string, ToneDef>;
    const index = orderIndex(defs);
    return base<T>(id, header, (r) => index(get(r)), ({ row }) => <StatusBadge entity={o.entity} value={get(row.original)} />, {
      width: '150px',
      ...o,
      facetValue: get,
      facetOptions: defsToOptions(defs),
    });
  },

  prioridade<T>(id: string, header: string, get: Getter<T, string | null | undefined>, o: ColumnOptions = {}) {
    const index = orderIndex(PRIORIDADE_DEFS);
    return base<T>(id, header, (r) => index(get(r)), ({ row }) => <PrioridadeIndicator value={get(row.original)} />, {
      width: '110px',
      ...o,
      facetValue: get,
      facetOptions: defsToOptions(PRIORIDADE_DEFS),
    });
  },

  prazo<T>(id: string, header: string, get: Getter<T, DateInput>, o: ColumnOptions & { encerrado?: Getter<T, boolean> } = {}) {
    return base<T>(
      id,
      header,
      (r) => timestamp(get(r)),
      ({ row, table }) => (
        <PrazoIndicator
          prazo={get(row.original)}
          encerrado={o.encerrado?.(row.original)}
          layout={table.options.meta?.density === 'compact' ? 'inline' : 'stack'}
        />
      ),
      { width: '150px', ...o },
    );
  },

  data<T>(id: string, header: string, get: Getter<T, DateInput>, o: ColumnOptions = {}) {
    return base<T>(id, header, (r) => timestamp(get(r)), ({ row }) => <CellData value={get(row.original)} />, { width: '120px', ...o });
  },

  moeda<T>(id: string, header: string, get: Getter<T, string | number | null | undefined>, o: ColumnOptions = {}) {
    return base<T>(
      id,
      header,
      (r) => {
        const v = get(r);
        return v === null || v === undefined || v === '' ? undefined : Number(v);
      },
      ({ row }) => <CellMoeda value={get(row.original)} />,
      { width: '140px', financial: true, align: 'right', ...o },
    );
  },

  numero<T>(id: string, header: string, get: Getter<T, string | number | null | undefined>, o: ColumnOptions & { format?: 'numero' | 'horas'; suffix?: string } = {}) {
    return base<T>(
      id,
      header,
      (r) => {
        const v = get(r);
        return v === null || v === undefined || v === '' ? undefined : Number(v);
      },
      ({ row }) => <CellNumero value={get(row.original)} format={o.format} suffix={o.suffix} />,
      { width: '100px', align: 'right', ...o },
    );
  },

  nivel<T>(id: string, header: string, get: Getter<T, number | null | undefined>, o: ColumnOptions = {}) {
    return base<T>(id, header, get, ({ row }) => <CellNivel value={get(row.original)} />, {
      width: '120px',
      ...o,
      facetValue: (r) => (get(r) ? String(get(r)) : null),
      facetOptions: [
        { value: '1', label: 'Baixa' },
        { value: '2', label: 'Média' },
        { value: '3', label: 'Alta' },
      ],
    });
  },

  pessoa<T>(id: string, header: string, get: Getter<T, string | null | undefined>, o: ColumnOptions & { foto?: Getter<T, string | null | undefined>; facet?: boolean } = {}) {
    return base<T>(id, header, get, ({ row }) => <PessoaChip nome={get(row.original)} foto={o.foto?.(row.original)} />, {
      width: '170px',
      ...o,
      sortingFn: 'textPtBr',
      facetValue: o.facet ? get : undefined,
    });
  },

  booleano<T>(id: string, header: string, get: Getter<T, boolean | null | undefined>, o: ColumnOptions & { label?: string } = {}) {
    return base<T>(id, header, (r) => (get(r) ? 0 : 1), ({ row }) => <CellBooleano value={get(row.original)} label={o.label} />, {
      width: '110px',
      ...o,
      facetValue: (r) => (get(r) ? 'sim' : 'nao'),
      facetOptions: [
        { value: 'sim', label: o.label ?? 'Sim' },
        { value: 'nao', label: 'Não' },
      ],
    });
  },

  situacao<T>(id: string, header: string, getAtivo: Getter<T, boolean | null | undefined>, o: ColumnOptions = {}) {
    return base<T>(id, header, (r) => (getAtivo(r) ? 0 : 1), ({ row }) => <CellSituacao ativo={getAtivo(row.original)} />, {
      width: '100px',
      ...o,
      facetValue: (r) => (getAtivo(r) ? 'ativo' : 'inativo'),
      facetOptions: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
      ],
    });
  },

  cobranca<T>(id: string, header: string, get: Getter<T, { liberada?: boolean | null; cobrada?: boolean | null; nf?: string | number | null }>, o: ColumnOptions = {}) {
    const index = orderIndex(COBRANCA_DEFS);
    const situacao = (r: T) => getCobrancaSituacao(get(r));
    return base<T>(
      id,
      header,
      (r) => index(situacao(r)),
      ({ row }) => {
        const v = get(row.original);
        return <CobrancaBadge liberada={v.liberada} cobrada={v.cobrada} nf={v.nf} />;
      },
      { width: '190px', financial: true, ...o, facetValue: situacao, facetOptions: defsToOptions(COBRANCA_DEFS) },
    );
  },

  contato<T>(id: string, header: string, get: Getter<T, string | null | undefined>, o: ColumnOptions & { kind: 'email' | 'telefone' }) {
    return base<T>(id, header, get, ({ row }) => <CellContato value={get(row.original)} kind={o.kind} />, { ...o, sortingFn: 'textPtBr' });
  },

  /** Escape para casos fora do catálogo. Preferir um tipo existente. */
  custom<T>(id: string, header: string, o: ColumnOptions & { accessor: Getter<T, unknown>; cell: (row: T) => React.ReactNode; align?: 'left' | 'right'; sortingFn?: 'textPtBr' | 'basic' }) {
    return base<T>(id, header, o.accessor, ({ row }) => o.cell(row.original), o);
  },
};
