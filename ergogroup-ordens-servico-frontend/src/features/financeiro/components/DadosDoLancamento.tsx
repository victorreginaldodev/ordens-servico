import { Copy, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Peças do "Faturar" (venda e OS operacional): seções com título e os dados do lançamento com copiar. */

export interface Campo {
  rotulo: string;
  valor: string | null | undefined;
  copiar?: boolean;
  forte?: boolean;
}

export function Secao({ titulo, icone: Icone, acao, children }: { titulo: string; icone: LucideIcon; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icone className="size-4 text-muted-foreground" aria-hidden />
        {titulo}
        {acao ? <span className="ml-auto">{acao}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** Os dados em duas colunas, com copiar nos que entram no lançamento. */
export function Dados({ campos, onCopiar }: { campos: Campo[]; onCopiar: (rotulo: string, valor: string) => void }) {
  return (
    <dl className="grid gap-x-6 md:grid-cols-2">
      {campos.map((c) => (
        <div key={c.rotulo} className="grid min-w-0 grid-cols-[9.5rem_minmax(0,1fr)_1.75rem] items-center gap-2 border-b border-dashed py-1.5 text-sm">
          <dt className="text-muted-foreground">{c.rotulo}</dt>
          <dd className={cn('truncate', c.forte && 'font-semibold tabular-nums')} title={c.valor ?? undefined}>
            {c.valor || <span className="text-muted-foreground">Não informado</span>}
          </dd>
          <dd>
            {c.copiar && c.valor ? (
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Copiar ${c.rotulo.toLowerCase()}`} onClick={() => onCopiar(c.rotulo, c.valor!)}>
                <Copy className="size-3.5" />
              </Button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

