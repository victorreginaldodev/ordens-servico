import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowRight, Clock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useUserRole } from '@/hooks/useUserRole';
import { authService } from '@/services/auth';
import { useUsers } from '@/features/time/hooks';
import { opcoesDePessoas } from '@/features/time/utils';
import { useOrdensLista, useServicosResumo, useTarefasResumo } from '../hooks';
import {
  formatShortDate,
  formatDaysCount,
  formatCurrency,
  getStatusLabel,
  getPriorityLabel,
  getUrgencyLevel,
  bucketTarefa,
  STATUS_DOT,
  PRIORITY_DOT,
  type UrgencyLevel,
  type TarefaBuckets,
} from '../utils';
import { OrdemServicoFiltros, defaultFilters, type FiltersState } from '../components/OrdemServicoFiltros';
import { OrdemServicoFiltrosAtivos } from '../components/OrdemServicoFiltrosAtivos';

const dotBadge = (dotColorClass: string, label: string) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorClass}`} />
    {label}
  </span>
);

const getDurationMeta = (ordem: {
  status: string;
  dias_em_aberto: number | null;
  dias_entre_criacao_e_conclusao: number | null;
}) => {
  const isDone = ordem.status === 'concluida';
  return {
    label: isDone ? 'até conclusão' : 'em aberto',
    value: formatDaysCount(
      isDone ? ordem.dias_entre_criacao_e_conclusao : ordem.dias_em_aberto,
    ),
  };
};

const URGENCY_PILL_CLASSES: Record<UrgencyLevel, string> = {
  alta: 'bg-red-500/10 text-red-600 dark:text-red-400 font-semibold',
  media: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium',
  muted: 'bg-transparent text-muted-foreground font-medium',
};

const PRIORITY_TEXT_CLASSES: Record<string, string> = {
  alta: 'text-red-600 dark:text-red-400 font-semibold',
  media: 'text-foreground font-medium',
  baixa: 'text-muted-foreground font-medium',
};

const TAREFA_BADGE: Record<keyof TarefaBuckets, { label: string; dot: string; activeClasses: string }> = {
  novas:     { label: 'Novas',        dot: 'bg-sky-500',   activeClasses: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  andamento: { label: 'Em andamento', dot: 'bg-amber-500', activeClasses: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  atrasadas: { label: 'Atrasadas',    dot: 'bg-red-500',   activeClasses: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

const STATUS_SORT: Record<string, number> = { aberta: 0, em_andamento: 1, concluida: 2, cancelada: 3 };
const PRIORITY_SORT: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

const useListaConfig = () => {
  const role = useUserRole();
  const { isTechnician, isSubLeadTechnician, isLeadTechnician, isAdministrativeSector, isFinance, canViewOrderValues } = role;

  const isTecnicoGestor = isLeadTechnician || isSubLeadTechnician;
  const showFin = canViewOrderValues;
  const showContrato = !(isTechnician || isTecnicoGestor);
  const showTarefas = isTechnician || isTecnicoGestor;

  let title = 'Ordens de Serviço';
  let subtitle = 'Visão comercial de todas as OS';
  let searchPlaceholder = 'Buscar por cliente, ID ou serviço...';

  if (isTechnician) {
    title = 'Minhas Ordens de Serviço';
    subtitle = 'OS com tarefas atribuídas a você';
    searchPlaceholder = 'Buscar nas minhas OS...';
  } else if (isTecnicoGestor) {
    title = 'Ordens de Serviço — Setor Técnico';
    subtitle = 'Carga e prioridade do time técnico';
  } else if (isFinance) {
    subtitle = 'Cobrança e faturamento';
    searchPlaceholder = 'Buscar por cliente, NF ou observação...';
  } else if (isAdministrativeSector) {
    subtitle = 'Contratos e dados cadastrais';
  }

  return {
    ...role,
    isTecnicoGestor,
    showFin,
    showContrato,
    showTarefas,
    tarefasColumnLabel: isTechnician ? 'Minhas tarefas' : 'Tarefas do setor',
    title,
    subtitle,
    searchPlaceholder,
  };
};

const OrdemServicoListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [page, setPage] = useState(1);

  const {
    isTechnician,
    isTecnicoGestor,
    showFin,
    showContrato,
    showTarefas,
    tarefasColumnLabel,
    canManageOrders,
    title,
    subtitle,
    searchPlaceholder,
  } = useListaConfig();

  const currentProfile = authService.getCurrentUser();
  const rawCurrentUserId = currentProfile?.user?.id ?? (currentProfile as any)?.id;
  const currentUserId = rawCurrentUserId != null ? Number(rawCurrentUserId) : undefined;

  const { data: ordens = [], isLoading } = useOrdensLista();
  const { data: usuarios = [] } = useUsers();
  const { data: servicosResumo = [], isLoading: loadingServicosResumo } = useServicosResumo();
  const { data: tarefasResumo = [], isLoading: loadingTarefasResumo } = useTarefasResumo();
  const loadingTarefaBuckets = loadingServicosResumo || loadingTarefasResumo;

  const technicianOptions = useMemo(() => opcoesDePessoas(usuarios), [usuarios]);

  const servicosPorOrdem = useMemo(() => {
    const acc: Record<number, typeof servicosResumo> = {};
    servicosResumo.forEach((s) => {
      (acc[s.ordem_servico] ??= []).push(s);
    });
    return acc;
  }, [servicosResumo]);

  const servicoIdParaOrdem = useMemo(() => {
    const acc: Record<number, number> = {};
    servicosResumo.forEach((s) => { acc[s.id] = s.ordem_servico; });
    return acc;
  }, [servicosResumo]);

  // Responsáveis por OS (via tarefa → serviço → OS) — usado só pelo filtro de técnico.
  const responsaveisPorOrdem = useMemo(() => {
    const acc: Record<number, Set<number>> = {};
    tarefasResumo.forEach((t) => {
      const ordemId = servicoIdParaOrdem[t.servico];
      if (ordemId === undefined) return;
      (acc[ordemId] ??= new Set()).add(t.responsavel);
    });
    return acc;
  }, [tarefasResumo, servicoIdParaOrdem]);

  // Balde de tarefas por OS: para o Técnico, escopado às próprias tarefas;
  // para Líder/Sub-Líder Técnico, agregado do time inteiro naquela OS.
  const tarefaBucketsPorOrdem = useMemo(() => {
    const acc: Record<number, TarefaBuckets> = {};
    tarefasResumo.forEach((t) => {
      const ordemId = servicoIdParaOrdem[t.servico];
      if (ordemId === undefined) return;
      if (isTechnician && t.responsavel !== currentUserId) return;
      const bucket = bucketTarefa(t);
      if (!bucket) return;
      const entry = (acc[ordemId] ??= { novas: 0, andamento: 0, atrasadas: 0 });
      entry[bucket] += 1;
    });
    return acc;
  }, [tarefasResumo, servicoIdParaOrdem, isTechnician, currentUserId]);

  // Escopo do Técnico: só OS com pelo menos uma tarefa dele — considera qualquer
  // status (não só as em aberto), diferente do balde acima que só conta pendentes.
  const ordensComTarefaDoTecnico = useMemo(() => {
    if (!isTechnician) return null;
    const set = new Set<number>();
    tarefasResumo.forEach((t) => {
      if (t.responsavel !== currentUserId) return;
      const ordemId = servicoIdParaOrdem[t.servico];
      if (ordemId !== undefined) set.add(ordemId);
    });
    return set;
  }, [isTechnician, tarefasResumo, servicoIdParaOrdem, currentUserId]);

  const baseOrdens = useMemo(() => {
    if (!isTechnician) return ordens;
    if (!ordensComTarefaDoTecnico) return [];
    return ordens.filter((o) => ordensComTarefaDoTecnico.has(o.id));
  }, [ordens, isTechnician, ordensComTarefaDoTecnico]);

  const filteredOrdens = baseOrdens.filter((ordem) => {
    const q = filters.search.trim().toLowerCase();
    const qCleanId = q.replace(/^#/, '');
    const matchesText =
      !q ||
      (ordem.cliente_nome ?? '').toLowerCase().includes(q) ||
      String(ordem.id).includes(qCleanId) ||
      (servicosPorOrdem[ordem.id] ?? []).some(
        (s) =>
          (s.catalogo_nome ?? '').toLowerCase().includes(q) ||
          (s.descricao ?? '').toLowerCase().includes(q),
      );

    const normStatus = ordem.status === ('aberto' as any) ? 'aberta' : ordem.status;
    const matchesStatus   = filters.status.length === 0 || filters.status.includes(normStatus);
    const matchesPriority = filters.priority.length === 0 || (!!ordem.prioridade && filters.priority.includes(ordem.prioridade));
    const matchesBilling  =
      !showFin || filters.billing === 'all' ||
      (filters.billing === 'paid'     && ordem.cobranca_realizada) ||
      (filters.billing === 'released' && !ordem.cobranca_realizada && ordem.liberada_para_cobranca) ||
      (filters.billing === 'unpaid'   && !ordem.cobranca_realizada && !ordem.liberada_para_cobranca);
    const matchesContract = !showContrato || !filters.contractOnly || ordem.contrato;
    const matchesTechnician =
      filters.technicianIds.length === 0 ||
      filters.technicianIds.some((tid) => responsaveisPorOrdem[ordem.id]?.has(Number(tid)));

    const createdStr = ordem.data_venda ? ordem.data_venda.slice(0, 10) : null;
    const startStr = filters.dateRange.from;
    const endStr = filters.dateRange.to;
    const matchesDate =
      (!startStr && !endStr) ||
      (!!createdStr && (!startStr || createdStr >= startStr) && (!endStr || createdStr <= endStr));

    return matchesText && matchesStatus && matchesPriority && matchesBilling && matchesContract && matchesDate && matchesTechnician;
  });

  const sortedOrdens = [...filteredOrdens].sort((a, b) => {
    const statusDiff = (STATUS_SORT[a.status] ?? 4) - (STATUS_SORT[b.status] ?? 4);
    if (statusDiff !== 0) return statusDiff;
    return (PRIORITY_SORT[a.prioridade ?? ''] ?? 3) - (PRIORITY_SORT[b.prioridade ?? ''] ?? 3);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedOrdens.length / itemsPerPage);
  const paginatedOrdens = sortedOrdens.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => {
    if (totalPages === 0) setPage(1);
    else if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const emptyTitle = isTechnician ? 'Nenhuma OS com tarefas suas' : 'Nenhuma ordem encontrada';
  const emptySubtitle = isTechnician
    ? 'Quando uma tarefa for atribuída a você, a OS aparece aqui automaticamente.'
    : 'Ajuste a busca ou os filtros acima para encontrar ordens de serviço.';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {isLoading ? 'carregando…' : `${filteredOrdens.length} ${filteredOrdens.length === 1 ? 'ordem' : 'ordens'}`}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {canManageOrders && (
          <Button variant="hero" onClick={() => navigate('/ordens/new')}>
            <Plus className="w-4 h-4" />
            Nova Ordem
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <OrdemServicoFiltros
          filters={filters}
          onChange={setFilters}
          technicianOptions={isTechnician ? [] : technicianOptions}
          showBilling={showFin}
          showContract={showContrato}
          searchPlaceholder={searchPlaceholder}
        />
        <OrdemServicoFiltrosAtivos filters={filters} onChange={setFilters} technicianOptions={technicianOptions} />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 min-w-[220px]">Cliente / OS</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[120px]">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[100px]">Prioridade</TableHead>
                  <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[130px]">Em aberto</TableHead>
                  {showTarefas && (
                    <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[200px]">{tarefasColumnLabel}</TableHead>
                  )}
                  {showContrato && (
                    <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[90px]">Contrato</TableHead>
                  )}
                  {showFin && (
                    <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[150px]">Cobrança</TableHead>
                  )}
                  {showFin && (
                    <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[110px] text-right">Valor</TableHead>
                  )}
                  <TableHead className="py-2 px-3 w-[40px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="border-border">
                        <TableCell className="py-3 px-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-20" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                        <TableCell className="py-3 px-3"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        {showTarefas && <TableCell className="py-3 px-3"><Skeleton className="h-5 w-32 rounded-md" /></TableCell>}
                        {showContrato && <TableCell className="py-3 px-3"><Skeleton className="h-4 w-14" /></TableCell>}
                        {showFin && <TableCell className="py-3 px-3"><Skeleton className="h-3 w-24" /></TableCell>}
                        {showFin && <TableCell className="py-3 px-3"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>}
                        <TableCell className="py-3 px-3" />
                      </TableRow>
                    ))
                  : paginatedOrdens.map((ordem) => {
                      const duration = getDurationMeta(ordem);
                      const urgencyLevel = getUrgencyLevel(ordem.status, ordem.dias_em_aberto);
                      const buckets = tarefaBucketsPorOrdem[ordem.id];
                      const accentRed = ordem.prioridade === 'alta' && urgencyLevel !== 'muted';

                      const cobranca = ordem.cobranca_realizada
                        ? { dot: 'bg-status-completed', label: 'Cobrança realizada' }
                        : ordem.liberada_para_cobranca
                        ? { dot: 'bg-yellow-500', label: 'Liberada' }
                        : { dot: 'bg-muted-foreground', label: 'Não liberada' };

                      return (
                        <TableRow
                          key={ordem.id}
                          className={`border-border hover:bg-muted/40 cursor-pointer transition-colors group ${accentRed ? 'border-l-2 border-l-red-500' : ''}`}
                          onClick={() => navigate(`/ordens/${ordem.id}`)}
                        >
                          <TableCell className="py-3 px-3">
                            <div>
                              <span className="text-sm font-semibold uppercase">{ordem.cliente_nome || '—'}</span>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-muted-foreground">
                                <span className="font-mono">#{ordem.id}</span>
                                <span className="opacity-50">·</span>
                                <span>{ordem.prazo ? `prazo ${formatShortDate(ordem.prazo)}` : 'sem prazo'}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-3">
                            {dotBadge(STATUS_DOT[ordem.status] ?? 'bg-muted-foreground', getStatusLabel(ordem.status))}
                          </TableCell>

                          <TableCell className="py-3 px-3">
                            {ordem.prioridade
                              ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px]">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[ordem.prioridade] ?? 'bg-muted-foreground'}`} />
                                  <span className={PRIORITY_TEXT_CLASSES[ordem.prioridade] ?? 'text-foreground'}>{getPriorityLabel(ordem.prioridade)}</span>
                                </span>
                              )
                              : <span className="text-[11px] text-muted-foreground">—</span>
                            }
                          </TableCell>

                          <TableCell className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[12px] tabular-nums ${URGENCY_PILL_CLASSES[urgencyLevel]}`}>
                                <Clock className="w-3 h-3" />
                                {duration.value ?? '—'}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{duration.label}</span>
                            </div>
                          </TableCell>

                          {showTarefas && (
                            <TableCell className="py-3 px-3">
                              {loadingTarefaBuckets ? (
                                <Skeleton className="h-5 w-32 rounded-md" />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {(Object.keys(TAREFA_BADGE) as (keyof TarefaBuckets)[]).map((key) => {
                                    const count = buckets?.[key] ?? 0;
                                    const cfg = TAREFA_BADGE[key];
                                    return (
                                      <span
                                        key={key}
                                        title={cfg.label}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${count > 0 ? cfg.activeClasses : 'bg-muted text-muted-foreground opacity-50'}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        {count}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </TableCell>
                          )}

                          {showContrato && (
                            <TableCell className="py-3 px-3">
                              {ordem.contrato ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                                  <FileCheck className="w-3 h-3" />
                                  Vigente
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          )}

                          {showFin && (
                            <TableCell className="py-3 px-3">
                              {dotBadge(cobranca.dot, cobranca.label)}
                            </TableCell>
                          )}

                          {showFin && (
                            <TableCell className="py-3 px-3 text-right">
                              <span className="text-sm font-semibold tabular-nums">{formatCurrency(ordem.valor)}</span>
                            </TableCell>
                          )}

                          <TableCell className="py-3 px-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/ordens/${ordem.id}`); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              title="Ver OS completa"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
                  {(() => {
                    const items: (number | 'ellipsis')[] = [];
                    if (totalPages <= 7) {
                      for (let p = 1; p <= totalPages; p++) items.push(p);
                    } else {
                      items.push(1);
                      const left = Math.max(page - 1, 2);
                      const right = Math.min(page + 1, totalPages - 1);
                      if (left > 2) items.push('ellipsis');
                      for (let p = left; p <= right; p++) items.push(p);
                      if (right < totalPages - 1) items.push('ellipsis');
                      items.push(totalPages);
                    }
                    return items.map((it, idx) => (
                      <PaginationItem key={`${it}-${idx}`}>
                        {it === 'ellipsis'
                          ? <PaginationEllipsis />
                          : <PaginationLink href="#" isActive={it === page} onClick={(e) => { e.preventDefault(); setPage(it as number); }}>{it}</PaginationLink>
                        }
                      </PaginationItem>
                    ));
                  })()}
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

          {!isLoading && filteredOrdens.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{emptySubtitle}</p>
              {!isTechnician && (
                <Button variant="outline" onClick={() => setFilters(defaultFilters)}>
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdemServicoListPage;
