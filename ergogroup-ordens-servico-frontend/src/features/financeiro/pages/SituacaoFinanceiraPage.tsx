import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlarmClock, AlertTriangle, Copy, FileText, Handshake, Receipt, SearchX, ShoppingCart, Unlock, type LucideIcon } from 'lucide-react';
import { AndamentoServicos, EmptyState, EtapaBadge, PageHeader, SituacaoFinanceiraBadge, TipoCondicaoBadge, TONE_CLASSES, type Tone } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FORMA_PAGAMENTO_LABEL, LIBERAR_EM_LABEL } from '@/features/vendas/condicao';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { statusDoErro } from '@/lib/api-errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { RegistrarLancamentoModal, type OrdemParaLancar } from '../components/RegistrarLancamentoModal';
import { useSituacaoFinanceira } from '../hooks';
import type { EventoFinanceiro } from '../services';

const EVENTO: Record<EventoFinanceiro['tipo'], { icone: LucideIcon; tom: Tone }> = {
  venda: { icone: ShoppingCart, tom: 'info' },
  liberacao: { icone: Unlock, tom: 'warning' },
  lancamento: { icone: Receipt, tom: 'success' },
};

function Bloco({ titulo, children, acao, className }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {acao ? <div className="ml-auto">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
const Linha = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <>
    <dt className="text-muted-foreground">{rotulo}</dt>
    <dd className="min-w-0">{children}</dd>
  </>
);

/**
 * Situação financeira de uma venda (`/cobrancas/:id`, `GET /api/financeiro/ordens/{id}/`):
 * o que lançar no sistema financeiro, a liberação, o lançamento, os serviços e os eventos.
 */
export default function SituacaoFinanceiraPage() {
  const id = Number(useParams().id) || undefined;
  const { toast } = useToast();
  const { pode, podeAlguma } = usePermissoes();
  const q = useSituacaoFinanceira(id);
  const [lancar, setLancar] = useState<OrdemParaLancar | null>(null);

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
        title={nao ? 'Venda não encontrada' : 'Não foi possível carregar a situação financeira'}
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
  const ativos = s.andamento.total - s.andamento.cancelado;
  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: 'E-mail copiado', description: texto });
    } catch {
      toast({ title: 'Não foi possível copiar', description: texto });
    }
  };
  const eventos = [...s.eventos].sort((a, b) => (b.quando ?? '').localeCompare(a.quando ?? ''));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={s.cliente_nome}
        description={`OS ${s.ordem_servico_id} · vendida em ${formatDate(s.data_venda)}${s.vendido_por_nome ? ` por ${s.vendido_por_nome}` : ''}`}
        backTo="/cobrancas"
        actions={
          <>
            {podeAlguma(['os.gerenciar', 'os.ver_todas']) ? (
              <Button variant="outline" asChild>
                <Link to={`/vendas/${s.ordem_servico_id}`}>
                  <Handshake className="size-4" /> Resumo da venda
                </Link>
              </Button>
            ) : null}
            {s.situacao === 'a_faturar' && pode('financeiro.registrar_cobranca') ? (
              <Button onClick={() => setLancar(s)}>
                <Receipt className="size-4" /> Registrar lançamento
              </Button>
            ) : null}
          </>
        }
      />
      <div className="-mt-2 mb-4 flex flex-wrap gap-2">
        <SituacaoFinanceiraBadge value={s.situacao} />
        {s.em_alerta ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2.5 text-xs font-medium text-warning-strong">
            <AlarmClock className="size-3.5" /> Aguardando lançamento há {s.dias_aguardando_lancamento} dias
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-4">
          <Bloco titulo="Para lançar no sistema financeiro" acao={<TipoCondicaoBadge value={s.tipo_condicao} />}>
            <div className="mb-4 flex gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-xs text-muted-foreground">Condição combinada</span>
                <span className="font-semibold">{s.condicao_resumo}</span>
              </span>
            </div>
            <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2.5 text-sm">
              <Linha rotulo="Valor total">
                <span className="font-semibold tabular-nums">{formatCurrency(s.valor)}</span>
              </Linha>
              {s.valor_mensal ? (
                <Linha rotulo="Valor mensal">
                  <span className="tabular-nums">
                    {formatCurrency(s.valor_mensal)}
                    {s.quantidade_parcelas ? ` × ${s.quantidade_parcelas} meses` : ''}
                  </span>
                </Linha>
              ) : s.quantidade_parcelas ? (
                <Linha rotulo="Parcelas">{s.quantidade_parcelas}x</Linha>
              ) : null}
              <Linha rotulo="1º vencimento">{formatDate(s.data_acordada_cobranca) ?? <span className="text-muted-foreground">Não informado</span>}</Linha>
              <Linha rotulo="Forma">{FORMA_PAGAMENTO_LABEL[s.forma_pagamento]}</Linha>
              <Linha rotulo="Enviar NF para">
                {s.contato_envio_nf ? (
                  <span className="flex flex-wrap items-center gap-x-2">
                    {s.nome_contato_envio_nf ? <span>{s.nome_contato_envio_nf}</span> : null}
                    <span className="text-muted-foreground">{s.contato_envio_nf}</span>
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Copiar e-mail" onClick={() => copiar(s.contato_envio_nf)}>
                      <Copy className="size-3.5" />
                    </Button>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </Linha>
            </dl>
            {s.observacao ? <p className="mt-4 whitespace-pre-line rounded-lg border px-3 py-2 text-sm">{s.observacao}</p> : null}
          </Bloco>

          <Bloco titulo="Eventos financeiros" acao={<span className="text-xs text-muted-foreground">Venda, liberação e lançamento</span>}>
            {eventos.length ? (
              <ol className="grid gap-3">
                {eventos.map((e, i) => {
                  const d = EVENTO[e.tipo];
                  return (
                    <li key={i} className="flex gap-3">
                      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', TONE_CLASSES[d.tom].subtle)}>
                        <d.icone className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 text-sm">
                        <span className="block">{e.texto}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(e.quando)}
                          {e.quem ? ` · ${e.quem}` : ''}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
            )}
          </Bloco>
        </div>

        <aside className="grid content-start gap-4">
          <Bloco titulo="Liberação">
            {s.liberada_para_cobranca_em ? (
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                <Linha rotulo="Liberada em">{formatDate(s.liberada_para_cobranca_em)}</Linha>
                <Linha rotulo="Motivo">{s.liberar_em === 'venda' ? 'Na venda' : 'Todos os serviços concluídos'}</Linha>
                {s.liberada_para_cobranca_por_nome ? <Linha rotulo="Por">{s.liberada_para_cobranca_por_nome}</Linha> : null}
              </dl>
            ) : (
              <p className="text-sm">
                <span className="font-medium">Ainda não liberada.</span>{' '}
                <span className="text-muted-foreground">
                  {s.liberar_em === 'venda'
                    ? LIBERAR_EM_LABEL.venda + '.'
                    : `Libera quando ${ativos === 1 ? 'o serviço terminar' : `os ${ativos} serviços terminarem`}: ${s.andamento.concluido} de ${ativos} concluídos.`}
                </span>
              </p>
            )}
          </Bloco>
          <Bloco titulo="Lançamento">
            {s.data_cobranca ? (
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                <Linha rotulo="Referência">{s.referencia_lancamento || '—'}</Linha>
                <Linha rotulo="Data">{formatDate(s.data_cobranca)}</Linha>
                {s.cobranca_realizada_por_nome ? <Linha rotulo="Por">{s.cobranca_realizada_por_nome}</Linha> : null}
                <Linha rotulo="Origem">{s.origem_lancamento === 'integracao' ? 'Integração' : 'Manual'}</Linha>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{s.liberada_para_cobranca_em ? 'Liberada, aguardando lançamento.' : 'Só pode ser lançada depois de liberada.'}</p>
            )}
          </Bloco>
          <Bloco titulo="Serviços" acao={<AndamentoServicos andamento={s.andamento} />}>
            <ul className="divide-y">
              {s.servicos.map((sv) => (
                <li key={sv.id} className="flex items-start gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block">{sv.descricao}</span>
                    {sv.data_termino ? <span className="block text-xs text-muted-foreground">término {formatDate(sv.data_termino)}</span> : null}
                  </span>
                  <EtapaBadge value={sv.etapa} />
                </li>
              ))}
            </ul>
          </Bloco>
        </aside>
      </div>

      <RegistrarLancamentoModal ordem={lancar} onClose={() => setLancar(null)} />
    </div>
  );
}
