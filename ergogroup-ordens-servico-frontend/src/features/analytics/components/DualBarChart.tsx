import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { tooltipContentStyle, tooltipLabelStyle } from '../constants';

export interface DualBarSeries {
  key: string;
  name: string;
  color: string;
}

interface DualBarChartProps {
  data: Record<string, string | number>[];
  series: [DualBarSeries, DualBarSeries];
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (v: number) => string;
}

export const DualBarChart = ({
  data,
  series,
  height = 280,
  isLoading,
  emptyMessage = 'Sem dados para exibir.',
  valueFormatter,
}: DualBarChartProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton style={{ height }} className="w-full" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString('pt-BR'));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: number, name: string) => [fmt(value), name]}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={32} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
