import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildBreadcrumb } from './navigation';
import { CommandMenu } from './CommandMenu';

/** Header do painel: onde você está (breadcrumb) + busca global. Nada mais. */
export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const crumbs = buildBreadcrumb(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      <nav aria-label="Você está em" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden /> : null}
                <li className={cn('min-w-0', i === 0 && crumbs.length > 2 && 'hidden md:block')}>
                  {last || !c.to ? (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={cn('block truncate px-1', last ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                    >
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      to={c.to}
                      className="block truncate rounded px-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <CommandMenu />
    </header>
  );
}
