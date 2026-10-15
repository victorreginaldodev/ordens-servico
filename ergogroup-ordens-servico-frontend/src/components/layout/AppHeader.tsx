import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildPageBreadcrumb } from './navigation';
import { BuscaGatilho } from './CommandMenu';
import { MarcaSimbolo } from './Marca';

/**
 * Barra do topo, só no celular e no tablet: abre o menu, leva à tela inicial e abre a busca.
 * No computador não há header: a busca abre pelo Ctrl+K e o breadcrumb fica acima do título.
 */
export function AppHeader({ onOpenMenu, onOpenSearch }: { onOpenMenu: () => void; onOpenSearch: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-4" />
      </button>
      <Link to="/inicio" aria-label="Tela inicial" className="rounded-md p-1">
        <MarcaSimbolo className="size-7" />
      </Link>
      <span className="flex-1" />
      <BuscaGatilho onClick={onOpenSearch} />
    </header>
  );
}

/** Onde você está, acima do título; só nas páginas internas (ex.: `Vendas › OS 682 › Editar`). */
export function PageBreadcrumb() {
  const { pathname } = useLocation();
  const crumbs = buildPageBreadcrumb(pathname);
  if (!crumbs.length) return null;

  return (
    <nav aria-label="Você está em" className="mb-3">
      <ol className="flex min-w-0 items-center gap-1 text-xs">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 ? <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden /> : null}
              <li className={cn('min-w-0', i === 0 && crumbs.length > 2 && 'hidden md:block')}>
                {last || !c.to ? (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={cn('block truncate', last ? 'font-medium text-foreground' : 'text-muted-foreground')}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link to={c.to} className="block truncate rounded text-muted-foreground transition-colors hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
