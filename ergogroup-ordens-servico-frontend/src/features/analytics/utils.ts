import { MONTHS } from './constants';

export interface MonthlyEntry {
  mes?: string | number;
  month?: string | number;
  periodo?: string;
  ano?: number;
  total: number;
}

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const toPercentage = (partial: number, total: number): number => {
  if (!Number.isFinite(partial) || !Number.isFinite(total) || total <= 0) return 0;
  return (partial / total) * 100;
};

const clampMonthIndex = (month: number): number => {
  if (!Number.isFinite(month)) return 0;
  if (month < 1) return 0;
  if (month > 12) return 11;
  return Math.floor(month) - 1;
};

export const resolveMonthlyLabel = (
  entry: MonthlyEntry,
  index: number,
): { label: string; sortKey: number } => {
  const raw = entry.mes ?? entry.month ?? entry.periodo;
  const yearFromEntry = entry.ano;

  const buildLabel = (monthIndex: number, year: number) => {
    const safeMonth = ((monthIndex % 12) + 12) % 12;
    return `${MONTHS[safeMonth]}/${year}`;
  };
  const buildSortKey = (monthIndex: number, year: number) => year * 12 + monthIndex;

  if (typeof raw === 'number') {
    const year = typeof yearFromEntry === 'number' ? yearFromEntry : new Date().getFullYear();
    const monthIndex = clampMonthIndex(raw);
    return { label: buildLabel(monthIndex, year), sortKey: buildSortKey(monthIndex, year) };
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    const normalized = raw.trim();

    const isoMatch = normalized.match(/^(\d{4})[-/](\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const monthIndex = clampMonthIndex(Number(isoMatch[2]));
      return { label: buildLabel(monthIndex, year), sortKey: buildSortKey(monthIndex, year) };
    }

    const altMatch = normalized.match(/^(\d{1,2})[-/](\d{4})$/);
    if (altMatch) {
      const monthIndex = clampMonthIndex(Number(altMatch[1]));
      const year = Number(altMatch[2]);
      return { label: buildLabel(monthIndex, year), sortKey: buildSortKey(monthIndex, year) };
    }

    let parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}$/.test(normalized)) {
      parsed = new Date(`${normalized}-01`);
    }
    if (Number.isNaN(parsed.getTime()) && /^\d{2}\/\d{4}$/.test(normalized)) {
      const [monthStr, yearStr] = normalized.split('/');
      parsed = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    }
    if (!Number.isNaN(parsed.getTime())) {
      const mi = parsed.getMonth();
      const yr = parsed.getFullYear();
      return { label: buildLabel(mi, yr), sortKey: buildSortKey(mi, yr) };
    }

    return { label: normalized, sortKey: index };
  }

  if (typeof yearFromEntry === 'number') {
    return { label: String(yearFromEntry), sortKey: buildSortKey(0, yearFromEntry) };
  }

  return { label: `Período ${index + 1}`, sortKey: index };
};

export const toChartSeries = (entries: MonthlyEntry[]): Array<{ name: string; value: number }> =>
  entries
    .map((entry, i) => {
      const { label, sortKey } = resolveMonthlyLabel(entry, i);
      return { name: label, value: Number(entry.total ?? 0), sortKey };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ name, value }) => ({ name, value }));
