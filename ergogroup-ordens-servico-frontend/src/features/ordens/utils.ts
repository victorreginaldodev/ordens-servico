export const formatShortDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const [, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}`;
};

export const formatDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (isoStr: string | null | undefined): string | null => {
  if (!isoStr) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoStr));
};

export const formatCurrency = (value: string | number): string =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDaysCount = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return `${value} ${value === 1 ? 'dia' : 'dias'}`;
};

export const formatDateObj = (date: Date): string =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);

export const getStatusLabel = (status: string): string =>
  ({ aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }[status] ?? status);

export const getPriorityLabel = (priority: string): string =>
  ({ baixa: 'Baixa', media: 'Média', alta: 'Alta' }[priority] ?? priority);

export const STATUS_DOT: Record<string, string> = {
  aberta:       'bg-status-pending',
  em_andamento: 'bg-status-progress',
  concluida:    'bg-status-completed',
  cancelada:    'bg-status-cancelled',
};

export const PRIORITY_DOT: Record<string, string> = {
  baixa: 'bg-muted-foreground',
  media: 'bg-yellow-500',
  alta:  'bg-red-600',
};

export type UrgencyLevel = 'alta' | 'media' | 'muted';

// Limiares de dias em aberto para severidade visual da OS. Só se aplica a OS
// ativas (aberta/em_andamento) — concluída/cancelada nunca têm urgência.
export const getUrgencyLevel = (
  status: string,
  diasEmAberto: number | null | undefined,
): UrgencyLevel => {
  if (status !== 'aberta' && status !== 'em_andamento') return 'muted';
  if (diasEmAberto === null || diasEmAberto === undefined) return 'muted';
  if (diasEmAberto > 12) return 'alta';
  if (diasEmAberto >= 5) return 'media';
  return 'muted';
};

export const isPrazoVencido = (prazo: string | null | undefined): boolean => {
  if (!prazo) return false;
  const [y, m, d] = prazo.slice(0, 10).split('-').map(Number);
  const prazoDate = new Date(y, (m ?? 1) - 1, d ?? 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return prazoDate < hoje;
};

// Prazo "vencendo em breve" — hoje ou dentro dos próximos `dias` dias, mas
// ainda não vencido. Usado para destacar tarefas antes que fiquem atrasadas.
export const isPrazoProximo = (prazo: string | null | undefined, dias = 3): boolean => {
  if (!prazo) return false;
  const [y, m, d] = prazo.slice(0, 10).split('-').map(Number);
  const prazoDate = new Date(y, (m ?? 1) - 1, d ?? 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + dias);
  return prazoDate >= hoje && prazoDate <= limite;
};

export interface TarefaBuckets {
  novas: number;
  andamento: number;
  atrasadas: number;
}

// Classifica uma tarefa em um dos três "baldes" usados no selo de tarefas da
// listagem. Tarefa atrasada (prazo vencido e não concluída/cancelada) sempre
// prevalece sobre "nova"/"em andamento". Concluída/cancelada não entram em
// nenhum balde — não representam trabalho pendente.
export const bucketTarefa = (
  tarefa: { status: string; prazo: string | null | undefined },
): keyof TarefaBuckets | null => {
  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') return null;
  if (isPrazoVencido(tarefa.prazo)) return 'atrasadas';
  if (tarefa.status === 'aberta') return 'novas';
  if (tarefa.status === 'em_andamento') return 'andamento';
  return null;
};

export { avatarColor, initials } from '@/lib/avatar';
