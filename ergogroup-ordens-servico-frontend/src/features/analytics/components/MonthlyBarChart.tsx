import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../constants';

interface MonthlyBarChartProps {
  data: Array<{ name: string; value: number }>;
  barColor?: string;
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  tooltipLabel?: string;
  valueFormatter?: (value: number) => string;
  hideYAxis?: boolean;
}

export const MonthlyBarChart = ({
  data,
  barColor = 'hsl(173, 80%, 40%)',
  height = 300,
  isLoading = false,
  emptyMessage = 'Sem dados suficientes para exibir.',
  tooltipLabel = 'Total',
  valueFormatter,
  hideYAxis = false,
}: MonthlyBarChartProps) => (
  <div style={{ height }}>
    {data.length > 0 ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
          <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
          <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} hide={hideYAxis} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(value: number) => [
              valueFormatter ? valueFormatter(value) : value,
              tooltipLabel,
            ]}
          />
          <Bar dataKey="value" fill={barColor} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {isLoading ? 'Carregando dados...' : emptyMessage}
      </div>
    )}
  </div>
);
