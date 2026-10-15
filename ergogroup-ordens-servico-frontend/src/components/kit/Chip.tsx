import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, type Tone } from './tones';

export interface ChipProps {
  tom: Tone;
  icone?: LucideIcon;
  children: React.ReactNode;
  /** Explicação ao passar o mouse. */
  dica?: string;
  className?: string;
}

/** Situação curta em palavras ("Atrasado 5 dias", "Sem andamento há 9 dias"): cor + ícone + texto. */
export function Chip({ tom, icone: Icone, children, dica, className }: ChipProps) {
  return (
    <span
      title={dica}
      className={cn('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium', TONE_CLASSES[tom].subtle, className)}
    >
      {Icone ? <Icone className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}
