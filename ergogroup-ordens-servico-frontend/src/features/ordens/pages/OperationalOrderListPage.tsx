import { useMemo, useState } from 'react';
import { CircleSlash, Pencil, Plus, Receipt, Wrench } from 'lucide-react';
import {
  DataTable,
  col,
  type DataTableFacet,
  type DataTablePeriodFilter,
  type DataTableRowAction,
  type DataTableView,
} from '@/components/data-table';
import { COBRANCA_DEFS, CobrancaBadge, PageHeader, PessoaChip, ToneBadge, getCobrancaSituacao } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { usePermissoes } from '@/hooks/usePermissoes';
import { parseDate } from '@/lib/format';
import { AcaoComIcone } from '@/features/execucao/components/AcaoComIcone';
import { useOperationalOrderList } from '../hooksOperacional';
import type { OperationalOrderItem } from '../servicesOperacional';
import { OperationalOrderForm } from '../components/OperationalOrderForm';
import { FaturarOperacionalModal } from '@/features/financeiro/components/FaturarOperacionalModal';

type SituacaoDeCobranca = 'nao_gera' | 'nao_liberada' | 'liberada' | 'cobrada';

const SITUACAO_DE_COBRANCA: { value: SituacaoDeCobranca; label: string }[] = [
  { value: 'nao_gera', label: 'Não gera cobrança' },
  { value: 'nao_liberada', label: 'Não liberada' },
  { value: 'liberada', label: 'A cobrar' },
  { value: 'cobrada', label: 'Cobrada' },
];

/** A regra de cobrança vem fotografada do catálogo operacional (ADR 0011); a liberação acontece ao finalizar. */
const situacaoDeCobranca = (o: OperationalOrderItem): SituacaoDeCobranca =>
  o.geraCobranca
    ? getCobrancaSituacao({ liberada: !!o.dataLiberacaoCobranca, cobrada: o.cobrancaRealizada })
    : 'nao_gera';

const NAO_GERA_COBRANCA = { tone: 'neutral', icon: CircleSlash, label: 'Não gera cobrança' } as const;

/** A referência do lançamento; nas cobranças antigas, a NF do campo anterior ("0" não conta). */
const referenciaDaCobranca = (o: OperationalOrderItem) =>
  o.referenciaLancamento || (o.numeroNf && o.numeroNf.trim() !== '0' ? `NF ${o.numeroNf.trim()}` : undefined);

function Cobranca({ item }: { item: OperationalOrderItem }) {
  if (!item.geraCobranca) return <ToneBadge def={NAO_GERA_COBRANCA} />;
  if (item.cobrancaRealizada) return <ToneBadge def={COBRANCA_DEFS.cobrada} suffix={referenciaDaCobranca(item)} />;
  return <CobrancaBadge liberada={!!item.dataLiberacaoCobranca} cobrada={false} />;
}

/** Nomes do cliente e do item do catálogo operacional aparecem sempre em maiúsculas, como no cadastro. */
const nomeDoCliente = (o: OperationalOrderItem) => o.clienteNome.toLocaleUpperCase('pt-BR');
const nomeDoServico = (o: OperationalOrderItem) => o.catalogoOperacionalNome.toLocaleUpperCase('pt-BR');

const finalizada = (o: OperationalOrderItem) => o.status === 'finalizada';

const atrasada = (o: OperationalOrderItem) => {
  const prazo = parseDate(o.prazo);
  if (!prazo || finalizada(o)) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return prazo < hoje;
};

const VIEWS: DataTableView<OperationalOrderItem>[] = [
  { id: 'abertas', label: 'Em aberto', filter: (o) => !finalizada(o) },
  { id: 'atrasadas', label: 'Atrasadas', filter: atrasada, tone: 'danger' },
  { id: 'a_cobrar', label: 'A cobrar', filter: (o) => situacaoDeCobranca(o) === 'liberada' },
  { id: 'finalizadas', label: 'Finalizadas', filter: finalizada },
  { id: 'todas', label: 'Todas' },
];

const FACETS: DataTableFacet<OperationalOrderItem>[] = [
  { columnId: 'cliente', label: 'Cliente', getValue: (o) => nomeDoCliente(o), searchable: true },
  { columnId: 'servico', label: 'Serviço', getValue: (o) => nomeDoServico(o), searchable: true },
  { columnId: 'responsavel', label: 'Responsável', getValue: (o) => o.responsavelNome, searchable: true },
  { columnId: 'status', label: 'Status' },
  { columnId: 'prioridade', label: 'Prioridade' },
  { columnId: 'cobranca', label: 'Cobrança', getValue: situacaoDeCobranca, options: SITUACAO_DE_COBRANCA },
];

const PERIODOS: DataTablePeriodFilter<OperationalOrderItem>[] = [
  { id: 'recebimento', label: 'Recebimento', getDate: (o) => o.dataRecebimento },
];

const OperationalOrderListPage = () => {
  const { pode } = usePermissoes();
  const podeGerenciar = pode('os_operacional.gerenciar');
  const podeRegistrarCobranca = pode('financeiro.registrar_cobranca');
  const osoQ = useOperationalOrderList();

  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [faturar, setFaturar] = useState<number | null>(null);

  const nova = () => {
    setEditId(null);
    setFormAberto(true);
  };
  const editar = (o: OperationalOrderItem) => {
    setEditId(o.id);
    setFormAberto(true);
  };

  const columns = useMemo(
    () => [
      col.registro<OperationalOrderItem>('cliente', 'Cliente', {
        title: (o) => nomeDoCliente(o) || '—',
        subtitle: (o) => `OSO ${o.id}`,
      }),
      col.texto<OperationalOrderItem>('servico', 'Serviço', nomeDoServico, { width: '240px' }),
      {
        ...col.pessoa<OperationalOrderItem>('responsavel', 'Responsável', (o) => o.responsavelNome, { width: '200px' }),
        cell: ({ row }: { row: { original: OperationalOrderItem } }) => (
          <PessoaChip nome={row.original.responsavelNome} variant="full" />
        ),
      },
      col.status<OperationalOrderItem>('status', 'Status', (o) => o.status, { entity: 'oso' }),
      col.prioridade<OperationalOrderItem>('prioridade', 'Prioridade', (o) => o.prioridade, { priority: 2 }),
      col.data<OperationalOrderItem>('recebimento', 'Recebimento', (o) => o.dataRecebimento),
      col.prazo<OperationalOrderItem>('prazo', 'Prazo', (o) => o.prazo, { encerrado: finalizada, priority: 3 }),
      col.custom<OperationalOrderItem>('cobranca', 'Cobrança', {
        width: '190px',
        accessor: (o) => SITUACAO_DE_COBRANCA.findIndex((s) => s.value === situacaoDeCobranca(o)),
        cell: (o) => <Cobranca item={o} />,
      }),
    ],
    [],
  );

  const acaoDaLinha = (o: OperationalOrderItem) =>
    podeRegistrarCobranca && situacaoDeCobranca(o) === 'liberada' ? (
      <AcaoComIcone rotulo={`Registrar a cobrança da OSO ${o.id}`} icone={Receipt} onClick={() => setFaturar(o.id)} />
    ) : null;
  const acoesDoMenu = (o: OperationalOrderItem): DataTableRowAction<OperationalOrderItem>[] => [
    { label: 'Editar', icon: Pencil, onSelect: () => editar(o) },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="OS operacionais"
        count={osoQ.isPending ? null : osoQ.data?.length ?? 0}
        description="As demandas operacionais de cada cliente e a cobrança gerada pela regra do catálogo operacional."
        actions={
          podeGerenciar && (
            <Button onClick={nova}>
              <Plus className="size-4" /> Nova OS operacional
            </Button>
          )
        }
      />

      <DataTable
        id="os-operacionais"
        data={osoQ.data}
        columns={columns}
        getRowId={(o) => String(o.id)}
        onRowClick={podeGerenciar ? editar : undefined}
        views={VIEWS}
        search={{
          placeholder: 'Buscar por cliente, serviço, responsável, número ou NF',
          fields: (o) => [o.clienteNome, o.catalogoOperacionalNome, o.responsavelNome, o.id, `OSO ${o.id}`, referenciaDaCobranca(o)],
        }}
        facets={FACETS}
        periodFilter={PERIODOS}
        defaultSort={{ id: 'recebimento', desc: true }}
        renderRowAction={acaoDaLinha}
        rowActions={podeGerenciar ? acoesDoMenu : undefined}
        isLoading={osoQ.isPending}
        isFetching={osoQ.isFetching && !osoQ.isPending}
        isError={osoQ.isError}
        onRetry={() => osoQ.refetch()}
        emptyStates={{
          noData: {
            icon: Wrench,
            title: 'Nenhuma OS operacional',
            description: 'Registre as demandas operacionais dos clientes para acompanhar a execução e a cobrança.',
            action: podeGerenciar ? (
              <Button onClick={nova}>
                <Plus className="size-4" /> Nova OS operacional
              </Button>
            ) : undefined,
          },
        }}
      />

      <OperationalOrderForm
        open={podeGerenciar && formAberto}
        onOpenChange={(aberto) => {
          setFormAberto(aberto);
          if (!aberto) setEditId(null);
        }}
        editId={editId}
      />

      <FaturarOperacionalModal id={faturar} onClose={() => setFaturar(null)} />
    </div>
  );
};

export default OperationalOrderListPage;
