import api from '@/services/api';
import { isPaginatedResponse, PageResult, toPageResult } from '@/services/pagination';
import { normalizeOrdemItem, type OrdemServicoItem } from '@/features/ordens/services';

// ── /api/ordens-servico/ordens/ (lista, filtrada para faturamento) ──────────

const ordensEndpoint = '/api/ordens-servico/ordens/';

export type BillingOrdersPageParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  concluida?: string; // 'true' | 'false' | 'all'
  cobrancaRealizada?: string; // 'true' | 'false' | 'all'
  liberada?: string; // 'true' | 'false'
};

export const getBillingServiceOrdersPage = async (
  params: BillingOrdersPageParams,
): Promise<PageResult<OrdemServicoItem>> => {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const queryParams: Record<string, string | number> = {};
  if (params.q) queryParams.q = params.q;
  if (params.concluida && params.concluida !== 'all') queryParams.concluida = params.concluida;
  if (params.cobrancaRealizada && params.cobrancaRealizada !== 'all') {
    queryParams.cobranca_realizada = params.cobrancaRealizada;
  }
  if (params.liberada) queryParams.liberada = params.liberada;

  const { data } = await api.get(ordensEndpoint, { params: queryParams });

  // O schema mostra esse endpoint devolvendo um array simples — sem paginação
  // nem parâmetros page/page_size documentados. Paginamos no cliente.
  if (isPaginatedResponse<any>(data)) {
    return { ...toPageResult(data, page, pageSize), items: data.results.map(normalizeOrdemItem) };
  }

  const all = (Array.isArray(data) ? data : []).map(normalizeOrdemItem);
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

  return {
    items,
    count: all.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    next: null,
    previous: null,
  };
};

// ── /api/analise/financeiro/ ──────────────────────────────────────────────────
// Schema: FinanceiroAnaliseResponse. Retorna 403 para perfis sem acesso financeiro.

export type BillingKpis = {
  totalCobrado: number;
  totalParaCobrar: number;
  totalSemLiberacao: number;
  ticketMedio: number | null;
};

export const getBillingKpis = async (): Promise<BillingKpis> => {
  const { data } = await api.get<any>('/api/analise/financeiro/');
  return {
    totalCobrado: Number(data.total_cobrado ?? 0),
    totalParaCobrar: Number(data.total_para_cobrar ?? 0),
    totalSemLiberacao: Number(data.total_sem_liberacao ?? 0),
    ticketMedio: data.ticket_medio != null ? Number(data.ticket_medio) : null,
  };
};
