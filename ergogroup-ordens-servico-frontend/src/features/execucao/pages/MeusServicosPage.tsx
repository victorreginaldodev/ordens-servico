import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, CircleCheck, Clock, Coffee, Handshake, Hourglass, MailCheck, Play, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import { CellTexto, DataTable, col, type DataTableColumn, type DataTableFacet, type DataTablePeriodFilter, type DataTableRowAction, type DataTableView } from '@/components/data-table';
import { PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDate, parseDate, temTexto } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AcaoComIcone } from '../components/AcaoComIcone';
import { NumeroOS } from '../components/Cabecalhos';
import { CienciaModal, type ServicoParaCiencia } from '../components/CienciaModal';
import { NavegacaoDoMes } from '../components/NavegacaoDoMes';
import { Cartao, Quadro, type ColunaDoQuadro } from '../components/Quadro';
import { AndamentoDoServico, ResultadoDoPrazo, Situacoes } from '../components/Situacoes';
import { useConfirmarRecebimentoDeTarefas, useEditarTarefa, useMeusServicos } from '../hooks';
import { intervaloDoMes, useMesDosConcluidos } from '../mesDosConcluidos';
import type { EtapaDaTarefa, LinhaDeTarefa, StatusDaTarefa } from '../services';

/**
 * Meus serviços (`/meus-servicos`): o que está com a pessoa logada, no padrão de listagem (`DataTable`).
 *
 * Revisão de 14/10/2026 (docs/ui/plano-meus-servicos-por-etapa.md, aprovado; fluxos-e-navegacao.md §6.1.1): os
 * mesmos princípios do Painel do setor. As abas são as etapas da tarefa (ADR 0009), sem sobreposição, a começar
 * pelas novas; atrasadas, vencendo e sem andamento são o filtro "Precisa de atenção"; no quadro, as abas somem e
 * as colunas são as etapas; as concluídas são paginadas por mês.
 */

type Visao = 'novas' | 'a_iniciar' | 'em_andamento' | 'concluidas';
type Atencao = 'atrasada' | 'vence7' | 'sem_andamento' | 'aguardando' | 'nova_antiga';

const VISAO_PADRAO: Visao = 'novas';
const ETAPA_DA_VISAO: Record<Visao, EtapaDaTarefa> = {
  novas: 'nova',
  a_iniciar: 'a_iniciar',
  em_andamento: 'em_andamento',
  concluidas: 'concluida',
};
/** Uma tarefa nova há este tanto de dias já pede atenção (o mesmo limite do painel). */
const DIAS_NOVA_ANTIGA = 3;

const ATIVA = (t: LinhaDeTarefa) => t.status === 'aberta' || t.status === 'em_andamento';

function atencaoDa(t: LinhaDeTarefa): Atencao[] {
  if (!ATIVA(t)) return [];
  const motivos: Atencao[] = [];
  if (t.situacao_prazo === 'atrasado') motivos.push('atrasada');
  if (t.situacao_prazo === 'vence_7_dias') motivos.push('vence7');
  if (t.servico_em_alerta) motivos.push('sem_andamento');
  if (t.servico_ciencia_vigente) motivos.push('aguardando');
  if (t.etapa === 'nova' && t.atribuida_ha_dias >= DIAS_NOVA_ANTIGA) motivos.push('nova_antiga');
  return motivos;
}
const ATENCAO_OPCOES: { value: Atencao; label: string }[] = [
  { value: 'atrasada', label: 'Atrasadas' },
  { value: 'vence7', label: 'Vencem em 7 dias' },
  { value: 'sem_andamento', label: 'Sem andamento' },
  { value: 'aguardando', label: 'Aguardando algo' },
  { value: 'nova_antiga', label: `Novas há ${DIAS_NOVA_ANTIGA} dias ou mais` },
];
const PRIORIDADE_OPCOES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

/** Colunas de cada aba (uma informação por coluna). */
const COLUNAS_DA_VISAO: Record<Visao, string[]> = {
  novas: ['servico', 'cliente', 'os', 'recebida_ha', 'prazo', 'parte'],
  a_iniciar: ['servico', 'cliente', 'os', 'prazo', 'andamento'],
  em_andamento: ['servico', 'cliente', 'os', 'prazo', 'iniciada', 'andamento'],
  concluidas: ['servico', 'cliente', 'os', 'termino', 'resultado'],
};
const ORDEM_DA_VISAO: Record<Visao, { id: string; desc?: boolean }> = {
  novas: { id: 'recebida_ha', desc: true },
  a_iniciar: { id: 'prazo' },
  em_andamento: { id: 'prazo' },
  concluidas: { id: 'termino', desc: true },
};
const PRAZO: DataTablePeriodFilter<LinhaDeTarefa> = { id: 'prazo', label: 'Prazo', getDate: (t) => t.prazo, presets: ['prox7', 'semana', 'mes', 'mes_passado', 'personalizado'] };

const noPrazo = (t: LinhaDeTarefa) => {
  const prazo = parseDate(t.prazo);
  const termino = parseDate(t.data_termino);
  return prazo && termino ? termino <= prazo : null;
};
const dias = (n: number) => `${n} dia${n === 1 ? '' : 's'}`;

export default function MeusServicosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const [ciencia, setCiencia] = useState<ServicoParaCiencia | null>(null);

  const visaoParam = params.get('view') as Visao | null;
  const visao: Visao = visaoParam && visaoParam in COLUNAS_DA_VISAO ? visaoParam : VISAO_PADRAO;

  // Concluídas: o mês da URL (`?mes=2026-10` ou `?mes=todo`); sem ele, o mês atual.
  const { mes, mudarMes, rotulo: rotuloDoMesDaAba } = useMesDosConcluidos();
  const intervalo = useMemo(() => intervaloDoMes(mes), [mes]);
  const ativasQ = useMeusServicos();
  const concluidasQ = useMeusServicos({ concluidas: true, ...intervalo });
  const editar = useEditarTarefa();
  const confirmar = useConfirmarRecebimentoDeTarefas();

  const todas = useMemo(() => (ativasQ.data ? [...ativasQ.data, ...(concluidasQ.data ?? [])] : undefined), [ativasQ.data, concluidasQ.data]);
  const rotuloConcluidas = rotuloDoMesDaAba('Concluídas');

  /* ── Abas: as etapas da tarefa ── */
  const views = useMemo<DataTableView<LinhaDeTarefa>[]>(
    () =>
      (
        [
          ['novas', 'Novas'],
          ['a_iniciar', 'A iniciar'],
          ['em_andamento', 'Em andamento'],
          ['concluidas', rotuloConcluidas],
        ] as const
      ).map(([id, label]) => ({ id, label, filter: (t: LinhaDeTarefa) => t.etapa === ETAPA_DA_VISAO[id] })),
    [rotuloConcluidas],
  );

  /* ── Ações ── */
  const mudarStatus = (t: LinhaDeTarefa, status: StatusDaTarefa) => {
    if (t.status === status) return;
    editar.mutate(
      { tarefaId: t.tarefa_id, payload: { status } },
      {
        onSuccess: () =>
          toast({
            title:
              status === 'concluida'
                ? 'Tarefa concluída'
                : status === 'em_andamento'
                  ? t.status === 'concluida'
                    ? 'Tarefa reaberta'
                    : 'Tarefa iniciada'
                  : 'Tarefa voltou para A iniciar',
            description: `${t.catalogo_nome ?? 'Serviço'} · ${t.cliente_nome}`,
          }),
        onError: (e) => toast({ title: 'Não foi possível mudar o status', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' }),
      },
    );
  };
  const confirmarRecebimento = (itens: LinhaDeTarefa[]) =>
    confirmar.mutate(
      itens.map((t) => t.tarefa_id),
      {
        onSuccess: (r) =>
          toast({
            title: r.recebidas.length === 1 ? 'Recebimento confirmado' : `${r.recebidas.length} recebimentos confirmados`,
            description: itens.length === 1 ? `${itens[0].catalogo_nome ?? 'Serviço'} passou para A iniciar.` : 'As tarefas passaram para A iniciar.',
          }),
        onError: (e) => toast({ variant: 'destructive', title: 'Não foi possível confirmar o recebimento', description: mensagemDeErro(e, 'Tente de novo.') }),
      },
    );
  const explicarPausa = (t: LinhaDeTarefa) =>
    setCiencia({
      id: t.servico_id,
      catalogo: t.catalogo_nome,
      cliente: t.cliente_nome,
      diasSemMovimentacao: t.servico_dias_sem_movimentacao,
      ordemServicoId: t.ordem_servico_id,
      prazo: t.prazo,
    });

  // Na tabela, só ícones (§6.2.7): explicar a pausa (se o serviço está sem andamento) e o passo seguinte da etapa.
  // Iniciar já confirma o recebimento (ADR 0009), por isso não há "Confirmar e iniciar".
  const acao = (t: LinhaDeTarefa) => (
    <span className="inline-flex items-center gap-0.5">
      {ATIVA(t) && t.servico_em_alerta ? (
        <AcaoComIcone rotulo="Explicar a pausa: o serviço está sem andamento" icone={Hourglass} className="text-warning-strong" onClick={() => explicarPausa(t)} />
      ) : null}
      {t.etapa === 'nova' ? (
        <AcaoComIcone rotulo="Confirmar o recebimento" icone={MailCheck} desabilitado={confirmar.isPending} onClick={() => confirmarRecebimento([t])} />
      ) : null}
      {t.etapa === 'nova' || t.etapa === 'a_iniciar' ? (
        <AcaoComIcone rotulo="Iniciar" icone={Play} desabilitado={editar.isPending} onClick={() => mudarStatus(t, 'em_andamento')} />
      ) : null}
      {t.etapa === 'em_andamento' ? (
        <AcaoComIcone rotulo="Concluir" icone={CircleCheck} desabilitado={editar.isPending} onClick={() => mudarStatus(t, 'concluida')} />
      ) : null}
    </span>
  );
  const acoesDoMenu = (t: LinhaDeTarefa): DataTableRowAction<LinhaDeTarefa>[] => [
    { label: 'Abrir o serviço', icon: SquareArrowOutUpRight, onSelect: () => navigate(`/servicos/${t.servico_id}`) },
    ...(t.etapa === 'em_andamento' ? [{ label: 'Voltar para A iniciar', icon: RotateCcw, onSelect: () => mudarStatus(t, 'aberta') }] : []),
    ...(t.etapa === 'concluida' ? [{ label: 'Reabrir', icon: RotateCcw, onSelect: () => mudarStatus(t, 'em_andamento') }] : []),
    ...(veVendas ? [{ label: 'Abrir a venda', icon: Handshake, onSelect: () => navigate(`/vendas/${t.ordem_servico_id}`) }] : []),
  ];

  /* ── Colunas ── */
  const todasAsColunas = useMemo<DataTableColumn<LinhaDeTarefa>[]>(
    () => [
      col.custom<LinhaDeTarefa>('servico', 'Serviço', {
        accessor: (t) => t.catalogo_nome ?? '',
        sortingFn: 'textPtBr',
        // Só o nome, em caixa alta; o "o que será feito" fica no detalhe do serviço (e no title).
        cell: (t) => (
          <span className="block max-w-72 truncate font-semibold uppercase" title={[t.catalogo_nome, t.servico_descricao].filter(Boolean).join(' — ') || undefined}>
            {t.catalogo_nome ?? 'Serviço'}
          </span>
        ),
      }),
      col.custom<LinhaDeTarefa>('cliente', 'Cliente', {
        accessor: (t) => t.cliente_nome,
        sortingFn: 'textPtBr',
        cell: (t) => <CellTexto value={t.cliente_nome} className="max-w-[28rem] font-medium text-foreground" />,
      }),
      col.custom<LinhaDeTarefa>('os', 'OS', { accessor: (t) => t.ordem_servico_id, width: '80px', cell: (t) => <NumeroOS os={t.ordem_servico_id} veVendas={veVendas} /> }),
      col.custom<LinhaDeTarefa>('recebida_ha', 'Recebida há', {
        accessor: (t) => t.atribuida_ha_dias,
        width: '130px',
        cell: (t) => (
          <span className={cn('tabular-nums', t.atribuida_ha_dias >= DIAS_NOVA_ANTIGA && 'font-medium text-warning-strong')}>
            {t.atribuida_ha_dias === 0 ? 'Hoje' : dias(t.atribuida_ha_dias)}
          </span>
        ),
      }),
      col.prazo<LinhaDeTarefa>('prazo', 'Prazo', (t) => t.prazo, { encerrado: (t) => t.status === 'concluida' }),
      col.custom<LinhaDeTarefa>('parte', 'Parte', {
        accessor: (t) => t.descricao ?? '',
        sortingFn: 'textPtBr',
        cell: (t) =>
          temTexto(t.descricao) ? <CellTexto value={t.descricao!} className="max-w-56" /> : <span className="text-muted-foreground">—</span>,
      }),
      col.custom<LinhaDeTarefa>('andamento', 'Andamento', {
        accessor: (t) => t.servico_dias_sem_movimentacao,
        width: '230px',
        cell: (t) => (
          <AndamentoDoServico
            dias={t.servico_dias_sem_movimentacao}
            emAlerta={t.servico_em_alerta}
            cienciaVigente={t.servico_ciencia_vigente}
            motivo={t.servico_ciencia_motivo}
            ate={t.servico_ciencia_ate}
          />
        ),
      }),
      col.data<LinhaDeTarefa>('iniciada', 'Iniciada em', (t) => t.data_inicio, { width: '130px' }),
      col.data<LinhaDeTarefa>('termino', 'Concluída em', (t) => t.data_termino, { width: '140px' }),
      col.custom<LinhaDeTarefa>('resultado', 'No prazo?', {
        accessor: (t) => {
          const r = noPrazo(t);
          return r == null ? undefined : r ? 0 : 1;
        },
        width: '140px',
        cell: (t) => (t.data_termino ? <ResultadoDoPrazo prazo={t.prazo} termino={t.data_termino} noPrazo={noPrazo(t)} /> : null),
      }),
    ],
    [veVendas],
  );
  const colunas = useMemo(() => COLUNAS_DA_VISAO[visao].map((id) => todasAsColunas.find((c) => c.id === id)!), [visao, todasAsColunas]);

  /* ── Filtros: "Precisa de atenção" cruza com qualquer aba ── */
  const filtrosDoQuadro = useMemo<DataTableFacet<LinhaDeTarefa>[]>(
    () => [
      { columnId: 'atencao', label: 'Precisa de atenção', getValue: atencaoDa, options: ATENCAO_OPCOES },
      { columnId: 'cliente', label: 'Cliente', getValue: (t) => t.cliente_nome, searchable: true },
      { columnId: 'prioridade', label: 'Prioridade', getValue: (t) => t.prioridade, options: PRIORIDADE_OPCOES },
    ],
    [],
  );
  const facets = useMemo(() => filtrosDoQuadro.filter((f) => f.columnId !== 'atencao' || visao !== 'concluidas'), [filtrosDoQuadro, visao]);

  /* ── Quadro: as colunas são as etapas (no quadro, as abas somem) ── */
  const quadro = (itens: LinhaDeTarefa[]) => {
    const colunasQ: ColunaDoQuadro<LinhaDeTarefa>[] = (
      [
        { id: 'nova', titulo: 'Novas', tom: 'warning', vazio: 'Nada novo para você.' },
        { id: 'a_iniciar', titulo: 'A iniciar', tom: 'neutral', aceita: true, vazio: 'Arraste uma nova para cá para confirmar o recebimento.' },
        { id: 'em_andamento', titulo: 'Em andamento', tom: 'info', aceita: true, vazio: 'Arraste para cá para iniciar.' },
        {
          id: 'concluida',
          titulo: 'Concluídas',
          tom: 'success',
          aceita: true,
          cabecalho: <NavegacaoDoMes mes={mes} onMudar={mudarMes} compacto />,
          vazio: 'Nada concluído no período.',
        },
      ] as const
    ).map((c) => ({ ...c, itens: itens.filter((t) => t.etapa === c.id) }));
    return (
      <Quadro
        rotulo="Meus serviços em quadro"
        colunas={colunasQ}
        chave={(t) => String(t.tarefa_id)}
        arrastavel={() => true}
        onSoltar={(colunaId, chave) => {
          const t = itens.find((x) => String(x.tarefa_id) === chave);
          if (!t || t.etapa === colunaId) return;
          if (colunaId === 'a_iniciar') {
            // De Novas: confirma o recebimento. De Em andamento ou Concluídas: volta a tarefa para aberta.
            if (t.etapa === 'nova') confirmarRecebimento([t]);
            else mudarStatus(t, 'aberta');
          }
          if (colunaId === 'em_andamento') mudarStatus(t, 'em_andamento');
          if (colunaId === 'concluida') mudarStatus(t, 'concluida');
        }}
        cartao={(t) => {
          const concluida = t.etapa === 'concluida';
          return (
            <Cartao
              titulo={t.catalogo_nome ?? 'Serviço'}
              descricao={temTexto(t.descricao) ? `Parte: ${t.descricao}` : null}
              os={t.ordem_servico_id}
              cliente={t.cliente_nome}
              prioridade={t.prioridade}
              tom={
                concluida
                  ? null
                  : t.situacao_prazo === 'atrasado'
                    ? 'danger'
                    : t.servico_em_alerta || (t.etapa === 'nova' && t.atribuida_ha_dias >= DIAS_NOVA_ANTIGA)
                      ? 'warning'
                      : null
              }
              situacao={
                concluida ? (
                  t.data_termino ? <ResultadoDoPrazo prazo={t.prazo} termino={t.data_termino} noPrazo={noPrazo(t)} /> : null
                ) : (
                  <Situacoes
                    prazo={t.prazo}
                    situacao={t.situacao_prazo}
                    emAlerta={t.servico_em_alerta}
                    diasSemMovimentacao={t.servico_dias_sem_movimentacao}
                    cienciaVigente={t.servico_ciencia_vigente}
                    motivoCiencia={t.servico_ciencia_motivo}
                    cienciaAte={t.servico_ciencia_ate}
                  />
                )
              }
              tempo={
                t.etapa === 'nova' ? (
                  <span className={cn('inline-flex items-center gap-1', t.atribuida_ha_dias >= DIAS_NOVA_ANTIGA && 'font-medium text-warning-strong')}>
                    <Clock className="size-3.5" aria-hidden />
                    {t.atribuida_ha_dias ? `Recebida há ${dias(t.atribuida_ha_dias)}` : 'Chegou hoje'}
                  </span>
                ) : concluida ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="size-3.5" aria-hidden />
                    Concluída em {formatDate(t.data_termino)}
                  </span>
                ) : t.data_inicio ? (
                  <span className="inline-flex items-center gap-1">
                    <Play className="size-3.5" aria-hidden />
                    Iniciada em {formatDate(t.data_inicio)}
                  </span>
                ) : null
              }
              acao={
                t.etapa === 'nova' || t.etapa === 'a_iniciar' ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={editar.isPending} onClick={() => mudarStatus(t, 'em_andamento')}>
                    <Play className="size-3.5" /> Iniciar
                  </Button>
                ) : t.etapa === 'em_andamento' ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={editar.isPending} onClick={() => mudarStatus(t, 'concluida')}>
                    <CircleCheck className="size-3.5" /> Concluir
                  </Button>
                ) : null
              }
              onAbrir={() => navigate(`/servicos/${t.servico_id}`)}
            />
          );
        }}
      />
    );
  };

  /* ── Aviso de sem andamento (§6.2.8) e ações da linha das abas ── */
  const ativas = ativasQ.data ?? [];
  const semAndamento = new Set(ativas.filter((t) => t.servico_em_alerta).map((t) => t.servico_id)).size;
  const revisar = () => {
    // Abre a aba que tem tarefas sem andamento (a mais adiantada primeiro), já filtrada.
    const aba = (['em_andamento', 'a_iniciar', 'novas'] as const).find((v) => ativas.some((t) => t.servico_em_alerta && t.etapa === ETAPA_DA_VISAO[v])) ?? 'em_andamento';
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('view', aba);
      n.set('f.atencao', 'sem_andamento');
      return n;
    });
  };
  const novas = ativas.filter((t) => t.etapa === 'nova');
  const acoesDaAba =
    visao === 'novas' && novas.length > 1 ? (
      <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={confirmar.isPending} onClick={() => confirmarRecebimento(novas)}>
        <MailCheck className="size-4" /> Confirmar todas ({novas.length})
      </Button>
    ) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Meus serviços" description="O que chegou para você, o que está em andamento e o que você concluiu." />
      {semAndamento ? (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-subtle px-4 py-3 text-warning-strong">
          <Hourglass className="size-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {semAndamento === 1 ? '1 serviço seu está' : `${semAndamento} serviços seus estão`} sem andamento há 7 dias ou mais
            </p>
            <p className="text-sm">Se o trabalho andou, atualize a tarefa. Se está esperando algo, explique a pausa: o aviso some e o setor fica sabendo.</p>
          </div>
          <Button size="sm" variant="outline" className="bg-card" onClick={revisar}>
            {semAndamento === 1 ? 'Revisar' : `Revisar os ${semAndamento}`}
          </Button>
        </div>
      ) : null}
      <DataTable
        id="meus-servicos"
        data={todas}
        columns={colunas}
        getRowId={(t) => String(t.tarefa_id)}
        getRowHref={(t) => `/servicos/${t.servico_id}`}
        views={views}
        defaultView={VISAO_PADRAO}
        viewsActions={acoesDaAba}
        search={{ placeholder: 'Buscar serviço, cliente ou OS', fields: (t) => [t.catalogo_nome, t.descricao, t.cliente_nome, t.ordem_servico_id, `OS ${t.ordem_servico_id}`] }}
        facets={facets}
        periodFilter={visao === 'concluidas' ? [] : [PRAZO]}
        defaultSort={ORDEM_DA_VISAO[visao]}
        renderRowAction={acao}
        rowActions={acoesDoMenu}
        actionsColumn={{ header: 'Ações', width: '140px' }}
        toolbarActions={visao === 'concluidas' ? <NavegacaoDoMes mes={mes} onMudar={mudarMes} /> : null}
        renderBoard={quadro}
        boardReplacesViews={{ facets: filtrosDoQuadro, periodFilter: [] }}
        isLoading={ativasQ.isLoading}
        isFetching={ativasQ.isFetching || concluidasQ.isFetching}
        isError={ativasQ.isError}
        onRetry={() => ativasQ.refetch()}
        emptyStates={{
          noData: {
            icon: Coffee,
            title: 'Nada com você agora',
            description: 'Quando alguém distribuir um serviço para você, ele aparece aqui.',
          },
        }}
      />
      <CienciaModal servico={ciencia} onClose={() => setCiencia(null)} />
    </div>
  );
}
