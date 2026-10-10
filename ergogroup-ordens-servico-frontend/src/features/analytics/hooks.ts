import { useQuery } from '@tanstack/react-query';
import {
  getAnaliseOperacional,
  getFinanceiroAnalise,
  type AnaliseOperacionalResponse,
  type FinanceiroAnaliseResponse,
} from './services';

export const useFinanceiroAnalise = () =>
  useQuery<FinanceiroAnaliseResponse>({
    queryKey: ['analytics-financeiro'],
    queryFn: getFinanceiroAnalise,
    staleTime: 1000 * 60 * 5,
  });

export const useAnaliseOperacional = () =>
  useQuery<AnaliseOperacionalResponse>({
    queryKey: ['analise-operacional'],
    queryFn: getAnaliseOperacional,
    staleTime: 1000 * 60 * 5,
  });
