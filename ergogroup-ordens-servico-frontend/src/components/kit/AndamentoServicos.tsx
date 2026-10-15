import { cn } from '@/lib/utils';
import { TONE_CLASSES } from './tones';

export interface AndamentoServicosProps {
  andamento: {
    total: number;
    novo: number;
    a_distribuir: number;
    distribuido: number;
    em_execucao: number;
    concluido: number;
    cancelado: number;
  } | null | undefined;
  /** Esconde a barra e mostra só o texto (tabela compacta). */
  semBarra?: boolean;
  className?: string;
}

const SEGMENTOS = [
  { chave: 'concluido', classe: TONE_CLASSES.success.dot, label: 'concluídos' },
  { chave: 'em_execucao', classe: TONE_CLASSES.info.dot, label: 'em andamento' },
  { chave: 'distribuido', classe: TONE_CLASSES.neutral.dot, label: 'distribuídos' },
  { chave: 'a_distribuir', classe: TONE_CLASSES.warning.dot, label: 'a distribuir' },
  { chave: 'novo', classe: TONE_CLASSES.warning.dot, label: 'novos' },
] as const;

/**
 * Andamento da execução de uma venda: "2 de 4 concluídos" + barra por etapa (ADR 0008, 6).
 * Cancelados ficam fora da conta.
 */
export function AndamentoServicos({ andamento, semBarra, className }: AndamentoServicosProps) {
  if (!andamento || andamento.total === 0) return <span className="text-muted-foreground">Sem serviços</span>;
  const total = andamento.total - andamento.cancelado;
  if (total <= 0) return <span className="text-muted-foreground">Serviços cancelados</span>;
  const detalhe = SEGMENTOS.filter((s) => andamento[s.chave] > 0)
    .map((s) => `${andamento[s.chave]} ${s.label}`)
    .join(' · ');

  return (
    <span className={cn('flex min-w-28 flex-col gap-1', className)} title={detalhe}>
      <span className="whitespace-nowrap text-sm tabular-nums">
        {andamento.concluido} de {total} concluído{total === 1 ? '' : 's'}
      </span>
      {semBarra ? null : (
        <span className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          {SEGMENTOS.map((s) =>
            andamento[s.chave] > 0 ? (
              <span key={s.chave} className={s.classe} style={{ width: `${(andamento[s.chave] / total) * 100}%` }} />
            ) : null,
          )}
        </span>
      )}
    </span>
  );
}
