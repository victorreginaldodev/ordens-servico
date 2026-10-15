import type { CodigoDaConferencia, SituacaoDeCobranca } from './services';

/**
 * Rótulos curtos das verificações da conferência do faturamento (faturamento/04), para o filtro "Precisa de
 * atenção", as etiquetas das linhas e o resumo. O título e a explicação completos vêm do backend.
 */
export const PENDENCIA: Record<CodigoDaConferencia, { rotulo: string; situacao: SituacaoDeCobranca; garantia?: boolean }> = {
  sync_conclusao: { rotulo: 'Concluída sem liberar', situacao: 'previsao', garantia: true },
  sync_venda: { rotulo: 'Liberação na venda pendente', situacao: 'previsao', garantia: true },
  sync_servico: { rotulo: 'Serviço fora de sincronia', situacao: 'previsao', garantia: true },
  concluido_os_parada: { rotulo: 'Trabalho concluído, OS parada', situacao: 'previsao' },
  sem_distribuir: { rotulo: 'Serviço sem distribuir', situacao: 'previsao' },
  vencimento_chegando: { rotulo: 'Vencimento chegando', situacao: 'previsao' },
  aguardando_lancamento: { rotulo: 'Aguardando lançamento', situacao: 'a_faturar' },
  mudou_apos_liberacao: { rotulo: 'Mudou depois da liberação', situacao: 'a_faturar' },
  mudou_apos_lancamento: { rotulo: 'Mudou depois de faturada', situacao: 'faturadas' },
};

export const CODIGOS = Object.keys(PENDENCIA) as CodigoDaConferencia[];
