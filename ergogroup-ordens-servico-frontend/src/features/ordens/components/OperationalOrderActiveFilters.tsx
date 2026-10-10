import { X } from 'lucide-react';
import { getStatusLabel } from '../utilsOperacional';
import { getPriorityLabel } from '../utils';
import { defaultFilters, type OperationalOrderFiltersState } from './OperationalOrderFilters';

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

interface OperationalOrderActiveFiltersProps {
  filters: OperationalOrderFiltersState;
  onChange: (filters: OperationalOrderFiltersState) => void;
  technicianOptions?: { value: string; label: string }[];
}

export function OperationalOrderActiveFilters({
  filters,
  onChange,
  technicianOptions = [],
}: OperationalOrderActiveFiltersProps) {
  const set = (partial: Partial<OperationalOrderFiltersState>) => onChange({ ...filters, ...partial });

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.status !== 'all') {
    chips.push({ key: 'status', label: getStatusLabel(filters.status), onRemove: () => set({ status: 'all' }) });
  }

  if (filters.prioridade !== 'all') {
    chips.push({ key: 'prioridade', label: getPriorityLabel(filters.prioridade), onRemove: () => set({ prioridade: 'all' }) });
  }

  if (filters.cobrancaRealizada !== 'all') {
    chips.push({
      key: 'cobrancaRealizada',
      label: filters.cobrancaRealizada === 'true' ? 'Cobrança realizada' : 'Cobrança pendente',
      onRemove: () => set({ cobrancaRealizada: 'all' }),
    });
  }

  if (filters.responsavel !== 'all') {
    const label = technicianOptions.find((opt) => opt.value === filters.responsavel)?.label ?? filters.responsavel;
    chips.push({ key: 'responsavel', label, onRemove: () => set({ responsavel: 'all' }) });
  }

  if (filters.atrasada) {
    chips.push({ key: 'atrasada', label: 'Somente atrasadas', onRemove: () => set({ atrasada: false }) });
  }

  if (filters.ordering !== 'none') {
    chips.push({
      key: 'ordering',
      label: filters.ordering === 'prazo' ? 'Prazo (mais próximo)' : 'Prazo (mais distante)',
      onRemove: () => set({ ordering: 'none' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtros:</span>
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
      ))}
      <button
        onClick={() => onChange({ ...defaultFilters, search: filters.search })}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 ml-1"
      >
        Limpar tudo
      </button>
    </div>
  );
}
