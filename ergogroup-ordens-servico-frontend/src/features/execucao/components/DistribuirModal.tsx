import { useEffect, useState } from 'react';
import { CalendarX, Loader2, Plus, Split, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getIniciais } from '@/lib/format';
import { mensagemDeErro } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDistribuir, useEquipe } from '../hooks';
import type { MembroDaEquipe } from '../services';

export interface ServicoParaDistribuir {
  id: number;
  catalogo: string | null;
  cliente: string;
  ordemServicoId: number;
  setorId: number;
  setorNome?: string | null;
  /** Serviço que já tem tarefa: o modal acrescenta mais gente ("Dividir"). */
  jaDistribuido?: boolean;
}

interface Parte {
  responsavel: number | null;
  prazo: string;
  rapido: number | null;
  descricao: string;
}

const PARTE_VAZIA: Parte = { responsavel: null, prazo: '', rapido: null, descricao: '' };
const somaDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Carga({ m }: { m: MembroDaEquipe }) {
  return (
    <span className="ml-auto flex shrink-0 gap-1 text-xs tabular-nums">
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
        {m.ativos} ativo{m.ativos === 1 ? '' : 's'}
      </span>
      {m.atrasados ? (
        <span className="rounded-md bg-danger-subtle px-1.5 py-0.5 text-danger-strong">
          {m.atrasados} atrasado{m.atrasados === 1 ? '' : 's'}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Distribuir (ou dividir) um serviço: responsável e prazo; "Dividir entre pessoas" cria uma tarefa por
 * parte. Só membros do setor aparecem (`equipe/` com `membro_do_setor`). Um modal só, sem empilhar.
 */
export function DistribuirModal({
  servico,
  responsavelInicial,
  onClose,
}: {
  servico: ServicoParaDistribuir | null;
  responsavelInicial?: number | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: equipe, isLoading } = useEquipe(servico?.setorId);
  const distribuir = useDistribuir();
  const [partes, setPartes] = useState<Parte[]>([PARTE_VAZIA]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (servico) {
      setPartes([{ ...PARTE_VAZIA, responsavel: responsavelInicial ?? null }]);
      setErro('');
    }
  }, [servico, responsavelInicial]);

  const membros = (equipe ?? []).filter((m) => m.membro_do_setor);
  const dividir = partes.length > 1;
  const muda = (i: number, p: Partial<Parte>) => {
    setPartes((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));
    setErro('');
  };

  const confirmar = () => {
    if (!servico) return;
    if (partes.some((p) => !p.responsavel)) return setErro(dividir ? 'Escolha o responsável de cada parte.' : 'Escolha quem vai executar.');
    distribuir.mutate(
      {
        servicoId: servico.id,
        payload: {
          tarefas: partes.map((p) => ({ responsavel: p.responsavel!, prazo: p.prazo || null, descricao: p.descricao.trim() || null })),
        },
      },
      {
        onSuccess: () => {
          const nomes = partes.map((p) => membros.find((m) => m.usuario_id === p.responsavel)?.nome).filter(Boolean);
          toast({ title: `${servico.catalogo ?? 'Serviço'} distribuído`, description: nomes.join(', ') });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível distribuir. Tente de novo.')),
      },
    );
  };

  return (
    <Dialog open={!!servico} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {servico?.jaDistribuido || dividir ? 'Dividir' : 'Distribuir'} {servico?.catalogo ?? 'serviço'}
          </DialogTitle>
          <DialogDescription>
            {servico?.cliente} · OS {servico?.ordemServicoId}
            {servico?.setorNome ? ` · ${servico.setorNome}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : !dividir ? (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Responsável</Label>
              <div role="listbox" aria-label="Membros do setor" className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border p-1">
                {membros.map((m) => {
                  const on = partes[0].responsavel === m.usuario_id;
                  return (
                    <button
                      key={m.usuario_id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => muda(0, { responsavel: m.usuario_id })}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        on ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted',
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-2xs font-bold text-primary">
                        {getIniciais(m.nome)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{m.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">{m.funcao}</span>
                      </span>
                      <Carga m={m} />
                    </button>
                  );
                })}
                {!membros.length ? <p className="p-3 text-sm text-muted-foreground">Ninguém vinculado a este setor.</p> : null}
              </div>
              <span className="text-xs text-muted-foreground">Só membros do setor recebem o serviço. A carga ao lado ajuda a escolher.</span>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dist-prazo">Prazo</Label>
              <div className="flex flex-wrap gap-1.5">
                {[7, 15, 30].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={partes[0].rapido === n ? 'default' : 'outline'}
                    onClick={() => muda(0, { rapido: n, prazo: somaDias(n) })}
                  >
                    Em {n} dias
                  </Button>
                ))}
                <Button type="button" size="sm" variant={partes[0].rapido === 0 ? 'default' : 'outline'} onClick={() => muda(0, { rapido: 0, prazo: '' })}>
                  Sem prazo
                </Button>
              </div>
              <Input id="dist-prazo" type="date" value={partes[0].prazo} onChange={(e) => muda(0, { prazo: e.target.value, rapido: null })} className="sm:w-48" />
              {partes[0].rapido === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-warning-strong">
                  <CalendarX className="size-3.5" aria-hidden />
                  Sem prazo é permitido, mas o serviço aparece como "Sem prazo" no painel.
                </span>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dist-obs">
                Observação para quem vai executar <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea id="dist-obs" rows={2} value={partes[0].descricao} onChange={(e) => muda(0, { descricao: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setPartes((ps) => [...ps, { ...PARTE_VAZIA, prazo: ps[0].prazo }])}>
              <Split className="size-4" /> Dividir entre pessoas
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Cada parte vira uma tarefa com responsável e prazo próprios. O prazo do serviço passa a ser o maior entre elas.
            </p>
            {partes.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_9.5rem_1fr_auto] sm:items-end">
                <div className="grid gap-1">
                  <Label htmlFor={`p-r-${i}`} className="text-xs">
                    Responsável
                  </Label>
                  <select
                    id={`p-r-${i}`}
                    value={p.responsavel ?? ''}
                    onChange={(e) => muda(i, { responsavel: e.target.value ? Number(e.target.value) : null })}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">Escolha</option>
                    {membros.map((m) => (
                      <option key={m.usuario_id} value={m.usuario_id}>
                        {m.nome} ({m.ativos} ativo{m.ativos === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`p-p-${i}`} className="text-xs">
                    Prazo
                  </Label>
                  <Input id={`p-p-${i}`} type="date" className="h-9" value={p.prazo} onChange={(e) => muda(i, { prazo: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`p-d-${i}`} className="text-xs">
                    Parte
                  </Label>
                  <Input id={`p-d-${i}`} className="h-9" placeholder="Ex.: medições, relatório" value={p.descricao} onChange={(e) => muda(i, { descricao: e.target.value })} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remover parte" onClick={() => setPartes((ps) => ps.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setPartes((ps) => [...ps, { ...PARTE_VAZIA, prazo: ps[0].prazo }])}>
              <Plus className="size-4" /> Mais uma pessoa
            </Button>
          </div>
        )}

        {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">{dividir ? `${partes.length} tarefas` : 'Cria uma tarefa para o serviço inteiro'}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={distribuir.isPending}>
              {distribuir.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {dividir ? 'Distribuir partes' : 'Distribuir'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
