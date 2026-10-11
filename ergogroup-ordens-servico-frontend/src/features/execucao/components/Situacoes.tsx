import { BellOff, Calendar, CalendarX, CircleCheck, Clock, Hourglass, TriangleAlert } from 'lucide-react';
import { Chip, ETAPA_DEFS, MOTIVO_CIENCIA_LABEL, TONE_CLASSES } from '@/components/kit';
import { diffInDays, formatDate, parseDate } from '@/lib/format';
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
}

/**
 * No máximo duas situações, em palavras (fluxos-e-navegacao.md §6.2.2, item 5):
 * o prazo ("Atrasado 5 dias", "Vence 14/10", "Prazo 24/10", "Sem prazo") e, se houver, o alerta
 * ("Parado há 9 dias") ou a ciência ("Aguardando o cliente").
 */
export function Situacoes({ prazo, situacao, emAlerta, diasSemMovimentacao = 0, cienciaVigente, motivoCiencia }: SituacoesProps) {
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
      <Chip key="a" tom="warning" icone={Hourglass} dica="Nenhuma mudança nas tarefas há 7 dias ou mais. Não é erro: é um aviso.">
        Parado há {dias(diasSemMovimentacao)}
      </Chip>,
    );
  } else if (cienciaVigente) {
    const rotulo = motivoCiencia ? MOTIVO_CIENCIA_LABEL[motivoCiencia as keyof typeof MOTIVO_CIENCIA_LABEL] ?? motivoCiencia : 'Ciente';
    chips.push(
      <Chip key="a" tom="neutral" icone={BellOff} dica="Alguém confirmou que o serviço está esperando algo. O aviso de parado fica silenciado por 7 dias.">
        {rotulo}
      </Chip>,
    );
  }
  if (!chips.length) return <span className="text-muted-foreground">—</span>;
  return <span className="flex flex-wrap gap-1">{chips}</span>;
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
  na_fila: TONE_CLASSES.warning.dot,
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
