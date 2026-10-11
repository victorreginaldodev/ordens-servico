import api from '@/services/api';
import { comoLista, type Esquemas, type FiltrosDe } from '@/api/tipos';

/**
 * Blocos da execução: `/api/execucao/` (backend, fase 8; ADRs 0006 e 0008).
 * A unidade de trabalho do setor é o serviço. Os blocos por setor recebem `setor` e exigem
 * `servicos.ver_setor` nele (com `setores.todos`, em qualquer setor):
 * 400 sem setor, 404 setor inexistente, 403 quem não acompanha o setor.
 */

const BASE = '/api/execucao';

export type Etapa = Esquemas['EtapaEnum'];
export type SituacaoPrazo = Esquemas['SituacaoPrazoEnum'];
export type MotivoCiencia = Esquemas['MotivoCienciaEnum'];

export type SetorAcompanhado = Esquemas['SetorAcompanhado'];
export type ItemDaFila = Esquemas['ItemDaFila'];
export type OutroServicoDaOS = Esquemas['OutroServicoDaOS'];
export type LinhaDeTarefa = Esquemas['LinhaDeTarefa'];
export type Alerta = Esquemas['Alerta'];
export type Concluidos = Esquemas['Concluidos'];
export type MembroDaEquipe = Esquemas['MembroDaEquipe'];
export type DetalheDoServico = Esquemas['DetalheDoServico'];
export type DistribuirPayload = Esquemas['DistribuirRequest'];
export type TarefaDistribuida = Esquemas['TarefaDistribuidaRequest'];
export type CienciaPayload = Esquemas['CienciaRequest'];

export type FiltrosDaFila = Omit<FiltrosDe<'execucao_fila_list'>, 'setor'>;
export type Periodo = { de?: string; ate?: string };

/** Setores que a pessoa acompanha, com os contadores do painel. 403 se não acompanha nenhum. */
export const getSetoresAcompanhados = async (): Promise<SetorAcompanhado[]> => {
  const { data } = await api.get(`${BASE}/setores/`);
  return comoLista<SetorAcompanhado>(data);
};

/** Fila de triagem: serviços do setor sem tarefa, os mais antigos primeiro. */
export const getFila = async (setor: number, filtros: FiltrosDaFila = {}): Promise<ItemDaFila[]> => {
  const { data } = await api.get(`${BASE}/fila/`, { params: { setor, ...filtros } });
  return comoLista<ItemDaFila>(data);
};

/** Tarefas ativas do setor, as mais urgentes primeiro. A tela agrupa por responsável. */
export const getAndamento = async (setor: number, responsavel?: number): Promise<LinhaDeTarefa[]> => {
  const { data } = await api.get(`${BASE}/andamento/`, { params: { setor, responsavel } });
  return comoLista<LinhaDeTarefa>(data);
};

/** Serviços atrasados ou sem movimentação há N dias, com a ciência vigente. */
export const getAlertas = async (setor: number): Promise<Alerta[]> => {
  const { data } = await api.get(`${BASE}/alertas/`, { params: { setor } });
  return comoLista<Alerta>(data);
};

/** Concluídos no período. Sem datas, o backend usa do primeiro dia do mês até hoje. */
export const getConcluidos = async (setor: number, periodo: Periodo = {}): Promise<Concluidos> => {
  const { data } = await api.get<Concluidos>(`${BASE}/concluidos/`, { params: { setor, ...periodo } });
  return data;
};

/** Carga por pessoa. Também é a lista de responsáveis da distribuição (só `membro_do_setor`). */
export const getEquipe = async (setor: number): Promise<MembroDaEquipe[]> => {
  const { data } = await api.get(`${BASE}/equipe/`, { params: { setor } });
  return comoLista<MembroDaEquipe>(data);
};

/** O que está com a pessoa logada; `concluidas` traz o histórico do período. */
export const getMeusServicos = async (
  opcoes: { concluidas?: boolean } & Periodo = {},
): Promise<LinhaDeTarefa[]> => {
  const { concluidas, ...periodo } = opcoes;
  const params = concluidas ? { status: 'concluida', ...periodo } : {};
  const { data } = await api.get(`${BASE}/meus-servicos/`, { params });
  return comoLista<LinhaDeTarefa>(data);
};

/** Detalhe do serviço, sem valores. `pode_distribuir` e `pode_dar_ciencia` dizem quais ações mostrar. */
export const getDetalheDoServico = async (id: number): Promise<DetalheDoServico> => {
  const { data } = await api.get<DetalheDoServico>(`${BASE}/servicos/${id}/`);
  return data;
};

/**
 * Distribui o serviço: uma tarefa = uma pessoa; várias = dividir. Também acrescenta tarefas a um
 * serviço já distribuído. Responsável fora do setor → 400 em `responsavel`.
 */
export const distribuir = async (servicoId: number, payload: DistribuirPayload): Promise<DetalheDoServico> => {
  const { data } = await api.post<DetalheDoServico>(`${BASE}/servicos/${servicoId}/distribuir/`, payload);
  return data;
};

/** "Estou ciente": silencia o alerta de serviço sem movimentação por mais N dias. */
export const darCiencia = async (servicoId: number, payload: CienciaPayload = {}): Promise<DetalheDoServico> => {
  const { data } = await api.post<DetalheDoServico>(`${BASE}/servicos/${servicoId}/ciencia/`, payload);
  return data;
};

/* ── Tarefas (`/api/ordens-servico/tarefas/{id}/`) ──
 * O responsável muda só o status da própria tarefa. Reatribuir, mudar o prazo e excluir exigem
 * `tarefas.distribuir` no setor; editar a tarefa de outra pessoa exige `tarefas.editar_setor`.
 * `data_inicio` e `data_termino` são preenchidas pelo backend conforme o status. */

export type StatusDaTarefa = Esquemas['StatusOSETarefaEnum'];
export type EdicaoDaTarefa = Pick<Esquemas['PatchedTarefaRequest'], 'responsavel' | 'prazo' | 'descricao' | 'status'>;

const TAREFAS = '/api/ordens-servico/tarefas';

export const editarTarefa = async (id: number, payload: EdicaoDaTarefa): Promise<Esquemas['Tarefa']> => {
  const { data } = await api.patch<Esquemas['Tarefa']>(`${TAREFAS}/${id}/`, payload);
  return data;
};

export const excluirTarefa = async (id: number): Promise<void> => {
  await api.delete(`${TAREFAS}/${id}/`);
};
