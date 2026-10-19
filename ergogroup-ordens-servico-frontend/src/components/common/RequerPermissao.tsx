import { Link, Navigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/kit';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissoes } from '@/hooks/usePermissoes';
import type { Permissao } from '@/lib/permissoes';

interface RequerPermissaoProps {
  /** Libera com ao menos uma destas. */
  algumaDe?: Permissao[];
  /** Bloqueia quem tem alguma destas (ex.: o Painel do setor para quem tem a Visão geral). */
  nenhumaDe?: Permissao[];
  /** Para onde mandar quem foi barrado por `nenhumaDe`, em vez da tela "sem acesso". */
  redirecionarPara?: string;
  /** Só superusuários (ex.: Funções e permissões). */
  somenteSuperusuario?: boolean;
  children: React.ReactNode;
}

/** Tela de quem abriu uma página que as suas permissões não liberam (no lugar de um 403 cru). */
export function SemAcesso() {
  return (
    <EmptyState
      icon={Lock}
      title="Você não tem acesso a esta página"
      description="Ela depende de uma permissão que as suas funções não incluem. Se precisar dela, fale com quem configura as funções da empresa."
      action={
        <Button asChild variant="outline">
          <Link to="/inicio">Ir para a minha tela inicial</Link>
        </Button>
      }
    />
  );
}

/** Guarda de rota por permissão. Sem sessão, volta para o login. */
export function RequerPermissao({ algumaDe, nenhumaDe, redirecionarPara, somenteSuperusuario, children }: RequerPermissaoProps) {
  const { user } = useCurrentUser();
  const { podeAlguma, superusuario } = usePermissoes();

  if (!user) return <Navigate to="/login" replace />;
  // Sessão gravada antes das permissões: espera o /auth/me/ (o layout relê a pessoa ao abrir).
  if (!user.permissoes && !user.is_superuser) {
    return (
      <div className="flex justify-center py-14 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Carregando permissões" />
      </div>
    );
  }
  if (nenhumaDe && podeAlguma(nenhumaDe)) return redirecionarPara ? <Navigate to={redirecionarPara} replace /> : <SemAcesso />;
  if (somenteSuperusuario && !superusuario) return <SemAcesso />;
  if (algumaDe && !podeAlguma(algumaDe)) return <SemAcesso />;
  return <>{children}</>;
}
