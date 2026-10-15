import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type SortingFn,
} from '@tanstack/react-table';
import {
  AlignJustify,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Ellipsis,
  LayoutGrid,
  List,
  Search,
  SearchX,
  Settings2,
  Table2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/kit';
import { usePermissoes } from '@/hooks/usePermissoes';
import { dentroDoPeriodo, intervaloDoPeriodo, periodoDosValores, rotuloDoPeriodo, valoresDoPeriodo } from '@/lib/periodo';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from './DataTableColumnHeader';
import { DataTableFacetedFilter } from './DataTableFacetedFilter';
import { DataTablePagination } from './DataTablePagination';
import { DataTablePeriodFilter } from './DataTablePeriodFilter';
import { DataTableViews } from './DataTableViews';
import { useDataTableUrlState, type FacetFilters } from './useDataTableUrlState';
import { useTablePreferences } from './useTablePreferences';
import type {
  DataTableColumn,
  DataTableEmptyStates,
  DataTableFacet,
  DataTablePeriodFilter as PeriodFilter,
  DataTableRowAction,
  DataTableSearch,
  DataTableView,
  Layout,
} from './types';

export interface DataTableProps<T> {
  /** Identificador estável: chave das preferências salvas (linhas por página, colunas). */
  id: string;
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  getRowId?: (row: T) => string;
  /** Linha vira link: clique abre, Ctrl/⌘+clique ou botão do meio abre em nova aba, Enter abre. */
  getRowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Cadastro desativado: linha esmaecida. */
  isRowInactive?: (row: T) => boolean;
  views?: DataTableView<T>[];
  defaultView?: string;
  search?: DataTableSearch<T>;
  facets?: DataTableFacet<T>[];
  /** Filtro(s) por período de uma data (ex.: data da venda), ao lado dos filtros facetados. */
  periodFilter?: PeriodFilter<T> | PeriodFilter<T>[];
  defaultSort?: { id: string; desc?: boolean };
  /** Ações secundárias no menu ⋯ da linha. */
  rowActions?: (row: T) => DataTableRowAction<T>[];
  /** Ação principal visível na linha (ex.: "Registrar cobrança"). Tem prioridade sobre o menu. */
  renderRowAction?: (row: T) => React.ReactNode;
  /**
   * Coluna de ações com cabeçalho visível (ex.: "Ações") e largura própria, para telas em que a ação principal
   * é um botão com texto. Sem ela, a coluna é estreita e sem título (só o menu ⋯).
   */
  actionsColumn?: { header: string; width: string };
  /** Botões extras à direita da toolbar. */
  toolbarActions?: React.ReactNode;
  /** Conteúdo extra no rodapé, recebe as linhas da página atual (ex.: total em R$). */
  footerSummary?: (pageRows: T[]) => React.ReactNode;
  isLoading?: boolean;
  /** Atualizando em segundo plano: mantém os dados e mostra uma barra fina. */
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyStates?: DataTableEmptyStates;
  /** Busca, filtros, ordem e página na URL. Desligue se houver mais de uma tabela na página. */
  syncWithUrl?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** Sobrescreve a regra de perfil para colunas `financial` (padrão: a permissão `financeiro.ver_valores`). */
  canViewFinancial?: boolean;
  /** Distância do topo da área de rolagem para o cabeçalho fixo. O header do app fica fora dela, então o padrão é 0. */
  stickyOffset?: string;
  /** Linhas verticais entre as colunas de dados (docs/ui/design-system-tabelas.md §9). */
  gridLines?: boolean;
  /**
   * Conteúdo do card de um registro. Com ele, a toolbar ganha a alternância Tabela/Cards; busca,
   * filtros, visões, ordenação e paginação valem nas duas.
   */
  renderCard?: (row: T) => React.ReactNode;
  /** Na visão em cards, agrupa os registros da página por este rótulo (ex.: setor). */
  cardGroupBy?: (row: T) => string;
  /**
   * Quadro em colunas desenhado pela tela (ex.: kanban por etapa). Recebe todos os registros filtrados e
   * ordenados, sem paginação. Com ele, a alternância da toolbar ganha a opção Quadro.
   */
  renderBoard?: (rows: T[]) => React.ReactNode;
  /**
   * No quadro, as colunas fazem o papel das visões: as abas somem e o quadro recebe todos os registros da
   * busca e dos filtros. `facets` e `periodFilter` daqui substituem os da tabela no quadro (sem eles, valem
   * os da tabela).
   */
  boardReplacesViews?: boolean | { facets?: DataTableFacet<T>[]; periodFilter?: PeriodFilter<T>[] };
  /** Ações à direita da linha das visões (ex.: uma ação em lote da visão escolhida). */
  viewsActions?: React.ReactNode;
  /** Visão inicial, antes de a pessoa escolher uma (a escolha fica salva por tabela). */
  defaultLayout?: Layout;
}

const normalize = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const textPtBr: SortingFn<unknown> = (a, b, id) =>
  String(a.getValue(id) ?? '').localeCompare(String(b.getValue(id) ?? ''), 'pt-BR', { sensitivity: 'base', numeric: true });

const INTERACTIVE = 'a,button,input,select,textarea,label,[role="menuitem"],[role="checkbox"],[data-row-interactive]';

export function DataTable<T>({
  id,
  data,
  columns,
  getRowId,
  getRowHref,
  onRowClick,
  isRowInactive,
  views,
  defaultView,
  search,
  facets = [],
  periodFilter,
  defaultSort,
  rowActions,
  renderRowAction,
  actionsColumn,
  toolbarActions,
  footerSummary,
  isLoading,
  isFetching,
  isError,
  onRetry,
  emptyStates,
  syncWithUrl = true,
  defaultPageSize = 50,
  pageSizeOptions = [25, 50, 100],
  canViewFinancial,
  stickyOffset = '0px',
  gridLines = true,
  renderCard,
  cardGroupBy,
  renderBoard,
  boardReplacesViews,
  viewsActions,
  defaultLayout = 'tabela',
}: DataTableProps<T>) {
  const navigate = useNavigate();
  const isPeriod = (k: string) => periodFilters.some((p) => p.id === k);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // A tabela não coube na largura? Então rola na horizontal em vez de ser cortada pela moldura.
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const wrap = scrollRef.current;
    const tableEl = wrap?.querySelector('table');
    if (!wrap || !tableEl || typeof ResizeObserver === 'undefined') return;
    const check = () => setOverflows(tableEl.scrollWidth > wrap.clientWidth + 1);
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    ro.observe(tableEl);
    check();
    return () => ro.disconnect();
  }, []);
  const veValores = usePermissoes().pode('financeiro.ver_valores');
  const showFinancial = canViewFinancial ?? veValores;

  // ── Colunas permitidas para o perfil ────────────────────────────────────────
  const visibleColumns = useMemo(
    () => columns.filter((c) => !(c.meta?.financial && !showFinancial)),
    [columns, showFinancial],
  );
  const columnById = useMemo(() => new Map(visibleColumns.map((c) => [c.id as string, c])), [visibleColumns]);

  // ── Preferências (a visão em quadro pode trocar as abas e os filtros) ────────
  const prefs = useTablePreferences(id, {
    layout: defaultLayout,
    pageSize: defaultPageSize,
    hiddenColumns: visibleColumns.filter((c) => c.meta?.priority === 3).map((c) => c.id as string),
  });
  const boardOwnsViews = !!renderBoard && prefs.layout === 'quadro' && !!boardReplacesViews;
  const boardConfig = typeof boardReplacesViews === 'object' ? boardReplacesViews : {};
  const effectiveFacets = (boardOwnsViews && boardConfig.facets) || facets;
  const effectivePeriod = boardOwnsViews && boardConfig.periodFilter ? boardConfig.periodFilter : periodFilter;
  const periodFilters = useMemo(() => (Array.isArray(effectivePeriod) ? effectivePeriod : effectivePeriod ? [effectivePeriod] : []), [effectivePeriod]);
  const activeFacets = useMemo(
    () => effectiveFacets.filter((f) => f.getValue || columnById.get(f.columnId)?.meta?.facetValue),
    [effectiveFacets, columnById],
  );
  /** Valores do registro para um filtro, sempre como lista. */
  const facetValuesOf = useMemo(() => {
    const getters = new Map(
      activeFacets.map((f) => [f.columnId, f.getValue ?? columnById.get(f.columnId)!.meta!.facetValue!] as const),
    );
    return (colId: string, row: T): string[] => {
      const v = getters.get(colId)?.(row);
      return (Array.isArray(v) ? v : [v]).filter((x): x is string => !!x);
    };
  }, [activeFacets, columnById]);
  const hideableColumns = useMemo(() => visibleColumns.filter((c) => (c.meta?.priority ?? 1) >= 2), [visibleColumns]);

  // ── Estado na URL ───────────────────────────────────────────────────────────
  const firstView = defaultView ?? views?.[0]?.id;
  const { state, update } = useDataTableUrlState({ enabled: syncWithUrl, defaultView: firstView, defaultSort });
  const filters: FacetFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.filters).filter(([k]) => periodFilters.some((p) => p.id === k) || activeFacets.some((f) => f.columnId === k)),
      ),
    [state.filters, activeFacets, periodFilters],
  );
  const periodos = useMemo(
    () =>
      periodFilters.map((pf) => {
        const periodo = periodoDosValores(filters[pf.id]);
        return { pf, periodo, intervalo: periodo ? intervaloDoPeriodo(periodo) : null };
      }),
    [periodFilters, filters],
  );
  const hasFilters = !!state.q.trim() || Object.values(filters).some((v) => v.length);

  // ── Filtragem: busca + facetas (+ visão) ───────────────────────────────────
  const rowsAll = useMemo(() => data ?? [], [data]);

  const matches = useMemo(() => {
    const q = normalize(state.q.trim());
    return (row: T, skipFacet?: string) => {
      if (q && search && !search.fields(row).some((f) => normalize(f).includes(q))) return false;
      for (const { pf, intervalo } of periodos) {
        if (intervalo && !dentroDoPeriodo(pf.getDate(row), intervalo)) return false;
      }
      for (const [colId, values] of Object.entries(filters)) {
        if (colId === skipFacet || periodFilters.some((p) => p.id === colId) || !values.length) continue;
        if (!facetValuesOf(colId, row).some((v) => values.includes(v))) return false;
      }
      return true;
    };
  }, [state.q, search, filters, facetValuesOf, periodos, periodFilters]);

  const view = views?.find((v) => v.id === state.view) ?? views?.find((v) => v.id === firstView);
  const inView = (row: T) => !view?.filter || view.filter(row);

  const searched = useMemo(() => rowsAll.filter((r) => matches(r)), [rowsAll, matches]);
  const rows = useMemo(() => (boardOwnsViews ? searched : searched.filter(inView)), [searched, view, boardOwnsViews]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewCounts = useMemo(
    () => views?.map((v) => ({ id: v.id, label: v.label, tone: v.tone, count: v.filter ? searched.filter(v.filter).length : searched.length })),
    [views, searched],
  );

  const facetOptions = useMemo(
    () =>
      activeFacets.map((f) => {
        const column = columnById.get(f.columnId);
        const base = rowsAll.filter((r) => matches(r, f.columnId) && inView(r));
        const counts = new Map<string, number>();
        base.forEach((r) => {
          facetValuesOf(f.columnId, r).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
        });
        const known = f.options ?? column?.meta?.facetOptions;
        const options = known
          ? known.map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }))
          : [...counts.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }));
        return { facet: f, label: f.label ?? column?.meta?.label ?? f.columnId, options };
      }),
    [activeFacets, columnById, facetValuesOf, rowsAll, matches, view], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── TanStack: ordenação, visibilidade e paginação ──────────────────────────
  const pageCount = Math.max(1, Math.ceil(rows.length / prefs.pageSize));
  const page = Math.min(state.page, pageCount);

  const table = useReactTable({
    data: rows,
    columns: visibleColumns,
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
    state: {
      sorting: state.sorting,
      columnVisibility: prefs.columnVisibility,
      pagination: { pageIndex: page - 1, pageSize: prefs.pageSize },
    },
    onColumnVisibilityChange: prefs.setColumnVisibility,
    sortingFns: { textPtBr },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    autoResetPageIndex: false,
    meta: { density: prefs.density },
  });

  const cycleSort = (colId: string) => {
    const current = state.sorting[0];
    if (current?.id !== colId) update({ sorting: [{ id: colId, desc: false }], page });
    else if (!current.desc) update({ sorting: [{ id: colId, desc: true }], page });
    else update({ sorting: defaultSort ? [{ id: defaultSort.id, desc: !!defaultSort.desc }] : [], page });
  };

  // Atalho "/" foca a busca da tabela.
  useEffect(() => {
    if (!search) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== '/' || el.closest('input,textarea,select,[contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search]);

  // Busca com debounce sem perder o que está sendo digitado.
  const debounce = useRef<number>();
  const onSearch = (value: string) => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => update({ q: value }), 250);
  };

  // ── Linha como link ────────────────────────────────────────────────────────
  const openRow = (row: T, newTab: boolean) => {
    const href = getRowHref?.(row);
    if (href) {
      if (newTab) window.open(href, '_blank', 'noopener');
      else navigate(href);
    } else onRowClick?.(row);
  };
  const clickable = !!(getRowHref || onRowClick);
  const hasActionColumn = !!(rowActions || renderRowAction);
  const dense = prefs.density === 'compact';
  const pageRows = table.getRowModel().rows;
  const leafColumns = table.getVisibleLeafColumns();
  const colSpan = leafColumns.length + (hasActionColumn ? 1 : 0);

  const responsive = (priority?: number) => (priority === 2 ? 'hidden xl:table-cell' : undefined);
  // Divisória entre colunas de dados; a coluna de ações fica sem, como parte da linha.
  const grid = gridLines ? 'border-l border-border/70 first:border-l-0' : undefined;

  const chips = Object.entries(filters).flatMap(([colId, values]) => {
    const pe = periodos.find((p) => p.pf.id === colId);
    if (pe) return pe.periodo ? [{ colId, value: '', text: `${pe.pf.label}: ${rotuloDoPeriodo(pe.periodo)}` }] : [];
    const fo = facetOptions.find((f) => f.facet.columnId === colId);
    return values.map((v) => ({ colId, value: v, text: `${fo?.label}: ${fo?.options.find((o) => o.value === v)?.label ?? v}` }));
  });
  const clearAll = () => {
    if (searchRef.current) searchRef.current.value = '';
    update({ q: '', filters: {} });
  };

  // ── Corpo: carregando / erro / vazio / linhas ──────────────────────────────
  const cards = !!renderCard && prefs.layout === 'cards';
  const board = !!renderBoard && prefs.layout === 'quadro';
  const tableLayout = !cards && !board;
  const layouts = (
    [
      ['tabela', 'Tabela', Table2, true],
      ['cards', 'Cards', LayoutGrid, !!renderCard],
      ['quadro', 'Quadro', Columns3, !!renderBoard],
    ] as const
  ).filter(([, , , ok]) => ok);

  /** Erro ou nenhum registro para mostrar (sem dados, sem resultado nos filtros ou visão vazia). */
  const renderEmpty = () => {
    if (isError) {
      return (
        <EmptyState
          icon={TriangleAlert}
          title="Não foi possível carregar os dados"
          description="Verifique a conexão e tente de novo."
          action={onRetry ? <Button variant="outline" onClick={onRetry}>Tentar novamente</Button> : undefined}
        />
      );
    }
    if (rowsAll.length === 0) return <EmptyState title="Nenhum registro ainda" {...emptyStates?.noData} />;
    if (hasFilters) {
      return (
        <EmptyState
          icon={SearchX}
          title="Nenhum resultado para esses filtros"
          description="Tente outra busca ou remova algum filtro."
          action={<Button variant="outline" onClick={clearAll}>Limpar filtros</Button>}
          {...emptyStates?.noResults}
        />
      );
    }
    return <EmptyState title="Nada nesta visão" description="Escolha outra visão acima." />;
  };

  const renderActions = (original: T, className?: string) => {
    const actions = rowActions?.(original) ?? [];
    const primary = renderRowAction?.(original);
    if (!actions.length) return primary ?? null;
    const menu = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8 opacity-60 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100', className)}
            aria-label="Ações da linha"
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((a) => (
            <DropdownMenuItem
              key={a.label}
              onSelect={() => a.onSelect(original)}
              className={cn(a.destructive && 'text-danger-strong focus:text-danger-strong')}
            >
              {a.icon ? <a.icon className="mr-2 size-4" /> : null}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    // Ação principal e menu juntos: o botão primeiro, o ⋯ sempre no mesmo lugar.
    return primary ? <div className="flex items-center justify-end gap-1">{primary}{menu}</div> : menu;
  };

  const renderCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      );
    }
    if (isError || rows.length === 0) return renderEmpty();
    const linhas = pageRows.map((r) => r.original);
    const grupos: Array<[string | null, T[]]> = cardGroupBy
      ? [...linhas.reduce((acc, r) => acc.set(cardGroupBy(r), [...(acc.get(cardGroupBy(r)) ?? []), r]), new Map<string, T[]>())]
          .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      : [[null, linhas]];
    return (
      <div className="space-y-5 p-3">
        {grupos.map(([grupo, itens]) => (
          <section key={grupo ?? 'todos'} aria-label={grupo ?? undefined}>
            {grupo !== null && (
              <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                {grupo}
                <span className="rounded-full bg-muted px-1.5 tabular-nums">{itens.length}</span>
              </h3>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map((original, i) => (
                <div
                  key={getRowId ? getRowId(original) : i}
                  role={clickable ? 'link' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={(e) => {
                    if (!clickable || (e.target as HTMLElement).closest(INTERACTIVE)) return;
                    openRow(original, e.ctrlKey || e.metaKey || e.shiftKey);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) openRow(original, e.ctrlKey || e.metaKey);
                  }}
                  className={cn(
                    'group relative flex min-h-28 flex-col rounded-lg border bg-background p-4 text-sm transition-colors',
                    clickable && 'cursor-pointer hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isRowInactive?.(original) && 'opacity-70',
                  )}
                >
                  {hasActionColumn ? <div className="absolute right-2 top-2">{renderActions(original)}</div> : null}
                  {renderCard!(original)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderBoardBody = () => {
    if (isLoading) return <Skeleton className="m-3 h-64 rounded-lg" />;
    if (isError || rows.length === 0) return renderEmpty();
    return <div className="p-3">{renderBoard!(table.getPrePaginationRowModel().rows.map((r) => r.original))}</div>;
  };

  /** Ordenação nas visões em cards e quadro, que não têm cabeçalho de coluna para clicar. */
  const sortableColumns = leafColumns.filter((c) => c.getCanSort());
  const currentSort = state.sorting[0];

  const renderBody = () => {
    if (isLoading) {
      return Array.from({ length: 10 }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-b last:border-0">
          {leafColumns.map((c, j) => (
            <td key={c.id} className={cn('px-3', dense ? 'py-2' : 'py-3', grid, responsive(c.columnDef.meta?.priority))}>
              <Skeleton className={cn('h-4', j === 0 ? 'w-3/4' : 'w-2/3', c.columnDef.meta?.align === 'right' && 'ml-auto')} />
            </td>
          ))}
          {hasActionColumn ? <td /> : null}
        </tr>
      ));
    }
    if (isError || rows.length === 0) {
      return (
        <tr>
          <td colSpan={colSpan}>{renderEmpty()}</td>
        </tr>
      );
    }
    return pageRows.map((row: Row<T>) => {
      const original = row.original;
      return (
        <tr
          key={row.id}
          tabIndex={clickable ? 0 : undefined}
          onClick={(e) => {
            if (!clickable || (e.target as HTMLElement).closest(INTERACTIVE)) return;
            openRow(original, e.ctrlKey || e.metaKey || e.shiftKey);
          }}
          onAuxClick={(e) => {
            if (e.button === 1 && getRowHref && !(e.target as HTMLElement).closest(INTERACTIVE)) openRow(original, true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target === e.currentTarget) openRow(original, e.ctrlKey || e.metaKey);
          }}
          className={cn(
            'group border-b transition-colors last:border-0',
            clickable && 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            isRowInactive?.(original) && 'opacity-70',
          )}
        >
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta;
            return (
              <td
                key={cell.id}
                className={cn(
                  'whitespace-nowrap px-3 align-middle',
                  grid,
                  dense ? 'py-1.5' : 'py-2.5',
                  meta?.align === 'right' && 'text-right',
                  responsive(meta?.priority),
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
          {hasActionColumn ? (
            <td style={actionsColumn ? { width: actionsColumn.width } : undefined} className={cn('whitespace-nowrap px-2 text-right', grid, !actionsColumn && 'w-12', dense ? 'py-1' : 'py-2')}>
              {renderActions(original)}
            </td>
          ) : null}
        </tr>
      );
    });
  };

  return (
    <div>
      {viewCounts?.length && !boardOwnsViews ? (
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <DataTableViews views={viewCounts} value={view?.id} onChange={(v) => update({ view: v })} />
          {viewsActions ? <div className="mb-3 flex items-center gap-2">{viewsActions}</div> : null}
        </div>
      ) : null}

      {/* overflow-clip (e não hidden) mantém as bordas arredondadas sem quebrar o cabeçalho fixo */}
      <div className="overflow-clip rounded-lg border bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-start gap-2 border-b px-3 py-2.5 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {search ? (
            <label className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border bg-background px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 sm:w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                defaultValue={state.q}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd className="hidden rounded border bg-muted px-1.5 text-2xs text-muted-foreground sm:inline">/</kbd>
            </label>
          ) : null}
          {facetOptions.map(({ facet, label, options }) => (
            <DataTableFacetedFilter
              key={facet.columnId}
              label={label}
              options={options}
              selected={filters[facet.columnId] ?? []}
              onChange={(values) => update({ filters: { ...filters, [facet.columnId]: values } })}
              searchable={facet.searchable}
            />
          ))}
          {periodos.map(({ pf, periodo }) => (
            <DataTablePeriodFilter
              key={pf.id}
              label={pf.label}
              value={periodo}
              presets={pf.presets ?? ['semana', 'mes', 'mes_passado', 'personalizado']}
              onChange={(p) => update({ filters: { ...filters, [pf.id]: valoresDoPeriodo(p) } })}
            />
          ))}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {toolbarActions}
            {!tableLayout && sortableColumns.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
                    <ArrowUpDown className="size-3.5" />
                    {currentSort ? (columnById.get(currentSort.id)?.meta?.label ?? 'Ordenar') : 'Ordenar'}
                    {currentSort ? currentSort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" /> : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Ordenar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sortableColumns.map((c) => (
                    <DropdownMenuItem key={c.id} onSelect={() => cycleSort(c.id)}>
                      <span className="flex-1">{c.columnDef.meta?.label ?? c.id}</span>
                      {currentSort?.id === c.id ? (
                        currentSort.desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {tableLayout && hideableColumns.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-8" title="Colunas visíveis" aria-label="Colunas visíveis">
                    <Settings2 className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Colunas visíveis</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map((c) => {
                    const column = table.getColumn(c.id as string);
                    return (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={column?.getIsVisible()}
                        onCheckedChange={(v) => column?.toggleVisibility(!!v)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.meta?.label ?? c.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {tableLayout && (
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => prefs.setDensity(dense ? 'comfortable' : 'compact')}
                title={dense ? 'Linhas compactas (clique para confortáveis)' : 'Linhas confortáveis (clique para compactas)'}
                aria-label={dense ? 'Linhas compactas' : 'Linhas confortáveis'}
              >
                {dense ? <List className="size-3.5" /> : <AlignJustify className="size-3.5" />}
              </Button>
            )}
            {layouts.length > 1 ? (
              <div className="flex rounded-md border p-0.5" role="radiogroup" aria-label="Visão">
                {layouts.map(([valor, rotulo, Icone]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={(tableLayout ? 'tabela' : prefs.layout) === valor}
                    title={`Ver em ${rotulo.toLowerCase()}`}
                    onClick={() => prefs.setLayout(valor)}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                      (tableLayout ? 'tabela' : prefs.layout) === valor && 'bg-secondary text-foreground shadow-sm',
                    )}
                  >
                    <Icone className="size-3.5" />
                    <span className="hidden sm:inline">{rotulo}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Filtros ativos */}
        {chips.length ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Filtros:</span>
            {chips.map((c) => (
              <span key={`${c.colId}-${c.value}`} className="inline-flex h-6 items-center gap-1 rounded-md border bg-card pl-2 pr-1 font-medium">
                {c.text}
                <button
                  type="button"
                  aria-label={`Remover filtro ${c.text}`}
                  onClick={() =>
                    update({
                      filters: { ...filters, [c.colId]: isPeriod(c.colId) ? [] : filters[c.colId].filter((v) => v !== c.value) },
                    })
                  }
                  className="grid size-4 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className="ml-1 font-medium text-primary hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : null}

        {/* Atualização em segundo plano */}
        <div className={cn('h-0.5 overflow-hidden', isFetching && !isLoading ? 'bg-primary/15' : 'bg-transparent')} aria-hidden>
          {isFetching && !isLoading ? <div className="h-full w-1/3 animate-pulse bg-primary" /> : null}
        </div>

        {cards ? renderCards() : null}
        {board ? renderBoardBody() : null}

        {/* Abaixo de 1280px, ou quando as colunas não cabem, a tabela rola na horizontal (e o cabeçalho deixa de ser fixo). */}
        <div ref={scrollRef} className={cn('overflow-x-auto', !overflows && 'xl:overflow-x-visible', !tableLayout && 'hidden')}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {table.getHeaderGroups()[0].headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width: meta?.width, top: stickyOffset }}
                      className={cn(
                        // Cabeçalho em caixa alta (decisão de 10/10/2026); os dados das células ficam como cadastrados.
                        'sticky z-10 h-10 whitespace-nowrap bg-secondary px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]',
                        grid,
                        meta?.align === 'right' && 'text-right',
                        responsive(meta?.priority),
                      )}
                    >
                      <DataTableColumnHeader
                        label={flexRender(header.column.columnDef.header, header.getContext())}
                        sortable={header.column.getCanSort()}
                        sorted={sorted}
                        align={meta?.align}
                        onSort={() => cycleSort(header.column.id)}
                      />
                    </th>
                  );
                })}
                {hasActionColumn ? (
                  <th
                    style={{ top: stickyOffset, width: actionsColumn?.width }}
                    className={cn(
                      'sticky z-10 h-10 bg-secondary px-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]',
                      grid,
                      !actionsColumn && 'w-12',
                    )}
                    aria-label={actionsColumn ? undefined : 'Ações'}
                  >
                    {actionsColumn?.header}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        {!isLoading && !isError && rowsAll.length > 0 && !board ? (
          <DataTablePagination
            page={page}
            pageSize={prefs.pageSize}
            total={rows.length}
            pageSizeOptions={pageSizeOptions}
            onPageChange={(p) => update({ page: p })}
            onPageSizeChange={(s) => {
              prefs.setPageSize(s);
              update({ page: 1 });
            }}
            summary={footerSummary?.(pageRows.map((r) => r.original))}
          />
        ) : null}
      </div>
    </div>
  );
}
