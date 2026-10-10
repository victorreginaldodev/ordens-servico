export const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
};

export const STATUS_BADGE: Record<string, string> = {
  nao_iniciado: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  em_andamento: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  finalizada:   'bg-green-500/10 text-green-400 border-green-500/30',
};

export const STATUS_DOT: Record<string, string> = {
  nao_iniciado: 'bg-yellow-400',
  em_andamento: 'bg-blue-400',
  finalizada:   'bg-green-500',
};

export const STATUS_ORDER: Record<string, number> = {
  nao_iniciado: 0,
  em_andamento: 1,
  finalizada:   2,
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABEL[status] ?? status;

export const getStatusBadgeClass = (status: string): string =>
  STATUS_BADGE[status] ?? 'bg-secondary text-secondary-foreground border-border';
