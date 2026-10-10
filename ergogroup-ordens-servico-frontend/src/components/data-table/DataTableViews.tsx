import { cn } from '@/lib/utils';

export interface DataTableViewsProps {
  views: Array<{ id: string; label: string; count: number; tone?: 'danger' }>;
  value: string | undefined;
  onChange: (id: string) => void;
}

/** Atalhos de filtro com contagem. Orientam sem virar dashboard. */
export function DataTableViews({ views, value, onChange }: DataTableViewsProps) {
  return (
    <div role="tablist" aria-label="Visões" className="mb-3 flex flex-wrap gap-1">
      {views.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {v.label}
            <span className={cn('text-xs tabular-nums', v.tone === 'danger' && v.count > 0 ? 'font-semibold text-danger-strong' : 'opacity-80')}>
              {v.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
