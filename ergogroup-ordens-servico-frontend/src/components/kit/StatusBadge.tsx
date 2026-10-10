import { ToneBadge, type ToneBadgeProps } from './ToneBadge';
import { STATUS_DEFS, type StatusEntity, type ToneDef } from './tones';

export interface StatusBadgeProps extends Omit<ToneBadgeProps, 'def'> {
  entity: StatusEntity;
  value: string | null | undefined;
}

/** Status de OS, Serviço, Tarefa ou OS operacional. */
export function StatusBadge({ entity, value, ...rest }: StatusBadgeProps) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const def = (STATUS_DEFS[entity] as Record<string, ToneDef>)[value] ?? { tone: 'neutral', icon: STATUS_DEFS.os.aberta.icon, label: value };
  return <ToneBadge def={def} {...rest} />;
}
