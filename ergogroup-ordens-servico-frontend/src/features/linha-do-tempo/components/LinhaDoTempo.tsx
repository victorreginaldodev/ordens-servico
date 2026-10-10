import {
  ArrowRightLeft,
  BellOff,
  CalendarClock,
  CircleCheck,
  CircleSlash,
  FilePen,
  History,
  Inbox,
  Play,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Trash2,
  Unlock,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TONE_CLASSES, type Tone } from '@/components/kit';
import { cn } from '@/lib/utils';
import type { EventoDaLinhaDoTempo, TipoDeEvento } from '../services';

const EVENTO: Record<TipoDeEvento, { icon: LucideIcon; tone: Tone }> = {
  historico_anterior: { icon: History, tone: 'neutral' },
  venda: { icon: ShoppingCart, tone: 'info' },
  venda_alterada: { icon: FilePen, tone: 'neutral' },
  condicao_alterada: { icon: FilePen, tone: 'neutral' },
  chegada: { icon: Inbox, tone: 'warning' },
  distribuicao: { icon: UserCheck, tone: 'info' },
  reatribuicao: { icon: ArrowRightLeft, tone: 'info' },
  prazo_alterado: { icon: CalendarClock, tone: 'warning' },
  tarefa_iniciada: { icon: Play, tone: 'info' },
  tarefa_concluida: { icon: CircleCheck, tone: 'success' },
  tarefa_cancelada: { icon: CircleSlash, tone: 'neutral' },
  tarefa_reaberta: { icon: RotateCcw, tone: 'warning' },
  tarefa_excluida: { icon: Trash2, tone: 'neutral' },
  ciencia: { icon: BellOff, tone: 'neutral' },
  servico_concluido: { icon: CircleCheck, tone: 'success' },
  servico_cancelado: { icon: CircleSlash, tone: 'neutral' },
  servico_reaberto: { icon: RotateCcw, tone: 'warning' },
  servico_excluido: { icon: Trash2, tone: 'neutral' },
  os_concluida: { icon: CircleCheck, tone: 'success' },
  os_cancelada: { icon: CircleSlash, tone: 'neutral' },
  os_reaberta: { icon: RotateCcw, tone: 'warning' },
  liberacao: { icon: Unlock, tone: 'warning' },
  lancamento: { icon: Receipt, tone: 'success' },
};

const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export interface LinhaDoTempoProps {
  eventos: EventoDaLinhaDoTempo[] | undefined;
  carregando?: boolean;
  /** Mais recentes primeiro (padrão) ou em ordem cronológica. */
  ordem?: 'recentes' | 'cronologica';
  className?: string;
}

/**
 * Linha do tempo da OS ou do serviço (ADR 0008, 4). O texto vem pronto do backend;
 * a tela só escolhe ícone e cor pelo `tipo`. `quem` vazio = ação do sistema.
 */
export function LinhaDoTempo({ eventos, carregando, ordem = 'recentes', className }: LinhaDoTempoProps) {
  if (carregando) {
    return (
      <div className={cn('space-y-5', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!eventos?.length) {
    return <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>Nada registrado ainda.</p>;
  }

  const lista = ordem === 'recentes' ? [...eventos].reverse() : eventos;

  return (
    <ol className={cn('relative', className)}>
      {lista.map((evento, i) => {
        const { icon: Icon, tone } = EVENTO[evento.tipo] ?? { icon: History, tone: 'neutral' as Tone };
        const ultimo = i === lista.length - 1;
        return (
          <li key={`${evento.quando}-${evento.tipo}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {ultimo ? null : <span className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />}
            <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', TONE_CLASSES[tone].subtle)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm text-foreground">{evento.texto}</p>
              <p className="text-xs text-muted-foreground">
                {quandoFmt.format(new Date(evento.quando))}
                {evento.quem ? ` · ${evento.quem}` : ' · sistema'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
