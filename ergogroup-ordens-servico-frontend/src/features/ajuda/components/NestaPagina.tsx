import { useEffect, useState } from 'react';
import { AlignLeft, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SecaoDaPagina } from '../conteudo';
import { rolarAte } from '../rolarAte';

/** "Nesta página": as seções da página, com a seção que está na tela destacada. */
export function NestaPagina({ secoes, onTopo }: { secoes: SecaoDaPagina[]; onTopo: () => void }) {
  const [ativa, setAtiva] = useState(secoes[0]?.id);

  useEffect(() => {
    setAtiva(secoes[0]?.id);
    const titulos = secoes.map((s) => document.getElementById(s.id)).filter((t): t is HTMLElement => !!t);
    if (!titulos.length) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    titulos.forEach((t) => observador.observe(t));
    return () => observador.disconnect();
  }, [secoes]);

  if (!secoes.length) return null;
  return (
    <nav aria-label="Nesta página">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <AlignLeft className="size-3.5" aria-hidden /> Nesta página
      </p>
      <ul className="border-l">
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setAtiva(s.id);
                rolarAte(s.id);
              }}
              className={cn(
                '-ml-px block border-l-2 px-3 py-1 text-[13px] leading-[18px] transition-colors',
                ativa === s.id ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s.titulo}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onTopo} className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowUp className="size-3.5" aria-hidden /> Voltar ao topo
      </button>
    </nav>
  );
}
