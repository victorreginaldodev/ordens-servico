import api from '@/services/api';
import { comoLista, type Esquemas } from '@/api/tipos';

/**
 * Linha do tempo da OS e do serviço (backend, fase 11; ADR 0008, 4): eventos legíveis traduzidos da
 * auditoria. Acessa quem vê a OS ou o serviço; condições de pagamento e a referência do lançamento
 * só aparecem para quem tem `financeiro.ver_valores`. `quem` vazio = ação do sistema.
 */

export type EventoDaLinhaDoTempo = Esquemas['EventoDaLinhaDoTempo'];
export type TipoDeEvento = Esquemas['EventoDaLinhaDoTempoTipoEnum'];

/** A venda inteira: OS, serviços e tarefas. */
export const getLinhaDoTempoDaOS = async (ordemId: number): Promise<EventoDaLinhaDoTempo[]> => {
  const { data } = await api.get(`/api/ordens-servico/ordens/${ordemId}/linha-do-tempo/`);
  return comoLista<EventoDaLinhaDoTempo>(data);
};

/** Só o serviço e suas tarefas. */
export const getLinhaDoTempoDoServico = async (servicoId: number): Promise<EventoDaLinhaDoTempo[]> => {
  const { data } = await api.get(`/api/ordens-servico/servicos/${servicoId}/linha-do-tempo/`);
  return comoLista<EventoDaLinhaDoTempo>(data);
};
