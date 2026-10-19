import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlarmClock, CheckCheck, Flag, Handshake, PartyPopper, Receipt, SquareArrowOutUpRight, Wrench, Zap } from 'lucide-react';
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
import { AndamentoServicos, PageHeader, PessoaChip, StatusBadge, TIPO_CONDICAO_DEFS, TipoCondicaoBadge } from '@/components/kit';
import { AcaoComIcone } from '@/features/execucao/components/AcaoComIcone';
import { NavegacaoDoMes } from '@/features/execucao/components/NavegacaoDoMes';
import { intervaloDoMes, useMesDosConcluidos } from '@/features/execucao/mesDosConcluidos';
import { FORMA_PAGAMENTO_LABEL } from '@/features/vendas/condicao';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, parseDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FaturarModal } from '../components/FaturarModal';
import { FaturarOperacionalModal } from '../components/FaturarOperacionalModal';
import { OrigemDaCobranca } from '../components/OrigemDaCobranca';
import { ROTULO_DA_ORIGEM, type Origem } from '../operacional';
import { ResumoDaConferencia } from '../components/ResumoDaConferencia';
import { PENDENCIA } from '../conferencia';
import { useCobrancas, useConferencia } from '../hooks';
import type { CodigoDaConferencia, LinhaDeCobranca, LinhaOperacional, SituacaoDeCobranca } from '../services';

/**
 * Cobranças (`/cobrancas`, faturamento/04, wireframe do lote 5 aprovado em 14/10/2026): no padrão de listagem
 * (`DataTable`, como Vendas e o Painel do setor). Abas = situações, sem sobreposição: **Para faturar** (padrão, a
 * fila do financeiro) · **Em execução** (a previsão) · **Faturadas** (por mês). Cada aba tem as suas colunas, uma
 * informação por coluna. "Precisa de atenção" usa as verificações da conferência do faturamento.
 *
 * Desde 19/10/2026 (wireframe `lote7-cobrancas-oso.html`, aprovado): as **OS operacionais** que geram cobrança
 * entram nas mesmas abas, junto das vendas, com a coluna **Origem** e o seletor Todas · Vendas · OS operacionais.
 * A conferência virou um item pequeno no cabeçalho (`ResumoDaConferencia`), no lugar da faixa grande.
 */

type Visao = SituacaoDeCobranca;
type FiltroDeOrigem = 'todas' | Origem;
const VISAO_PADRAO: Visao = 'a_faturar';
const VISOES: Visao[] = ['a_faturar', 'previsao', 'faturadas'];
const DIAS_VENCIMENTO_PERTO = 7;

/** Uma linha da fila: uma venda ou uma OS operacional, com os campos comuns já resolvidos. */
interface ItemDeCobranca {
  chave: string;
  origem: Origem;
  numero: number;
  situacao: SituacaoDeCobranca | null;
  cliente_nome: string;
  liberada_em: string | null;
  dias_aguardando: number | null;
  em_alerta: boolean;
  referencia: string | null;
  faturada_em: string | null;
  faturada_por: string | null;
  pendencias: CodigoDaConferencia[];
  venda?: LinhaDeCobranca;
  oso?: LinhaOperacional;
}

const daVenda = (o: LinhaDeCobranca): ItemDeCobranca => ({
  chave: `venda-${o.ordem_servico_id}`,
  origem: 'venda',
  numero: o.ordem_servico_id,
  situacao: o.situacao,
  cliente_nome: o.cliente_nome,
  liberada_em: o.liberada_para_cobranca_em,
  dias_aguardando: o.dias_aguardando_lancamento,
  em_alerta: o.em_alerta,
  referencia: o.referencia_lancamento,
  faturada_em: o.data_cobranca,
  faturada_por: o.cobranca_realizada_por_nome,
  pendencias: o.pendencias,
  venda: o,
});

const daOperacional = (o: LinhaOperacional): ItemDeCobranca => ({
  chave: `oso-${o.ordem_servico_operacional_id}`,
  origem: 'oso',
  numero: o.ordem_servico_operacional_id,
  situacao: o.situacao,
  cliente_nome: o.cliente_nome,
  liberada_em: o.liberada_para_cobranca_em,
  dias_aguardando: o.dias_aguardando_lancamento,
  em_alerta: o.em_alerta,
  referencia: o.referencia_lancamento,
  faturada_em: o.data_cobranca,
  faturada_por: o.cobranca_realizada_por_nome,
  pendencias: o.pendencias,
  oso: o,
});

const diasAte = (data: string | null | undefined) => {
  const d = parseDate(data);
  if (!d) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const maiusculas = (texto: string) => texto.toLocaleUpperCase('pt-BR');
const NaoSeAplica = () => <span className="text-muted-foreground">—</span>;

const COLUNAS_DA_VISAO: Record<Visao, string[]> = {
  a_faturar: ['origem', 'numero', 'cliente', 'o_que', 'valor', 'condicao', 'vencimento', 'liberada_em', 'liberacao', 'aguardando', 'vendedor', 'forma'],
  previsao: ['origem', 'numero', 'cliente', 'o_que', 'valor', 'condicao', 'vencimento', 'andamento', 'falta', 'com_quem', 'sem_andamento', 'vendedor'],
  faturadas: ['origem', 'numero', 'cliente', 'o_que', 'valor', 'condicao', 'referencia', 'faturada_em', 'faturada_por', 'vendedor'],
};
const ORDEM_DA_VISAO: Record<Visao, { id: string; desc?: boolean }> = {
  a_faturar: { id: 'liberada_em' },
  previsao: { id: 'andamento', desc: true },
  faturadas: { id: 'faturada_em', desc: true },
};
const VENCIMENTO: DataTablePeriodFilter<ItemDeCobranca> = {
  id: 'vencimento',
  label: 'Vencimento',
  getDate: (o) => o.venda?.data_acordada_cobranca,
  presets: ['prox7', 'semana', 'mes', 'mes_passado', 'personalizado'],
};
const PERIODO_DA_VISAO: Record<Visao, DataTablePeriodFilter<ItemDeCobranca>[]> = {
  a_faturar: [{ id: 'liberada', label: 'Liberada em', getDate: (o) => o.liberada_em }, VENCIMENTO],
  previsao: [{ id: 'venda', label: 'Venda ou recebimento', getDate: (o) => o.venda?.data_venda ?? o.oso?.data_recebimento }, VENCIMENTO],
  // Nas faturadas, o período é o mês (ou o período todo) escolhido na barra.
  faturadas: [],
};

export default function CobrancasPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const [faturar, setFaturar] = useState<number | null>(null);
  const [faturarOso, setFaturarOso] = useState<number | null>(null);
  const [origem, setOrigem] = useState<FiltroDeOrigem>('todas');

  const visaoParam = params.get('view') as Visao | null;
  const visao: Visao = visaoParam && VISOES.includes(visaoParam) ? visaoParam : VISAO_PADRAO;

  // Faturadas por mês (`?mes=2026-10` ou `?mes=todo`), como os concluídos da execução: a lista não cresce sem fim.
  const { mes, mudarMes, rotulo } = useMesDosConcluidos();
  const intervalo = useMemo(() => intervaloDoMes(mes), [mes]);
  const cobrancasQ = useCobrancas({ situacao: 'todas', faturada_de: intervalo.de, faturada_ate: intervalo.ate });
  const conferenciaQ = useConferencia();
  const diasAlerta = cobrancasQ.data?.dias_alerta_sem_lancamento ?? 3;

  const todos = useMemo<ItemDeCobranca[] | undefined>(
    // `?? []`: um backend anterior a 19/10/2026 não manda as OS operacionais; a tela segue só com as vendas.
    () => (cobrancasQ.data ? [...cobrancasQ.data.ordens.map(daVenda), ...(cobrancasQ.data.operacionais ?? []).map(daOperacional)] : undefined),
    [cobrancasQ.data],
  );
  const linhas = useMemo(() => (origem === 'todas' ? todos : todos?.filter((o) => o.origem === origem)), [todos, origem]);

  const views = useMemo<DataTableView<ItemDeCobranca>[]>(
    () => [
      { id: 'a_faturar', label: 'Para faturar', filter: (o) => o.situacao === 'a_faturar' },
      { id: 'previsao', label: 'Em execução', filter: (o) => o.situacao === 'previsao' },
      { id: 'faturadas', label: rotulo('Faturadas'), filter: (o) => o.situacao === 'faturadas' },
    ],
    [rotulo],
  );

  /* ── Colunas: uma informação por coluna; o que não se aplica à OS operacional fica com "—" ── */
  const todasAsColunas = useMemo<DataTableColumn<ItemDeCobranca>[]>(
    () => [
      col.custom<ItemDeCobranca>('origem', 'Origem', {
        accessor: (o) => ROTULO_DA_ORIGEM[o.origem],
        sortingFn: 'textPtBr',
        width: '150px',
        cell: (o) => <OrigemDaCobranca origem={o.origem} />,
      }),
      col.custom<ItemDeCobranca>('numero', 'Nº', {
        accessor: (o) => o.numero,
        width: '80px',
        cell: (o) => <span className="font-semibold tabular-nums">{o.numero}</span>,
      }),
      col.custom<ItemDeCobranca>('cliente', 'Cliente', {
        accessor: (o) => o.cliente_nome,
        sortingFn: 'textPtBr',
        cell: (o) => <CellTexto value={maiusculas(o.cliente_nome)} className="max-w-[24rem] font-medium text-foreground" />,
      }),
      col.custom<ItemDeCobranca>('o_que', 'O que cobrar', {
        accessor: (o) => (o.oso ? o.oso.catalogo_operacional_nome : o.venda?.andamento.total),
        width: '260px',
        cell: (o) =>
          o.oso ? (
            <span className="flex max-w-64 items-center gap-1.5" title={o.oso.descricao ?? undefined}>
              <span className="truncate font-semibold">{maiusculas(o.oso.catalogo_operacional_nome)}</span>
              {o.oso.quantidade > 1 ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">× {o.oso.quantidade}</span> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">{plural(o.venda?.andamento.total ?? 0, 'serviço', 'serviços')}</span>
          ),
      }),
      col.custom<ItemDeCobranca>('valor', 'Valor', {
        accessor: (o) => (o.venda ? Number(o.venda.valor) : undefined),
        width: '170px',
        align: 'right',
        financial: true,
        cell: (o) =>
          o.venda ? (
            <span className="tabular-nums">{formatCurrency(o.venda.valor)}</span>
          ) : (
            <span className="text-xs italic text-muted-foreground" title="A OS operacional não tem valor no sistema.">
              Definido no lançamento
            </span>
          ),
      }),
      col.custom<ItemDeCobranca>('condicao', 'Condição', {
        accessor: (o) => o.venda?.tipo_condicao,
        width: '150px',
        // Só o tipo (e as parcelas); o texto completo da condição fica no title e no resumo.
        cell: (o) =>
          o.venda ? (
            <span className="inline-flex items-center gap-1.5" title={o.venda.condicao_resumo}>
              <TipoCondicaoBadge value={o.venda.tipo_condicao} />
              {o.venda.tipo_condicao === 'parcelado' && o.venda.quantidade_parcelas ? (
                <span className="text-xs tabular-nums text-muted-foreground">{o.venda.quantidade_parcelas}x</span>
              ) : null}
            </span>
          ) : (
            <NaoSeAplica />
          ),
      }),
      col.custom<ItemDeCobranca>('vencimento', 'Vencimento', {
        accessor: (o) =>
          o.venda?.data_acordada_cobranca ?? (o.venda?.vencimento_dias_apos_nota ? `9999-${o.venda.vencimento_dias_apos_nota}` : undefined),
        width: '170px',
        cell: (o) => {
          const v = o.venda;
          if (!v) return <NaoSeAplica />;
          const dias = diasAte(v.data_acordada_cobranca);
          const perto = v.situacao !== 'faturadas' && dias !== null && dias <= DIAS_VENCIMENTO_PERTO;
          const dica = dias === null ? undefined : dias < 0 ? `Venceu há ${plural(-dias, 'dia', 'dias')}` : dias === 0 ? 'Vence hoje' : `Vence em ${plural(dias, 'dia', 'dias')}`;
          return v.vencimento_resumo ? (
            <span className={cn('tabular-nums', perto && 'font-medium text-warning-strong')} title={dica}>
              {v.vencimento_resumo}
            </span>
          ) : (
            <span className="text-muted-foreground">Não informado</span>
          );
        },
      }),
      col.data<ItemDeCobranca>('liberada_em', 'Liberada em', (o) => o.liberada_em, { width: '120px' }),
      col.custom<ItemDeCobranca>('liberacao', 'Liberação', {
        accessor: (o) => (o.oso ? 'oso' : o.venda?.liberar_em),
        width: '200px',
        // Pela regra: liberação na venda = imediata; na conclusão = quando o último serviço terminou; OSO = ao finalizar.
        cell: (o) =>
          o.oso ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2.5 text-xs font-medium text-success-strong" title="Liberada quando a OS operacional foi finalizada.">
              <Flag className="size-3.5" aria-hidden /> OS operacional finalizada
            </span>
          ) : o.venda?.liberar_em === 'venda' ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2.5 text-xs font-medium text-warning-strong" title="Liberada na venda: pode faturar antes de os serviços terminarem.">
              <Zap className="size-3.5" aria-hidden /> Na venda
            </span>
          ) : (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2.5 text-xs font-medium text-success-strong" title="Liberada quando o último serviço foi concluído.">
              <CheckCheck className="size-3.5" aria-hidden /> Serviços concluídos
            </span>
          ),
      }),
      col.custom<ItemDeCobranca>('aguardando', 'Aguardando', {
        accessor: (o) => o.dias_aguardando ?? undefined,
        width: '130px',
        cell: (o) => {
          const d = o.dias_aguardando ?? 0;
          return o.em_alerta ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2.5 text-xs font-medium text-warning-strong">
              <AlarmClock className="size-3.5" aria-hidden /> {plural(d, 'dia', 'dias')}
            </span>
          ) : (
            <span className="tabular-nums text-muted-foreground">{d === 0 ? 'Liberada hoje' : plural(d, 'dia', 'dias')}</span>
          );
        },
      }),
      col.custom<ItemDeCobranca>('andamento', 'Andamento', {
        accessor: (o) => (o.venda ? (o.venda.andamento.total ? o.venda.andamento.concluido / o.venda.andamento.total : undefined) : o.oso?.status === 'em_andamento' ? 0.5 : 0),
        width: '170px',
        cell: (o) => (o.venda ? <AndamentoServicos andamento={o.venda.andamento} /> : <StatusBadge entity="oso" value={o.oso?.status} />),
      }),
      col.custom<ItemDeCobranca>('falta', 'Falta', {
        accessor: (o) => o.venda?.pendentes[0]?.servico_nome,
        sortingFn: 'textPtBr',
        // O serviço que falta (o mais parado), com o setor; com mais de um, "+N" (todos no title).
        cell: (o) => {
          const [primeiro, ...outros] = o.venda?.pendentes ?? [];
          if (!primeiro) return <NaoSeAplica />;
          return (
            <span className="grid max-w-64" title={o.venda!.pendentes.map((p) => `${p.servico_nome}${p.setor_nome ? ` (${p.setor_nome})` : ''}`).join('\n')}>
              <span className="flex items-center gap-1.5">
                <span className="truncate font-semibold uppercase">{primeiro.servico_nome}</span>
                {outros.length ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{outros.length}</span> : null}
              </span>
              {primeiro.setor_nome ? <span className="truncate text-xs text-muted-foreground">{primeiro.setor_nome}</span> : null}
            </span>
          );
        },
      }),
      col.custom<ItemDeCobranca>('com_quem', 'Com quem', {
        accessor: (o) => (o.oso ? o.oso.responsavel_nome : o.venda?.pendentes[0]?.responsaveis[0] ?? (o.venda?.pendentes.length ? '' : undefined)),
        sortingFn: 'textPtBr',
        width: '200px',
        cell: (o) => {
          if (o.oso) return o.oso.responsavel_nome ? <PessoaChip nome={o.oso.responsavel_nome} variant="full" className="max-w-52 truncate" /> : <NaoSeAplica />;
          const primeiro = o.venda?.pendentes[0];
          if (!primeiro) return <NaoSeAplica />;
          if (!primeiro.responsaveis.length) return <span className="whitespace-nowrap font-medium text-warning-strong">Sem distribuir</span>;
          return (
            <span className="flex max-w-52 items-center gap-1.5" title={primeiro.responsaveis.join(', ')}>
              <PessoaChip nome={primeiro.responsaveis[0]} variant="full" className="min-w-0 truncate" />
              {primeiro.responsaveis.length > 1 ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{primeiro.responsaveis.length - 1}</span> : null}
            </span>
          );
        },
      }),
      col.custom<ItemDeCobranca>('sem_andamento', 'Sem andamento há', {
        accessor: (o) => (o.oso ? o.oso.dias_sem_movimentacao : o.venda?.pendentes[0]?.dias_sem_movimentacao) ?? undefined,
        width: '150px',
        cell: (o) => {
          const d = o.oso ? o.oso.dias_sem_movimentacao : o.venda?.pendentes[0]?.dias_sem_movimentacao;
          if (d === null || d === undefined) return <NaoSeAplica />;
          return <span className={cn('tabular-nums', d >= 7 ? 'font-medium text-warning-strong' : 'text-muted-foreground')}>{d === 0 ? 'Mexeu hoje' : plural(d, 'dia', 'dias')}</span>;
        },
      }),
      col.custom<ItemDeCobranca>('referencia', 'Referência', {
        accessor: (o) => o.referencia ?? undefined,
        sortingFn: 'textPtBr',
        width: '160px',
        cell: (o) =>
          o.referencia ? (
            <CellTexto value={o.referencia} />
          ) : o.oso ? (
            <span className="font-medium text-warning-strong" title="Faturada sem a NF ou o código do lançamento.">Não informada</span>
          ) : (
            <NaoSeAplica />
          ),
      }),
      col.data<ItemDeCobranca>('faturada_em', 'Faturada em', (o) => o.faturada_em, { width: '120px' }),
      {
        ...col.pessoa<ItemDeCobranca>('faturada_por', 'Faturada por', (o) => o.faturada_por, { width: '200px' }),
        cell: ({ row }) => <PessoaChip nome={row.original.faturada_por} variant="full" />,
      },
      {
        ...col.pessoa<ItemDeCobranca>('vendedor', 'Vendido por', (o) => o.venda?.vendido_por_nome, { width: '200px', priority: 3 }),
        cell: ({ row }) => (row.original.venda ? <PessoaChip nome={row.original.venda.vendido_por_nome} variant="full" /> : <NaoSeAplica />),
      },
      col.custom<ItemDeCobranca>('forma', 'Forma', {
        accessor: (o) => (o.venda ? FORMA_PAGAMENTO_LABEL[o.venda.forma_pagamento] : undefined),
        sortingFn: 'textPtBr',
        width: '130px',
        priority: 3,
        cell: (o) => (o.venda ? FORMA_PAGAMENTO_LABEL[o.venda.forma_pagamento] : <NaoSeAplica />),
      }),
    ],
    [],
  );
  const colunas = useMemo(() => COLUNAS_DA_VISAO[visao].map((id) => todasAsColunas.find((c) => c.id === id)!), [visao, todasAsColunas]);

  /* ── Filtros: "Precisa de atenção" vem da conferência ── */
  const facets = useMemo<DataTableFacet<ItemDeCobranca>[]>(() => {
    const atencao = (Object.entries(PENDENCIA) as [keyof typeof PENDENCIA, (typeof PENDENCIA)[keyof typeof PENDENCIA]][])
      .filter(([, p]) => p.situacao === visao)
      .map(([value, p]) => ({ value, label: p.rotulo }));
    return [
      ...(atencao.length ? [{ columnId: 'atencao', label: 'Precisa de atenção', getValue: (o: ItemDeCobranca) => o.pendencias, options: atencao }] : []),
      { columnId: 'cliente', label: 'Cliente', getValue: (o) => maiusculas(o.cliente_nome), searchable: true },
      {
        columnId: 'condicao',
        label: 'Condição',
        getValue: (o) => o.venda?.tipo_condicao,
        options: Object.entries(TIPO_CONDICAO_DEFS).map(([value, d]) => ({ value, label: d.label })),
      },
      { columnId: 'vendedor', label: 'Vendido por', getValue: (o) => o.venda?.vendido_por_nome, searchable: true },
      ...(visao === 'a_faturar'
        ? [{
            columnId: 'liberacao',
            label: 'Liberação',
            getValue: (o: ItemDeCobranca) => (o.oso ? 'oso' : o.venda?.liberar_em),
            options: [
              { value: 'venda', label: 'Na venda' },
              { value: 'conclusao', label: 'Serviços concluídos' },
              { value: 'oso', label: 'OS operacional finalizada' },
            ],
          }]
        : []),
    ];
  }, [visao]);

  /* ── Ações ── */
  const abrir = (o: ItemDeCobranca) => (o.oso ? `/cobrancas/operacionais/${o.numero}` : `/cobrancas/${o.numero}`);
  const acaoDaLinha = (o: ItemDeCobranca) => {
    if (o.situacao !== 'a_faturar') return null;
    return o.oso ? (
      <AcaoComIcone rotulo={`Faturar a OS operacional ${o.numero}`} icone={Receipt} onClick={() => setFaturarOso(o.numero)} />
    ) : (
      <AcaoComIcone rotulo={`Faturar a OS ${o.numero}`} icone={Receipt} onClick={() => setFaturar(o.numero)} />
    );
  };
  const acoesDoMenu = (o: ItemDeCobranca): DataTableRowAction<ItemDeCobranca>[] => [
    { label: 'Abrir o resumo para faturar', icon: SquareArrowOutUpRight, onSelect: () => navigate(abrir(o)) },
    ...(o.venda && veVendas ? [{ label: 'Abrir a venda', icon: Handshake, onSelect: () => navigate(`/vendas/${o.numero}`) }] : []),
  ];

  // O total da aba, ao lado das abas: os contadores do backend (nas faturadas, do mês), separados por origem.
  const contador = cobrancasQ.data?.contadores[visao];
  const operacionais = cobrancasQ.data?.contadores_operacionais?.[visao] ?? 0;
  const totalDaAba = contador ? (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      {origem !== 'oso' ? (
        <span>
          {plural(contador.quantidade, 'venda', 'vendas')} · <span className="font-medium tabular-nums text-foreground">{formatCurrency(contador.valor)}</span>
        </span>
      ) : null}
      {origem === 'todas' ? <span aria-hidden>·</span> : null}
      {origem !== 'venda' ? <span>{plural(operacionais, 'OS operacional', 'OS operacionais')}</span> : null}
    </span>
  ) : null;

  // Quantas de cada origem na aba atual, para o seletor.
  const naAba = (filtro: FiltroDeOrigem) => (todos ?? []).filter((o) => o.situacao === visao && (filtro === 'todas' || o.origem === filtro)).length;
  const seletorDeOrigem = (
    <span className="inline-flex h-8 items-center rounded-md border p-0.5" role="group" aria-label="Origem da cobrança">
      {([
        ['todas', 'Todas', null],
        ['venda', 'Vendas', Handshake],
        ['oso', 'OS operacionais', Wrench],
      ] as const).map(([valor, texto, Icone]) => (
        <button
          key={valor}
          type="button"
          aria-pressed={origem === valor}
          onClick={() => setOrigem(valor)}
          className={cn(
            'inline-flex h-full items-center gap-1.5 rounded px-2.5 text-xs font-medium',
            origem === valor ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {Icone ? <Icone className="size-3.5" aria-hidden /> : null}
          {texto}
          <span className="tabular-nums text-muted-foreground">{naAba(valor)}</span>
        </button>
      ))}
    </span>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cobranças"
        description="Vendas e OS operacionais que já podem ser faturadas, o que ainda está em execução e o que já foi lançado no sistema financeiro."
        actions={
          <ResumoDaConferencia
            conferencia={conferenciaQ.data}
            carregando={conferenciaQ.isLoading}
            atualizando={conferenciaQ.isFetching}
            onVerificar={() => conferenciaQ.refetch()}
          />
        }
      />

      <DataTable
        id="cobrancas"
        data={linhas}
        columns={colunas}
        getRowId={(o) => o.chave}
        getRowHref={abrir}
        views={views}
        defaultView={VISAO_PADRAO}
        search={{
          placeholder: 'Buscar cliente, nº ou referência',
          fields: (o) => [
            o.cliente_nome,
            o.numero,
            o.oso ? `OSO ${o.numero}` : `OS ${o.numero}`,
            o.referencia,
            o.oso?.catalogo_operacional_nome,
          ],
        }}
        facets={facets}
        periodFilter={PERIODO_DA_VISAO[visao]}
        defaultSort={ORDEM_DA_VISAO[visao]}
        renderRowAction={acaoDaLinha}
        rowActions={acoesDoMenu}
        actionsColumn={{ header: 'Ações', width: '96px' }}
        toolbarActions={visao === 'faturadas' ? <NavegacaoDoMes mes={mes} onMudar={mudarMes} /> : null}
        // O seletor de origem fica na linha das abas, ao lado do total, para a barra de filtros caber numa linha.
        viewsActions={
          <>
            {totalDaAba}
            {seletorDeOrigem}
          </>
        }
        isLoading={cobrancasQ.isLoading}
        isFetching={cobrancasQ.isFetching && !cobrancasQ.isLoading}
        isError={cobrancasQ.isError}
        onRetry={() => cobrancasQ.refetch()}
        emptyStates={{
          noData: { icon: PartyPopper, title: 'Nada por aqui', description: 'As vendas e as OS operacionais que geram cobrança aparecem aqui.' },
        }}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        “Aguardando” fica em destaque a partir de {plural(diasAlerta, 'dia', 'dias')} da liberação; o vencimento, a partir de {DIAS_VENCIMENTO_PERTO} dias antes. A OS
        operacional não tem valor no sistema: o valor é definido no lançamento.
      </p>

      <FaturarModal ordemId={faturar} onClose={() => setFaturar(null)} />
      <FaturarOperacionalModal id={faturarOso} onClose={() => setFaturarOso(null)} />
    </div>
  );
}
