import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPieChart } from './StatusPieChart';
import { CHART_COLORS } from '../constants';

export interface DonutTableItem {
  id: number | string;
  name: string;
  value: number;
}

interface DonutTableCardProps {
  data: DonutTableItem[];
  isLoading?: boolean;
  showValue?: boolean;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
}

export const DonutTableCard = ({
  data,
  isLoading = false,
  showValue = true,
  valueLabel = 'Valor',
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  emptyMessage,
}: DonutTableCardProps) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
      <StatusPieChart
        data={data}
        colors={CHART_COLORS}
        innerRadius={70}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        formatter={(value: number, name: string) => [
          showValue ? valueFormatter(value) : '—',
          showValue ? name : 'Valor restrito',
        ]}
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {showValue && <TableHead className="text-right">{valueLabel}</TableHead>}
              <TableHead className="text-right">% do total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-[2px] flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {item.name}
                      </div>
                    </TableCell>
                    {showValue && (
                      <TableCell className="text-right">{valueFormatter(item.value)}</TableCell>
                    )}
                    <TableCell className="text-right">{pct.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={showValue ? 3 : 2}
                  className="text-center text-muted-foreground text-sm"
                >
                  {isLoading ? 'Carregando...' : 'Nenhum dado disponível.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
