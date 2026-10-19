import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCatalogosOperacionais, useDeleteCatalogoOperacional } from '../hooks';

const PAGE_SIZE = 10;

function buildPageEntries(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const entries: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) entries.push('ellipsis');
  for (let p = start; p <= end; p++) entries.push(p);
  if (end < total - 1) entries.push('ellipsis');
  entries.push(total);
  return entries;
}

const CatalogoOperacionalListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canManageQuickTasks: canManage } = useUserRole();
  const deleteItem = useDeleteCatalogoOperacional();

  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [page, setPage] = useState(Number(new URLSearchParams(location.search).get('page') ?? 1));

  const { data: allItems = [], isLoading } = useCatalogosOperacionais({ q: debouncedQuery || undefined });
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const items = useMemo(
    () => allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allItems, page],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query);
      const params = new URLSearchParams(location.search);
      if (query) params.set('q', query); else params.delete('q');
      if (page > 1) params.set('page', String(page)); else params.delete('page');
      navigate({ search: params.toString() }, { replace: true });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  useEffect(() => { setPage(1); }, [debouncedQuery]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const handleDelete = (id: number) => {
    if (window.confirm('Deseja excluir este serviço do catálogo?')) {
      deleteItem.mutate(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">Catálogo de OS Operacionais</h1>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {isLoading ? 'carregando…' : `${allItems.length} ${allItems.length === 1 ? 'serviço' : 'serviços'}`}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Serviços disponíveis para seleção nas Ordens de Serviço Operacionais.
          </p>
        </div>
        <Button variant="hero" disabled={!canManage} onClick={() => navigate('/catalogo/operacional/new')}>
          <Plus className="w-4 h-4" />
          Novo serviço
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-card border-border h-11 rounded-[11px] text-sm"
        />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[300px]">Nome</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[320px]">Descrição</TableHead>
                  <TableHead className="py-2 px-3 w-[40px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="border-border">
                        <TableCell className="py-3 px-3"><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="py-3 px-3" />
                      </TableRow>
                    ))
                  : items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={`border-border hover:bg-muted/40 transition-colors group ${canManage ? 'cursor-pointer' : ''}`}
                        onClick={canManage ? () => navigate(`/catalogo/operacional/${item.id}/edit`) : undefined}
                      >
                        <TableCell className="py-3 px-3">
                          <span className="text-sm font-semibold uppercase">{item.nome}</span>
                        </TableCell>

                        <TableCell className="py-3 px-3 max-w-[320px]">
                          <span className="text-sm text-muted-foreground truncate block" title={item.descricao ?? undefined}>{item.descricao || '—'}</span>
                        </TableCell>

                        <TableCell className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          {canManage ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/catalogo/operacional/${item.id}/edit`)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                }
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                      className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {buildPageEntries(page, totalPages).map((entry, idx) =>
                    entry === 'ellipsis' ? (
                      <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
                    ) : (
                      <PaginationItem key={entry}>
                        <PaginationLink
                          href="#"
                          isActive={entry === page}
                          onClick={(e) => { e.preventDefault(); setPage(entry as number); }}
                        >
                          {entry}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-12">
              <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum serviço cadastrado</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                {query ? 'Ajuste a busca acima para encontrar um serviço.' : 'Crie um serviço para utilizá-lo nas OS Operacionais.'}
              </p>
              {query && (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogoOperacionalListPage;
