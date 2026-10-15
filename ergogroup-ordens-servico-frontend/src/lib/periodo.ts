import { parseDate, type DateInput } from './format';

/** Períodos do filtro de data (fluxos-e-navegacao.md §6.2.2, item 3), relativos a hoje. */
export type PresetDePeriodo = 'semana' | 'prox7' | 'mes' | 'mes_passado' | 'personalizado';

export interface Periodo {
  preset: PresetDePeriodo;
  /** `AAAA-MM-DD`, só no personalizado. */
  de?: string;
  ate?: string;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dia = (d: Date, n = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const ROTULO_PERIODO: Record<PresetDePeriodo, string> = {
  semana: 'Esta semana',
  prox7: 'Próximos 7 dias',
  mes: 'Este mês',
  mes_passado: 'Mês passado',
  personalizado: 'Personalizado',
};

/** Início e fim do período em `AAAA-MM-DD`; `null` no personalizado sem nenhuma das datas. */
export function intervaloDoPeriodo(p: Periodo, hoje = new Date()): { de: string; ate: string } | null {
  const h = dia(hoje);
  switch (p.preset) {
    case 'semana': {
      const seg = dia(h, -((h.getDay() + 6) % 7));
      return { de: iso(seg), ate: iso(dia(seg, 6)) };
    }
    case 'prox7':
      return { de: iso(h), ate: iso(dia(h, 7)) };
    case 'mes':
      return { de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
    case 'mes_passado':
      return { de: iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), ate: iso(new Date(h.getFullYear(), h.getMonth(), 0)) };
    case 'personalizado':
      return p.de || p.ate ? { de: p.de || '2000-01-01', ate: p.ate || '2100-12-31' } : null;
  }
}

/** A data está no período? Sem data, fica fora. */
export function dentroDoPeriodo(data: DateInput, intervalo: { de: string; ate: string } | null): boolean {
  if (!intervalo) return true;
  const d = parseDate(data);
  if (!d) return false;
  const v = iso(d);
  return v >= intervalo.de && v <= intervalo.ate;
}

/** Primeiro dia do mês atual e hoje, em `AAAA-MM-DD` (padrão dos concluídos no backend). */
export const mesAteHoje = (hoje = new Date()) => ({ de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate: iso(dia(hoje)) });

/** Data de `n` dias atrás, em `AAAA-MM-DD`. */
export const diasAtras = (n: number, hoje = new Date()) => iso(dia(hoje, -n));

export const rotuloDoPeriodo = (p: Periodo) => {
  if (p.preset !== 'personalizado') return ROTULO_PERIODO[p.preset].toLowerCase();
  const curta = (v?: string) => (v ? v.split('-').reverse().slice(0, 2).join('/') : '…');
  return `${curta(p.de)} a ${curta(p.ate)}`;
};

/** Período na URL: `f.<id>=mes` ou `f.<id>=personalizado,2026-01-01,2026-01-31`. */
export const periodoDosValores = (values: string[] | undefined): Periodo | null => {
  const [preset, de, ate] = values ?? [];
  if (!preset || !(preset in ROTULO_PERIODO)) return null;
  return { preset: preset as PresetDePeriodo, de: de || undefined, ate: ate || undefined };
};

export const valoresDoPeriodo = (p: Periodo | null): string[] =>
  !p ? [] : p.preset === 'personalizado' ? [p.preset, p.de ?? '', p.ate ?? ''] : [p.preset];
