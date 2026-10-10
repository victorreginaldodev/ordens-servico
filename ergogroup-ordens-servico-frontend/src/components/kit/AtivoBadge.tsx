import { ToneBadge } from './ToneBadge';
import { ATIVO_DEFS } from './tones';

export interface AtivoBadgeProps {
  ativo: boolean;
  className?: string;
}

/** "Ativo" / "Desativado" para setores, funções e pessoas. */
export function AtivoBadge({ ativo, className }: AtivoBadgeProps) {
  return <ToneBadge def={ativo ? ATIVO_DEFS.ativo : ATIVO_DEFS.desativado} className={className} />;
}
