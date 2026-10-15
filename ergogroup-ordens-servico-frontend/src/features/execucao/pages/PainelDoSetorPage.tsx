import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, Clock, Handshake, Hourglass, Inbox, Lock, MailCheck, Network, SquareArrowOutUpRight, UserPlus } from 'lucide-react';
import { CellTexto, DataTable, col, type DataTableColumn, type DataTableFacet, type DataTablePeriodFilter, type DataTableRowAction, type DataTableView } from '@/components/data-table';
import { EmptyState, PageHeader, PessoaChip } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { formatDate } from '@/lib/format';
import { diasAtras } from '@/lib/periodo';
import { cn } from '@/lib/utils';
import { NumeroOS } from '../components/Cabecalhos';
import { AcaoComIcone } from '../components/AcaoComIcone';
import { CienciaModal, type ServicoParaCiencia } from '../components/CienciaModal';
import { DistribuirModal, type ServicoParaDistribuir } from '../components/DistribuirModal';
import { NavegacaoDoMes } from '../components/NavegacaoDoMes';
import { intervaloDoMes, useMesDosConcluidos } from '../mesDosConcluidos';
import { Cartao, Quadro, type ColunaDoQuadro } from '../components/Quadro';
import { AndamentoDoServico, OutrosServicosEtiqueta, OutrosServicosResumo, ResultadoDoPrazo, Situacoes } from '../components/Situacoes';
import { useConfirmarRecebimentoDeServicos, useSetoresAcompanhados } from '../hooks';
import type { Alerta, Etapa, OutroServicoDaOS, SetorAcompanhado, SituacaoPrazo } from '../services';
import { useBlocosDoPainel, type BlocosDoPainel, type ComSetor } from '../useBlocosDoPainel';

/**
 * Painel do setor (`/setor/:setorId`) e Visão geral (`/visao-geral`, `setores.todos`): a mesma página,
 * no padrão de listagem (`DataTable`, docs/ui/design-system-tabelas.md).
 *
 * Revisão de 14/10/2026 (fluxos-e-navegacao.md §6.2.6 e §6.2.7): as abas são as etapas do serviço (ADR 0009),
 * sem sobreposição, a começar pelos novos; atrasados, parados e sem ciência viraram o filtro "Precisa de
 * atenção"; no quadro as abas somem e as colunas (as mesmas etapas) fazem o papel delas; os concluídos são
 * paginados por mês.
 */

type Visao = 'novos' | 'a_distribuir' | 'distribuidos' | 'em_andamento' | 'concluidos';
type Atencao = 'atrasado' | 'parado' | 'aguardando' | 'sem_ciencia' | 'novo_antigo';

/** Responsável que ainda não deu ciência da tarefa, e há quantos dias ela foi criada. */
interface SemCiencia {
  nome: string;
  dias: number;
}

/** Um serviço do painel, venha da fila, do andamento, dos alertas ou dos concluídos. */
interface LinhaDoPainel {
  chave: string;
  servicoId: number;
  etapa: Etapa;
  catalogo: string | null;
  descricao: string | null;
  cliente: string;
  os: number;
  vendidoPor: string | null;
  setorId: number;
  setorNome: string;
  organiza: boolean;
  prioridade: string | null;
  chegouHaDias: number | null;
  chegada: string | null;
  recebidoPor: string | null;
  recebidoEm: string | null;
  outros: OutroServicoDaOS[];
  responsaveis: string[];
  semCiencia: SemCiencia[];
  prazo: string | null;
  situacao: SituacaoPrazo | null;
  atrasado: boolean;
  parado: boolean;
  diasSemMovimentacao: number;
  cienciaVigente: boolean;
  motivoCiencia: string | null;
  cienciaAte: string | null;
  concluidoPor: string | null;
  termino: string | null;
  noPrazo: boolean | null;
}

const PESO_PRAZO: Record<SituacaoPrazo, number> = { atrasado: 0, vence_7_dias: 1, sem_prazo: 2, depois: 3 };
const ehParado = (a: Alerta) => a.motivos.includes('sem_movimentacao') && !a.ciencia_vigente;
const ehAtrasado = (a: Alerta) => a.motivos.includes('atrasado');
const FILA: Etapa[] = ['novo', 'a_distribuir'];
/** Um serviço novo há este tanto de dias já pede atenção. */
const DIAS_NOVO_ANTIGO = 3;

function montarLinhas(b: BlocosDoPainel): LinhaDoPainel[] {
  const alertaPor = new Map(b.alertas.map((a) => [a.servico_id, a]));
  const abertas = new Map<number, LinhaDoPainel>();
  type Origem = { servico_id: number; catalogo_nome: string | null; descricao: string | null; cliente_nome: string; ordem_servico_id: number; vendido_por_nome?: string | null } & ComSetor<object>;
  const base = (x: Origem): Omit<LinhaDoPainel, 'etapa'> => ({
    chave: String(x.servico_id),
    servicoId: x.servico_id,
    catalogo: x.catalogo_nome,
    descricao: x.descricao || null,
    cliente: x.cliente_nome,
    os: x.ordem_servico_id,
    vendidoPor: x.vendido_por_nome ?? null,
    setorId: x.setor_id,
    setorNome: x.setor_nome,
    organiza: x.organiza,
    prioridade: null,
    chegouHaDias: null,
    chegada: null,
    recebidoPor: null,
    recebidoEm: null,
    outros: [],
    responsaveis: [],
    semCiencia: [],
    prazo: null,
    situacao: null,
    atrasado: false,
    parado: false,
    diasSemMovimentacao: 0,
    cienciaVigente: false,
    motivoCiencia: null,
    cienciaAte: null,
    concluidoPor: null,
    termino: null,
    noPrazo: null,
  });

  b.fila.forEach((s) =>
    abertas.set(s.servico_id, {
      ...base(s),
      etapa: s.etapa,
      prioridade: s.prioridade,
      chegouHaDias: s.na_fila_ha_dias,
      chegada: diasAtras(s.na_fila_ha_dias),
      recebidoPor: s.recebido_por_nome ?? null,
      recebidoEm: s.recebido_em ?? null,
      outros: s.outros_servicos_da_os,
    }),
  );

  // O andamento vem por tarefa: junta as tarefas de cada serviço numa linha.
  const tarefasPor = new Map<number, typeof b.andamento>();
  b.andamento.forEach((t) => tarefasPor.set(t.servico_id, [...(tarefasPor.get(t.servico_id) ?? []), t]));
  tarefasPor.forEach((ts, id) => {
    const a = alertaPor.get(id);
    const pior = [...ts].sort((x, y) => PESO_PRAZO[x.situacao_prazo] - PESO_PRAZO[y.situacao_prazo])[0];
    abertas.set(id, {
      ...base(ts[0]),
      // O "o que será feito" é o do serviço (a `descricao` da linha é a da tarefa).
      descricao: ts[0].servico_descricao || null,
      etapa: a?.etapa ?? (ts.some((t) => t.status === 'em_andamento') ? 'em_execucao' : 'distribuido'),
      responsaveis: [...new Set(ts.map((t) => t.responsavel_nome ?? ''))].filter(Boolean),
      semCiencia: ts.filter((t) => t.etapa === 'nova').map((t) => ({ nome: t.responsavel_nome ?? 'Responsável', dias: t.atribuida_ha_dias })),
      prazo: ts.map((t) => t.prazo).filter(Boolean).sort().slice(-1)[0] ?? null,
      situacao: pior.situacao_prazo,
      diasSemMovimentacao: pior.servico_dias_sem_movimentacao,
      // A pausa explicada vem também nas linhas de tarefa (fora dos alertas, que só trazem os avisos ativos).
      cienciaVigente: ts[0].servico_ciencia_vigente,
      motivoCiencia: ts[0].servico_ciencia_motivo ?? null,
      cienciaAte: ts[0].servico_ciencia_ate ?? null,
    });
  });

  // Alertas de serviços que não vieram nos outros blocos.
  b.alertas.forEach((a) => {
    if (abertas.has(a.servico_id)) return;
    abertas.set(a.servico_id, {
      ...base(a),
      etapa: a.etapa,
      responsaveis: a.responsaveis,
      prazo: a.prazo,
      situacao: ehAtrasado(a) ? 'atrasado' : null,
    });
  });

  abertas.forEach((l) => {
    const a = alertaPor.get(l.servicoId);
    l.atrasado = l.situacao === 'atrasado' || (a ? ehAtrasado(a) : false);
    if (a) {
      l.parado = ehParado(a);
      l.diasSemMovimentacao = a.dias_sem_movimentacao;
      l.cienciaVigente = a.ciencia_vigente;
      l.motivoCiencia = a.alerta_ciente_motivo ?? null;
      l.cienciaAte = a.ciencia_ate ?? null;
    }
  });

  const concluidos: LinhaDoPainel[] = b.concluidos.map((c) => ({
    ...base(c),
    chave: `c${c.servico_id}`,
    etapa: 'concluido',
    responsaveis: c.terminado_por_nome ? [c.terminado_por_nome] : [],
    prazo: c.prazo,
    concluidoPor: c.terminado_por_nome,
    termino: c.data_termino,
    noPrazo: c.no_prazo,
  }));

  return [...abertas.values(), ...concluidos];
}

/** O que, na linha, pede a atenção de quem organiza o setor. Vale em qualquer aba. */
function atencaoDa(l: LinhaDoPainel): Atencao[] {
  if (l.etapa === 'concluido') return [];
  const motivos: Atencao[] = [];
  if (l.atrasado) motivos.push('atrasado');
  if (l.parado) motivos.push('parado');
  if (l.cienciaVigente) motivos.push('aguardando');
  if (l.semCiencia.length) motivos.push('sem_ciencia');
  if (l.etapa === 'novo' && (l.chegouHaDias ?? 0) >= DIAS_NOVO_ANTIGO) motivos.push('novo_antigo');
  return motivos;
}

const ATENCAO_OPCOES: { value: Atencao; label: string }[] = [
  { value: 'atrasado', label: 'Atrasados' },
  { value: 'parado', label: 'Sem andamento' },
  { value: 'aguardando', label: 'Aguardando algo' },
  { value: 'sem_ciencia', label: 'Sem ciência do técnico' },
  { value: 'novo_antigo', label: `Novos há ${DIAS_NOVO_ANTIGO} dias ou mais` },
];

/** Etapa de cada aba. As abas não se sobrepõem: cada serviço está em uma só. */
const ETAPAS_DA_VISAO: Record<Visao, Etapa[]> = {
  novos: ['novo'],
  a_distribuir: ['a_distribuir'],
  distribuidos: ['distribuido'],
  em_andamento: ['em_execucao'],
  concluidos: ['concluido'],
};

/** Colunas de cada aba (uma informação por coluna; a aba decide quais fazem sentido). */
const COLUNAS_DA_VISAO: Record<Visao, string[]> = {
  novos: ['servico', 'cliente', 'os', 'chegou_ha', 'prioridade', 'vendido_por', 'outros'],
  a_distribuir: ['servico', 'cliente', 'os', 'chegou_ha', 'recebido_por', 'prioridade', 'outros'],
  distribuidos: ['servico', 'cliente', 'os', 'responsaveis', 'ciencia_tecnico', 'prazo', 'movimentacao'],
  em_andamento: ['servico', 'cliente', 'os', 'responsaveis', 'prazo', 'movimentacao'],
  concluidos: ['servico', 'cliente', 'os', 'concluido_por', 'termino', 'resultado'],
};
const ORDEM_DA_VISAO: Record<Visao, { id: string; desc?: boolean }> = {
  novos: { id: 'chegou_ha', desc: true },
  a_distribuir: { id: 'chegou_ha', desc: true },
  distribuidos: { id: 'prazo' },
  em_andamento: { id: 'prazo' },
  concluidos: { id: 'termino', desc: true },
};
const VISAO_PADRAO: Visao = 'novos';

const PRAZO: DataTablePeriodFilter<LinhaDoPainel> = { id: 'prazo', label: 'Prazo', getDate: (l) => l.prazo, presets: ['prox7', 'semana', 'mes', 'mes_passado', 'personalizado'] };
const CHEGADA: DataTablePeriodFilter<LinhaDoPainel> = { id: 'chegada', label: 'Chegada ao setor', getDate: (l) => l.chegada };
const PERIODO_DA_VISAO: Record<Visao, DataTablePeriodFilter<LinhaDoPainel>[]> = {
  novos: [CHEGADA],
  a_distribuir: [CHEGADA],
  distribuidos: [PRAZO],
  em_andamento: [PRAZO],
  // Nos concluídos, o período é o mês (ou o período todo) escolhido na barra.
  concluidos: [],
};

const dias = (n: number) => (n === 0 ? 'hoje' : `há ${n} dia${n === 1 ? '' : 's'}`);

export default function PainelDoSetorPage({ geral = false }: { geral?: boolean }) {
  const navigate = useNavigate();
  const { setorId: setorParam } = useParams();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { podeAlguma } = usePermissoes();
  const veVendas = podeAlguma(['os.gerenciar', 'os.ver_todas']);
  const setoresQ = useSetoresAcompanhados();
  const confirmar = useConfirmarRecebimentoDeServicos();
  const [distribuir, setDistribuir] = useState<ServicoParaDistribuir | null>(null);
  const [ciencia, setCiencia] = useState<ServicoParaCiencia | null>(null);

  const setores = useMemo(() => setoresQ.data ?? [], [setoresQ.data]);
  const visaoParam = params.get('view') as Visao | null;
  const visao: Visao = visaoParam && visaoParam in COLUNAS_DA_VISAO ? visaoParam : VISAO_PADRAO;

  // Concluídos: o mês da URL (`?mes=2026-10` ou `?mes=todo`); sem ele, o mês atual.
  const { mes, mudarMes, rotulo: rotuloDoMesDaAba } = useMesDosConcluidos();

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

  const carregados = useMemo<SetorAcompanhado[]>(() => (geral ? setores : setorDoPainel ? [setorDoPainel] : []), [geral, setores, setorDoPainel]);
  const intervaloConcluidos = useMemo(() => intervaloDoMes(mes), [mes]);
  const blocos = useBlocosDoPainel(carregados, intervaloConcluidos);
  const linhas = useMemo(() => montarLinhas(blocos), [blocos]);

  const carregando = setoresQ.isLoading || (carregados.length > 0 && blocos.carregando && !linhas.length);
  const rotuloConcluidos = rotuloDoMesDaAba('Concluídos');

  /* ── Abas: as etapas do serviço ── */
  const views = useMemo<DataTableView<LinhaDoPainel>[]>(
    () =>
      (
        [
          ['novos', 'Novos'],
          ['a_distribuir', 'A distribuir'],
          ['distribuidos', 'Distribuídos'],
          ['em_andamento', 'Em andamento'],
          ['concluidos', rotuloConcluidos],
        ] as const
      ).map(([id, label]) => ({ id, label, filter: (l: LinhaDoPainel) => ETAPAS_DA_VISAO[id].includes(l.etapa) })),
    [rotuloConcluidos],
  );

  /* ── Colunas ── */
  const todasAsColunas = useMemo<DataTableColumn<LinhaDoPainel>[]>(
    () => [
      col.custom<LinhaDoPainel>('servico', 'Serviço', {
        accessor: (l) => l.catalogo ?? '',
        sortingFn: 'textPtBr',
        // Só o nome, em caixa alta; o "o que será feito" fica no detalhe do serviço (e no title).
        cell: (l) => (
          <span className="block max-w-72 truncate font-semibold uppercase" title={[l.catalogo, l.descricao].filter(Boolean).join(' — ') || undefined}>
            {l.catalogo ?? 'Serviço'}
          </span>
        ),
      }),
      col.custom<LinhaDoPainel>('cliente', 'Cliente', { accessor: (l) => l.cliente, sortingFn: 'textPtBr', cell: (l) => <CellTexto value={l.cliente} className="max-w-[28rem] font-medium text-foreground" /> }),
      col.custom<LinhaDoPainel>('os', 'OS', { accessor: (l) => l.os, width: '80px', cell: (l) => <NumeroOS os={l.os} veVendas={veVendas} /> }),
      col.custom<LinhaDoPainel>('responsaveis', 'Responsável', {
        accessor: (l) => l.responsaveis.join(', '),
        sortingFn: 'textPtBr',
        // Nome completo; com mais de uma pessoa, a primeira e "+N" (todas no title).
        cell: (l) =>
          l.responsaveis.length ? (
            <span className="flex max-w-56 items-center gap-1.5" title={l.responsaveis.join(', ')}>
              <PessoaChip nome={l.responsaveis[0]} variant="full" className="min-w-0 truncate" />
              {l.responsaveis.length > 1 ? <span className="shrink-0 rounded bg-muted px-1.5 text-xs tabular-nums">+{l.responsaveis.length - 1}</span> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      col.custom<LinhaDoPainel>('ciencia_tecnico', 'Ciência do técnico', {
        accessor: (l) => (l.semCiencia.length ? Math.max(...l.semCiencia.map((s) => s.dias)) : -1),
        width: '200px',
        cell: (l) =>
          l.semCiencia.length ? (
            <span className="grid" title={l.semCiencia.map((s) => `${s.nome}: aguardando ${dias(s.dias)}`).join('\n')}>
              <span className="font-medium text-warning-strong">Aguardando {dias(Math.max(...l.semCiencia.map((s) => s.dias)))}</span>
              <span className="truncate text-xs text-muted-foreground">
                {l.semCiencia[0].nome}
                {l.semCiencia.length > 1 ? ` e mais ${l.semCiencia.length - 1}` : ''}
              </span>
            </span>
          ) : l.responsaveis.length ? (
            <span className="text-muted-foreground">Ciente</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      col.prazo<LinhaDoPainel>('prazo', 'Prazo', (l) => l.prazo, { encerrado: (l) => l.etapa === 'concluido' }),
      col.custom<LinhaDoPainel>('movimentacao', 'Andamento', {
        accessor: (l) => (FILA.includes(l.etapa) || l.etapa === 'concluido' ? undefined : l.diasSemMovimentacao),
        width: '230px',
        cell: (l) =>
          FILA.includes(l.etapa) || l.etapa === 'concluido' ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <AndamentoDoServico dias={l.diasSemMovimentacao} emAlerta={l.parado} cienciaVigente={l.cienciaVigente} motivo={l.motivoCiencia} ate={l.cienciaAte} />
          ),
      }),
      col.custom<LinhaDoPainel>('chegou_ha', 'Chegou há', {
        accessor: (l) => l.chegouHaDias,
        width: '120px',
        cell: (l) =>
          l.chegouHaDias == null ? null : (
            <span
              className={cn('tabular-nums', l.etapa === 'novo' && l.chegouHaDias >= DIAS_NOVO_ANTIGO && 'font-medium text-warning-strong')}
              title={l.chegada ? `Chegou ao setor em ${formatDate(l.chegada)}` : undefined}
            >
              {l.chegouHaDias === 0 ? 'Hoje' : `${l.chegouHaDias} dia${l.chegouHaDias === 1 ? '' : 's'}`}
            </span>
          ),
      }),
      col.custom<LinhaDoPainel>('recebido_por', 'Recebido por', {
        accessor: (l) => l.recebidoPor ?? '',
        sortingFn: 'textPtBr',
        cell: (l) =>
          l.recebidoPor ? (
            <span title={l.recebidoEm ? `Em ${formatDate(l.recebidoEm)}` : undefined}>
              <PessoaChip nome={l.recebidoPor} variant="full" className="max-w-48 truncate" />
            </span>
          ) : (
            <span className="text-muted-foreground">{l.recebidoEm ? `Em ${formatDate(l.recebidoEm)}` : '—'}</span>
          ),
      }),
      col.prioridade<LinhaDoPainel>('prioridade', 'Prioridade', (l) => l.prioridade),
      col.custom<LinhaDoPainel>('vendido_por', 'Vendido por', {
        accessor: (l) => l.vendidoPor ?? '',
        sortingFn: 'textPtBr',
        priority: 2,
        cell: (l) => <PessoaChip nome={l.vendidoPor} variant="full" className="max-w-48 truncate" />,
      }),
      col.custom<LinhaDoPainel>('outros', 'Outros na OS', {
        accessor: (l) => l.outros.length,
        width: '130px',
        priority: 2,
        cell: (l) => <OutrosServicosEtiqueta itens={l.outros} />,
      }),
      col.custom<LinhaDoPainel>('concluido_por', 'Concluído por', {
        accessor: (l) => l.concluidoPor ?? '',
        sortingFn: 'textPtBr',
        cell: (l) => <PessoaChip nome={l.concluidoPor} variant="full" className="max-w-48 truncate" />,
      }),
      col.data<LinhaDoPainel>('termino', 'Término', (l) => l.termino),
      col.custom<LinhaDoPainel>('resultado', 'No prazo?', {
        accessor: (l) => (l.noPrazo == null ? undefined : l.noPrazo ? 0 : 1),
        width: '140px',
        cell: (l) => (l.termino ? <ResultadoDoPrazo prazo={l.prazo} termino={l.termino} noPrazo={l.noPrazo} /> : null),
      }),
    ],
    [veVendas],
  );
  const colunas = useMemo(() => COLUNAS_DA_VISAO[visao].map((id) => todasAsColunas.find((c) => c.id === id)!), [visao, todasAsColunas]);

  /* ── Filtros: "Precisa de atenção" cruza com qualquer aba ── */
  // No quadro valem só os filtros que fazem sentido em todas as colunas (sem prioridade nem datas).
  const filtrosDoQuadro = useMemo<DataTableFacet<LinhaDoPainel>[]>(
    () => [
      ...(geral
        ? [{ columnId: 'setor', label: 'Setor', getValue: (l: LinhaDoPainel) => String(l.setorId), options: setores.map((s) => ({ value: String(s.id), label: s.nome })) }]
        : []),
      { columnId: 'atencao', label: 'Precisa de atenção', getValue: atencaoDa, options: ATENCAO_OPCOES },
      { columnId: 'pessoa', label: 'Pessoa', getValue: (l) => l.responsaveis, searchable: true },
      { columnId: 'cliente', label: 'Cliente', getValue: (l) => l.cliente, searchable: true },
    ],
    [geral, setores],
  );
  const facets = useMemo<DataTableFacet<LinhaDoPainel>[]>(
    () => [
      ...filtrosDoQuadro.filter((f) => f.columnId !== 'atencao' || visao !== 'concluidos'),
      ...(FILA.some((e) => ETAPAS_DA_VISAO[visao].includes(e)) ? [{ columnId: 'prioridade', label: 'Prioridade' }] : []),
    ],
    [filtrosDoQuadro, visao],
  );

  /* ── Ações ── */
  const paraDistribuir = (l: LinhaDoPainel): ServicoParaDistribuir => ({
    id: l.servicoId,
    catalogo: l.catalogo,
    cliente: l.cliente,
    ordemServicoId: l.os,
    setorId: l.setorId,
    setorNome: l.setorNome,
    novo: l.etapa === 'novo',
  });
  const confirmarRecebimento = (itens: LinhaDoPainel[]) =>
    confirmar.mutate(
      itens.map((l) => l.servicoId),
      {
        onSuccess: (r) =>
          toast({
            title: r.recebidos.length === 1 ? 'Recebimento confirmado' : `${r.recebidos.length} recebimentos confirmados`,
            description: itens.length === 1 ? `${itens[0].catalogo ?? 'Serviço'} passou para A distribuir.` : 'Os serviços passaram para A distribuir.',
          }),
        onError: (e) => toast({ variant: 'destructive', title: 'Não foi possível confirmar o recebimento', description: mensagemDeErro(e, 'Tente de novo.') }),
      },
    );
  const novosQueOrganizo = linhas.filter((l) => l.etapa === 'novo' && l.organiza);

  const explicarPausa = (l: LinhaDoPainel) =>
    setCiencia({
      id: l.servicoId,
      catalogo: l.catalogo,
      cliente: l.cliente,
      diasSemMovimentacao: l.diasSemMovimentacao,
      ordemServicoId: l.os,
      responsaveis: l.responsaveis,
      prazo: l.prazo,
    });
  const acaoComIcone = (rotulo: string, icone: typeof UserPlus, onClick: () => void, opcoes: { desabilitado?: boolean } = {}) => (
    <AcaoComIcone rotulo={rotulo} icone={icone} onClick={onClick} desabilitado={opcoes.desabilitado} />
  );
  /**
   * Num serviço novo: só confirmar o recebimento, ou confirmar e distribuir num clique (distribuir confirma junto).
   * Na tabela, só ícones; no cartão do quadro, "Confirmar e distribuir" com o texto.
   */
  const acoesDoNovo = (l: LinhaDoPainel, noCartao = false) =>
    noCartao ? (
      <Button size="sm" variant="outline" className="h-8 gap-1.5" title="Confirmar o recebimento e já escolher o responsável" onClick={() => setDistribuir(paraDistribuir(l))}>
        <UserPlus className="size-3.5" /> Confirmar e distribuir
      </Button>
    ) : (
      <span className="inline-flex items-center gap-1">
        {acaoComIcone('Confirmar o recebimento', MailCheck, () => confirmarRecebimento([l]), { desabilitado: confirmar.isPending })}
        {acaoComIcone('Confirmar e distribuir', UserPlus, () => setDistribuir(paraDistribuir(l)))}
      </span>
    );
  const acaoDaLinha = (l: LinhaDoPainel) => {
    if (l.etapa === 'novo' && l.organiza) return acoesDoNovo(l);
    if (l.etapa === 'a_distribuir' && l.organiza) {
      return acaoComIcone('Distribuir', UserPlus, () => setDistribuir(paraDistribuir(l)));
    }
    if (l.parado) {
      return acaoComIcone('Explicar a pausa: o serviço está sem andamento', Hourglass, () => explicarPausa(l));
    }
    return null;
  };
  const acoesDoMenu = (l: LinhaDoPainel): DataTableRowAction<LinhaDoPainel>[] => [
    { label: 'Abrir o serviço', icon: SquareArrowOutUpRight, onSelect: () => navigate(`/servicos/${l.servicoId}`) },
    ...(veVendas ? [{ label: 'Abrir a venda', icon: Handshake, onSelect: () => navigate(`/vendas/${l.os}`) }] : []),
  ];

  const acoesDaBarra = visao === 'concluidos' ? <NavegacaoDoMes mes={mes} onMudar={mudarMes} /> : null;
  // A ação em lote fica na linha das abas, ao lado de "Novos", e não disputa espaço com os filtros.
  const acoesDaAba =
    visao === 'novos' && novosQueOrganizo.length > 1 ? (
      <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={confirmar.isPending} onClick={() => confirmarRecebimento(novosQueOrganizo)}>
        <MailCheck className="size-4" /> Confirmar todos ({novosQueOrganizo.length})
      </Button>
    ) : null;

  /* ── Quadro: as colunas são as etapas (no quadro, as abas somem) ── */
  const algumOrganiza = carregados.some((s) => s.organiza);
  const quadro = (itens: LinhaDoPainel[]) => {
    const colunasQ: ColunaDoQuadro<LinhaDoPainel>[] = (
      [
        { id: 'novo', titulo: 'Novos', tom: 'warning', vazio: 'Nada chegou sem ciência.' },
        {
          id: 'a_distribuir',
          titulo: 'A distribuir',
          tom: 'warning',
          aceita: algumOrganiza,
          vazio: algumOrganiza ? 'Arraste um novo para cá para confirmar o recebimento.' : undefined,
        },
        {
          id: 'distribuido',
          titulo: 'Distribuídos',
          tom: 'neutral',
          aceita: algumOrganiza,
          vazio: algumOrganiza ? 'Arraste um serviço para cá para distribuir.' : undefined,
        },
        { id: 'em_execucao', titulo: 'Em andamento', tom: 'info' },
        {
          id: 'concluido',
          titulo: 'Concluídos',
          tom: 'success',
          cabecalho: <NavegacaoDoMes mes={mes} onMudar={mudarMes} compacto />,
          vazio: 'Nada concluído no período.',
        },
      ] as const
    ).map((c) => ({ ...c, itens: itens.filter((x) => x.etapa === c.id) }));
    return (
      <Quadro
        rotulo="Quadro do setor"
        larguraMinima="15rem"
        colunas={colunasQ}
        chave={(l) => l.chave}
        arrastavel={(l) => FILA.includes(l.etapa) && l.organiza}
        onSoltar={(colunaId, chave) => {
          const l = itens.find((x) => x.chave === chave);
          if (!l) return;
          if (colunaId === 'a_distribuir' && l.etapa === 'novo') confirmarRecebimento([l]);
          if (colunaId === 'distribuido') setDistribuir(paraDistribuir(l));
        }}
        cartao={(l) => {
          const naFila = FILA.includes(l.etapa);
          const concluido = l.etapa === 'concluido' && !!l.termino;
          const chegou = l.chegouHaDias ?? 0;
          return (
            <Cartao
              titulo={l.catalogo ?? 'Serviço'}
              descricao={l.descricao}
              os={l.os}
              cliente={l.cliente}
              setor={geral ? l.setorNome : null}
              prioridade={l.prioridade}
              tom={concluido ? null : l.atrasado ? 'danger' : l.parado || (l.etapa === 'novo' && chegou >= DIAS_NOVO_ANTIGO) ? 'warning' : null}
              situacao={
                concluido ? (
                  <ResultadoDoPrazo prazo={l.prazo} termino={l.termino!} noPrazo={l.noPrazo} />
                ) : !naFila && (l.situacao || l.parado || l.cienciaVigente) ? (
                  <Situacoes
                    prazo={l.prazo}
                    situacao={l.situacao}
                    emAlerta={l.parado}
                    diasSemMovimentacao={l.diasSemMovimentacao}
                    cienciaVigente={l.cienciaVigente}
                    motivoCiencia={l.motivoCiencia}
                    cienciaAte={l.cienciaAte}
                  />
                ) : null
              }
              tempo={
                l.etapa === 'novo' ? (
                  <span className={cn('inline-flex items-center gap-1', chegou >= DIAS_NOVO_ANTIGO && 'font-medium text-warning-strong')}>
                    <Clock className="size-3.5" aria-hidden />
                    {chegou ? `Chegou há ${chegou} dia${chegou === 1 ? '' : 's'}` : 'Chegou hoje'}
                  </span>
                ) : l.etapa === 'a_distribuir' ? (
                  <span className="inline-flex items-center gap-1">
                    <MailCheck className="size-3.5" aria-hidden />
                    {l.recebidoPor ? `Recebido por ${l.recebidoPor}` : 'Recebido'}
                  </span>
                ) : l.semCiencia.length ? (
                  <span className="inline-flex items-center gap-1 font-medium text-warning-strong">
                    <Clock className="size-3.5" aria-hidden />
                    Sem ciência {dias(Math.max(...l.semCiencia.map((s) => s.dias)))}
                  </span>
                ) : concluido ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="size-3.5" aria-hidden />
                    Concluído em {formatDate(l.termino)}
                  </span>
                ) : null
              }
              extra={naFila ? <OutrosServicosResumo itens={l.outros} /> : null}
              pessoas={l.responsaveis}
              semPessoas={l.etapa === 'a_distribuir' ? 'Sem responsável' : undefined}
              acao={
                l.etapa === 'novo' && l.organiza ? (
                  acoesDoNovo(l, true)
                ) : l.etapa === 'a_distribuir' && l.organiza ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setDistribuir(paraDistribuir(l))}>
                    <UserPlus className="size-3.5" /> Distribuir
                  </Button>
                ) : (
                  acaoDaLinha(l)
                )
              }
              onAbrir={() => navigate(`/servicos/${l.servicoId}`)}
            />
          );
        }}
      />
    );
  };

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
                      {s.nome} ({s.novos} novo{s.novos === 1 ? '' : 's'})
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

      {blocos.erro && !carregando ? (
        <p className="mb-3 rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-strong">Parte das informações não carregou. Atualize a página para tentar de novo.</p>
      ) : null}

      <DataTable
        id={geral ? 'visao-geral' : 'painel-setor'}
        data={carregando ? undefined : linhas}
        columns={colunas}
        getRowId={(l) => l.chave}
        getRowHref={(l) => `/servicos/${l.servicoId}`}
        views={views}
        defaultView={VISAO_PADRAO}
        search={{ placeholder: 'Buscar serviço, cliente ou OS', fields: (l) => [l.catalogo, l.descricao, l.cliente, l.os, `OS ${l.os}`, ...l.responsaveis] }}
        facets={facets}
        periodFilter={PERIODO_DA_VISAO[visao]}
        defaultSort={ORDEM_DA_VISAO[visao]}
        renderRowAction={acaoDaLinha}
        rowActions={acoesDoMenu}
        actionsColumn={{ header: 'Ações', width: '116px' }}
        toolbarActions={acoesDaBarra}
        viewsActions={acoesDaAba}
        renderBoard={quadro}
        boardReplacesViews={{ facets: filtrosDoQuadro, periodFilter: [] }}
        isLoading={carregando}
        isFetching={blocos.carregando && !carregando}
        emptyStates={{
          noData: {
            icon: Inbox,
            title: 'Nenhum serviço por aqui',
            description: 'Os serviços vendidos aparecem aqui quando chegam ao setor.',
          },
        }}
      />

      <DistribuirModal servico={distribuir} onClose={() => setDistribuir(null)} />
      <CienciaModal servico={ciencia} onClose={() => setCiencia(null)} />
    </div>
  );
}
