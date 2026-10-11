import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MOTIVO_CIENCIA_LABEL } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mensagemDeErro } from '@/lib/api-errors';
import { useToast } from '@/hooks/use-toast';
import { useDarCiencia } from '../hooks';
import type { MotivoCiencia } from '../services';

export interface ServicoParaCiencia {
  id: number;
  catalogo: string | null;
  cliente: string;
  diasSemMovimentacao: number;
}

/** "Estou ciente": silencia o aviso de parado por 7 dias. O prazo continua contando (ADR 0008, 3). */
export function CienciaModal({ servico, onClose }: { servico: ServicoParaCiencia | null; onClose: () => void }) {
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

  const confirmar = () => {
    if (!servico) return;
    ciencia.mutate(
      { servicoId: servico.id, payload: { motivo, observacao: observacao.trim() || null } },
      {
        onSuccess: () => {
          toast({ title: 'Ciência registrada', description: `${servico.catalogo ?? 'Serviço'} · aviso silenciado por 7 dias.` });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível registrar. Tente de novo.')),
      },
    );
  };

  const dias = servico?.diasSemMovimentacao ?? 0;
  return (
    <Dialog open={!!servico} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estou ciente</DialogTitle>
          <DialogDescription>
            {servico?.catalogo} · {servico?.cliente} · sem movimentação há {dias} dia{dias === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>
              Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MOTIVO_CIENCIA_LABEL) as MotivoCiencia[]).map((m) => (
                <Button key={m} type="button" size="sm" variant={motivo === m ? 'default' : 'outline'} onClick={() => setMotivo(motivo === m ? null : m)}>
                  {MOTIVO_CIENCIA_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ciencia-obs">
              Observação <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="ciencia-obs" rows={2} placeholder="Ex.: cliente vai enviar a planta até sexta" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            O aviso fica silenciado por 7 dias. Se o serviço se mover antes, a ciência deixa de valer. <b>O prazo continua contando.</b>
          </p>
          {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={ciencia.isPending}>
            {ciencia.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Registrar ciência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
