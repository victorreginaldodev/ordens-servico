import { ToneBadge, type ToneBadgeProps } from './ToneBadge';
import { COBRANCA_DEFS, getCobrancaSituacao } from './tones';

export interface CobrancaBadgeProps extends Omit<ToneBadgeProps, 'def' | 'suffix'> {
  liberada?: boolean | null;
  cobrada?: boolean | null;
  nf?: string | number | null;
}

/** Situação de cobrança de OS/OSO: Não liberada · A cobrar · Cobrada (+ NF). */
export function CobrancaBadge({ liberada, cobrada, nf, ...rest }: CobrancaBadgeProps) {
  const situacao = getCobrancaSituacao({ liberada, cobrada });
  return <ToneBadge def={COBRANCA_DEFS[situacao]} suffix={situacao === 'cobrada' && nf ? `NF ${nf}` : undefined} {...rest} />;
}
