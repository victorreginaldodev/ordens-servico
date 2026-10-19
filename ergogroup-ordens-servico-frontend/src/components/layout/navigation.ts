import {
  Activity,
  Boxes,
  Building2,
  CirclePlus,
  Handshake,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Network,
  Package,
  Receipt,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Permissao, Verificador } from '@/lib/permissoes';

/**
 * Configuração única da navegação: menu lateral, breadcrumb e busca global
 * leem daqui. Para incluir uma página no menu, adicione-a a um grupo.
 * Grupos e permissões: docs/ui/fluxos-e-navegacao.md §4.
 */

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Só aparece para quem tem ao menos uma destas permissões. Sem o campo, aparece para todos. */
  permissoes?: Permissao[];
  /** Some para quem tem alguma destas (ex.: o Painel do setor para quem tem a Visão geral). */
  semPermissoes?: Permissao[];
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/** Quem administra a organização: vê Time e Setores no menu do usuário. */
export const ADMIN_ORGANIZACAO: Permissao[] = ['organizacao.configurar', 'usuarios.gerenciar'];

/** Menu lateral, na ordem do fluxo: vende, executa, cobra; depois análise e cadastros. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'vendas',
    title: 'Vendas',
    items: [
      { title: 'Vendas', url: '/vendas', icon: Handshake, permissoes: ['os.gerenciar', 'os.ver_todas'] },
      { title: 'Nova venda', url: '/vendas/nova', icon: CirclePlus, permissoes: ['os.gerenciar'] },
    ],
  },
  {
    id: 'execucao',
    title: 'Execução',
    items: [
      // Visão geral (quem acompanha todos os setores) e Painel do setor (os demais) ocupam o mesmo lugar: o primeiro.
      { title: 'Visão geral', url: '/visao-geral', icon: LayoutGrid, permissoes: ['setores.todos'] },
      {
        title: 'Painel do setor',
        url: '/setor',
        icon: LayoutDashboard,
        permissoes: ['servicos.ver_setor'],
        semPermissoes: ['setores.todos'],
      },
      { title: 'Meus serviços', url: '/meus-servicos', icon: ListChecks },
      { title: 'OS operacionais', url: '/ordens/operacionais', icon: Wrench },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    items: [{ title: 'Cobranças', url: '/cobrancas', icon: Receipt, permissoes: ['financeiro.registrar_cobranca'] }],
  },
  {
    id: 'analise',
    title: 'Análise BI',
    items: [
      { title: 'Painel operacional', url: '/analise/operacional', icon: Activity },
      { title: 'Painel financeiro', url: '/analise/financeiro', icon: Wallet, permissoes: ['financeiro.ver_valores'] },
    ],
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    items: [
      { title: 'Clientes', url: '/clientes', icon: Building2 },
      { title: 'Catálogo', url: '/catalogo', icon: Package },
      { title: 'Catálogo operacional', url: '/catalogo/operacional', icon: Boxes },
    ],
  },
];

/** Fora do menu lateral: aparece no menu do usuário (rodapé da sidebar), só para quem administra. */
export const NAV_ORGANIZACAO: NavGroup = {
  id: 'organizacao',
  title: 'Organização',
  items: [
    { title: 'Time', url: '/time', icon: Users, permissoes: ADMIN_ORGANIZACAO },
    { title: 'Setores', url: '/organizacao/setores', icon: Network, permissoes: ADMIN_ORGANIZACAO },
  ],
};

export const podeVerItem = (item: Pick<NavItem, 'permissoes' | 'semPermissoes'>, podeAlguma: Verificador['podeAlguma']) =>
  (!item.permissoes || podeAlguma(item.permissoes)) && !(item.semPermissoes && podeAlguma(item.semPermissoes));

/** Grupos com os itens que a pessoa pode ver. Recebe `usePermissoes().podeAlguma`. */
export const visibleNavGroups = (podeAlguma: Verificador['podeAlguma']): NavGroup[] =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => podeVerItem(i, podeAlguma)) })).filter(
    (g) => g.items.length > 0,
  );

const ALL_ITEMS = [...NAV_GROUPS, NAV_ORGANIZACAO].flatMap((g) => g.items.map((item) => ({ item, group: g })));

/**
 * Item ativo = o de prefixo mais específico que casa com o caminho
 * (ex.: /vendas/nova ativa "Nova venda", não "Vendas").
 */
export const findActiveNav = (pathname: string) => {
  let best: (typeof ALL_ITEMS)[number] | null = null;
  for (const entry of ALL_ITEMS) {
    const { url } = entry.item;
    if ((pathname === url || pathname.startsWith(`${url}/`)) && (!best || url.length > best.item.url.length)) best = entry;
  }
  return best;
};

/** Páginas fora do menu que ainda aparecem no breadcrumb. */
const EXTRA_PAGES: Record<string, { group: string; title: string; semLink?: boolean }> = {
  '/time/eu': { group: 'Conta', title: 'Meu perfil' },
  '/organizacao/dados': { group: 'Organização', title: 'Dados da empresa' },
  '/clientes/contacts': { group: 'Cadastros', title: 'Contatos' },
  '/ui': { group: 'Desenvolvimento', title: 'UI kit' },
  // Não existe página em /servicos: o serviço só abre pelo id.
  '/servicos': { group: 'Execução', title: 'Serviço', semLink: true },
};

const SEGMENT_LABELS: Record<string, string> = { new: 'Novo cadastro', nova: 'Nova venda', edit: 'Editar', editar: 'Editar', conferencia: 'Conferência do faturamento' };

export interface Crumb {
  label: string;
  to?: string;
}

/** `Vendas › OS 682 › Editar` (o grupo sai quando tem o mesmo nome do item, como em Vendas). */
export const buildBreadcrumb = (pathname: string): Crumb[] => {
  const extraKey = Object.keys(EXTRA_PAGES)
    .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];

  let base: string;
  const crumbs: Crumb[] = [];
  if (extraKey) {
    base = extraKey;
    const extra = EXTRA_PAGES[extraKey];
    crumbs.push({ label: extra.group }, { label: extra.title, to: extra.semLink ? undefined : extraKey });
  } else {
    const active = findActiveNav(pathname);
    if (!active) return [];
    base = active.item.url;
    if (active.group.title !== active.item.title) crumbs.push({ label: active.group.title });
    crumbs.push({ label: active.item.title, to: active.item.url });
  }

  pathname
    .slice(base.length)
    .split('/')
    .filter(Boolean)
    .forEach((segment) => {
      if (/^\d+$/.test(segment)) {
        const prefix = base.startsWith('/ordens/operacionais') ? 'OSO' : base.startsWith('/vendas') || base.startsWith('/cobrancas') ? 'OS' : '#';
        crumbs.push({ label: prefix === '#' ? `#${segment}` : `${prefix} ${segment}`, to: `${base}/${segment}` });
      } else {
        crumbs.push({ label: SEGMENT_LABELS[segment] ?? segment });
      }
    });
  return crumbs;
};

/**
 * Breadcrumb das páginas internas (resumo da venda, edição, detalhe do serviço…), mostrado acima do título.
 * Nas páginas do menu fica vazio: a sidebar já marca onde a pessoa está.
 */
export const buildPageBreadcrumb = (pathname: string): Crumb[] => {
  const path = pathname.replace(/\/+$/, '');
  const paginaDoMenu = path in EXTRA_PAGES || findActiveNav(path)?.item.url === path;
  return paginaDoMenu ? [] : buildBreadcrumb(path);
};
