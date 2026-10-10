import type { AnaliseOperacionalResponse, MesTotal, TecnicoProdutividadeItem } from '@/features/analytics/services';

// ── Dados fictícios para captura de tela da Análise Operacional ─────────────
// Nenhum nome de cliente, técnico ou número é real — tudo gerado à mão para
// preencher a tela sem expor dado sensível. Ativado via `?mock=1` (apenas em
// dev, ver OperacionalPage.tsx). Os IDs de técnico usam uma faixa alta
// (9101+) de propósito, para nunca colidir com um usuário real ao cruzar com
// `useUsers()`.

const MESES: Array<[number, number]> = [
  [2025, 12], [2026, 1], [2026, 2], [2026, 3],
  [2026, 4], [2026, 5], [2026, 6], [2026, 7],
];

const serie = (valores: number[]): MesTotal[] =>
  MESES.map(([ano, mes], i) => ({ ano, mes, total: valores[i] ?? 0 }));

// ── Catálogo fictício (nomenclatura genérica de SST, não específica de cliente) ─

const CATALOGO_SERVICO = [
  { id: 9201, nome: 'Laudo Ergonômico (LTCAT)', horas: '24.00', complexidade: 3 },
  { id: 9202, nome: 'PGR — Gerenciamento de Riscos', horas: '18.00', complexidade: 2 },
  { id: 9203, nome: 'PCMSO', horas: '14.00', complexidade: 2 },
  { id: 9204, nome: 'Treinamento NR-35', horas: '8.00', complexidade: 1 },
  { id: 9205, nome: 'Laudo de Insalubridade', horas: '20.00', complexidade: 3 },
  { id: 9206, nome: 'Treinamento NR-12', horas: '10.00', complexidade: 1 },
  { id: 9207, nome: 'PPRA — Legado', horas: '16.00', complexidade: 2 },
  { id: 9208, nome: 'Laudo de Ruído', horas: '12.00', complexidade: 2 },
  { id: 9209, nome: 'Treinamento NR-33', horas: '8.00', complexidade: 1 },
  { id: 9210, nome: 'Análise Ergonômica Preliminar (AEP)', horas: '10.00', complexidade: 2 },
  { id: 9211, nome: 'Laudo de Periculosidade', horas: '18.00', complexidade: 3 },
  { id: 9212, nome: 'Treinamento NR-10', horas: '12.00', complexidade: 2 },
  { id: 9213, nome: 'Mapa de Risco', horas: '6.00', complexidade: 1 },
  { id: 9214, nome: 'Auditoria de SST', horas: '22.00', complexidade: 3 },
];

const CATALOGO_OSO = [
  { id: 9301, nome: 'Revisão de laudo', horas: '3.00', complexidade: 1 },
  { id: 9302, nome: 'Visita técnica extra', horas: '4.00', complexidade: 1 },
  { id: 9303, nome: 'Ajuste de PGR', horas: '5.00', complexidade: 2 },
  { id: 9304, nome: 'Reemissão de certificado', horas: '2.00', complexidade: 1 },
  { id: 9305, nome: 'Vistoria de não conformidade', horas: '4.00', complexidade: 2 },
];

const CLIENTES_FICTICIOS = [
  { id: 9401, nome: 'Indústria Alfa Ltda' },
  { id: 9402, nome: 'Metalúrgica Beta S.A.' },
  { id: 9403, nome: 'Distribuidora Gama' },
  { id: 9404, nome: 'Cooperativa Delta' },
  { id: 9405, nome: 'Frigorífico Épsilon' },
  { id: 9406, nome: 'Têxtil Zeta' },
];

const TECNICOS_FICTICIOS = [
  { id: 9101, nome: 'Bruno Tavares', cargo: 'Líder Técnico' },
  { id: 9102, nome: 'Camila Duarte', cargo: 'Sub-Líder Técnico' },
  { id: 9103, nome: 'Diego Farias', cargo: 'Técnico' },
  { id: 9104, nome: 'Elaine Vasconcelos', cargo: 'Técnico' },
  { id: 9105, nome: 'Felipe Andrade', cargo: 'Técnico' },
  { id: 9106, nome: 'Gabriela Nunes', cargo: 'Técnico' },
];

/** cargo de cada técnico fictício, usado pela página no lugar do cruzamento com `useUsers()`. */
export const mockTecnicoCargos: Record<number, string> = Object.fromEntries(
  TECNICOS_FICTICIOS.map((t) => [t.id, t.cargo]),
);

const mkTecnico = (
  id: number,
  nome: string,
  base: {
    tarefasConcl: number; tempoMedio: number; complexMedia: number; horas: number; moConcl: number;
    tAberto: number; tAtras: number; tAlta: number; moAberto: number; moAtras: number; moAlta: number;
    prazoT: number; prazoMo: number; serieTarefas: number[]; serieMo: number[];
  },
): TecnicoProdutividadeItem => ({
  tecnico_id: id,
  tecnico_nome: nome,
  tarefas_concluidas: base.tarefasConcl,
  tempo_medio_tarefa_dias: base.tempoMedio,
  complexidade_media_concluidas: base.complexMedia,
  horas_estimadas_entregues: base.horas.toFixed(2),
  mini_os_concluidas: base.moConcl,
  tarefas_em_aberto: base.tAberto,
  mini_os_em_aberto: base.moAberto,
  tarefas_atrasadas: base.tAtras,
  mini_os_atrasadas: base.moAtras,
  tarefas_alta_prioridade_abertas: base.tAlta,
  mini_os_alta_prioridade_abertas: base.moAlta,
  tarefas_concluidas_por_mes: serie(base.serieTarefas),
  mini_os_concluidas_por_mes: serie(base.serieMo),
  taxa_cumprimento_prazo_tarefas: base.prazoT,
  taxa_cumprimento_prazo_minios: base.prazoMo,
});

export const mockAnaliseOperacional: AnaliseOperacionalResponse = {
  ordens_servico: {
    total: 842,
    total_concluidas: 690,
    total_nao_concluidas: 152,
    em_aberto: 58,
    abertas_mes_atual: 71,
    abertas_mes_anterior: 64,
    concluidas_mes_atual: 66,
    concluidas_mes_anterior: 70,
    abertas_por_mes: serie([58, 61, 67, 72, 69, 75, 64, 71]),
    concluidas_por_mes: serie([54, 58, 63, 68, 71, 73, 70, 66]),
  },

  servicos: {
    concluidos_ultimos_12_meses_total: 1980,
    concluidos_por_mes: serie([140, 150, 162, 171, 168, 178, 165, 172]),
    por_status: [
      { status: 'aberto', status_display: 'Aberto', total: 96 },
      { status: 'em_andamento', status_display: 'Em andamento', total: 74 },
      { status: 'concluida', status_display: 'Concluída', total: 1240 },
      { status: 'cancelado', status_display: 'Cancelado', total: 58 },
    ],
    principais_por_quantidade: [
      { catalogo_id: 9201, catalogo_nome: 'Laudo Ergonômico (LTCAT)', total: 372, percentual: 24.6 },
      { catalogo_id: 9202, catalogo_nome: 'PGR — Gerenciamento de Riscos', total: 318, percentual: 21.0 },
      { catalogo_id: 9203, catalogo_nome: 'PCMSO', total: 241, percentual: 15.9 },
      { catalogo_id: 9204, catalogo_nome: 'Treinamento NR-35', total: 198, percentual: 13.1 },
      { catalogo_id: 9205, catalogo_nome: 'Laudo de Insalubridade', total: 156, percentual: 10.3 },
      { catalogo_id: 9206, catalogo_nome: 'Treinamento NR-12', total: 98, percentual: 6.5 },
      { catalogo_id: 9207, catalogo_nome: 'PPRA — Legado', total: 67, percentual: 4.4 },
      { catalogo_id: 9208, catalogo_nome: 'Laudo de Ruído', total: 41, percentual: 2.7 },
      { catalogo_id: 9209, catalogo_nome: 'Treinamento NR-33', total: 33, percentual: 2.2 },
      { catalogo_id: 9210, catalogo_nome: 'Análise Ergonômica Preliminar (AEP)', total: 27, percentual: 1.8 },
      { catalogo_id: 9211, catalogo_nome: 'Laudo de Periculosidade', total: 21, percentual: 1.4 },
      { catalogo_id: 9212, catalogo_nome: 'Treinamento NR-10', total: 15, percentual: 1.0 },
      { catalogo_id: 9213, catalogo_nome: 'Mapa de Risco', total: 9, percentual: 0.6 },
      { catalogo_id: 9214, catalogo_nome: 'Auditoria de SST', total: 5, percentual: 0.3 },
    ],
  },

  tarefas: {
    por_status: [
      { status: 'aberta', status_display: 'Aberta', total: 210 },
      { status: 'em_andamento', status_display: 'Em andamento', total: 165 },
      { status: 'concluida', status_display: 'Concluída', total: 3120 },
      { status: 'cancelada', status_display: 'Cancelada', total: 88 },
    ],
    concluidas_por_mes: serie([340, 362, 388, 410, 402, 428, 396, 405]),
  },

  minios: {
    total: 412,
    total_revisao_cliente: 89,
    criadas_mes_atual: 38,
    criadas_mes_anterior: 33,
    finalizadas_mes_atual: 35,
    finalizadas_mes_anterior: 37,
    criadas_por_mes: serie([31, 29, 34, 36, 33, 39, 33, 38]),
    finalizadas_por_mes: serie([28, 30, 32, 35, 34, 37, 37, 35]),
    revisoes_por_cliente: CLIENTES_FICTICIOS.map((c, i) => ({
      cliente_id: c.id,
      cliente_nome: c.nome,
      total: [22, 18, 15, 11, 9, 6][i] ?? 3,
      percentual: [24.7, 20.2, 16.9, 12.4, 10.1, 6.7][i] ?? 3.0,
    })),
  },

  tempos_medios: {
    os_criacao_para_encerramento_dias: 21.6,
    os_criacao_para_conclusao_dias: 17.9,
    os_total_com_data: 705,
    os_distribuicao_tempo: { ate_7: 158, de_8_a_15: 241, de_16_a_30: 198, de_31_a_60: 82, acima_60: 26 },
    servicos_inicio_para_fim_dias: 8.7,
    tarefa_criacao_para_inicio_dias: 2.3,
    tempo_por_catalogo_servico: CATALOGO_SERVICO.map((c, i) => ({
      catalogo_id: c.id,
      catalogo_nome: c.nome,
      horas_estimadas: c.horas,
      complexidade: c.complexidade,
      total_concluidos: [180, 152, 118, 96, 74, 61, 48, 39, 31, 24, 18, 12, 8, 4][i] ?? 5,
      media_dias: [16.4, 12.1, 9.8, 5.2, 19.7, 6.4, 11.0, 8.9, 4.5, 7.1, 21.3, 9.6, 3.2, 24.8][i] ?? 10,
    })),
    tempo_por_catalogo_oso: CATALOGO_OSO.map((c, i) => ({
      catalogo_id: c.id,
      catalogo_nome: c.nome,
      horas_estimadas: c.horas,
      complexidade: c.complexidade,
      total_concluidos: [88, 64, 41, 33, 19][i] ?? 5,
      media_dias: [3.1, 4.6, 5.8, 1.4, 6.2][i] ?? 4,
    })),
  },

  taxa_cancelamento: {
    tarefas: { total: 3583, canceladas: 88, percentual: 2.5 },
    servicos: { total: 1998, canceladas: 58, percentual: 2.9 },
    por_catalogo: CATALOGO_SERVICO.slice(0, 5).map((c, i) => ({
      catalogo_id: c.id,
      catalogo_nome: c.nome,
      total: [180, 152, 118, 96, 74][i] ?? 10,
      canceladas: [6, 9, 3, 2, 0][i] ?? 0,
      percentual: [3.3, 5.9, 2.5, 2.1, null][i] ?? null,
    })),
  },

  taxa_cumprimento_prazo: {
    tarefas: { total_com_prazo: 2860, no_prazo: 2432, percentual: 85.0 },
    minios: { total_com_prazo: 380, no_prazo: 334, percentual: 87.9 },
  },

  por_tecnico: [
    mkTecnico(TECNICOS_FICTICIOS[0].id, TECNICOS_FICTICIOS[0].nome, {
      tarefasConcl: 342, tempoMedio: 2.1, complexMedia: 2.4, horas: 1180, moConcl: 96,
      tAberto: 12, tAtras: 2, tAlta: 3, moAberto: 5, moAtras: 1, moAlta: 1,
      prazoT: 88, prazoMo: 91,
      serieTarefas: [38, 41, 44, 47, 43, 46, 40, 43],
      serieMo: [10, 12, 11, 13, 12, 14, 12, 12],
    }),
    mkTecnico(TECNICOS_FICTICIOS[1].id, TECNICOS_FICTICIOS[1].nome, {
      tarefasConcl: 298, tempoMedio: 2.6, complexMedia: 2.7, horas: 1320, moConcl: 54,
      tAberto: 9, tAtras: 1, tAlta: 2, moAberto: 3, moAtras: 0, moAlta: 1,
      prazoT: 82, prazoMo: 86,
      serieTarefas: [33, 35, 38, 40, 37, 39, 36, 37],
      serieMo: [6, 7, 6, 8, 7, 7, 6, 8],
    }),
    mkTecnico(TECNICOS_FICTICIOS[2].id, TECNICOS_FICTICIOS[2].nome, {
      tarefasConcl: 271, tempoMedio: 3.0, complexMedia: 2.1, horas: 890, moConcl: 41,
      tAberto: 15, tAtras: 4, tAlta: 5, moAberto: 7, moAtras: 2, moAlta: 2,
      prazoT: 74, prazoMo: 79,
      serieTarefas: [29, 31, 34, 36, 33, 35, 32, 33],
      serieMo: [4, 5, 5, 6, 5, 6, 5, 5],
    }),
    mkTecnico(TECNICOS_FICTICIOS[3].id, TECNICOS_FICTICIOS[3].nome, {
      tarefasConcl: 356, tempoMedio: 1.8, complexMedia: 1.6, horas: 760, moConcl: 132,
      tAberto: 6, tAtras: 0, tAlta: 1, moAberto: 4, moAtras: 0, moAlta: 0,
      prazoT: 93, prazoMo: 95,
      serieTarefas: [40, 43, 46, 48, 45, 47, 44, 45],
      serieMo: [14, 16, 15, 17, 16, 18, 15, 17],
    }),
    mkTecnico(TECNICOS_FICTICIOS[4].id, TECNICOS_FICTICIOS[4].nome, {
      tarefasConcl: 189, tempoMedio: 2.9, complexMedia: 2.2, horas: 640, moConcl: 33,
      tAberto: 11, tAtras: 3, tAlta: 3, moAberto: 6, moAtras: 1, moAlta: 2,
      prazoT: 77, prazoMo: 80,
      serieTarefas: [20, 22, 24, 25, 23, 25, 22, 24],
      serieMo: [3, 4, 4, 5, 4, 5, 4, 4],
    }),
    mkTecnico(TECNICOS_FICTICIOS[5].id, TECNICOS_FICTICIOS[5].nome, {
      tarefasConcl: 224, tempoMedio: 2.3, complexMedia: 2.5, horas: 910, moConcl: 47,
      tAberto: 8, tAtras: 1, tAlta: 1, moAberto: 3, moAtras: 0, moAlta: 1,
      prazoT: 85, prazoMo: 88,
      serieTarefas: [24, 26, 28, 30, 27, 29, 26, 28],
      serieMo: [5, 6, 6, 7, 6, 7, 6, 6],
    }),
  ],
};
