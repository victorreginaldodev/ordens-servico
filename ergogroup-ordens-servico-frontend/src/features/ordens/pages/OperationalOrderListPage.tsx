import { useEffect, useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useUsers } from '@/features/time/hooks';
import { opcoesDePessoas } from '@/features/time/utils';
import { useOperationalOrderPage } from '../hooksOperacional';
import { OperationalOrderItem } from '../servicesOperacional';
import { STATUS_ORDER } from '../utilsOperacional';
import {
  OperationalOrderFilters,
  OperationalOrderFiltersState,
  defaultFilters,
} from '../components/OperationalOrderFilters';
import { OperationalOrderActiveFilters } from '../components/OperationalOrderActiveFilters';
import { OperationalOrderRow } from '../components/OperationalOrderRow';
import { OperationalOrderForm } from '../components/OperationalOrderForm';
import { OperationalOrderCobrancaDialog } from '../components/OperationalOrderCobrancaDialog';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

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

const OperationalOrderListPage = () => {
  const { canManageQuickTasks: canManage } = useUserRole();
  const canRegistrarCobranca = usePermissoes().pode('financeiro.registrar_cobranca');

  const [filters, setFilters] = useState<OperationalOrderFiltersState>(defaultFilters);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [cobrancaItem, setCobrancaItem] = useState<OperationalOrderItem | null>(null);

  const { data: usuarios = [] } = useUsers();
  const technicianOptions = useMemo(() => opcoesDePessoas(usuarios), [usuarios]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const { data: pageResult, isLoading, error } = useOperationalOrderPage({
    page,
    pageSize: PAGE_SIZE,
    q: debouncedSearch || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    prioridade: filters.prioridade !== 'all' ? filters.prioridade : undefined,
    cobrancaRealizada: filters.cobrancaRealizada !== 'all' ? filters.cobrancaRealizada : undefined,
    responsavel: filters.responsavel !== 'all' ? Number(filters.responsavel) : undefined,
    atrasada: filters.atrasada || undefined,
    ordering: filters.ordering !== 'none' ? filters.ordering : undefined,
  });

  const items = pageResult?.items ?? [];
  const totalCount = pageResult?.count ?? 0;
  const totalPages = pageResult?.totalPages ?? 1;

  const sorted = useMemo(() => {
    if (filters.ordering !== 'none') return items;
    return [...items].sort((a, b) => {
      const diff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
      if (diff !== 0) return diff;
      return b.id - a.id;
    });
  }, [items, filters.ordering]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.prioridade, filters.cobrancaRealizada, filters.responsavel, filters.atrasada, filters.ordering]);

  const openCreate = () => {
    if (!canManage) return;
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (item: OperationalOrderItem) => {
    if (!canManage) return;
    setEditId(item.id);
    setFormOpen(true);
  };

  if (error) {
    return <div className="text-destructive">Falha ao carregar OS Operacionais.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">OS Operacionais</h1>
          <p className="text-muted-foreground">Gerencie as ordens de serviço operacionais</p>
        </div>
        {canManage && (
          <Button variant="hero" onClick={openCreate}>
            Nova OS Operacional
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <OperationalOrderFilters filters={filters} onChange={setFilters} technicianOptions={technicianOptions} />
        <OperationalOrderActiveFilters filters={filters} onChange={setFilters} technicianOptions={technicianOptions} />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3">
                    OS Operacional
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[110px]">
                    Recebimento
                  </TableHead>
                  <TableHead className="py-2 px-3 w-[72px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="py-3 px-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-3 w-10" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-20" /></TableCell>
                        <TableCell className="py-3 px-3" />
                      </TableRow>
                    ))
                  : sorted.map((item) => (
                      <OperationalOrderRow
                        key={item.id}
                        item={item}
                        canManage={canManage}
                        onEdit={openEdit}
                        onRegistrarCobranca={canRegistrarCobranca ? setCobrancaItem : undefined}
                      />
                    ))}
              </TableBody>
            </Table>
          </div>

          <div className="px-3 flex items-center">
            <Separator className="flex-1" />
            {!isLoading && (
              <span className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                {totalCount} {totalCount === 1 ? 'ordem' : 'ordens'}
              </span>
            )}
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

          {!isLoading && totalCount === 0 && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma OS Operacional encontrada</h3>
              <p className="text-muted-foreground mb-4">Tente ajustar os filtros ou crie uma nova OS</p>
              {canManage && (
                <Button variant="hero" onClick={openCreate}>
                  Nova OS Operacional
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <OperationalOrderForm
        open={canManage && formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditId(null);
        }}
        editId={editId}
      />

      <OperationalOrderCobrancaDialog
        item={cobrancaItem}
        onOpenChange={(open) => { if (!open) setCobrancaItem(null); }}
      />
    </div>
  );
};

export default OperationalOrderListPage;
