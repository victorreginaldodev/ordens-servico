import { cn } from '@/lib/utils';
import { getStatusLabel, getStatusBadgeClass } from '../utilsOperacional';

interface OperationalOrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OperationalOrderStatusBadge({ status, className }: OperationalOrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase whitespace-nowrap',
        getStatusBadgeClass(status),
        className,
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
