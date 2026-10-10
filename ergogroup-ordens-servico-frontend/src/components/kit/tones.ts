import {
  Banknote,
  CalendarCheck,
  CalendarX,
  ChevronUp,
  ChevronsUp,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Clock,
  Inbox,
  Layers,
  Minus,
  Repeat,
  TriangleAlert,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapa único domínio → cor + ícone + label (docs/ui/design-system.md §2.4,
 * docs/ui/design-system-tabelas.md §3.1, §3.2, §10.1).
 * Nenhuma tela deve decidir a cor de um status: ela usa os componentes do kit,
 * que leem daqui.
 */

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ToneDef {
  tone: Tone;
  icon: LucideIcon;
  label: string;
}

export const TONE_CLASSES: Record<Tone, { subtle: string; text: string; solid: string; dot: string }> = {
  success: { subtle: 'bg-success-subtle text-success-strong', text: 'text-success-strong', solid: 'bg-success text-success-foreground', dot: 'bg-success' },
  warning: { subtle: 'bg-warning-subtle text-warning-strong', text: 'text-warning-strong', solid: 'bg-warning text-warning-foreground', dot: 'bg-warning' },
  danger: { subtle: 'bg-danger-subtle text-danger-strong', text: 'text-danger-strong', solid: 'bg-danger text-danger-foreground', dot: 'bg-danger' },
  info: { subtle: 'bg-info-subtle text-info-strong', text: 'text-info-strong', solid: 'bg-info text-info-foreground', dot: 'bg-info' },
  neutral: { subtle: 'bg-muted text-muted-foreground', text: 'text-muted-foreground', solid: 'bg-muted-foreground text-background', dot: 'bg-muted-foreground' },
};

const aberto = (label: string): ToneDef => ({ tone: 'warning', icon: CircleDashed, label });
const andamento: ToneDef = { tone: 'info', icon: CircleDot, label: 'Em andamento' };
const concluido = (label: string): ToneDef => ({ tone: 'success', icon: CircleCheck, label });
const cancelado = (label: string): ToneDef => ({ tone: 'neutral', icon: CircleSlash, label });

export const STATUS_DEFS = {
  os: {
    aberta: aberto('Aberta'),
    em_andamento: andamento,
    concluida: concluido('Concluída'),
    cancelada: cancelado('Cancelada'),
  },
  servico: {
    aberto: aberto('Aberto'),
    em_andamento: andamento,
    concluida: concluido('Concluído'),
    cancelado: cancelado('Cancelado'),
  },
  tarefa: {
    aberta: aberto('Aberta'),
    em_andamento: andamento,
    concluida: concluido('Concluída'),
    cancelada: cancelado('Cancelada'),
  },
  oso: {
    nao_iniciado: aberto('Não iniciado'),
    em_andamento: andamento,
    finalizada: concluido('Finalizada'),
  },
} satisfies Record<string, Record<string, ToneDef>>;

export type StatusEntity = keyof typeof STATUS_DEFS;

/** Status que encerram o ciclo (prazo e atraso deixam de importar). */
export const STATUS_ENCERRADOS = new Set(['concluida', 'cancelada', 'cancelado', 'finalizada']);

export const PRIORIDADE_DEFS = {
  alta: { tone: 'danger', icon: ChevronsUp, label: 'Alta' },
  media: { tone: 'warning', icon: ChevronUp, label: 'Média' },
  baixa: { tone: 'neutral', icon: Minus, label: 'Baixa' },
} satisfies Record<string, ToneDef>;

export type Prioridade = keyof typeof PRIORIDADE_DEFS;

export const COBRANCA_DEFS = {
  nao_liberada: { tone: 'neutral', icon: CircleDashed, label: 'Não liberada' },
  liberada: { tone: 'warning', icon: Clock, label: 'A cobrar' },
  cobrada: { tone: 'success', icon: CircleCheck, label: 'Cobrada' },
} satisfies Record<string, ToneDef>;

export type CobrancaSituacao = keyof typeof COBRANCA_DEFS;

/**
 * Etapa do serviço no fluxo de execução (ADR 0006, 1), calculada pelo backend:
 * aberto sem tarefa = na fila; aberto com tarefa = distribuído.
 */
export const ETAPA_DEFS = {
  na_fila: { tone: 'warning', icon: Inbox, label: 'Na fila' },
  distribuido: { tone: 'neutral', icon: UserCheck, label: 'Distribuído' },
  em_execucao: { tone: 'info', icon: CircleDot, label: 'Em execução' },
  concluido: { tone: 'success', icon: CircleCheck, label: 'Concluído' },
  cancelado: { tone: 'neutral', icon: CircleSlash, label: 'Cancelado' },
} satisfies Record<string, ToneDef>;

export type EtapaDef = keyof typeof ETAPA_DEFS;

/** Situação de prazo calculada pelo backend. Sem prazo é permitido, mas aparece como alerta (ADR 0006, 5). */
export const SITUACAO_PRAZO_DEFS = {
  atrasado: { tone: 'danger', icon: TriangleAlert, label: 'Atrasado' },
  vence_7_dias: { tone: 'warning', icon: Clock, label: 'Vence em 7 dias' },
  depois: { tone: 'neutral', icon: CalendarCheck, label: 'No prazo' },
  sem_prazo: { tone: 'warning', icon: CalendarX, label: 'Sem prazo' },
} satisfies Record<string, ToneDef>;

/** Situação da OS no financeiro (`/api/financeiro/cobrancas/`). Nomes provisórios (ADR 0007). */
export const SITUACAO_FINANCEIRA_DEFS = {
  previsao: { tone: 'neutral', icon: CircleDashed, label: 'Previsão' },
  a_faturar: { tone: 'warning', icon: Clock, label: 'A faturar' },
  faturadas: { tone: 'success', icon: CircleCheck, label: 'Faturada' },
} satisfies Record<string, ToneDef>;

/** Tipo da condição de pagamento (ADR 0007). */
export const TIPO_CONDICAO_DEFS = {
  a_vista: { tone: 'neutral', icon: Banknote, label: 'À vista' },
  parcelado: { tone: 'info', icon: Layers, label: 'Parcelado' },
  recorrente: { tone: 'info', icon: Repeat, label: 'Recorrente' },
} satisfies Record<string, ToneDef>;

/** Motivos da ciência do alerta sem movimentação (`MotivoCiencia` no backend). */
export const MOTIVO_CIENCIA_LABEL = {
  cliente: 'Aguardando o cliente',
  documentacao: 'Aguardando documentação',
  agendamento: 'Aguardando agendamento',
  terceiro: 'Aguardando terceiro',
  outro: 'Outro',
} as const;

/** Status de cadastro (setor, função, pessoa). */
export const ATIVO_DEFS = {
  ativo: { tone: 'success', icon: CircleCheck, label: 'Ativo' },
  desativado: { tone: 'neutral', icon: CircleSlash, label: 'Desativado' },
} satisfies Record<string, ToneDef>;

/** Deriva a situação de cobrança a partir das flags da OS/OSO. */
export const getCobrancaSituacao = (flags: { liberada?: boolean | null; cobrada?: boolean | null }): CobrancaSituacao =>
  flags.cobrada ? 'cobrada' : flags.liberada ? 'liberada' : 'nao_liberada';

/** Ordem de exibição/ordenação de um mapa de definições (ordem de declaração). */
export const defsOrder = (defs: Record<string, ToneDef>) => Object.keys(defs);
