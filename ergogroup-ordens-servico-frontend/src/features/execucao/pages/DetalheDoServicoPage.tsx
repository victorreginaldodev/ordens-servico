import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, Hourglass, MailCheck, Pencil, SearchX, Split, UserPlus } from 'lucide-react';
import { AlertaMovimentacao, EmptyState, ETAPA_DEFS, EtapaBadge, PageHeader, PrioridadeIndicator, StatusBadge, TONE_CLASSES } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LinhaDoTempo } from '@/features/linha-do-tempo/components/LinhaDoTempo';
import { useLinhaDoTempoDoServico } from '@/features/linha-do-tempo/hooks';
import { CienciaModal, type ServicoParaCiencia } from '../components/CienciaModal';
import { DistribuirModal, type ServicoParaDistribuir } from '../components/DistribuirModal';
import { Situacoes } from '../components/Situacoes';
import { TarefaModal } from '../components/TarefaModal';
import { useConfirmarRecebimentoDeServicos, useConfirmarRecebimentoDeTarefas, useDetalheDoServico, useEditarTarefa } from '../hooks';
import type { StatusDaTarefa } from '../services';
import type { Esquemas } from '@/api/tipos';

type TarefaDoDetalhe = Esquemas['TarefaDoDetalhe'];

function Bloco({ titulo, children, className, id }: { titulo: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('scroll-mt-4 rounded-xl border bg-card p-4 shadow-sm', className)}>
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

/**
 * Detalhe do serviço (`/servicos/:id`, fluxos-e-navegacao.md §6.3): onde a execução acontece.
 * Sem valores. As ações seguem `pode_distribuir`, `pode_dar_ciencia` e as permissões no setor.
 */
export default function DetalheDoServicoPage() {
  const id = Number(useParams().id) || undefined;
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { pode, podeAlguma } = usePermissoes();
  const detalhe = useDetalheDoServico(id);
  const linha = useLinhaDoTempoDoServico(id);
  const editar = useEditarTarefa();
  const confirmarServico = useConfirmarRecebimentoDeServicos();
  const confirmarTarefa = useConfirmarRecebimentoDeTarefas();
  const [distribuir, setDistribuir] = useState<ServicoParaDistribuir | null>(null);
  const [ciencia, setCiencia] = useState<ServicoParaCiencia | null>(null);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<TarefaDoDetalhe | null>(null);
  const { hash } = useLocation();
  const irParaTarefas = () => document.getElementById('tarefas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Vindo de "Atualizar a tarefa" (modal de explicar a pausa em outra tela), abre já nas tarefas.
  useEffect(() => {
    if (hash === '#tarefas' && detalhe.data) irParaTarefas();
  }, [hash, detalhe.data]);

  if (detalhe.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (detalhe.isError || !detalhe.data) {
    const nao = statusDoErro(detalhe.error) === 404;
    return (
      <EmptyState
        icon={nao ? SearchX : AlertTriangle}
        title={nao ? 'Serviço não encontrado' : 'Não foi possível carregar o serviço'}
        description={nao ? 'Ele não existe ou não está visível para você: quem executa vê os serviços em que tem tarefa.' : 'Verifique a conexão e tente de novo.'}
        action={
          <Button variant="outline" asChild>
            <Link to="/inicio">Ir para a minha tela inicial</Link>
          </Button>
        }
      />
    );
  }

  const s = detalhe.data;
  const os = s.ordem_servico;
  const nome = s.catalogo_nome ?? 'Serviço';
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  // Quem acompanha o setor ou vê todas as OS abre os outros serviços; quem só executa recebe 404 neles.
  const abreOutros = veVendas || pode('servicos.ver_setor');
  const distribui = pode('tarefas.distribuir', s.setor_id);
  const editaSetor = pode('tarefas.editar_setor', s.setor_id);
  const encerrado = s.etapa === 'concluido' || s.etapa === 'cancelado';

  const mudarStatus = (t: TarefaDoDetalhe, status: StatusDaTarefa) =>
    editar.mutate(
      { tarefaId: t.id, payload: { status } },
      {
        onSuccess: () => toast({ title: status === 'concluida' ? 'Tarefa concluída' : status === 'em_andamento' ? 'Tarefa iniciada' : 'Status atualizado', description: nome }),
        onError: (e) => toast({ title: 'Não foi possível mudar o status', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' }),
      },
    );

  const confirmou = (titulo: string) => ({
    onSuccess: () => toast({ title: titulo, description: nome }),
    onError: (e: unknown) => toast({ title: 'Não foi possível confirmar o recebimento', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' as const }),
  });

  const acoesDaTarefa = (t: TarefaDoDetalhe) => {
    const minha = t.responsavel_id === user?.id;
    const botoes: React.ReactNode[] = [];
    // A ciência da tarefa é só do responsável (ADR 0009); iniciar também confirma.
    if (t.pode_confirmar_recebimento) {
      botoes.push(
        <Button key="r" size="sm" variant="ghost" className="gap-1.5" disabled={confirmarTarefa.isPending} onClick={() => confirmarTarefa.mutate([t.id], confirmou('Recebimento confirmado'))}>
          <MailCheck className="size-4" /> Confirmar recebimento
        </Button>,
      );
    }
    if (minha || editaSetor) {
      if (t.status === 'aberta') botoes.push(<Button key="i" size="sm" variant="outline" onClick={() => mudarStatus(t, 'em_andamento')} disabled={editar.isPending}>Iniciar</Button>);
      if (t.status === 'em_andamento') botoes.push(<Button key="c" size="sm" onClick={() => mudarStatus(t, 'concluida')} disabled={editar.isPending}>Concluir</Button>);
      if (t.status === 'concluida' && minha) botoes.push(<Button key="r" size="sm" variant="ghost" onClick={() => mudarStatus(t, 'em_andamento')} disabled={editar.isPending}>Reabrir</Button>);
    }
    if (distribui || editaSetor) {
      botoes.push(
        <Button key="e" size="icon" variant="ghost" className="size-8" aria-label={`Editar a tarefa de ${t.responsavel_nome}`} onClick={() => setTarefaEmEdicao(t)}>
          <Pencil className="size-4" />
        </Button>,
      );
    }
    return <span className="flex justify-end gap-1.5">{botoes}</span>;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={nome}
        description={`${s.setor_nome ?? 'Sem setor'} · ${os.cliente_nome} · OS ${os.ordem_servico_id}`}
        actions={
          <>
            {s.pode_confirmar_recebimento ? (
              <Button variant="outline" disabled={confirmarServico.isPending} onClick={() => confirmarServico.mutate([s.id], confirmou('Recebimento confirmado: o serviço passou para A distribuir'))}>
                <MailCheck className="size-4" /> Confirmar recebimento
              </Button>
            ) : null}
            {s.pode_distribuir && !encerrado && s.setor_id ? (
              <Button
                onClick={() =>
                  setDistribuir({
                    id: s.id,
                    catalogo: nome,
                    cliente: os.cliente_nome,
                    ordemServicoId: os.ordem_servico_id,
                    setorId: s.setor_id!,
                    setorNome: s.setor_nome,
                    jaDistribuido: s.tarefas.length > 0,
                    novo: s.etapa === 'novo',
                  })
                }
              >
                {s.tarefas.length ? <Split className="size-4" /> : <UserPlus className="size-4" />}
                {s.tarefas.length ? 'Dividir' : s.etapa === 'novo' ? 'Confirmar e distribuir' : 'Distribuir'}
              </Button>
            ) : null}
          </>
        }
      />

      {s.descricao ? <p className="-mt-2 mb-4 max-w-3xl text-sm text-muted-foreground">{s.descricao}</p> : null}

      {s.em_alerta ? (
        <section role="status" aria-label="Serviço sem andamento" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-subtle px-4 py-3 text-warning-strong">
          <Hourglass className="size-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Sem andamento há {s.dias_sem_movimentacao} dia{s.dias_sem_movimentacao === 1 ? '' : 's'}
            </p>
            <p className="text-sm">
              Última mudança em {formatDate(s.ultima_movimentacao_em)}. Se o trabalho andou, atualize a tarefa; se está esperando algo, explique a pausa.
            </p>
          </div>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-card" onClick={irParaTarefas}>
              Atualizar a tarefa
            </Button>
            {s.pode_dar_ciencia ? (
              <Button
                size="sm"
                variant="outline"
                className="bg-card"
                onClick={() =>
                  setCiencia({
                    id: s.id,
                    catalogo: nome,
                    cliente: os.cliente_nome,
                    diasSemMovimentacao: s.dias_sem_movimentacao,
                    ordemServicoId: os.ordem_servico_id,
                    responsaveis: s.tarefas.map((t) => t.responsavel_nome ?? '').filter(Boolean),
                    prazo: s.prazo,
                  })
                }
              >
                Explicar a pausa
              </Button>
            ) : null}
          </span>
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border bg-card p-4 shadow-sm" aria-label="Situação do serviço">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Campo rotulo="Etapa">
            <EtapaBadge value={s.etapa} />
          </Campo>
          <Campo rotulo="Prazo">
            {s.prazo ? <span className="mr-1.5 tabular-nums">{formatDate(s.prazo)}</span> : null}
            {!encerrado ? <Situacoes prazo={s.prazo} situacao={s.situacao_prazo} /> : !s.prazo ? '—' : null}
          </Campo>
          <Campo rotulo="Prioridade">
            <PrioridadeIndicator value={s.prioridade} />
          </Campo>
          <Campo rotulo="Início">{formatDate(s.data_inicio) ?? '—'}</Campo>
          <Campo rotulo={s.etapa === 'concluido' ? 'Concluído' : 'Término'}>
            {formatDate(s.data_termino) ?? '—'}
            {s.terminado_por_nome ? <span className="block text-xs text-muted-foreground">{s.terminado_por_nome}</span> : null}
          </Campo>
          <Campo rotulo="Andamento">
            {s.em_alerta || s.ciencia_vigente ? (
              <AlertaMovimentacao
                diasSemMovimentacao={s.dias_sem_movimentacao}
                emAlerta={s.em_alerta}
                cienciaVigente={s.ciencia_vigente}
                cienteEm={s.alerta_ciente_em}
                cientePorNome={s.alerta_ciente_por_nome}
                motivo={s.alerta_ciente_motivo}
                ate={s.ciencia_ate}
              />
            ) : (
              <span className="text-muted-foreground">
                {s.dias_sem_movimentacao === 0 ? 'Mudou hoje' : `Última mudança há ${s.dias_sem_movimentacao} dia${s.dias_sem_movimentacao === 1 ? '' : 's'}`}
              </span>
            )}
          </Campo>
        </dl>
        {s.ciencia_vigente && s.alerta_ciente_observacao ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">“{s.alerta_ciente_observacao}”</p>
        ) : null}
      </section>

      <Bloco titulo="Tarefas" className="mb-4" id="tarefas">
        {s.tarefas.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 text-left">Responsável</th>
                  <th className="border-l border-border/70 px-3 text-left">Parte</th>
                  <th className="border-l border-border/70 px-3 text-left">Status</th>
                  <th className="border-l border-border/70 px-3 text-left">Prazo</th>
                  <th className="border-l border-border/70 px-3 text-left">Início</th>
                  <th className="border-l border-border/70 px-3 text-left">Término</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody>
                {s.tarefas.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5 font-medium">
                      {t.responsavel_nome}
                      {t.responsavel_id === user?.id ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(você)</span> : null}
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5 text-muted-foreground">{t.descricao || '—'}</td>
                    <td className="border-l border-border/70 px-3 py-2.5">
                      <StatusBadge entity="tarefa" value={t.status} />
                      {t.etapa === 'nova' ? <span className="mt-0.5 block text-xs text-warning-strong">Aguardando a ciência de quem recebeu</span> : null}
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5">
                      {t.status === 'concluida' || t.status === 'cancelada' ? (formatDate(t.prazo) ?? '—') : <Situacoes prazo={t.prazo} situacao={t.situacao_prazo} />}
                    </td>
                    <td className="border-l border-border/70 px-3 py-2.5 tabular-nums">{formatDate(t.data_inicio) ?? '—'}</td>
                    <td className="border-l border-border/70 px-3 py-2.5 tabular-nums">{formatDate(t.data_termino) ?? '—'}</td>
                    <td className="px-3 py-2">{acoesDaTarefa(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda na fila do setor: ninguém recebeu este serviço.{s.pode_distribuir ? ' Use “Distribuir” para escolher quem vai executar.' : ''}
          </p>
        )}
      </Bloco>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-4">
          <Bloco titulo="Venda">
            <dl className="grid grid-cols-2 gap-3">
              <Campo rotulo="Cliente">{os.cliente_nome}</Campo>
              <Campo rotulo="OS">
                {veVendas ? (
                  <Link to={`/vendas/${os.ordem_servico_id}`} className="text-primary hover:underline">
                    OS {os.ordem_servico_id} · resumo da venda
                  </Link>
                ) : (
                  `OS ${os.ordem_servico_id}`
                )}
              </Campo>
              <Campo rotulo="Data da venda">{formatDate(os.data_venda)}</Campo>
              <Campo rotulo="Quem vendeu">{os.vendido_por_nome ?? '—'}</Campo>
              <Campo rotulo="Prioridade da venda">
                <PrioridadeIndicator value={os.prioridade} />
              </Campo>
            </dl>
          </Bloco>

          <Bloco titulo="Outros serviços da OS">
            {s.outros_servicos_da_os.length ? (
              <ul className="divide-y">
                {s.outros_servicos_da_os.map((o) => {
                  const conteudo = (
                    <>
                      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_CLASSES[ETAPA_DEFS[o.etapa].tone].dot)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{o.catalogo_nome ?? o.descricao}</span>
                        <span className="block text-xs text-muted-foreground">
                          {o.setor_nome ?? 'Sem setor'}
                          {o.responsaveis.length ? ` · ${o.responsaveis.join(', ')}` : ''}
                        </span>
                      </span>
                      <EtapaBadge value={o.etapa} />
                    </>
                  );
                  return (
                    <li key={o.id}>
                      {abreOutros ? (
                        <Link to={`/servicos/${o.id}`} className="-mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-muted/50">
                          {conteudo}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-2.5 py-2 text-sm">{conteudo}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Esta venda tem só este serviço.</p>
            )}
          </Bloco>
        </div>

        <Bloco titulo="Linha do tempo">
          <LinhaDoTempo eventos={linha.data} carregando={linha.isLoading} />
          {linha.isError ? <p className="text-sm text-muted-foreground">Não foi possível carregar a linha do tempo.</p> : null}
        </Bloco>
      </div>

      <DistribuirModal servico={distribuir} onClose={() => setDistribuir(null)} />
      <CienciaModal servico={ciencia} onClose={() => setCiencia(null)} onAtualizarTarefa={irParaTarefas} />
      <TarefaModal tarefa={tarefaEmEdicao} setorId={s.setor_id} servicoNome={nome} poderes={{ distribui, editaSetor }} onClose={() => setTarefaEmEdicao(null)} />
    </div>
  );
}
