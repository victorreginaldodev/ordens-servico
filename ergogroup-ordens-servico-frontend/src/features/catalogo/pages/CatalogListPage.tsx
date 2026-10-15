import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, Package, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { DataTable, col, type DataTableFacet, type DataTableRowAction } from '@/components/data-table';
import { AtivoBadge, PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { CatalogoModal, type EtapaCatalogo } from '../components/CatalogoModal';
import { MudarSetorEmLoteModal } from '../components/MudarSetorEmLoteModal';
import { useCatalogos, useUpsertCatalogo } from '../hooks';
import type { CatalogoItem } from '../services';

const SEM_SETOR = 'Sem setor';

/** Card do catálogo: o setor já aparece no título do grupo, então o card fica no essencial. */
function CatalogoCard({ item }: { item: CatalogoItem }) {
  return (
    <>
      <h3 className="line-clamp-2 pr-8 font-medium leading-snug">{item.nome}</h3>
      <p className={item.descricao ? 'mt-1.5 line-clamp-3 text-muted-foreground' : 'mt-1.5 italic text-muted-foreground/70'}>
        {item.descricao || 'Sem descrição'}
      </p>
      {!item.ativo && <AtivoBadge ativo={false} className="mt-auto pt-3" />}
    </>
  );
}

const CatalogListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const podeGerenciar = usePermissoes().pode('catalogo.gerenciar');
  const catalogosQ = useCatalogos();
  const catalogos = useMemo(() => catalogosQ.data ?? [], [catalogosQ.data]);
  const salvar = useUpsertCatalogo();

  // Um único modal por vez. O formulário fica no endereço (/catalogo/new e /catalogo/:id/edit),
  // para links e o botão voltar funcionarem; as confirmações são só estado da tela.
  const { id } = useParams();
  const { pathname, search } = useLocation();
  const etapaDaRota: EtapaCatalogo | null = !podeGerenciar
    ? null
    : pathname.endsWith('/new')
      ? { tipo: 'form' }
      : id
        ? { tipo: 'form', id: Number(id) }
        : null;
  const [confirmacao, setConfirmacao] = useState<EtapaCatalogo | null>(null);
  const [emLote, setEmLote] = useState(false);
  const etapa = confirmacao ?? etapaDaRota;

  const mudarEtapa = useCallback(
    (nova: EtapaCatalogo | null) => {
      if (nova?.tipo === 'form') {
        setConfirmacao(null);
        navigate(`${nova.id ? `/catalogo/${nova.id}/edit` : '/catalogo/new'}${search}`);
        return;
      }
      setConfirmacao(nova);
      // Fechar, ou ir do formulário para uma confirmação, volta o endereço para a listagem. Substitui a
      // entrada do histórico para o "voltar" do navegador não reabrir o modal que acabou de ser fechado.
      if (pathname !== '/catalogo') navigate(`/catalogo${search}`, { replace: true });
    },
    [navigate, pathname, search],
  );

  const mudarAtivo = (item: CatalogoItem, ativo: boolean) =>
    salvar.mutate(
      { id: item.id, payload: { ativo } },
      {
        onSuccess: () => toast({ title: ativo ? 'Serviço reativado' : 'Serviço desativado', description: item.nome }),
        onError: (error) => toast({ title: 'Não foi possível alterar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  const columns = useMemo(
    () => [
      col.registro<CatalogoItem>('nome', 'Serviço', { title: (c) => c.nome }),
      col.texto<CatalogoItem>('descricao', 'Descrição', (c) => c.descricao, { priority: 2 }),
      col.texto<CatalogoItem>('setor', 'Setor responsável', (c) => c.setorNome ?? SEM_SETOR, { width: '240px' }),
      col.situacao<CatalogoItem>('situacao', 'Situação', (c) => c.ativo),
    ],
    [],
  );

  const facets = useMemo<DataTableFacet<CatalogoItem>[]>(
    () => [{ columnId: 'setor', label: 'Setor', getValue: (c) => c.setorNome ?? SEM_SETOR }],
    [],
  );

  const rowActions = (c: CatalogoItem): DataTableRowAction<CatalogoItem>[] => [
    { label: 'Editar', icon: Pencil, onSelect: () => mudarEtapa({ tipo: 'form', id: c.id }) },
    c.ativo
      ? { label: 'Desativar', icon: Power, onSelect: () => mudarEtapa({ tipo: 'desativar', id: c.id }) }
      : { label: 'Reativar', icon: Power, onSelect: () => mudarAtivo(c, true) },
    { label: 'Excluir', icon: Trash2, destructive: true, onSelect: () => mudarEtapa({ tipo: 'excluir', id: c.id }) },
  ];

  const novo = () => mudarEtapa({ tipo: 'form' });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Catálogo de serviços"
        count={catalogosQ.isPending ? null : catalogos.filter((c) => c.ativo).length}
        description="Os serviços que a empresa vende. Cada um pertence ao setor que o executa, e é na fila desse setor que ele cai quando a OS é vendida."
        actions={
          podeGerenciar && (
            <>
              <Button variant="outline" onClick={() => setEmLote(true)} disabled={!catalogos.length}>
                <ArrowRightLeft className="size-4" /> Mudar setor em lote
              </Button>
              <Button onClick={novo}>
                <Plus className="size-4" /> Novo serviço
              </Button>
            </>
          )
        }
      />

      <DataTable
        id="catalogo"
        data={catalogos}
        columns={columns}
        getRowId={(c) => String(c.id)}
        getRowHref={podeGerenciar ? (c) => `/catalogo/${c.id}/edit${search}` : undefined}
        isRowInactive={(c) => !c.ativo}
        views={[
          { id: 'ativos', label: 'Ativos', filter: (c) => c.ativo },
          { id: 'inativos', label: 'Inativos', filter: (c) => !c.ativo },
          { id: 'todos', label: 'Todos' },
        ]}
        search={{ placeholder: 'Buscar por nome ou descrição', fields: (c) => [c.nome, c.descricao] }}
        facets={facets}
        defaultSort={{ id: 'nome' }}
        rowActions={podeGerenciar ? rowActions : undefined}
        renderCard={(c) => <CatalogoCard item={c} />}
        cardGroupBy={(c) => c.setorNome ?? SEM_SETOR}
        defaultLayout="cards"
        isLoading={catalogosQ.isPending}
        isFetching={catalogosQ.isFetching}
        isError={catalogosQ.isError}
        onRetry={() => catalogosQ.refetch()}
        emptyStates={{
          noData: {
            icon: Package,
            title: 'Nenhum serviço no catálogo',
            description: 'Cadastre os serviços que a empresa vende e o setor que executa cada um.',
            action: podeGerenciar ? (
              <Button onClick={novo}>
                <Plus className="size-4" /> Novo serviço
              </Button>
            ) : undefined,
          },
        }}
      />

      <CatalogoModal etapa={etapa} onEtapa={mudarEtapa} catalogos={catalogos} carregando={catalogosQ.isPending} />
      <MudarSetorEmLoteModal aberto={emLote && !etapa} onFechar={() => setEmLote(false)} catalogos={catalogos} />
    </div>
  );
};

export default CatalogListPage;
