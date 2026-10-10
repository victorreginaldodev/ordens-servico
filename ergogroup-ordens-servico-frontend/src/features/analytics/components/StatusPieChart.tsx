import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../constants';

interface StatusPieChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  colorMap?: Record<string, string>;
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  formatter?: (value: number, name: string) => [string | number, string];
}

export const StatusPieChart = ({
  data,
  colors,
  colorMap,
  height = 320,
  isLoading = false,
  emptyMessage = 'Nenhum dado disponível.',
  showLegend = false,
  innerRadius = 0,
  outerRadius = 110,
  formatter,
}: StatusPieChartProps) => (
  <div style={{ height }}>
    {data.length > 0 ? (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}-${index}`}
                fill={colorMap?.[entry.name] ?? colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
            formatter={formatter}
          />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {isLoading ? 'Carregando dados...' : emptyMessage}
      </div>
    )}
  </div>
);
