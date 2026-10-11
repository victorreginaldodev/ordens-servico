import { useCallback } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { execucaoKeys } from './hooks';
import {
  getAlertas,
  getAndamento,
  getConcluidos,
  getEquipe,
  getFila,
  type Alerta,
  type Concluidos,
  type ItemDaFila,
  type LinhaDeTarefa,
  type MembroDaEquipe,
  type SetorAcompanhado,
} from './services';

/** Item de um bloco com o setor de onde veio (a Visão geral junta vários setores). */
export type ComSetor<T> = T & { setor_id: number; setor_nome: string; organiza: boolean };
export type ServicoConcluidoComSetor = ComSetor<Concluidos['servicos'][number]>;

export interface BlocosDoPainel {
  fila: ComSetor<ItemDaFila>[];
  andamento: ComSetor<LinhaDeTarefa>[];
  alertas: ComSetor<Alerta>[];
  concluidos: ServicoConcluidoComSetor[];
  /** Uma linha por pessoa, somando a carga quando ela aparece em mais de um setor. */
  equipe: ComSetor<MembroDaEquipe>[];
  carregando: boolean;
  erro: unknown;
}

const MINUTO = 60_000;
const BLOCOS = ['fila', 'andamento', 'alertas', 'concluidos', 'equipe'] as const;

/**
 * Os blocos do painel para um ou mais setores (`/api/execucao/` exige `?setor=`).
 * Na Visão geral faz uma chamada por setor e por bloco e junta tudo; se ficar lento, o backend pode
 * ganhar um bloco consolidado (proposta em fluxos-e-navegacao.md §10).
 */
export function useBlocosDoPainel(setores: SetorAcompanhado[], periodoConcluidos: { de: string; ate: string }): BlocosDoPainel {
  const queries = setores.flatMap((s) => [
    { queryKey: execucaoKeys.fila(s.id, {}), queryFn: () => getFila(s.id), staleTime: MINUTO },
    { queryKey: execucaoKeys.andamento(s.id), queryFn: () => getAndamento(s.id), staleTime: MINUTO },
    { queryKey: execucaoKeys.alertas(s.id), queryFn: () => getAlertas(s.id), staleTime: MINUTO },
    { queryKey: execucaoKeys.concluidos(s.id, periodoConcluidos), queryFn: () => getConcluidos(s.id, periodoConcluidos), staleTime: MINUTO },
    { queryKey: execucaoKeys.equipe(s.id), queryFn: () => getEquipe(s.id), staleTime: MINUTO },
  ]);

  const combinar = useCallback(
    (rs: UseQueryResult<unknown>[]): BlocosDoPainel => {
      const de = <T,>(bloco: (typeof BLOCOS)[number]): ComSetor<T>[] =>
        setores.flatMap((s, i) => {
          const dados = rs[i * BLOCOS.length + BLOCOS.indexOf(bloco)]?.data;
          const lista = (bloco === 'concluidos' ? (dados as Concluidos | undefined)?.servicos : dados) as T[] | undefined;
          return (lista ?? []).map((x) => ({ ...x, setor_id: s.id, setor_nome: s.nome, organiza: s.organiza }));
        });

      const porPessoa = new Map<number, ComSetor<MembroDaEquipe>>();
      de<MembroDaEquipe>('equipe').forEach((m) => {
        const ja = porPessoa.get(m.usuario_id);
        if (!ja) return porPessoa.set(m.usuario_id, { ...m });
        porPessoa.set(m.usuario_id, {
          ...ja,
          membro_do_setor: ja.membro_do_setor || m.membro_do_setor,
          ativos: ja.ativos + m.ativos,
          atrasados: ja.atrasados + m.atrasados,
          vence_7_dias: ja.vence_7_dias + m.vence_7_dias,
          sem_prazo: ja.sem_prazo + m.sem_prazo,
          em_alerta: ja.em_alerta + m.em_alerta,
          mais_antigo_dias: Math.max(ja.mais_antigo_dias ?? 0, m.mais_antigo_dias ?? 0) || null,
        });
      });

      return {
        fila: de<ItemDaFila>('fila'),
        andamento: de<LinhaDeTarefa>('andamento'),
        alertas: de<Alerta>('alertas'),
        concluidos: de<Concluidos['servicos'][number]>('concluidos'),
        equipe: [...porPessoa.values()].sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '')),
        carregando: rs.some((r) => r.isLoading),
        erro: rs.find((r) => r.error)?.error ?? null,
      };
    },
    [setores],
  );

  return useQueries({ queries, combine: combinar });
}
