import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Pencil, Plus, Power, Receipt, Trash2 } from 'lucide-react';
import {
  CellTexto,
  DataTable,
  col,
  type DataTableFacet,
  type DataTablePeriodFilter,
  type DataTableRowAction,
  type FacetOption,
} from '@/components/data-table';
import { PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDocumento } from '@/lib/format';
import { ClienteExclusaoModal, type EtapaExclusao } from '../components/ClienteExclusaoModal';
import { useClientesDaLista, useMudarAtivoCliente } from '../hooks';
import type { ClienteDaLista, TipoCliente, TipoInscricao } from '../services';

const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  gestao: 'Gestão',
  avulso: 'Avulso',
  fornecedor: 'Fornecedor',
};

const TIPO_INSCRICAO_LABEL: Record<TipoInscricao, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  cei: 'CEI',
  cno: 'CNO',
  caepf: 'CAEPF',
};

const opcoes = (labels: Record<string, string>): FacetOption[] => Object.entries(labels).map(([value, label]) => ({ value, label }));

const tipoCliente = (c: ClienteDaLista) => (c.tipo_cliente ? TIPO_CLIENTE_LABEL[c.tipo_cliente as TipoCliente] : null);
const documento = (c: ClienteDaLista) => formatDocumento(c.tipo_inscricao, c.numero_inscricao);

/** Vendas filtrada pelo cliente. O filtro da URL separa valores por vírgula; nome com vírgula vai pela busca. */
const linkDasVendas = (c: ClienteDaLista) =>
  c.nome.includes(',')
    ? `/vendas?view=todas&q=${encodeURIComponent(c.nome)}`
    : `/vendas?view=todas&f.cliente=${encodeURIComponent(c.nome)}`;

const PERIODO: DataTablePeriodFilter<ClienteDaLista> = { id: 'desde', label: 'Cliente desde', getDate: (c) => c.data_criacao };

const ClientListPage = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const podeGerenciar = pode('clientes.gerenciar');
  const podeVerVendas = pode('os.gerenciar') || pode('os.ver_todas');

  const clientesQ = useClientesDaLista();
  const clientes = useMemo(() => clientesQ.data ?? [], [clientesQ.data]);
  const mudarAtivo = useMudarAtivoCliente();
  const [exclusao, setExclusao] = useState<EtapaExclusao | null>(null);

  const alterarAtivo = (c: ClienteDaLista, ativo: boolean) =>
    mudarAtivo.mutate(
      { id: c.id, ativo },
      {
        onSuccess: () => toast({ title: ativo ? 'Cliente reativado' : 'Cliente desativado', description: c.nome }),
        onError: (error) => toast({ title: 'Não foi possível alterar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  const columns = useMemo(
    () => [
      col.registro<ClienteDaLista>('nome', 'Cliente', { title: (c) => c.nome }),
      col.custom<ClienteDaLista>('documento', 'Documento', {
        accessor: documento,
        cell: (c) => <CellTexto value={documento(c)} className="tabular-nums" />,
        sortingFn: 'textPtBr',
        width: '220px',
      }),
      col.texto<ClienteDaLista>('tipo', 'Tipo', tipoCliente, { width: '120px' }),
      col.texto<ClienteDaLista>('representante', 'Representante', (c) => c.nome_representante, { width: '220px' }),
      col.contato<ClienteDaLista>('email', 'E-mail do representante', (c) => c.email_representante, { kind: 'email', priority: 2 }),
      col.contato<ClienteDaLista>('contato', 'Contato do representante', (c) => c.contato_representante, { kind: 'telefone', priority: 3 }),
      col.texto<ClienteDaLista>('setor', 'Setor do representante', (c) => c.setor_representante, { priority: 3 }),
      col.data<ClienteDaLista>('desde', 'Cliente desde', (c) => c.data_criacao, { priority: 2 }),
      col.booleano<ClienteDaLista>('revisao', 'Cobra revisão', (c) => c.cobranca_revisao_alteracao, { priority: 2 }),
      col.situacao<ClienteDaLista>('situacao', 'Situação', (c) => c.ativo),
    ],
    [],
  );

  const facets = useMemo<DataTableFacet<ClienteDaLista>[]>(
    () => [
      { columnId: 'tipo', label: 'Tipo', options: opcoes(TIPO_CLIENTE_LABEL), getValue: (c) => c.tipo_cliente || null },
      { columnId: 'documento', label: 'Documento', options: opcoes(TIPO_INSCRICAO_LABEL), getValue: (c) => c.tipo_inscricao || null },
      { columnId: 'revisao', label: 'Cobra revisão' },
      {
        columnId: 'representante',
        label: 'Representante',
        options: [
          { value: 'com', label: 'Com representante' },
          { value: 'sem', label: 'Sem representante' },
        ],
        getValue: (c) => (c.nome_representante?.trim() ? 'com' : 'sem'),
      },
    ],
    [],
  );

  const rowActions = (c: ClienteDaLista): DataTableRowAction<ClienteDaLista>[] => [
    ...(podeGerenciar ? [{ label: 'Editar', icon: Pencil, onSelect: () => navigate(`/clientes/${c.id}/edit`) }] : []),
    ...(podeVerVendas ? [{ label: 'Ver vendas do cliente', icon: Receipt, onSelect: () => navigate(linkDasVendas(c)) }] : []),
    ...(podeGerenciar
      ? [
          c.ativo
            ? { label: 'Desativar', icon: Power, onSelect: () => alterarAtivo(c, false) }
            : { label: 'Reativar', icon: Power, onSelect: () => alterarAtivo(c, true) },
          { label: 'Excluir', icon: Trash2, destructive: true, onSelect: () => setExclusao({ tipo: 'excluir', cliente: c }) },
        ]
      : []),
  ];

  const novo = () => navigate('/clientes/new');

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes"
        count={clientesQ.isPending ? null : clientes.filter((c) => c.ativo).length}
        description="Empresas e pessoas para quem a Ergogroup vende. O cliente é escolhido na nova venda."
        actions={
          podeGerenciar && (
            <Button onClick={novo}>
              <Plus className="size-4" /> Novo cliente
            </Button>
          )
        }
      />

      <DataTable
        id="clientes"
        data={clientes}
        columns={columns}
        getRowId={(c) => String(c.id)}
        getRowHref={podeGerenciar ? (c) => `/clientes/${c.id}/edit${search}` : undefined}
        isRowInactive={(c) => !c.ativo}
        views={[
          { id: 'ativos', label: 'Ativos', filter: (c) => !!c.ativo },
          { id: 'inativos', label: 'Inativos', filter: (c) => !c.ativo },
          { id: 'todos', label: 'Todos' },
        ]}
        search={{
          placeholder: 'Buscar por nome, documento ou representante',
          fields: (c) => [c.nome, c.numero_inscricao, c.numero_inscricao?.replace(/\D/g, ''), documento(c), c.nome_representante, c.email_representante],
        }}
        facets={facets}
        periodFilter={PERIODO}
        defaultSort={{ id: 'nome' }}
        rowActions={podeGerenciar || podeVerVendas ? rowActions : undefined}
        isLoading={clientesQ.isPending}
        isFetching={clientesQ.isFetching}
        isError={clientesQ.isError}
        onRetry={() => clientesQ.refetch()}
        emptyStates={{
          noData: {
            icon: Building2,
            title: 'Nenhum cliente cadastrado',
            description: 'Cadastre os clientes para escolhê-los na nova venda.',
            action: podeGerenciar ? (
              <Button onClick={novo}>
                <Plus className="size-4" /> Novo cliente
              </Button>
            ) : undefined,
          },
        }}
      />

      <ClienteExclusaoModal etapa={exclusao} onEtapa={setExclusao} />
    </div>
  );
};

export default ClientListPage;
