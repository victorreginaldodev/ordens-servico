import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, CircleCheck, CircleDot, Handshake, Inbox, Plus, Receipt, User } from 'lucide-react';
import {
  AndamentoServicos,
  BarraDeFiltros,
  BuscaDeFiltros,
  ChipsDeFiltros,
  EmptyState,
  EspacoDeFiltros,
  FiltroDePeriodo,
  FiltroDropdown,
  Indicadores,
  OpcaoDeFiltro,
  PageHeader,
  SituacaoFinanceiraBadge,
  StatusBadge,
  TipoCondicaoBadge,
  TituloDoFiltro,
  type Indicador,
} from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabelaAgrupada, type Coluna } from '@/features/execucao/components/TabelaAgrupada';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, formatDate } from '@/lib/format';
import { dentroDoPeriodo, intervaloDoPeriodo, rotuloDoPeriodo, type Periodo } from '@/lib/periodo';
import { useVendas } from '../hooks';
import type { VendaDaLista } from '../services';

/**
 * Vendas (`/vendas`): cada venda com o andamento da execução. Mesmo padrão da execução
 * (decidido em 11/10/2026, fluxos-e-navegacao.md §6.2.3 item 4): indicadores clicáveis, filtros em dropdown.
 */

type Foco = 'fila' | 'execucao' | 'concluidas' | 'a_faturar';
type SituacaoFin = 'previsao' | 'a_faturar' | 'faturadas';
const FOCOS: Foco[] = ['fila', 'execucao', 'concluidas', 'a_faturar'];
const MINHAS = '__minhas__';

const situacaoFin = (v: VendaDaLista): SituacaoFin => (v.cobranca_realizada ? 'faturadas' : v.liberada_para_cobranca ? 'a_faturar' : 'previsao');
const ROTULO_FIN: Record<SituacaoFin, string> = { previsao: 'Previsão', a_faturar: 'A faturar', faturadas: 'Faturada' };
const FOCO: Record<Foco, (v: VendaDaLista) => boolean> = {
  fila: (v) => v.andamento.na_fila > 0,
  execucao: (v) => v.status === 'em_andamento',
  concluidas: (v) => v.status === 'concluida',
  a_faturar: (v) => situacaoFin(v) === 'a_faturar',
};
const normalizar = (t: string | null | undefined) =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function VendasPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { pode } = usePermissoes();
  const veValores = pode('financeiro.ver_valores');
  const gerencia = pode('os.gerenciar');

  const [vendedor, setVendedor] = useState<string | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);
  const [fin, setFin] = useState<SituacaoFin | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [busca, setBusca] = useState(params.get('q') ?? '');
  const [pop, setPop] = useState<string | null>(null);

  const focoParam = params.get('foco') as Foco | null;
  const foco = focoParam && FOCOS.includes(focoParam) ? focoParam : null;
  const escolherFoco = (f: Foco | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (f) n.set('foco', f);
        else n.delete('foco');
        return n;
      },
      { replace: true },
    );

  // "Minhas vendas" vai para o backend (`?minhas=true`): ele sabe quem registrou cada venda.
  const vendasQ = useVendas(vendedor === MINHAS ? { minhas: 'true' } : {});
  const todas = vendasQ.data ?? [];
  const intervalo = periodo ? intervaloDoPeriodo(periodo) : null;
  const termo = normalizar(busca.trim().replace(/^os\s*/i, ''));

  const base = todas.filter(
    (v) =>
      (!termo || String(v.id).startsWith(termo) || normalizar(v.cliente_nome).includes(termo)) &&
      (!vendedor || vendedor === MINHAS || v.vendido_por_nome === vendedor) &&
      (!cliente || v.cliente_nome === cliente) &&
      (!fin || !veValores || situacaoFin(v) === fin) &&
      dentroDoPeriodo(v.data_venda, intervalo),
  );
  const linhas = base.filter((v) => !foco || FOCO[foco](v)).sort((a, b) => b.id - a.id);
  const carregando = vendasQ.isLoading;
  const n = (k: Foco) => (carregando ? null : base.filter(FOCO[k]).length);
  const indicadores: Indicador<Foco>[] = [
    { id: 'fila', rotulo: 'Para distribuir', icone: Inbox, tom: 'warning', valor: n('fila'), dica: 'Vendas com algum serviço ainda na fila de um setor.' },
    { id: 'execucao', rotulo: 'Em execução', icone: CircleDot, tom: 'info', valor: n('execucao'), dica: 'Algum serviço já começou e nem todos terminaram.' },
    { id: 'concluidas', rotulo: 'Concluídas', icone: CircleCheck, tom: 'success', valor: n('concluidas'), dica: 'Todos os serviços concluídos.' },
    ...(veValores
      ? [{ id: 'a_faturar' as Foco, rotulo: 'A faturar', icone: Receipt, tom: 'warning' as const, valor: n('a_faturar'), dica: 'Liberadas para faturar e ainda sem lançamento.' }]
      : []),
  ];

  const colunas: Coluna<VendaDaLista>[] = [
    { id: 'os', titulo: 'OS', className: 'w-20', celula: (v) => <span className="font-semibold tabular-nums">{v.id}</span> },
    { id: 'cliente', titulo: 'Cliente', celula: (v) => v.cliente_nome },
    { id: 'venda', titulo: 'Venda', className: 'w-28', celula: (v) => <span className="tabular-nums">{formatDate(v.data_venda)}</span> },
    { id: 'vendedor', titulo: 'Vendedor', celula: (v) => v.vendido_por_nome || '—' },
    { id: 'andamento', titulo: 'Andamento', className: 'w-40', celula: (v) => <AndamentoServicos andamento={v.andamento} /> },
    { id: 'status', titulo: 'Status', className: 'w-36', celula: (v) => <StatusBadge entity="os" value={v.status} /> },
    ...(veValores
      ? ([
          { id: 'condicao', titulo: 'Condição', className: 'w-36', celula: (v) => <span title={v.condicao_resumo}><TipoCondicaoBadge value={v.tipo_condicao} /></span> },
          {
            id: 'valor',
            titulo: 'Valor',
            className: 'w-32 text-right',
            celula: (v) => (
              <span className="tabular-nums">
                {formatCurrency(v.valor)}
                {v.valor_mensal ? <span className="block text-xs text-muted-foreground">{formatCurrency(v.valor_mensal)}/mês</span> : null}
              </span>
            ),
          },
          { id: 'fin', titulo: 'Financeiro', className: 'w-32', celula: (v) => <SituacaoFinanceiraBadge value={situacaoFin(v)} /> },
        ] satisfies Coluna<VendaDaLista>[])
      : []),
  ];

  const vendedores = [...new Set(todas.map((v) => v.vendido_por_nome).filter(Boolean) as string[])].sort();
  const clientes = [...new Set(todas.map((v) => v.cliente_nome))].sort();
  const chips = [
    ...(vendedor ? [{ id: 'vendedor', texto: vendedor === MINHAS ? 'Minhas vendas' : `Vendedor: ${vendedor}` }] : []),
    ...(cliente ? [{ id: 'cliente', texto: `Cliente: ${cliente}` }] : []),
    ...(fin ? [{ id: 'fin', texto: `Financeiro: ${ROTULO_FIN[fin]}` }] : []),
    ...(periodo ? [{ id: 'periodo', texto: `Venda: ${rotuloDoPeriodo(periodo)}` }] : []),
    ...(busca ? [{ id: 'busca', texto: `Busca: “${busca}”` }] : []),
  ];
  const limpadores: Record<string, () => void> = {
    vendedor: () => setVendedor(null),
    cliente: () => setCliente(null),
    fin: () => setFin(null),
    periodo: () => setPeriodo(null),
    busca: () => setBusca(''),
  };
  const limpar = (id: string) => limpadores[id]?.();
  const escolhe = (fn: () => void) => () => {
    fn();
    setPop(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vendas"
        description="Cada venda com o andamento da execução nos setores."
        actions={
          gerencia ? (
            <Button asChild>
              <Link to="/vendas/nova">
                <Plus className="size-4" /> Nova venda
              </Link>
            </Button>
          ) : null
        }
      />
      <Indicadores titulo="Resumo das vendas" itens={indicadores} ativo={foco} onEscolher={escolherFoco} alternavel />
      <BarraDeFiltros>
        <FiltroDropdown icone={User} rotulo="Vendedor" valor={vendedor === MINHAS ? 'Minhas vendas' : vendedor?.split(' ')[0]} aberto={pop === 'vendedor'} onAberto={(o) => setPop(o ? 'vendedor' : null)} largura="w-72">
          <TituloDoFiltro>Quem vendeu</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!vendedor} onClick={escolhe(() => setVendedor(null))}>
            Todos
          </OpcaoDeFiltro>
          {gerencia ? (
            <OpcaoDeFiltro marcado={vendedor === MINHAS} onClick={escolhe(() => setVendedor(MINHAS))}>
              Minhas vendas
            </OpcaoDeFiltro>
          ) : null}
          {vendedores.map((p) => (
            <OpcaoDeFiltro key={p} marcado={vendedor === p} onClick={escolhe(() => setVendedor(p))}>
              {p}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        <FiltroDropdown icone={Building2} rotulo="Cliente" valor={cliente?.split(' ').slice(0, 2).join(' ')} aberto={pop === 'cliente'} onAberto={(o) => setPop(o ? 'cliente' : null)} largura="w-72">
          <TituloDoFiltro>Cliente</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!cliente} onClick={escolhe(() => setCliente(null))}>
            Todos os clientes
          </OpcaoDeFiltro>
          {clientes.map((c) => (
            <OpcaoDeFiltro key={c} marcado={cliente === c} onClick={escolhe(() => setCliente(c))}>
              {c}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        {veValores ? (
          <FiltroDropdown icone={Receipt} rotulo="Financeiro" valor={fin ? ROTULO_FIN[fin] : null} aberto={pop === 'fin'} onAberto={(o) => setPop(o ? 'fin' : null)} largura="w-56">
            <TituloDoFiltro>Situação financeira</TituloDoFiltro>
            <OpcaoDeFiltro marcado={!fin} onClick={escolhe(() => setFin(null))}>
              Todas
            </OpcaoDeFiltro>
            {(Object.keys(ROTULO_FIN) as SituacaoFin[]).map((k) => (
              <OpcaoDeFiltro key={k} marcado={fin === k} onClick={escolhe(() => setFin(k))}>
                {ROTULO_FIN[k]}
              </OpcaoDeFiltro>
            ))}
          </FiltroDropdown>
        ) : null}
        <FiltroDePeriodo campos={{ venda: 'Venda' }} campo="venda" periodo={periodo} onChange={(_, p) => setPeriodo(p)} aberto={pop === 'data'} onAberto={(o) => setPop(o ? 'data' : null)} />
        <EspacoDeFiltros />
        <BuscaDeFiltros valor={busca} onChange={setBusca} placeholder="Cliente ou número da OS" />
      </BarraDeFiltros>
      <ChipsDeFiltros
        itens={chips}
        onRemover={limpar}
        onLimpar={() => {
          setVendedor(null);
          setCliente(null);
          setFin(null);
          setPeriodo(null);
          setBusca('');
        }}
      />

      {carregando ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : vendasQ.isError ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível carregar as vendas" description="Verifique a conexão e tente de novo." />
      ) : linhas.length ? (
        <TabelaAgrupada rotulo="Vendas" colunas={colunas} grupos={[{ chave: 'todas', linhas }]} chaveDaLinha={(v) => v.id} onAbrir={(v) => navigate(`/vendas/${v.id}`)} />
      ) : (
        <EmptyState
          icon={Handshake}
          title={todas.length ? 'Nenhuma venda com estes filtros' : 'Nenhuma venda registrada'}
          description={todas.length ? 'Mude o indicador selecionado ou limpe os filtros.' : 'As vendas registradas aparecem aqui com o andamento de cada serviço.'}
          action={
            !todas.length && gerencia ? (
              <Button asChild>
                <Link to="/vendas/nova">
                  <Plus className="size-4" /> Nova venda
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
      {!veValores ? (
        <p className="mt-3 text-xs text-muted-foreground">Condição, valor e situação financeira aparecem só para quem vê valores.</p>
      ) : null}
    </div>
  );
}
