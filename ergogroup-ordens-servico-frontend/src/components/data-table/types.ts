import type { ColumnDef, RowData, SortingFn } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import type { EmptyStateProps } from '@/components/kit';

export type Density = 'comfortable' | 'compact';

/** Como os registros aparecem: linhas de tabela ou cards em grade. */
export type Layout = 'tabela' | 'cards';

/** P1 = sempre visível · P2 = oculta abaixo de 1280px · P3 = oculta por padrão (menu Colunas). */
export type ColumnPriority = 1 | 2 | 3;

export interface FacetOption {
  value: string;
  label: string;
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Nome da coluna em menus, filtros e chips (o header pode ser JSX). */
    label?: string;
    align?: 'left' | 'right';
    priority?: ColumnPriority;
    /** Só aparece para perfis que podem ver valores (useUserRole().canViewOrderValues). */
    financial?: boolean;
    /** Largura CSS da coluna (ex.: `140px`). Sem largura = flexível. */
    width?: string;
    /** Valor usado por filtros facetados. */
    facetValue?: (row: TData) => string | null | undefined;
    /** Opções conhecidas do filtro facetado, na ordem de exibição. */
    facetOptions?: FacetOption[];
  }

  interface TableMeta<TData extends RowData> {
    density: Density;
  }

  interface SortingFns {
    textPtBr: SortingFn<unknown>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumn<T> = ColumnDef<T, any>;

export interface DataTableView<T> {
  id: string;
  label: string;
  /** Sem filtro = todos os registros. */
  filter?: (row: T) => boolean;
  /** `danger` destaca a contagem quando > 0 (ex.: Atrasadas). */
  tone?: 'danger';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableFacet<T = any> {
  /**
   * id da coluna (precisa de `meta.facetValue`, que as fábricas `col.*` já preenchem).
   * Com `getValue`, é só a chave do filtro na URL e não precisa ser uma coluna.
   */
  columnId: string;
  label?: string;
  options?: FacetOption[];
  /** Valor(es) do registro para este filtro. Lista = o registro aparece em cada opção (ex.: setores de uma pessoa). */
  getValue?: (row: T) => string | string[] | null | undefined;
}

export interface DataTableRowAction<T> {
  label: string;
  icon?: LucideIcon;
  onSelect: (row: T) => void;
  destructive?: boolean;
}

export interface DataTableSearch<T> {
  placeholder: string;
  /** Campos em que a busca procura (acentos e caixa são ignorados). */
  fields: (row: T) => Array<string | number | null | undefined>;
}

export interface DataTableEmptyStates {
  /** Não há nenhum registro. */
  noData?: EmptyStateProps;
  /** Há registros, mas a busca/filtros não encontraram nada. */
  noResults?: Partial<EmptyStateProps>;
}
