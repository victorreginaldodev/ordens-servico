import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { diffInDays, formatDateShort, parseDate, type DateInput } from '@/lib/format';

export interface PrazoIndicatorProps {
  prazo: DateInput;
  /** Registro concluído/cancelado: mostra só a data, atraso não importa mais. */
  encerrado?: boolean;
  /** `stack` = data em cima e estado embaixo; `inline` = lado a lado (tabela compacta). */
  layout?: 'stack' | 'inline';
  /** Janela, em dias, para o aviso "vence em N dias". */
  avisoDias?: number;
  today?: Date;
  className?: string;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Prazo + estado relativo (docs/ui/design-system-tabelas.md §3.3). */
export function PrazoIndicator({ prazo, encerrado, layout = 'stack', avisoDias = 3, today, className }: PrazoIndicatorProps) {
  const date = parseDate(prazo);
  if (!date) return <span className="text-muted-foreground">—</span>;

  const diff = diffInDays(date, today);
  let estado: React.ReactNode = null;
  if (!encerrado) {
    if (diff < 0) {
      estado = (
        <span className="inline-flex items-center gap-1 font-medium text-danger-strong">
          <TriangleAlert className="size-3" aria-hidden />
          {plural(-diff, 'dia atrasada', 'dias atrasada')}
        </span>
      );
    } else if (diff === 0) {
      estado = <span className="font-medium text-warning-strong">vence hoje</span>;
    } else if (diff <= avisoDias) {
      estado = <span className="text-warning-strong">vence em {plural(diff, 'dia', 'dias')}</span>;
    }
  }

  return (
    <span className={cn(layout === 'stack' ? 'flex flex-col' : 'inline-flex items-baseline gap-2', 'whitespace-nowrap', className)}>
      <span className="tabular-nums">{formatDateShort(date)}</span>
      {estado ? <span className="text-xs">{estado}</span> : null}
    </span>
  );
}
