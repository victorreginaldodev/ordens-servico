import { cn } from '@/lib/utils';
import { getIniciais } from '@/lib/format';

export interface AvatarStackProps {
  nomes: string[];
  /** Quantos avatares mostrar antes do "+N". */
  max?: number;
  className?: string;
}

/** Avatares sobrepostos (iniciais) com "+N" e os nomes no `title`. */
export function AvatarStack({ nomes, max = 4, className }: AvatarStackProps) {
  if (!nomes.length) return null;
  const visiveis = nomes.slice(0, max);
  const resto = nomes.length - visiveis.length;
  return (
    <span className={cn('flex items-center -space-x-1.5', className)} title={nomes.join(', ')}>
      {visiveis.map((nome, i) => (
        <span
          key={`${nome}-${i}`}
          className="grid size-6 place-items-center rounded-full border-2 border-card bg-muted text-2xs font-semibold text-muted-foreground"
          aria-hidden
        >
          {getIniciais(nome)}
        </span>
      ))}
      {resto > 0 ? (
        <span className="grid size-6 place-items-center rounded-full border-2 border-card bg-muted text-2xs font-semibold text-muted-foreground">
          +{resto}
        </span>
      ) : null}
      <span className="sr-only">{nomes.join(', ')}</span>
    </span>
  );
}
