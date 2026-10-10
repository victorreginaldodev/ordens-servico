import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatHoras, formatNumber, formatTelefone, getIniciais } from '@/lib/format';
import type { Density } from './types';

// Células dos tipos de coluna (docs/ui/design-system-tabelas.md §3).
// Regra geral: vazio = "—" em muted, nada em caixa alta, números com tabular-nums.

export const CellVazio = () => <span className="text-muted-foreground">—</span>;

export function CellRegistro({
  title,
  subtitle,
  density,
  leading,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  density?: Density;
  /** Elemento antes do título (ex.: avatar da pessoa). */
  leading?: React.ReactNode;
}) {
  const texto =
    density === 'compact' ? (
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="max-w-xs truncate font-medium">{title || '—'}</span>
        {subtitle ? <span className="truncate text-xs tabular-nums text-muted-foreground">{subtitle}</span> : null}
      </div>
    ) : (
      <div className="min-w-0">
        <div className="max-w-sm truncate font-medium">{title || '—'}</div>
        {subtitle ? <div className="max-w-sm truncate text-xs tabular-nums text-muted-foreground">{subtitle}</div> : null}
      </div>
    );
  if (!leading) return texto;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {leading}
      {texto}
    </div>
  );
}

/** Avatar de iniciais para a coluna Registro de pessoas: 28px confortável, 20px compacta. */
export function CellAvatar({ nome, foto, density }: { nome: string; foto?: string | null; density?: Density }) {
  const size = density === 'compact' ? 'size-5 text-2xs' : 'size-7 text-xs';
  return foto ? (
    <img src={foto} alt="" className={cn('shrink-0 rounded-full object-cover', size)} />
  ) : (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground', size)} aria-hidden>
      {getIniciais(nome)}
    </span>
  );
}

export function CellTexto({ value, className }: { value: React.ReactNode; className?: string }) {
  if (value === null || value === undefined || value === '') return <CellVazio />;
  return (
    <span className={cn('block max-w-xs truncate', className)} title={typeof value === 'string' ? value : undefined}>
      {value}
    </span>
  );
}

export function CellData({ value }: { value: string | Date | null | undefined }) {
  const text = formatDate(value);
  return text ? <span className="tabular-nums">{text}</span> : <CellVazio />;
}

export function CellMoeda({ value }: { value: string | number | null | undefined }) {
  const text = formatCurrency(value);
  return text ? <span className="font-medium tabular-nums">{text}</span> : <CellVazio />;
}

export function CellNumero({ value, format = 'numero', suffix }: { value: string | number | null | undefined; format?: 'numero' | 'horas'; suffix?: string }) {
  const text = format === 'horas' ? formatHoras(value) : formatNumber(value);
  if (text === null) return <CellVazio />;
  return <span className="tabular-nums">{suffix ? `${text} ${suffix}` : text}</span>;
}

const NIVEL_LABEL: Record<number, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };

/** Complexidade 1–3: medidor de 3 barras + texto. */
export function CellNivel({ value }: { value: number | null | undefined }) {
  if (!value) return <CellVazio />;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('h-3 w-1 rounded-sm', n <= value ? 'bg-foreground/70' : 'bg-border')} />
        ))}
      </span>
      {NIVEL_LABEL[value] ?? value}
    </span>
  );
}

export function CellBooleano({ value, label = 'Sim' }: { value: boolean | null | undefined; label?: string }) {
  if (!value) return <CellVazio />;
  return (
    <span className="inline-flex items-center gap-1">
      <Check className="size-3.5 text-primary" aria-hidden />
      {label}
    </span>
  );
}

export function CellSituacao({ ativo }: { ativo: boolean | null | undefined }) {
  return ativo ? <span>Ativo</span> : <span className="text-muted-foreground">Inativo</span>;
}

export function CellContato({ value, kind }: { value: string | null | undefined; kind: 'email' | 'telefone' }) {
  if (!value) return <CellVazio />;
  const text = kind === 'telefone' ? formatTelefone(value) : value;
  const href = kind === 'email' ? `mailto:${value}` : `tel:${value.replace(/\D/g, '')}`;
  return (
    <a href={href} className="block max-w-xs truncate underline-offset-4 hover:text-primary hover:underline">
      {text}
    </a>
  );
}
