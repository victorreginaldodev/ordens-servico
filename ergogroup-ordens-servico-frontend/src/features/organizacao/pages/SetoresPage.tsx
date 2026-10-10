import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Network, Plus, Search } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/kit';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePermissoes } from '@/hooks/usePermissoes';
import { SetorCard } from '../components/SetorCard';
import { SetorModal, type EtapaSetor } from '../components/SetorModal';
import { useResumoSetores } from '../useResumoSetores';

type FiltroStatus = 'ativos' | 'desativados' | 'todos';

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const SetoresPage = () => {
  const { pode } = usePermissoes();
  const podeConfigurar = pode('organizacao.configurar');
  const { resumos, todasAsFuncoes, catalogosSemSetor, isLoading, isError, detalhesCarregando } = useResumoSetores();

  const [status, setStatus] = useState<FiltroStatus>('ativos');
  const [busca, setBusca] = useState('');
  // Um único modal por vez; a etapa diz o que ele mostra (detalhe, formulário ou confirmação).
  const [etapa, setEtapa] = useState<EtapaSetor | null>(null);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return resumos.filter(
      ({ setor }) =>
        (status === 'todos' || setor.ativo === (status === 'ativos')) &&
        (!termo || normalizar(`${setor.nome} ${setor.descricao ?? ''}`).includes(termo)),
    );
  }, [resumos, status, busca]);

  const desativados = resumos.filter((r) => !r.setor.ativo).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Setores"
        count={isLoading ? null : resumos.filter((r) => r.setor.ativo).length}
        description="Áreas que executam os serviços. Cada pessoa atua em um ou mais setores, com uma função em cada."
        actions={
          podeConfigurar && (
            <Button onClick={() => setEtapa({ tipo: 'form' })}>
              <Plus className="size-4" /> Novo setor
            </Button>
          )
        }
      />

      {catalogosSemSetor > 0 && (
        <Alert className="mb-5 border-warning/40 bg-warning-subtle text-warning-strong [&>svg]:text-warning-strong">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {catalogosSemSetor === 1 ? '1 catálogo ainda sem setor' : `${catalogosSemSetor} catálogos ainda sem setor`}
          </AlertTitle>
          <AlertDescription>
            Os serviços desses catálogos não caem na fila de nenhum setor.{' '}
            {pode('catalogo.gerenciar') && (
              <Link to="/catalogo" className="font-medium underline underline-offset-2">
                Classificar no catálogo
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar setor"
            className="pl-9"
            aria-label="Buscar setor"
          />
        </div>
        <ToggleGroup
          type="single"
          value={status}
          onValueChange={(v) => v && setStatus(v as FiltroStatus)}
          variant="outline"
          size="sm"
          aria-label="Filtrar por status"
        >
          <ToggleGroupItem value="ativos">Ativos</ToggleGroupItem>
          <ToggleGroupItem value="desativados">Desativados{desativados ? ` (${desativados})` : ''}</ToggleGroupItem>
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os setores"
          description="Verifique a conexão e tente de novo."
        />
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={Network}
          title={resumos.length === 0 ? 'Nenhum setor cadastrado' : 'Nenhum setor encontrado'}
          description={
            resumos.length === 0
              ? 'Crie setores como Ergonomia ou Segurança do Trabalho para organizar quem executa cada serviço.'
              : 'Ajuste a busca ou o filtro de status.'
          }
          action={
            resumos.length === 0 && podeConfigurar ? (
              <Button onClick={() => setEtapa({ tipo: 'form' })}>
                <Plus className="size-4" /> Novo setor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((resumo) => (
            <SetorCard
              key={resumo.setor.id}
              resumo={resumo}
              detalhesCarregando={detalhesCarregando}
              onAbrir={() => setEtapa({ tipo: 'detalhe', id: resumo.setor.id })}
            />
          ))}
        </div>
      )}

      <SetorModal etapa={etapa} onEtapa={setEtapa} resumos={resumos} todasAsFuncoes={todasAsFuncoes} />
    </div>
  );
};

export default SetoresPage;
