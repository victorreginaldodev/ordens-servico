import { cn } from '@/lib/utils';
import { TONE_CLASSES, type ToneDef } from './tones';

export interface ToneBadgeProps {
  def: ToneDef;
  /** Texto auxiliar depois do badge (ex.: `NF 1234`). */
  suffix?: React.ReactNode;
  appearance?: 'subtle' | 'solid';
  size?: 'sm' | 'md';
  className?: string;
}

/** Badge base do kit: cor + ícone + texto, nunca só cor. */
export function ToneBadge({ def, suffix, appearance = 'subtle', size = 'sm', className }: ToneBadgeProps) {
  const Icon = def.icon;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
          size === 'sm' ? 'h-6 pl-1.5 pr-2.5 text-xs' : 'h-7 pl-2 pr-3 text-sm',
          TONE_CLASSES[def.tone][appearance],
        )}
      >
        <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
        {def.label}
      </span>
      {suffix ? <span className="text-xs tabular-nums text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}
