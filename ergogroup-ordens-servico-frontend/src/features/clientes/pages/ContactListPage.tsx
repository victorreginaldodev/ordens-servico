import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Contact as ContactIcon, Edit, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useClients, useContacts, useDeleteContact } from '../hooks';
import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const ContactListPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: clients = [] } = useClients();
  const del = useDeleteContact();
  const navigate = useNavigate();
  const location = useLocation();

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach(c => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const [query, setQuery] = useState<string>(new URLSearchParams(location.search).get('q') || '');
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (query) params.set('q', query);
      else params.delete('q');
      navigate({ search: params.toString() }, { replace: true });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const q = query.toLowerCase();
  const filtered = q
    ? contacts.filter(c =>
        [c.nome, c.email, c.telefone, c.setor].filter(Boolean).some(v => v!.toLowerCase().includes(q))
      )
    : contacts;

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pageContacts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">Contatos</h1>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {isLoading ? 'carregando…' : `${filtered.length} ${filtered.length === 1 ? 'contato' : 'contatos'}`}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Gerencie contatos de clientes</p>
        </div>
        <Button onClick={() => navigate('/clientes/contacts/new')} variant="hero">
          <Plus className="w-4 h-4" />
          Novo contato
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome, e-mail ou setor..."
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
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 min-w-[220px]">Contato</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 min-w-[220px]">E-mail</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[160px]">Telefone</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[200px]">Cliente</TableHead>
                  <TableHead className="py-2 px-3 w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="border-border">
                        <TableCell className="py-3 px-3"><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-24" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-32" /></TableCell>
                        <TableCell className="py-3 px-3" />
                      </TableRow>
                    ))
                  : pageContacts.map((c) => (
                      <TableRow
                        key={c.id}
                        className="border-border hover:bg-muted/40 cursor-pointer transition-colors group"
                        onClick={() => navigate(`/clientes/contacts/${c.id}/edit`)}
                      >
                        <TableCell className="py-3 px-3">
                          <div>
                            <p className="text-sm font-semibold">{c.nome}</p>
                            {c.setor && <p className="text-xs text-muted-foreground">{c.setor}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3 text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                        <TableCell className="py-3 px-3 text-sm text-muted-foreground">{c.telefone || '—'}</TableCell>
                        <TableCell className="py-3 px-3 text-sm text-muted-foreground">{clientNameById.get(c.cliente) || '—'}</TableCell>
                        <TableCell className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/clientes/contacts/${c.id}/edit`)}>
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

          {!isLoading && pageContacts.length === 0 && (
            <div className="text-center py-12">
              <ContactIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum contato encontrado</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                {query ? 'Ajuste a busca acima para encontrar um contato.' : 'Adicione um representante a um cliente para ele aparecer aqui.'}
              </p>
              {query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Limpar busca
                </Button>
              ) : (
                <Button variant="hero" onClick={() => navigate('/clientes/contacts/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo contato
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactListPage;
