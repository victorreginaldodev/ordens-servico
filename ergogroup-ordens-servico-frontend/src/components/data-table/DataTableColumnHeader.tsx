import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumnHeaderProps {
  label: React.ReactNode;
  sortable: boolean;
  sorted: false | 'asc' | 'desc';
  align?: 'left' | 'right';
  onSort: () => void;
}

export function DataTableColumnHeader({ label, sortable, sorted, align, onSort }: DataTableColumnHeaderProps) {
  if (!sortable) return <>{label}</>;
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onSort}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
      className={cn(
        // `uppercase` explícito: o reset do Tailwind tira o text-transform herdado em botões.
        'inline-flex items-center gap-1 rounded-sm uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        sorted && 'text-foreground',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon className={cn('size-3.5', !sorted && 'opacity-50')} aria-hidden />
    </button>
  );
}
