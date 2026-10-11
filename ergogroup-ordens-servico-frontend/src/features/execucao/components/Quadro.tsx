import { useState } from 'react';
import { TONE_CLASSES, type Tone } from '@/components/kit';
import { cn } from '@/lib/utils';

export interface ColunaDoQuadro<T> {
  id: string;
  titulo: string;
  tom: Tone;
  itens: T[];
  /** Aceita soltar cartões (ex.: "Distribuído" recebe da fila). */
  aceita?: boolean;
  vazio?: string;
}

const TIPO = 'application/x-servix-cartao';

/**
 * Quadro em colunas (fluxos-e-navegacao.md §6.2.1). Arrastar usa o HTML5 nativo: o cartão arrastável
 * leva o próprio id, e a coluna que aceita chama `onSoltar`. Tudo o que o arrastar faz também tem botão.
 */
export function Quadro<T>({
  colunas,
  chave,
  cartao,
  arrastavel,
  onSoltar,
  rotulo,
}: {
  colunas: ColunaDoQuadro<T>[];
  chave: (item: T) => string;
  cartao: (item: T) => React.ReactNode;
  arrastavel?: (item: T) => boolean;
  onSoltar?: (colunaId: string, itemChave: string) => void;
  rotulo: string;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  return (
    <div
      className="grid gap-3 overflow-x-auto pb-2"
      style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(15rem, 1fr))` }}
      aria-label={rotulo}
    >
      {colunas.map((c) => (
        <section
          key={c.id}
          aria-label={c.titulo}
          onDragOver={c.aceita ? (e) => { if (e.dataTransfer.types.includes(TIPO)) { e.preventDefault(); setSobre(c.id); } } : undefined}
          onDragLeave={c.aceita ? () => setSobre((s) => (s === c.id ? null : s)) : undefined}
          onDrop={
            c.aceita
              ? (e) => {
                  e.preventDefault();
                  setSobre(null);
                  const id = e.dataTransfer.getData(TIPO);
                  if (id) onSoltar?.(c.id, id);
                }
              : undefined
          }
          className={cn(
            'flex min-h-[12rem] flex-col rounded-xl border bg-muted/40 transition-colors',
            arrastando && c.aceita && 'border-dashed border-primary/50',
            sobre === c.id && 'bg-primary/5 ring-2 ring-primary/40',
          )}
        >
          <header className="flex items-center gap-2 px-3 py-2.5">
            <span className={cn('size-2 rounded-full', TONE_CLASSES[c.tom].dot)} aria-hidden />
            <h3 className="text-sm font-semibold">{c.titulo}</h3>
            <span className="ml-auto rounded-full bg-card px-2 text-xs font-semibold tabular-nums text-muted-foreground">{c.itens.length}</span>
          </header>
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {c.itens.map((it) => {
              const pode = arrastavel?.(it) ?? false;
              return (
                <div
                  key={chave(it)}
                  draggable={pode}
                  onDragStart={
                    pode
                      ? (e) => {
                          e.dataTransfer.setData(TIPO, chave(it));
                          e.dataTransfer.effectAllowed = 'move';
                          setArrastando(true);
                        }
                      : undefined
                  }
                  onDragEnd={pode ? () => { setArrastando(false); setSobre(null); } : undefined}
                  className={cn(pode && 'cursor-grab active:cursor-grabbing')}
                >
                  {cartao(it)}
                </div>
              );
            })}
            {!c.itens.length ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">{c.vazio ?? 'Nada aqui.'}</p> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Moldura do cartão: título, número da OS, cliente e um rodapé livre. Atrasado ganha a faixa vermelha. */
export function Cartao({
  titulo,
  os,
  cliente,
  detalhe,
  rodape,
  atrasado,
  prioridadeAlta,
  onAbrir,
}: {
  titulo: string;
  os: number;
  cliente: string;
  detalhe?: React.ReactNode;
  rodape?: React.ReactNode;
  atrasado?: boolean;
  prioridadeAlta?: boolean;
  onAbrir: () => void;
}) {
  return (
    <article
      tabIndex={0}
      onClick={(e) => !(e.target as HTMLElement).closest('a,button') && onAbrir()}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onAbrir()}
      className={cn(
        'flex cursor-pointer flex-col gap-1.5 rounded-lg border bg-card p-2.5 text-sm shadow-sm transition-colors hover:border-foreground/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        atrasado && 'border-l-[3px] border-l-danger',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1 font-semibold leading-snug">{titulo}</span>
        {prioridadeAlta ? <span className="rounded bg-danger-subtle px-1 text-2xs font-semibold text-danger-strong">Alta</span> : null}
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">OS {os}</span>
      </div>
      <span className="truncate text-xs text-muted-foreground">
        {cliente}
        {detalhe ? <> · {detalhe}</> : null}
      </span>
      {rodape ? <div className="flex flex-wrap items-center gap-1.5">{rodape}</div> : null}
    </article>
  );
}
