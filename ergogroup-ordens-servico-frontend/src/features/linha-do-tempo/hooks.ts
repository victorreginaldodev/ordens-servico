import { useQuery } from '@tanstack/react-query';
import { getLinhaDoTempoDaOS, getLinhaDoTempoDoServico } from './services';

export const linhaDoTempoKeys = {
  todos: ['linha-do-tempo'] as const,
  daOS: (ordemId: number) => ['linha-do-tempo', 'os', ordemId] as const,
  doServico: (servicoId: number) => ['linha-do-tempo', 'servico', servicoId] as const,
};

export const useLinhaDoTempoDaOS = (ordemId: number | undefined) =>
  useQuery({
    queryKey: linhaDoTempoKeys.daOS(ordemId ?? 0),
    queryFn: () => getLinhaDoTempoDaOS(ordemId!),
    enabled: !!ordemId,
  });

export const useLinhaDoTempoDoServico = (servicoId: number | undefined) =>
  useQuery({
    queryKey: linhaDoTempoKeys.doServico(servicoId ?? 0),
    queryFn: () => getLinhaDoTempoDoServico(servicoId!),
    enabled: !!servicoId,
  });
