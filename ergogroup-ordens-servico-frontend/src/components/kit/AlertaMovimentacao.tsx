import { BellOff, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/format';
import { MOTIVO_CIENCIA_LABEL, TONE_CLASSES } from './tones';

export interface AlertaMovimentacaoProps {
  diasSemMovimentacao: number;
  /** Sem movimentação há N dias e sem ciência vigente. */
  emAlerta: boolean;
  cienciaVigente?: boolean;
  cienteEm?: string | null;
  cientePorNome?: string | null;
  motivo?: string | null;
  className?: string;
}

/**
 * Alerta de serviço sem movimentação (ADR 0008, 3). O sistema não marca o serviço como parado: avisa.
 * Com ciência vigente, mostra quem está ciente e o motivo ("aguardando o cliente").
 */
export function AlertaMovimentacao({
  diasSemMovimentacao,
  emAlerta,
  cienciaVigente,
  cienteEm,
  cientePorNome,
  motivo,
  className,
}: AlertaMovimentacaoProps) {
  const dias = `${diasSemMovimentacao} dia${diasSemMovimentacao === 1 ? '' : 's'}`;
  if (cienciaVigente) {
    const rotulo = motivo ? MOTIVO_CIENCIA_LABEL[motivo as keyof typeof MOTIVO_CIENCIA_LABEL] ?? motivo : 'Ciente';
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs', TONE_CLASSES.neutral.text, className)}>
        <BellOff className="size-3.5" aria-hidden />
        {rotulo}
        {cientePorNome ? ` · ${cientePorNome}` : ''}
        {cienteEm ? ` em ${formatDateShort(cienteEm)}` : ''}
      </span>
    );
  }
  if (!emAlerta) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TONE_CLASSES.warning.text, className)}>
      <Hourglass className="size-3.5" aria-hidden />
      Sem movimentação há {dias}
    </span>
  );
}
