import { diffInDays, parseDate, type DateInput } from '@/lib/format';

/** Mesmo critério de atraso do PrazoIndicator, para filtros e visões. */
export const isPrazoVencido = (prazo: DateInput, encerrado?: boolean, today?: Date) => {
  const date = parseDate(prazo);
  return !encerrado && !!date && diffInDays(date, today) < 0;
};
