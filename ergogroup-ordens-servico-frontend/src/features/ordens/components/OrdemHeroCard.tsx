import { Link } from 'react-router-dom';
import { Clock3, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyValue } from '@/components/common/MoneyValue';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency, formatDaysCount, isPrazoVencido, STATUS_DOT } from '../utils';
import type { OrdemServicoDetalhe } from '../services';

const STATUS_TEXT_CLASS: Record<string, string> = {
  aberta:       'text-red-600 dark:text-red-400',
  em_andamento: 'text-amber-600 dark:text-amber-400',
  concluida:    'text-green-600 dark:text-green-400',
  cancelada:    'text-muted-foreground',
};

interface OrdemHeroCardProps {
  ordem: OrdemServicoDetalhe;
  showValor: boolean;
  pdfButton?: React.ReactNode;
}

export function OrdemHeroCard({ ordem, showValor, pdfButton }: OrdemHeroCardProps) {
  const isDone = ordem.status === 'concluida';
  const prazoOverdue = isPrazoVencido(ordem.prazo) && !isDone && ordem.status !== 'cancelada';

  const contato = ordem.cliente_detail.nome_representante;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card px-[22px] py-[18px] shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-400 text-white">
        <FileText className="h-6 w-6" strokeWidth={2} />
      </div>

      <div className="min-w-[200px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            {ordem.cliente_detail.nome}
          </h1>
          <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            OS-{ordem.id}
          </span>
        </div>
        {contato && (
          <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
            Contato: {contato}
          </p>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex flex-wrap items-stretch gap-x-5 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[ordem.status] ?? STATUS_DOT.aberta)} />
            <span className={STATUS_TEXT_CLASS[ordem.status] ?? 'text-foreground'}>{ordem.status_display}</span>
          </span>
        </div>

        <div className="w-px bg-border" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Prioridade</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className={cn('h-2 w-2 rounded-full', ordem.prioridade === 'alta' ? 'bg-red-500' : ordem.prioridade === 'media' ? 'bg-amber-400' : 'bg-muted-foreground/50')} />
            <span className={ordem.prioridade === 'alta' ? 'text-red-500' : 'text-foreground'}>
              {ordem.prioridade_display}
            </span>
          </span>
        </div>

        <div className="w-px bg-border" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Prazo</span>
          <span className={cn('text-sm font-semibold', prazoOverdue ? 'text-red-500' : 'text-foreground')}>
            {formatDate(ordem.prazo) ?? '—'}
          </span>
        </div>

        <div className="w-px bg-border" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {isDone ? 'Até conclusão' : 'Em aberto'}
          </span>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[13px] font-bold text-amber-600 dark:text-amber-400">
            <Clock3 className="h-3 w-3" strokeWidth={2.4} />
            {formatDaysCount(isDone ? ordem.dias_entre_criacao_e_conclusao : ordem.dias_em_aberto) ?? '—'}
          </span>
        </div>

        {showValor && (
          <>
            <div className="w-px bg-border" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Valor</span>
              <span className="text-[15px] font-extrabold tabular-nums text-foreground">
                <MoneyValue value={ordem.valor} formatter={formatCurrency} />
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {pdfButton}
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
          <Link to={`/ordens/${ordem.id}/edit`} title="Editar OS">
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
