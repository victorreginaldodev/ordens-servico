import { useQuery } from '@tanstack/react-query';
import { PageResult } from '@/services/pagination';
import type { OrdemServicoItem } from '@/features/ordens/services';
import {
  BillingKpis,
  BillingOrdersPageParams,
  getBillingKpis,
  getBillingServiceOrdersPage,
} from './services';

export const useBillingKpis = () =>
  useQuery<BillingKpis>({
    queryKey: ['faturamento-kpis'],
    queryFn: getBillingKpis,
  });

export const useBillingServiceOrdersPage = (params: BillingOrdersPageParams) =>
  useQuery<PageResult<OrdemServicoItem>>({
    queryKey: ['faturamento-ordens-pagina', params],
    queryFn: () => getBillingServiceOrdersPage(params),
  });
