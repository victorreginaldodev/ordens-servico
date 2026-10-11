import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, CircleCheck, Clock, Coffee, ListChecks, TriangleAlert } from 'lucide-react';
import {
  AlternarVisualizacao,
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
  SeparadorDeFiltros,
  StatusBadge,
  TituloDoFiltro,
  type Indicador,
} from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { dentroDoPeriodo, intervaloDoPeriodo, mesAteHoje, rotuloDoPeriodo, type Periodo } from '@/lib/periodo';
import { NumeroOS } from '../components/Cabecalhos';
import { Cartao, Quadro } from '../components/Quadro';
import { Situacoes } from '../components/Situacoes';
import { CelulaServico, TabelaAgrupada, type Coluna } from '../components/TabelaAgrupada';
import { useEditarTarefa, useMeusServicos } from '../hooks';
import type { LinhaDeTarefa, SituacaoPrazo, StatusDaTarefa } from '../services';
import { usePreferencia } from '../usePreferencia';

/**
 * Meus serviços (`/meus-servicos`): o que está com a pessoa logada. Mesmo padrão do painel
 * (fluxos-e-navegacao.md §6.1 e §6.2.2): indicadores clicáveis, filtros em dropdown, lista ou quadro.
 */

type Foco = 'ativos' | 'atrasados' | 'vence7' | 'concluidos';
type CampoData = 'prazo' | 'conclusao';
const FOCOS: Foco[] = ['ativos', 'atrasados', 'vence7', 'concluidos'];
const PESO: Record<SituacaoPrazo, number> = { atrasado: 0, vence_7_dias: 1, sem_prazo: 2, depois: 3 };
const ATIVA = (t: LinhaDeTarefa) => t.status === 'aberta' || t.status === 'em_andamento';

const normalizar = (t: string | null | undefined) =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function MeusServicosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const [vis, setVis] = usePreferencia('execucao:vis:meus', 'lista', ['lista', 'quadro'] as const);
  const [cliente, setCliente] = useState<string | null>(null);
  const [data, setData] = useState<{ campo: CampoData; periodo: Periodo | null }>({ campo: 'prazo', periodo: null });
  const [busca, setBusca] = useState('');
  const [pop, setPop] = useState<string | null>(null);

  const focoParam = params.get('foco') as Foco | null;
  const foco: Foco | null = focoParam && FOCOS.includes(focoParam) ? focoParam : vis === 'lista' ? 'ativos' : null;
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

  const intervalo = data.periodo ? intervaloDoPeriodo(data.periodo) : null;
  const periodoConcluidas = data.campo === 'conclusao' && intervalo ? intervalo : mesAteHoje();
  const ativasQ = useMeusServicos();
  const concluidasQ = useMeusServicos({ concluidas: true, ...periodoConcluidas });
  const editar = useEditarTarefa();

  const todas = useMemo(() => [...(ativasQ.data ?? []), ...(concluidasQ.data ?? [])], [ativasQ.data, concluidasQ.data]);
  const termo = normalizar(busca.trim());
  const base = todas.filter(
    (t) =>
      (!termo || normalizar(`${t.catalogo_nome} ${t.descricao} ${t.cliente_nome} ${t.ordem_servico_id}`).includes(termo)) &&
      (!cliente || t.cliente_nome === cliente) &&
      (!intervalo || data.campo !== 'prazo' || dentroDoPeriodo(t.prazo, intervalo)),
  );
  const FOCO: Record<Foco, (t: LinhaDeTarefa) => boolean> = {
    ativos: ATIVA,
    atrasados: (t) => ATIVA(t) && t.situacao_prazo === 'atrasado',
    vence7: (t) => ATIVA(t) && t.situacao_prazo === 'vence_7_dias',
    concluidos: (t) => t.status === 'concluida',
  };
  const carregando = ativasQ.isLoading;
  const n = (k: Foco) => (carregando ? null : base.filter(FOCO[k]).length);
  const indicadores: Indicador<Foco>[] = [
    { id: 'ativos', rotulo: 'Com você', icone: ListChecks, tom: 'info', valor: n('ativos'), dica: 'Tarefas abertas ou em andamento.' },
    { id: 'atrasados', rotulo: 'Atrasados', icone: TriangleAlert, tom: 'danger', valor: n('atrasados'), dica: 'Passaram do prazo.' },
    { id: 'vence7', rotulo: 'Vencem em 7 dias', icone: Clock, tom: 'warning', valor: n('vence7'), dica: 'Prazo nos próximos 7 dias.' },
    {
      id: 'concluidos',
      rotulo: data.campo === 'conclusao' && intervalo ? 'Concluídos no período' : 'Concluídos no mês',
      icone: CircleCheck,
      tom: 'success',
      valor: n('concluidos'),
      dica: 'Tarefas que você concluiu no período.',
    },
  ];
  const linhas = base.filter((t) => !foco || FOCO[foco](t));

  const mudarStatus = (t: LinhaDeTarefa, status: StatusDaTarefa) => {
    if (t.status === status) return;
    editar.mutate(
      { tarefaId: t.tarefa_id, payload: { status } },
      {
        onSuccess: () =>
          toast({
            title: status === 'concluida' ? 'Tarefa concluída' : status === 'em_andamento' ? (t.status === 'concluida' ? 'Tarefa reaberta' : 'Tarefa iniciada') : 'Tarefa voltou para A fazer',
            description: `${t.catalogo_nome ?? 'Serviço'} · ${t.cliente_nome}`,
          }),
        onError: (e) => toast({ title: 'Não foi possível mudar o status', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' }),
      },
    );
  };
  const acao = (t: LinhaDeTarefa) =>
    t.status === 'aberta' ? (
      <Button size="sm" variant="outline" onClick={() => mudarStatus(t, 'em_andamento')} disabled={editar.isPending}>
        Iniciar
      </Button>
    ) : t.status === 'em_andamento' ? (
      <Button size="sm" onClick={() => mudarStatus(t, 'concluida')} disabled={editar.isPending}>
        Concluir
      </Button>
    ) : null;

  const abrir = (t: LinhaDeTarefa) => navigate(`/servicos/${t.servico_id}`);
  const conc = foco === 'concluidos';
  const colunas: Coluna<LinhaDeTarefa>[] = [
    { id: 'servico', titulo: 'Serviço', celula: (t) => <CelulaServico nome={t.catalogo_nome} detalhe={t.descricao ? `Parte: ${t.descricao}` : null} /> },
    { id: 'cliente', titulo: 'Cliente', celula: (t) => t.cliente_nome },
    { id: 'os', titulo: 'OS', className: 'w-20', celula: (t) => <NumeroOS os={t.ordem_servico_id} veVendas={veVendas} /> },
    conc
      ? { id: 'termino', titulo: 'Concluída em', className: 'w-32', celula: (t) => <span className="tabular-nums">{formatDate(t.data_termino)}</span> }
      : { id: 'situacao', titulo: 'Situação', celula: (t) => <Situacoes prazo={t.prazo} situacao={t.situacao_prazo} emAlerta={t.servico_em_alerta} diasSemMovimentacao={t.servico_dias_sem_movimentacao} /> },
    ...(conc ? [] : [{ id: 'status', titulo: 'Status', className: 'w-36', celula: (t: LinhaDeTarefa) => <StatusBadge entity="tarefa" value={t.status} /> }]),
    { id: 'acao', titulo: '', acao: true, className: 'w-28', celula: acao },
  ];
  const ordenadas = [...linhas].sort((a, b) =>
    conc ? (b.data_termino ?? '').localeCompare(a.data_termino ?? '') : PESO[a.situacao_prazo] - PESO[b.situacao_prazo] || (a.prazo ?? '9').localeCompare(b.prazo ?? '9'),
  );

  const clientes = [...new Set(todas.map((t) => t.cliente_nome))].sort();
  const chips = [
    ...(cliente ? [{ id: 'cliente', texto: `Cliente: ${cliente}` }] : []),
    ...(data.periodo ? [{ id: 'data', texto: `${data.campo === 'prazo' ? 'Prazo' : 'Conclusão'}: ${rotuloDoPeriodo(data.periodo)}` }] : []),
    ...(busca ? [{ id: 'busca', texto: `Busca: “${busca}”` }] : []),
  ];

  let corpo: React.ReactNode;
  if (carregando) corpo = <Skeleton className="h-64 rounded-lg" />;
  else if (ativasQ.isError) corpo = <EmptyState icon={AlertTriangle} title="Não foi possível carregar os seus serviços" description="Verifique a conexão e tente de novo." />;
  else if (vis === 'quadro') {
    const colunasQ = (
      [
        { id: 'aberta', titulo: 'A fazer', tom: 'warning' },
        { id: 'em_andamento', titulo: 'Em andamento', tom: 'info' },
        { id: 'concluida', titulo: data.campo === 'conclusao' && intervalo ? 'Concluídas no período' : 'Concluídas no mês', tom: 'success' },
      ] as const
    )
      .map((c) => ({ ...c, aceita: true, vazio: 'Arraste um cartão para cá.', itens: ordenadas.filter((t) => t.status === c.id) }))
      .filter((c) => !foco || c.itens.length);
    corpo = linhas.length ? (
      <Quadro
        rotulo="Meus serviços em quadro"
        colunas={colunasQ}
        chave={(t) => String(t.tarefa_id)}
        arrastavel={() => true}
        onSoltar={(col, chave) => {
          const t = todas.find((x) => String(x.tarefa_id) === chave);
          if (t) mudarStatus(t, col as StatusDaTarefa);
        }}
        cartao={(t) => (
          <Cartao
            titulo={`${t.catalogo_nome ?? 'Serviço'}${t.descricao ? ` · ${t.descricao}` : ''}`}
            os={t.ordem_servico_id}
            cliente={t.cliente_nome}
            atrasado={ATIVA(t) && t.situacao_prazo === 'atrasado'}
            onAbrir={() => abrir(t)}
            rodape={
              <>
                {t.status === 'concluida' ? (
                  <span className="text-xs text-muted-foreground">Concluída {formatDate(t.data_termino)}</span>
                ) : (
                  <Situacoes prazo={t.prazo} situacao={t.situacao_prazo} emAlerta={t.servico_em_alerta} diasSemMovimentacao={t.servico_dias_sem_movimentacao} />
                )}
                <span className="ml-auto">{acao(t)}</span>
              </>
            }
          />
        )}
      />
    ) : (
      <EmptyState icon={Coffee} title="Nada com estes filtros" description="Quando alguém distribuir um serviço para você, ele aparece aqui." />
    );
  } else {
    corpo = ordenadas.length ? (
      <TabelaAgrupada
        rotulo="Meus serviços"
        colunas={colunas}
        grupos={[{ chave: 'todos', linhas: ordenadas }]}
        chaveDaLinha={(t) => t.tarefa_id}
        onAbrir={abrir}
      />
    ) : (
      <EmptyState
        icon={Coffee}
        title={foco === 'ativos' && !chips.length ? 'Nada com você agora' : 'Nada com estes filtros'}
        description={foco === 'ativos' && !chips.length ? 'Quando alguém distribuir um serviço para você, ele aparece aqui.' : 'Mude o indicador ou limpe os filtros.'}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Meus serviços" description="O que está com você, o que vence primeiro e o que está atrasado." />
      <Indicadores titulo="Seu resumo" itens={indicadores} ativo={foco} onEscolher={escolherFoco} alternavel={vis === 'quadro'} />
      <BarraDeFiltros>
        <AlternarVisualizacao valor={vis} onChange={setVis} />
        <SeparadorDeFiltros />
        <FiltroDropdown icone={Building2} rotulo="Cliente" valor={cliente?.split(' ').slice(0, 2).join(' ')} aberto={pop === 'cliente'} onAberto={(o) => setPop(o ? 'cliente' : null)} largura="w-72">
          <TituloDoFiltro>Cliente</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!cliente} onClick={() => { setCliente(null); setPop(null); }}>
            Todos os clientes
          </OpcaoDeFiltro>
          {clientes.map((c) => (
            <OpcaoDeFiltro key={c} marcado={cliente === c} onClick={() => { setCliente(c); setPop(null); }}>
              {c}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        <FiltroDePeriodo
          campos={{ prazo: 'Prazo', conclusao: 'Conclusão' }}
          campo={data.campo}
          periodo={data.periodo}
          onChange={(campo, periodo) => setData({ campo, periodo })}
          aberto={pop === 'data'}
          onAberto={(o) => setPop(o ? 'data' : null)}
        />
        <EspacoDeFiltros />
        <BuscaDeFiltros valor={busca} onChange={setBusca} placeholder="Buscar serviço, cliente ou OS" />
      </BarraDeFiltros>
      <ChipsDeFiltros
        itens={chips}
        onRemover={(id) => (id === 'cliente' ? setCliente(null) : id === 'data' ? setData({ campo: 'prazo', periodo: null }) : setBusca(''))}
        onLimpar={() => {
          setCliente(null);
          setData({ campo: 'prazo', periodo: null });
          setBusca('');
        }}
      />
      {corpo}
    </div>
  );
}
