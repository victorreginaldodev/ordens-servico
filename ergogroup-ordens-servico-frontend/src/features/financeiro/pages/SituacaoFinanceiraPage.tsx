import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCheck, CircleDashed, ClipboardCopy, Copy, FileText, Handshake, History, ListChecks, Receipt, SearchX, TriangleAlert, Zap } from 'lucide-react';
import { AndamentoServicos, EmptyState, EtapaBadge, PageHeader, PessoaChip, SituacaoFinanceiraBadge, TipoCondicaoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LinhaDoTempo } from '@/features/linha-do-tempo/components/LinhaDoTempo';
import { FORMA_PAGAMENTO_LABEL, rotuloDasDemais, rotuloDoVencimento } from '@/features/vendas/condicao';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { statusDoErro } from '@/lib/api-errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FaturarModal } from '../components/FaturarModal';
import { useSituacaoFinanceira } from '../hooks';
import type { ServicoRealizado, SituacaoFinanceira } from '../services';

function Bloco({ titulo, icone: Icone, children, acao, className }: { titulo: string; icone: typeof FileText; children: React.ReactNode; acao?: React.ReactNode; className?: string }) {
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
const nomeDoServico = (s: { catalogo_nome?: string | null; descricao: string }) => s.catalogo_nome || s.descricao;

/**
 * Faixa no topo: por que a OS está (ou não) liberada para faturar, pela regra da liberação (faturamento/04).
 * Na venda = liberação imediata; na conclusão = quando o último serviço terminou; senão, o que falta.
 */
function FaixaDaLiberacao({ s }: { s: SituacaoFinanceira }) {
  const ativos = s.servicos.filter((sv) => sv.etapa !== 'cancelado');
  const concluidos = ativos.filter((sv) => sv.etapa === 'concluido');
  const ultimo = [...concluidos].sort((a, b) => (b.data_termino ?? '').localeCompare(a.data_termino ?? ''))[0];
  if (!s.liberada_para_cobranca_em) {
    const falta = s.pendentes[0];
    return (
      <Faixa tom="neutral" icone={CircleDashed} titulo="Ainda não liberada.">
        Libera quando {ativos.length === 1 ? 'o serviço terminar' : `os ${ativos.length} serviços terminarem`}: {concluidos.length} de {ativos.length} concluídos.
        {falta ? (
          <span className="block">
            Falta {s.pendentes.length > 1 ? `${s.pendentes.length}, entre eles ` : ''}
            <b>{falta.servico_nome}</b> (
            {[
              falta.setor_nome,
              falta.responsaveis.length ? `com ${falta.responsaveis.join(', ')}` : 'sem distribuir',
              falta.dias_sem_movimentacao ? `sem andamento há ${plural(falta.dias_sem_movimentacao, 'dia', 'dias')}` : null,
            ]
              .filter(Boolean)
              .join(', ')}
            ).
          </span>
        ) : null}
      </Faixa>
    );
  }
  if (s.liberar_em === 'venda') {
    return (
      <Faixa tom="warning" icone={Zap} titulo="Liberação na venda:">
        liberada em {formatDate(s.liberada_para_cobranca_em)}
        {s.liberada_para_cobranca_por_nome ? ` por ${s.liberada_para_cobranca_por_nome}` : ''}.
        {s.pendentes.length ? ' Pode faturar antes de os serviços terminarem.' : ''}
        <span className="block">
          {s.pendentes.length
            ? `Andamento: ${concluidos.length} de ${ativos.length} serviços concluídos · falta ${s.pendentes.map((p) => p.servico_nome).join(', ')}.`
            : `${plural(ativos.length, 'serviço concluído', 'serviços concluídos')}.`}
        </span>
      </Faixa>
    );
  }
  return (
    <Faixa tom="success" icone={CheckCheck} titulo={`Liberada em ${formatDate(s.liberada_para_cobranca_em)},`}>
      quando o último serviço foi concluído
      {ultimo ? ` (${nomeDoServico(ultimo)}${ultimo.terminado_por_nome ? `, por ${ultimo.terminado_por_nome}` : ''})` : ''}.
      <span className="block">{plural(ativos.length, 'serviço concluído', 'serviços concluídos')}.</span>
    </Faixa>
  );
}

const TOM = {
  neutral: 'bg-muted text-foreground',
  warning: 'bg-warning-subtle text-warning-strong',
  success: 'bg-success-subtle text-success-strong',
  danger: 'bg-danger-subtle text-danger-strong',
};
function Faixa({ tom, icone: Icone, titulo, children }: { tom: keyof typeof TOM; icone: typeof Zap; titulo: string; children: React.ReactNode }) {
  return (
    <div className={cn('mb-3 flex gap-3 rounded-xl px-4 py-3 text-sm', TOM[tom])}>
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="min-w-0">
        <b>{titulo}</b> {children}
      </p>
    </div>
  );
}

/** Quem executou: os responsáveis das tarefas, nome completo; com mais de um, o primeiro e "+N" (todos no title). */
function Executores({ sv }: { sv: ServicoRealizado }) {
  const nomes = [...new Set(sv.responsaveis.map((r) => r.nome).filter((n): n is string => !!n))];
  if (!nomes.length) return <span className="font-medium text-warning-strong">{sv.etapa === 'cancelado' ? '—' : 'Sem distribuir'}</span>;
  return (
    <span
      className="flex max-w-56 items-center gap-1.5"
      title={sv.responsaveis.map((r) => `${r.nome ?? '—'}: ${r.data_inicio ? formatDate(r.data_inicio) : 'não iniciou'}${r.data_termino ? ` → ${formatDate(r.data_termino)}` : ''}`).join('\n')}
    >
      <PessoaChip nome={nomes[0]} variant="full" className="min-w-0 truncate" />
      {nomes.length > 1 ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{nomes.length - 1}</span> : null}
    </span>
  );
}

/**
 * Resumo para faturar (`/cobrancas/:id`, `GET /api/financeiro/ordens/{id}/`; faturamento/04): tudo o que o
 * financeiro precisa para faturar a OS num lugar só: por que está liberada, o que lançar (com copiar), os serviços
 * realizados com quem executou e quem finalizou, as pendências da conferência e o histórico.
 */
export default function SituacaoFinanceiraPage() {
  const id = Number(useParams().id) || undefined;
  const { toast } = useToast();
  const { pode, podeAlguma } = usePermissoes();
  const q = useSituacaoFinanceira(id);
  const [faturar, setFaturar] = useState<number | null>(null);
  const [historico, setHistorico] = useState<'financeiro' | 'tudo'>('financeiro');

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
        title={nao ? 'Venda não encontrada' : 'Não foi possível carregar o resumo para faturar'}
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
  const parcela = s.tipo_condicao === 'parcelado' && s.quantidade_parcelas ? Number(s.valor) / s.quantidade_parcelas : null;
  const vencimento = rotuloDoVencimento(s);
  const campos: { rotulo: string; valor: string | null; copiavel?: boolean; destaque?: boolean }[] = [
    { rotulo: 'Valor total', valor: formatCurrency(s.valor), copiavel: true, destaque: true },
    ...(parcela ? [{ rotulo: 'Parcelas', valor: `${s.quantidade_parcelas} × ${formatCurrency(parcela)} (mensais)`, copiavel: true }] : []),
    { rotulo: s.tipo_condicao === 'parcelado' ? 'Vencimento da 1ª' : 'Vencimento', valor: vencimento, copiavel: true },
    ...(s.tipo_condicao === 'parcelado' ? [{ rotulo: 'Demais parcelas', valor: rotuloDasDemais(s.dia_vencimento_demais) ?? 'No mesmo dia do mês da 1ª' }] : []),
    { rotulo: 'Forma', valor: FORMA_PAGAMENTO_LABEL[s.forma_pagamento] },
    { rotulo: 'Enviar NF para', valor: s.nome_contato_envio_nf || null, copiavel: true },
    { rotulo: 'E-mail da NF', valor: s.contato_envio_nf || null, copiavel: true },
  ];
  const copiarTudo = () =>
    copiar(
      'Resumo',
      [`OS ${s.ordem_servico_id} · ${s.cliente_nome}`, `Condição: ${s.condicao_resumo}`, ...campos.filter((c) => c.valor).map((c) => `${c.rotulo}: ${c.valor}`), ...(s.observacao ? [`Observações: ${s.observacao}`] : [])].join('\n'),
    );
  const eventos = historico === 'tudo' ? s.eventos : s.eventos.filter((e) => e.categoria === 'financeiro');
  const atencoes = s.detalhe_pendencias;

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
              <Button onClick={() => setFaturar(s.ordem_servico_id)}>
                <Receipt className="size-4" /> Faturar
              </Button>
            ) : null}
          </>
        }
      />
      <div className="-mt-2 mb-4 flex flex-wrap gap-2">
        <SituacaoFinanceiraBadge value={s.situacao} />
      </div>

      <FaixaDaLiberacao s={s} />
      {atencoes.map((p) => (
        <Faixa key={`${p.codigo}-${p.servico_id ?? ''}`} tom={p.tipo === 'garantia' ? 'danger' : 'warning'} icone={TriangleAlert} titulo={`${p.titulo}:`}>
          {p.detalhe}.<span className="block opacity-80">{p.explicacao}</span>
        </Faixa>
      ))}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Bloco
            titulo="Para lançar no sistema financeiro"
            icone={FileText}
            acao={
              <Button size="sm" variant="outline" onClick={copiarTudo}>
                <ClipboardCopy className="size-4" /> Copiar tudo
              </Button>
            }
          >
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <TipoCondicaoBadge value={s.tipo_condicao} />
              <span>
                <span className="block text-xs text-muted-foreground">Condição combinada</span>
                <span className="font-semibold">{s.condicao_resumo}</span>
              </span>
            </div>
            <dl className="grid grid-cols-[10rem_1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm">
              {campos.map((c) => (
                <div key={c.rotulo} className="contents">
                  <dt className="text-muted-foreground">{c.rotulo}</dt>
                  <dd className={cn('min-w-0 truncate', c.destaque && 'font-semibold tabular-nums')}>{c.valor ?? <span className="text-muted-foreground">Não informado</span>}</dd>
                  <dd>
                    {c.copiavel && c.valor ? (
                      <Button variant="ghost" size="icon" className="size-7" aria-label={`Copiar ${c.rotulo.toLowerCase()}`} onClick={() => copiar(c.rotulo, c.valor!)}>
                        <Copy className="size-3.5" />
                      </Button>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            {s.observacao ? (
              <div className="mt-4 rounded-lg border border-warning/40 bg-warning-subtle/60 px-3 py-2 text-sm">
                <p className="mb-1 text-xs font-semibold text-warning-strong">Observações de pagamento e faturamento</p>
                <p className="whitespace-pre-line">{s.observacao}</p>
              </div>
            ) : null}
          </Bloco>

        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Bloco titulo="Lançamento" icone={Receipt}>
            {s.data_cobranca ? (
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Referência</dt>
                <dd>{s.referencia_lancamento || '—'}</dd>
                <dt className="text-muted-foreground">Data</dt>
                <dd className="tabular-nums">{formatDate(s.data_cobranca)}</dd>
                <dt className="text-muted-foreground">Por</dt>
                <dd>{s.cobranca_realizada_por_nome ?? '—'}</dd>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>{s.origem_lancamento === 'integracao' ? 'Integração' : 'Manual'}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {s.liberada_para_cobranca_em
                  ? `Liberada, aguardando o lançamento${s.dias_aguardando_lancamento ? ` há ${plural(s.dias_aguardando_lancamento, 'dia', 'dias')}` : ''}.`
                  : 'Só pode ser lançada depois de liberada.'}
              </p>
            )}
          </Bloco>
          <Bloco
            titulo="Histórico"
            icone={History}
            acao={
              <span className="inline-flex rounded-md border p-0.5 text-xs" role="group" aria-label="Eventos do histórico">
                {(['financeiro', 'tudo'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={historico === v}
                    onClick={() => setHistorico(v)}
                    className={cn('rounded px-2 py-0.5 font-medium', historico === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {v === 'financeiro' ? 'Financeiro' : 'Tudo'}
                  </button>
                ))}
              </span>
            }
          >
            <LinhaDoTempo eventos={eventos} />
          </Bloco>
        </aside>
      </div>

      <Bloco className="mt-4" titulo="Serviços realizados" icone={ListChecks} acao={<AndamentoServicos andamento={s.andamento} />}>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {['Serviço', 'Setor', 'Executado por', 'Início', 'Término', 'Finalizado por', 'Etapa'].map((h, i) => (
                  <th key={h} className={cn('whitespace-nowrap px-3 text-left', i > 0 && 'border-l border-border/70')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.servicos.map((sv) => (
                <tr key={sv.id} className={cn('border-b last:border-b-0', sv.etapa === 'cancelado' && 'text-muted-foreground')}>
                  <td className="px-3 py-2.5">
                    <span className={cn('block max-w-60 truncate font-semibold uppercase', sv.etapa === 'cancelado' && 'line-through')} title={[sv.catalogo_nome, sv.descricao].filter(Boolean).join(' — ')}>
                      {nomeDoServico(sv)}
                    </span>
                    {sv.etapa === 'cancelado' ? <span className="text-xs">Não entra na liberação</span> : null}
                  </td>
                  <td className="border-l border-border/70 whitespace-nowrap px-3 py-2.5">{sv.setor_nome ?? '—'}</td>
                  <td className="border-l border-border/70 px-3 py-2.5">
                    <Executores sv={sv} />
                  </td>
                  <td className="border-l border-border/70 whitespace-nowrap px-3 py-2.5 tabular-nums">{sv.data_inicio ? formatDate(sv.data_inicio) : '—'}</td>
                  <td className="border-l border-border/70 whitespace-nowrap px-3 py-2.5 tabular-nums">{sv.data_termino ? formatDate(sv.data_termino) : '—'}</td>
                  <td className="border-l border-border/70 px-3 py-2.5">{sv.terminado_por_nome ? <PessoaChip nome={sv.terminado_por_nome} variant="full" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="border-l border-border/70 px-3 py-2.5">
                    <EtapaBadge value={sv.etapa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      <FaturarModal ordemId={faturar} onClose={() => setFaturar(null)} />
    </div>
  );
}
