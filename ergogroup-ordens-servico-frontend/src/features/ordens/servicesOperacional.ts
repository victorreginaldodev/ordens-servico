import api from '@/services/api';

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
  revisaoCliente: boolean;
  geraCobranca: boolean;
  cobrancaRealizada: boolean;
  numeroNf: string | null;
  /** Referência do lançamento no sistema financeiro (desde 19/10/2026); nas antigas, só `numeroNf`. */
  referenciaLancamento: string | null;
  dataCobranca: string | null;
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
  revisaoCliente: Boolean(dto.revisao_cliente),
  geraCobranca: Boolean(dto.gera_cobranca),
  cobrancaRealizada: Boolean(dto.cobranca_realizada),
  numeroNf: dto.numero_nf ?? null,
  referenciaLancamento: dto.referencia_lancamento ?? null,
  dataCobranca: dto.data_cobranca ?? null,
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
  const { data } = await api.patch(`${ENDPOINT}${id}/`, body);
  return normalizeDetail(data);
};

export const deleteOperationalOrder = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}${id}/`);
};
