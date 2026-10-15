import { useState } from 'react';
import { Building2, Network } from 'lucide-react';
import { PrioridadeIndicator, TONE_CLASSES, type Tone } from '@/components/kit';
import { getIniciais, temTexto } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ColunaDoQuadro<T> {
  id: string;
  titulo: string;
  tom: Tone;
  itens: T[];
  /** Aceita soltar cartões (ex.: "Distribuído" recebe da fila). */
  aceita?: boolean;
  vazio?: string;
  /** Conteúdo sob o título (ex.: a navegação por mês dos concluídos). */
  cabecalho?: React.ReactNode;
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
  larguraMinima = '17rem',
}: {
  colunas: ColunaDoQuadro<T>[];
  chave: (item: T) => string;
  cartao: (item: T) => React.ReactNode;
  arrastavel?: (item: T) => boolean;
  onSoltar?: (colunaId: string, itemChave: string) => void;
  rotulo: string;
  /** Largura mínima de cada coluna; com muitas colunas, o quadro rola na horizontal. */
  larguraMinima?: string;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  return (
    <div
      className="grid gap-3 overflow-x-auto pb-2"
      style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(${larguraMinima}, 1fr))` }}
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
          {c.cabecalho ? <div className="-mt-1 px-3 pb-2">{c.cabecalho}</div> : null}
          <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5">
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

export interface CartaoProps {
  /** Nome do serviço (catálogo). */
  titulo: string;
  /** Descrição do serviço ou a parte da tarefa, abaixo do título. */
  descricao?: string | null;
  os: number;
  cliente: string;
  /** Setor do serviço (na Visão geral, onde há vários). */
  setor?: string | null;
  prioridade?: string | null;
  /** Chips de situação: prazo, parado, ciência, resultado do prazo. */
  situacao?: React.ReactNode;
  /** Informação de tempo ("Na fila há 3 dias", "Concluída em 12/10"). */
  tempo?: React.ReactNode;
  /** Linha extra (ex.: os outros serviços da venda). */
  extra?: React.ReactNode;
  /** Pessoas do cartão, com o nome completo da primeira. */
  pessoas?: string[];
  /** Texto quando não há pessoas (ex.: "Sem responsável"). */
  semPessoas?: string;
  acao?: React.ReactNode;
  /** Faixa lateral de alerta: atrasado (danger) ou parado (warning). */
  tom?: 'danger' | 'warning' | null;
  onAbrir: () => void;
}

/** Pessoas no rodapé: avatares sobrepostos e o nome completo da primeira ("e mais N"). */
function Pessoas({ nomes, vazio }: { nomes: string[]; vazio?: string }) {
  if (!nomes.length) return vazio ? <span className="text-xs italic text-muted-foreground">{vazio}</span> : null;
  const visiveis = nomes.slice(0, 3);
  return (
    <span className="flex min-w-0 items-center gap-2" title={nomes.join(', ')}>
      <span className="flex shrink-0 -space-x-1.5" aria-hidden>
        {visiveis.map((n, i) => (
          <span key={`${n}-${i}`} className="grid size-6 place-items-center rounded-full border-2 border-card bg-primary/10 text-2xs font-semibold text-primary">
            {getIniciais(n)}
          </span>
        ))}
      </span>
      <span className="min-w-0 truncate text-xs">
        <span className="font-medium text-foreground">{nomes[0]}</span>
        {nomes.length > 1 ? <span className="text-muted-foreground"> e mais {nomes.length - 1}</span> : null}
      </span>
    </span>
  );
}

/**
 * Cartão de serviço ou tarefa no quadro. Ordem de leitura: de onde vem (OS, setor, prioridade), o que é
 * (serviço e descrição), para quem (cliente), como está (situação e tempo) e com quem está (pessoas e ação).
 * Atrasado ganha a faixa vermelha à esquerda; parado, a amarela.
 */
export function Cartao({ titulo, descricao, os, cliente, setor, prioridade, situacao, tempo, extra, pessoas = [], semPessoas, acao, tom, onAbrir }: CartaoProps) {
  const temRodape = pessoas.length > 0 || !!semPessoas || !!acao;
  const prio = prioridade === 'alta' || prioridade === 'media' ? prioridade : null;
  return (
    <article
      tabIndex={0}
      onClick={(e) => !(e.target as HTMLElement).closest('a,button') && onAbrir()}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onAbrir()}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-xl border bg-card p-3.5 text-sm shadow-sm transition-all',
        'hover:-translate-y-px hover:border-primary/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {tom ? <span className={cn('absolute inset-y-0 left-0 w-1', tom === 'danger' ? 'bg-danger' : 'bg-warning')} aria-hidden /> : null}

      <header className="flex items-center gap-2 text-2xs">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold tabular-nums text-muted-foreground">OS {os}</span>
        {setor ? (
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-muted-foreground">
            <Network className="size-3 shrink-0" aria-hidden />
            {setor}
          </span>
        ) : null}
        {prio ? <PrioridadeIndicator value={prio} className="ml-auto text-2xs [&_svg]:size-3.5" /> : null}
      </header>

      <div className="space-y-0.5">
        <h4 className="line-clamp-2 font-semibold leading-snug text-foreground">{titulo}</h4>
        {temTexto(descricao) ? <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{descricao}</p> : null}
      </div>

      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate" title={cliente}>
          {cliente}
        </span>
      </p>

      {situacao || tempo ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {situacao}
          {tempo ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{tempo}</span> : null}
        </div>
      ) : null}

      {extra}

      {temRodape ? (
        <footer className="-mx-3.5 -mb-3.5 mt-0.5 flex min-h-11 items-center gap-2 border-t bg-muted/30 px-3.5 py-2">
          <Pessoas nomes={pessoas} vazio={semPessoas} />
          {acao ? <span className="ml-auto shrink-0">{acao}</span> : null}
        </footer>
      ) : null}
    </article>
  );
}
