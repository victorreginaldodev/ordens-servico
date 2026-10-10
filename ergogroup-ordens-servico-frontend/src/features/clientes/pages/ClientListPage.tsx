import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit, MoreVertical, Plus, Search, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientsPage, useDeleteClient } from '../hooks';
import type { TipoCliente, TipoInscricao } from '../services';

const PAGE_SIZE = 10;

const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  gestao: 'Gestão',
  avulso: 'Avulso',
  fornecedor: 'Fornecedor',
};

const TIPO_CLIENTE_DOT: Record<TipoCliente, string> = {
  gestao: 'bg-sky-500',
  avulso: 'bg-muted-foreground',
  fornecedor: 'bg-purple-500',
};

const TIPO_INSCRICAO_LABEL: Record<TipoInscricao, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  cei: 'CEI',
  cno: 'CNO',
  caepf: 'CAEPF',
};

const formatDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const dotBadge = (dotColorClass: string, label: string) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorClass}`} />
    {label}
  </span>
);

const ClientListPage = () => {
  const del = useDeleteClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState<string>(new URLSearchParams(location.search).get('q') || '');

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (query) params.set('q', query);
      else params.delete('q');
      navigate({ search: params.toString() }, { replace: true });
    }, 250);
    return () => clearTimeout(id);
  }, [query, location.search, navigate]);

  const { data, isLoading } = useClientsPage({
    page,
    pageSize: PAGE_SIZE,
    q: query || undefined,
  });
  const clients = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.count ?? 0;

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {isLoading ? 'carregando…' : `${totalCount} ${totalCount === 1 ? 'cliente' : 'clientes'}`}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => navigate('/clientes/new')} variant="hero">
          <Plus className="w-4 h-4" />
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome ou inscrição..."
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
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 min-w-[220px]">Cliente</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[110px]">Tipo</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 min-w-[200px]">Representante</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[110px]">Cliente desde</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[90px]">Ativo</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[150px]">Cobrança revisão</TableHead>
                  <TableHead className="py-2 px-3 w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="border-border">
                        <TableCell className="py-3 px-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-12" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-12" /></TableCell>
                        <TableCell className="py-3 px-3" />
                      </TableRow>
                    ))
                  : clients.map((c) => (
                      <TableRow
                        key={c.id}
                        className="border-border hover:bg-muted/40 cursor-pointer transition-colors group"
                        onClick={() => navigate(`/clientes/${c.id}/edit`)}
                      >
                        <TableCell className="py-3 px-3">
                          <div>
                            <span className="text-sm font-semibold uppercase">{c.name}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-muted-foreground">
                              {c.tipo_inscricao && <span>{TIPO_INSCRICAO_LABEL[c.tipo_inscricao]}</span>}
                              {c.tipo_inscricao && c.document && <span className="opacity-50">·</span>}
                              {c.document && <span className="font-mono">{c.document}</span>}
                              {!c.tipo_inscricao && !c.document && <span>sem inscrição</span>}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          {c.tipoCliente
                            ? dotBadge(TIPO_CLIENTE_DOT[c.tipoCliente], TIPO_CLIENTE_LABEL[c.tipoCliente])
                            : <span className="text-[11px] text-muted-foreground">—</span>
                          }
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          {c.representativeName ? (
                            <div>
                              <p className="text-sm">{c.representativeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {[c.representativeSector, c.representativeEmail].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem representante</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          <span className="text-sm tabular-nums text-muted-foreground">{formatDate(c.createdAt) ?? '—'}</span>
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          {dotBadge(c.active ? 'bg-status-completed' : 'bg-muted-foreground', c.active ? 'Sim' : 'Não')}
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          {dotBadge(c.chargeRevisionChange ? 'bg-yellow-500' : 'bg-muted-foreground', c.chargeRevisionChange ? 'Sim' : 'Não')}
                        </TableCell>

                        <TableCell className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/clientes/${c.id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => del.mutate(c.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} className={page === 1 ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                  {(() => {
                    const pages: (number | 'ellipsis')[] = [];
                    if (totalPages <= 7) {
                      for (let p = 1; p <= totalPages; p++) pages.push(p);
                    } else {
                      pages.push(1);
                      const left = Math.max(page - 1, 2);
                      const right = Math.min(page + 1, totalPages - 1);
                      if (left > 2) pages.push('ellipsis');
                      for (let p = left; p <= right; p++) pages.push(p);
                      if (right < totalPages - 1) pages.push('ellipsis');
                      pages.push(totalPages);
                    }
                    return pages.map((it, idx) => (
                      <PaginationItem key={`${it}-${idx}`}>
                        {it === 'ellipsis' ? <PaginationEllipsis /> : (
                          <PaginationLink href="#" isActive={it === page} onClick={(e) => { e.preventDefault(); setPage(it as number); }}>
                            {it as number}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ));
                  })()}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} className={page === totalPages ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {!isLoading && clients.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                {query ? 'Ajuste a busca acima para encontrar um cliente.' : 'Adicione um novo cliente para começar.'}
              </p>
              {query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Limpar busca
                </Button>
              ) : (
                <Button variant="hero" onClick={() => navigate('/clientes/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientListPage;
