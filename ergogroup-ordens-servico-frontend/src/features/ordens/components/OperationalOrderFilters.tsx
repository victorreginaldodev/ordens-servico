import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OperationalOrderFiltersState {
  search: string;
  status: string;
  prioridade: string;
  cobrancaRealizada: 'all' | 'true' | 'false';
  responsavel: string;
  atrasada: boolean;
  ordering: 'none' | 'prazo' | '-prazo';
}

export const defaultFilters: OperationalOrderFiltersState = {
  search: '',
  status: 'all',
  prioridade: 'all',
  cobrancaRealizada: 'all',
  responsavel: 'all',
  atrasada: false,
  ordering: 'none',
};

interface OperationalOrderFiltersProps {
  filters: OperationalOrderFiltersState;
  onChange: (filters: OperationalOrderFiltersState) => void;
  technicianOptions?: { value: string; label: string }[];
}

export function OperationalOrderFilters({ filters, onChange, technicianOptions = [] }: OperationalOrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="flex-1">
        <Input
          placeholder="Buscar por cliente ou serviço..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="bg-secondary border-border"
        />
      </div>
      <div className="w-full sm:w-[200px]">
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ ...filters, status: v })}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-[180px]">
        <Select
          value={filters.prioridade}
          onValueChange={(v) => onChange({ ...filters, prioridade: v })}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-[180px]">
        <Select
          value={filters.cobrancaRealizada}
          onValueChange={(v) => onChange({ ...filters, cobrancaRealizada: v as OperationalOrderFiltersState['cobrancaRealizada'] })}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Cobrança" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cobrança</SelectItem>
            <SelectItem value="true">Realizada</SelectItem>
            <SelectItem value="false">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {technicianOptions.length > 0 && (
        <div className="w-full sm:w-[220px]">
          <Select
            value={filters.responsavel}
            onValueChange={(v) => onChange({ ...filters, responsavel: v })}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {technicianOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="w-full sm:w-[190px]">
        <Select
          value={filters.ordering}
          onValueChange={(v) => onChange({ ...filters, ordering: v as OperationalOrderFiltersState['ordering'] })}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ordenação padrão</SelectItem>
            <SelectItem value="prazo">Prazo (mais próximo)</SelectItem>
            <SelectItem value="-prazo">Prazo (mais distante)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          id="atrasada"
          checked={filters.atrasada}
          onCheckedChange={(v) => onChange({ ...filters, atrasada: v })}
        />
        <Label htmlFor="atrasada" className="text-sm cursor-pointer whitespace-nowrap">Somente atrasadas</Label>
      </div>
    </div>
  );
}
