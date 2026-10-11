import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EV2UpdatesModal } from '@/components/common/EV2UpdatesModal';
import { useEV2Modal } from '@/hooks/useEV2Modal';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import UnderDevelopmentOverlay from '@/components/UnderDevelopmentOverlay';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

const SIDEBAR_KEY = 'sidebar:collapsed';

// Rotas já liberadas; as demais mostram o aviso de "em desenvolvimento".
const READY_PREFIXES = ['/inicio', '/meus-servicos', '/visao-geral', '/setor', '/servicos', '/vendas', '/ordens', '/time', '/organizacao/setores', '/organizacao/funcoes', '/cobrancas', '/clientes', '/catalogo', '/analise', '/ui'];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout "painel inset" (docs/ui/wireframes/navegacao.html, direção A):
 * sidebar sobre o fundo `canvas` e o conteúdo num painel arredondado.
 * O header fica fora da área de rolagem; só o conteúdo rola.
 */
const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { pathname } = useLocation();
  const { open: ev2Open, dismiss: dismissEV2, show: showEV2 } = useEV2Modal();
  // Setores, funções e permissões podem mudar depois do login: relê a pessoa logada
  // ao abrir o sistema e, no máximo, a cada 5 minutos.
  useQuery({ queryKey: ['auth-me'], queryFn: authService.refreshCurrentUser, staleTime: 5 * 60_000, retry: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        /* preferência só desta sessão */
      }
      return next;
    });
  };

  // Atalho "[" recolhe/expande o menu (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A área de rolagem é o painel, não a janela: volta ao topo ao trocar de página.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setMobileOpen(false);
  }, [pathname]);

  const isReady = READY_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full overflow-hidden bg-canvas">
        <div className="hidden lg:flex">
          <AppSidebar collapsed={collapsed} onToggle={toggle} onOpenNews={showEV2} />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 border-r bg-canvas p-0 [&>button]:hidden">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <AppSidebar
              variant="drawer"
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              onOpenNews={() => {
                setMobileOpen(false);
                showEV2();
              }}
            />
          </SheetContent>
        </Sheet>

        <div
          className={cn(
            'm-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-sm',
            'lg:ml-0',
          )}
        >
          <AppHeader onOpenMenu={() => setMobileOpen(true)} />
          <div ref={scrollRef} className="relative flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            <main className="px-4 py-5 sm:px-6">
              {!isReady ? <UnderDevelopmentOverlay /> : null}
              {children}
            </main>
          </div>
        </div>
      </div>

      <EV2UpdatesModal open={ev2Open} onDismiss={dismissEV2} />
    </TooltipProvider>
  );
};

export default DashboardLayout;
