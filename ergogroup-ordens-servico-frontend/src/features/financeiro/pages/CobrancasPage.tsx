import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlarmClock, CheckCheck, Handshake, PartyPopper, Receipt, ShieldAlert, ShieldCheck, SquareArrowOutUpRight, Zap } from 'lucide-react';
import {
  CellTexto,
  DataTable,
  col,
  type DataTableColumn,
  type DataTableFacet,
  type DataTablePeriodFilter,
  type DataTableRowAction,
  type DataTableView,
} from '@/components/data-table';
import { AndamentoServicos, PageHeader, PessoaChip, TIPO_CONDICAO_DEFS, TipoCondicaoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { AcaoComIcone } from '@/features/execucao/components/AcaoComIcone';
import { NavegacaoDoMes } from '@/features/execucao/components/NavegacaoDoMes';
import { intervaloDoMes, useMesDosConcluidos } from '@/features/execucao/mesDosConcluidos';
import { FORMA_PAGAMENTO_LABEL } from '@/features/vendas/condicao';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, parseDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FaturarModal } from '../components/FaturarModal';
import { PENDENCIA } from '../conferencia';
import { useCobrancas, useConferencia } from '../hooks';
import type { LinhaDeCobranca, SituacaoDeCobranca } from '../services';

/**
 * Cobranças (`/cobrancas`, faturamento/04, wireframe do lote 5 aprovado em 14/10/2026): no padrão de listagem
 * (`DataTable`, como Vendas e o Painel do setor). Abas = situações, sem sobreposição: **Para faturar** (padrão, a
 * fila do financeiro) · **Em execução** (a previsão) · **Faturadas** (por mês). Cada aba tem as suas colunas, uma
 * informação por coluna. "Precisa de atenção" usa as verificações da conferência do faturamento, que aparece
 * resumida no topo.
 */

type Visao = SituacaoDeCobranca;
const VISAO_PADRAO: Visao = 'a_faturar';
const VISOES: Visao[] = ['a_faturar', 'previsao', 'faturadas'];
const DIAS_VENCIMENTO_PERTO = 7;

const diasAte = (data: string | null | undefined) => {
  const d = parseDate(data);
  if (!d) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

const COLUNAS_DA_VISAO: Record<Visao, string[]> = {
  a_faturar: ['os', 'cliente', 'valor', 'condicao', 'vencimento', 'liberada_em', 'liberacao', 'aguardando', 'vendedor', 'forma'],
  previsao: ['os', 'cliente', 'valor', 'condicao', 'vencimento', 'andamento', 'falta', 'com_quem', 'sem_andamento', 'vendedor'],
  faturadas: ['os', 'cliente', 'valor', 'condicao', 'referencia', 'faturada_em', 'faturada_por', 'vendedor'],
};
const ORDEM_DA_VISAO: Record<Visao, { id: string; desc?: boolean }> = {
  a_faturar: { id: 'liberada_em' },
  previsao: { id: 'andamento', desc: true },
  faturadas: { id: 'faturada_em', desc: true },
};
const VENCIMENTO: DataTablePeriodFilter<LinhaDeCobranca> = {
  id: 'vencimento',
  label: 'Vencimento',
  getDate: (o) => o.data_acordada_cobranca,
  presets: ['prox7', 'semana', 'mes', 'mes_passado', 'personalizado'],
};
const PERIODO_DA_VISAO: Record<Visao, DataTablePeriodFilter<LinhaDeCobranca>[]> = {
  a_faturar: [{ id: 'liberada', label: 'Liberada em', getDate: (o) => o.liberada_para_cobranca_em }, VENCIMENTO],
  previsao: [{ id: 'venda', label: 'Venda', getDate: (o) => o.data_venda }, VENCIMENTO],
  // Nas faturadas, o período é o mês (ou o período todo) escolhido na barra.
  faturadas: [],
};

export default function CobrancasPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const [faturar, setFaturar] = useState<number | null>(null);

  const visaoParam = params.get('view') as Visao | null;
  const visao: Visao = visaoParam && VISOES.includes(visaoParam) ? visaoParam : VISAO_PADRAO;

  // Faturadas por mês (`?mes=2026-10` ou `?mes=todo`), como os concluídos da execução: a lista não cresce sem fim.
  const { mes, mudarMes, rotulo } = useMesDosConcluidos();
  const intervalo = useMemo(() => intervaloDoMes(mes), [mes]);
  const cobrancasQ = useCobrancas({ situacao: 'todas', faturada_de: intervalo.de, faturada_ate: intervalo.ate });
  const conferenciaQ = useConferencia();
  const linhas = cobrancasQ.data?.ordens;
  const diasAlerta = cobrancasQ.data?.dias_alerta_sem_lancamento ?? 3;

  const views = useMemo<DataTableView<LinhaDeCobranca>[]>(
    () => [
      { id: 'a_faturar', label: 'Para faturar', filter: (o) => o.situacao === 'a_faturar' },
      { id: 'previsao', label: 'Em execução', filter: (o) => o.situacao === 'previsao' },
      { id: 'faturadas', label: rotulo('Faturadas'), filter: (o) => o.situacao === 'faturadas' },
    ],
    [rotulo],
  );

  /* ── Colunas: uma informação por coluna ── */
  const todasAsColunas = useMemo<DataTableColumn<LinhaDeCobranca>[]>(
    () => [
      col.custom<LinhaDeCobranca>('os', 'OS', {
        accessor: (o) => o.ordem_servico_id,
        width: '80px',
        cell: (o) => <span className="font-semibold tabular-nums">{o.ordem_servico_id}</span>,
      }),
      col.custom<LinhaDeCobranca>('cliente', 'Cliente', {
        accessor: (o) => o.cliente_nome,
        sortingFn: 'textPtBr',
        cell: (o) => <CellTexto value={o.cliente_nome} className="max-w-[24rem] font-medium text-foreground" />,
      }),
      col.moeda<LinhaDeCobranca>('valor', 'Valor', (o) => o.valor, { width: '130px' }),
      {
        ...col.texto<LinhaDeCobranca>('condicao', 'Condição', (o) => o.tipo_condicao, { width: '150px' }),
        meta: {
          label: 'Condição',
          width: '150px',
          facetValue: (o: LinhaDeCobranca) => o.tipo_condicao,
          facetOptions: Object.entries(TIPO_CONDICAO_DEFS).map(([value, d]) => ({ value, label: d.label })),
        },
        // Só o tipo (e as parcelas); o texto completo da condição fica no title e no resumo.
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5" title={row.original.condicao_resumo}>
            <TipoCondicaoBadge value={row.original.tipo_condicao} />
            {row.original.tipo_condicao === 'parcelado' && row.original.quantidade_parcelas ? (
              <span className="text-xs tabular-nums text-muted-foreground">{row.original.quantidade_parcelas}x</span>
            ) : null}
          </span>
        ),
      },
      col.custom<LinhaDeCobranca>('vencimento', 'Vencimento', {
        accessor: (o) => o.data_acordada_cobranca ?? (o.vencimento_dias_apos_nota ? `9999-${o.vencimento_dias_apos_nota}` : undefined),
        width: '170px',
        cell: (o) => {
          const dias = diasAte(o.data_acordada_cobranca);
          const perto = o.situacao !== 'faturadas' && dias !== null && dias <= DIAS_VENCIMENTO_PERTO;
          const dica = dias === null ? undefined : dias < 0 ? `Venceu há ${plural(-dias, 'dia', 'dias')}` : dias === 0 ? 'Vence hoje' : `Vence em ${plural(dias, 'dia', 'dias')}`;
          return o.vencimento_resumo ? (
            <span className={cn('tabular-nums', perto && 'font-medium text-warning-strong')} title={dica}>
              {o.vencimento_resumo}
            </span>
          ) : (
            <span className="text-muted-foreground">Não informado</span>
          );
        },
      }),
      col.data<LinhaDeCobranca>('liberada_em', 'Liberada em', (o) => o.liberada_para_cobranca_em, { width: '120px' }),
      col.custom<LinhaDeCobranca>('liberacao', 'Liberação', {
        accessor: (o) => o.liberar_em,
        width: '190px',
        // Pela regra: liberação na venda = imediata; na conclusão = quando o último serviço terminou.
        cell: (o) =>
          o.liberar_em === 'venda' ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2.5 text-xs font-medium text-warning-strong" title="Liberada na venda: pode faturar antes de os serviços terminarem.">
              <Zap className="size-3.5" aria-hidden /> Na venda
            </span>
          ) : (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2.5 text-xs font-medium text-success-strong" title="Liberada quando o último serviço foi concluído.">
              <CheckCheck className="size-3.5" aria-hidden /> Serviços concluídos
            </span>
          ),
      }),
      col.custom<LinhaDeCobranca>('aguardando', 'Aguardando', {
        accessor: (o) => o.dias_aguardando_lancamento ?? undefined,
        width: '130px',
        cell: (o) => {
          const d = o.dias_aguardando_lancamento ?? 0;
          return o.em_alerta ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2.5 text-xs font-medium text-warning-strong">
              <AlarmClock className="size-3.5" aria-hidden /> {plural(d, 'dia', 'dias')}
            </span>
          ) : (
            <span className="tabular-nums text-muted-foreground">{d === 0 ? 'Liberada hoje' : plural(d, 'dia', 'dias')}</span>
          );
        },
      }),
      col.custom<LinhaDeCobranca>('andamento', 'Andamento', {
        accessor: (o) => (o.andamento.total ? o.andamento.concluido / o.andamento.total : undefined),
        width: '170px',
        cell: (o) => <AndamentoServicos andamento={o.andamento} />,
      }),
      col.custom<LinhaDeCobranca>('falta', 'Falta', {
        accessor: (o) => o.pendentes[0]?.servico_nome,
        sortingFn: 'textPtBr',
        // O serviço que falta (o mais parado), com o setor; com mais de um, "+N" (todos no title).
        cell: (o) => {
          const [primeiro, ...outros] = o.pendentes;
          if (!primeiro) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="grid max-w-64" title={o.pendentes.map((p) => `${p.servico_nome}${p.setor_nome ? ` (${p.setor_nome})` : ''}`).join('\n')}>
              <span className="flex items-center gap-1.5">
                <span className="truncate font-semibold uppercase">{primeiro.servico_nome}</span>
                {outros.length ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{outros.length}</span> : null}
              </span>
              {primeiro.setor_nome ? <span className="truncate text-xs text-muted-foreground">{primeiro.setor_nome}</span> : null}
            </span>
          );
        },
      }),
      col.custom<LinhaDeCobranca>('com_quem', 'Com quem', {
        accessor: (o) => o.pendentes[0]?.responsaveis[0] ?? (o.pendentes.length ? '' : undefined),
        sortingFn: 'textPtBr',
        width: '200px',
        cell: (o) => {
          const primeiro = o.pendentes[0];
          if (!primeiro) return <span className="text-muted-foreground">—</span>;
          if (!primeiro.responsaveis.length) return <span className="whitespace-nowrap font-medium text-warning-strong">Sem distribuir</span>;
          return (
            <span className="flex max-w-52 items-center gap-1.5" title={primeiro.responsaveis.join(', ')}>
              <PessoaChip nome={primeiro.responsaveis[0]} variant="full" className="min-w-0 truncate" />
              {primeiro.responsaveis.length > 1 ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{primeiro.responsaveis.length - 1}</span> : null}
            </span>
          );
        },
      }),
      col.custom<LinhaDeCobranca>('sem_andamento', 'Sem andamento há', {
        accessor: (o) => o.pendentes[0]?.dias_sem_movimentacao ?? undefined,
        width: '150px',
        cell: (o) => {
          const d = o.pendentes[0]?.dias_sem_movimentacao;
          if (d === null || d === undefined) return <span className="text-muted-foreground">—</span>;
          return <span className={cn('tabular-nums', d >= 7 ? 'font-medium text-warning-strong' : 'text-muted-foreground')}>{d === 0 ? 'Mexeu hoje' : plural(d, 'dia', 'dias')}</span>;
        },
      }),
      col.texto<LinhaDeCobranca>('referencia', 'Referência', (o) => o.referencia_lancamento, { width: '160px' }),
      col.data<LinhaDeCobranca>('faturada_em', 'Faturada em', (o) => o.data_cobranca, { width: '120px' }),
      {
        ...col.pessoa<LinhaDeCobranca>('faturada_por', 'Faturada por', (o) => o.cobranca_realizada_por_nome, { width: '200px' }),
        cell: ({ row }) => <PessoaChip nome={row.original.cobranca_realizada_por_nome} variant="full" />,
      },
      {
        ...col.pessoa<LinhaDeCobranca>('vendedor', 'Vendido por', (o) => o.vendido_por_nome, { width: '200px', priority: 3 }),
        cell: ({ row }) => <PessoaChip nome={row.original.vendido_por_nome} variant="full" />,
      },
      col.custom<LinhaDeCobranca>('forma', 'Forma', {
        accessor: (o) => FORMA_PAGAMENTO_LABEL[o.forma_pagamento],
        sortingFn: 'textPtBr',
        width: '130px',
        priority: 3,
        cell: (o) => FORMA_PAGAMENTO_LABEL[o.forma_pagamento],
      }),
    ],
    [],
  );
  const colunas = useMemo(() => COLUNAS_DA_VISAO[visao].map((id) => todasAsColunas.find((c) => c.id === id)!), [visao, todasAsColunas]);

  /* ── Filtros: "Precisa de atenção" vem da conferência ── */
  const facets = useMemo<DataTableFacet<LinhaDeCobranca>[]>(() => {
    const atencao = (Object.entries(PENDENCIA) as [keyof typeof PENDENCIA, (typeof PENDENCIA)[keyof typeof PENDENCIA]][])
      .filter(([, p]) => p.situacao === visao)
      .map(([value, p]) => ({ value, label: p.rotulo }));
    return [
      ...(atencao.length ? [{ columnId: 'atencao', label: 'Precisa de atenção', getValue: (o: LinhaDeCobranca) => o.pendencias, options: atencao }] : []),
      { columnId: 'cliente', label: 'Cliente', getValue: (o) => o.cliente_nome, searchable: true },
      { columnId: 'condicao', label: 'Condição' },
      { columnId: 'vendedor', label: 'Vendido por', getValue: (o) => o.vendido_por_nome, searchable: true },
      ...(visao === 'a_faturar'
        ? [{ columnId: 'liberacao', label: 'Liberação', getValue: (o: LinhaDeCobranca) => o.liberar_em, options: [{ value: 'venda', label: 'Na venda' }, { value: 'conclusao', label: 'Serviços concluídos' }] }]
        : []),
    ];
  }, [visao]);

  /* ── Ações ── */
  const acaoDaLinha = (o: LinhaDeCobranca) =>
    o.situacao === 'a_faturar' ? <AcaoComIcone rotulo={`Faturar a OS ${o.ordem_servico_id}`} icone={Receipt} onClick={() => setFaturar(o.ordem_servico_id)} /> : null;
  const acoesDoMenu = (o: LinhaDeCobranca): DataTableRowAction<LinhaDeCobranca>[] => [
    { label: 'Abrir o resumo para faturar', icon: SquareArrowOutUpRight, onSelect: () => navigate(`/cobrancas/${o.ordem_servico_id}`) },
    ...(veVendas ? [{ label: 'Abrir a venda', icon: Handshake, onSelect: () => navigate(`/vendas/${o.ordem_servico_id}`) }] : []),
  ];

  // O total (quantidade e valor) da aba, ao lado das abas: os contadores do backend, que valem para o mês nas faturadas.
  const contador = cobrancasQ.data?.contadores[visao];
  const totalDaAba = contador ? (
    <span className="text-sm text-muted-foreground">
      {plural(contador.quantidade, 'venda', 'vendas')} · <span className="font-medium tabular-nums text-foreground">{formatCurrency(contador.valor)}</span>
    </span>
  ) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cobranças" description="O que já pode ser faturado, o que ainda está em execução e o que já foi lançado no sistema financeiro." />

      <FaixaDaConferencia carregando={conferenciaQ.isLoading} conferencia={conferenciaQ.data} />

      <DataTable
        id="cobrancas"
        data={linhas}
        columns={colunas}
        getRowId={(o) => String(o.ordem_servico_id)}
        getRowHref={(o) => `/cobrancas/${o.ordem_servico_id}`}
        views={views}
        defaultView={VISAO_PADRAO}
        search={{ placeholder: 'Buscar cliente, OS ou referência', fields: (o) => [o.cliente_nome, o.ordem_servico_id, `OS ${o.ordem_servico_id}`, o.referencia_lancamento] }}
        facets={facets}
        periodFilter={PERIODO_DA_VISAO[visao]}
        defaultSort={ORDEM_DA_VISAO[visao]}
        renderRowAction={acaoDaLinha}
        rowActions={acoesDoMenu}
        actionsColumn={{ header: 'Ações', width: '96px' }}
        toolbarActions={visao === 'faturadas' ? <NavegacaoDoMes mes={mes} onMudar={mudarMes} /> : null}
        viewsActions={totalDaAba}
        isLoading={cobrancasQ.isLoading}
        isFetching={cobrancasQ.isFetching && !cobrancasQ.isLoading}
        isError={cobrancasQ.isError}
        onRetry={() => cobrancasQ.refetch()}
        emptyStates={{
          noData: { icon: PartyPopper, title: 'Nada por aqui', description: 'As vendas aparecem aqui assim que são registradas.' },
        }}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        “Aguardando” fica em destaque a partir de {plural(diasAlerta, 'dia', 'dias')} da liberação; o vencimento, a partir de {DIAS_VENCIMENTO_PERTO} dias antes.
      </p>

      <FaturarModal ordemId={faturar} onClose={() => setFaturar(null)} />
    </div>
  );
}

/** Resumo da conferência do faturamento no topo de Cobranças: o que o sistema verificou e o que precisa de atenção. */
function FaixaDaConferencia({ carregando, conferencia }: { carregando: boolean; conferencia: ReturnType<typeof useConferencia>['data'] }) {
  if (carregando || !conferencia) return null;
  const atencoes = conferencia.verificacoes.filter((v) => v.tipo === 'atencao' && v.quantidade > 0);
  const garantiasComFalha = conferencia.verificacoes.filter((v) => v.tipo === 'garantia' && v.quantidade > 0);
  const pontos = atencoes.reduce((s, v) => s + v.quantidade, 0);
  const hora = new Date(conferencia.verificado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ok = !pontos && !garantiasComFalha.length;
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
        garantiasComFalha.length
          ? 'border-danger/40 bg-danger-subtle text-danger-strong'
          : ok
            ? 'border-success/40 bg-success-subtle text-success-strong'
            : 'border-warning/40 bg-warning-subtle text-warning-strong',
      )}
    >
      {ok ? <ShieldCheck className="size-5 shrink-0" aria-hidden /> : <ShieldAlert className="size-5 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1 text-sm">
        <b>
          {garantiasComFalha.length
            ? `Conferência do faturamento: ${plural(garantiasComFalha.reduce((s, v) => s + v.quantidade, 0), 'item', 'itens')} fora de sincronia`
            : ok
              ? 'Tudo conferido'
              : `Conferência do faturamento: ${plural(pontos, 'ponto', 'pontos')} para olhar`}
        </b>
        <span className="opacity-80">
          {' '}
          · verificado às {hora}
          {garantiasComFalha.length ? ' · corrija na conferência' : ' · todo serviço concluído está numa venda liberada ou em execução'}
        </span>
      </span>
      <Button size="sm" variant="outline" className="bg-card text-foreground" asChild>
        <Link to="/cobrancas/conferencia">{ok ? 'Ver conferência' : 'Abrir conferência'}</Link>
      </Button>
    </div>
  );
}
