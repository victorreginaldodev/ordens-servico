import { CirclePause, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/format';
import { TONE_CLASSES, rotuloDaPausa } from './tones';

export interface AlertaMovimentacaoProps {
  diasSemMovimentacao: number;
  /** Sem movimentação há N dias e sem ciência vigente. */
  emAlerta: boolean;
  cienciaVigente?: boolean;
  cienteEm?: string | null;
  cientePorNome?: string | null;
  motivo?: string | null;
  /** Até quando a pausa explicada silencia o aviso. */
  ate?: string | null;
  className?: string;
}

/**
 * Aviso de serviço sem andamento (ADR 0008, 3). O sistema não marca o serviço como parado: avisa.
 * Com a pausa explicada, mostra o motivo, até quando o aviso fica em silêncio e quem explicou.
 */
export function AlertaMovimentacao({
  diasSemMovimentacao,
  emAlerta,
  cienciaVigente,
  cienteEm,
  cientePorNome,
  motivo,
  ate,
  className,
}: AlertaMovimentacaoProps) {
  const dias = `${diasSemMovimentacao} dia${diasSemMovimentacao === 1 ? '' : 's'}`;
  if (cienciaVigente) {
    return (
      <span className={cn('inline-flex flex-col gap-0.5 text-xs', className)}>
        <span className={cn('inline-flex items-center gap-1.5 font-medium', TONE_CLASSES.info.text)}>
          <CirclePause className="size-3.5" aria-hidden />
          {rotuloDaPausa(motivo)}
          {ate ? ` · até ${formatDateShort(ate)}` : ''}
        </span>
        {cientePorNome || cienteEm ? (
          <span className="text-muted-foreground">
            Explicado{cientePorNome ? ` por ${cientePorNome}` : ''}
            {cienteEm ? ` em ${formatDateShort(cienteEm)}` : ''}
          </span>
        ) : null}
      </span>
    );
  }
  if (!emAlerta) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TONE_CLASSES.warning.text, className)}>
      <Hourglass className="size-3.5" aria-hidden />
      Sem andamento há {dias}
    </span>
  );
}
