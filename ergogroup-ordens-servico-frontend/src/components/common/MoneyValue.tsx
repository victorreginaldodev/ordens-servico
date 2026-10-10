import { useUserRole } from '@/hooks/useUserRole';

interface MoneyValueProps {
  value: string | number | null | undefined;
  formatter: (value: string | number) => string;
  fallback?: string;
}

/**
 * Exibe um valor monetário ou "-" caso o perfil do usuário não tenha
 * permissão para visualizar valores (ver NO_VALUE_ROLES em useUserRole).
 */
export function MoneyValue({ value, formatter, fallback = '—' }: MoneyValueProps) {
  const { canViewOrderValues } = useUserRole();

  if (!canViewOrderValues || value === null || value === undefined) {
    return <>{fallback}</>;
  }

  return <>{formatter(value)}</>;
}
