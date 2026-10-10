import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCatalogos } from '@/features/catalogo/hooks';
import { useCreateServico, useUpdateServico } from '../hooks';
import type { ServicoDetalhe } from '../services';

type Prioridade = 'baixa' | 'media' | 'alta';

const PRIORIDADE_OPTIONS: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

const COMPLEXIDADE_OPTIONS = [
  { value: '1', label: 'Baixa' },
  { value: '2', label: 'Média' },
  { value: '3', label: 'Alta' },
];

interface ServicoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemId: number;
  servico?: ServicoDetalhe;
}

export function ServicoFormDialog({ open, onOpenChange, ordemId, servico }: ServicoFormDialogProps) {
  const isEditing = !!servico;
  const { data: catalogos = [] } = useCatalogos();
  const createMutation = useCreateServico({ ordemId });
  const updateMutation = useUpdateServico({ ordemId });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [catalogoOpen, setCatalogoOpen] = useState(false);
  const [catalogoId, setCatalogoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [prazo, setPrazo] = useState('');
  const [horasEstimadas, setHorasEstimadas] = useState('');
  const [complexidade, setComplexidade] = useState('');

  useEffect(() => {
    if (!open) return;
    setCatalogoId(servico?.catalogo ? String(servico.catalogo) : '');
    setDescricao(servico?.descricao ?? '');
    setPrioridade((servico?.prioridade as Prioridade) ?? 'media');
    setPrazo(servico?.prazo ?? '');
    setHorasEstimadas(servico?.horas_estimadas ?? '');
    setComplexidade(servico?.complexidade ? String(servico.complexidade) : '');
  }, [open, servico]);

  // Catálogo inativo não entra em serviço novo (o backend recusa); o atual continua visível na edição.
  const sortedCatalogos = useMemo(
    () =>
      catalogos
        .filter((c) => c.ativo || c.id === servico?.catalogo)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [catalogos, servico?.catalogo],
  );
  const selectedCatalogo = sortedCatalogos.find((c) => String(c.id) === catalogoId);

  const handleSelectCatalogo = (id: string) => {
    setCatalogoId(id);
    setCatalogoOpen(false);
  };

  const handleSubmit = () => {
    if (!descricao.trim()) return;

    const payload = {
      catalogo: catalogoId ? Number(catalogoId) : null,
      descricao: descricao.trim(),
      prioridade,
      prazo: prazo || null,
      horas_estimadas: horasEstimadas || null,
      complexidade: complexidade ? (Number(complexidade) as 1 | 2 | 3) : null,
    };

    if (isEditing) {
      updateMutation.mutate({ id: servico.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate({ ordem_servico: ordemId, ...payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Serviço do catálogo</Label>
            <Popover open={catalogoOpen} onOpenChange={setCatalogoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={catalogoOpen}
                  className="w-full justify-between border-border bg-background font-normal"
                >
                  {selectedCatalogo?.nome ?? 'Selecionar serviço do catálogo…'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar serviço…" />
                  <CommandList className="max-h-[220px]">
                    <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                    <CommandGroup>
                      {sortedCatalogos.map((c) => (
                        <CommandItem key={c.id} value={c.nome} onSelect={() => handleSelectCatalogo(String(c.id))}>
                          <Check className={cn('mr-2 h-4 w-4', catalogoId === String(c.id) ? 'opacity-100' : 'opacity-0')} />
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o serviço…"
              className="min-h-20 resize-none border-border bg-background text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                <SelectTrigger className="h-9 border-border bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="h-9 border-border bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Complexidade</Label>
              <Select value={complexidade} onValueChange={setComplexidade}>
                <SelectTrigger className="h-9 border-border bg-background text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXIDADE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Horas estimadas</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={horasEstimadas}
              onChange={(e) => setHorasEstimadas(e.target.value)}
              placeholder="Ex.: 8"
              className="h-9 border-border bg-background text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={!descricao.trim() || isPending}>
            {isPending
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : isEditing ? <Save className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
