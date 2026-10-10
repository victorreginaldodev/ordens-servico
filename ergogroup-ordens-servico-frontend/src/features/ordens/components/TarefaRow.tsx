import { useState } from 'react';
import { Ban, Loader2, MoreVertical, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { avatarColor, formatDate, initials, isPrazoProximo, isPrazoVencido, PRIORITY_DOT } from '../utils';
import { nextStatus, previousStatus, TarefaStatusControl } from './TarefaStatusControl';
import type { UsuarioApi } from '@/features/time/services';
import type { TarefaDetalhe, UpdateTarefaPayload } from '../services';

type Prioridade = 'baixa' | 'media' | 'alta';

const PRIORIDADE_LABEL: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

const PRIORIDADE_OPTIONS: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface TarefaRowProps {
  tarefa: TarefaDetalhe;
  usuarios: UsuarioApi[];
  onStatusChange: (id: number, status: string) => void;
  onEdit: (id: number, payload: UpdateTarefaPayload) => void;
  onDelete: (id: number) => void;
  isPending?: boolean;
  /** Líder/Sub-Líder Técnico: controle total (status, editar, cancelar, excluir) em qualquer tarefa. */
  canManage?: boolean;
  /** Líder/Sub-Líder/Diretor: podem definir prioridade, prazo e horas estimadas — mesmo quem não tem `canManage`. */
  canEditAdvancedFields?: boolean;
  /** Qualquer usuário: pode avançar/reverter o status das suas próprias tarefas — sem editar/cancelar/excluir se não tiver permissão de gestão. */
  allowSelfStatusUpdate?: boolean;
  /** Gestor Comercial (e quem gerencia tarefas): pode avançar/reverter/finalizar o status das tarefas. */
  canFinishTasks?: boolean;
  currentUserId?: number;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function TarefaRow({
  tarefa,
  usuarios,
  onStatusChange,
  onEdit,
  onDelete,
  isPending,
  canManage,
  canEditAdvancedFields,
  allowSelfStatusUpdate,
  canFinishTasks,
  currentUserId,
}: TarefaRowProps) {
  const [editing, setEditing]           = useState(false);
  const [editDescricao, setEditDescricao]       = useState(tarefa.descricao ?? '');
  const [editResponsavel, setEditResponsavel]   = useState(String(tarefa.responsavel));
  const [editPrioridade, setEditPrioridade]     = useState<Prioridade>((tarefa.prioridade as Prioridade) ?? 'media');
  const [editPrazo, setEditPrazo]               = useState(tarefa.prazo ?? '');
  const [editHorasEstimadas, setEditHorasEstimadas] = useState(tarefa.horas_estimadas ?? '');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const isCurrentUser = currentUserId !== undefined && tarefa.responsavel === currentUserId;
  const canControlStatus = !!canManage || (!!allowSelfStatusUpdate && isCurrentUser) || !!canFinishTasks;
  const canOpenMenu = !!canManage || !!canEditAdvancedFields;

  const handleSave = () => {
    const payload: UpdateTarefaPayload = {};
    if (canManage) {
      payload.descricao = editDescricao.trim();
      payload.responsavel = editResponsavel ? Number(editResponsavel) : undefined;
    }
    if (canManage || canEditAdvancedFields) {
      payload.prioridade = editPrioridade;
      payload.prazo = editPrazo || null;
      payload.horas_estimadas = editHorasEstimadas || null;
    }
    onEdit(tarefa.id, payload);
    setEditing(false);
  };

  const resetEditState = () => {
    setEditDescricao(tarefa.descricao ?? '');
    setEditResponsavel(String(tarefa.responsavel));
    setEditPrioridade((tarefa.prioridade as Prioridade) ?? 'media');
    setEditPrazo(tarefa.prazo ?? '');
    setEditHorasEstimadas(tarefa.horas_estimadas ?? '');
  };

  const handleCancelEdit = () => {
    resetEditState();
    setEditing(false);
  };

  const handleStartEdit = () => {
    resetEditState();
    setEditing(true);
  };

  const handleAdvance = () => {
    const next = nextStatus(tarefa.status);
    if (next) onStatusChange(tarefa.id, next);
  };

  const handleRevert = () => {
    const previous = previousStatus(tarefa.status);
    if (previous) onStatusChange(tarefa.id, previous);
  };

  const handleConfirmCancelar = () => {
    onStatusChange(tarefa.id, 'cancelada');
    setConfirmCancelOpen(false);
  };

  const nome = tarefa.responsavel_nome ?? '—';
  const avatarCls = avatarColor(nome);
  const monogram = nome !== '—' ? initials(nome) : '?';
  const descricao = tarefa.descricao?.trim();
  const prazo = formatDate(tarefa.prazo);
  const ativa = tarefa.status !== 'concluida' && tarefa.status !== 'cancelada';
  const overdue = isPrazoVencido(tarefa.prazo) && ativa;
  const proximoDoVencimento = !overdue && isPrazoProximo(tarefa.prazo) && ativa;
  const canCancelar = tarefa.status !== 'cancelada' && tarefa.status !== 'concluida';

  /* ── Modo edição ── */
  if (editing) {
    return (
      <div className="space-y-3 bg-muted/30 px-[18px] py-4">
        {canManage && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Responsável</p>
              <Select value={editResponsavel} onValueChange={setEditResponsavel}>
                <SelectTrigger className="h-8 border-border bg-background text-sm">
                  <SelectValue placeholder="Selecionar" />
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
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                className="min-h-20 resize-none border-border bg-background text-sm"
              />
            </div>
          </>
        )}
        {(canManage || canEditAdvancedFields) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Prioridade</Label>
              <Select value={editPrioridade} onValueChange={(v) => setEditPrioridade(v as Prioridade)}>
                <SelectTrigger className="h-8 border-border bg-background text-sm">
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
              <Label className="text-xs font-medium text-muted-foreground">Prazo</Label>
              <Input
                type="date"
                value={editPrazo}
                onChange={(e) => setEditPrazo(e.target.value)}
                className="h-8 border-border bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Horas estimadas</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={editHorasEstimadas}
                onChange={(e) => setEditHorasEstimadas(e.target.value)}
                placeholder="Ex.: 4"
                className="h-8 border-border bg-background text-sm"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isPending}>
            <X className="mr-1 h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button variant="hero" size="sm" onClick={handleSave} disabled={isPending}>
            {isPending
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              : <Save    className="mr-1 h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  /* ── Modo leitura ── */
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 border-t border-border px-[18px] py-3 transition-colors hover:bg-muted/20',
        isCurrentUser
          ? 'border-l-[3px] border-l-primary/70 pl-[15px]'
          : overdue
            ? 'border-l-[3px] border-l-red-500/70 pl-[15px]'
            : proximoDoVencimento && 'border-l-[3px] border-l-amber-500/70 pl-[15px]',
      )}
    >
      {/* Controle de status — largura fixa */}
      <div className="flex w-[190px] shrink-0 items-center gap-1.5">
        <TarefaStatusControl
          status={tarefa.status}
          onAdvance={handleAdvance}
          onRevert={handleRevert}
          canManage={canControlStatus}
          disabled={isPending}
        />
      </div>

      {/* Descrição + meta */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm text-foreground',
            isCurrentUser ? 'font-bold' : 'font-medium',
            tarefa.status === 'cancelada' && 'line-through opacity-60',
          )}
        >
          {descricao || `Tarefa #${tarefa.id}`}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-muted-foreground">
          {isCurrentUser && (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Sua tarefa
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[tarefa.prioridade] ?? PRIORITY_DOT.baixa)} />
            <span className={tarefa.prioridade === 'alta' ? 'font-bold text-red-500' : undefined}>
              {PRIORIDADE_LABEL[tarefa.prioridade] ?? tarefa.prioridade_display}
            </span>
          </span>
          <span>
            Prazo{' '}
            <span
              className={cn(
                'font-semibold',
                overdue ? 'text-red-500' : proximoDoVencimento ? 'text-amber-500' : 'text-foreground/80',
              )}
            >
              {prazo ?? '—'}
            </span>
          </span>
          {overdue && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">Atrasada</span>
          )}
          {proximoDoVencimento && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Vence em breve</span>
          )}
        </div>
      </div>

      {/* Responsável + ações */}
      <div className="flex shrink-0 items-center gap-2">
        <div
          className={cn(
            'flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold',
            avatarCls,
          )}
        >
          {monogram}
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-foreground">{nome}</span>

        {canOpenMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={isPending}
              >
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <MoreVertical className="h-3.5 w-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </DropdownMenuItem>
              {canManage && canCancelar && (
                <DropdownMenuItem
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <Ban className="mr-2 h-3.5 w-3.5" /> Cancelar tarefa
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem
                  onClick={() => onDelete(tarefa.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <X className="mr-2 h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Confirmação de cancelamento ── */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa será marcada como cancelada. Essa ação não avança nem reverte pelo controle de status — só é possível reatribuir ou editar depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancelar} className="bg-amber-600 hover:bg-amber-700">
              Cancelar tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
