import { useState } from 'react';
import { CheckCircle2, Loader2, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDate, isPrazoVencido, PRIORITY_DOT, STATUS_DOT } from '../utils';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateTarefa,
  useDeleteServico,
  useDeleteTarefa,
  useTarefasDeServico,
  useUpdateTarefa,
} from '../hooks';
import { TarefaRow } from './TarefaRow';
import { ServicoFormDialog } from './ServicoFormDialog';
import type { ServicoDetalhe, TarefaDetalhe, UpdateTarefaPayload } from '../services';
import type { UsuarioApi } from '@/features/time/services';

// ── Rótulos ──────────────────────────────────────────────────────────────────

const STATUS_TEXT: Record<string, string> = {
  aberto:       'Aberto',
  em_andamento: 'Em andamento',
  concluida:    'Concluído',
  cancelado:    'Cancelado',
};

const STATUS_TEXT_CLASS: Record<string, string> = {
  aberto:       'text-red-600 dark:text-red-400',
  em_andamento: 'text-amber-600 dark:text-amber-400',
  concluida:    'text-green-600 dark:text-green-400',
  cancelado:    'text-muted-foreground',
};

// STATUS_DOT (utils.ts) é indexado pelas grafias de status de Ordem/Tarefa
// ('aberta'/'cancelada'); ServicoDetalhe.status usa 'aberto'/'cancelado'.
const SERVICO_STATUS_DOT: Record<string, string> = {
  aberto:       STATUS_DOT.aberta,
  em_andamento: STATUS_DOT.em_andamento,
  concluida:    STATUS_DOT.concluida,
  cancelado:    STATUS_DOT.cancelada,
};

const PRIORIDADE_LABEL: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const COMPLEXIDADE_LABEL: Record<number, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };

type Prioridade = 'baixa' | 'media' | 'alta';

const PRIORIDADE_OPTIONS: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ServicoAccordionCardProps {
  servico: ServicoDetalhe;
  ordemId: number;
  usuarios: UsuarioApi[];
  /** Qualquer usuário: pode avançar/reverter o status das suas próprias tarefas. */
  allowSelfStatusUpdate?: boolean;
  index: number;
  currentUserId?: number;
  filterUserId?: number;
  initialTarefas?: TarefaDetalhe[];
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ServicoAccordionCard({
  servico,
  ordemId,
  usuarios,
  allowSelfStatusUpdate,
  currentUserId,
  filterUserId,
  initialTarefas,
}: ServicoAccordionCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaResponsavel, setNovaResponsavel] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState<Prioridade>('media');
  const [novaPrazo, setNovaPrazo] = useState('');
  const [novaHorasEstimadas, setNovaHorasEstimadas] = useState('');
  const [editServicoOpen, setEditServicoOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { toast } = useToast();

  // As regras de execução valem no setor do serviço: quem distribui tarefas em Ergonomia
  // não mexe nas tarefas de um serviço de Segurança do Trabalho.
  const { pode } = usePermissoes();
  // Criar, reatribuir, cancelar e excluir tarefas, com prioridade, prazo e horas estimadas.
  const canManageTasks = pode('tarefas.distribuir', servico.setor);
  // Mudar o status de qualquer tarefa do serviço, não só das próprias.
  const canFinishTasks = pode('tarefas.editar_setor', servico.setor);
  const canEditAdvancedFields = canManageTasks;
  const canEditServico = pode('os.gerenciar') || pode('servicos.gerenciar', servico.setor);
  const canDeleteServico = pode('os.excluir');

  const nome = servico.catalogo_detail?.nome ?? servico.catalogo_nome ?? `Serviço #${servico.id}`;

  const ctx = { servicoId: servico.id, ordemId };
  const { data: fetchedTarefas, isLoading: loadingFetched } = useTarefasDeServico(
    initialTarefas !== undefined ? undefined : servico.id,
  );
  const allTarefas   = initialTarefas ?? fetchedTarefas;
  const loadingTarefas = initialTarefas === undefined && loadingFetched;

  const tarefas = filterUserId
    ? allTarefas?.filter((t) => t.responsavel === filterUserId)
    : allTarefas;

  const createMutation = useCreateTarefa(ctx);
  const updateMutation = useUpdateTarefa(ctx);
  const deleteMutation = useDeleteTarefa(ctx);
  const deleteServicoMutation = useDeleteServico({ ordemId });
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleOpenDialog = () => {
    setNovaDescricao('');
    setNovaResponsavel('');
    setNovaPrioridade('media');
    setNovaPrazo('');
    setNovaHorasEstimadas('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setNovaDescricao('');
    setNovaResponsavel('');
    setNovaPrioridade('media');
    setNovaPrazo('');
    setNovaHorasEstimadas('');
    setDialogOpen(false);
  };

  const handleCriarTarefa = () => {
    if (!novaDescricao.trim() || !novaResponsavel) return;
    createMutation.mutate(
      {
        servico: servico.id,
        descricao: novaDescricao.trim(),
        responsavel: Number(novaResponsavel),
        ...(canEditAdvancedFields
          ? {
              prioridade: novaPrioridade,
              prazo: novaPrazo || null,
              horas_estimadas: novaHorasEstimadas || null,
            }
          : {}),
      },
      {
        onSuccess: () => {
          toast({
            title: 'Tarefa criada',
            description: 'A tarefa foi adicionada ao serviço.',
          });
          handleCloseDialog();
        },
        onError: () => {
          toast({
            title: 'Erro ao criar tarefa',
            description: 'Não foi possível criar a tarefa. Verifique os dados e tente novamente.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleConfirmDeleteServico = () => {
    deleteServicoMutation.mutate(servico.id, { onSuccess: () => setConfirmDeleteOpen(false) });
  };

  const prazoOverdue = isPrazoVencido(servico.prazo) && servico.status !== 'concluida' && servico.status !== 'cancelado';
  const isConcluido = servico.status === 'concluida';

  const horasLabel = servico.horas_estimadas
    ? `Est ${servico.horas_estimadas}h${servico.horas_estimadas_efetivas ? ` · Real ${servico.horas_estimadas_efetivas}h` : ''}`
    : servico.horas_estimadas_efetivas
      ? `Real ${servico.horas_estimadas_efetivas}h`
      : '—';

  const complexidadeLabel = servico.complexidade
    ? (servico.complexidade_display ?? COMPLEXIDADE_LABEL[servico.complexidade])
    : '—';
  const complexidadeEfetivaLabel = servico.complexidade_efetiva
    ? (COMPLEXIDADE_LABEL[servico.complexidade_efetiva] ?? String(servico.complexidade_efetiva))
    : null;
  const complexidadeDiverge = !!complexidadeEfetivaLabel && complexidadeEfetivaLabel !== complexidadeLabel;

  const taskCount = loadingTarefas
    ? '…'
    : `${allTarefas?.filter((t) => t.status === 'concluida').length ?? 0}/${allTarefas?.length ?? 0} tarefas`;

  const metaItems = [
    {
      label: 'Prazo',
      value: (
        <span className={cn(prazoOverdue && 'text-red-500')}>{formatDate(servico.prazo) ?? '—'}</span>
      ),
    },
    { label: 'Horas (est / real)', value: horasLabel },
    {
      label: 'Complexidade',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span>{complexidadeLabel}</span>
          {complexidadeDiverge && (
            <span className="text-[11px] font-semibold text-amber-500">efetiva: {complexidadeEfetivaLabel}</span>
          )}
        </span>
      ),
    },
    { label: 'Início', value: formatDate(servico.data_inicio) ?? '—' },
    { label: 'Término', value: formatDate(servico.data_termino) ?? '—' },
    ...(isConcluido ? [{ label: 'Concluído por', value: servico.terminado_por_nome ?? '—' }] : []),
  ];

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      {/* ── Cabeçalho ── */}
      <div className="border-b border-border bg-muted/40 px-[18px] py-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
            <CheckCircle2 className="h-[17px] w-[17px]" strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[15.5px] font-bold tracking-tight text-foreground">{nome}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold">
                <span className={cn('h-1.5 w-1.5 rounded-full', SERVICO_STATUS_DOT[servico.status] ?? STATUS_DOT.aberta)} />
                <span className={STATUS_TEXT_CLASS[servico.status] ?? 'text-foreground'}>
                  {STATUS_TEXT[servico.status] ?? servico.status_display}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[servico.prioridade] ?? PRIORITY_DOT.baixa)} />
                <span className={servico.prioridade === 'alta' ? 'text-red-500' : 'text-muted-foreground'}>
                  {PRIORIDADE_LABEL[servico.prioridade] ?? servico.prioridade_display}
                </span>
              </span>
            </div>
            <p className="mt-[7px] max-w-[80ch] text-[13px] leading-relaxed text-muted-foreground">
              {servico.descricao || 'Sem descrição.'}
            </p>
          </div>

          <span className="shrink-0 whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {taskCount}
          </span>

          {(canEditServico || canDeleteServico) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEditServico && (
                  <DropdownMenuItem onClick={() => setEditServicoOpen(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                )}
                {canDeleteServico && (
                  <DropdownMenuItem
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir serviço
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Metadados — alinhados sob o título (34px ícone + 14px gap = 48px) */}
        <div className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-3.5 pl-[48px] sm:grid-cols-3 lg:grid-cols-6">
          {metaItems.map((m) => (
            <div key={m.label} className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                {m.label}
              </span>
              <span className="truncate text-[13.5px] font-semibold text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tarefas ── */}
      <div>
        {loadingTarefas ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3">
              <Skeleton className="h-[30px] w-[190px] shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-[26px] w-[26px] shrink-0 rounded-full" />
            </div>
          ))
        ) : tarefas?.length ? (
          tarefas.map((t) => (
            <TarefaRow
              key={t.id}
              tarefa={t}
              usuarios={usuarios}
              onStatusChange={(id, status) => updateMutation.mutate({ id, payload: { status } })}
              onEdit={(id, payload: UpdateTarefaPayload) => updateMutation.mutate({ id, payload })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isPending={isMutating}
              canManage={canManageTasks}
              canEditAdvancedFields={canEditAdvancedFields}
              allowSelfStatusUpdate={allowSelfStatusUpdate}
              canFinishTasks={canFinishTasks}
              currentUserId={currentUserId}
            />
          ))
        ) : (
          <div className="border-t border-border px-[18px] py-8 text-center">
            <p className="text-sm font-semibold text-foreground">Nenhuma tarefa neste serviço</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Crie a primeira tarefa para começar.</p>
          </div>
        )}

        {canManageTasks && (
          <button
            type="button"
            onClick={handleOpenDialog}
            className="flex w-full items-center gap-2 border-t border-border px-[18px] py-[11px] text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <Plus className="h-[15px] w-[15px]" strokeWidth={2.2} />
            Adicionar tarefa
          </button>
        )}
      </div>

      {/* ── Modal — Nova tarefa ── */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Nova tarefa — {nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Responsável</p>
              <Select value={novaResponsavel} onValueChange={setNovaResponsavel}>
                <SelectTrigger className="h-9 border-border bg-background text-sm">
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Descrição</p>
              <Textarea
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Descreva a tarefa..."
                className="min-h-24 resize-none border-border bg-background text-sm"
              />
            </div>

            {canEditAdvancedFields && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={novaPrioridade} onValueChange={(v) => setNovaPrioridade(v as Prioridade)}>
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
                    value={novaPrazo}
                    onChange={(e) => setNovaPrazo(e.target.value)}
                    className="h-9 border-border bg-background text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Horas estimadas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={novaHorasEstimadas}
                    onChange={(e) => setNovaHorasEstimadas(e.target.value)}
                    placeholder="Ex.: 4"
                    className="h-9 border-border bg-background text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleCriarTarefa}
              disabled={!novaDescricao.trim() || !novaResponsavel || createMutation.isPending}
            >
              {createMutation.isPending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Plus    className="mr-1.5 h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal — Editar serviço ── */}
      <ServicoFormDialog open={editServicoOpen} onOpenChange={setEditServicoOpen} ordemId={ordemId} servico={servico} />

      {/* ── Confirmação — Excluir serviço ── */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente o serviço e todas as suas tarefas. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteServico}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteServicoMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
