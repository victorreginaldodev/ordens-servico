import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { STATUS_DEFS } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mensagemDeErro } from '@/lib/api-errors';
import { useToast } from '@/hooks/use-toast';
import { useEditarTarefa, useEquipe, useExcluirTarefa } from '../hooks';
import type { EdicaoDaTarefa, StatusDaTarefa } from '../services';
import type { Esquemas } from '@/api/tipos';

type TarefaDoDetalhe = Esquemas['TarefaDoDetalhe'];

export interface PoderesNaTarefa {
  /** `tarefas.distribuir` no setor: reatribuir, mudar o prazo e excluir. */
  distribui: boolean;
  /** `tarefas.editar_setor` no setor: editar a tarefa de outra pessoa, inclusive o status. */
  editaSetor: boolean;
}

/**
 * Editar uma tarefa do serviço. Um modal só, em duas etapas: o formulário e, se for excluir,
 * a confirmação no lugar dele (convenção: modais nunca empilhados).
 */
export function TarefaModal({
  tarefa,
  setorId,
  servicoNome,
  poderes,
  onClose,
}: {
  tarefa: TarefaDoDetalhe | null;
  setorId: number | null;
  servicoNome: string;
  poderes: PoderesNaTarefa;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: equipe } = useEquipe(poderes.distribui && setorId ? setorId : undefined);
  const editar = useEditarTarefa();
  const excluir = useExcluirTarefa();
  const [etapa, setEtapa] = useState<'form' | 'excluir'>('form');
  const [form, setForm] = useState({ responsavel: 0, prazo: '', descricao: '', status: 'aberta' as StatusDaTarefa });
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (tarefa) {
      setEtapa('form');
      setErro('');
      setForm({ responsavel: tarefa.responsavel_id, prazo: tarefa.prazo ?? '', descricao: tarefa.descricao ?? '', status: tarefa.status as StatusDaTarefa });
    }
  }, [tarefa]);

  if (!tarefa) return <Dialog open={false} />;
  const podeEditar = poderes.distribui || poderes.editaSetor;
  const membros = (equipe ?? []).filter((m) => m.membro_do_setor || m.usuario_id === tarefa.responsavel_id);

  const salvar = () => {
    const payload: EdicaoDaTarefa = {};
    if (poderes.distribui && form.responsavel !== tarefa.responsavel_id) payload.responsavel = form.responsavel;
    if (form.prazo !== (tarefa.prazo ?? '')) payload.prazo = form.prazo || null;
    if (form.descricao !== (tarefa.descricao ?? '')) payload.descricao = form.descricao.trim() || null;
    if (poderes.editaSetor && form.status !== tarefa.status) payload.status = form.status;
    if (!Object.keys(payload).length) return onClose();
    editar.mutate(
      { tarefaId: tarefa.id, payload },
      {
        onSuccess: () => {
          toast({ title: 'Tarefa atualizada', description: servicoNome });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível salvar. Tente de novo.')),
      },
    );
  };

  const confirmarExclusao = () =>
    excluir.mutate(tarefa.id, {
      onSuccess: () => {
        toast({ title: 'Tarefa excluída', description: `${servicoNome} · ${tarefa.responsavel_nome}` });
        onClose();
      },
      onError: (e) => {
        setEtapa('form');
        setErro(mensagemDeErro(e, 'Não foi possível excluir. Tente de novo.'));
      },
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {etapa === 'excluir' ? (
          <>
            <DialogHeader>
              <DialogTitle>Excluir a tarefa?</DialogTitle>
              <DialogDescription>
                A tarefa de {tarefa.responsavel_nome} em {servicoNome} sai do serviço. Se for a única, o serviço volta para a fila do setor.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEtapa('form')}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={confirmarExclusao} disabled={excluir.isPending}>
                {excluir.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Excluir tarefa
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Editar tarefa</DialogTitle>
              <DialogDescription>
                {servicoNome} · {tarefa.responsavel_nome}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {poderes.distribui ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="t-resp">Responsável</Label>
                  <select
                    id="t-resp"
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: Number(e.target.value) })}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {!membros.some((m) => m.usuario_id === tarefa.responsavel_id) ? <option value={tarefa.responsavel_id}>{tarefa.responsavel_nome}</option> : null}
                    {membros.map((m) => (
                      <option key={m.usuario_id} value={m.usuario_id}>
                        {m.nome} ({m.ativos} ativo{m.ativos === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {podeEditar ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="t-prazo">Prazo</Label>
                  <Input id="t-prazo" type="date" className="sm:w-48" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
                </div>
              ) : null}
              {poderes.editaSetor ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="t-status">Status</Label>
                  <select
                    id="t-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusDaTarefa })}
                    className="h-9 rounded-md border bg-background px-2 text-sm sm:w-48"
                  >
                    {(Object.keys(STATUS_DEFS.tarefa) as StatusDaTarefa[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_DEFS.tarefa[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {podeEditar ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="t-desc">
                    Parte ou observação <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea id="t-desc" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
              ) : null}
              {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              {poderes.distribui ? (
                <Button variant="ghost" className="text-danger-strong hover:text-danger-strong" onClick={() => setEtapa('excluir')}>
                  <Trash2 className="size-4" /> Excluir
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={salvar} disabled={editar.isPending}>
                  {editar.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
