import api from '@/services/api';

// ── /api/ordens-servico/ordens/ (lista) ──────────────────────────────────────
// Schema: OrdemServicoList — retorna campos resumidos, diferentes do detalhe.
// Não confundir com OrdemServico (detalhe), que tem cliente_detail (objeto) em vez
// de cliente_nome (string), e não tem numero_nf.

export interface OrdemServicoItem {
  id: number;
  cliente: number;
  cliente_nome: string;
  data_venda: string;
  valor: string;
  forma_pagamento: string;
  forma_pagamento_display: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  status_display: string;
  prioridade: 'baixa' | 'media' | 'alta' | null;
  prioridade_display: string;
  prazo: string | null;
  concluida: boolean;
  cobranca_realizada: boolean;
  cobranca_imediata: boolean;
  contrato: boolean;
  liberada_para_cobranca: boolean;
  liberada_para_cobranca_em: string | null;
  liberada_para_cobranca_por_nome: string | null;
  dias_em_aberto: number | null;
  dias_entre_criacao_e_conclusao: number | null;
}

export const normalizeOrdemItem = (dto: any): OrdemServicoItem => ({
  id: dto.id,
  cliente: typeof dto.cliente === 'object' ? dto.cliente?.id : dto.cliente,
  cliente_nome: dto.cliente_nome ?? dto.cliente_detail?.nome ?? '',
  data_venda: dto.data_venda ?? '',
  valor: dto.valor ?? '0',
  forma_pagamento: dto.forma_pagamento ?? '',
  forma_pagamento_display: dto.forma_pagamento_display ?? '',
  status: dto.status ?? 'aberta',
  status_display: dto.status_display ?? '',
  prioridade: dto.prioridade ?? null,
  prioridade_display: dto.prioridade_display ?? '',
  prazo: dto.prazo ?? null,
  concluida: !!dto.concluida,
  cobranca_realizada: !!dto.cobranca_realizada,
  cobranca_imediata: !!dto.cobranca_imediata,
  contrato: !!dto.contrato,
  liberada_para_cobranca: !!dto.liberada_para_cobranca,
  liberada_para_cobranca_em: dto.liberada_para_cobranca_em ?? null,
  liberada_para_cobranca_por_nome: dto.liberada_para_cobranca_por_nome ?? null,
  dias_em_aberto: dto.dias_em_aberto ?? null,
  dias_entre_criacao_e_conclusao: dto.dias_entre_criacao_e_conclusao ?? null,
});

export const getOrdensLista = async (): Promise<OrdemServicoItem[]> => {
  const { data } = await api.get<any>('/api/ordens-servico/ordens/', { params: { page_size: 500 } });
  const items = data?.results ?? (Array.isArray(data) ? data : []);
  return items.map(normalizeOrdemItem);
};

// ── /api/ordens-servico/ordens/{id}/ ─────────────────────────────────────────
// Schema: OrdemServico (detalhe) — diferente do Cliente usado na listagem de
// clientes: aqui vem aninhado como cliente_detail.

export interface ClienteDetalheOS {
  id: number;
  nome: string;
  tipo_cliente: string | null;
  tipo_cliente_display: string;
  tipo_inscricao: string | null;
  tipo_inscricao_display: string;
  numero_inscricao: string | null;
  nome_representante: string | null;
  setor_representante: string | null;
  email_representante: string | null;
  contato_representante: string | null;
  ativo: boolean;
}

export interface OrdemServicoDetalhe {
  id: number;
  cliente: number;
  cliente_detail: ClienteDetalheOS;
  criado_por: number | null;
  criado_por_nome: string | null;
  data_venda: string;
  criada_em: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  status_display: string;
  prioridade: 'baixa' | 'media' | 'alta';
  prioridade_display: string;
  prazo: string | null;
  valor: string;
  forma_pagamento: string;
  forma_pagamento_display: string;
  quantidade_parcelas: number | null;
  cobranca_imediata: boolean;
  data_acordada_cobranca: string | null;
  nome_contato_envio_nf: string;
  contato_envio_nf: string;
  contrato: boolean;
  objeto_contrato: string | null;
  contrato_data_inicio: string | null;
  contrato_data_fim: string | null;
  gestor_contrato_nome: string | null;
  gestor_contrato_email: string | null;
  gestor_contrato_telefone: string | null;
  observacao: string | null;
  concluida: boolean;
  cobranca_realizada: boolean;
  numero_nf: number | null;
  data_cobranca: string | null;
  cobranca_realizada_por: number | null;
  cobranca_realizada_por_nome: string | null;
  liberada_para_cobranca: boolean;
  liberada_para_cobranca_em: string | null;
  liberada_para_cobranca_por: number | null;
  liberada_para_cobranca_por_nome: string | null;
  data_atualizacao: string;
  atualizado_por: number | null;
  data_conclusao_os: string | null;
  finalizador_nome: string | null;
  dias_em_aberto: number | null;
  dias_entre_criacao_e_conclusao: number | null;
}

export const getOrdemDetalhe = async (id: number): Promise<OrdemServicoDetalhe> => {
  const { data } = await api.get<OrdemServicoDetalhe>(`/api/ordens-servico/ordens/${id}/`);
  return data;
};

// ── Mutations: Ordem de Serviço ───────────────────────────────────────────────
// Schema: OrdemServicoRequest / PatchedOrdemServicoRequest.

export interface OrdemServicoPayload {
  cliente: number;
  data_venda: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  prazo?: string | null;
  valor: string;
  forma_pagamento: string;
  quantidade_parcelas?: number | null;
  cobranca_imediata?: boolean;
  data_acordada_cobranca?: string | null;
  nome_contato_envio_nf: string;
  contato_envio_nf: string;
  contrato?: boolean;
  objeto_contrato?: string | null;
  contrato_data_inicio?: string | null;
  contrato_data_fim?: string | null;
  gestor_contrato_nome?: string | null;
  gestor_contrato_email?: string | null;
  gestor_contrato_telefone?: string | null;
  observacao?: string | null;
}

export const createOrdem = async (payload: OrdemServicoPayload): Promise<OrdemServicoDetalhe> => {
  const { data } = await api.post<OrdemServicoDetalhe>('/api/ordens-servico/ordens/', payload);
  return data;
};

export const updateOrdem = async (
  id: number,
  payload: Partial<OrdemServicoPayload>,
): Promise<OrdemServicoDetalhe> => {
  const { data } = await api.patch<OrdemServicoDetalhe>(`/api/ordens-servico/ordens/${id}/`, payload);
  return data;
};

// ── Mutations: Cobrança (OS) ──────────────────────────────────────────────────

export interface RegistrarCobrancaPayload {
  numero_nf?: number | null;
  data_cobranca?: string | null;
}

export const registrarCobranca = async (
  id: number,
  payload: RegistrarCobrancaPayload,
): Promise<OrdemServicoDetalhe> => {
  const { data } = await api.patch<OrdemServicoDetalhe>(`/api/ordens-servico/ordens/${id}/cobranca/`, payload);
  return data;
};

// ── /api/ordens-servico/servicos/?ordem_servico={id} ─────────────────────────

export interface CatalogoServicoDetalhe {
  id: number;
  nome: string;
  descricao: string | null;
}

export interface ServicoDetalhe {
  id: number;
  ordem_servico: number;
  catalogo: number | null;
  catalogo_detail: CatalogoServicoDetalhe | null;
  catalogo_nome: string | null;
  /** Setor que executa o serviço (copiado do catálogo). Nulo enquanto o catálogo não tem setor. */
  setor: number | null;
  setor_nome: string | null;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'concluida' | 'cancelado';
  status_display: string;
  prioridade: 'baixa' | 'media' | 'alta';
  prioridade_display: string;
  prazo: string | null;
  horas_estimadas: string | null;
  horas_estimadas_efetivas: string | null;
  complexidade: 1 | 2 | 3 | null;
  complexidade_display: string | null;
  complexidade_efetiva: number | null;
  data_inicio: string | null;
  data_termino: string | null;
  data_conclusao: string | null;
  terminado_por: number | null;
  terminado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
}

export const getServicosDeOrdem = async (ordemId: number): Promise<ServicoDetalhe[]> => {
  const { data } = await api.get<any>('/api/ordens-servico/servicos/', {
    params: { ordem_servico: ordemId, page_size: 200 },
  });
  const results = data?.results ?? (Array.isArray(data) ? data : []);
  return results as ServicoDetalhe[];
};

export const getServicoDetalhe = async (id: number): Promise<ServicoDetalhe> => {
  const { data } = await api.get<ServicoDetalhe>(`/api/ordens-servico/servicos/${id}/`);
  return data;
};

// ── Mutations: Serviço ────────────────────────────────────────────────────────

export interface CreateServicoPayload {
  ordem_servico: number;
  catalogo?: number | null;
  descricao: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  prazo?: string | null;
  horas_estimadas?: string | null;
  complexidade?: 1 | 2 | 3 | null;
}

export interface UpdateServicoPayload {
  catalogo?: number | null;
  descricao?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  prazo?: string | null;
  horas_estimadas?: string | null;
  complexidade?: 1 | 2 | 3 | null;
}

export const createServico = async (payload: CreateServicoPayload): Promise<ServicoDetalhe> => {
  const { data } = await api.post<ServicoDetalhe>('/api/ordens-servico/servicos/', payload);
  return data;
};

export const updateServico = async (id: number, payload: UpdateServicoPayload): Promise<ServicoDetalhe> => {
  const { data } = await api.patch<ServicoDetalhe>(`/api/ordens-servico/servicos/${id}/`, payload);
  return data;
};

export const deleteServico = async (id: number): Promise<void> => {
  await api.delete(`/api/ordens-servico/servicos/${id}/`);
};

// ── /api/ordens-servico/servicos/ (todos os serviços, para listagem/filtros) ─

export interface ServicoResumoItem {
  id: number;
  ordem_servico: number;
  catalogo_nome: string | null;
  descricao: string;
}

export const getServicosResumo = async (): Promise<ServicoResumoItem[]> => {
  const { data } = await api.get<any>('/api/ordens-servico/servicos/', { params: { page_size: 1000 } });
  return data?.results ?? (Array.isArray(data) ? data : []);
};

// ── /api/ordens-servico/tarefas/?servico={id} ────────────────────────────────

export interface TarefaDetalhe {
  id: number;
  servico: number;
  responsavel: number;
  responsavel_nome: string;
  cliente_nome: string;
  catalogo_nome: string | null;
  descricao: string | null;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  status_display: string;
  prioridade: 'baixa' | 'media' | 'alta';
  prioridade_display: string;
  prazo: string | null;
  horas_estimadas: string | null;
  horas_estimadas_efetivas: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  criada_em: string;
  atualizado_em: string;
}

export const getTarefasDeServico = async (servicoId: number): Promise<TarefaDetalhe[]> => {
  const { data } = await api.get<any>('/api/ordens-servico/tarefas/', {
    params: { servico: servicoId, page_size: 200 },
  });
  const results = data?.results ?? (Array.isArray(data) ? data : []);
  return results as TarefaDetalhe[];
};

// ── /api/ordens-servico/tarefas/ (todas as tarefas, para listagem/filtros) ──

export interface TarefaResumoItem {
  id: number;
  servico: number;
  responsavel: number;
  responsavel_nome: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  prazo: string | null;
}

export const getTarefasResumo = async (): Promise<TarefaResumoItem[]> => {
  const { data } = await api.get<any>('/api/ordens-servico/tarefas/', { params: { page_size: 1000 } });
  return data?.results ?? (Array.isArray(data) ? data : []);
};

// ── Mutations: Tarefa ─────────────────────────────────────────────────────────

export interface CreateTarefaPayload {
  responsavel: number;
  servico: number;
  descricao: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  prazo?: string | null;
  horas_estimadas?: string | null;
}

export interface UpdateTarefaPayload {
  responsavel?: number;
  descricao?: string;
  status?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  prazo?: string | null;
  horas_estimadas?: string | null;
}

export const createTarefa = async (payload: CreateTarefaPayload): Promise<TarefaDetalhe> => {
  const { data } = await api.post<TarefaDetalhe>('/api/ordens-servico/tarefas/', payload);
  return data;
};

export const updateTarefa = async (id: number, payload: UpdateTarefaPayload): Promise<TarefaDetalhe> => {
  const { data } = await api.patch<TarefaDetalhe>(`/api/ordens-servico/tarefas/${id}/`, payload);
  return data;
};

export const deleteTarefa = async (id: number): Promise<void> => {
  await api.delete(`/api/ordens-servico/tarefas/${id}/`);
};

// ── /api/auditoria/registros/ordens/{id}/timeline/ ───────────────────────────

export interface RegistroAuditoria {
  id: number;
  entidade: 'ordem_servico' | 'servico' | 'tarefa' | 'mini_os';
  entidade_display: string;
  objeto_id: number;
  objeto_repr: string;
  acao: string;
  acao_display: string;
  origem: 'api' | 'admin' | 'sistema' | 'migracao';
  origem_display: string;
  motivo: string | null;
  usuario: number | null;
  usuario_nome: string | null;
  criado_em: string;
  alteracoes: Record<string, { antes: unknown; depois: unknown }>;
  snapshot: Record<string, unknown>;
  ordem_servico_id: number | null;
  servico_id: number | null;
  tarefa_id: number | null;
  mini_os_id: number | null;
}

export const getAuditoriaTimeline = async (ordemId: number): Promise<RegistroAuditoria[]> => {
  const { data } = await api.get<any>(
    `/api/auditoria/registros/ordens/${ordemId}/timeline/`,
  );
  return (data?.results ?? (Array.isArray(data) ? data : [])) as RegistroAuditoria[];
};
