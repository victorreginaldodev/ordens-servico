import { useMemo } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, AlertCircle, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';
import { useFinanceiroAnalise } from '../hooks';
import { formatCurrency, toChartSeries } from '../utils';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { DonutTableCard } from '../components/DonutTableCard';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{children}</p>
);

const FinanceiroPage = () => {
  const { data, isLoading, isError } = useFinanceiroAnalise();
  const { canViewOrderValues } = useUserRole();

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data ? (
            <>
              <KpiCard
                title="Total Cobrado"
                value={canViewOrderValues ? formatCurrency(Number(data.total_cobrado)) : '—'}
                changeType="positive"
                icon={DollarSign}
              />
              <KpiCard
                title="A Cobrar"
                value={canViewOrderValues ? formatCurrency(Number(data.total_para_cobrar)) : '—'}
                changeType="neutral"
                icon={TrendingUp}
              />
              <KpiCard
                title="Sem Liberação para Cobrança"
                value={canViewOrderValues ? formatCurrency(Number(data.total_sem_liberacao)) : '—'}
                changeType="negative"
                icon={AlertTriangle}
              />
              <KpiCard
                title="Ticket Médio"
                value={canViewOrderValues && data.ticket_medio != null ? formatCurrency(Number(data.ticket_medio)) : '—'}
                changeType="neutral"
                icon={Receipt}
              />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} index={i} />)
          )}
        </div>
      </section>

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
