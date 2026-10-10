import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MoneyValue } from '@/components/common/MoneyValue';
import { formatCurrency } from '@/data/mockData';

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  barColor,
  pct,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  barColor: string;
  pct: number;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight"><MoneyValue value={value} formatter={formatCurrency} /></p>
          </div>
          <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md', iconColor)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{pct.toFixed(0)}% do total</p>
      </CardContent>
    </Card>
  );
}
