import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, CheckCheck, CircleDashed, ClipboardCopy, Copy, FileText, Handshake, ListChecks, Loader2, Receipt, TriangleAlert, Zap } from 'lucide-react';
import { EtapaBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FORMA_PAGAMENTO_LABEL, rotuloDasDemais, rotuloDoVencimento } from '@/features/vendas/condicao';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatCurrency, formatDate, formatDocumento, formatTelefone } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRegistrarLancamento, useSituacaoFinanceira } from '../hooks';
import type { SituacaoFinanceira } from '../services';

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const curta = (data: string | null | undefined) => (data ? formatDate(data)?.slice(0, 5) : null);

interface Campo {
  rotulo: string;
  valor: string | null | undefined;
  copiar?: boolean;
  forte?: boolean;
}

function Secao({ titulo, icone: Icone, acao, children }: { titulo: string; icone: typeof Building2; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icone className="size-4 text-muted-foreground" aria-hidden />
        {titulo}
        {acao ? <span className="ml-auto">{acao}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** Os dados em duas colunas, com copiar nos que entram no lançamento. */
function Dados({ campos, onCopiar }: { campos: Campo[]; onCopiar: (rotulo: string, valor: string) => void }) {
  return (
    <dl className="grid gap-x-6 md:grid-cols-2">
      {campos.map((c) => (
        <div key={c.rotulo} className="grid min-w-0 grid-cols-[9.5rem_minmax(0,1fr)_1.75rem] items-center gap-2 border-b border-dashed py-1.5 text-sm">
          <dt className="text-muted-foreground">{c.rotulo}</dt>
          <dd className={cn('truncate', c.forte && 'font-semibold tabular-nums')} title={c.valor ?? undefined}>
            {c.valor || <span className="text-muted-foreground">Não informado</span>}
          </dd>
          <dd>
            {c.copiar && c.valor ? (
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Copiar ${c.rotulo.toLowerCase()}`} onClick={() => onCopiar(c.rotulo, c.valor!)}>
                <Copy className="size-3.5" />
              </Button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Por que a OS está liberada (pela regra: na venda ou na conclusão) e os avisos da conferência. */
function Liberacao({ s }: { s: SituacaoFinanceira }) {
  const ativos = s.servicos.filter((sv) => sv.etapa !== 'cancelado');
  const concluidos = ativos.filter((sv) => sv.etapa === 'concluido');
  const ultimo = [...concluidos].sort((a, b) => (b.data_termino ?? '').localeCompare(a.data_termino ?? ''))[0];
  return (
    <div className="grid gap-2">
      {s.liberar_em === 'venda' ? (
        <p className="flex gap-2.5 rounded-lg bg-warning-subtle px-3 py-2.5 text-sm text-warning-strong">
          <Zap className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <b>Liberação na venda:</b> liberada em {formatDate(s.liberada_para_cobranca_em)}
            {s.liberada_para_cobranca_por_nome ? ` por ${s.liberada_para_cobranca_por_nome}` : ''}.
            {s.pendentes.length ? ' Pode faturar antes de os serviços terminarem.' : ''}
            <span className="block">Andamento: {concluidos.length} de {ativos.length} serviços concluídos.</span>
          </span>
        </p>
      ) : s.liberada_para_cobranca_em ? (
        <p className="flex gap-2.5 rounded-lg bg-success-subtle px-3 py-2.5 text-sm text-success-strong">
          <CheckCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <b>Liberada em {formatDate(s.liberada_para_cobranca_em)},</b> quando o último serviço foi concluído
            {ultimo?.terminado_por_nome ? ` (por ${ultimo.terminado_por_nome})` : ''}.
            <span className="block">
              {plural(ativos.length, 'serviço concluído', 'serviços concluídos')}
              {s.dias_aguardando_lancamento ? ` · aguardando o lançamento há ${plural(s.dias_aguardando_lancamento, 'dia', 'dias')}` : ''}.
            </span>
          </span>
        </p>
      ) : (
        <p className="flex gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
          <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden /> Ainda não liberada.
        </p>
      )}
      {s.detalhe_pendencias.map((p) => (
        <p key={`${p.codigo}-${p.servico_id ?? ''}`} className={cn('flex gap-2.5 rounded-lg px-3 py-2.5 text-sm', p.tipo === 'garantia' || p.codigo.startsWith('mudou') ? 'bg-danger-subtle text-danger-strong' : 'bg-warning-subtle text-warning-strong')}>
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
 * "Faturar" em duas etapas (faturamento/04, seção 9; wireframe `lote6-faturar.html`, aprovado em 14/10/2026):
 * 1. **Conferir todos os dados**: liberação e avisos, cliente, venda, condição de pagamento e os serviços realizados
 *    com quem executou e quem finalizou. Copiar em cada dado do lançamento;
 * 2. **Registrar o lançamento**: nota fiscal ou referência (opcional) e data (padrão: hoje).
 * Carrega o resumo para faturar (`GET /api/financeiro/ordens/{id}/`); o backend recusa (400) se a OS não estiver liberada.
 */
export function FaturarModal({ ordemId, onClose }: { ordemId: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const q = useSituacaoFinanceira(ordemId ?? undefined);
  const registrar = useRegistrarLancamento();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [referencia, setReferencia] = useState('');
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (ordemId) {
      setEtapa(1);
      setReferencia('');
      setData(hoje());
      setErro('');
    }
  }, [ordemId]);

  const s = q.data && q.data.ordem_servico_id === ordemId ? q.data : undefined;

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
      { ordemId: s.ordem_servico_id, payload: { referencia_lancamento: referencia.trim() || null, data_cobranca: data } },
      {
        onSuccess: () => {
          toast({ title: `OS ${s.ordem_servico_id} faturada`, description: `${s.cliente_nome}${referencia.trim() ? ` · ${referencia.trim()}` : ''}` });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível registrar. Tente de novo.')),
      },
    );
  };

  const c = s?.cliente;
  const documento = c ? formatDocumento(c.tipo_inscricao, c.numero_inscricao, { withLabel: false }) : null;
  const parcela = s && s.tipo_condicao === 'parcelado' && s.quantidade_parcelas ? Number(s.valor) / s.quantidade_parcelas : null;
  const camposCliente: Campo[] = c
    ? [
        { rotulo: 'Razão social', valor: c.nome, copiar: true, forte: true },
        { rotulo: c.tipo_inscricao_display ?? 'Inscrição', valor: documento, copiar: true },
        { rotulo: 'Tipo de cliente', valor: c.tipo_cliente_display },
        { rotulo: 'Representante', valor: c.nome_representante, copiar: true },
        { rotulo: 'Setor do representante', valor: c.setor_representante },
        { rotulo: 'E-mail', valor: c.email_representante, copiar: true },
        { rotulo: 'Telefone', valor: formatTelefone(c.contato_representante), copiar: true },
        { rotulo: 'Situação', valor: c.ativo ? 'Ativo' : 'Inativo' },
      ]
    : [];
  const camposVenda: Campo[] = s
    ? [
        { rotulo: 'OS', valor: String(s.ordem_servico_id), copiar: true, forte: true },
        { rotulo: 'Data da venda', valor: formatDate(s.data_venda) },
        { rotulo: 'Vendido por', valor: s.vendido_por_nome },
        { rotulo: 'Liberada em', valor: s.liberada_para_cobranca_em ? `${formatDate(s.liberada_para_cobranca_em)} · ${s.liberar_em === 'venda' ? 'na venda' : 'serviços concluídos'}` : null },
      ]
    : [];
  const camposCondicao: Campo[] = s
    ? [
        { rotulo: 'Valor total', valor: formatCurrency(s.valor), copiar: true, forte: true },
        { rotulo: 'Tipo', valor: s.tipo_condicao === 'parcelado' ? 'Parcelado' : 'À vista' },
        ...(parcela ? [{ rotulo: 'Parcelas', valor: `${s.quantidade_parcelas} × ${formatCurrency(parcela)} (mensais)`, copiar: true }] : []),
        { rotulo: s.tipo_condicao === 'parcelado' ? 'Vencimento da 1ª' : 'Vencimento', valor: rotuloDoVencimento(s), copiar: true },
        ...(s.tipo_condicao === 'parcelado' ? [{ rotulo: 'Demais parcelas', valor: rotuloDasDemais(s.dia_vencimento_demais) ?? 'No mesmo dia do mês da 1ª' }] : []),
        { rotulo: 'Forma', valor: FORMA_PAGAMENTO_LABEL[s.forma_pagamento] },
        { rotulo: 'Enviar NF para', valor: s.nome_contato_envio_nf, copiar: true },
        { rotulo: 'E-mail da NF', valor: s.contato_envio_nf, copiar: true },
      ]
    : [];
  const copiarTudo = () =>
    s &&
    copiar(
      'Dados do lançamento',
      [
        `OS ${s.ordem_servico_id}`,
        ...[...camposCliente, ...camposCondicao].filter((f) => f.valor).map((f) => `${f.rotulo}: ${f.valor}`),
        `Condição: ${s.condicao_resumo}`,
        ...(s.observacao ? [`Observações: ${s.observacao}`] : []),
      ].join('\n'),
    );

  const ativos = s?.servicos.filter((sv) => sv.etapa !== 'cancelado') ?? [];
  const concluidos = ativos.filter((sv) => sv.etapa === 'concluido').length;

  return (
    <Dialog open={!!ordemId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            Faturar a OS {ordemId}
            {s ? ` · ${s.cliente_nome}` : ''}
          </DialogTitle>
          <DialogDescription>
            <span className={cn(etapa === 1 && 'font-medium text-primary')}>1. Conferir todos os dados</span>
            {' › '}
            <span className={cn(etapa === 2 && 'font-medium text-primary')}>2. Registrar o lançamento</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {q.isLoading || (!s && !q.isError) ? (
            <div className="grid gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : q.isError || !s ? (
            <p className="flex items-center gap-2 text-sm text-danger-strong">
              <AlertTriangle className="size-4" /> Não foi possível carregar os dados da venda. Feche e tente de novo.
            </p>
          ) : etapa === 1 ? (
            <div className="grid gap-5">
              <Liberacao s={s} />

              <Secao titulo="Cliente" icone={Building2}>
                <Dados campos={camposCliente} onCopiar={copiar} />
                {c?.observacao ? (
                  <p className="rounded-lg border border-dashed px-3 py-2 text-sm">
                    <span className="font-medium">Observação do cliente:</span> {c.observacao}
                  </p>
                ) : null}
              </Secao>

              <Secao titulo="Venda" icone={Handshake}>
                <Dados campos={camposVenda} onCopiar={copiar} />
              </Secao>

              <Secao
                titulo="Condição de pagamento"
                icone={FileText}
                acao={
                  <Button size="sm" variant="outline" onClick={copiarTudo}>
                    <ClipboardCopy className="size-4" /> Copiar tudo
                  </Button>
                }
              >
                <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
                  <span className="block text-xs text-muted-foreground">Condição combinada</span>
                  <span className="font-semibold">{s.condicao_resumo}</span>
                </div>
                <Dados campos={camposCondicao} onCopiar={copiar} />
                {s.observacao ? (
                  <div className="rounded-lg border border-warning/40 bg-warning-subtle/60 px-3 py-2 text-sm">
                    <p className="mb-0.5 text-xs font-semibold text-warning-strong">Observações de pagamento e faturamento</p>
                    <p className="whitespace-pre-line">{s.observacao}</p>
                  </div>
                ) : null}
              </Secao>

              <Secao titulo="Serviços realizados" icone={ListChecks} acao={<span className="text-xs font-medium text-muted-foreground">{concluidos} de {ativos.length} concluídos</span>}>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[52rem] text-sm">
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
                      {s.servicos.map((sv) => {
                        const cancelado = sv.etapa === 'cancelado';
                        const tarefas = sv.responsaveis.filter((r) => r.status !== 'cancelada' || cancelado);
                        return (
                          <tr key={sv.id} className={cn('border-b align-top last:border-0', cancelado && 'text-muted-foreground')}>
                            <td className="min-w-64 px-3 py-2.5">
                              <span className={cn('block font-semibold uppercase', cancelado && 'line-through')}>{sv.catalogo_nome || sv.descricao}</span>
                              {sv.catalogo_nome && sv.descricao !== sv.catalogo_nome ? (
                                <span className="line-clamp-2 text-xs text-muted-foreground" title={sv.descricao}>
                                  {sv.descricao}
                                </span>
                              ) : null}
                              {cancelado ? <span className="block text-xs">Não entra na liberação</span> : null}
                            </td>
                            <td className="border-l border-border/70 px-3 py-2.5">{sv.setor_nome ?? '—'}</td>
                            <td className="border-l border-border/70 px-3 py-2.5">
                              {tarefas.length ? (
                                tarefas.map((r, i) => (
                                  <span key={i} className="block whitespace-nowrap">
                                    {r.nome ?? '—'}
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                      {r.data_inicio ? curta(r.data_inicio) : 'não iniciou'}
                                      {r.data_termino ? ` → ${curta(r.data_termino)}` : r.data_inicio ? ' → em andamento' : ''}
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className={cancelado ? 'text-muted-foreground' : 'font-medium text-warning-strong'}>{cancelado ? '—' : 'Sem distribuir'}</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap border-l border-border/70 px-3 py-2.5 tabular-nums">{sv.data_inicio ? formatDate(sv.data_inicio) : '—'}</td>
                            <td className="whitespace-nowrap border-l border-border/70 px-3 py-2.5 tabular-nums">{sv.data_termino ? formatDate(sv.data_termino) : '—'}</td>
                            <td className="border-l border-border/70 px-3 py-2.5">{sv.terminado_por_nome ?? <span className="text-muted-foreground">—</span>}</td>
                            <td className="border-l border-border/70 px-3 py-2.5">
                              <EtapaBadge value={sv.etapa} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Secao>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
                {[
                  ['Cliente', s.cliente.nome],
                  [s.cliente.tipo_inscricao_display ?? 'Inscrição', documento ?? 'Não informado'],
                  ['Valor', formatCurrency(s.valor)],
                  ['Condição', s.condicao_resumo],
                ].map(([rotulo, valor]) => (
                  <span key={rotulo}>
                    <span className="block text-xs text-muted-foreground">{rotulo}</span>
                    <span className="font-semibold">{valor}</span>
                  </span>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-ref">
                  Número da nota fiscal ou referência do lançamento <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="l-ref" autoFocus maxLength={100} placeholder="Ex.: NF 4567" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                <span className="text-xs text-muted-foreground">O número gerado no sistema financeiro. Ajuda a encontrar o lançamento depois.</span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-data">Data do lançamento</Label>
                <Input id="l-data" type="date" className="sm:w-48" value={data} onChange={(e) => { setData(e.target.value); setErro(''); }} />
              </div>
              {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
            </div>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          {etapa === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => setEtapa(2)} disabled={!s}>
                Está tudo certo, continuar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtapa(1)}>
                <ArrowLeft className="size-4" /> Voltar
              </Button>
              <Button onClick={confirmar} disabled={registrar.isPending}>
                {registrar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
                Registrar lançamento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
