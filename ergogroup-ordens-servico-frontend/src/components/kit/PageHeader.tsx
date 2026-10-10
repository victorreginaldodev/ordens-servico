import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: React.ReactNode;
  /** Total exibido ao lado do título. `null` enquanto carrega. */
  count?: number | null;
  description?: React.ReactNode;
  /** Ações à direita; no máximo uma primária. */
  actions?: React.ReactNode;
  /** Rota de volta (páginas de detalhe/formulário). */
  backTo?: string;
  className?: string;
}

/** Cabeçalho padrão de página (docs/ui/design-system.md §3.4). */
export function PageHeader({ title, count, description, actions, backTo, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Voltar"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="truncate">{title}</span>
            {count !== undefined ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {count ?? '…'}
              </span>
            ) : null}
          </h1>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
