import { cn } from '@/lib/utils';
import { PRIORIDADE_DEFS, TONE_CLASSES, type ToneDef } from './tones';

export interface PrioridadeIndicatorProps {
  value: string | null | undefined;
  className?: string;
}

/** Prioridade sem badge: ícone + texto colorido (alta pesa mais). */
export function PrioridadeIndicator({ value, className }: PrioridadeIndicatorProps) {
  const def = value ? (PRIORIDADE_DEFS as Record<string, ToneDef>)[value] : undefined;
  if (!def) return <span className="text-muted-foreground">—</span>;
  const Icon = def.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', TONE_CLASSES[def.tone].text, value === 'alta' && 'font-medium', className)}>
      <Icon className="size-4" aria-hidden />
      {def.label}
    </span>
  );
}
