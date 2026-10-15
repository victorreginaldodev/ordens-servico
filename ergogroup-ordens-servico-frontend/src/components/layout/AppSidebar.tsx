import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, CircleHelp, PanelLeftClose, PanelLeftOpen, Sparkles, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissoes } from '@/hooks/usePermissoes';
import { cn } from '@/lib/utils';
import { Marca, MarcaSimbolo } from './Marca';
import { findActiveNav, visibleNavGroups, type NavItem } from './navigation';
import { UserMenu } from './UserMenu';

const GROUPS_KEY = 'sidebar:closed-groups';

/** Fora dos grupos do menu: fica no rodapé, para todos. A Ajuda abre em tela cheia, sem este menu. */
const AJUDA: NavItem = { title: 'Ajuda', url: '/ajuda', icon: CircleHelp };

const readClosedGroups = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '[]');
  } catch {
    return [];
  }
};

interface AppSidebarProps {
  collapsed: boolean;
  /** Recolher/expandir (desktop) ou fechar (gaveta no tablet/celular). */
  onToggle: () => void;
  /** Gaveta: sempre expandida e com botão de fechar. */
  variant?: 'rail' | 'drawer';
  onNavigate?: () => void;
  onOpenNews: () => void;
}

function NavLinkItem({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const link = (
    <Link
      to={item.url}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative mt-px flex h-9 items-center gap-2.5 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed ? 'justify-center px-0' : 'px-2.5',
        active
          ? 'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <item.icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

/** Sidebar do layout "painel inset" (docs/ui/wireframes/navegacao.html, direção A). */
export function AppSidebar({ collapsed: collapsedProp, onToggle, variant = 'rail', onNavigate, onOpenNews}: AppSidebarProps) {
  const { pathname } = useLocation();
  const { podeAlguma } = usePermissoes();
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);
  const collapsed = variant === 'rail' && collapsedProp;
  const activeUrl = findActiveNav(pathname)?.item.url;

  const toggleGroup = (id: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id];
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* preferência só desta sessão */
      }
      return next;
    });
  };

  const ToggleIcon = variant === 'drawer' ? X : collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = variant === 'drawer' ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu';

  return (
    <aside
      className={cn(
        'group/sidebar flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-in-out',
        variant === 'drawer' ? 'w-full' : collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Marca e recolher. Recolhida: o símbolo vira o botão de expandir ao passar o mouse. */}
      <div className={cn('flex h-14 shrink-0 items-center gap-2', collapsed ? 'justify-center' : 'pl-3.5 pr-2.5')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggle}
                aria-label={toggleLabel}
                className="group/marca grid size-9 place-items-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MarcaSimbolo className="size-7 group-hover/marca:hidden group-focus-visible/marca:hidden" />
                <ToggleIcon className="hidden size-4 text-muted-foreground group-hover/marca:block group-focus-visible/marca:block" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {toggleLabel}
              <kbd className="ml-2 rounded border px-1 text-2xs">[</kbd>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Link to="/inicio" onClick={onNavigate} aria-label="Tela inicial" className="min-w-0 flex-1 rounded-md">
              <Marca />
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label={toggleLabel}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ToggleIcon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {toggleLabel}
                {variant === 'rail' ? <kbd className="ml-2 rounded border px-1 text-2xs">[</kbd> : null}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3" aria-label="Navegação principal">
        {visibleNavGroups(podeAlguma).map((group) => {
          const closed = !collapsed && closedGroups.includes(group.id);
          return (
            <div key={group.id} className={collapsed ? 'mt-2 border-t pt-2 first:mt-0 first:border-0 first:pt-1' : 'mt-3'}>
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!closed}
                  className="flex w-full items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {group.title}
                  <ChevronDown className={cn('size-3 opacity-70 transition-transform', closed && '-rotate-90')} aria-hidden />
                </button>
              ) : null}
              {!closed
                ? group.items.map((item) => (
                    <NavLinkItem key={item.url} item={item} active={item.url === activeUrl} collapsed={collapsed} onNavigate={onNavigate} />
                  ))
                : null}
            </div>
          );
        })}
      </nav>

      {/* Rodapé: ajuda + novidades + usuário */}
      <div className="flex shrink-0 flex-col gap-0.5 px-2.5 pb-2.5 pt-1">
        <NavLinkItem item={AJUDA} active={false} collapsed={collapsed} onNavigate={onNavigate} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenNews}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                collapsed ? 'justify-center' : 'px-2.5',
              )}
            >
              <Sparkles className="size-4 shrink-0" aria-hidden />
              {!collapsed ? (
                <>
                  <span className="flex-1 text-left">Novidades</span>
                  <span className="rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground">EV2</span>
                </>
              ) : null}
            </button>
          </TooltipTrigger>
          {collapsed ? <TooltipContent side="right">Novidades</TooltipContent> : null}
        </Tooltip>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
