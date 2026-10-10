import { X } from 'lucide-react';
import { formatDate } from '../utils';
import { defaultFilters, type FiltersState } from './OrdemServicoFiltros';

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};
const PRIORITY_LABELS: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const BILLING_LABELS: Record<string, string> = { paid: 'Faturado', released: 'Liberado', unpaid: 'Não faturado' };

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-secondary border border-border text-xs font-medium">
    {label}
    <button
      onClick={onRemove}
      className="rounded-full p-0.5 hover:bg-muted transition-colors"
      aria-label={`Remover filtro ${label}`}
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

interface OrdemServicoFiltrosAtivosProps {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  technicianOptions?: { value: string; label: string }[];
}

export function OrdemServicoFiltrosAtivos({ filters, onChange, technicianOptions = [] }: OrdemServicoFiltrosAtivosProps) {
  const set = (partial: Partial<FiltersState>) => onChange({ ...filters, ...partial });

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  filters.status.forEach((s) =>
    chips.push({ key: `status-${s}`, label: STATUS_LABELS[s] ?? s, onRemove: () => set({ status: filters.status.filter((x) => x !== s) }) })
  );

  filters.priority.forEach((p) =>
    chips.push({ key: `priority-${p}`, label: PRIORITY_LABELS[p] ?? p, onRemove: () => set({ priority: filters.priority.filter((x) => x !== p) }) })
  );

  filters.technicianIds.forEach((t) => {
    const label = technicianOptions.find((opt) => opt.value === t)?.label ?? t;
    chips.push({ key: `technician-${t}`, label, onRemove: () => set({ technicianIds: filters.technicianIds.filter((x) => x !== t) }) });
  });

  if (filters.billing !== 'all') {
    chips.push({ key: 'billing', label: BILLING_LABELS[filters.billing] ?? filters.billing, onRemove: () => set({ billing: 'all' }) });
  }

  if (filters.contractOnly) {
    chips.push({ key: 'contract', label: 'Contratos', onRemove: () => set({ contractOnly: false }) });
  }

  if (filters.dateRange.from || filters.dateRange.to) {
    const fromFmt = formatDate(filters.dateRange.from);
    const toFmt = formatDate(filters.dateRange.to);
    const label =
      fromFmt && toFmt
        ? `${fromFmt} – ${toFmt}`
        : fromFmt
        ? `A partir de ${fromFmt}`
        : `Até ${toFmt}`;
    chips.push({ key: 'date', label: label ?? '', onRemove: () => set({ dateRange: {} }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtros:</span>
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
      ))}
      <button
        onClick={() => onChange(defaultFilters)}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 ml-1"
      >
        Limpar tudo
      </button>
    </div>
  );
}
