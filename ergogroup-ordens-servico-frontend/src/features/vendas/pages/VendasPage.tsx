import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Plus } from 'lucide-react';
import { DataTable, col, type DataTableColumn, type DataTableFacet, type DataTablePeriodFilter, type DataTableView } from '@/components/data-table';
import { AndamentoServicos, PageHeader, PessoaChip, SITUACAO_FINANCEIRA_DEFS, SituacaoFinanceiraBadge, TIPO_CONDICAO_DEFS, TipoCondicaoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useVendas } from '../hooks';
import type { VendaDaLista } from '../services';

/**
 * Vendas (`/vendas`): cada venda com o andamento da execução, no padrão de listagem
 * (docs/ui/design-system-tabelas.md): visões com contagem, filtros facetados, ordenação e paginação.
 * Os antigos indicadores clicáveis viraram as visões (revisão de 13/10/2026, fluxos-e-navegacao.md §6.4).
 */

type SituacaoFin = keyof typeof SITUACAO_FINANCEIRA_DEFS;

const situacaoFin = (v: VendaDaLista): SituacaoFin => (v.cobranca_realizada ? 'faturadas' : v.liberada_para_cobranca ? 'a_faturar' : 'previsao');
const ordemFin = Object.keys(SITUACAO_FINANCEIRA_DEFS) as SituacaoFin[];
const opcoes = (defs: Record<string, { label: string }>) => Object.entries(defs).map(([value, d]) => ({ value, label: d.label }));

const VIEWS: DataTableView<VendaDaLista>[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'fila', label: 'Para distribuir', filter: (v) => v.andamento.novo + v.andamento.a_distribuir > 0 },
  { id: 'execucao', label: 'Em execução', filter: (v) => v.status === 'em_andamento' },
  { id: 'concluidas', label: 'Concluídas', filter: (v) => v.status === 'concluida' },
];

const PERIODO: DataTablePeriodFilter<VendaDaLista> = { id: 'venda', label: 'Data da venda', getDate: (v) => v.data_venda };

const COLUNAS: DataTableColumn<VendaDaLista>[] = [
  {
    id: 'os',
    header: 'OS',
    accessorFn: (v) => v.id,
    cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.id}</span>,
    sortingFn: 'basic',
    meta: { label: 'OS', width: '80px' },
  },
  col.texto<VendaDaLista>('cliente', 'Cliente', (v) => v.cliente_nome),
  col.data<VendaDaLista>('venda', 'Venda', (v) => v.data_venda),
  {
    ...col.pessoa<VendaDaLista>('vendedor', 'Vendedor', (v) => v.vendido_por_nome, { width: '200px' }),
    cell: ({ row }) => <PessoaChip nome={row.original.vendido_por_nome} variant="full" />,
  },
  {
    id: 'andamento',
    header: 'Andamento',
    accessorFn: (v) => (v.andamento.total ? v.andamento.concluido / v.andamento.total : undefined),
    cell: ({ row }) => <AndamentoServicos andamento={row.original.andamento} />,
    sortingFn: 'basic',
    sortUndefined: 'last',
    meta: { label: 'Andamento', width: '170px' },
  },
  col.status<VendaDaLista>('status', 'Status', (v) => v.status, { entity: 'os' }),
  {
    id: 'condicao',
    header: 'Condição',
    accessorFn: (v) => v.tipo_condicao,
    cell: ({ row }) => (
      <span title={row.original.condicao_resumo}>
        <TipoCondicaoBadge value={row.original.tipo_condicao} />
      </span>
    ),
    sortingFn: 'textPtBr',
    meta: { label: 'Condição', width: '140px', financial: true },
  },
  col.moeda<VendaDaLista>('valor', 'Valor', (v) => v.valor),
  {
    id: 'financeiro',
    header: 'Financeiro',
    accessorFn: (v) => ordemFin.indexOf(situacaoFin(v)),
    cell: ({ row }) => <SituacaoFinanceiraBadge value={situacaoFin(row.original)} />,
    sortingFn: 'basic',
    meta: { label: 'Financeiro', width: '140px', financial: true },
  },
];

export default function VendasPage() {
  const { pode } = usePermissoes();
  const { displayName } = useCurrentUser();
  const veValores = pode('financeiro.ver_valores');
  const gerencia = pode('os.gerenciar');
  const vendasQ = useVendas({});
  const vendas = vendasQ.data;

  // "Minhas vendas" no topo do filtro Vendedor, para quem registra vendas.
  const facets = useMemo<DataTableFacet<VendaDaLista>[]>(() => {
    const vendedores = [...new Set((vendas ?? []).map((v) => v.vendido_por_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const meu = gerencia && vendedores.includes(displayName) ? displayName : null;
    return [
      {
        columnId: 'vendedor',
        label: 'Vendedor',
        getValue: (v) => v.vendido_por_nome,
        options: [...(meu ? [{ value: meu, label: 'Minhas vendas' }] : []), ...vendedores.filter((p) => p !== meu).map((p) => ({ value: p, label: p }))],
        searchable: vendedores.length > 8,
      },
      { columnId: 'cliente', label: 'Cliente', getValue: (v) => v.cliente_nome, searchable: true },
      { columnId: 'status', label: 'Status' },
      ...(veValores
        ? [
            { columnId: 'condicao', label: 'Condição', getValue: (v: VendaDaLista) => v.tipo_condicao, options: opcoes(TIPO_CONDICAO_DEFS) },
            { columnId: 'financeiro', label: 'Financeiro', getValue: situacaoFin, options: opcoes(SITUACAO_FINANCEIRA_DEFS) },
          ]
        : []),
    ];
  }, [vendas, gerencia, displayName, veValores]);

  const novaVenda = gerencia ? (
    <Button asChild>
      <Link to="/vendas/nova">
        <Plus className="size-4" /> Nova venda
      </Link>
    </Button>
  ) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Vendas" description="Cada venda com o andamento da execução nos setores." actions={novaVenda} />
      <DataTable
        id="vendas"
        data={vendas}
        columns={COLUNAS}
        getRowId={(v) => String(v.id)}
        getRowHref={(v) => `/vendas/${v.id}`}
        views={VIEWS}
        search={{ placeholder: 'Buscar por cliente ou nº da OS', fields: (v) => [v.cliente_nome, v.id, `OS ${v.id}`] }}
        facets={facets}
        periodFilter={PERIODO}
        defaultSort={{ id: 'os', desc: true }}
        isLoading={vendasQ.isLoading}
        isFetching={vendasQ.isFetching}
        isError={vendasQ.isError}
        onRetry={() => vendasQ.refetch()}
        emptyStates={{
          noData: {
            icon: Handshake,
            title: 'Nenhuma venda registrada',
            description: 'As vendas registradas aparecem aqui com o andamento de cada serviço.',
            action: novaVenda ?? undefined,
          },
        }}
      />
      {!veValores ? (
        <p className="mt-3 text-xs text-muted-foreground">Condição, valor e situação financeira aparecem só para quem vê valores.</p>
      ) : null}
    </div>
  );
}
