import api from '@/services/api';

// ── /api/analise/financeiro/ ──────────────────────────────────────────────────
// Schema real: FinanceiroAnaliseResponse. Único endpoint financeiro — retorna
// 403 para perfis sem acesso a valores (Sub-Líder Técnico, Técnico, Gestor
// Administrativo, Administrativo). Os endpoints /api/analise/dados/,
// /api/analise/financeiro/kpis/ e /api/analise/produtividade/ não existem
// no schema atual.

export interface MesDecimalItem {
  ano: number;
  mes: number;
  total: string;
}

export interface ClienteCobrancaItem {
  cliente_id: number;
  cliente_nome: string;
  total_valor_cobrado: string;
}

export interface ClienteVendasItem {
  cliente_id: number;
  cliente_nome: string;
  total_valor_vendas: string;
}

export interface ClientesAnalise {
  mais_cobranca: ClienteCobrancaItem[];
  mais_vendas: ClienteVendasItem[];
}

export interface FinanceiroAnaliseResponse {
  total_cobrado: string;
  total_para_cobrar: string;
  total_sem_liberacao: string;
  ticket_medio: string | null;
  vendas_por_mes: MesDecimalItem[];
  clientes: ClientesAnalise;
}

export const getFinanceiroAnalise = async (): Promise<FinanceiroAnaliseResponse> => {
  const { data } = await api.get<FinanceiroAnaliseResponse>('/api/analise/financeiro/');
  return data;
};

// ── /api/analise/operacional/ ─────────────────────────────────────────────────
// Schema real: OperacionalAnaliseResponse. Endpoint único que substitui os
// antigos /api/analise/dados/ e /api/analise/produtividade/ para a página
// operacional. Sem valores monetários; técnicos recebem só a própria linha
// em `por_tecnico`.

export interface MesTotal {
  ano: number;
  mes: number;
  total: number;
}

export interface OrdensServicoAnalise {
  total: number;
  total_concluidas: number;
  total_nao_concluidas: number;
  abertas_por_mes: MesTotal[];
  concluidas_por_mes: MesTotal[];
  abertas_mes_atual: number;
  abertas_mes_anterior: number;
  concluidas_mes_atual: number;
  concluidas_mes_anterior: number;
  em_aberto: number;
}

export interface StatusTotalItem {
  status: string;
  status_display: string;
  total: number;
}

export interface ServicoPrincipalItem {
  catalogo_id: number;
  catalogo_nome: string;
  total: number;
  percentual: number | null;
}

export interface ServicoAnalise {
  concluidos_ultimos_12_meses_total: number;
  concluidos_por_mes: MesTotal[];
  principais_por_quantidade: ServicoPrincipalItem[];
  por_status: StatusTotalItem[];
}

export interface TarefaAnalise {
  por_status: StatusTotalItem[];
  concluidas_por_mes: MesTotal[];
}

export interface RevisaoPorClienteItem {
  cliente_id: number;
  cliente_nome: string;
  total: number;
  percentual: number | null;
}

export interface MiniOSAnalise {
  total: number;
  total_revisao_cliente: number;
  criadas_por_mes: MesTotal[];
  finalizadas_por_mes: MesTotal[];
  criadas_mes_atual: number;
  criadas_mes_anterior: number;
  finalizadas_mes_atual: number;
  finalizadas_mes_anterior: number;
  revisoes_por_cliente: RevisaoPorClienteItem[];
}

export interface DistribuicaoTempoOS {
  ate_7: number;
  de_8_a_15: number;
  de_16_a_30: number;
  de_31_a_60: number;
  acima_60: number;
}

export interface TempoPorCatalogoItem {
  catalogo_id: number;
  catalogo_nome: string;
  horas_estimadas: string | null;
  complexidade: number | null;
  total_concluidos: number;
  media_dias: number;
}

export interface TemposMedios {
  os_criacao_para_encerramento_dias: number | null;
  os_criacao_para_conclusao_dias: number | null;
  os_total_com_data: number;
  os_distribuicao_tempo: DistribuicaoTempoOS;
  servicos_inicio_para_fim_dias: number | null;
  tarefa_criacao_para_inicio_dias: number | null;
  tempo_por_catalogo_servico: TempoPorCatalogoItem[];
  tempo_por_catalogo_oso: TempoPorCatalogoItem[];
}

export interface BlocoCancelamento {
  total: number;
  canceladas: number;
  percentual: number | null;
}

export interface CancelamentoPorCatalogoItem {
  catalogo_id: number;
  catalogo_nome: string;
  total: number;
  canceladas: number;
  percentual: number | null;
}

export interface TaxaCancelamento {
  tarefas: BlocoCancelamento;
  servicos: BlocoCancelamento;
  por_catalogo: CancelamentoPorCatalogoItem[];
}

export interface BlocoCumprimentoPrazo {
  total_com_prazo: number;
  no_prazo: number;
  percentual: number | null;
}

export interface TaxaCumprimentoPrazo {
  tarefas: BlocoCumprimentoPrazo;
  minios: BlocoCumprimentoPrazo;
}

export interface TecnicoProdutividadeItem {
  tecnico_id: number;
  tecnico_nome: string | null;
  tarefas_concluidas: number;
  tempo_medio_tarefa_dias: number | null;
  complexidade_media_concluidas: number | null;
  horas_estimadas_entregues: string;
  mini_os_concluidas: number;
  tarefas_em_aberto: number;
  mini_os_em_aberto: number;
  tarefas_atrasadas: number;
  mini_os_atrasadas: number;
  tarefas_alta_prioridade_abertas: number;
  mini_os_alta_prioridade_abertas: number;
  tarefas_concluidas_por_mes: MesTotal[];
  mini_os_concluidas_por_mes: MesTotal[];
  taxa_cumprimento_prazo_tarefas: number | null;
  taxa_cumprimento_prazo_minios: number | null;
}

export interface AnaliseOperacionalResponse {
  ordens_servico: OrdensServicoAnalise;
  servicos: ServicoAnalise;
  tarefas: TarefaAnalise;
  minios: MiniOSAnalise;
  tempos_medios: TemposMedios;
  taxa_cancelamento: TaxaCancelamento;
  taxa_cumprimento_prazo: TaxaCumprimentoPrazo;
  por_tecnico: TecnicoProdutividadeItem[];
}

export const getAnaliseOperacional = async (): Promise<AnaliseOperacionalResponse> => {
  const { data } = await api.get<AnaliseOperacionalResponse>('/api/analise/operacional/');
  return data;
};
