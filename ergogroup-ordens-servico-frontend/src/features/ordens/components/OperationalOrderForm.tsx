import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useClients } from '@/features/clientes/hooks';
import { useUsers } from '@/features/time/hooks';
import { opcoesDePessoas } from '@/features/time/utils';
import { useCatalogosOperacionais } from '@/features/catalogo/hooks';
import { CampoData } from '@/features/vendas/components/CampoData';
import {
  useOperationalOrderDetail,
  useCreateOperationalOrder,
  useUpdateOperationalOrder,
} from '../hooksOperacional';
import { OperationalOrderPrioridade, OperationalOrderStatus } from '../servicesOperacional';

interface FormState {
  cliente: number;
  catalogoOperacional: number;
  responsavel: number;
  quantidade: number;
  descricao: string;
  dataRecebimento: string;
  dataInicio: string;
  dataTermino: string;
  prazo: string;
  prioridade: OperationalOrderPrioridade;
  status: OperationalOrderStatus;
}

const defaultForm: FormState = {
  cliente: 0,
  catalogoOperacional: 0,
  responsavel: 0,
  quantidade: 1,
  descricao: '',
  dataRecebimento: '',
  dataInicio: '',
  dataTermino: '',
  prazo: '',
  prioridade: 'baixa',
  status: 'nao_iniciado',
};

interface OperationalOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: number | null;
}

export function OperationalOrderForm({ open, onOpenChange, editId }: OperationalOrderFormProps) {
  const isEdit = !!editId;
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: clients = [] } = useClients();
  const { data: profiles = [] } = useUsers();
  const { data: catalog = [] } = useCatalogosOperacionais();
  const { data: detail, isLoading: loadingDetail } = useOperationalOrderDetail(editId ?? undefined);
  const createOrder = useCreateOperationalOrder();
  const updateOrder = useUpdateOperationalOrder();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setForm(defaultForm);
      return;
    }
    if (isEdit && detail) {
      setForm({
        cliente: detail.clienteId,
        catalogoOperacional: detail.catalogoOperacionalId,
        responsavel: detail.responsavelId,
        quantidade: detail.quantidade,
        descricao: detail.descricao ?? '',
        dataRecebimento: detail.dataRecebimento ?? '',
        dataInicio: detail.dataInicio ?? '',
        dataTermino: detail.dataTermino ?? '',
        prazo: detail.prazo ?? '',
        prioridade: detail.prioridade,
        status: detail.status,
      });
    }
  }, [open, isEdit, detail]);

  const isValid =
    form.cliente > 0 &&
    form.catalogoOperacional > 0 &&
    form.quantidade > 0 &&
    !!form.dataRecebimento;
  const isPending = createOrder.isPending || updateOrder.isPending;

  const handleSubmit = () => {
    if (!isValid || isPending) return;
    const payload = {
      cliente: form.cliente,
      catalogoOperacional: form.catalogoOperacional,
      responsavel: form.responsavel || undefined,
      quantidade: form.quantidade,
      descricao: form.descricao || null,
      dataRecebimento: form.dataRecebimento,
      dataInicio: form.dataInicio || null,
      dataTermino: form.dataTermino || null,
      prazo: form.prazo || null,
      prioridade: form.prioridade,
      status: form.status,
    };

    if (isEdit && editId) {
      updateOrder.mutate(
        { id: editId, payload },
        {
          onSuccess: () => {
            toast({ title: 'OS Operacional atualizada', description: 'As alterações foram salvas com sucesso.' });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar a OS Operacional. Verifique os dados e tente novamente.', variant: 'destructive' });
          },
        },
      );
    } else {
      createOrder.mutate(payload, {
        onSuccess: () => {
          toast({ title: 'OS Operacional criada', description: 'A ordem foi criada com sucesso.' });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Erro ao criar', description: 'Não foi possível criar a OS Operacional. Verifique os dados e tente novamente.', variant: 'destructive' });
        },
      });
    }
  };

  // Pessoas ativas do time, mais o responsável atual se ele tiver sido desativado.
  const responsaveis = opcoesDePessoas(
    profiles.filter((p) => p.ativo || p.id === form.responsavel),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar OS Operacional' : 'Nova OS Operacional'}
          </DialogTitle>
        </DialogHeader>

        {isEdit && loadingDetail ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cliente</p>
              <Select
                value={form.cliente ? String(form.cliente) : ''}
                onValueChange={(v) => setForm({ ...form, cliente: Number(v) })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Serviço</p>
                <Select
                  value={form.catalogoOperacional ? String(form.catalogoOperacional) : ''}
                  onValueChange={(v) => setForm({ ...form, catalogoOperacional: Number(v) })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                <Select
                  value={form.responsavel ? String(form.responsavel) : ''}
                  onValueChange={(v) => setForm({ ...form, responsavel: Number(v) })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                <Input
                  type="number"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) || 1 })}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recebimento</p>
                <CampoData
                  id="oso-recebimento"
                  aria-label="Recebimento"
                  valor={form.dataRecebimento}
                  onChange={(dataRecebimento) => setForm({ ...form, dataRecebimento })}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as OperationalOrderStatus })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data de início</p>
                <CampoData
                  id="oso-inicio"
                  aria-label="Data de início"
                  valor={form.dataInicio}
                  onChange={(dataInicio) => setForm({ ...form, dataInicio })}
                  placeholder="Sem data"
                  limpavel
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data de término</p>
                <CampoData
                  id="oso-termino"
                  aria-label="Data de término"
                  valor={form.dataTermino}
                  onChange={(dataTermino) => setForm({ ...form, dataTermino })}
                  placeholder="Sem data"
                  limpavel
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
                <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as OperationalOrderPrioridade })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                <CampoData
                  id="oso-prazo"
                  aria-label="Prazo"
                  valor={form.prazo}
                  onChange={(prazo) => setForm({ ...form, prazo })}
                  placeholder="Sem prazo"
                  limpavel
                  atalhos={[{ rotulo: 'Hoje', dias: 0 }, { rotulo: 'Em 7 dias', dias: 7 }, { rotulo: 'Em 15 dias', dias: 15 }]}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="bg-background border-border min-h-24 resize-y"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
