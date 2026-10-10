import { useMemo, useState } from 'react';
import { Copy, Eye, KeyRound, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { DataTable, col, type DataTableFacet, type DataTableRowAction } from '@/components/data-table';
import { EmptyState, PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { FuncaoModal, type EtapaFuncao } from '../components/FuncaoModal';
import { MatrizFuncoes } from '../components/MatrizFuncoes';
import {
  useAlterarStatusFuncao,
  useFuncoes,
  useMembros,
  usePermissoesDisponiveis,
  usePodeEditarFuncao,
  useSetores,
} from '../hooks';
import type { Funcao } from '../services';

type Modo = 'lista' | 'comparar';

/** Até 2 setores, um por linha, e "+N" com a lista completa no title. */
function SetoresCell({ funcao }: { funcao: Funcao }) {
  const nomes = funcao.setores_detalhe.map((s) => s.nome);
  if (!nomes.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0" title={nomes.join('\n')}>
      {nomes.slice(0, 2).map((n) => (
        <div key={n} className="truncate">
          {n}
        </div>
      ))}
      {nomes.length > 2 && <div className="text-xs text-muted-foreground">+{nomes.length - 2} setor(es)</div>}
    </div>
  );
}

const FuncoesPage = () => {
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const podeConfigurar = pode('organizacao.configurar');
  const podeEditar = usePodeEditarFuncao();
  const funcoesQ = useFuncoes();
  const { data: setores = [] } = useSetores();
  const { data: membros = [] } = useMembros();
  const { data: catalogo = [], isPending: carregandoCatalogo } = usePermissoesDisponiveis();
  const alterarStatus = useAlterarStatusFuncao();
  const funcoes = useMemo(() => funcoesQ.data ?? [], [funcoesQ.data]);

  const [modo, setModo] = useState<Modo>('lista');
  // Um único modal por vez; a etapa diz o que ele mostra.
  const [etapa, setEtapa] = useState<EtapaFuncao | null>(null);

  const pessoasPorFuncao = useMemo(() => {
    const contagem = new Map<number, number>();
    membros.forEach((m) => contagem.set(m.funcao, (contagem.get(m.funcao) ?? 0) + 1));
    return contagem;
  }, [membros]);

  const reativar = (f: Funcao) =>
    alterarStatus.mutate(
      { id: f.id, ativo: true },
      {
        onSuccess: () => toast({ title: 'Função reativada', description: f.nome }),
        onError: (error) => toast({ title: 'Não foi possível reativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  const columns = useMemo(
    () => [
      col.registro<Funcao>('nome', 'Nome', { title: (f) => f.nome }),
      col.texto<Funcao>('descricao', 'Descrição', (f) => f.descricao, { priority: 2 }),
      col.custom<Funcao>('setores', 'Setores', {
        accessor: (f) => f.setores_detalhe.map((s) => s.nome).join(', ') || undefined,
        sortingFn: 'textPtBr',
        width: '220px',
        cell: (f) => <SetoresCell funcao={f} />,
      }),
      col.numero<Funcao>('permissoes', 'Permissões', (f) => f.permissoes.length, { width: '120px' }),
      col.numero<Funcao>('pessoas', 'Pessoas', (f) => pessoasPorFuncao.get(f.id) ?? 0, { width: '100px' }),
      col.situacao<Funcao>('situacao', 'Situação', (f) => f.ativo),
    ],
    [pessoasPorFuncao],
  );

  const facets = useMemo<DataTableFacet<Funcao>[]>(
    () => [{ columnId: 'setor', label: 'Setor', getValue: (f) => f.setores_detalhe.map((s) => s.nome) }],
    [],
  );

  const rowActions = (f: Funcao): DataTableRowAction<Funcao>[] => {
    const editavel = podeEditar(f);
    const acoes: DataTableRowAction<Funcao>[] = [
      { label: editavel ? 'Editar' : 'Ver', icon: editavel ? Pencil : Eye, onSelect: () => setEtapa({ tipo: 'form', id: f.id }) },
    ];
    if (podeConfigurar) acoes.push({ label: 'Duplicar', icon: Copy, onSelect: () => setEtapa({ tipo: 'form', copiaDe: f.id }) });
    if (editavel) {
      acoes.push(
        f.ativo
          ? { label: 'Desativar', icon: Power, onSelect: () => setEtapa({ tipo: 'desativar', id: f.id }) }
          : { label: 'Reativar', icon: Power, onSelect: () => reativar(f) },
        { label: 'Excluir', icon: Trash2, destructive: true, onSelect: () => setEtapa({ tipo: 'excluir', id: f.id }) },
      );
    }
    return acoes;
  };

  const novaFuncao = () => setEtapa({ tipo: 'form' });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Funções e permissões"
        count={funcoesQ.isPending ? null : funcoes.filter((f) => f.ativo).length}
        description="O que cada função permite fazer e em quais setores ela pode ser usada."
        actions={
          podeConfigurar && (
            <Button onClick={novaFuncao}>
              <Plus className="size-4" /> Nova função
            </Button>
          )
        }
      />

      <ToggleGroup
        type="single"
        value={modo}
        onValueChange={(v) => v && setModo(v as Modo)}
        variant="outline"
        size="sm"
        className="mb-4 justify-start"
        aria-label="Modo de exibição"
      >
        <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
        <ToggleGroupItem value="comparar">Comparar funções</ToggleGroupItem>
      </ToggleGroup>

      {modo === 'lista' ? (
        <DataTable
          id="funcoes"
          data={funcoes}
          columns={columns}
          getRowId={(f) => String(f.id)}
          onRowClick={(f) => setEtapa({ tipo: 'form', id: f.id })}
          isRowInactive={(f) => !f.ativo}
          views={[
            { id: 'ativas', label: 'Ativas', filter: (f) => f.ativo },
            { id: 'inativas', label: 'Inativas', filter: (f) => !f.ativo },
            { id: 'todas', label: 'Todas' },
          ]}
          search={{ placeholder: 'Buscar por nome ou descrição', fields: (f) => [f.nome, f.descricao] }}
          facets={facets}
          defaultSort={{ id: 'nome' }}
          rowActions={rowActions}
          isLoading={funcoesQ.isPending}
          isFetching={funcoesQ.isFetching}
          isError={funcoesQ.isError}
          onRetry={() => funcoesQ.refetch()}
          emptyStates={{
            noData: {
              icon: KeyRound,
              title: 'Nenhuma função cadastrada',
              description: 'Crie funções como "Técnico" ou "Gestor de Ergonomia" e marque o que cada uma pode fazer.',
              action: podeConfigurar ? (
                <Button onClick={novaFuncao}>
                  <Plus className="size-4" /> Nova função
                </Button>
              ) : undefined,
            },
          }}
        />
      ) : funcoesQ.isPending || carregandoCatalogo ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : funcoes.some((f) => f.ativo) ? (
        <MatrizFuncoes funcoes={funcoes.filter((f) => f.ativo)} catalogo={catalogo} onAbrir={(f) => setEtapa({ tipo: 'form', id: f.id })} />
      ) : (
        <EmptyState icon={KeyRound} title="Nenhuma função ativa para comparar" />
      )}

      <FuncaoModal etapa={etapa} onEtapa={setEtapa} funcoes={funcoes} setores={setores} membros={membros} />
    </div>
  );
};

export default FuncoesPage;
