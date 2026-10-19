import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { DataTable, col, type DataTableRowAction } from '@/components/data-table';
import { PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { useCatalogosOperacionais, useDeleteCatalogoOperacional } from '../hooks';
import type { CatalogoOperacionalItem } from '../services';

function RegraDeCobranca({ item }: { item: CatalogoOperacionalItem }) {
  if (!item.geraCobranca) return <span className="text-muted-foreground">Não gera cobrança</span>;
  const excecoes = item.clientesIsentosCobranca.length;
  return (
    <span>
      Gera cobrança
      {excecoes > 0 && (
        <span className="text-muted-foreground">
          {' '}· {excecoes} {excecoes === 1 ? 'cliente isento' : 'clientes isentos'}
        </span>
      )}
    </span>
  );
}

function CatalogoOperacionalCard({ item }: { item: CatalogoOperacionalItem }) {
  return (
    <>
      <h3 className="line-clamp-2 pr-8 font-medium leading-snug">{item.nome}</h3>
      <p className={item.descricao ? 'mt-1.5 line-clamp-3 text-muted-foreground' : 'mt-1.5 italic text-muted-foreground/70'}>
        {item.descricao || 'Sem descrição'}
      </p>
      <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs">
        <ReceiptText className="size-3.5 text-muted-foreground" />
        <RegraDeCobranca item={item} />
      </div>
    </>
  );
}

const CatalogoOperacionalListPage = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const podeGerenciar = pode('os_operacional.gerenciar');
  const catalogosQ = useCatalogosOperacionais();
  const catalogos = useMemo(() => catalogosQ.data ?? [], [catalogosQ.data]);
  const excluir = useDeleteCatalogoOperacional();

  const editar = (item: CatalogoOperacionalItem) => navigate(`/catalogo/operacional/${item.id}/edit${search}`);
  const confirmarExclusao = (item: CatalogoOperacionalItem) => {
    if (!window.confirm(`Excluir ${item.nome} do catálogo operacional?`)) return;
    excluir.mutate(item.id, {
      onSuccess: () => toast({ title: 'Serviço excluído do catálogo operacional', description: item.nome }),
      onError: (error) => toast({
        title: 'Não foi possível excluir',
        description: mensagemDeErro(error, 'Se o serviço já foi usado em uma OS operacional, ele precisa ser preservado.'),
        variant: 'destructive',
      }),
    });
  };

  const columns = useMemo(
    () => [
      col.registro<CatalogoOperacionalItem>('nome', 'Serviço', { title: (c) => c.nome }),
      col.texto<CatalogoOperacionalItem>('descricao', 'Descrição', (c) => c.descricao, { priority: 2 }),
      col.texto<CatalogoOperacionalItem>('cobranca', 'Cobrança', (c) => c.geraCobranca ? 'Gera cobrança' : 'Não gera cobrança', { width: '180px' }),
      col.numero<CatalogoOperacionalItem>('excecoes', 'Clientes isentos', (c) => c.clientesIsentosCobranca.length, { width: '140px', priority: 2 }),
    ],
    [],
  );

  const rowActions = (item: CatalogoOperacionalItem): DataTableRowAction<CatalogoOperacionalItem>[] => [
    { label: 'Editar', icon: Pencil, onSelect: () => editar(item) },
    { label: 'Excluir', icon: Trash2, destructive: true, onSelect: () => confirmarExclusao(item) },
  ];
  const novo = () => navigate(`/catalogo/operacional/new${search}`);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Catálogo operacional"
        count={catalogosQ.isPending ? null : catalogos.length}
        description="Os serviços usados nas OS operacionais e a regra que define quando cada um gera cobrança."
        actions={podeGerenciar && (
          <Button onClick={novo}>
            <Plus className="size-4" /> Novo serviço
          </Button>
        )}
      />

      <DataTable
        id="catalogo-operacional"
        data={catalogos}
        columns={columns}
        getRowId={(c) => String(c.id)}
        getRowHref={podeGerenciar ? (c) => `/catalogo/operacional/${c.id}/edit${search}` : undefined}
        views={[
          { id: 'todos', label: 'Todos' },
          { id: 'cobraveis', label: 'Geram cobrança', filter: (c) => c.geraCobranca },
          { id: 'nao-cobraveis', label: 'Não geram cobrança', filter: (c) => !c.geraCobranca },
        ]}
        search={{ placeholder: 'Buscar por nome ou descrição', fields: (c) => [c.nome, c.descricao] }}
        defaultSort={{ id: 'nome' }}
        rowActions={podeGerenciar ? rowActions : undefined}
        renderCard={(c) => <CatalogoOperacionalCard item={c} />}
        defaultLayout="cards"
        isLoading={catalogosQ.isPending}
        isFetching={catalogosQ.isFetching}
        isError={catalogosQ.isError}
        onRetry={() => catalogosQ.refetch()}
        emptyStates={{
          noData: {
            icon: Boxes,
            title: 'Nenhum serviço no catálogo operacional',
            description: 'Cadastre os serviços usados para abrir ordens de serviço operacionais.',
            action: podeGerenciar ? (
              <Button onClick={novo}>
                <Plus className="size-4" /> Novo serviço
              </Button>
            ) : undefined,
          },
        }}
      />
    </div>
  );
};

export default CatalogoOperacionalListPage;
