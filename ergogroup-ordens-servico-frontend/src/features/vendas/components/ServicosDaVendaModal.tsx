import { useEffect, useMemo, useState } from 'react';
import { Check, CircleCheck, Info, Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Prioridade } from '../services';
import { SeletorBusca } from './SeletorBusca';

export interface ServicoDoCatalogo {
  id: number;
  nome: string;
  setorNome: string | null;
}

/** Um serviço vendido: o item do catálogo, o que será feito e, se diferente da venda, a prioridade. */
export interface ServicoEscolhido {
  catalogo: number;
  descricao: string;
  prioridade: Prioridade | '';
}

const PRIORIDADES: Record<Prioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const VAZIO = { catalogo: null as number | null, descricao: '', prioridade: '' as Prioridade | '' };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Serviços da venda num modal (fluxos-e-navegacao.md §6.5, revisto em 14/10/2026): escolhe o serviço, diz o que
 * será feito e "Adicionar à OS"; o modal continua aberto para o próximo e mostra o que já entrou. Com `editando`,
 * altera um serviço só.
 */
export function ServicosDaVendaModal({
  aberto,
  onFechar,
  catalogos,
  carregando,
  prioridadeDaVenda,
  naVenda,
  editando,
  onAdicionar,
  onSalvar,
}: {
  aberto: boolean;
  onFechar: () => void;
  catalogos: ServicoDoCatalogo[];
  carregando?: boolean;
  prioridadeDaVenda: Prioridade;
  /** Os serviços que já estão na venda (para a lista do modal e o aviso de repetido). */
  naVenda: ServicoEscolhido[];
  editando?: ServicoEscolhido | null;
  onAdicionar: (servico: ServicoEscolhido) => void;
  onSalvar: (servico: ServicoEscolhido) => void;
}) {
  const [s, setS] = useState(VAZIO);
  const [tentou, setTentou] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [avisoRascunho, setAvisoRascunho] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setS(editando ? { ...editando } : VAZIO);
    setTentou(false);
    setUltimo(null);
    setAvisoRascunho(false);
  }, [aberto, editando]);

  // Lista única do catálogo, em ordem alfabética, com o setor na frente (pedido do usuário em 14/10/2026).
  const opcoes = useMemo(
    () =>
      [...catalogos]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((c) => ({ valor: c.id, rotulo: c.nome, prefixo: c.setorNome ?? 'Sem setor' })),
    [catalogos],
  );
  const nome = (id: number) => catalogos.find((c) => c.id === id)?.nome ?? 'Serviço';
  const repetido = !!s.catalogo && s.catalogo !== editando?.catalogo && naVenda.some((x) => x.catalogo === s.catalogo);
  const temRascunho = !editando && (s.catalogo !== null || !!s.descricao.trim());
  const faltaCatalogo = tentou && !s.catalogo;
  const faltaDescricao = tentou && !s.descricao.trim();

  const valido = () => {
    if (s.catalogo && s.descricao.trim()) return true;
    setTentou(true);
    document.getElementById(!s.catalogo ? 'svc-catalogo' : 'svc-descricao')?.focus();
    return false;
  };
  const servico = (): ServicoEscolhido => ({ catalogo: s.catalogo!, descricao: s.descricao.trim(), prioridade: s.prioridade });

  const adicionar = () => {
    if (!valido()) return;
    onAdicionar(servico());
    setUltimo(nome(s.catalogo!));
    setS(VAZIO);
    setTentou(false);
    setAvisoRascunho(false);
    window.setTimeout(() => document.getElementById('svc-catalogo')?.focus(), 0);
  };
  const concluir = () => {
    if (editando) {
      if (valido()) onSalvar(servico());
      return;
    }
    // Algo preenchido e não adicionado: não some sem a pessoa decidir.
    if (temRascunho && !avisoRascunho) {
      setAvisoRascunho(true);
      return;
    }
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>{editando ? 'Editar serviço' : 'Adicionar serviços'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Altere o serviço, o que será feito ou a prioridade.'
              : 'Escolha o serviço, diga o que será feito e adicione. Repita para cada serviço vendido.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5">
          {ultimo ? (
            <p className="flex items-center gap-2 rounded-md bg-success-subtle px-3 py-2 text-sm text-success-strong" role="status">
              <CircleCheck className="size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold uppercase">{ultimo}</span> adicionado. Escolha o próximo ou conclua.
              </span>
            </p>
          ) : null}

          {/* Serviço e prioridade na mesma linha, alinhados pelo topo; avisos ficam numa linha própria abaixo. */}
          <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="svc-catalogo">Serviço</Label>
              <SeletorBusca
                id="svc-catalogo"
                opcoes={opcoes}
                valor={s.catalogo}
                onChange={(catalogo) => setS((x) => ({ ...x, catalogo }))}
                placeholder="Busque pelo nome ou pelo setor"
                vazio="Nenhum serviço ativo no catálogo com esse nome."
                invalido={faltaCatalogo}
                carregando={carregando}
                caixaAlta
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-prioridade">Prioridade</Label>
              <select
                id="svc-prioridade"
                value={s.prioridade}
                onChange={(e) => setS((x) => ({ ...x, prioridade: e.target.value as Prioridade | '' }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Da venda ({PRIORIDADES[prioridadeDaVenda]})</option>
                {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORIDADES[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {faltaCatalogo ? <span className="-mt-2 text-xs text-danger-strong">Escolha o serviço no catálogo.</span> : null}
          {repetido ? (
            <p className="-mt-1 flex items-center gap-2 text-xs text-warning-strong">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden /> Este serviço já está na venda. Pode adicionar de novo (ex.: outra unidade).
            </p>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="svc-descricao">O que será feito</Label>
            <Textarea
              id="svc-descricao"
              rows={3}
              placeholder="Ex.: fábrica e depósito, 40 colaboradores, visita na semana de 20/10"
              value={s.descricao}
              aria-invalid={faltaDescricao || undefined}
              className={cn(faltaDescricao && 'border-danger')}
              onChange={(e) => setS((x) => ({ ...x, descricao: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (editando ? concluir : adicionar)();
              }}
            />
            {faltaDescricao ? (
              <span className="text-xs text-danger-strong">Descreva o serviço: local, escopo, quantidade.</span>
            ) : (
              <span className="flex gap-1 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                É o que o setor lê para executar: local, escopo, quantidade, contato no cliente. Não coloque valores aqui.
              </span>
            )}
          </div>

          {!editando && naVenda.length ? (
            <div className="grid gap-1.5 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground">Na venda ({naVenda.length})</p>
              <ul className="flex flex-wrap gap-1.5">
                {naVenda.map((x, i) => (
                  <li key={`${x.catalogo}-${i}`} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs font-medium uppercase">
                    <Check className="size-3 text-success-strong" aria-hidden />
                    {nome(x.catalogo)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {avisoRascunho ? (
            <p className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              Há um serviço preenchido que ainda não foi adicionado.
              <span className="ml-auto flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={onFechar}>
                  Descartar e fechar
                </Button>
                <Button type="button" size="sm" onClick={() => { if (valido()) { onAdicionar(servico()); onFechar(); } }}>
                  Adicionar e fechar
                </Button>
              </span>
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center gap-2 border-t px-6 py-3 sm:justify-between sm:space-x-0">
          <span className="text-xs text-muted-foreground">{editando ? '' : plural(naVenda.length, 'serviço na venda', 'serviços na venda')}</span>
          <div className="flex gap-2">
            {editando ? (
              <>
                <Button type="button" variant="ghost" onClick={onFechar}>
                  Cancelar
                </Button>
                <Button type="button" onClick={concluir}>
                  <Check className="size-4" /> Salvar
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={concluir}>
                  Concluir
                </Button>
                <Button type="button" onClick={adicionar}>
                  <Plus className="size-4" /> Adicionar à OS
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
