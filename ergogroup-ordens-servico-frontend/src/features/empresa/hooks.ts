import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Company, getCompany, setCompany } from './services';

export const useCompany = () =>
  useQuery<Company>({
    queryKey: ['empresa-detalhe'],
    queryFn: async () => getCompany(),
  });

export const useUpsertCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Company>) => {
      const current = getCompany();
      const updated: Company = { ...current, ...payload };
      setCompany(updated);
      return updated;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['empresa-detalhe'] });
    },
  });
};
