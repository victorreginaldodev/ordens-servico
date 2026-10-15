// Formatadores pt-BR compartilhados pelo UI kit (docs/ui/design-system-tabelas.md §3).

export type DateInput = string | Date | null | undefined;

const DAY_MS = 86_400_000;

/**
 * Converte a data da API para Date local. Strings `YYYY-MM-DD` são tratadas como data local
 * (new Date('2026-10-09') seria UTC e mostraria o dia anterior no Brasil).
 */
export const parseDate = (value: DateInput): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(+match[1], +match[2] - 1, +match[3]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Dias de calendário entre `today` e `date` (negativo = no passado). */
export const diffInDays = (date: Date, today: Date = new Date()): number =>
  Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / DAY_MS);

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateShortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** `09/10/2026` */
export const formatDate = (value: DateInput): string | null => {
  const date = parseDate(value);
  return date ? dateFmt.format(date) : null;
};

/** `09/10/26` */
export const formatDateShort = (value: DateInput): string | null => {
  const date = parseDate(value);
  return date ? dateShortFmt.format(date) : null;
};

/** `R$ 12.450,00` */
export const formatCurrency = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : currencyFmt.format(n);
};

/** `12,5` */
export const formatNumber = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : numberFmt.format(n);
};

/** `12,5 h` */
export const formatHoras = (value: string | number | null | undefined): string | null => {
  const n = formatNumber(value);
  return n === null ? null : `${n} h`;
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const DOC_MASKS: Record<string, [number, (d: string) => string]> = {
  cnpj: [14, (d) => d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')],
  cpf: [11, (d) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')],
  cei: [12, (d) => d.replace(/^(\d{2})(\d{3})(\d{5})(\d{2})$/, '$1.$2.$3/$4')],
  cno: [12, (d) => d.replace(/^(\d{2})(\d{3})(\d{5})(\d{2})$/, '$1.$2.$3/$4')],
  caepf: [14, (d) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3/$4-$5')],
};

/** `CNPJ 12.345.678/0001-90`. Sem tipo conhecido, devolve o número como veio. */
export const formatDocumento = (
  tipo: string | null | undefined,
  numero: string | null | undefined,
  { withLabel = true } = {},
): string | null => {
  if (!numero) return null;
  const key = (tipo ?? '').toLowerCase();
  const mask = DOC_MASKS[key];
  const digits = onlyDigits(numero);
  const formatted = mask && digits.length === mask[0] ? mask[1](digits) : numero;
  return withLabel && key ? `${key.toUpperCase()} ${formatted}` : formatted;
};

/** `(41) 99999-0000` / `(41) 3333-0000` */
export const formatTelefone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return value;
};

/** `Mariana S.` */
export const formatNomeCurto = (nome: string | null | undefined): string | null => {
  if (!nome) return null;
  const [first, second] = nome.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
};

/** `MS` */
export const getIniciais = (nome: string | null | undefined): string =>
  (nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

/** Texto com conteúdo de verdade: descrições como "." ou "-" (comuns nos dados migrados) não aparecem. */
export const temTexto = (t: string | null | undefined): t is string => !!t && /[\p{L}\p{N}]/u.test(t);
