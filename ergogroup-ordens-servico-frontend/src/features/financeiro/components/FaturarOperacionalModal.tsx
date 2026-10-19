import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCheck, CircleDashed, Loader2, Receipt, ShieldCheck, TriangleAlert, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRegistrarLancamentoOperacional, useSituacaoFinanceiraOperacional } from '../hooks';
import { hoje } from '../lancamento';
import type { SituacaoFinanceiraOperacional } from '../services';
import { camposDoCliente, camposDoQueCobrar } from '../operacional';
import { Dados, Secao } from './DadosDoLancamento';
import { OrigemDaCobranca } from './OrigemDaCobranca';

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** A regra de cobrança do catálogo (ADR 0011) e os avisos da conferência. */
export function RegraEAvisos({ s }: { s: SituacaoFinanceiraOperacional }) {
  return (
    <div className="grid gap-2">
      <p className="flex gap-2.5 rounded-lg bg-violet-100 px-3 py-2.5 text-sm text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {s.gera_cobranca ? (
            <>
              <b>Gera cobrança pela regra do catálogo:</b> o serviço é cobrável e o cliente não está entre os isentos.
            </>
          ) : (
            <b>Não gera cobrança pela regra do catálogo.</b>
          )}{' '}
          {s.situacao === 'faturadas'
            ? 'A regra não muda mais: a OS operacional já foi faturada.'
            : 'É a regra atual do catálogo; ela vale até a OS operacional ser faturada.'}
        </span>
      </p>
      {s.liberada_para_cobranca_em ? (
        <p className="flex gap-2.5 rounded-lg bg-success-subtle px-3 py-2.5 text-sm text-success-strong">
          <CheckCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <b>Liberada em {formatDate(s.liberada_para_cobranca_em)},</b> quando a OS operacional foi finalizada
            {s.liberada_para_cobranca_por_nome ? ` (por ${s.liberada_para_cobranca_por_nome})` : ''}
            {s.dias_aguardando_lancamento ? ` · aguardando o lançamento há ${plural(s.dias_aguardando_lancamento, 'dia', 'dias')}` : ''}.
          </span>
        </p>
      ) : (
        <p className="flex gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
          <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden /> Ainda não liberada: a OS operacional não foi finalizada.
        </p>
      )}
      {s.detalhe_pendencias.map((p) => (
        <p key={p.codigo} className={cn('flex gap-2.5 rounded-lg px-3 py-2.5 text-sm', p.tipo === 'garantia' ? 'bg-danger-subtle text-danger-strong' : 'bg-warning-subtle text-warning-strong')}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <b>{p.titulo}:</b> {p.detalhe}.
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * "Faturar" da OS operacional (wireframe `lote7-cobrancas-oso.html`, aprovado em 19/10/2026): um modal só, com a
 * regra de cobrança, o cliente e o que cobrar (com copiar) e o lançamento: referência (opcional) e data (padrão:
 * hoje). A OS operacional não tem valor no sistema: o valor é definido no lançamento.
 */
export function FaturarOperacionalModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const q = useSituacaoFinanceiraOperacional(id ?? undefined);
  const registrar = useRegistrarLancamentoOperacional();
  const [referencia, setReferencia] = useState('');
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      setReferencia('');
      setData(hoje());
      setErro('');
    }
  }, [id]);

  const s = q.data && q.data.ordem_servico_operacional_id === id ? q.data : undefined;

  const copiar = async (rotulo: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: `${rotulo} copiado`, description: texto });
    } catch {
      toast({ title: 'Não foi possível copiar', description: texto });
    }
  };

  const confirmar = () => {
    if (!s) return;
    if (!data) return setErro('Informe a data do lançamento.');
    registrar.mutate(
      { id: s.ordem_servico_operacional_id, payload: { referencia_lancamento: referencia.trim() || null, data_cobranca: data } },
      {
        onSuccess: () => {
          toast({
            title: `OS operacional ${s.ordem_servico_operacional_id} faturada`,
            description: `${s.cliente_nome}${referencia.trim() ? ` · ${referencia.trim()}` : ''}`,
          });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível registrar. Tente de novo.')),
      },
    );
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            Faturar a OS operacional {id}
            {s ? ` · ${s.cliente_nome.toLocaleUpperCase('pt-BR')}` : ''}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <OrigemDaCobranca origem="oso" />
            Confira os dados, lance no sistema financeiro e registre o lançamento aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {q.isLoading || (!s && !q.isError) ? (
            <div className="grid gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : q.isError || !s ? (
            <p className="flex items-center gap-2 text-sm text-danger-strong">
              <AlertTriangle className="size-4" /> Não foi possível carregar os dados da OS operacional. Feche e tente de novo.
            </p>
          ) : (
            <div className="grid gap-5">
              <RegraEAvisos s={s} />

              <Secao titulo="Cliente" icone={Building2}>
                <Dados campos={camposDoCliente(s)} onCopiar={copiar} />
                {s.cliente.observacao ? (
                  <p className="rounded-lg border border-dashed px-3 py-2 text-sm">
                    <span className="font-medium">Observação do cliente:</span> {s.cliente.observacao}
                  </p>
                ) : null}
              </Secao>

              <Secao titulo="O que cobrar" icone={Wrench}>
                <Dados campos={camposDoQueCobrar(s)} onCopiar={copiar} />
                <div className="rounded-lg border border-dashed px-3 py-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Descrição</span>
                  {s.descricao ? <span className="whitespace-pre-line">{s.descricao}</span> : <span className="text-muted-foreground">Sem descrição</span>}
                </div>
                <p className="text-xs text-muted-foreground">A OS operacional não tem valor no sistema: o valor é definido no lançamento.</p>
              </Secao>

              <Secao titulo="Lançamento" icone={Receipt}>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <div className="grid gap-1.5">
                    <Label htmlFor="oso-ref">
                      Número da nota fiscal ou referência do lançamento <span className="font-normal text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input id="oso-ref" maxLength={100} placeholder="Ex.: NF 4572" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="oso-data">Data do lançamento</Label>
                    <Input id="oso-data" type="date" value={data} onChange={(e) => { setData(e.target.value); setErro(''); }} />
                  </div>
                </div>
                {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
              </Secao>
            </div>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3 sm:justify-between">
          <Button variant="ghost" asChild disabled={!s}>
            <Link to={`/cobrancas/operacionais/${id}`}>Ver o resumo da OS operacional</Link>
          </Button>
          <span className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={!s || !s.liberada_para_cobranca_em || registrar.isPending}>
              {registrar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
              Registrar lançamento
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
