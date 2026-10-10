import {
  Activity,
  Boxes,
  Building2,
  ClipboardList,
  Package,
  Receipt,
  Users,
  Network,
  KeyRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Permissao } from '@/lib/permissoes';

/**
 * Configuração única da navegação: menu lateral, breadcrumb e busca global
 * leem daqui. Para incluir uma página no menu, adicione-a a um grupo.
 */

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Só aparece para quem tem ao menos uma destas permissões. Sem o campo, aparece para todos. */
  permissoes?: Permissao[];
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operacao',
    title: 'Operação',
    items: [
      { title: 'Ordens de serviço', url: '/ordens', icon: ClipboardList },
      { title: 'OS operacionais', url: '/ordens/operacionais', icon: Wrench },
      {
        title: 'Cobranças',
        url: '/cobrancas',
        icon: Receipt,
        permissoes: ['financeiro.ver_valores', 'financeiro.registrar_cobranca'],
      },
    ],
  },
  {
    id: 'analise',
    title: 'Análise',
    items: [
      { title: 'Operacional', url: '/analise/operacional', icon: Activity },
      { title: 'Financeiro', url: '/analise/financeiro', icon: Wallet, permissoes: ['financeiro.ver_valores'] },
    ],
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    items: [
      { title: 'Clientes', url: '/clientes', icon: Building2 },
    ],
  },
  {
    id: 'organizacao',
    title: 'Organização',
    items: [
      { title: 'Time', url: '/time', icon: Users },
      { title: 'Setores', url: '/organizacao/setores', icon: Network },
      {
        title: 'Funções e permissões',
        url: '/organizacao/funcoes',
        icon: KeyRound,
        permissoes: ['organizacao.configurar', 'usuarios.gerenciar'],
      },
      { title: 'Catálogo', url: '/catalogo', icon: Package },
      { title: 'Catálogo operacional', url: '/catalogo/operacional', icon: Boxes },
    ],
  },
];

/** Grupos com os itens que a pessoa pode ver. Recebe `usePermissoes().podeAlguma`. */
export const visibleNavGroups = (podeAlguma: (permissoes: Permissao[]) => boolean): NavGroup[] =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.permissoes || podeAlguma(i.permissoes)) })).filter(
    (g) => g.items.length > 0,
  );

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ item, group: g })));

/**
 * Item ativo = o de prefixo mais específico que casa com o caminho
 * (ex.: /ordens/operacionais ativa "OS operacionais", não "Ordens de serviço").
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
const EXTRA_PAGES: Record<string, { group: string; title: string }> = {
  '/time/eu': { group: 'Conta', title: 'Meu perfil' },
  '/organizacao/dados': { group: 'Organização', title: 'Dados da empresa' },
  '/clientes/contacts': { group: 'Cadastros', title: 'Contatos' },
  '/ui': { group: 'Desenvolvimento', title: 'UI kit' },
};

const SEGMENT_LABELS: Record<string, string> = { new: 'Novo cadastro', edit: 'Editar' };

export interface Crumb {
  label: string;
  to?: string;
}

/** `Operação › Ordens de serviço › OS 682 › Editar` */
export const buildBreadcrumb = (pathname: string): Crumb[] => {
  const extraKey = Object.keys(EXTRA_PAGES)
    .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];

  let base: string;
  const crumbs: Crumb[] = [];
  if (extraKey) {
    base = extraKey;
    crumbs.push({ label: EXTRA_PAGES[extraKey].group }, { label: EXTRA_PAGES[extraKey].title, to: extraKey });
  } else {
    const active = findActiveNav(pathname);
    if (!active) return [];
    base = active.item.url;
    crumbs.push({ label: active.group.title }, { label: active.item.title, to: active.item.url });
  }

  pathname
    .slice(base.length)
    .split('/')
    .filter(Boolean)
    .forEach((segment) => {
      if (/^\d+$/.test(segment)) {
        const prefix = base.startsWith('/ordens/operacionais') ? 'OSO' : base.startsWith('/ordens') ? 'OS' : '#';
        crumbs.push({ label: prefix === '#' ? `#${segment}` : `${prefix} ${segment}`, to: `${base}/${segment}` });
      } else {
        crumbs.push({ label: SEGMENT_LABELS[segment] ?? segment });
      }
    });
  return crumbs;
};
