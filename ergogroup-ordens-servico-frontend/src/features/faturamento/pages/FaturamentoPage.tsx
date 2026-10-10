import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  History,
  Lock,
  MoreHorizontal,
  Receipt,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoneyValue } from '@/components/common/MoneyValue';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, formatDate } from '@/features/ordens/utils';
import { useOperationalOrderPage } from '@/features/ordens/hooksOperacional';
import type { OperationalOrderItem } from '@/features/ordens/servicesOperacional';
import { STATUS_DOT as OSO_STATUS_DOT, getStatusLabel as getOsoStatusLabel } from '@/features/ordens/utilsOperacional';
import { OperationalOrderCobrancaDialog } from '@/features/ordens/components/OperationalOrderCobrancaDialog';
import { useBillingKpis, useBillingServiceOrdersPage } from '../hooks';
import { KpiCard } from '../components/KpiCard';
import { PillFilter, PillOption } from '../components/PillFilter';
import { DotBadge } from '../components/DotBadge';
import { BillingPager } from '../components/BillingPager';
import { OrdemBillingSheet } from '../components/OrdemBillingSheet';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: PillOption<'all' | 'concluida' | 'andamento'>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'andamento', label: 'Em andamento' },
];

const BILLING_OPTIONS: PillOption<'all' | 'realizada' | 'pendente'>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'realizada', label: 'Cobrada' },
  { value: 'pendente', label: 'Não cobrada' },
];

const FaturamentoPage = () => {
  const navigate = useNavigate();
  const { data: kpis, isLoading: isKpiLoading, isError: isKpiError } = useBillingKpis();

  // OS state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'concluida' | 'andamento'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'realizada' | 'pendente'>('pendente');
  const [ordersPage, setOrdersPage] = useState(1);

  // OS Operacionais state
  const [osoSearch, setOsoSearch] = useState('');
  const [osoBillingFilter, setOsoBillingFilter] = useState<'all' | 'realizada' | 'pendente'>('all');
  const [osoPage, setOsoPage] = useState(1);

  // Sheet state — OS
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'cobranca' | 'historico'>('cobranca');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Dialog state — OS Operacional
  const [cobrancaItem, setCobrancaItem] = useState<OperationalOrderItem | null>(null);

  const { data: ordersPageData, isLoading, isError } = useBillingServiceOrdersPage({
    page: ordersPage,
    pageSize: PAGE_SIZE,
    q: searchTerm,
    liberada: 'true',
    concluida:
      statusFilter === 'concluida' ? 'true' : statusFilter === 'andamento' ? 'false' : 'all',
    cobrancaRealizada:
      billingFilter === 'realizada' ? 'true' : billingFilter === 'pendente' ? 'false' : 'all',
  });
  const orders = ordersPageData?.items ?? [];
  const ordersTotalPages = ordersPageData?.totalPages ?? 1;

  // A API não expõe filtro por `gera_cobranca` — busca um lote amplo e filtra/pagina no cliente.
  const { data: osoPageData, isLoading: isOsoLoading, isError: isOsoError } = useOperationalOrderPage({
    page: 1,
    pageSize: 500,
    q: osoSearch || undefined,
    cobrancaRealizada: osoBillingFilter === 'all' ? undefined : osoBillingFilter === 'realizada' ? 'true' : 'false',
  });
  const osoBillableItems = (osoPageData?.items ?? []).filter((item) => item.geraCobranca);
  const osoTotalPages = Math.max(1, Math.ceil(osoBillableItems.length / PAGE_SIZE));
  const osoItems = osoBillableItems.slice((osoPage - 1) * PAGE_SIZE, osoPage * PAGE_SIZE);

  const { canAccessFinancials } = useUserRole();
  const canRegistrarCobranca = usePermissoes().pode('financeiro.registrar_cobranca');

  // Reset pages on filter change
  useEffect(() => { setOrdersPage(1); }, [searchTerm, statusFilter, billingFilter]);
  useEffect(() => { setOsoPage(1); }, [osoSearch, osoBillingFilter]);
  useEffect(() => {
    if (ordersPage > ordersTotalPages) setOrdersPage(ordersTotalPages);
  }, [ordersPage, ordersTotalPages]);
  useEffect(() => {
    if (osoPage > osoTotalPages) setOsoPage(osoTotalPages);
  }, [osoPage, osoTotalPages]);

  const openSheet = (id: number, tab: 'cobranca' | 'historico') => {
    setSheetTab(tab);
    setSelectedOrderId(id);
    setIsDialogOpen(true);
  };
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSelectedOrderId(null);
  };

  if (!canAccessFinancials) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-xl">Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Seu perfil não possui permissão para visualizar as informações financeiras.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // KPI proportions
  const kpiTotal = (kpis?.totalCobrado ?? 0) + (kpis?.totalParaCobrar ?? 0) + (kpis?.totalSemLiberacao ?? 0);
  const pctCobrado       = kpiTotal > 0 ? ((kpis?.totalCobrado ?? 0) / kpiTotal) * 100 : 0;
  const pctParaCobrar    = kpiTotal > 0 ? ((kpis?.totalParaCobrar ?? 0) / kpiTotal) * 100 : 0;
  const pctSemLiberacao  = kpiTotal > 0 ? ((kpis?.totalSemLiberacao ?? 0) / kpiTotal) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Ordens de serviço disponíveis para cobrança</p>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      {isKpiLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-1 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isKpiLoading && isKpiError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive text-sm">
            Não foi possível carregar os indicadores financeiros.
          </CardContent>
        </Card>
      )}

      {!isKpiLoading && !isKpiError && kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total cobrado"
            value={kpis.totalCobrado}
            icon={DollarSign}
            iconColor="bg-green-500/10 text-green-600 dark:text-green-400"
            barColor="bg-green-500"
            pct={pctCobrado}
          />
          <KpiCard
            label="Para cobrar"
            value={kpis.totalParaCobrar}
            icon={Clock}
            iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            barColor="bg-amber-400"
            pct={pctParaCobrar}
          />
          <KpiCard
            label="Sem liberação"
            value={kpis.totalSemLiberacao}
            icon={AlertCircle}
            iconColor="bg-muted text-muted-foreground"
            barColor="bg-muted-foreground"
            pct={pctSemLiberacao}
          />
        </div>
      )}

      {/* ── Main table card ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <Tabs defaultValue="os">
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <p className="text-sm font-semibold">Cobrança</p>
            <TabsList className="h-8">
              <TabsTrigger value="os" className="text-xs px-3">Ordens de Serviço</TabsTrigger>
              <TabsTrigger value="oso" className="text-xs px-3">OS Operacionais</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">

            {/* ── OS tab ─────────────────────────────────────────────────────── */}
            <TabsContent value="os" className="mt-0">
              {/* Filters */}
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-border">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por cliente ou nº OS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-secondary border-border text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-9 w-44 bg-secondary border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="andamento">Em andamento</SelectItem>
                  </SelectContent>
                </Select>
                <PillFilter options={BILLING_OPTIONS} value={billingFilter} onChange={(v) => setBillingFilter(v as any)} />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3">
                        Ordem de Serviço
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[90px]">
                        Liberação
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[130px]">
                        Liberado por
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[110px] text-right">
                        Valor
                      </TableHead>
                      <TableHead className="py-2 px-3 w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`sk-${i}`} className="border-border">
                          <TableCell className="py-3 px-3">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-40" />
                              <div className="flex gap-3">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="py-3 px-3"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="py-3 px-3"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell className="py-3 px-3" />
                        </TableRow>
                      ))}

                    {isError && !isLoading && (
                      <TableRow className="border-border">
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-destructive">
                          Não foi possível carregar as ordens de serviço.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && !isError && orders.length === 0 && (
                      <TableRow className="border-border">
                        <TableCell colSpan={5} className="py-10 text-center">
                          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma ordem encontrada</p>
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && !isError && orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-border hover:bg-muted/40 transition-colors group"
                      >
                        <TableCell className="py-3 px-3">
                          <div>
                            <span className="text-sm font-semibold uppercase">{order.cliente_nome}</span>
                            <div className="flex items-center gap-3 mt-1.5">
                              <DotBadge
                                colorClass={order.concluida ? 'bg-status-completed' : 'bg-status-progress'}
                                label={order.concluida ? 'Concluída' : 'Em andamento'}
                              />
                              <DotBadge
                                colorClass={order.cobranca_realizada ? 'bg-green-600' : 'bg-amber-500'}
                                label={order.cobranca_realizada ? 'Cobrada' : 'Liberada p/ cobrança'}
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">#{order.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDate(order.liberada_para_cobranca_em) ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                            {order.liberada_para_cobranca_por_nome ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-3 text-right">
                          <span className="text-sm font-semibold tabular-nums">
                            <MoneyValue value={Number(order.valor ?? 0)} formatter={formatCurrency} />
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openSheet(order.id, 'cobranca')}>
                                <Receipt className="mr-2 h-3.5 w-3.5" /> Cobrança
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openSheet(order.id, 'historico')}>
                                <History className="mr-2 h-3.5 w-3.5" /> Histórico
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/ordens/${order.id}`)}>
                                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver OS
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4">
                <BillingPager page={ordersPage} totalPages={ordersTotalPages} setPage={setOrdersPage} />
              </div>
            </TabsContent>

            {/* ── OS Operacionais tab ────────────────────────────────────────── */}
            <TabsContent value="oso" className="mt-0">
              {/* Filters */}
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-border">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por cliente ou catálogo..."
                    value={osoSearch}
                    onChange={(e) => setOsoSearch(e.target.value)}
                    className="pl-9 h-9 bg-secondary border-border text-sm"
                  />
                </div>
                <PillFilter options={BILLING_OPTIONS} value={osoBillingFilter} onChange={(v) => setOsoBillingFilter(v as any)} />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3">
                        OS Operacional
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[90px]">
                        Recebimento
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground py-2 px-3 w-[130px]">
                        Responsável
                      </TableHead>
                      <TableHead className="py-2 px-3 w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isOsoLoading &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`sk-oso-${i}`} className="border-border">
                          <TableCell className="py-3 px-3">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-40" />
                              <div className="flex gap-3">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="py-3 px-3"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="py-3 px-3" />
                        </TableRow>
                      ))}

                    {isOsoError && !isOsoLoading && (
                      <TableRow className="border-border">
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-destructive">
                          Não foi possível carregar as OS Operacionais.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isOsoLoading && !isOsoError && osoItems.length === 0 && (
                      <TableRow className="border-border">
                        <TableCell colSpan={4} className="py-10 text-center">
                          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma OS Operacional encontrada</p>
                        </TableCell>
                      </TableRow>
                    )}

                    {!isOsoLoading && !isOsoError && osoItems.map((item) => {
                      const cobrancaPendente = !item.cobrancaRealizada;
                      return (
                        <TableRow
                          key={item.id}
                          className="border-border hover:bg-muted/40 transition-colors group"
                        >
                          <TableCell className="py-3 px-3">
                            <div>
                              <span className="text-sm font-semibold uppercase">
                                {item.clienteNome || 'Cliente não informado'}
                              </span>
                              <div className="flex items-center gap-3 mt-1.5">
                                <DotBadge
                                  colorClass={OSO_STATUS_DOT[item.status] ?? 'bg-muted-foreground'}
                                  label={getOsoStatusLabel(item.status)}
                                />
                                <DotBadge
                                  colorClass={item.cobrancaRealizada ? 'bg-green-600' : 'bg-amber-500'}
                                  label={item.cobrancaRealizada ? `Cobrada${item.numeroNf ? ` · NF ${item.numeroNf}` : ''}` : 'Não cobrada'}
                                />
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {item.catalogoOperacionalNome ? `· ${item.catalogoOperacionalNome}` : ''}
                                  {' '}#{item.id}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatDate(item.dataRecebimento) ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                              {item.responsavelNome ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            {cobrancaPendente && canRegistrarCobranca && (
                              <button
                                type="button"
                                onClick={() => setCobrancaItem(item)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                                title="Registrar cobrança"
                              >
                                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4">
                <BillingPager page={osoPage} totalPages={osoTotalPages} setPage={setOsoPage} />
              </div>
            </TabsContent>

          </CardContent>
        </Tabs>
      </Card>

      <OrdemBillingSheet
        orderId={selectedOrderId}
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        tab={sheetTab}
        onTabChange={setSheetTab}
      />

      <OperationalOrderCobrancaDialog
        item={cobrancaItem}
        onOpenChange={(open) => { if (!open) setCobrancaItem(null); }}
      />
    </div>
  );
};

export default FaturamentoPage;
