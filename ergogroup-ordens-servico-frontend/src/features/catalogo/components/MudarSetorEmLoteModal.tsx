import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { AtivoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { useSetores } from '@/features/organizacao/hooks';
import { useMudarSetorDosCatalogos } from '../hooks';
import type { CatalogoItem } from '../services';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Mudar o setor de vários serviços do catálogo de uma vez (revisão de permissões, P5): escolhe o setor de origem,
 * marca os serviços (a busca ajuda a pegar, por exemplo, todos os "ERGONOMIA - …"), escolhe o destino e decide se
 * os serviços em aberto e sem tarefas vão junto.
 */
export function MudarSetorEmLoteModal({
  aberto,
  onFechar,
  catalogos,
}: {
  aberto: boolean;
  onFechar: () => void;
  catalogos: CatalogoItem[];
}) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-2xl">{aberto && <Conteudo catalogos={catalogos} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  );
}

function Conteudo({ catalogos, onFechar }: { catalogos: CatalogoItem[]; onFechar: () => void }) {
  const { toast } = useToast();
  const { data: setores = [] } = useSetores();
  const mudar = useMudarSetorDosCatalogos();

  const setoresDeOrigem = useMemo(
    () => setores.filter((s) => catalogos.some((c) => c.setor === s.id)),
    [setores, catalogos],
  );
  const [origem, setOrigem] = useState<string>(() => (setoresDeOrigem[0] ? String(setoresDeOrigem[0].id) : ''));
  const [destino, setDestino] = useState('');
  const [busca, setBusca] = useState('');
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [mover, setMover] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const doSetor = catalogos.filter((c) => String(c.setor) === origem);
  const visiveis = doSetor.filter((c) => !busca || normalizar(c.nome).includes(normalizar(busca)));
  const selecionados = doSetor.filter((c) => marcados.has(c.id));
  const servicosEmAberto = selecionados.reduce((total, c) => total + c.servicosEmAberto, 0);
  const setorDestino = setores.find((s) => String(s.id) === destino);
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((c) => marcados.has(c.id));

  const alternar = (id: number, marcar: boolean) =>
    setMarcados((atual) => {
      const nova = new Set(atual);
      if (marcar) nova.add(id);
      else nova.delete(id);
      return nova;
    });
  const alternarVisiveis = () =>
    setMarcados((atual) => {
      const nova = new Set(atual);
      visiveis.forEach((c) => (todosVisiveisMarcados ? nova.delete(c.id) : nova.add(c.id)));
      return nova;
    });

  const confirmar = () => {
    setErro(null);
    mudar.mutate(
      { catalogos: selecionados.map((c) => c.id), setor: Number(destino), mover_servicos_em_aberto: mover && servicosEmAberto > 0 },
      {
        onSuccess: (r) => {
          const movidos = r.servicos_movidos ? ` ${plural(r.servicos_movidos, 'serviço em aberto foi junto', 'serviços em aberto foram junto')}.` : '';
          toast({
            title: `${plural(r.catalogos_alterados, 'serviço passou', 'serviços passaram')} para ${setorDestino?.nome}`,
            description: [movidos.trim(), ...r.avisos].filter(Boolean).join(' ') || undefined,
            duration: r.avisos.length ? 12_000 : undefined,
          });
          onFechar();
        },
        onError: (error) => setErro(mensagemDeErro(error, 'Não foi possível mudar o setor.')),
      },
    );
  };

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle>Mudar o setor de vários serviços</DialogTitle>
        <DialogDescription>
          O setor do catálogo decide em que fila cai o serviço vendido. Os serviços já distribuídos, em andamento ou concluídos
          continuam no setor antigo.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-2">
          <Label>De</Label>
          <Select
            value={origem}
            onValueChange={(v) => {
              setOrigem(v);
              setMarcados(new Set());
              setBusca('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Setor atual" />
            </SelectTrigger>
            <SelectContent>
              {setoresDeOrigem.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ArrowRight className="mb-2.5 hidden size-4 text-muted-foreground sm:block" aria-hidden />
        <div className="space-y-2">
          <Label>Para</Label>
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger>
              <SelectValue placeholder="Novo setor" />
            </SelectTrigger>
            <SelectContent>
              {setores
                .filter((s) => s.ativo && String(s.id) !== origem)
                .map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nome}
                    {s.recebem_tarefas === 0 ? ' (ninguém recebe tarefas)' : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar pelo nome (ex.: ERGONOMIA)" className="pl-8" />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={alternarVisiveis} disabled={!visiveis.length}>
            {todosVisiveisMarcados ? 'Desmarcar' : 'Marcar'} {busca ? 'os filtrados' : 'todos'}
          </Button>
        </div>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
          {visiveis.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                <Checkbox checked={marcados.has(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} />
                <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                {c.servicosEmAberto > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">{plural(c.servicosEmAberto, 'em aberto', 'em aberto')}</span>
                )}
                {!c.ativo && <AtivoBadge ativo={false} />}
              </label>
            </li>
          ))}
          {!visiveis.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum serviço encontrado.</li>}
        </ul>
        <p className="text-xs text-muted-foreground">{plural(selecionados.length, 'serviço marcado', 'serviços marcados')}</p>
      </div>

      {servicosEmAberto > 0 && (
        <label className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
          <Checkbox className="mt-0.5" checked={mover} onCheckedChange={(v) => setMover(v === true)} />
          <span>
            Mover também {servicosEmAberto === 1 ? 'o serviço em aberto' : `os ${servicosEmAberto} serviços em aberto`} (novos ou a
            distribuir){setorDestino ? ` para ${setorDestino.nome}` : ''}. Eles voltam a "novo" e o setor recebe o aviso de chegada.
          </span>
        </label>
      )}

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={!selecionados.length || !destino || mudar.isPending}>
          {mudar.isPending ? 'Mudando…' : `Mudar ${plural(selecionados.length, 'serviço', 'serviços')}`}
        </Button>
      </DialogFooter>
    </>
  );
}
