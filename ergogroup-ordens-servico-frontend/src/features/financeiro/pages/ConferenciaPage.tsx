import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { EmptyState, PageHeader, PessoaChip } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { ChecagemDaConferencia } from '../components/ChecagemDaConferencia';
import { useChecagemDaConferencia } from '../useChecagemDaConferencia';
import { useConferencia, useCorrigirConferencia } from '../hooks';
import type { Verificacao } from '../services';

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Uma verificação: estado (ok, atenção ou falha da garantia), contagem e, aberta, as vendas com o detalhe. */
function CartaoDaVerificacao({ v }: { v: Verificacao }) {
  const [aberto, setAberto] = useState(false);
  const ok = v.quantidade === 0;
  const tom = ok ? 'bg-success-subtle text-success-strong' : v.tipo === 'garantia' ? 'bg-danger-subtle text-danger-strong' : 'bg-warning-subtle text-warning-strong';
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', !ok && 'hover:bg-muted/40')}
        onClick={() => !ok && setAberto((a) => !a)}
        aria-expanded={ok ? undefined : aberto}
        disabled={ok}
      >
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', tom)}>{ok ? <Check className="size-4" /> : <TriangleAlert className="size-4" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{v.titulo}</span>
          <span className="block text-xs text-muted-foreground">{v.explicacao}</span>
        </span>
        <span className={cn('min-w-8 text-right text-xl font-bold tabular-nums', !ok && (v.tipo === 'garantia' ? 'text-danger-strong' : 'text-warning-strong'))}>{v.quantidade}</span>
        {ok ? <span className="size-4" /> : aberto ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {aberto && !ok ? (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {['OS', 'Cliente', 'Serviço', 'Setor', 'Com quem', 'Detalhe', 'Ações'].map((h, i) => (
                  <th key={h} className={cn('whitespace-nowrap px-3 text-left', i > 0 && 'border-l border-border/70', h === 'Ações' && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.itens.map((item, i) => (
                <tr key={`${item.ordem_servico_id}-${item.servico_id ?? i}`} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5 font-semibold tabular-nums">{item.ordem_servico_id}</td>
                  <td className="border-l border-border/70 max-w-72 truncate px-3 py-2.5 font-medium" title={item.cliente_nome}>
                    {item.cliente_nome}
                  </td>
                  <td className="border-l border-border/70 max-w-60 truncate px-3 py-2.5 font-semibold uppercase" title={item.servico_nome ?? undefined}>
                    {item.servico_nome ?? <span className="font-normal normal-case text-muted-foreground">—</span>}
                  </td>
                  <td className="border-l border-border/70 whitespace-nowrap px-3 py-2.5">{item.setor_nome ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="border-l border-border/70 px-3 py-2.5">
                    {item.responsavel_nome ? (
                      <PessoaChip nome={item.responsavel_nome} variant="full" />
                    ) : item.servico_id ? (
                      <span className="whitespace-nowrap font-medium text-warning-strong">Sem distribuir</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="border-l border-border/70 min-w-64 px-3 py-2.5 text-muted-foreground">{item.detalhe}</td>
                  <td className="border-l border-border/70 px-3 py-2.5 text-right">
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <Link to={`/cobrancas/${item.ordem_servico_id}`}>Abrir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Conferência do faturamento (`/cobrancas/conferencia`, faturamento/04): o que o sistema verifica para que nada
 * concluído fique sem cobrança. As garantias mostram o 0 de forma explícita (a confiança vem de ver a regra sendo
 * checada); as atenções dizem com quem está cada pendência. "Corrigir agora" refaz a sincronização das vendas não
 * liberadas, só com o que a regra já manda.
 */
export default function ConferenciaPage() {
  const { toast } = useToast();
  const q = useConferencia();
  const corrigir = useCorrigirConferencia();
  const { refetch } = q;
  // "Verificar de novo" roda a checagem animada: as etapas aparecem uma a uma, com as contagens da resposta.
  const executar = useCallback(() => refetch().then((r) => (r.isError ? undefined : r.data)), [refetch]);
  const checagem = useChecagemDaConferencia(executar);
  const checando = checagem.fase === 'rodando' || checagem.fase === 'erro';

  const executarCorrecao = () =>
    corrigir.mutate(undefined, {
      onSuccess: (r) =>
        toast({
          title: 'Sincronização refeita',
          description: `${plural(r.servicos_corrigidos, 'serviço corrigido', 'serviços corrigidos')} · ${plural(r.ordens_liberadas, 'venda liberada', 'vendas liberadas')}. Tudo fica registrado no histórico.`,
        }),
      onError: (e) => toast({ variant: 'destructive', title: 'Não foi possível corrigir', description: mensagemDeErro(e, 'Tente de novo.') }),
    });

  const dados = q.data;
  const secoes: { titulo: string; itens: Verificacao[] }[] = dados
    ? [
        { titulo: 'Garantias do sistema · devem ser sempre 0', itens: dados.verificacoes.filter((v) => v.tipo === 'garantia') },
        { titulo: 'Em execução · o que pode travar a liberação', itens: dados.verificacoes.filter((v) => v.tipo === 'atencao' && v.situacao === 'previsao') },
        { titulo: 'Para faturar e faturadas', itens: dados.verificacoes.filter((v) => v.tipo === 'atencao' && v.situacao !== 'previsao') },
      ]
    : [];
  const hora = dados ? new Date(dados.verificado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Conferência do faturamento"
        description={`O que o sistema verifica para que nada concluído fique sem cobrança.${hora ? ` Verificado em ${hora}.` : ''}`}
        backTo="/cobrancas"
        actions={
          <>
            <Button variant="outline" onClick={checagem.iniciar} disabled={checando || q.isLoading}>
              {checando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {checando ? 'Verificando…' : 'Verificar de novo'}
            </Button>
            <Button variant="outline" onClick={executarCorrecao} disabled={corrigir.isPending || checando} title="Refaz a sincronização das vendas ainda não liberadas, só com o que a regra já manda.">
              {corrigir.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Corrigir agora
            </Button>
          </>
        }
      />

      <ChecagemDaConferencia
        checagem={checagem}
        titulosAnteriores={(dados?.verificacoes ?? []).map((v) => ({ codigo: v.codigo, titulo: v.titulo }))}
        onFechar={() => checagem.setFase('parado')}
      />

      {checando ? null : q.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : q.isError || !dados ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível carregar a conferência" description="Verifique a conexão e tente de novo." />
      ) : (
        <div key={dados.verificado_em} className="grid gap-6 animate-fade-in">
          {secoes.map((secao) => (
            <div key={secao.titulo} className="grid gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{secao.titulo}</h2>
              {secao.itens.map((v) => (
                <CartaoDaVerificacao key={v.codigo} v={v} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
