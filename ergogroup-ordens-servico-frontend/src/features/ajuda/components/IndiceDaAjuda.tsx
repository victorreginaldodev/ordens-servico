import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { urlDaPagina, type ModuloDaAjuda } from '../conteudo';

const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Índice da Ajuda: módulos que abrem e fecham, com as páginas, e a busca pelo título. */
export function IndiceDaAjuda({
  modulos,
  atual,
  onNavegar,
}: {
  modulos: ModuloDaAjuda[];
  atual: { modulo: string; pagina: string };
  onNavegar?: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState<string[]>([]);
  const q = normalizar(busca.trim());

  const filtrados = q
    ? modulos
        .map((m) => ({ ...m, paginas: m.paginas.filter((p) => normalizar(`${p.titulo} ${p.resumo} ${m.titulo}`).includes(q)) }))
        .filter((m) => m.paginas.length)
    : modulos;

  const alternar = (id: string) => setFechados((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  return (
    <nav aria-label="Índice da ajuda">
      <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar na ajuda"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>

      {filtrados.length ? (
        filtrados.map((m) => {
          const fechado = !q && fechados.includes(m.id);
          return (
            <div key={m.id} className="mt-2">
              <button
                type="button"
                onClick={() => alternar(m.id)}
                aria-expanded={!fechado}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <m.icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">{m.titulo}</span>
                <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', fechado && '-rotate-90')} aria-hidden />
              </button>
              {!fechado ? (
                <ul className="ml-[15px] border-l py-0.5">
                  {m.paginas.map((p) => {
                    const ativa = atual.modulo === m.id && atual.pagina === p.id;
                    return (
                      <li key={p.id}>
                        <Link
                          to={urlDaPagina(p)}
                          onClick={onNavegar}
                          aria-current={ativa ? 'page' : undefined}
                          className={cn(
                            '-ml-px block border-l-2 px-2.5 py-1 text-[13px] leading-[18px] transition-colors',
                            ativa ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {p.titulo}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="px-2 py-3 text-sm text-muted-foreground">Nada encontrado para “{busca.trim()}”.</p>
      )}
    </nav>
  );
}
