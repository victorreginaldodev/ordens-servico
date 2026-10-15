import { useState } from 'react';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** `AAAA-MM-DD` ↔ `Date` local (sem fuso, para o dia não "voltar" um). */
const paraData = (v: string) => {
  const [a, m, d] = v.split('-').map(Number);
  return a && m && d ? new Date(a, m - 1, d) : undefined;
};
const paraIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const somaDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return paraIso(d);
};
const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export interface AtalhoDeData {
  rotulo: string;
  /** Dias a partir de hoje (0 = hoje). */
  dias: number;
}

/**
 * Campo de data com calendário (por enquanto só no formulário da venda; plano-melhorias-nova-venda.md, etapa 3).
 * Mostra "13/10/2026 · ter", abre um calendário em português e guarda `AAAA-MM-DD`, o formato da API.
 */
export function CampoData({
  id,
  valor,
  onChange,
  placeholder = 'Escolha a data',
  invalido,
  limpavel,
  atalhos = [{ rotulo: 'Hoje', dias: 0 }],
  className,
  'aria-label': ariaLabel,
}: {
  id?: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  invalido?: boolean;
  /** Mostra o X para apagar a data. */
  limpavel?: boolean;
  atalhos?: AtalhoDeData[];
  className?: string;
  'aria-label'?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const data = valor ? paraData(valor) : undefined;
  const texto = data ? `${data.toLocaleDateString('pt-BR')} · ${DIAS_DA_SEMANA[data.getDay()]}` : null;
  const escolher = (v: string) => {
    onChange(v);
    setAberto(false);
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-invalid={invalido || undefined}
            aria-label={ariaLabel ? `${ariaLabel}: ${texto ?? 'sem data'}` : undefined}
            className={cn(
              'flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background transition-colors',
              'hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20',
              invalido && 'border-danger',
              limpavel && data && 'pr-9',
            )}
          >
            <CalendarDays className={cn('size-4 shrink-0', data ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
            <span className={cn('min-w-0 flex-1 truncate tabular-nums', !texto && 'text-muted-foreground')}>{texto ?? placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={data}
            defaultMonth={data}
            onSelect={(d) => d && escolher(paraIso(d))}
            initialFocus
            classNames={{ day_today: 'font-semibold text-primary' }}
          />
          {atalhos.length ? (
            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
              {atalhos.map((a) => (
                <Button key={a.rotulo} type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => escolher(somaDias(a.dias))}>
                  {a.rotulo}
                </Button>
              ))}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {limpavel && data ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Apagar a data"
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
