import api from '@/services/api';
import { isPaginatedResponse, PageResult, toPageResult } from '@/services/pagination';

const ENDPOINT = '/api/ordens-servico/operacionais/';

// ── Types ────────────────────────────────────────────────────────────────────

export type OperationalOrderStatus = 'nao_iniciado' | 'em_andamento' | 'finalizada';
export type OperationalOrderPrioridade = 'baixa' | 'media' | 'alta';

export interface OperationalOrderItem {
  id: number;
  clienteId: number;
  clienteNome: string;
  catalogoOperacionalId: number;
  catalogoOperacionalNome: string;
  responsavelId: number;
  responsavelNome: string;
  status: OperationalOrderStatus;
  statusDisplay: string;
  prioridade: OperationalOrderPrioridade;
  prioridadeDisplay: string;
  prazo: string | null;
  horasEstimadas: string | null;
  horasEstimadasEfetivas: string | null;
  complexidade: number | null;
  complexidadeDisplay: string | null;
  revisaoCliente: boolean;
  geraCobranca: boolean;
  cobrancaRealizada: boolean;
  numeroNf: string | null;
  cobrancaRealizadaPorNome: string | null;
  dataLiberacaoCobranca: string | null;
  liberadaCobrancaPorNome: string | null;
  dataRecebimento: string | null;
  dataInicio: string | null;
  dataTermino: string | null;
  criadaEm: string;
  atualizadoEm: string;
}

export interface OperationalOrderDetail extends OperationalOrderItem {
  clienteDetalhe: { id: number; nome: string; tipoCliente: string | null } | null;
  catalogoOperacionalDetalhe: { id: number; nome: string; descricao: string | null } | null;
  quantidade: number;
  descricao: string | null;
}

export interface CreateOperationalOrderPayload {
  cliente: number;
  catalogoOperacional: number;
  responsavel?: number;
  quantidade: number;
  descricao?: string | null;
  dataRecebimento: string;
  dataInicio?: string | null;
  dataTermino?: string | null;
  prazo?: string | null;
  prioridade?: OperationalOrderPrioridade;
  status?: OperationalOrderStatus;
  revisaoCliente?: boolean;
  horasEstimadas?: string | null;
  complexidade?: number | null;
}

export interface UpdateOperationalOrderPayload {
  cliente?: number;
  catalogoOperacional?: number;
  responsavel?: number;
  quantidade?: number;
  descricao?: string | null;
  dataRecebimento?: string;
  dataInicio?: string | null;
  dataTermino?: string | null;
  prazo?: string | null;
  prioridade?: OperationalOrderPrioridade;
  status?: OperationalOrderStatus;
  revisaoCliente?: boolean;
  horasEstimadas?: string | null;
  complexidade?: number | null;
}

export interface OperationalOrderListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  prioridade?: string;
  cobrancaRealizada?: string;
  responsavel?: number;
  cliente?: number;
  atrasada?: boolean;
  ordering?: 'prazo' | '-prazo';
}

// ── Normalization ─────────────────────────────────────────────────────────────

const normalizeItem = (dto: any): OperationalOrderItem => ({
  id: dto.id,
  clienteId: dto.cliente,
  clienteNome: dto.cliente_nome ?? '',
  catalogoOperacionalId: dto.catalogo_operacional,
  catalogoOperacionalNome: dto.catalogo_operacional_nome ?? '',
  responsavelId: dto.responsavel,
  responsavelNome: dto.responsavel_nome ?? '',
  status: dto.status ?? 'nao_iniciado',
  statusDisplay: dto.status_display ?? '',
  prioridade: dto.prioridade ?? 'baixa',
  prioridadeDisplay: dto.prioridade_display ?? '',
  prazo: dto.prazo ?? null,
  horasEstimadas: dto.horas_estimadas ?? null,
  horasEstimadasEfetivas: dto.horas_estimadas_efetivas ?? null,
  complexidade: dto.complexidade ?? null,
  complexidadeDisplay: dto.complexidade_display ?? null,
  revisaoCliente: Boolean(dto.revisao_cliente),
  geraCobranca: Boolean(dto.gera_cobranca),
  cobrancaRealizada: Boolean(dto.cobranca_realizada),
  numeroNf: dto.numero_nf ?? null,
  cobrancaRealizadaPorNome: dto.cobranca_realizada_por_nome ?? null,
  dataLiberacaoCobranca: dto.data_liberacao_cobranca ?? null,
  liberadaCobrancaPorNome: dto.liberada_cobranca_por_nome ?? null,
  dataRecebimento: dto.data_recebimento ?? null,
  dataInicio: dto.data_inicio ?? null,
  dataTermino: dto.data_termino ?? null,
  criadaEm: dto.criada_em ?? '',
  atualizadoEm: dto.atualizado_em ?? '',
});

const normalizeDetail = (dto: any): OperationalOrderDetail => ({
  ...normalizeItem(dto),
  // O endpoint de detalhe (`OrdemServicoOperacional`) não tem os campos achatados
  // `cliente_nome`/`catalogo_operacional_nome` — só existem no de listagem
  // (`OrdemServicoOperacionalList`). No detalhe, vêm aninhados em `*_detail`.
  clienteNome: dto.cliente_nome ?? dto.cliente_detail?.nome ?? '',
  catalogoOperacionalNome: dto.catalogo_operacional_nome ?? dto.catalogo_operacional_detail?.nome ?? '',
  clienteDetalhe: dto.cliente_detail
    ? { id: dto.cliente_detail.id, nome: dto.cliente_detail.nome, tipoCliente: dto.cliente_detail.tipo_cliente ?? null }
    : null,
  catalogoOperacionalDetalhe: dto.catalogo_operacional_detail
    ? {
        id: dto.catalogo_operacional_detail.id,
        nome: dto.catalogo_operacional_detail.nome,
        descricao: dto.catalogo_operacional_detail.descricao ?? null,
      }
    : null,
  quantidade: Number(dto.quantidade ?? 1),
  descricao: dto.descricao ?? null,
});

// ── Operational Order functions ───────────────────────────────────────────────

export const getOperationalOrderList = async (): Promise<OperationalOrderItem[]> => {
  const { data } = await api.get(ENDPOINT);
  return (Array.isArray(data) ? data : []).map(normalizeItem);
};

export const getOperationalOrderPage = async (
  params: OperationalOrderListParams,
): Promise<PageResult<OperationalOrderItem>> => {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const queryParams: Record<string, string | number> = {};
  if (params.q) queryParams.q = params.q;
  if (params.status && params.status !== 'all') queryParams.status = params.status;
  if (params.prioridade && params.prioridade !== 'all') queryParams.prioridade = params.prioridade;
  if (params.cobrancaRealizada !== undefined) queryParams.cobranca_realizada = params.cobrancaRealizada;
  if (params.responsavel) queryParams.responsavel = params.responsavel;
  if (params.cliente) queryParams.cliente = params.cliente;
  if (params.atrasada) queryParams.atrasada = 'true';
  if (params.ordering) queryParams.ordering = params.ordering;

  const { data } = await api.get(ENDPOINT, { params: queryParams });

  // O schema mostra esse endpoint devolvendo um array simples — sem paginação
  // nem parâmetros page/page_size documentados. Paginamos no cliente, mas
  // seguimos tratando uma eventual resposta paginada por segurança.
  if (isPaginatedResponse<any>(data)) {
    return { ...toPageResult(data, page, pageSize), items: data.results.map(normalizeItem) };
  }

  const all = (Array.isArray(data) ? data : []).map(normalizeItem);
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

export const getOperationalOrderDetail = async (id: number): Promise<OperationalOrderDetail> => {
  const { data } = await api.get(`${ENDPOINT}${id}/`);
  return normalizeDetail(data);
};

export const createOperationalOrder = async (
  payload: CreateOperationalOrderPayload,
): Promise<OperationalOrderDetail> => {
  const { data } = await api.post(ENDPOINT, {
    cliente: payload.cliente,
    catalogo_operacional: payload.catalogoOperacional,
    responsavel: payload.responsavel,
    quantidade: payload.quantidade,
    descricao: payload.descricao ?? null,
    data_recebimento: payload.dataRecebimento,
    data_inicio: payload.dataInicio ?? null,
    data_termino: payload.dataTermino ?? null,
    prazo: payload.prazo ?? null,
    prioridade: payload.prioridade ?? 'baixa',
    status: payload.status ?? 'nao_iniciado',
    revisao_cliente: payload.revisaoCliente ?? false,
    horas_estimadas: payload.horasEstimadas ?? null,
    complexidade: payload.complexidade ?? null,
  });
  return normalizeDetail(data);
};

export const updateOperationalOrder = async (
  id: number,
  payload: UpdateOperationalOrderPayload,
): Promise<OperationalOrderDetail> => {
  const body: Record<string, any> = {};
  if (payload.cliente !== undefined) body.cliente = payload.cliente;
  if (payload.catalogoOperacional !== undefined) body.catalogo_operacional = payload.catalogoOperacional;
  if (payload.responsavel !== undefined) body.responsavel = payload.responsavel;
  if (payload.quantidade !== undefined) body.quantidade = payload.quantidade;
  if (payload.descricao !== undefined) body.descricao = payload.descricao;
  if (payload.dataRecebimento !== undefined) body.data_recebimento = payload.dataRecebimento;
  if (payload.dataInicio !== undefined) body.data_inicio = payload.dataInicio;
  if (payload.dataTermino !== undefined) body.data_termino = payload.dataTermino;
  if (payload.prazo !== undefined) body.prazo = payload.prazo;
  if (payload.prioridade !== undefined) body.prioridade = payload.prioridade;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.revisaoCliente !== undefined) body.revisao_cliente = payload.revisaoCliente;
  if (payload.horasEstimadas !== undefined) body.horas_estimadas = payload.horasEstimadas;
  if (payload.complexidade !== undefined) body.complexidade = payload.complexidade;
  const { data } = await api.patch(`${ENDPOINT}${id}/`, body);
  return normalizeDetail(data);
};

export const deleteOperationalOrder = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}${id}/`);
};

export const registrarCobrancaOperacional = async (
  id: number,
  numeroNf: string,
): Promise<OperationalOrderDetail> => {
  const { data } = await api.patch(`${ENDPOINT}${id}/cobranca/`, { numero_nf: numeroNf });
  return normalizeDetail(data);
};
