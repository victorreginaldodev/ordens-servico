import { useMemo } from 'react';
import { AlertCircle, CircleCheck, CircleDashed, Clock, Receipt, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TipoCondicaoBadge } from '@/components/kit';
import { useIndicadoresFinanceiros } from '@/features/financeiro/hooks';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, toChartSeries } from '../utils';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { DonutTableCard } from '../components/DonutTableCard';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{children}</p>
);

const FinanceiroPage = () => {
  // Mesmo endpoint de antes (`/api/analise/financeiro/`), agora com os tipos gerados e os campos da fase 10.
  const { data, isLoading, isError } = useIndicadoresFinanceiros();
  const canViewOrderValues = usePermissoes().pode('financeiro.ver_valores');

  const salesChartData = useMemo(
    () =>
      toChartSeries(
        (data?.vendas_por_mes ?? []).map((m) => ({ ano: m.ano, mes: m.mes, total: Number(m.total) })),
      ),
    [data],
  );

  const topClientesCobranca = useMemo(
    () =>
      (data?.clientes.mais_cobranca ?? [])
        .map((item) => ({
          id: item.cliente_id,
          name: item.cliente_nome,
          value: Number(item.total_valor_cobrado),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data],
  );

  const topClientesVendas = useMemo(
    () =>
      (data?.clientes.mais_vendas ?? [])
        .map((item) => ({
          id: item.cliente_id,
          name: item.cliente_nome,
          value: Number(item.total_valor_vendas),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [data],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar indicadores</AlertTitle>
          <AlertDescription>
            Não foi possível recuperar os indicadores financeiros. Verifique suas permissões.
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <SectionLabel>Indicadores</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data ? (
            <>
              <KpiCard title="Faturado" value={formatCurrency(Number(data.total_cobrado))} changeType="positive" icon={CircleCheck} />
              <KpiCard title="A faturar" value={formatCurrency(Number(data.total_para_cobrar))} change="Liberadas, sem lançamento" changeType="neutral" icon={Clock} />
              <KpiCard title="Previsão" value={formatCurrency(Number(data.total_previsao))} change="Ainda não liberadas" changeType="neutral" icon={CircleDashed} />
              <KpiCard
                title="Receita recorrente mensal"
                value={formatCurrency(Number(data.receita_recorrente_mensal))}
                change={`${data.recorrentes_ativos} recorrente${data.recorrentes_ativos === 1 ? '' : 's'} ativo${data.recorrentes_ativos === 1 ? '' : 's'}`}
                changeType="neutral"
                icon={Repeat}
              />
              <KpiCard title="Ticket médio" value={data.ticket_medio != null ? formatCurrency(Number(data.ticket_medio)) : '—'} changeType="neutral" icon={Receipt} />
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} index={i} />)
          )}
        </div>
      </section>

      {/* Por tipo de condição (ADR 0008): a faturar, faturado e previsão de cada tipo */}
      {data ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Por tipo de condição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 text-left">Condição</th>
                    <th className="border-l border-border/70 px-3 text-right">A faturar</th>
                    <th className="border-l border-border/70 px-3 text-right">Faturado</th>
                    <th className="border-l border-border/70 px-3 text-right">Previsão</th>
                  </tr>
                </thead>
                <tbody>
                  {(['a_vista', 'parcelado', 'recorrente'] as const).map((tipo) => {
                    const v = data.por_tipo_condicao[tipo];
                    return (
                      <tr key={tipo} className="border-b last:border-0">
                        <td className="px-3 py-2.5">
                          <TipoCondicaoBadge value={tipo} />
                        </td>
                        {[v.a_faturar, v.faturadas, v.previsao].map((x, i) => (
                          <td key={i} className="border-l border-border/70 px-3 py-2.5 text-right tabular-nums">
                            {formatCurrency(Number(x))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Vendas por Mês */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Vendas por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart
            data={salesChartData}
            barColor="hsl(215, 85%, 60%)"
            tooltipLabel="Total de vendas"
            valueFormatter={canViewOrderValues ? formatCurrency : undefined}
            hideYAxis={!canViewOrderValues}
            isLoading={isLoading}
            emptyMessage="Sem histórico de vendas."
          />
        </CardContent>
      </Card>

      {/* Principais Clientes — Cobrança */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Principais Clientes por Cobrança</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutTableCard
            data={topClientesCobranca}
            isLoading={isLoading}
            showValue={canViewOrderValues}
            valueLabel="Valor cobrado"
            valueFormatter={formatCurrency}
            emptyMessage="Nenhum cliente com cobrança registrada."
          />
        </CardContent>
      </Card>

      {/* Clientes com Mais Vendas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Clientes com Mais Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutTableCard
            data={topClientesVendas}
            isLoading={isLoading}
            showValue={canViewOrderValues}
            valueLabel="Valor vendido"
            valueFormatter={formatCurrency}
            emptyMessage="Nenhum cliente com vendas registradas."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroPage;
