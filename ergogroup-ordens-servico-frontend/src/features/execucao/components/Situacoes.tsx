import { Calendar, CalendarX, CircleCheck, CirclePause, Clock, Hourglass, TriangleAlert } from 'lucide-react';
import { Chip, ETAPA_DEFS, TONE_CLASSES, rotuloDaPausa } from '@/components/kit';
import { diffInDays, formatDate, parseDate } from '@/lib/format';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Etapa, OutroServicoDaOS, SituacaoPrazo } from '../services';

const dm = (data: string | null | undefined) => {
  const d = parseDate(data);
  return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
};
const dias = (n: number) => `${n} dia${n === 1 ? '' : 's'}`;

export interface SituacoesProps {
  prazo: string | null | undefined;
  situacao: SituacaoPrazo | null | undefined;
  /** Sem movimentação há N dias e sem ciência vigente. */
  emAlerta?: boolean;
  diasSemMovimentacao?: number;
  cienciaVigente?: boolean;
  motivoCiencia?: string | null;
  /** Até quando a pausa explicada silencia o aviso. */
  cienciaAte?: string | null;
}

/**
 * No máximo duas situações, em palavras (fluxos-e-navegacao.md §6.2.2, item 5):
 * o prazo ("Atrasado 5 dias", "Vence 14/10", "Prazo 24/10", "Sem prazo") e, se houver, o alerta
 * ("Sem andamento há 9 dias") ou a pausa explicada ("Aguardando o cliente · até 21/10").
 */
export function Situacoes({ prazo, situacao, emAlerta, diasSemMovimentacao = 0, cienciaVigente, motivoCiencia, cienciaAte }: SituacoesProps) {
  const chips: React.ReactNode[] = [];
  const data = parseDate(prazo);
  if (situacao === 'atrasado' && data) {
    chips.push(
      <Chip key="p" tom="danger" icone={TriangleAlert} dica={`Prazo ${formatDate(data)}: passou e não foi concluído.`}>
        Atrasado {dias(-diffInDays(data))}
      </Chip>,
    );
  } else if (situacao === 'vence_7_dias') {
    chips.push(
      <Chip key="p" tom="warning" icone={Clock} dica="Vence nos próximos 7 dias.">
        Vence {dm(prazo)}
      </Chip>,
    );
  } else if (situacao === 'depois') {
    chips.push(
      <Chip key="p" tom="neutral" icone={Calendar} dica="Dentro do prazo.">
        Prazo {dm(prazo)}
      </Chip>,
    );
  } else if (situacao === 'sem_prazo') {
    chips.push(
      <Chip key="p" tom="warning" icone={CalendarX} dica="Distribuído sem prazo.">
        Sem prazo
      </Chip>,
    );
  }
  if (emAlerta) {
    chips.push(
      <Chip key="a" tom="warning" icone={Hourglass} dica={DICA_SEM_ANDAMENTO}>
        Sem andamento há {dias(diasSemMovimentacao)}
      </Chip>,
    );
  } else if (cienciaVigente) {
    chips.push(
      <Chip key="a" tom="info" icone={CirclePause} dica={DICA_PAUSA}>
        {rotuloDaPausa(motivoCiencia)}
        {cienciaAte ? ` · até ${dm(cienciaAte)}` : ''}
      </Chip>,
    );
  }
  if (!chips.length) return <span className="text-muted-foreground">—</span>;
  return <span className="flex flex-wrap gap-1">{chips}</span>;
}

const DICA_SEM_ANDAMENTO =
  'Nenhuma mudança nas tarefas há 7 dias ou mais. Se o trabalho andou, atualize a tarefa; se está esperando algo, explique a pausa.';
const DICA_PAUSA = 'A pausa foi explicada: o serviço está esperando algo. O aviso fica em silêncio até a data e volta se nada mudar.';

/**
 * Coluna "Andamento" das tabelas da execução, em três estados (fluxos-e-navegacao.md §6.2.8):
 * normal ("Última mudança há 3 dias", discreto), sem andamento (amarelo) e pausa explicada (motivo e até quando).
 */
export function AndamentoDoServico({
  dias: n,
  emAlerta,
  cienciaVigente,
  motivo,
  ate,
}: {
  dias: number;
  emAlerta: boolean;
  cienciaVigente: boolean;
  motivo?: string | null;
  ate?: string | null;
}) {
  if (emAlerta) {
    return (
      <Chip tom="warning" icone={Hourglass} dica={DICA_SEM_ANDAMENTO}>
        Sem andamento há {dias(n)}
      </Chip>
    );
  }
  if (cienciaVigente) {
    return (
      <Chip tom="info" icone={CirclePause} dica={DICA_PAUSA}>
        {rotuloDaPausa(motivo)}
        {ate ? ` · até ${dm(ate)}` : ''}
      </Chip>
    );
  }
  return <span className="text-xs text-muted-foreground">{n === 0 ? 'Mudou hoje' : `Última mudança há ${dias(n)}`}</span>;
}

/** Concluído no prazo ou quantos dias depois; sem prazo, só o texto. */
export function ResultadoDoPrazo({ prazo, termino, noPrazo }: { prazo: string | null; termino: string; noPrazo: boolean | null }) {
  if (noPrazo == null) return <span className="text-xs text-muted-foreground">Sem prazo</span>;
  if (noPrazo) {
    return (
      <Chip tom="success" icone={CircleCheck} dica={`Prazo ${formatDate(prazo)}`}>
        No prazo
      </Chip>
    );
  }
  const p = parseDate(prazo);
  const t = parseDate(termino);
  const atraso = p && t ? diffInDays(t, p) : null;
  return (
    <Chip tom="danger" icone={TriangleAlert} dica={`Prazo ${formatDate(prazo)}`}>
      {atraso ? `${dias(atraso)} após` : 'Após o prazo'}
    </Chip>
  );
}

const DOT: Record<Etapa, string> = {
  novo: TONE_CLASSES.warning.dot,
  a_distribuir: TONE_CLASSES.warning.dot,
  distribuido: TONE_CLASSES.neutral.dot,
  em_execucao: TONE_CLASSES.info.dot,
  concluido: TONE_CLASSES.success.dot,
  cancelado: TONE_CLASSES.neutral.dot,
};

/** Os outros serviços da mesma venda, com a etapa de cada um (inclusive de outros setores). */
export function OutrosServicosDaOS({ itens, setorAtual, className }: { itens: OutroServicoDaOS[]; setorAtual?: string | null; className?: string }) {
  if (!itens.length) return <span className="text-xs text-muted-foreground">Só este serviço</span>;
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {itens.map((o) => (
        <span
          key={o.id}
          title={`${o.setor_nome ?? 'Sem setor'} · ${ETAPA_DEFS[o.etapa].label}${o.responsaveis.length ? ` · ${o.responsaveis.join(', ')}` : ''}`}
          className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md border bg-card px-1.5 text-xs"
        >
          <span className={cn('size-1.5 rounded-full', DOT[o.etapa])} aria-hidden />
          {o.catalogo_nome ?? o.descricao}
          {o.setor_nome && o.setor_nome !== setorAtual ? <span className="text-muted-foreground">· {o.setor_nome}</span> : null}
        </span>
      ))}
    </span>
  );
}

/** Versão compacta para o cartão do quadro: um ponto por serviço (cor da etapa) e a lista no `title`. */
export function OutrosServicosResumo({ itens }: { itens: OutroServicoDaOS[] }) {
  if (!itens.length) return null;
  const lista = itens.map((o) => `${o.catalogo_nome ?? o.descricao} · ${o.setor_nome ?? 'Sem setor'} · ${ETAPA_DEFS[o.etapa].label}`).join('\n');
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground" title={lista}>
      <span className="flex -space-x-0.5" aria-hidden>
        {itens.slice(0, 5).map((o) => (
          <span key={o.id} className={cn('size-2 rounded-full ring-2 ring-card', DOT[o.etapa])} />
        ))}
      </span>
      Mais {itens.length} serviço{itens.length === 1 ? '' : 's'} nesta venda
    </p>
  );
}

/**
 * Etiqueta curta, de largura fixa, para a tabela: "+2 na OS". Ao clicar, lista os outros serviços da venda com o
 * setor, a etapa e quem está com cada um (revisão de 14/10/2026: a fileira de etiquetas esticava a linha).
 */
export function OutrosServicosEtiqueta({ itens }: { itens: OutroServicoDaOS[] }) {
  if (!itens.length) return <span className="text-xs text-muted-foreground">Só este</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-row-interactive
          className="inline-flex h-6 w-24 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-medium tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Mais ${itens.length} serviço${itens.length === 1 ? '' : 's'} nesta venda`}
        >
          <span className="flex -space-x-0.5" aria-hidden>
            {itens.slice(0, 3).map((o) => (
              <span key={o.id} className={cn('size-2 rounded-full ring-2 ring-card', DOT[o.etapa])} />
            ))}
          </span>
          +{itens.length} na OS
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <p className="px-1 pb-1.5 text-xs font-semibold text-muted-foreground">Outros serviços desta venda</p>
        <ul className="grid gap-1">
          {itens.map((o) => (
            <li key={o.id} className="grid gap-0.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
              <span className="flex items-center gap-1.5 font-semibold uppercase">
                <span className={cn('size-1.5 shrink-0 rounded-full', DOT[o.etapa])} aria-hidden />
                {o.catalogo_nome ?? o.descricao}
              </span>
              <span className="pl-3 text-muted-foreground">
                {o.setor_nome ?? 'Sem setor'} · {ETAPA_DEFS[o.etapa].label}
                {o.responsaveis.length ? ` · ${o.responsaveis.join(', ')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
