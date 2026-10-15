import { CalendarRange } from 'lucide-react';
import { SeletorDePeriodo } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rotuloDoPeriodo, type Periodo, type PresetDePeriodo } from '@/lib/periodo';
import { cn } from '@/lib/utils';

export interface DataTablePeriodFilterProps {
  label: string;
  value: Periodo | null;
  presets: PresetDePeriodo[];
  onChange: (value: Periodo | null) => void;
}

/** Botão "Data" no visual dos filtros facetados; o conteúdo é o `SeletorDePeriodo` do kit. */
export function DataTablePeriodFilter({ label, value, presets, onChange }: DataTablePeriodFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1.5 border-dashed px-2.5 font-medium', value ? 'border-solid' : 'text-muted-foreground')}
        >
          <CalendarRange className="size-3.5" />
          {label}
          {value ? <span className="rounded-full bg-muted px-1.5 text-xs text-foreground">{rotuloDoPeriodo(value)}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[80vh] w-72 overflow-y-auto p-1.5">
        <SeletorDePeriodo valor={value} onChange={onChange} presets={presets} titulo={label} rotuloLimpar={`Limpar ${label.toLowerCase()}`} />
      </PopoverContent>
    </Popover>
  );
}
