import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RequerPermissao } from '@/components/common/RequerPermissao';
import { useTelaInicial } from '@/hooks/useTelaInicial';
import type { Permissao } from '@/lib/permissoes';
import { authService } from '@/services/auth';

// Auth
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFound from '@/pages/NotFound';
import UiKitPage from '@/pages/UiKitPage';

// Execução (R4)
import MeusServicosPage from '@/features/execucao/pages/MeusServicosPage';
import PainelDoSetorPage from '@/features/execucao/pages/PainelDoSetorPage';
import DetalheDoServicoPage from '@/features/execucao/pages/DetalheDoServicoPage';

// Analytics
import OperacionalPage from '@/features/analytics/pages/OperacionalPage';
import AnaliseFinanceiroPage from '@/features/analytics/pages/FinanceiroPage';

// Vendas (R5)
import VendasPage from '@/features/vendas/pages/VendasPage';
import NovaVendaPage from '@/features/vendas/pages/NovaVendaPage';
import ResumoDaVendaPage from '@/features/vendas/pages/ResumoDaVendaPage';

// Organização
import CompanySettingsPage from '@/features/empresa/pages/CompanySettingsPage';
import SetoresPage from '@/features/organizacao/pages/SetoresPage';
import FuncoesPage from '@/features/organizacao/pages/FuncoesPage';

// Catálogo
import CatalogListPage from '@/features/catalogo/pages/CatalogListPage';

// Clientes e Contatos
import ClientListPage from '@/features/clientes/pages/ClientListPage';
import ClientFormPage from '@/features/clientes/pages/ClientFormPage';
import ContactListPage from '@/features/clientes/pages/ContactListPage';
import ContactFormPage from '@/features/clientes/pages/ContactFormPage';

// Time
import MeuPerfilPage from '@/features/time/pages/MeuPerfilPage';
import TimePage from '@/features/time/pages/TimePage';

// Financeiro (R6)
import CobrancasPage from '@/features/financeiro/pages/CobrancasPage';
import SituacaoFinanceiraPage from '@/features/financeiro/pages/SituacaoFinanceiraPage';
import SituacaoFinanceiraOperacionalPage from '@/features/financeiro/pages/SituacaoFinanceiraOperacionalPage';
import ConferenciaPage from '@/features/financeiro/pages/ConferenciaPage';

// Ajuda
import AjudaPage from '@/features/ajuda/pages/AjudaPage';

// OS Operacional
import OperationalOrderListPage from '@/features/ordens/pages/OperationalOrderListPage';
import CatalogoOperacionalListPage from '@/features/catalogo/pages/CatalogoOperacionalListPage';
import CatalogoOperacionalFormPage from '@/features/catalogo/pages/CatalogoOperacionalFormPage';

const w = (element: React.ReactNode) => <DashboardLayout>{element}</DashboardLayout>;

/** Página do painel que exige permissão (fluxos-e-navegacao.md §4). Sem ela, a tela "sem acesso". */
const g = (element: React.ReactNode, algumaDe: Permissao[], extra?: { nenhumaDe?: Permissao[]; redirecionarPara?: string }) =>
  w(
    <RequerPermissao algumaDe={algumaDe} {...extra}>
      {element}
    </RequerPermissao>,
  );

const VER_VENDAS: Permissao[] = ['os.gerenciar', 'os.ver_todas'];

/** `/inicio`: a tela inicial de cada pessoa (escolha pessoal ou regra por permissões). */
function IrParaInicio() {
  const { tela } = useTelaInicial();
  if (!authService.getCurrentUser()) return <Navigate to="/login" replace />;
  return <Navigate to={tela.url} replace />;
}

/** `/`: com sessão, a tela inicial; sem sessão, o login. */
function Raiz() {
  return authService.getCurrentUser() ? <Navigate to="/inicio" replace /> : <LoginPage />;
}

/** Endereços antigos de OS levam às vendas (`/ordens/12/edit` → `/vendas/12/editar`), mantendo a busca. */
function DeOrdensParaVendas({ sufixo = '' }: { sufixo?: string }) {
  const { id } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/vendas${id ? `/${id}` : ''}${sufixo}${search}`} replace />;
}

const AppRoutes = () => (
  <Routes>
    {/* Auth */}
    <Route path="/" element={<Raiz />} />
    <Route path="/inicio" element={<IrParaInicio />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />

    {/* Análise */}
    <Route path="/analise/operacional" element={w(<OperacionalPage />)} />
    <Route path="/analise/financeiro" element={g(<AnaliseFinanceiroPage />, ['financeiro.ver_valores'])} />

    {/* Execução (R4) */}
    <Route path="/meus-servicos" element={w(<MeusServicosPage />)} />
    <Route path="/visao-geral" element={g(<PainelDoSetorPage geral />, ['setores.todos'])} />
    {['/setor', '/setor/:setorId'].map((path) => (
      <Route
        key={path}
        path={path}
        element={g(<PainelDoSetorPage />, ['servicos.ver_setor'], { nenhumaDe: ['setores.todos'], redirecionarPara: '/visao-geral' })}
      />
    ))}
    <Route path="/servicos/:id" element={w(<DetalheDoServicoPage />)} />

    {/* Vendas (R5) */}
    <Route path="/vendas" element={g(<VendasPage />, VER_VENDAS)} />
    <Route path="/vendas/nova" element={g(<NovaVendaPage />, ['os.gerenciar'])} />
    <Route path="/vendas/:id" element={g(<ResumoDaVendaPage />, VER_VENDAS)} />
    <Route path="/vendas/:id/editar" element={g(<NovaVendaPage />, ['os.gerenciar'])} />

    {/* Endereços antigos de OS (a rota estática de OS operacionais tem precedência sobre :id) */}
    <Route path="/ordens" element={<DeOrdensParaVendas />} />
    <Route path="/ordens/new" element={<Navigate to="/vendas/nova" replace />} />
    <Route path="/ordens/:id" element={<DeOrdensParaVendas />} />
    <Route path="/ordens/:id/edit" element={<DeOrdensParaVendas sufixo="/editar" />} />
    <Route path="/ordens/operacionais" element={w(<OperationalOrderListPage />)} />

    {/* Catálogo */}
    <Route path="/catalogo" element={w(<CatalogListPage />)} />
    {/* O formulário do catálogo é um modal sobre a listagem; os endereços abrem o modal. */}
    <Route path="/catalogo/new" element={w(<CatalogListPage />)} />
    <Route path="/catalogo/:id/edit" element={w(<CatalogListPage />)} />
    <Route path="/catalogo/operacional" element={w(<CatalogoOperacionalListPage />)} />
    <Route path="/catalogo/operacional/new" element={w(<CatalogoOperacionalFormPage />)} />
    <Route path="/catalogo/operacional/:id/edit" element={w(<CatalogoOperacionalFormPage />)} />

    {/* Clientes e Contatos */}
    <Route path="/clientes" element={w(<ClientListPage />)} />
    <Route path="/clientes/new" element={w(<ClientFormPage />)} />
    <Route path="/clientes/:id/edit" element={w(<ClientFormPage />)} />
    <Route path="/clientes/contacts" element={w(<ContactListPage />)} />
    <Route path="/clientes/contacts/new" element={w(<ContactFormPage />)} />
    <Route path="/clientes/contacts/:id/edit" element={w(<ContactFormPage />)} />

    {/* Cobranças */}
    <Route path="/cobrancas" element={g(<CobrancasPage />, ['financeiro.registrar_cobranca'])} />
    <Route path="/cobrancas/conferencia" element={g(<ConferenciaPage />, ['financeiro.registrar_cobranca'])} />
    <Route path="/cobrancas/operacionais/:id" element={g(<SituacaoFinanceiraOperacionalPage />, ['financeiro.registrar_cobranca'])} />
    <Route path="/cobrancas/:id" element={g(<SituacaoFinanceiraPage />, ['financeiro.ver_valores'])} />

    {/* Organização e time */}
    <Route path="/time" element={g(<TimePage />, ['organizacao.configurar', 'usuarios.gerenciar'])} />
    <Route path="/time/eu" element={w(<MeuPerfilPage />)} />
    <Route path="/organizacao/setores" element={w(<SetoresPage />)} />
    <Route
      path="/organizacao/funcoes"
      element={w(
        <RequerPermissao somenteSuperusuario>
          <FuncoesPage />
        </RequerPermissao>,
      )}
    />
    <Route path="/organizacao/dados" element={w(<CompanySettingsPage />)} />

    {/* Ajuda: tela cheia, sem o menu do sistema; aberta para todos, cada página filtra o que mostra pelas permissões */}
    {['/ajuda', '/ajuda/:modulo', '/ajuda/:modulo/:pagina'].map((path) => (
      <Route key={path} path={path} element={<AjudaPage />} />
    ))}

    {/* Endereços antigos */}
    <Route path="/usuarios" element={<Navigate to="/time" replace />} />
    <Route path="/usuarios/profile" element={<Navigate to="/time/eu" replace />} />
    <Route path="/empresa" element={<Navigate to="/organizacao/dados" replace />} />

    {/* Vitrine do UI kit (docs/ui/plano-ui-kit.md) — só em desenvolvimento */}
    {import.meta.env.DEV && <Route path="/ui" element={w(<UiKitPage />)} />}

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
