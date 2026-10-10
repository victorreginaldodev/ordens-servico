import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FacetOption } from './types';

export interface DataTableFacetedFilterProps {
  label: string;
  options: Array<FacetOption & { count: number }>;
  selected: string[];
  onChange: (values: string[]) => void;
}

/** Botão "+ Status" → lista de opções com checkbox e contagem. */
export function DataTableFacetedFilter({ label, options, selected, onChange }: DataTableFacetedFilterProps) {
  const toggle = (value: string, checked: boolean) =>
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1.5 border-dashed px-2.5 font-medium', selected.length ? 'border-solid' : 'text-muted-foreground')}
        >
          <CirclePlus className="size-3.5" />
          {label}
          {selected.length ? (
            <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-foreground">{selected.length}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <p className="px-2 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
        {options.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={checked} onCheckedChange={(c) => toggle(o.value, c === true)} />
              <span className="flex-1 truncate">{o.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>
            </label>
          );
        })}
        {selected.length ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full rounded-sm border-t px-2 py-1.5 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Limpar {label.toLowerCase()}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
