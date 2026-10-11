import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CircleCheck, Clock, FileDown, Loader2, MoreHorizontal, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { AndamentoServicos, CondicaoPagamento, EmptyState, EtapaBadge, PageHeader, PrioridadeIndicator, StatusBadge } from '@/components/kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { LinhaDoTempo } from '@/features/linha-do-tempo/components/LinhaDoTempo';
import { useLinhaDoTempoDaOS } from '@/features/linha-do-tempo/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AcrescentarServicoModal } from '../components/AcrescentarServicoModal';
import { FORMA_PAGAMENTO_LABEL, LIBERAR_EM_LABEL } from '../condicao';
import { useExcluirVenda, useResumoDaVenda } from '../hooks';
import type { ResumoDaVenda } from '../services';

function Bloco({ titulo, children, className, acao }: { titulo: string; children: React.ReactNode; className?: string; acao?: React.ReactNode }) {
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
const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{rotulo}</dt>
    <dd className="mt-0.5 text-sm">{children}</dd>
  </div>
);

const dataHora = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('pt-BR') : null);

/** Gera o PDF sob demanda: o @react-pdf é pesado e só carrega quando alguém pede. */
async function baixarPdf(venda: ResumoDaVenda, geradoPor: string) {
  const [{ pdf }, { ResumoDaVendaPdf }] = await Promise.all([import('@react-pdf/renderer'), import('../components/ResumoDaVendaPdf')]);
  const blob = await pdf(<ResumoDaVendaPdf venda={venda} geradoPor={geradoPor} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OS-${venda.id}-${venda.cliente_nome.replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Resumo da venda (`/vendas/:id`, fluxos-e-navegacao.md §6.6): para responder ao cliente "como está meu serviço?".
 * Condição e financeiro só aparecem para quem vê valores (a API manda nulo para os demais).
 */
export default function ResumoDaVendaPage() {
  const id = Number(useParams().id) || undefined;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { displayName } = useCurrentUser();
  const { pode, podeAlguma } = usePermissoes();
  const resumo = useResumoDaVenda(id);
  const linha = useLinhaDoTempoDaOS(id);
  const excluir = useExcluirVenda();
  const [acrescentar, setAcrescentar] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  if (resumo.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (resumo.isError || !resumo.data) {
    const nao = statusDoErro(resumo.error) === 404;
    return (
      <EmptyState
        icon={nao ? SearchX : AlertTriangle}
        title={nao ? 'Venda não encontrada' : 'Não foi possível carregar a venda'}
        description={nao ? 'Ela não existe ou não está visível para você.' : 'Verifique a conexão e tente de novo.'}
        action={
          <Button variant="outline" asChild>
            <Link to="/vendas">Ir para Vendas</Link>
          </Button>
        }
      />
    );
  }

  const v = resumo.data;
  const c = v.condicoes;
  const f = v.financeiro;
  const gerencia = pode('os.gerenciar');
  const abreServicos = podeAlguma(['os.ver_todas', 'servicos.ver_setor']);

  const pdf = async () => {
    setGerandoPdf(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      await baixarPdf(v, displayName);
    } catch {
      toast({ title: 'Não foi possível gerar o PDF', description: 'Tente de novo.', variant: 'destructive' });
    } finally {
      setGerandoPdf(false);
    }
  };
  const confirmarExcluir = () =>
    excluir.mutate(v.id, {
      onSuccess: () => {
        toast({ title: `OS ${v.id} excluída`, description: v.cliente_nome });
        navigate('/vendas', { replace: true });
      },
      onError: (e) => {
        setConfirmarExclusao(false);
        toast({ title: 'Não foi possível excluir', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' });
      },
    });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`OS ${v.id} · ${v.cliente_nome}`}
        description={`Vendida em ${formatDate(v.data_venda)}${v.vendido_por_nome ? ` por ${v.vendido_por_nome}` : ''}`}
        backTo="/vendas"
        actions={
          <>
            <Button variant="outline" onClick={pdf} disabled={gerandoPdf}>
              {gerandoPdf ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              PDF
            </Button>
            {gerencia ? (
              <Button variant="outline" onClick={() => setAcrescentar(true)}>
                <Plus className="size-4" /> Acrescentar serviço
              </Button>
            ) : null}
            {gerencia ? (
              <Button asChild>
                <Link to={`/vendas/${v.id}/editar`}>
                  <Pencil className="size-4" /> Editar venda
                </Link>
              </Button>
            ) : null}
            {pode('os.excluir') ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais ações">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-danger-strong focus:text-danger-strong" onSelect={() => setConfirmarExclusao(true)}>
                    <Trash2 className="mr-2 size-4" /> Excluir venda
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />

      <section className="mb-4 rounded-xl border bg-card p-4 shadow-sm" aria-label="Situação da venda">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Campo rotulo="Status">
            <StatusBadge entity="os" value={v.status} />
          </Campo>
          <Campo rotulo="Andamento">
            <AndamentoServicos andamento={v.andamento} />
          </Campo>
          <Campo rotulo="Prioridade">
            <PrioridadeIndicator value={v.prioridade} />
          </Campo>
          <Campo rotulo="Registrada em">{dataHora(v.criada_em)}</Campo>
        </dl>
        {v.observacao ? <p className="mt-3 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm">{v.observacao}</p> : null}
      </section>

      <Bloco titulo="Serviços" className="mb-4" acao={<span className="text-xs text-muted-foreground">{v.servicos.length} serviço{v.servicos.length === 1 ? '' : 's'}</span>}>
        {v.servicos.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 text-left">Serviço</th>
                  <th className="border-l border-border/70 px-3 text-left">Setor</th>
                  <th className="border-l border-border/70 px-3 text-left">Etapa</th>
                  <th className="border-l border-border/70 px-3 text-left">Com quem</th>
                  <th className="border-l border-border/70 px-3 text-left">Prazo</th>
                  <th className="border-l border-border/70 px-3 text-left">Concluído</th>
                </tr>
              </thead>
              <tbody>
                {v.servicos.map((s) => (
                  <tr
                    key={s.id}
                    onClick={abreServicos ? () => navigate(`/servicos/${s.id}`) : undefined}
                    className={cn('border-b last:border-0 align-top', abreServicos && 'cursor-pointer hover:bg-muted/40')}
                  >
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold">{s.catalogo_nome ?? 'Serviço'}</span>
                      <span className="block text-xs text-muted-foreground">{s.descricao}</span>
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5">{s.setor_nome ?? '—'}</td>
                    <td className="border-l border-border/70 px-3 py-2.5">
                      <EtapaBadge value={s.etapa} />
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5">
                      {s.responsaveis.length ? (
                        <ul className="grid gap-1">
                          {s.responsaveis.map((r, i) => (
                            <li key={i}>
                              <span>{r.nome}</span>
                              <span className="block text-xs text-muted-foreground">
                                {r.data_termino ? `concluiu em ${formatDate(r.data_termino)}` : r.data_inicio ? `começou em ${formatDate(r.data_inicio)}` : 'ainda não começou'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">{s.etapa === 'na_fila' ? 'Na fila do setor' : '—'}</span>
                      )}
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5 tabular-nums">{formatDate(s.prazo) ?? <span className="text-muted-foreground">Sem prazo</span>}</td>
                    <td className="border-l border-border/70 px-3 py-2.5">
                      {s.data_termino ? (
                        <>
                          <span className="tabular-nums">{formatDate(s.data_termino)}</span>
                          {s.terminado_por_nome ? <span className="block text-xs text-muted-foreground">{s.terminado_por_nome}</span> : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Esta venda ainda não tem serviços.{gerencia ? ' Use “Acrescentar serviço”.' : ''}</p>
        )}
      </Bloco>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-4">
          {c ? (
            <Bloco titulo="Condição de pagamento">
              <CondicaoPagamento tipo={c.tipo_condicao} resumo={c.condicao_resumo} />
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <Campo rotulo="Valor total">
                  <span className="font-semibold tabular-nums">{formatCurrency(c.valor)}</span>
                </Campo>
                {c.valor_mensal ? <Campo rotulo="Valor mensal">{formatCurrency(c.valor_mensal)}</Campo> : null}
                <Campo rotulo="Forma">{FORMA_PAGAMENTO_LABEL[c.forma_pagamento]}</Campo>
                <Campo rotulo="Libera para o financeiro">{LIBERAR_EM_LABEL[c.liberar_em]}</Campo>
                <Campo rotulo="Contato da NF">{[c.nome_contato_envio_nf, c.contato_envio_nf].filter(Boolean).join(' · ') || '—'}</Campo>
              </dl>
            </Bloco>
          ) : null}
          {f ? (
            <Bloco titulo="Financeiro">
              <ul className="grid gap-3 text-sm">
                <li className="flex gap-2.5">
                  {f.liberada_para_cobranca ? <CircleCheck className="mt-0.5 size-4 text-success-strong" /> : <Clock className="mt-0.5 size-4 text-muted-foreground" />}
                  <span>
                    {f.liberada_para_cobranca ? 'Liberada para o financeiro' : 'Ainda não liberada'}
                    <span className="block text-xs text-muted-foreground">
                      {f.liberada_para_cobranca
                        ? `${dataHora(f.liberada_para_cobranca_em)}${f.liberada_para_cobranca_por_nome ? ` · ${f.liberada_para_cobranca_por_nome}` : ''}`
                        : c?.liberar_em === 'venda'
                          ? 'Libera na venda.'
                          : 'Libera quando todos os serviços terminarem.'}
                    </span>
                  </span>
                </li>
                <li className="flex gap-2.5">
                  {f.cobranca_realizada ? <CircleCheck className="mt-0.5 size-4 text-success-strong" /> : <Clock className="mt-0.5 size-4 text-muted-foreground" />}
                  <span>
                    {f.cobranca_realizada ? 'Lançada no sistema de cobrança' : 'Ainda não lançada'}
                    {f.cobranca_realizada ? (
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(f.data_cobranca)}
                        {f.referencia_lancamento ? ` · ${f.referencia_lancamento}` : ''}
                        {f.cobranca_realizada_por_nome ? ` · ${f.cobranca_realizada_por_nome}` : ''}
                      </span>
                    ) : null}
                  </span>
                </li>
              </ul>
            </Bloco>
          ) : null}
          {!c && !f ? (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">Condição de pagamento e financeiro aparecem só para quem vê valores.</p>
          ) : null}
        </div>
        <Bloco titulo="Linha do tempo da venda">
          <LinhaDoTempo eventos={linha.data} carregando={linha.isLoading} />
          {linha.isError ? <p className="text-sm text-muted-foreground">Não foi possível carregar a linha do tempo.</p> : null}
        </Bloco>
      </div>

      <AcrescentarServicoModal venda={acrescentar ? { id: v.id, cliente: v.cliente_nome } : null} onClose={() => setAcrescentar(false)} />
      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a OS {v.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda de {v.cliente_nome} sai do sistema junto com os {v.servicos.length} serviço{v.servicos.length === 1 ? '' : 's'} e as tarefas dela. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-danger-foreground hover:bg-danger/90" onClick={(e) => { e.preventDefault(); confirmarExcluir(); }} disabled={excluir.isPending}>
              {excluir.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Excluir venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
