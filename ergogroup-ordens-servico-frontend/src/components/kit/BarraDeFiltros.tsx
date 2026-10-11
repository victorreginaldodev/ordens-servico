import { CalendarRange, Check, ChevronDown, Columns3, List, Search, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ROTULO_PERIODO, intervaloDoPeriodo, type Periodo, type PresetDePeriodo } from '@/lib/periodo';

/**
 * Barra de filtros em dropdown (fluxos-e-navegacao.md §6.2.2, item 2): um botão por filtro, o valor
 * escolhido aparece no próprio botão, e os filtros ativos viram chips removíveis logo abaixo.
 */

export function BarraDeFiltros({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm', className)}>
      {children}
    </div>
  );
}

export const SeparadorDeFiltros = () => <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />;
export const EspacoDeFiltros = () => <span className="flex-1" aria-hidden />;

export type Visualizacao = 'lista' | 'quadro';

export function AlternarVisualizacao({ valor, onChange }: { valor: Visualizacao; onChange: (v: Visualizacao) => void }) {
  const opcoes: { v: Visualizacao; rotulo: string; icone: LucideIcon; dica: string }[] = [
    { v: 'lista', rotulo: 'Lista', icone: List, dica: 'Tabela' },
    { v: 'quadro', rotulo: 'Quadro', icone: Columns3, dica: 'Colunas por etapa' },
  ];
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Visualização">
      {opcoes.map((o) => (
        <button
          key={o.v}
          type="button"
          title={o.dica}
          aria-pressed={valor === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            valor === o.v ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
          )}
        >
          <o.icone className="size-3.5" aria-hidden />
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

interface FiltroDropdownProps {
  icone: LucideIcon;
  rotulo: string;
  /** Valor escolhido, mostrado no botão; `null` = sem filtro. */
  valor?: string | null;
  /** Destaca o botão mesmo sem valor (ex.: um agrupamento escolhido). */
  ativo?: boolean;
  aberto?: boolean;
  onAberto?: (aberto: boolean) => void;
  alinhar?: 'start' | 'end';
  largura?: string;
  children: React.ReactNode;
}

export function FiltroDropdown({ icone: Icone, rotulo, valor, ativo, aberto, onAberto, alinhar = 'start', largura = 'w-64', children }: FiltroDropdownProps) {
  const on = !!valor || ativo;
  return (
    <Popover open={aberto} onOpenChange={onAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted',
            on ? 'bg-primary/10 text-foreground ring-1 ring-primary/30' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icone className="size-4 shrink-0" aria-hidden />
          <span className="shrink-0">{rotulo}</span>
          {valor ? <span className="truncate font-semibold">: {valor}</span> : null}
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align={alinhar} className={cn('max-h-[70vh] overflow-y-auto p-1.5', largura)}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export const TituloDoFiltro = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">{children}</div>
);

export const NotaDoFiltro = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-1 border-t px-2 pb-1 pt-2 text-xs text-muted-foreground">{children}</div>
);

export function OpcaoDeFiltro({ marcado, onClick, children, extra }: { marcado: boolean; onClick: () => void; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={marcado}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
        'focus-visible:bg-muted focus-visible:outline-none',
        marcado && 'font-medium',
      )}
    >
      <Check className={cn('size-4 shrink-0 text-primary', !marcado && 'invisible')} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {extra ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{extra}</span> : null}
    </button>
  );
}

/** Filtro de data: a data de referência (prazo, chegada, conclusão…) e o período. */
export function FiltroDePeriodo<Campo extends string>({
  campos,
  campo,
  periodo,
  onChange,
  aberto,
  onAberto,
}: {
  campos: Record<Campo, string>;
  campo: Campo;
  periodo: Periodo | null;
  onChange: (campo: Campo, periodo: Periodo | null) => void;
  aberto?: boolean;
  onAberto?: (v: boolean) => void;
}) {
  const presets: PresetDePeriodo[] = ['semana', 'prox7', 'mes', 'mes_passado', 'personalizado'];
  const chaves = Object.keys(campos) as Campo[];
  const curta = (v: string) => v.split('-').reverse().slice(0, 2).join('/');
  return (
    <FiltroDropdown icone={CalendarRange} rotulo="Data" valor={periodo ? ROTULO_PERIODO[periodo.preset] : null} aberto={aberto} onAberto={onAberto} largura="w-72">
      {chaves.length > 1 ? (
        <>
          <TituloDoFiltro>Filtrar pela data de</TituloDoFiltro>
          <div className="mb-1 flex gap-0.5 rounded-lg bg-muted p-0.5 px-1">
            {chaves.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c, periodo)}
                className={cn(
                  'h-7 flex-1 rounded-md px-2 text-xs font-medium text-muted-foreground',
                  campo === c ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {campos[c]}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <TituloDoFiltro>Período{chaves.length === 1 ? ` (${campos[chaves[0]].toLowerCase()})` : ''}</TituloDoFiltro>
      {presets.map((p) => {
        const intervalo = p === 'personalizado' ? null : intervaloDoPeriodo({ preset: p });
        return (
          <OpcaoDeFiltro
            key={p}
            marcado={periodo?.preset === p}
            onClick={() => onChange(campo, periodo?.preset === p ? null : { preset: p })}
            extra={intervalo ? `${curta(intervalo.de)} a ${curta(intervalo.ate)}` : null}
          >
            {ROTULO_PERIODO[p]}
          </OpcaoDeFiltro>
        );
      })}
      {periodo?.preset === 'personalizado' ? (
        <div className="grid grid-cols-2 gap-2 px-2 pb-1 pt-1.5">
          <label className="grid gap-1 text-xs text-muted-foreground">
            De
            <Input type="date" className="h-8" value={periodo.de ?? ''} onChange={(e) => onChange(campo, { ...periodo, de: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Até
            <Input type="date" className="h-8" value={periodo.ate ?? ''} onChange={(e) => onChange(campo, { ...periodo, ate: e.target.value })} />
          </label>
        </div>
      ) : null}
      {periodo ? (
        <div className="mt-1 flex justify-end border-t px-1 pt-1.5">
          <Button variant="ghost" size="sm" onClick={() => onChange(campo, null)}>
            Limpar data
          </Button>
        </div>
      ) : null}
    </FiltroDropdown>
  );
}

export function BuscaDeFiltros({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block w-full sm:w-56">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 pl-8" />
    </label>
  );
}

export function ChipsDeFiltros({ itens, onRemover, onLimpar }: { itens: { id: string; texto: string }[]; onRemover: (id: string) => void; onLimpar: () => void }) {
  if (!itens.length) return null;
  return (
    <div className="-mt-1 mb-3 flex flex-wrap items-center gap-1.5">
      {itens.map((it) => (
        <span key={it.id} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pl-2.5 pr-1 text-xs">
          {it.texto}
          <button
            type="button"
            onClick={() => onRemover(it.id)}
            aria-label={`Remover filtro ${it.texto}`}
            className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
