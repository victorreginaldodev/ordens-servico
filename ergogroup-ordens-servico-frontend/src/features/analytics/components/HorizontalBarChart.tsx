import { useState } from 'react';

interface HorizontalBarChartProps {
  data: Array<{ name: string; value: number }>;
  barColor?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (v: number) => string;
}

export const HorizontalBarChart = ({
  data,
  barColor = 'hsl(215, 85%, 60%)',
  isLoading = false,
  emptyMessage = 'Sem dados para exibir.',
  valueFormatter,
}: HorizontalBarChartProps) => {
  const fmt = valueFormatter ?? ((v: number) => String(v));
  const [visíveis, setVisíveis] = useState(20);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Carregando dados...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const slice = data.slice(0, visíveis);
  const temMais = visíveis < data.length;

  return (
    <div className="flex flex-col gap-2">
      {slice.map((item) => (
        <div key={item.name} className="flex items-center gap-3">
          <span
            className="shrink-0 text-right text-[11px] uppercase leading-tight text-foreground"
            style={{ width: 280 }}
          >
            {item.name}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <span className="shrink-0 w-16 text-right text-[11px] tabular-nums text-muted-foreground">
              {fmt(item.value)}
            </span>
          </div>
        </div>
      ))}
      {temMais && (
        <button
          onClick={() => setVisíveis((v) => v + 20)}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver mais ({data.length - visíveis} restantes)
        </button>
      )}
    </div>
  );
};
