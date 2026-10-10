import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Conteúdo extra à esquerda (ex.: total em R$ da página). */
  summary?: React.ReactNode;
}

const pageList = (page: number, pages: number): Array<number | 'gap'> => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: Array<number | 'gap'> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pages - 1, page + 1);
  if (left > 2) out.push('gap');
  for (let p = left; p <= right; p++) out.push(p);
  if (right < pages - 1) out.push('gap');
  out.push(pages);
  return out;
};

const navBtn =
  'grid h-7 min-w-7 place-items-center rounded-md px-1 text-xs tabular-nums transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Rodapé único das tabelas: `1–50 de 143` · linhas por página · navegação. */
export function DataTablePagination({ page, pageSize, total, pageSizeOptions, onPageChange, onPageSizeChange, summary }: DataTablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2.5 text-xs text-muted-foreground">
      <span className="tabular-nums">{total ? `${from}–${to} de ${total}` : '0 resultados'}</span>
      {summary}
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Linhas por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-16 text-xs" aria-label="Linhas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pages > 1 ? (
          <nav className="flex items-center gap-0.5 text-foreground" aria-label="Paginação">
            <button type="button" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
              <ChevronLeft className="size-4" />
            </button>
            {pageList(page, pages).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(navBtn, p === page && 'bg-foreground font-semibold text-background hover:bg-foreground')}
                >
                  {p}
                </button>
              ),
            )}
            <button type="button" className={navBtn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
              <ChevronRight className="size-4" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
