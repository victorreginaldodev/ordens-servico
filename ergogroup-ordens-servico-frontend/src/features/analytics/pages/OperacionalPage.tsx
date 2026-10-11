import { useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useUsers } from '@/features/time/hooks';
import { descreverVinculos } from '@/lib/permissoes';
import { MONTHS } from '../constants';
import { useAnaliseOperacional } from '../hooks';
import type {
  BlocoCumprimentoPrazo,
  MesTotal,
  TecnicoProdutividadeItem,
  TempoPorCatalogoItem,
} from '../services';

// ── Formatação ────────────────────────────────────────────────────────────────

const nf = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('pt-BR'));
const dec = (n: number | null | undefined) =>
  n == null ? null : n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (n: number | null | undefined) =>
  n == null ? null : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const mesLabel = (m: MesTotal) => MONTHS[Math.max(0, Math.min(11, m.mes - 1))];

// ── Natureza do dado ─────────────────────────────────────────────────────────

type Natureza = 'hist' | 'mes' | 'agora';

const NATUREZA: Record<Natureza, { label: string; dot: string; text: string; pulse?: boolean }> = {
  hist:  { label: 'Histórico', dot: 'bg-slate-400', text: 'text-muted-foreground' },
  mes:   { label: 'Mês atual', dot: 'bg-teal-500', text: 'text-primary' },
  agora: { label: 'Agora', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', pulse: true },
};

function NatureTag({ nat }: { nat: Natureza }) {
  const n = NATUREZA[nat];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.05em]', n.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', n.dot, n.pulse && 'animate-pulse')} />
      {n.label}
    </span>
  );
}

function SemBaseBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-md border border-dashed border-muted-foreground/40 font-bold uppercase tracking-[0.03em] text-muted-foreground',
        small ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]',
      )}
    >
      Sem base
    </span>
  );
}

function LoadMoreButton({ total, visible, onClick, bordered = true }: { total: number; visible: number; onClick: () => void; bordered?: boolean }) {
  if (visible >= total) return null;
  const restante = total - visible;
  return (
    <div className={cn('flex justify-center pt-3.5', bordered && 'border-t border-border')}>
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-border px-4 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        Carregar mais ({nf(Math.min(PAGE_SIZE, restante))} de {nf(restante)} restantes)
      </button>
    </div>
  );
}

// ── Delta mês atual vs anterior ───────────────────────────────────────────────

function DeltaBadge({ atual, anterior, goodUp }: { atual: number; anterior: number; goodUp: boolean | null }) {
  const d = atual - anterior;
  const Icon = d > 0 ? ArrowUp : d < 0 ? ArrowDown : ArrowRight;
  let color = 'text-muted-foreground';
  if (goodUp != null && d !== 0) {
    const good = goodUp ? d > 0 : d < 0;
    color = good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('inline-flex items-center gap-0.5 text-xs font-bold tabular-nums', color)}>
        <Icon className="h-3 w-3" strokeWidth={2.6} />
        {nf(Math.abs(d))}
      </span>
      <span className="text-[11.5px] font-medium text-muted-foreground">
        vs. {nf(anterior)} no mês anterior
      </span>
    </div>
  );
}

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_HSL: Record<string, string> = {
  aberta:       'hsl(0 78% 58%)',
  aberto:       'hsl(0 78% 58%)',
  em_andamento: 'hsl(42 92% 50%)',
  concluida:    'hsl(142 68% 42%)',
  cancelada:    'hsl(215 15% 62%)',
  cancelado:    'hsl(215 15% 62%)',
};

// ── Card base ─────────────────────────────────────────────────────────────────

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgba(15,23,42,0.05)]', className)}>
      {children}
    </div>
  );
}

function PanelHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-[22px] py-4">
      <div>
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ── Ring gauge (conic-gradient) ───────────────────────────────────────────────

function RingGauge({ value, color }: { value: number | null; color: string }) {
  const deg = value == null ? 0 : Math.round((Math.min(Math.max(value, 0), 100) / 100) * 360);
  const mask = 'radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))';
  return (
    <div className="relative h-[78px] w-[78px] shrink-0">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${color} ${deg}deg, hsl(var(--muted)) ${deg}deg)`,
          WebkitMask: mask,
          mask,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-foreground">
        {value == null ? '—' : pct(value)}
      </div>
    </div>
  );
}

// ── Barras de fluxo mensal ────────────────────────────────────────────────────

function MonthlyFlow({ abertas, concluidas }: { abertas: MesTotal[]; concluidas: MesTotal[] }) {
  const concluidasPorChave = new Map(concluidas.map((m) => [`${m.ano}-${m.mes}`, m.total]));
  const meses = abertas.map((m) => ({
    label: mesLabel(m),
    abertas: m.total,
    concluidas: concluidasPorChave.get(`${m.ano}-${m.mes}`) ?? 0,
  }));
  const max = Math.max(1, ...meses.flatMap((m) => [m.abertas, m.concluidas]));

  if (!meses.length) {
    return <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Sem histórico de OS para exibir.</div>;
  }

  return (
    <div className="flex h-[180px] items-end gap-3">
      {meses.map((m) => (
        <div key={m.label + m.abertas} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            <div
              title={`Abertas: ${nf(m.abertas)}`}
              className="w-3 min-h-[3px] rounded-t-[5px] bg-slate-300 dark:bg-slate-600"
              style={{ height: `${Math.round((m.abertas / max) * 100)}%` }}
            />
            <div
              title={`Concluídas: ${nf(m.concluidas)}`}
              className="w-3 min-h-[3px] rounded-t-[5px] bg-primary"
              style={{ height: `${Math.round((m.concluidas / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Bloco de status (barra segmentada + legenda) ──────────────────────────────

function StatusBlock({ kind, tagClass, items }: { kind: string; tagClass: string; items: { status: string; status_display: string; total: number }[] }) {
  const total = items.reduce((a, x) => a + x.total, 0);
  return (
    <Panel>
      <div className="flex items-center gap-2.5 border-b border-border px-[22px] py-4">
        <span className={cn('rounded-[7px] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.03em]', tagClass)}>{kind}</span>
        <h3 className="text-[15px] font-bold text-foreground">Por status</h3>
        <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{nf(total)} no total</span>
      </div>
      <div className="flex flex-col gap-4 px-[22px] py-5">
        {total > 0 ? (
          <>
            <div className="flex h-3.5 overflow-hidden rounded-[7px] bg-muted">
              {items.map((s) => (
                <div
                  key={s.status}
                  title={s.status_display}
                  style={{ width: `${(s.total / total) * 100}%`, background: STATUS_HSL[s.status] ?? 'hsl(215 15% 58%)' }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {items.map((s) => (
                <div key={s.status} className="flex items-center gap-2">
                  <span className="h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: STATUS_HSL[s.status] ?? 'hsl(215 15% 58%)' }} />
                  <span className="flex-1 text-[12.5px] font-medium text-muted-foreground">{s.status_display}</span>
                  <span className="text-[12.5px] font-bold tabular-nums text-foreground">{nf(s.total)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum status disponível.</p>
        )}
      </div>
    </Panel>
  );
}

// ── Cumprimento de prazo ─────────────────────────────────────────────────────

function PrazoCard({ label, bloco, color }: { label: string; bloco: BlocoCumprimentoPrazo; color: string }) {
  const isNull = bloco.percentual == null;
  return (
    <div className="flex items-center gap-[18px] rounded-xl border border-border px-[18px] py-4">
      <RingGauge value={bloco.percentual} color={color} />
      <div className="flex-1">
        <div className="inline-flex items-center gap-2">
          <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: color }} />
          <span className="text-sm font-bold text-foreground">{label}</span>
        </div>
        <p className="mt-1 text-[12.5px] font-medium tabular-nums text-muted-foreground">
          {nf(bloco.no_prazo)} de {nf(bloco.total_com_prazo)} com prazo
        </p>
        {isNull && <div className="mt-1.5"><SemBaseBadge small /></div>}
      </div>
    </div>
  );
}

// ── Card de técnico ──────────────────────────────────────────────────────────

const AVA_COLORS = ['173 55% 40%', '280 55% 56%', '210 70% 52%', '32 85% 50%', '340 60% 55%', '150 50% 42%'];
const avaColor = (id: number) => `hsl(${AVA_COLORS[id % AVA_COLORS.length]})`;
const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function PrazoBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const isNull = value == null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[12.5px] font-semibold text-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-[5px] bg-muted">
        <div className="h-full rounded-[5px]" style={{ width: isNull ? 0 : `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className={cn('w-[52px] text-right text-[13px] font-bold tabular-nums', isNull ? 'text-[10px] uppercase text-muted-foreground' : 'text-foreground')}>
        {isNull ? 's/ base' : pct(value)}
      </span>
    </div>
  );
}

function TecnicoCard({ tecnico, cargo, isOwn, highlight }: { tecnico: TecnicoProdutividadeItem; cargo: string; isOwn: boolean; highlight: boolean }) {
  const nome = tecnico.tecnico_nome ?? `Técnico #${tecnico.tecnico_id}`;

  const hist = [
    { k: 'Tarefas concl.', v: nf(tecnico.tarefas_concluidas), cls: 'text-foreground' },
    { k: 'OS Op. concl.', v: nf(tecnico.mini_os_concluidas), cls: 'text-foreground' },
    {
      k: 'Tempo médio',
      v: tecnico.tempo_medio_tarefa_dias == null ? '—' : `${dec(tecnico.tempo_medio_tarefa_dias)}d`,
      cls: tecnico.tempo_medio_tarefa_dias == null ? 'text-muted-foreground' : 'text-foreground',
    },
  ];

  const agora = [
    {
      label: 'Tarefas', dot: 'hsl(210 70% 52%)', labelCls: 'text-blue-600 dark:text-blue-400',
      aberto: tecnico.tarefas_em_aberto, atras: tecnico.tarefas_atrasadas, alta: tecnico.tarefas_alta_prioridade_abertas,
    },
    {
      label: 'OS Op.', dot: 'hsl(280 55% 58%)', labelCls: 'text-purple-600 dark:text-purple-400',
      aberto: tecnico.mini_os_em_aberto, atras: tecnico.mini_os_atrasadas, alta: tecnico.mini_os_alta_prioridade_abertas,
    },
  ];

  return (
    <Panel className={cn(highlight && 'border-primary/60')}>
      {/* Identidade + histórico */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-[22px] py-4">
        <div className="flex min-w-[190px] items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-[15px] font-bold text-white"
            style={{ background: avaColor(tecnico.tecnico_id) }}
          >
            {initials(nome)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-foreground">{nome}</span>
              {isOwn && (
                <span className="rounded-md bg-primary/[0.13] px-[7px] py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary">
                  Você
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-muted-foreground">{cargo}</div>
          </div>
        </div>
        <div className="grid min-w-[280px] flex-1 grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3">
          {hist.map((h) => (
            <div key={h.k} className="flex flex-col gap-[3px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted-foreground">{h.k}</span>
              <span className={cn('text-[17px] font-extrabold leading-[1.1] tabular-nums', h.cls)}>{h.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prazo + carga atual */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col gap-3 border-b border-border px-[22px] py-4 lg:border-b-0 lg:border-r">
          <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Cumprimento de prazo</span>
          <PrazoBar label="Tarefa" value={tecnico.taxa_cumprimento_prazo_tarefas} color="hsl(210 70% 52%)" />
          <PrazoBar label="OS Op." value={tecnico.taxa_cumprimento_prazo_minios} color="hsl(280 55% 58%)" />
        </div>
        <div className="flex flex-col gap-3 bg-amber-500/[0.06] px-[22px] py-4 dark:bg-amber-900/20">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Carga atual · agora
          </span>
          <div className="grid grid-cols-[110px_1fr_1fr_1fr] items-center gap-x-2.5 gap-y-2">
            <span />
            <span className="text-center text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Em aberto</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Atrasadas</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Alta prio.</span>
            {agora.map((a) => (
              <div key={a.label} className="contents">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold', a.labelCls)}>
                  <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: a.dot }} />
                  {a.label}
                </span>
                <span className="text-center text-[15px] font-bold tabular-nums text-foreground">{nf(a.aberto)}</span>
                <span className={cn('text-center text-[15px] font-bold tabular-nums', a.atras > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                  {nf(a.atras)}
                </span>
                <span className={cn('text-center text-[15px] font-bold tabular-nums', a.alta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                  {nf(a.alta)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

const DIST_COLORS = ['hsl(173 60% 42%)', 'hsl(160 55% 44%)', 'hsl(42 90% 50%)', 'hsl(24 85% 55%)', 'hsl(0 78% 58%)'];
const PAGE_SIZE = 10;

const OperacionalPage = () => {
  const { data, isLoading, isError } = useAnaliseOperacional();
  const { data: usuarios = [] } = useUsers();
  // Quem não acompanha setor nem vê todas as OS vê só a própria linha de produtividade.
  const isTechnician = !usePermissoes().podeAlguma(['os.ver_todas', 'servicos.ver_setor']);
  const [catTab, setCatTab] = useState<'servico' | 'oso'>('servico');
  const [principaisCount, setPrincipaisCount] = useState(PAGE_SIZE);
  const [catalogoCount, setCatalogoCount] = useState(PAGE_SIZE);

  // O backend já devolve só quem a pessoa pode acompanhar: a própria linha, os membros
  // dos seus setores ou toda a empresa. O cargo exibido são as funções de cada um.
  const tecnicos = useMemo(() => {
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    return (data?.por_tecnico ?? []).map((t) => ({
      tecnico: t,
      cargo: descreverVinculos(porId.get(t.tecnico_id)?.vinculos) || '—',
    }));
  }, [data, usuarios]);

  const os = data?.ordens_servico;
  const tempos = data?.tempos_medios;

  const distribuicao = useMemo(() => {
    const d = tempos?.os_distribuicao_tempo;
    if (!d) return [];
    const faixas = [
      { label: '≤ 7 dias', count: d.ate_7 },
      { label: '8 – 15 dias', count: d.de_8_a_15 },
      { label: '16 – 30 dias', count: d.de_16_a_30 },
      { label: '31 – 60 dias', count: d.de_31_a_60 },
      { label: '> 60 dias', count: d.acima_60 },
    ];
    const total = faixas.reduce((a, f) => a + f.count, 0);
    const max = Math.max(1, ...faixas.map((f) => f.count));
    return faixas.map((f, i) => ({
      ...f,
      pctLabel: total > 0 ? pct((f.count / total) * 100) : '0%',
      w: `${Math.round((f.count / max) * 100)}%`,
      color: DIST_COLORS[i],
    }));
  }, [tempos]);

  const temposCiclo = useMemo(() => {
    if (!tempos) return [];
    return [
      { label: 'OS · da criação ao encerramento', value: tempos.os_criacao_para_encerramento_dias, sub: 'inclui canceladas' },
      { label: 'OS · da criação à conclusão', value: tempos.os_criacao_para_conclusao_dias, sub: 'só concluídas com sucesso' },
      { label: 'Serviço · do início ao fim', value: tempos.servicos_inicio_para_fim_dias, sub: 'tempo de execução' },
      { label: 'Tarefa · da criação ao início', value: tempos.tarefa_criacao_para_inicio_dias, sub: 'fila / atraso de início' },
    ];
  }, [tempos]);

  const principais = data?.servicos?.principais_por_quantidade ?? [];
  const maxPrincipais = Math.max(1, ...principais.map((p) => p.total));
  const principaisVisiveis = principais.slice(0, principaisCount);

  const revisoes = data?.minios?.revisoes_por_cliente ?? [];
  const maxRevisoes = Math.max(1, ...revisoes.map((r) => r.total));

  const minioRevisaoPct =
    data && data.minios.total > 0
      ? pct((data.minios.total_revisao_cliente / data.minios.total) * 100)
      : null;

  const catalogoTempo: TempoPorCatalogoItem[] =
    (catTab === 'servico' ? tempos?.tempo_por_catalogo_servico : tempos?.tempo_por_catalogo_oso) ?? [];
  const catalogoTempoVisivel = catalogoTempo.slice(0, catalogoCount);

  const handleCatTab = (k: 'servico' | 'oso') => {
    setCatTab(k);
    setCatalogoCount(PAGE_SIZE);
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-[22px]">
        <div>
          <Skeleton className="h-7 w-64 rounded-md" />
          <Skeleton className="mt-2 h-4 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[260px] rounded-2xl" />
          <Skeleton className="h-[260px] rounded-2xl" />
        </div>
        <Skeleton className="h-[180px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível recuperar os indicadores operacionais. Tente novamente em instantes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[22px]">
      {/* ── Título + legenda de natureza ── */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Análise Operacional</h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Retrospectiva de volume, tempo, qualidade de execução e produtividade ao longo do tempo.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Natureza do dado</span>
          <div className="flex flex-wrap gap-3.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"><span className="h-[9px] w-[9px] rounded-full bg-slate-400" />Histórico acumulado</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"><span className="h-[9px] w-[9px] rounded-full bg-teal-500" />Mês corrente</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"><span className="h-[9px] w-[9px] rounded-full bg-amber-500" />Estado atual (agora)</span>
          </div>
        </div>
      </div>

      {/* ── Aviso de agregação ── */}
      <div className="flex items-start gap-3 rounded-[14px] border border-primary/30 bg-primary/[0.05] px-[18px] py-3.5 dark:bg-primary/10">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-primary/15 text-primary">
          <Info className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-foreground">
            {isTechnician ? 'Números gerais são de toda a empresa' : 'Visão agregada de toda a empresa'}
          </p>
          <p className="mt-0.5 max-w-[92ch] text-[13px] font-medium leading-relaxed text-muted-foreground">
            {isTechnician
              ? 'Volume, tempo e taxas abaixo são agregados da empresa inteira — não apenas do seu trabalho. Só o bloco de produtividade por técnico mostra exclusivamente a sua linha.'
              : 'Os blocos de volume, tempo e taxa refletem toda a operação. A produtividade por técnico traz uma linha por pessoa, permitindo comparação entre a equipe.'}
          </p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Panel className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Total de OS</span>
            <NatureTag nat="hist" />
          </div>
          <span className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">{nf(os?.total)}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {nf(os?.total_concluidas)} concluídas · {nf(os?.total_nao_concluidas)} não concluídas
          </span>
        </Panel>
        <Panel className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">OS em aberto</span>
            <NatureTag nat="agora" />
          </div>
          <span className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">{nf(os?.em_aberto)}</span>
          <span className="text-xs font-medium text-muted-foreground">fotografia deste momento</span>
        </Panel>
        <Panel className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">OS abertas no mês</span>
            <NatureTag nat="mes" />
          </div>
          <span className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">{nf(os?.abertas_mes_atual)}</span>
          {os && <DeltaBadge atual={os.abertas_mes_atual} anterior={os.abertas_mes_anterior} goodUp={null} />}
        </Panel>
        <Panel className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">OS concluídas no mês</span>
            <NatureTag nat="mes" />
          </div>
          <span className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">{nf(os?.concluidas_mes_atual)}</span>
          {os && <DeltaBadge atual={os.concluidas_mes_atual} anterior={os.concluidas_mes_anterior} goodUp={true} />}
        </Panel>
        <Panel className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Serviços concluídos</span>
            <NatureTag nat="hist" />
          </div>
          <span className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">
            {nf(data.servicos.concluidos_ultimos_12_meses_total)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">nos últimos 12 meses</span>
        </Panel>
      </div>

      {/* ── Fluxo mensal + duração das OS ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <PanelHeader
            title="Fluxo de OS por mês"
            subtitle="Abertas vs. concluídas · janela corrida"
            right={
              <div className="flex gap-3.5">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground"><span className="h-2.5 w-2.5 rounded-[3px] bg-slate-300 dark:bg-slate-600" />Abertas</span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />Concluídas</span>
              </div>
            }
          />
          <div className="px-[22px] pb-4 pt-5">
            <MonthlyFlow abertas={os?.abertas_por_mes ?? []} concluidas={os?.concluidas_por_mes ?? []} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Duração das OS"
            subtitle="Distribuição por faixa de dias"
            right={<NatureTag nat="hist" />}
          />
          <div className="flex flex-col gap-[13px] px-[22px] py-[18px]">
            {distribuicao.map((d) => (
              <div key={d.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-[12.5px] font-semibold text-foreground">{d.label}</span>
                  <span className="text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                    {nf(d.count)} <span className="text-[11px] font-medium opacity-70">· {d.pctLabel}</span>
                  </span>
                </div>
                <div className="h-[9px] overflow-hidden rounded-[5px] bg-muted">
                  <div className="h-full rounded-[5px]" style={{ width: d.w, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Tempos médios ── */}
      <Panel>
        <PanelHeader
          title="Tempos médios de ciclo"
          right={
            <span className="text-xs font-medium text-muted-foreground">
              Amostra: {nf(tempos?.os_total_com_data)} OS com data
            </span>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {temposCiclo.map((t, i) => (
            <div key={t.label} className={cn('flex flex-col gap-1.5 px-[22px] py-[18px]', i > 0 && 'border-t border-border sm:border-t-0 sm:border-l')}>
              <span className="min-h-8 text-[11.5px] font-semibold leading-snug text-muted-foreground">{t.label}</span>
              {t.value == null ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-muted-foreground">—</span>
                  <SemBaseBadge />
                </span>
              ) : (
                <span className="text-[26px] font-extrabold tabular-nums tracking-tight text-foreground">
                  {dec(t.value)} <span className="text-sm font-semibold text-muted-foreground">dias</span>
                </span>
              )}
              <span className="text-[11.5px] font-medium text-muted-foreground">{t.sub}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Status ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBlock
          kind="Serviços"
          tagClass="bg-primary/[0.13] text-primary"
          items={data.servicos.por_status}
        />
        <StatusBlock
          kind="Tarefas"
          tagClass="bg-blue-500/[0.14] text-blue-600 dark:text-blue-400"
          items={data.tarefas.por_status}
        />
      </div>

      {/* ── Serviços mais executados ── */}
      <Panel>
        <PanelHeader
          title="Serviços mais executados"
          right={
            <span className="text-xs font-medium text-muted-foreground">
              {principais.length ? `${nf(principais.length)} itens · participação sobre o total de serviços` : 'participação sobre o total de serviços'}
            </span>
          }
        />
        <div className="flex flex-col gap-1 px-[22px] pb-[18px] pt-2">
          {principais.length ? (
            <>
              {principaisVisiveis.map((p, i) => (
                <div key={p.catalogo_id} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                  <span className="w-6 shrink-0 text-[13px] font-extrabold tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13.5px] font-semibold text-foreground">{p.catalogo_nome}</span>
                      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-muted-foreground">
                        {nf(p.total)} <span className="font-medium opacity-70">· {pct(p.percentual) ?? 'sem base'}</span>
                      </span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-[4px] bg-muted">
                      <div className="h-full rounded-[4px] bg-primary" style={{ width: `${Math.round((p.total / maxPrincipais) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <LoadMoreButton
                total={principais.length}
                visible={principaisVisiveis.length}
                onClick={() => setPrincipaisCount((c) => c + PAGE_SIZE)}
                bordered={false}
              />
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
          )}
        </div>
      </Panel>

      {/* ── OS Operacionais ── */}
      <Panel>
        <div className="flex items-center gap-2.5 border-b border-border px-[22px] py-4">
          <span className="rounded-[7px] bg-purple-500/[0.13] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.03em] text-purple-600 dark:text-purple-400">
            OS Operacionais
          </span>
          <h3 className="text-[15px] font-bold text-foreground">Unidade avulsa</h3>
        </div>
        <div className="grid grid-cols-1 items-start gap-6 px-[22px] py-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5">
                <NatureTag nat="hist" />
                <span className="text-2xl font-extrabold leading-none tabular-nums text-foreground">{nf(data.minios.total)}</span>
                <span className="text-xs font-medium text-muted-foreground">OS Operacionais no total</span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5">
                <NatureTag nat="hist" />
                <span className="text-2xl font-extrabold leading-none tabular-nums text-foreground">{nf(data.minios.total_revisao_cliente)}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  Por revisão do cliente{minioRevisaoPct ? ` · ${minioRevisaoPct} do total` : ''}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5">
                <NatureTag nat="mes" />
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-foreground">{nf(data.minios.criadas_mes_atual)}</span>
                <span className="text-xs font-medium text-muted-foreground">OS Operacionais criadas</span>
                <DeltaBadge atual={data.minios.criadas_mes_atual} anterior={data.minios.criadas_mes_anterior} goodUp={null} />
              </div>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5">
                <NatureTag nat="mes" />
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-foreground">{nf(data.minios.finalizadas_mes_atual)}</span>
                <span className="text-xs font-medium text-muted-foreground">OS Operacionais finalizadas</span>
                <DeltaBadge atual={data.minios.finalizadas_mes_atual} anterior={data.minios.finalizadas_mes_anterior} goodUp={true} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[13px] font-bold text-foreground">Clientes que mais geram revisão</span>
              <span className="text-[11px] font-medium text-muted-foreground">sinal de insatisfação recorrente</span>
            </div>
            {revisoes.length ? (
              revisoes.map((r) => (
                <div key={r.cliente_id} className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">{r.cliente_nome}</span>
                    <span className="whitespace-nowrap text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                      {nf(r.total)} <span className="font-medium opacity-70">· {pct(r.percentual) ?? 'sem base'}</span>
                    </span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-[4px] bg-muted">
                    <div className="h-full rounded-[4px]" style={{ width: `${Math.round((r.total / maxRevisoes) * 100)}%`, background: 'hsl(280 55% 58%)' }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma OS Operacional de revisão encontrada.</p>
            )}
          </div>
        </div>
      </Panel>

      {/* ── Cumprimento de prazo ── */}
      <Panel>
        <PanelHeader title="Cumprimento de prazo" subtitle="Somente itens que tinham prazo definido" />
        <div className="grid grid-cols-1 gap-4 px-[22px] py-5 sm:grid-cols-2">
          <PrazoCard label="Tarefas" bloco={data.taxa_cumprimento_prazo.tarefas} color="hsl(210 70% 52%)" />
          <PrazoCard label="OS Operacionais" bloco={data.taxa_cumprimento_prazo.minios} color="hsl(280 55% 58%)" />
        </div>
      </Panel>

      {/* ── Tempo por catálogo ── */}
      <Panel>
        <PanelHeader
          title="Tempo real por item de catálogo"
          subtitle="Média de dias de execução vs. estimativa cadastrada"
          right={
            <div className="flex gap-0.5 rounded-[10px] border border-border bg-muted/60 p-[3px]">
              {([['servico', 'Serviços'], ['oso', 'OS Operacionais']] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleCatTab(k)}
                  className={cn(
                    'rounded-[7px] px-[13px] py-1.5 text-[12.5px] font-semibold transition-colors',
                    catTab === k ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        />
        <div className="px-[22px] pb-[18px] pt-1.5">
          <div className="overflow-x-auto">
            <div className="grid min-w-[420px] grid-cols-[minmax(0,1fr)_90px_110px] gap-4 border-b border-border py-3">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Item</span>
              <span className="text-right text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Concl.</span>
              <span className="text-right text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Real (dias)</span>
            </div>
            {catalogoTempo.length ? (
              catalogoTempoVisivel.map((c) => {
                return (
                  <div key={c.catalogo_id} className="grid min-w-[420px] grid-cols-[minmax(0,1fr)_90px_110px] items-center gap-4 border-b border-border py-[13px] last:border-b-0">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{c.catalogo_nome}</span>
                    <span className="text-right text-[13.5px] font-semibold tabular-nums text-muted-foreground">{nf(c.total_concluidos)}</span>
                    <span className="text-right text-sm font-bold tabular-nums text-foreground">{dec(c.media_dias) ?? '—'}</span>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item com dados de duração disponíveis.</p>
            )}
          </div>
          <LoadMoreButton
            total={catalogoTempo.length}
            visible={catalogoTempoVisivel.length}
            onClick={() => setCatalogoCount((c) => c + PAGE_SIZE)}
          />
        </div>
      </Panel>

      {/* ── Produtividade por técnico ── */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <h3 className="text-base font-extrabold tracking-tight text-foreground">Produtividade por técnico</h3>
          <span className="text-[12.5px] font-medium text-muted-foreground">
            {isTechnician ? 'Apenas a sua linha' : `${tecnicos.length} técnico${tecnicos.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border px-4 py-3',
            isTechnician ? 'border-primary/[0.35] bg-primary/[0.05] dark:bg-primary/10' : 'border-border bg-muted/40',
          )}
        >
          <div className={cn('flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg', isTechnician ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
            <Info className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[96ch] text-[13px] font-medium leading-relaxed text-foreground">
            {isTechnician
              ? 'Como perfil Técnico, você vê somente a sua produtividade individual aqui. Os demais perfis veem uma linha por técnico para comparação.'
              : 'Cada cartão combina histórico acumulado (esquerda) com a carga atual — o que está em aberto agora (direita, em âmbar). Tarefa e OS Operacional aparecem sempre como frentes distintas, nunca somadas.'}
          </span>
        </div>

        {tecnicos.length ? (
          tecnicos.map(({ tecnico, cargo }) => (
            <TecnicoCard
              key={tecnico.tecnico_id}
              tecnico={tecnico}
              cargo={cargo}
              isOwn={isTechnician}
              highlight={isTechnician}
            />
          ))
        ) : (
          <Panel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum dado de produtividade disponível.</p>
          </Panel>
        )}
      </div>
    </div>
  );
};

export default OperacionalPage;
