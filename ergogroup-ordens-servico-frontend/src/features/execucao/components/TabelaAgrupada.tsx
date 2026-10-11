import { Fragment } from 'react';
import { cn } from '@/lib/utils';

export interface Coluna<T> {
  id: string;
  titulo: string;
  celula: (linha: T) => React.ReactNode;
  className?: string;
  /** Coluna de ação: sem divisória e alinhada à direita. */
  acao?: boolean;
}

export interface Grupo<T> {
  chave: string;
  /** Cabeçalho do grupo; sem ele, as linhas aparecem sem separação. */
  cabecalho?: React.ReactNode;
  linhas: T[];
}

interface TabelaAgrupadaProps<T> {
  colunas: Coluna<T>[];
  grupos: Grupo<T>[];
  chaveDaLinha: (linha: T) => string | number;
  onAbrir?: (linha: T) => void;
  rotulo: string;
}

/**
 * Tabela da execução no padrão de docs/ui/design-system-tabelas.md §9 (moldura, cabeçalho em caixa
 * alta, linhas de grade), com grupos opcionais (por pessoa, por OS, por cliente, por setor).
 * Clicar na linha abre o serviço; botões e links dentro dela não propagam o clique.
 */
export function TabelaAgrupada<T>({ colunas, grupos, chaveDaLinha, onAbrir, rotulo }: TabelaAgrupadaProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm" aria-label={rotulo}>
        <thead>
          <tr className="h-10 border-b bg-secondary">
            {colunas.map((c, i) => (
              <th
                key={c.id}
                scope="col"
                className={cn(
                  'px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  i > 0 && !c.acao && 'border-l border-border/70',
                  c.acao && 'text-right',
                  c.className,
                )}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <Fragment key={g.chave}>
              {g.cabecalho ? (
                <tr className="border-b bg-muted/50">
                  <td colSpan={colunas.length} className="px-3 py-2">
                    {g.cabecalho}
                  </td>
                </tr>
              ) : null}
              {g.linhas.map((l) => (
                <tr
                  key={`${g.chave}-${chaveDaLinha(l)}`}
                  onClick={onAbrir ? (e) => !(e.target as HTMLElement).closest('a,button') && onAbrir(l) : undefined}
                  onKeyDown={onAbrir ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onAbrir(l) : undefined}
                  tabIndex={onAbrir ? 0 : undefined}
                  className={cn('border-b last:border-0', onAbrir && 'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none')}
                >
                  {colunas.map((c, i) => (
                    <td
                      key={c.id}
                      className={cn('px-3 py-2.5 align-middle', i > 0 && !c.acao && 'border-l border-border/70', c.acao && 'text-right', c.className)}
                    >
                      {c.celula(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Célula do serviço: catálogo em destaque e, embaixo, a descrição (ou a parte da tarefa). */
export function CelulaServico({ nome, detalhe }: { nome: string | null | undefined; detalhe?: string | null }) {
  return (
    <span className="flex min-w-[12rem] flex-col">
      <span className="font-semibold">{nome || 'Serviço'}</span>
      {detalhe ? <span className="line-clamp-1 text-xs text-muted-foreground">{detalhe}</span> : null}
    </span>
  );
}
