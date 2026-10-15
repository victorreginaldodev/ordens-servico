import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclePause, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDarCiencia } from '../hooks';
import type { MotivoCiencia } from '../services';

export interface ServicoParaCiencia {
  id: number;
  catalogo: string | null;
  cliente: string;
  diasSemMovimentacao: number;
  ordemServicoId?: number;
  responsaveis?: string[];
  prazo?: string | null;
}

/** O motivo no botão: a pergunta já diz "esperando". */
const MOTIVO_CURTO: Record<MotivoCiencia, string> = {
  cliente: 'Cliente',
  documentacao: 'Documentação',
  agendamento: 'Agendamento',
  terceiro: 'Terceiro',
  outro: 'Outro',
};

/** Dias que a pausa explicada silencia o aviso (`DIAS_ALERTA_SEM_MOVIMENTACAO` no backend). */
const DIAS_DE_SILENCIO = 7;

const somarDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Explicar a pausa (ADR 0008, 3; fluxos-e-navegacao.md §6.2.8). Um serviço aberto que fica 7 dias sem nenhuma
 * mudança aparece para o setor. O modal mostra as duas saídas: se o trabalho andou, atualizar a tarefa (o aviso
 * some na hora); se está esperando algo, dizer o quê (o motivo é obrigatório; "outro" pede a observação). A
 * pausa explicada silencia o aviso por 7 dias e o setor vê o motivo. O prazo continua contando.
 */
export function CienciaModal({
  servico,
  onClose,
  onAtualizarTarefa,
}: {
  servico: ServicoParaCiencia | null;
  onClose: () => void;
  /** "O trabalho andou": sem ela, abre o detalhe do serviço, onde as tarefas são atualizadas. */
  onAtualizarTarefa?: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const ciencia = useDarCiencia();
  const [motivo, setMotivo] = useState<MotivoCiencia | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (servico) {
      setMotivo(null);
      setObservacao('');
      setErro('');
    }
  }, [servico]);

  const atualizarTarefa = () => {
    if (!servico) return;
    onClose();
    if (onAtualizarTarefa) onAtualizarTarefa();
    else navigate(`/servicos/${servico.id}#tarefas`);
  };

  const registrar = () => {
    if (!servico) return;
    if (!motivo) return setErro('Escolha o que o serviço está esperando.');
    if (motivo === 'outro' && !observacao.trim()) return setErro('Em "Outro", conte o que o serviço está esperando.');
    ciencia.mutate(
      { servicoId: servico.id, payload: { motivo, observacao: observacao.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Pausa explicada', description: `${servico.catalogo ?? 'Serviço'}: o aviso volta em ${formatDate(somarDias(DIAS_DE_SILENCIO))} se nada mudar.` });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível registrar. Tente de novo.')),
      },
    );
  };

  const dias = servico?.diasSemMovimentacao ?? 0;
  const contexto = [
    servico?.cliente,
    servico?.ordemServicoId ? `OS ${servico.ordemServicoId}` : null,
    servico?.responsaveis?.length ? servico.responsaveis.join(', ') : null,
    servico?.prazo ? `prazo ${formatDate(servico.prazo)}` : null,
  ].filter(Boolean);

  return (
    <Dialog open={!!servico} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {servico?.catalogo ?? 'Serviço'} está sem andamento há {dias} dia{dias === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>{contexto.join(' · ')}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Serviços abertos que ficam 7 dias sem nenhuma mudança nas tarefas aparecem para quem organiza o setor. O que está acontecendo?
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
              <Play className="size-4" aria-hidden /> O trabalho andou
            </h3>
            <p className="flex-1 text-sm text-muted-foreground">Atualize a tarefa: iniciar, concluir ou mudar o prazo. O aviso some na hora.</p>
            <Button variant="outline" className="justify-self-start" onClick={atualizarTarefa}>
              Atualizar a tarefa
            </Button>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border-2 border-primary/40 p-4">
            <div>
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <CirclePause className="size-4" aria-hidden /> Está esperando algo
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">Diga o quê. O aviso fica em silêncio por 7 dias e o setor vê o motivo.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>O que o serviço está esperando?</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Motivo da pausa">
                {(Object.keys(MOTIVO_CURTO) as MotivoCiencia[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={motivo === m}
                    variant={motivo === m ? 'default' : 'outline'}
                    onClick={() => {
                      setMotivo(m);
                      setErro('');
                    }}
                  >
                    {MOTIVO_CURTO[m]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ciencia-obs">
                Observação{' '}
                <span className={cn('font-normal', motivo === 'outro' ? 'text-foreground' : 'text-muted-foreground')}>
                  {motivo === 'outro' ? '(obrigatória em "Outro")' : '(opcional)'}
                </span>
              </Label>
              <Textarea
                id="ciencia-obs"
                rows={2}
                placeholder="Ex.: cliente vai enviar a planta até sexta"
                value={observacao}
                onChange={(e) => {
                  setObservacao(e.target.value);
                  setErro('');
                }}
              />
            </div>
          </section>
        </div>

        {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Volta a avisar em {formatDate(somarDias(DIAS_DE_SILENCIO))} se nada mudar. O prazo continua contando.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={registrar} disabled={ciencia.isPending}>
              {ciencia.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Registrar motivo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
