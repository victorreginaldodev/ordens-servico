import { ArrowRight, Check, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, type Tone } from './tones';

export interface Indicador<Id extends string = string> {
  id: Id;
  rotulo: string;
  icone: LucideIcon;
  tom: Tone;
  /** `null` enquanto carrega. */
  valor: number | null;
  /** Explicação curta, no texto que aparece ao passar o mouse. */
  dica: string;
}

export interface IndicadoresProps<Id extends string> {
  titulo: string;
  itens: Indicador<Id>[];
  ativo: Id | null;
  onEscolher: (id: Id | null) => void;
  /** Clicar de novo no ativo desmarca (mostra tudo). Sem isso, sempre há um selecionado. */
  alternavel?: boolean;
  className?: string;
}

/**
 * Indicadores que também são filtro (fluxos-e-navegacao.md §6.2.2): número em destaque e um rodapé
 * de ação ("Ver estes →", "Mostrando estes"), para ficar claro que o cartão é clicável.
 */
export function Indicadores<Id extends string>({ titulo, itens, ativo, onEscolher, alternavel, className }: IndicadoresProps<Id>) {
  return (
    <section className={cn('mb-4', className)} aria-label={titulo}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <span className="text-xs text-muted-foreground">Clique num indicador para ver só aqueles itens</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {itens.map((it) => {
          const on = ativo === it.id;
          const Icone = it.icone;
          return (
            <button
              key={it.id}
              type="button"
              aria-pressed={on}
              title={it.dica + (on && alternavel ? ' Clique de novo para ver todos.' : '')}
              onClick={() => onEscolher(on && alternavel ? null : it.id)}
              className={cn(
                'group flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3.5 text-left shadow-sm transition-colors',
                'hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on && 'border-primary/60 bg-primary/5 ring-1 ring-primary/30',
              )}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className={cn('grid size-6 shrink-0 place-items-center rounded-md', TONE_CLASSES[it.tom].subtle)}>
                  <Icone className="size-3.5" aria-hidden />
                </span>
                <span className="truncate">{it.rotulo}</span>
              </span>
              {it.valor == null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span
                  className={cn(
                    'text-3xl font-bold tabular-nums leading-none tracking-tight',
                    it.tom === 'danger' && it.valor > 0 && 'text-danger-strong',
                  )}
                >
                  {it.valor}
                </span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  on ? 'text-primary' : it.valor ? 'text-primary/80 group-hover:text-primary' : 'text-muted-foreground',
                )}
              >
                {on ? (
                  <>
                    <Check className="size-3.5" aria-hidden />
                    Mostrando estes
                  </>
                ) : it.valor ? (
                  <>
                    Ver {it.valor === 1 ? 'este' : 'estes'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </>
                ) : (
                  'Nenhum agora'
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
