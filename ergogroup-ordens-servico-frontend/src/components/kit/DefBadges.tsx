import { ToneBadge, type ToneBadgeProps } from './ToneBadge';
import {
  ETAPA_DEFS,
  SITUACAO_FINANCEIRA_DEFS,
  SITUACAO_PRAZO_DEFS,
  TIPO_CONDICAO_DEFS,
  type ToneDef,
} from './tones';

type DefBadgeProps = Omit<ToneBadgeProps, 'def'> & { value: string | null | undefined };

/** Badge de um mapa de definições; valor desconhecido aparece neutro com o próprio texto. */
const badgeDe = (defs: Record<string, ToneDef>) =>
  function DefBadge({ value, ...rest }: DefBadgeProps) {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const def = defs[value] ?? { tone: 'neutral', icon: ETAPA_DEFS.cancelado.icon, label: value };
    return <ToneBadge def={def} {...rest} />;
  };

/** Etapa do serviço: Na fila · Distribuído · Em execução · Concluído · Cancelado. */
export const EtapaBadge = badgeDe(ETAPA_DEFS);
/** Situação de prazo calculada pelo backend: Atrasado · Vence em 7 dias · No prazo · Sem prazo. */
export const SituacaoPrazoBadge = badgeDe(SITUACAO_PRAZO_DEFS);
/** Situação da OS no financeiro: Previsão · A faturar · Faturada. */
export const SituacaoFinanceiraBadge = badgeDe(SITUACAO_FINANCEIRA_DEFS);
/** Tipo da condição de pagamento: À vista · Parcelado · Recorrente. */
export const TipoCondicaoBadge = badgeDe(TIPO_CONDICAO_DEFS);

export type { DefBadgeProps };
