import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, ClipboardCopy, History, Receipt, SearchX, Wrench } from 'lucide-react';
import { EmptyState, PageHeader, SituacaoFinanceiraBadge, StatusBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { statusDoErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Dados } from '../components/DadosDoLancamento';
import { FaturarOperacionalModal, RegraEAvisos } from '../components/FaturarOperacionalModal';
import { camposDoCliente, camposDoQueCobrar } from '../operacional';
import { OrigemDaCobranca } from '../components/OrigemDaCobranca';
import { useSituacaoFinanceiraOperacional } from '../hooks';

function Bloco({ titulo, icone: Icone, children, acao, className }: { titulo: string; icone: typeof Wrench; children: React.ReactNode; acao?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Icone className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {acao ? <div className="ml-auto">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * Resumo para faturar a OS operacional (`/cobrancas/operacionais/:id`, `GET /api/financeiro/operacionais/{id}/`;
 * wireframe `lote7-cobrancas-oso.html`, aprovado em 19/10/2026): a regra de cobrança, o cliente e o que cobrar (com
 * copiar), o lançamento, a execução e o histórico.
 */
export default function SituacaoFinanceiraOperacionalPage() {
  const id = Number(useParams().id) || undefined;
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const q = useSituacaoFinanceiraOperacional(id);
  const [faturar, setFaturar] = useState<number | null>(null);

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    const nao = statusDoErro(q.error) === 404;
    return (
      <EmptyState
        icon={nao ? SearchX : AlertTriangle}
        title={nao ? 'OS operacional não encontrada' : 'Não foi possível carregar o resumo para faturar'}
        description={nao ? 'Ela não existe ou foi excluída.' : 'Verifique a conexão e tente de novo.'}
        action={
          <Button variant="outline" asChild>
            <Link to="/cobrancas">Ir para Cobranças</Link>
          </Button>
        }
      />
    );
  }

  const s = q.data;
  const copiar = async (rotulo: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: `${rotulo} copiado`, description: texto });
    } catch {
      toast({ title: 'Não foi possível copiar', description: texto });
    }
  };
  const cliente = camposDoCliente(s);
  const queCobrar = camposDoQueCobrar(s);
  const copiarTudo = () =>
    copiar(
      'Dados do lançamento',
      [
        `OS operacional ${s.ordem_servico_operacional_id}`,
        ...[...cliente, ...queCobrar.slice(1)].filter((c) => c.valor).map((c) => `${c.rotulo}: ${c.valor}`),
        ...(s.descricao ? [`Descrição: ${s.descricao}`] : []),
      ].join('\n'),
    );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={s.cliente_nome.toLocaleUpperCase('pt-BR')}
        description={`OS operacional ${s.ordem_servico_operacional_id} · ${s.catalogo_operacional_nome.toLocaleUpperCase('pt-BR')}${s.quantidade > 1 ? ` × ${s.quantidade}` : ''}`}
        backTo="/cobrancas"
        actions={
          s.situacao === 'a_faturar' && pode('financeiro.registrar_cobranca') ? (
            <Button onClick={() => setFaturar(s.ordem_servico_operacional_id)}>
              <Receipt className="size-4" /> Faturar
            </Button>
          ) : null
        }
      />
      <div className="-mt-2 mb-4 flex flex-wrap gap-2">
        <OrigemDaCobranca origem="oso" />
        <SituacaoFinanceiraBadge value={s.situacao} />
      </div>

      <RegraEAvisos s={s} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Bloco
            titulo="Para lançar no sistema financeiro"
            icone={Building2}
            acao={
              <Button size="sm" variant="outline" onClick={copiarTudo}>
                <ClipboardCopy className="size-4" /> Copiar tudo
              </Button>
            }
          >
            <Dados campos={cliente} onCopiar={copiar} />
          </Bloco>
          <Bloco titulo="O que cobrar" icone={Wrench} acao={<StatusBadge entity="oso" value={s.status} />}>
            <Dados campos={queCobrar} onCopiar={copiar} />
            <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-sm">
              <span className="block text-xs text-muted-foreground">Descrição</span>
              {s.descricao ? <span className="whitespace-pre-line">{s.descricao}</span> : <span className="text-muted-foreground">Sem descrição</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">A OS operacional não tem valor no sistema: o valor é definido no lançamento.</p>
          </Bloco>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Bloco titulo="Lançamento" icone={Receipt}>
            {s.situacao === 'faturadas' ? (
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Referência</dt>
                <dd>{s.referencia_lancamento || <span className="font-medium text-warning-strong">Não informada</span>}</dd>
                <dt className="text-muted-foreground">Data</dt>
                <dd className="tabular-nums">{s.data_cobranca ? formatDate(s.data_cobranca) : '—'}</dd>
                <dt className="text-muted-foreground">Por</dt>
                <dd>{s.cobranca_realizada_por_nome ?? '—'}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {s.liberada_para_cobranca_em
                  ? `Liberada, aguardando o lançamento${s.dias_aguardando_lancamento ? ` há ${plural(s.dias_aguardando_lancamento, 'dia', 'dias')}` : ''}.`
                  : 'Só pode ser lançada depois de finalizada.'}
              </p>
            )}
          </Bloco>
          <Bloco titulo="Histórico" icone={History}>
            <ol className="grid">
              {s.historico.map((m, i) => (
                <li key={`${m.tipo}-${i}`} className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-dashed py-2 text-sm last:border-0">
                  <span className="tabular-nums text-muted-foreground">{m.quando ? formatDate(m.quando) : '—'}</span>
                  <span>
                    {m.descricao}
                    {m.pessoa_nome ? <span className="block text-xs text-muted-foreground">{m.pessoa_nome}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Bloco>
        </aside>
      </div>

      <FaturarOperacionalModal id={faturar} onClose={() => setFaturar(null)} />
    </div>
  );
}
