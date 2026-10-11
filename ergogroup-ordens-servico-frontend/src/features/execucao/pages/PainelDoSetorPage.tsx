import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronsUp,
  CircleCheck,
  CircleDot,
  Hourglass,
  Inbox,
  Lock,
  Network,
  Rows3,
  TriangleAlert,
  User,
} from 'lucide-react';
import {
  AlternarVisualizacao,
  AvatarStack,
  BarraDeFiltros,
  BuscaDeFiltros,
  ChipsDeFiltros,
  EmptyState,
  EspacoDeFiltros,
  EtapaBadge,
  FiltroDePeriodo,
  FiltroDropdown,
  Indicadores,
  NotaDoFiltro,
  OpcaoDeFiltro,
  PageHeader,
  PrioridadeIndicator,
  SeparadorDeFiltros,
  StatusBadge,
  TituloDoFiltro,
  type Indicador,
} from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissoes } from '@/hooks/usePermissoes';
import { statusDoErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { dentroDoPeriodo, diasAtras, intervaloDoPeriodo, mesAteHoje, rotuloDoPeriodo, type Periodo } from '@/lib/periodo';
import { cn } from '@/lib/utils';
import { CabecalhoOS, CabecalhoPessoa, CabecalhoSimples, NumeroOS } from '../components/Cabecalhos';
import { CienciaModal, type ServicoParaCiencia } from '../components/CienciaModal';
import { DistribuirModal, type ServicoParaDistribuir } from '../components/DistribuirModal';
import { Cartao, Quadro, type ColunaDoQuadro } from '../components/Quadro';
import { OutrosServicosDaOS, ResultadoDoPrazo, Situacoes } from '../components/Situacoes';
import { CelulaServico, TabelaAgrupada, type Coluna, type Grupo } from '../components/TabelaAgrupada';
import { useSetoresAcompanhados } from '../hooks';
import type { Etapa, SetorAcompanhado, SituacaoPrazo } from '../services';
import { useBlocosDoPainel, type ComSetor } from '../useBlocosDoPainel';
import type { Alerta, ItemDaFila, LinhaDeTarefa } from '../services';
import type { ServicoConcluidoComSetor } from '../useBlocosDoPainel';
import { usePreferencia } from '../usePreferencia';

/**
 * Painel do setor (`/setor/:setorId`) e Visão geral (`/visao-geral`, `setores.todos`): a mesma página.
 * Desenho validado em 11/10/2026 (fluxos-e-navegacao.md §6.2.2 e §6.2.3): indicadores clicáveis no lugar
 * das abas, filtros em dropdown, lista como padrão e quadro como opção.
 */

type Foco = 'fila' | 'andamento' | 'atrasados' | 'parados' | 'concluidos';
type Agrupar = 'nenhum' | 'pessoa' | 'os' | 'cliente' | 'setor';
type Fila = ComSetor<ItemDaFila>;
type Tarefa = ComSetor<LinhaDeTarefa>;
type AlertaS = ComSetor<Alerta>;
type Concluido = ServicoConcluidoComSetor;

const FOCOS: Foco[] = ['fila', 'andamento', 'atrasados', 'parados', 'concluidos'];
const CAMPO_DATA: Record<Foco, Record<string, string>> = {
  fila: { chegada: 'Chegada ao setor' },
  andamento: { prazo: 'Prazo' },
  atrasados: { prazo: 'Prazo' },
  parados: { prazo: 'Prazo' },
  concluidos: { conclusao: 'Conclusão' },
};
const ROTULO_AGRUPAR: Record<Agrupar, string> = { nenhum: 'Sem agrupar', pessoa: 'Por pessoa', os: 'Por OS', cliente: 'Por cliente', setor: 'Por setor' };
const PADRAO_AGRUPAR: Record<Foco, Agrupar> = { fila: 'nenhum', andamento: 'pessoa', atrasados: 'pessoa', parados: 'pessoa', concluidos: 'nenhum' };
const PESO_PRAZO: Record<SituacaoPrazo, number> = { atrasado: 0, vence_7_dias: 1, sem_prazo: 2, depois: 3 };

interface Filtros {
  pessoa: string | null;
  cliente: string | null;
  prioridade: string | null;
  periodo: Periodo | null;
  busca: string;
  agrupar: Agrupar | null;
}
const FILTROS_VAZIOS: Filtros = { pessoa: null, cliente: null, prioridade: null, periodo: null, busca: '', agrupar: null };

const normalizar = (t: string | null | undefined) =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ehParado = (a: Alerta) => a.motivos.includes('sem_movimentacao') && !a.ciencia_vigente;
const ehAtrasado = (a: Alerta) => a.motivos.includes('atrasado');

/** Cartão do quadro: um serviço, de qualquer bloco. */
interface CartaoServico {
  chave: string;
  servicoId: number;
  etapa: Etapa;
  catalogo: string | null;
  cliente: string;
  os: number;
  setorId: number;
  setorNome: string;
  organiza: boolean;
  prioridade?: string;
  naFilaHaDias?: number;
  responsaveis: string[];
  prazo: string | null;
  situacao: SituacaoPrazo | null;
  alerta?: AlertaS;
  concluido?: Concluido;
}

export default function PainelDoSetorPage({ geral = false }: { geral?: boolean }) {
  const navigate = useNavigate();
  const { setorId: setorParam } = useParams();
  const [params, setParams] = useSearchParams();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const setoresQ = useSetoresAcompanhados();
  const [vis, setVis] = usePreferencia(geral ? 'execucao:vis:geral' : 'execucao:vis:painel', 'lista', ['lista', 'quadro'] as const);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [pop, setPop] = useState<string | null>(null);
  const [distribuir, setDistribuir] = useState<{ servico: ServicoParaDistribuir; responsavel?: number | null } | null>(null);
  const [ciencia, setCiencia] = useState<ServicoParaCiencia | null>(null);

  const setores = useMemo(() => setoresQ.data ?? [], [setoresQ.data]);
  const focoParam = params.get('foco') as Foco | null;
  const foco: Foco | null = focoParam && FOCOS.includes(focoParam) ? focoParam : vis === 'lista' ? 'fila' : null;
  const setorFiltro = geral ? Number(params.get('setor')) || null : null;

  // Painel: setor da URL, senão o último usado, senão o primeiro.
  const ultimo = (() => {
    try {
      return Number(localStorage.getItem('painel:setor')) || null;
    } catch {
      return null;
    }
  })();
  const setorDoPainel = !geral
    ? setores.find((s) => s.id === Number(setorParam)) ?? (setorParam ? undefined : setores.find((s) => s.id === ultimo) ?? setores[0])
    : undefined;
  useEffect(() => {
    if (setorDoPainel) {
      try {
        localStorage.setItem('painel:setor', String(setorDoPainel.id));
      } catch {
        /* ok */
      }
    }
  }, [setorDoPainel]);

  const carregados = useMemo<SetorAcompanhado[]>(
    () => (geral ? (setorFiltro ? setores.filter((s) => s.id === setorFiltro) : setores) : setorDoPainel ? [setorDoPainel] : []),
    [geral, setorFiltro, setores, setorDoPainel],
  );
  const intervalo = filtros.periodo ? intervaloDoPeriodo(filtros.periodo) : null;
  const periodoConcluidos = foco === 'concluidos' && intervalo ? intervalo : mesAteHoje();
  const blocos = useBlocosDoPainel(carregados, periodoConcluidos);

  const mudarParam = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v == null) n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: true },
    );
  const escolherFoco = (f: Foco | null) => {
    if (f !== foco) setFiltros((x) => ({ ...x, agrupar: null }));
    mudarParam('foco', f);
  };
  const mudarVis = (v: 'lista' | 'quadro') => {
    setVis(v);
    setFiltros((x) => ({ ...x, agrupar: null }));
  };
  const muda = (p: Partial<Filtros>) => {
    setFiltros((x) => ({ ...x, ...p }));
    setPop(null);
  };

  /* ── Filtros da barra (o indicador escolhido não entra: os números mostram cada recorte) ── */
  const f = filtros;
  const busca = normalizar(f.busca.trim());
  const casaBusca = (...campos: (string | number | null | undefined)[]) => !busca || normalizar(campos.join(' ')).includes(busca);
  const fila = blocos.fila.filter(
    (s) =>
      casaBusca(s.catalogo_nome, s.descricao, s.cliente_nome, s.ordem_servico_id) &&
      (!f.cliente || s.cliente_nome === f.cliente) &&
      (!f.prioridade || s.prioridade === f.prioridade) &&
      (!intervalo || foco !== 'fila' || dentroDoPeriodo(diasAtras(s.na_fila_ha_dias), intervalo)),
  );
  const andamento = blocos.andamento.filter(
    (t) =>
      casaBusca(t.catalogo_nome, t.descricao, t.cliente_nome, t.ordem_servico_id, t.responsavel_nome) &&
      (!f.cliente || t.cliente_nome === f.cliente) &&
      (!f.pessoa || t.responsavel_nome === f.pessoa) &&
      (!intervalo || foco !== 'andamento' || dentroDoPeriodo(t.prazo, intervalo)),
  );
  const alertas = blocos.alertas.filter(
    (a) =>
      casaBusca(a.catalogo_nome, a.descricao, a.cliente_nome, a.ordem_servico_id, a.responsaveis.join(' ')) &&
      (!f.cliente || a.cliente_nome === f.cliente) &&
      (!f.pessoa || a.responsaveis.includes(f.pessoa)) &&
      (!intervalo || !['atrasados', 'parados'].includes(foco ?? '') || dentroDoPeriodo(a.prazo, intervalo)),
  );
  const concluidos = blocos.concluidos.filter(
    (c) =>
      casaBusca(c.catalogo_nome, c.descricao, c.cliente_nome, c.ordem_servico_id, c.terminado_por_nome) &&
      (!f.cliente || c.cliente_nome === f.cliente) &&
      (!f.pessoa || c.terminado_por_nome === f.pessoa),
  );
  const atrasados = alertas.filter(ehAtrasado);
  const parados = alertas.filter(ehParado);
  const servicosEmAndamento = new Set(andamento.map((t) => t.servico_id)).size;
  const alertaPorServico = new Map(blocos.alertas.map((a) => [a.servico_id, a]));

  const carregandoTudo = setoresQ.isLoading || (carregados.length > 0 && blocos.carregando && !blocos.fila.length && !blocos.andamento.length);
  const n = (v: number) => (carregandoTudo ? null : v);
  const indicadores: Indicador<Foco>[] = [
    { id: 'fila', rotulo: 'Para distribuir', icone: Inbox, tom: 'warning', valor: n(fila.length), dica: 'Chegaram ao setor e ainda não têm responsável.' },
    { id: 'andamento', rotulo: 'Em andamento', icone: CircleDot, tom: 'info', valor: n(servicosEmAndamento), dica: 'Serviços distribuídos ou em execução.' },
    { id: 'atrasados', rotulo: 'Atrasados', icone: TriangleAlert, tom: 'danger', valor: n(atrasados.length), dica: 'Passaram do prazo e não foram concluídos.' },
    { id: 'parados', rotulo: 'Parados', icone: Hourglass, tom: 'warning', valor: n(parados.length), dica: 'Sem nenhuma mudança há 7 dias ou mais, sem ciência.' },
    {
      id: 'concluidos',
      rotulo: foco === 'concluidos' && intervalo ? 'Concluídos no período' : 'Concluídos no mês',
      icone: CircleCheck,
      tom: 'success',
      valor: n(concluidos.length),
      dica: 'Todas as tarefas concluídas no período.',
    },
  ];

  /* ── Ações ── */
  const abrirServico = (id: number) => navigate(`/servicos/${id}`);
  const paraDistribuir = (s: Fila): ServicoParaDistribuir => ({
    id: s.servico_id,
    catalogo: s.catalogo_nome,
    cliente: s.cliente_nome,
    ordemServicoId: s.ordem_servico_id,
    setorId: s.setor_id,
    setorNome: s.setor_nome,
  });
  const botaoCiencia = (alvo: { servico_id: number; catalogo_nome: string | null; cliente_nome: string }, dias: number) => (
    <Button
      size="sm"
      variant="outline"
      title="Confirmar que está tudo bem e silenciar o aviso por 7 dias"
      onClick={() => setCiencia({ id: alvo.servico_id, catalogo: alvo.catalogo_nome, cliente: alvo.cliente_nome, diasSemMovimentacao: dias })}
    >
      Estou ciente
    </Button>
  );

  /* ── Página: estados de erro ── */
  if (setoresQ.isError) {
    const status = statusDoErro(setoresQ.error);
    return (
      <>
        <PageHeader title={geral ? 'Visão geral' : 'Painel do setor'} />
        <EmptyState
          icon={status === 403 ? Lock : AlertTriangle}
          title={status === 403 ? 'Você não acompanha nenhum setor' : 'Não foi possível carregar o painel'}
          description={status === 403 ? 'O painel aparece para quem tem a permissão de ver os serviços de um setor.' : 'Verifique a conexão e tente de novo.'}
        />
      </>
    );
  }
  if (!geral && setorParam && setoresQ.data && !setorDoPainel) {
    return (
      <>
        <PageHeader title="Painel do setor" />
        <EmptyState
          icon={Lock}
          title="Você não acompanha este setor"
          description={setores.length ? 'Escolha um dos setores que você acompanha.' : undefined}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {setores.map((s) => (
                <Button key={s.id} variant="outline" asChild>
                  <Link to={`/setor/${s.id}`}>{s.nome}</Link>
                </Button>
              ))}
            </div>
          }
        />
      </>
    );
  }

  const comSetor = geral && !setorFiltro;
  const organiza = (s: { organiza: boolean }) => s.organiza;

  /* ── Lista ── */
  const agrupar: Agrupar = f.agrupar ?? (foco ? PADRAO_AGRUPAR[foco] : 'nenhum');
  const colSetor = <T extends { setor_nome: string }>(): Coluna<T>[] => (comSetor && agrupar !== 'setor' ? [{ id: 'setor', titulo: 'Setor', celula: (l) => l.setor_nome }] : []);
  const colBase = <T extends { catalogo_nome: string | null; cliente_nome: string; ordem_servico_id: number; setor_nome: string }>(detalhe: (l: T) => string | null | undefined): Coluna<T>[] => [
    { id: 'servico', titulo: 'Serviço', celula: (l) => <CelulaServico nome={l.catalogo_nome} detalhe={detalhe(l)} /> },
    { id: 'cliente', titulo: 'Cliente', celula: (l) => l.cliente_nome },
    { id: 'os', titulo: 'OS', celula: (l) => <NumeroOS os={l.ordem_servico_id} veVendas={veVendas} />, className: 'w-20' },
    ...colSetor<T>(),
  ];

  function agruparLinhas<T extends { cliente_nome: string; ordem_servico_id: number; setor_nome: string }>(
    linhas: T[],
    pessoasDe: (l: T) => (string | null)[],
    atrasadoDe: (l: T) => boolean,
    extraOS?: (l: T) => React.ReactNode,
  ): Grupo<T>[] {
    if (agrupar === 'nenhum') return [{ chave: 'todos', linhas }];
    const mapa = new Map<string, T[]>();
    const chaveDe = (l: T): string[] =>
      agrupar === 'pessoa' ? pessoasDe(l).map((p) => p ?? '') : agrupar === 'os' ? [String(l.ordem_servico_id)] : agrupar === 'setor' ? [l.setor_nome] : [l.cliente_nome];
    linhas.forEach((l) => chaveDe(l).forEach((k) => mapa.set(k, [...(mapa.get(k) ?? []), l])));
    const chaves = [...mapa.keys()].sort((a, b) => (agrupar === 'os' ? Number(a) - Number(b) : (a || '￿').localeCompare(b || '￿')));
    return chaves.map((k) => {
      const ls = mapa.get(k)!;
      let cabecalho: React.ReactNode;
      if (agrupar === 'pessoa') {
        const m = blocos.equipe.find((e) => e.nome === k);
        cabecalho = <CabecalhoPessoa nome={k || null} funcao={m?.funcao} quantidade={ls.length} atrasados={ls.filter(atrasadoDe).length} unidade={foco === 'andamento' ? ['tarefa', 'tarefas'] : undefined} />;
      } else if (agrupar === 'os') {
        cabecalho = <CabecalhoOS os={Number(k)} cliente={ls[0].cliente_nome} quantidade={ls.length} veVendas={veVendas} extra={extraOS?.(ls[0])} />;
      } else {
        cabecalho = <CabecalhoSimples titulo={k} quantidade={ls.length} />;
      }
      return { chave: k || 'sem', cabecalho, linhas: ls };
    });
  }

  let lista: React.ReactNode = null;
  if (vis === 'lista' && foco) {
    const vazio = (
      <EmptyState
        icon={foco === 'fila' ? Inbox : foco === 'concluidos' ? CircleCheck : CircleDot}
        title="Nada com estes filtros"
        description={foco === 'fila' ? 'Tudo o que chegou ao setor já tem responsável.' : 'Mude o indicador selecionado ou limpe os filtros.'}
      />
    );
    if (foco === 'fila') {
      const linhas = [...fila].sort((a, b) => b.na_fila_ha_dias - a.na_fila_ha_dias);
      const colunas: Coluna<Fila>[] = [
        ...colBase<Fila>((l) => l.descricao),
        {
          id: 'na_fila',
          titulo: 'Na fila há',
          className: 'w-28 whitespace-nowrap',
          celula: (l) => (
            <span className={cn('tabular-nums', l.na_fila_ha_dias >= 5 && 'text-warning-strong')}>
              {l.na_fila_ha_dias === 0 ? 'Chegou hoje' : `${l.na_fila_ha_dias} dia${l.na_fila_ha_dias === 1 ? '' : 's'}`}
            </span>
          ),
        },
        { id: 'prioridade', titulo: 'Prioridade', className: 'w-28', celula: (l) => <PrioridadeIndicator value={l.prioridade} /> },
        { id: 'outros', titulo: 'Outros serviços da OS', celula: (l) => <OutrosServicosDaOS itens={l.outros_servicos_da_os} setorAtual={l.setor_nome} /> },
        {
          id: 'acao',
          titulo: '',
          acao: true,
          className: 'w-28',
          celula: (l) => (organiza(l) ? <Button size="sm" onClick={() => setDistribuir({ servico: paraDistribuir(l) })}>Distribuir</Button> : null),
        },
      ];
      lista = linhas.length ? (
        <TabelaAgrupada
          rotulo="Para distribuir"
          colunas={colunas}
          grupos={agruparLinhas(linhas, () => [null], () => false, (l) => <OutrosServicosDaOS itens={l.outros_servicos_da_os} setorAtual={l.setor_nome} />)}
          chaveDaLinha={(l) => l.servico_id}
          onAbrir={(l) => abrirServico(l.servico_id)}
        />
      ) : (
        vazio
      );
    } else if (foco === 'andamento') {
      const linhas = [...andamento].sort((a, b) => PESO_PRAZO[a.situacao_prazo] - PESO_PRAZO[b.situacao_prazo] || (a.prazo ?? '9').localeCompare(b.prazo ?? '9'));
      const colunas: Coluna<Tarefa>[] = [
        ...colBase<Tarefa>((l) => (l.descricao ? `Parte: ${l.descricao}` : null)),
        ...(agrupar === 'pessoa' ? [] : [{ id: 'resp', titulo: 'Responsável', celula: (l: Tarefa) => l.responsavel_nome } satisfies Coluna<Tarefa>]),
        { id: 'status', titulo: 'Status', className: 'w-36', celula: (l) => <StatusBadge entity="tarefa" value={l.status} /> },
        {
          id: 'situacao',
          titulo: 'Situação',
          celula: (l) => {
            const a = alertaPorServico.get(l.servico_id);
            return (
              <Situacoes
                prazo={l.prazo}
                situacao={l.situacao_prazo}
                emAlerta={l.servico_em_alerta}
                diasSemMovimentacao={l.servico_dias_sem_movimentacao}
                cienciaVigente={a?.ciencia_vigente}
                motivoCiencia={a?.alerta_ciente_motivo}
              />
            );
          },
        },
        { id: 'idade', titulo: 'Com a pessoa há', className: 'w-32 whitespace-nowrap', celula: (l) => <span className="tabular-nums">{l.idade_dias} dia{l.idade_dias === 1 ? '' : 's'}</span> },
        { id: 'acao', titulo: '', acao: true, className: 'w-32', celula: (l) => (l.servico_em_alerta ? botaoCiencia(l, l.servico_dias_sem_movimentacao) : null) },
      ];
      lista = linhas.length ? (
        <TabelaAgrupada
          rotulo="Em andamento"
          colunas={colunas}
          grupos={agruparLinhas(linhas, (l) => [l.responsavel_nome], (l) => l.situacao_prazo === 'atrasado')}
          chaveDaLinha={(l) => l.tarefa_id}
          onAbrir={(l) => abrirServico(l.servico_id)}
        />
      ) : (
        vazio
      );
    } else if (foco === 'atrasados' || foco === 'parados') {
      const linhas = [...(foco === 'atrasados' ? atrasados : parados)].sort((a, b) => b.dias_sem_movimentacao - a.dias_sem_movimentacao);
      const colunas: Coluna<AlertaS>[] = [
        ...colBase<AlertaS>((l) => l.descricao),
        ...(agrupar === 'pessoa' ? [] : [{ id: 'resp', titulo: 'Responsável', celula: (l: AlertaS) => l.responsaveis.join(', ') || '—' } satisfies Coluna<AlertaS>]),
        { id: 'etapa', titulo: 'Etapa', className: 'w-36', celula: (l) => <EtapaBadge value={l.etapa} /> },
        {
          id: 'situacao',
          titulo: 'Situação',
          celula: (l) => (
            <Situacoes
              prazo={l.prazo}
              situacao={ehAtrasado(l) ? 'atrasado' : null}
              emAlerta={ehParado(l)}
              diasSemMovimentacao={l.dias_sem_movimentacao}
              cienciaVigente={l.ciencia_vigente}
              motivoCiencia={l.alerta_ciente_motivo}
            />
          ),
        },
        { id: 'acao', titulo: '', acao: true, className: 'w-32', celula: (l) => (ehParado(l) ? botaoCiencia(l, l.dias_sem_movimentacao) : null) },
      ];
      lista = linhas.length ? (
        <TabelaAgrupada
          rotulo={foco === 'atrasados' ? 'Atrasados' : 'Parados'}
          colunas={colunas}
          grupos={agruparLinhas<AlertaS>(linhas, (l) => (l.responsaveis.length ? l.responsaveis : [null]), ehAtrasado)}
          chaveDaLinha={(l) => l.servico_id}
          onAbrir={(l) => abrirServico(l.servico_id)}
        />
      ) : (
        <EmptyState icon={CircleCheck} title={foco === 'atrasados' ? 'Nada atrasado' : 'Nada parado'} description="Mude o indicador selecionado ou limpe os filtros." />
      );
    } else {
      const linhas = [...concluidos].sort((a, b) => b.data_termino.localeCompare(a.data_termino));
      const colunas: Coluna<Concluido>[] = [
        ...colBase<Concluido>((l) => l.descricao),
        ...(agrupar === 'pessoa' ? [] : [{ id: 'quem', titulo: 'Concluído por', celula: (l: Concluido) => l.terminado_por_nome ?? '—' } satisfies Coluna<Concluido>]),
        { id: 'termino', titulo: 'Término', className: 'w-28', celula: (l) => <span className="tabular-nums">{formatDate(l.data_termino)}</span> },
        { id: 'prazo', titulo: 'Prazo', className: 'w-32', celula: (l) => <ResultadoDoPrazo prazo={l.prazo} termino={l.data_termino} noPrazo={l.no_prazo} /> },
      ];
      lista = linhas.length ? (
        <TabelaAgrupada
          rotulo="Concluídos"
          colunas={colunas}
          grupos={agruparLinhas(linhas, (l) => [l.terminado_por_nome], (l) => l.no_prazo === false)}
          chaveDaLinha={(l) => l.servico_id}
          onAbrir={(l) => abrirServico(l.servico_id)}
        />
      ) : (
        <EmptyState icon={CircleCheck} title="Nada concluído no período" description="Mude o período no filtro Data para ver entregas anteriores." />
      );
    }
  }

  /* ── Quadro: um cartão por serviço, nas colunas da etapa ── */
  let quadro: React.ReactNode = null;
  if (vis === 'quadro') {
    const cartoes: CartaoServico[] = [];
    const incluir = (k: Foco) => !foco || foco === k;
    if (incluir('fila')) {
      fila.forEach((s) =>
        cartoes.push({
          chave: `f${s.servico_id}`,
          servicoId: s.servico_id,
          etapa: 'na_fila',
          catalogo: s.catalogo_nome,
          cliente: s.cliente_nome,
          os: s.ordem_servico_id,
          setorId: s.setor_id,
          setorNome: s.setor_nome,
          organiza: s.organiza,
          prioridade: s.prioridade,
          naFilaHaDias: s.na_fila_ha_dias,
          responsaveis: [],
          prazo: null,
          situacao: null,
        }),
      );
    }
    // O andamento vem por tarefa: junta as tarefas de cada serviço num cartão.
    const porServico = new Map<number, Tarefa[]>();
    andamento.forEach((t) => porServico.set(t.servico_id, [...(porServico.get(t.servico_id) ?? []), t]));
    porServico.forEach((ts, id) => {
      const a = alertaPorServico.get(id);
      if (foco === 'atrasados' && !(a && ehAtrasado(a))) return;
      if (foco === 'parados' && !(a && ehParado(a))) return;
      if (foco && !['andamento', 'atrasados', 'parados'].includes(foco)) return;
      const pior = [...ts].sort((x, y) => PESO_PRAZO[x.situacao_prazo] - PESO_PRAZO[y.situacao_prazo])[0];
      const prazo = ts.map((t) => t.prazo).filter(Boolean).sort().slice(-1)[0] ?? null;
      cartoes.push({
        chave: `a${id}`,
        servicoId: id,
        // Aproximação até o bloco `quadro/`: com alguma tarefa iniciada, "em execução"; senão, "distribuído".
        etapa: a?.etapa ?? (ts.some((t) => t.status === 'em_andamento') ? 'em_execucao' : 'distribuido'),
        catalogo: ts[0].catalogo_nome,
        cliente: ts[0].cliente_nome,
        os: ts[0].ordem_servico_id,
        setorId: ts[0].setor_id,
        setorNome: ts[0].setor_nome,
        organiza: ts[0].organiza,
        responsaveis: [...new Set(ts.map((t) => t.responsavel_nome ?? ''))].filter(Boolean),
        prazo,
        situacao: pior.situacao_prazo,
        alerta: a,
      });
    });
    if (incluir('concluidos')) {
      concluidos.forEach((c) =>
        cartoes.push({
          chave: `c${c.servico_id}`,
          servicoId: c.servico_id,
          etapa: 'concluido',
          catalogo: c.catalogo_nome,
          cliente: c.cliente_nome,
          os: c.ordem_servico_id,
          setorId: c.setor_id,
          setorNome: c.setor_nome,
          organiza: c.organiza,
          responsaveis: c.terminado_por_nome ? [c.terminado_por_nome] : [],
          prazo: c.prazo,
          situacao: null,
          concluido: c,
        }),
      );
    }
    const algumOrganiza = carregados.some((s) => s.organiza);
    const colunas: ColunaDoQuadro<CartaoServico>[] = (
      [
        { id: 'na_fila', titulo: 'Para distribuir', tom: 'warning' },
        { id: 'distribuido', titulo: 'Distribuído', tom: 'neutral', aceita: algumOrganiza, vazio: algumOrganiza ? 'Arraste um cartão da fila para cá para distribuir.' : undefined },
        { id: 'em_execucao', titulo: 'Em execução', tom: 'info' },
        { id: 'concluido', titulo: foco === 'concluidos' && intervalo ? 'Concluídos no período' : 'Concluídos no mês', tom: 'success' },
      ] as const
    )
      .map((c) => ({ ...c, itens: cartoes.filter((x) => x.etapa === c.id) }))
      .filter((c) => !foco || c.itens.length || (c.id === 'distribuido' && foco === 'fila' && algumOrganiza));

    quadro = (
      <Quadro
        rotulo="Quadro do setor"
        colunas={colunas}
        chave={(c) => c.chave}
        arrastavel={(c) => c.etapa === 'na_fila' && c.organiza}
        onSoltar={(_, chave) => {
          const s = fila.find((x) => `f${x.servico_id}` === chave);
          if (s) setDistribuir({ servico: paraDistribuir(s) });
        }}
        cartao={(c) => {
          const a = c.alerta;
          let rodape: React.ReactNode;
          if (c.etapa === 'na_fila') {
            const s = fila.find((x) => x.servico_id === c.servicoId)!;
            rodape = (
              <>
                <span className={cn('text-xs', (c.naFilaHaDias ?? 0) >= 5 ? 'text-warning-strong' : 'text-muted-foreground')}>
                  {c.naFilaHaDias ? `Na fila há ${c.naFilaHaDias} dia${c.naFilaHaDias === 1 ? '' : 's'}` : 'Chegou hoje'}
                </span>
                {c.organiza ? (
                  <Button size="sm" className="ml-auto h-7" onClick={() => setDistribuir({ servico: paraDistribuir(s) })}>
                    Distribuir
                  </Button>
                ) : null}
              </>
            );
          } else if (c.concluido) {
            rodape = (
              <>
                <span className="text-xs text-muted-foreground">{c.concluido.terminado_por_nome}</span>
                <span className="ml-auto">
                  <ResultadoDoPrazo prazo={c.concluido.prazo} termino={c.concluido.data_termino} noPrazo={c.concluido.no_prazo} />
                </span>
              </>
            );
          } else {
            rodape = (
              <>
                <AvatarStack nomes={c.responsaveis} max={3} />
                <Situacoes
                  prazo={c.prazo}
                  situacao={c.situacao}
                  emAlerta={a ? ehParado(a) : false}
                  diasSemMovimentacao={a?.dias_sem_movimentacao}
                  cienciaVigente={a?.ciencia_vigente}
                  motivoCiencia={a?.alerta_ciente_motivo}
                />
              </>
            );
          }
          return (
            <Cartao
              titulo={c.catalogo ?? 'Serviço'}
              os={c.os}
              cliente={c.cliente}
              detalhe={comSetor ? c.setorNome : undefined}
              atrasado={c.situacao === 'atrasado' || (a ? ehAtrasado(a) : false)}
              prioridadeAlta={c.prioridade === 'alta'}
              onAbrir={() => abrirServico(c.servicoId)}
              rodape={rodape}
            />
          );
        }}
      />
    );
    if (!cartoes.length && !carregandoTudo) quadro = <EmptyState icon={Inbox} title="Nada com estes filtros" description="Mude o indicador selecionado ou limpe os filtros." />;
  }

  /* ── Opções dos filtros ── */
  const clientes = [...new Set([...blocos.fila, ...blocos.andamento, ...blocos.alertas, ...blocos.concluidos].map((x) => x.cliente_nome))].sort();
  const opcoesAgrupar: Agrupar[] = ['nenhum', ...(foco === 'fila' ? [] : (['pessoa'] as Agrupar[])), 'os', 'cliente', ...(comSetor ? (['setor'] as Agrupar[]) : [])];
  const campoData = foco ? CAMPO_DATA[foco] : { prazo: 'Prazo' };
  const setorNomeFiltro = setorFiltro ? setores.find((s) => s.id === setorFiltro)?.nome : null;

  const chips = [
    ...(setorNomeFiltro ? [{ id: 'setor', texto: `Setor: ${setorNomeFiltro}` }] : []),
    ...(f.pessoa ? [{ id: 'pessoa', texto: `Pessoa: ${f.pessoa}` }] : []),
    ...(f.cliente ? [{ id: 'cliente', texto: `Cliente: ${f.cliente}` }] : []),
    ...(f.prioridade ? [{ id: 'prioridade', texto: `Prioridade: ${f.prioridade}` }] : []),
    ...(f.periodo ? [{ id: 'periodo', texto: `${Object.values(campoData)[0]}: ${rotuloDoPeriodo(f.periodo)}` }] : []),
    ...(f.busca ? [{ id: 'busca', texto: `Busca: “${f.busca}”` }] : []),
  ];
  const removerChip = (id: string) => {
    if (id === 'setor') return mudarParam('setor', null);
    muda(id === 'busca' ? { busca: '' } : ({ [id]: null } as Partial<Filtros>));
  };

  /* ── Visão geral: uma linha por setor ── */
  const porSetor = geral && !setorFiltro && (
    <div className="mb-4 overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm" aria-label="Resumo por setor">
        <thead>
          <tr className="h-10 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 text-left">Setor</th>
            {['Para distribuir', 'Em andamento', 'Atrasados', 'Parados', 'Concluídos no mês'].map((t) => (
              <th key={t} className="border-l border-border/70 px-3 text-right">
                {t}
              </th>
            ))}
            <th className="px-3" />
          </tr>
        </thead>
        <tbody>
          {setores.map((s) => {
            const deS = <T extends { setor_id: number }>(xs: T[]) => xs.filter((x) => x.setor_id === s.id);
            const vals: [number, string][] = [
              [deS(blocos.fila).length, 'text-warning-strong'],
              [new Set(deS(blocos.andamento).map((t) => t.servico_id)).size, ''],
              [deS(blocos.alertas).filter(ehAtrasado).length, 'text-danger-strong'],
              [deS(blocos.alertas).filter(ehParado).length, 'text-warning-strong'],
              [deS(blocos.concluidos).length, ''],
            ];
            return (
              <tr
                key={s.id}
                tabIndex={0}
                onClick={() => mudarParam('setor', String(s.id))}
                onKeyDown={(e) => e.key === 'Enter' && mudarParam('setor', String(s.id))}
                title={`Ver só ${s.nome}`}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 font-semibold">{s.nome}</td>
                {vals.map(([v, cor], i) => (
                  <td key={i} className={cn('border-l border-border/70 px-3 py-2.5 text-right tabular-nums', v ? cor : 'text-muted-foreground')}>
                    {blocos.carregando && !v ? '…' : v}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    Ver setor <ArrowRight className="size-3.5" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={geral ? 'Visão geral' : 'Painel do setor'}
        description={
          geral
            ? 'Todos os setores num lugar só: o que chegou, o que está com quem e o que precisa de atenção.'
            : 'O que chegou, o que está com quem e o que precisa de atenção.'
        }
        actions={
          !geral && setorDoPainel ? (
            setores.length > 1 ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Setor
                <select
                  value={setorDoPainel.id}
                  onChange={(e) => navigate(`/setor/${e.target.value}${params.toString() ? `?${params}` : ''}`)}
                  className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.na_fila} na fila)
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Network className="size-4" /> {setorDoPainel.nome}
              </span>
            )
          ) : null
        }
      />

      {setoresQ.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <Indicadores
            titulo={geral ? (setorNomeFiltro ? `Resumo de ${setorNomeFiltro}` : 'Resumo de todos os setores') : 'Resumo do setor'}
            itens={indicadores}
            ativo={foco}
            onEscolher={escolherFoco}
            alternavel={vis === 'quadro'}
          />
          {porSetor}
          <BarraDeFiltros>
            <AlternarVisualizacao valor={vis} onChange={mudarVis} />
            <SeparadorDeFiltros />
            {geral ? (
              <FiltroDropdown icone={Network} rotulo="Setor" valor={setorNomeFiltro} aberto={pop === 'setor'} onAberto={(o) => setPop(o ? 'setor' : null)}>
                <TituloDoFiltro>Setor</TituloDoFiltro>
                <OpcaoDeFiltro marcado={!setorFiltro} onClick={() => { mudarParam('setor', null); setPop(null); }}>
                  Todos os setores
                </OpcaoDeFiltro>
                {setores.map((s) => (
                  <OpcaoDeFiltro
                    key={s.id}
                    marcado={setorFiltro === s.id}
                    onClick={() => { mudarParam('setor', String(s.id)); setPop(null); }}
                    extra={`${s.na_fila} na fila${s.atrasados ? ` · ${s.atrasados} atras.` : ''}`}
                  >
                    {s.nome}
                  </OpcaoDeFiltro>
                ))}
              </FiltroDropdown>
            ) : null}
            <FiltroDropdown icone={User} rotulo="Pessoa" valor={f.pessoa?.split(' ')[0]} aberto={pop === 'pessoa'} onAberto={(o) => setPop(o ? 'pessoa' : null)} largura="w-80">
              <TituloDoFiltro>Responsável</TituloDoFiltro>
              <OpcaoDeFiltro marcado={!f.pessoa} onClick={() => muda({ pessoa: null })}>
                Todas as pessoas
              </OpcaoDeFiltro>
              {blocos.equipe.map((m) => (
                <OpcaoDeFiltro
                  key={m.usuario_id}
                  marcado={f.pessoa === m.nome}
                  onClick={() => muda({ pessoa: m.nome })}
                  extra={
                    <>
                      {m.ativos} ativo{m.ativos === 1 ? '' : 's'}
                      {m.atrasados ? <span className="text-danger-strong"> · {m.atrasados} atras.</span> : null}
                    </>
                  }
                >
                  {m.nome}
                </OpcaoDeFiltro>
              ))}
              <NotaDoFiltro>Itens ativos e atrasados de cada pessoa: a carga da equipe. A fila não tem responsável, então não muda.</NotaDoFiltro>
            </FiltroDropdown>
            <FiltroDropdown icone={Building2} rotulo="Cliente" valor={f.cliente?.split(' ').slice(0, 2).join(' ')} aberto={pop === 'cliente'} onAberto={(o) => setPop(o ? 'cliente' : null)} largura="w-72">
              <TituloDoFiltro>Cliente</TituloDoFiltro>
              <OpcaoDeFiltro marcado={!f.cliente} onClick={() => muda({ cliente: null })}>
                Todos os clientes
              </OpcaoDeFiltro>
              {clientes.map((c) => (
                <OpcaoDeFiltro key={c} marcado={f.cliente === c} onClick={() => muda({ cliente: c })}>
                  {c}
                </OpcaoDeFiltro>
              ))}
            </FiltroDropdown>
            {foco === 'fila' ? (
              <FiltroDropdown icone={ChevronsUp} rotulo="Prioridade" valor={f.prioridade ? { alta: 'Alta', media: 'Média', baixa: 'Baixa' }[f.prioridade] : null} aberto={pop === 'prioridade'} onAberto={(o) => setPop(o ? 'prioridade' : null)} largura="w-52">
                <TituloDoFiltro>Prioridade da venda</TituloDoFiltro>
                {[
                  [null, 'Todas'],
                  ['alta', 'Alta'],
                  ['media', 'Média'],
                  ['baixa', 'Baixa'],
                ].map(([v, t]) => (
                  <OpcaoDeFiltro key={t} marcado={f.prioridade === v} onClick={() => muda({ prioridade: v })}>
                    {t}
                  </OpcaoDeFiltro>
                ))}
              </FiltroDropdown>
            ) : null}
            <FiltroDePeriodo
              campos={campoData}
              campo={Object.keys(campoData)[0]}
              periodo={f.periodo}
              onChange={(_, periodo) => setFiltros((x) => ({ ...x, periodo }))}
              aberto={pop === 'data'}
              onAberto={(o) => setPop(o ? 'data' : null)}
            />
            {vis === 'lista' ? (
              <FiltroDropdown icone={Rows3} rotulo="Agrupar" valor={agrupar === 'nenhum' ? null : ROTULO_AGRUPAR[agrupar]} aberto={pop === 'agrupar'} onAberto={(o) => setPop(o ? 'agrupar' : null)} largura="w-60">
                <TituloDoFiltro>Agrupar</TituloDoFiltro>
                {opcoesAgrupar.map((a) => (
                  <OpcaoDeFiltro key={a} marcado={agrupar === a} onClick={() => muda({ agrupar: a })}>
                    {ROTULO_AGRUPAR[a]}
                  </OpcaoDeFiltro>
                ))}
                <NotaDoFiltro>Padrão: “Para distribuir” em ordem de chegada; andamento, atrasados e parados por pessoa.</NotaDoFiltro>
              </FiltroDropdown>
            ) : null}
            <EspacoDeFiltros />
            <BuscaDeFiltros valor={f.busca} onChange={(busca) => setFiltros((x) => ({ ...x, busca }))} placeholder="Buscar serviço, cliente ou OS" />
          </BarraDeFiltros>
          <ChipsDeFiltros itens={chips} onRemover={removerChip} onLimpar={() => { setFiltros({ ...FILTROS_VAZIOS, agrupar: f.agrupar }); if (setorFiltro) mudarParam('setor', null); }} />

          {blocos.erro && !carregandoTudo ? (
            <p className="mb-3 rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-strong">Parte das informações não carregou. Atualize a página para tentar de novo.</p>
          ) : null}
          {carregandoTudo ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : vis === 'lista' ? (
            lista
          ) : (
            quadro
          )}
        </>
      )}

      <DistribuirModal servico={distribuir?.servico ?? null} responsavelInicial={distribuir?.responsavel} onClose={() => setDistribuir(null)} />
      <CienciaModal servico={ciencia} onClose={() => setCiencia(null)} />
    </div>
  );
}
