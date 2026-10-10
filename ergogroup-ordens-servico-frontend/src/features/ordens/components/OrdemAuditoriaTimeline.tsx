import { useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, CircleDashed,
  FilePlus2, History, Settings2, Trash2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditoriaTimeline } from '../hooks';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACAO_ICON: Record<string, React.ReactNode> = {
  criacao:               <FilePlus2   className="h-4 w-4" />,
  atualizacao:           <Settings2   className="h-4 w-4" />,
  status:                <CircleDashed className="h-4 w-4" />,
  propagacao_status:     <Zap         className="h-4 w-4" />,
  liberacao_faturamento: <CheckCircle2 className="h-4 w-4" />,
  faturamento:           <CheckCircle2 className="h-4 w-4" />,
  liberacao_cobranca:    <CheckCircle2 className="h-4 w-4" />,
  contrato:              <Settings2   className="h-4 w-4" />,
  exclusao:              <Trash2      className="h-4 w-4" />,
  backfill:              <History     className="h-4 w-4" />,
};

const ACAO_COLOR: Record<string, string> = {
  criacao:               'bg-slate-500/15 text-slate-500 dark:text-slate-400',
  atualizacao:           'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  status:                'bg-primary/15 text-primary',
  propagacao_status:     'bg-primary/15 text-primary',
  liberacao_faturamento: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  faturamento:            'bg-green-500/15 text-green-600 dark:text-green-400',
  liberacao_cobranca:    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  contrato:              'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  exclusao:              'bg-red-500/15 text-red-600 dark:text-red-400',
  backfill:              'bg-muted text-muted-foreground',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// ── Alterações expandíveis ────────────────────────────────────────────────────

function Alteracoes({ data }: { data: Record<string, { antes: unknown; depois: unknown }> }) {
  const entries = Object.entries(data);
  if (!entries.length) return null;

  return (
    <div className="mt-2 space-y-1 border-l border-border pl-3">
      {entries.map(([campo, { antes, depois }]) => (
        <div key={campo} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-foreground">{campo}</span>
          <span className="text-muted-foreground line-through">{String(antes ?? '—')}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{String(depois ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}

// ── Item individual ───────────────────────────────────────────────────────────

function TimelineItem({ registro, isLast }: { registro: import('../services').RegistroAuditoria; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasAlteracoes = Object.keys(registro.alteracoes ?? {}).length > 0;
  const isMigracao = registro.origem === 'migracao';
  const colorCls = ACAO_COLOR[registro.acao] ?? 'bg-muted text-muted-foreground';

  return (
    <div className={cn('flex gap-3.5', isMigracao && 'opacity-60')}>
      {/* Ícone + linha de conexão */}
      <div className="flex shrink-0 flex-col items-center">
        <div className={cn('flex h-[34px] w-[34px] items-center justify-center rounded-full', colorCls)}>
          {ACAO_ICON[registro.acao] ?? <History className="h-4 w-4" />}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: 22 }} />}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 pb-[22px]">
        <p className="text-sm font-medium leading-[1.45] text-foreground">
          <span className="font-bold">{registro.usuario_nome ?? 'Sistema'}</span> {registro.acao_display.toLowerCase()}
          {registro.objeto_repr ? <> — {registro.objeto_repr}</> : null}
        </p>

        <div className="mt-[3px] flex flex-wrap items-center gap-2">
          <span className={cn('rounded px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.04em]', colorCls)}>
            {registro.entidade_display}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{formatDateTime(registro.criado_em)}</span>
          {isMigracao && <span className="text-xs italic text-muted-foreground">dado histórico</span>}
        </div>

        {registro.motivo && !isMigracao && (
          <p className="mt-1 text-xs text-muted-foreground">{registro.motivo}</p>
        )}

        {hasAlteracoes && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded
              ? <><ChevronUp className="h-3 w-3" /> Ocultar alterações</>
              : <><ChevronDown className="h-3 w-3" /> Ver alterações</>}
          </button>
        )}
        {expanded && <Alteracoes data={registro.alteracoes} />}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface OrdemAuditoriaTimelineProps {
  ordemId: number;
}

export function OrdemAuditoriaTimeline({ ordemId }: OrdemAuditoriaTimelineProps) {
  const { data: registros, isLoading } = useAuditoriaTimeline(ordemId);

  if (isLoading) {
    return (
      <div className="max-w-[840px] space-y-5 py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3.5">
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5 rounded" />
              <Skeleton className="h-2.5 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!registros?.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum registro de auditoria encontrado.
      </p>
    );
  }

  return (
    <div className="max-w-[840px]">
      {registros.map((r, i) => (
        <TimelineItem key={r.id} registro={r} isLast={i === registros.length - 1} />
      ))}
    </div>
  );
}
