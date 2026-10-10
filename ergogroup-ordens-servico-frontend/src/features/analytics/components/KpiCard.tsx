import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  compact?: boolean;
}

export const KpiCardSkeleton = ({ index = 0, compact = false }: { index?: number; compact?: boolean }) => (
  <Card
    className="bg-card border-border hover:border-primary/30 transition-colors"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <CardContent className={compact ? 'p-4' : 'p-6'}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className={`${compact ? 'h-6' : 'h-8'} w-20`} />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className={`${compact ? 'h-10 w-10 rounded-lg' : 'h-12 w-12 rounded-xl'}`} />
      </div>
    </CardContent>
  </Card>
);

export const KpiCard = ({ title, value, change, changeType = 'neutral', icon: Icon, compact = false }: KpiCardProps) => {
  const changeColorClass =
    changeType === 'positive'
      ? 'text-status-completed'
      : changeType === 'negative'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground mb-1 truncate`}>{title}</p>
            <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold tabular-nums`}>{value}</p>
            {change && (
              <div className={`flex items-center gap-1 mt-2 ${compact ? 'text-xs' : 'text-sm'} ${changeColorClass}`}>
                {changeType === 'positive' && <ArrowUpRight className="w-4 h-4" />}
                {changeType === 'negative' && <ArrowDownRight className="w-4 h-4" />}
                <span className="truncate">{change}</span>
              </div>
            )}
          </div>
          <div className={`${compact ? 'h-10 w-10 rounded-lg' : 'w-12 h-12 rounded-xl'} bg-primary/10 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`${compact ? 'h-5 w-5' : 'w-6 h-6'} text-primary`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
