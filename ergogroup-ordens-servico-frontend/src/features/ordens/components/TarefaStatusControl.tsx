import { CheckCircle2, Circle, LoaderCircle, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ciclo de avanço de status — cancelada fica fora: é uma ação deliberada,
// separada, feita pelo menu de edição da tarefa (ver TarefaRow).
const ORDER = ['aberta', 'em_andamento', 'concluida'] as const;
type CicloStatus = (typeof ORDER)[number];

const STATUS_BADGE: Record<string, string> = {
  aberta:       'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-400',
  em_andamento: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-400',
  concluida:    'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/30 dark:text-green-400',
  cancelada:    'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  aberta: Circle,
  em_andamento: LoaderCircle,
  concluida: CheckCircle2,
};

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const nextStatus = (status: string): CicloStatus | null => {
  const idx = ORDER.indexOf(status as CicloStatus);
  if (idx === -1 || idx >= ORDER.length - 1) return null;
  return ORDER[idx + 1];
};

export const previousStatus = (status: string): CicloStatus | null => {
  const idx = ORDER.indexOf(status as CicloStatus);
  if (idx <= 0) return null;
  return ORDER[idx - 1];
};

interface TarefaStatusControlProps {
  status: string;
  onAdvance: () => void;
  onRevert: () => void;
  canManage: boolean;
  disabled?: boolean;
}

// Controle de status de um clique: clicar no badge avança um passo
// (aberta → em andamento → concluída, sem voltar ao início). O botão ao lado
// reverte um passo e fica sempre visível — não escondido em hover — porque é
// uma ação de correção que precisa ser confiável de encontrar.
export function TarefaStatusControl({ status, onAdvance, onRevert, canManage, disabled }: TarefaStatusControlProps) {
  const isCyclable = (ORDER as readonly string[]).includes(status);
  const canAdvance = isCyclable && nextStatus(status) !== null;
  const canRevert = isCyclable && previousStatus(status) !== null;
  const Icon = STATUS_ICON[status] ?? Circle;

  if (!canManage || !isCyclable) {
    return (
      <span
        className={cn(
          'inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold',
          STATUS_BADGE[status],
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  }

  const upcoming = nextStatus(status);
  const previous = previousStatus(status);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onAdvance}
        disabled={disabled || !canAdvance}
        title={upcoming ? `Avançar para "${STATUS_LABEL[upcoming]}"` : 'Tarefa já concluída'}
        className={cn(
          'inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-opacity',
          STATUS_BADGE[status],
          canAdvance ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-90',
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
        {STATUS_LABEL[status]}
      </button>
      <button
        type="button"
        onClick={onRevert}
        disabled={disabled || !canRevert}
        title={previous ? `Voltar para "${STATUS_LABEL[previous]}"` : 'Nada para reverter'}
        className={cn(
          'flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg border transition-colors',
          canRevert
            ? 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            : 'cursor-default border-transparent text-muted-foreground/30',
        )}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
