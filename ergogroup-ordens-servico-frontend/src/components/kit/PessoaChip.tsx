import { cn } from '@/lib/utils';
import { formatNomeCurto, getIniciais } from '@/lib/format';

export interface PessoaChipProps {
  nome: string | null | undefined;
  foto?: string | null;
  /** `short` = "Mariana S." (padrão em tabela); `full` = nome completo. */
  variant?: 'short' | 'full';
  className?: string;
}

/** Avatar 20px + nome. Usado para responsável, "liberada por" etc. */
export function PessoaChip({ nome, foto, variant = 'short', className }: PessoaChipProps) {
  if (!nome) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)} title={nome}>
      {foto ? (
        <img src={foto} alt="" className="size-5 rounded-full object-cover" />
      ) : (
        <span className="grid size-5 place-items-center rounded-full bg-muted text-2xs font-semibold text-muted-foreground" aria-hidden>
          {getIniciais(nome)}
        </span>
      )}
      {variant === 'short' ? formatNomeCurto(nome) : nome}
    </span>
  );
}
