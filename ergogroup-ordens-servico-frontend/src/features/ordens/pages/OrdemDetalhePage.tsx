import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { authService } from '@/services/auth';
import { useUsers } from '@/features/time/hooks';
import { bucketTarefa } from '../utils';
import {
  useOrdemDetalhe,
  useServicosDeOrdem,
  useTarefasDeServicos,
} from '../hooks';
import { OrdemHeroCard } from '../components/OrdemHeroCard';
import { OrdemPdfButton } from '../components/OrdemPdfButton';
import { ServicoAccordionCard } from '../components/ServicoAccordionCard';
import { OrdemComercialPanel } from '../components/OrdemComercialPanel';
import { OrdemCobrancaPanel } from '../components/OrdemCobrancaPanel';
import { OrdemAuditoriaTimeline } from '../components/OrdemAuditoriaTimeline';

// ── Configuração de abas por perfil ────────────────────────────────────────

type TabKey = 'exec' | 'comercial' | 'cobranca' | 'auditoria';

const TAB_LABEL: Record<TabKey, string> = {
  exec: 'Execução',
  comercial: 'Comercial & Contrato',
  cobranca: 'Cobrança',
  auditoria: 'Auditoria',
};

function useTabConfig() {
  const { isTechnician, isLeadTechnician, isSubLeadTechnician, isAdministrativeSector, isFinance, canViewOrderValues } =
    useUserRole();

  let tabs: TabKey[];
  let defaultTab: TabKey;
  // Quem distribui o trabalho de um setor abre a OS na execução. O que cada um pode fazer
  // em cada serviço é decidido no próprio card, pelo setor do serviço.
  const isGestorDeSetor = isLeadTechnician || isSubLeadTechnician;
  // Qualquer usuário responsável por uma tarefa pode atualizar o status da sua própria tarefa.
  const allowSelfStatusUpdate = true;

  if (isTechnician) {
    tabs = ['exec', 'auditoria'];
    defaultTab = 'exec';
  } else if (isGestorDeSetor) {
    tabs = ['exec', 'comercial', 'cobranca', 'auditoria'];
    defaultTab = 'exec';
  } else if (isAdministrativeSector) {
    tabs = ['exec', 'comercial', 'auditoria'];
    defaultTab = 'comercial';
  } else if (isFinance) {
    tabs = ['exec', 'comercial', 'cobranca', 'auditoria'];
    defaultTab = 'cobranca';
  } else {
    tabs = ['exec', 'comercial', 'cobranca', 'auditoria'];
    defaultTab = 'comercial';
  }

  return {
    tabs,
    defaultTab,
    isTechnician,
    allowSelfStatusUpdate,
    showValor: canViewOrderValues,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

const OrdemDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const ordemId = id ? Number(id) : undefined;

  const { tabs, defaultTab, isTechnician, allowSelfStatusUpdate, showValor } = useTabConfig();
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const activeTab = tabs.includes(tab) ? tab : defaultTab;

  const { data: ordem, isLoading: loadingOrdem, isError } = useOrdemDetalhe(ordemId);
  const { data: servicos = [], isLoading: loadingServicos } = useServicosDeOrdem(ordemId);
  const { data: usuarios = [] } = useUsers();
  const { tarefasPorServico, isLoading: loadingTarefas } = useTarefasDeServicos(servicos);

  const currentProfile = authService.getCurrentUser();
  const rawCurrentUserId = currentProfile?.user?.id ?? currentProfile?.id;
  const currentUserId = rawCurrentUserId != null ? Number(rawCurrentUserId) : undefined;

  const overdueTasksCount = useMemo(
    () => Object.values(tarefasPorServico).flat().filter((t) => bucketTarefa(t) === 'atrasadas').length,
    [tarefasPorServico],
  );

  const totalTarefas = Object.values(tarefasPorServico).reduce((acc, arr) => acc + arr.length, 0);
  const execLoading = loadingServicos || loadingTarefas;

  const execSummary = execLoading
    ? 'Carregando…'
    : `${servicos.length} serviço${servicos.length !== 1 ? 's' : ''} · ${totalTarefas} tarefa${totalTarefas !== 1 ? 's' : ''}` +
      (overdueTasksCount > 0 ? ` · ${overdueTasksCount} atrasada${overdueTasksCount !== 1 ? 's' : ''}` : '');

  if (loadingOrdem) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[90px] w-full rounded-2xl" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !ordem) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <p className="text-base font-semibold text-foreground">Não foi possível carregar esta OS.</p>
        <p className="mt-1 text-sm text-muted-foreground">Verifique a conexão ou tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <OrdemHeroCard
        ordem={ordem}
        showValor={showValor}
        pdfButton={
          <OrdemPdfButton ordem={ordem} servicos={servicos} tarefasPorServico={tarefasPorServico} disabled={execLoading} />
        }
      />

      {/* ── Abas ── */}
      <div className="sticky top-0 z-[5] mt-5 bg-background">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => {
            const active = t === activeTab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'relative flex items-center gap-2 px-4 pb-[13px] pt-[11px] text-sm font-semibold transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
                )}
              >
                {TAB_LABEL[t]}
                {t === 'exec' && overdueTasksCount > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500/15 px-[5px] text-[11px] font-bold text-red-600 dark:text-red-400">
                    {overdueTasksCount}
                  </span>
                )}
                <span
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-[2px] rounded-full',
                    active ? 'bg-primary' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Corpo da aba ── */}
      <div className="pt-[22px]">
        {activeTab === 'exec' && (
          <div className="flex flex-col gap-4">
            {execLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[220px] w-full rounded-[14px]" />
                ))}
              </div>
            ) : servicos.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border py-14 text-center">
                <div className="mb-1.5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <ClipboardCheck className="h-7 w-7" strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-bold text-foreground">Nenhum serviço nesta OS</h3>
                <p className="max-w-[320px] text-[13.5px] text-muted-foreground">
                  {isTechnician
                    ? 'Você não tem tarefas atribuídas nesta OS.'
                    : 'Nenhum serviço foi adicionado a esta OS ainda.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[13px] font-medium text-muted-foreground">{execSummary}</p>

                {servicos.map((s, i) => (
                  <ServicoAccordionCard
                    key={s.id}
                    servico={s}
                    ordemId={ordem.id}
                    usuarios={usuarios}
                    allowSelfStatusUpdate={allowSelfStatusUpdate}
                    index={i}
                    currentUserId={currentUserId}
                    initialTarefas={tarefasPorServico[s.id]}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'comercial' && <OrdemComercialPanel ordem={ordem} />}
        {activeTab === 'cobranca' && <OrdemCobrancaPanel ordem={ordem} />}
        {activeTab === 'auditoria' && <OrdemAuditoriaTimeline ordemId={ordem.id} />}
      </div>
    </div>
  );
};

export default OrdemDetalhePage;
