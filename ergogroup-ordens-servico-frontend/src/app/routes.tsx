import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Auth
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFound from '@/pages/NotFound';
import UiKitPage from '@/pages/UiKitPage';

// Analytics
import OperacionalPage from '@/features/analytics/pages/OperacionalPage';
import AnaliseFinanceiroPage from '@/features/analytics/pages/FinanceiroPage';

// Ordens
import OrdemServicoListPage from '@/features/ordens/pages/OrdemServicoListPage';
import OrdemServicoFormPage from '@/features/ordens/pages/OrdemServicoFormPage';
import OrdemDetalhePage from '@/features/ordens/pages/OrdemDetalhePage';

// Organização
import CompanySettingsPage from '@/features/empresa/pages/CompanySettingsPage';
import SetoresPage from '@/features/organizacao/pages/SetoresPage';
import FuncoesPage from '@/features/organizacao/pages/FuncoesPage';

// Catálogo
import CatalogListPage from '@/features/catalogo/pages/CatalogListPage';
import CatalogoOperacionalListPage from '@/features/catalogo/pages/CatalogoOperacionalListPage';
import CatalogoOperacionalFormPage from '@/features/catalogo/pages/CatalogoOperacionalFormPage';

// Clientes e Contatos
import ClientListPage from '@/features/clientes/pages/ClientListPage';
import ClientFormPage from '@/features/clientes/pages/ClientFormPage';
import ContactListPage from '@/features/clientes/pages/ContactListPage';
import ContactFormPage from '@/features/clientes/pages/ContactFormPage';

// Time
import MeuPerfilPage from '@/features/time/pages/MeuPerfilPage';
import TimePage from '@/features/time/pages/TimePage';

// Faturamento
import FaturamentoPage from '@/features/faturamento/pages/FaturamentoPage';

// Operational Orders
import OperationalOrderListPage from '@/features/ordens/pages/OperationalOrderListPage';

const w = (element: React.ReactNode) => <DashboardLayout>{element}</DashboardLayout>;

const AppRoutes = () => (
  <Routes>
    {/* Auth */}
    <Route path="/" element={<LoginPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />

    {/* Análise */}
    <Route path="/analise/operacional" element={w(<OperacionalPage />)} />
    <Route path="/analise/financeiro" element={w(<AnaliseFinanceiroPage />)} />

    {/* Ordens */}
    <Route path="/ordens" element={w(<OrdemServicoListPage />)} />
    <Route path="/ordens/new" element={w(<OrdemServicoFormPage />)} />
    <Route path="/ordens/:id" element={w(<OrdemDetalhePage />)} />
    <Route path="/ordens/:id/edit" element={w(<OrdemServicoFormPage />)} />
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
    <Route path="/cobrancas" element={w(<FaturamentoPage />)} />

    {/* Organização e time */}
    <Route path="/time" element={w(<TimePage />)} />
    <Route path="/time/eu" element={w(<MeuPerfilPage />)} />
    <Route path="/organizacao/setores" element={w(<SetoresPage />)} />
    <Route path="/organizacao/funcoes" element={w(<FuncoesPage />)} />
    <Route path="/organizacao/dados" element={w(<CompanySettingsPage />)} />

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
