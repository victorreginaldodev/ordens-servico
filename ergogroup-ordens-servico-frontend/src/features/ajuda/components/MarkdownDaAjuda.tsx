import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { slug } from '../conteudo';
import { rolarAte } from '../rolarAte';

/**
 * Mostra o Markdown de uma página da Ajuda com as convenções de `conteudo/README.md`:
 * `## títulos` com âncora, listas numeradas como passos, `código` como nome de botão,
 * `> [!DICA]` e `> [!ATENCAO]` como caixas, e os blocos ```fluxo e ```exemplo.
 */

interface NoMd {
  type: string;
  value?: string;
  children?: NoMd[];
  data?: Record<string, unknown>;
}

const AVISOS: Record<string, 'dica' | 'atencao'> = { DICA: 'dica', ATENCAO: 'atencao' };

/** Transforma `> [!DICA] Título` numa caixa (`<aside data-aviso="dica" data-titulo="Título">`). */
function remarkAvisos() {
  const transformar = (citacao: NoMd) => {
    const paragrafo = citacao.children?.[0];
    const texto = paragrafo?.type === 'paragraph' ? paragrafo.children?.[0] : undefined;
    if (texto?.type !== 'text' || !texto.value) return;
    const m = /^\[!(DICA|ATENCAO)\][ \t]*([^\n]*)\n?/.exec(texto.value);
    if (!m) return;
    texto.value = texto.value.slice(m[0].length);
    if (!texto.value) paragrafo!.children!.shift();
    if (!paragrafo!.children!.length) citacao.children!.shift();
    citacao.data = { hName: 'aside', hProperties: { 'data-aviso': AVISOS[m[1]], 'data-titulo': m[2].trim() } };
  };
  const visitar = (no: NoMd) => {
    for (const filho of no.children ?? []) {
      if (filho.type === 'blockquote') transformar(filho);
      visitar(filho);
    }
  };
  return (arvore: NoMd) => visitar(arvore);
}

interface NoHast {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: NoHast[];
}

const textoDoNo = (no?: NoHast): string => (no?.type === 'text' ? no.value ?? '' : (no?.children ?? []).map(textoDoNo).join(''));

const linkClasse = 'font-medium text-primary underline-offset-4 hover:underline';

function criarComponentes(modulo: string, visiveis: ReadonlySet<string>): Components {
  return {
    h2: ({ node, children }) => {
      const id = slug(textoDoNo(node as NoHast));
      return (
        <h2 id={id} className="group mt-10 scroll-mt-20 text-xl font-bold tracking-tight first:mt-6">
          {children}
          <a href={`#${id}`} onClick={(e) => (e.preventDefault(), rolarAte(id))} aria-label="Link para esta seção" className="ml-2 font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            #
          </a>
        </h2>
      );
    },
    h3: ({ children }) => <h3 className="mt-6 text-base font-semibold">{children}</h3>,
    p: ({ children }) => <p className="my-2.5 text-[15px] leading-[1.7]">{children}</p>,
    ul: ({ children }) => <ul className="my-2.5 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] marker:text-muted-foreground">{children}</ul>,
    ol: ({ children }) => <ol className="ajuda-passos my-4 space-y-3 text-[15px] leading-[1.7]">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    hr: () => <hr className="my-8" />,
    a: ({ href = '', children }) => {
      if (/^https?:/.test(href) || href.startsWith('mailto:'))
        return (
          <a href={href} target="_blank" rel="noreferrer" className={linkClasse}>
            {children}
          </a>
        );
      if (href.startsWith('#'))
        return (
          <a href={href} onClick={(e) => (e.preventDefault(), rolarAte(href.slice(1)))} className={linkClasse}>
            {children}
          </a>
        );
      // `/rota` é uma tela do sistema; `pagina` ou `modulo/pagina` é outra página da Ajuda.
      if (!href.startsWith('/')) {
        const pagina = href.includes('/') ? href : `${modulo}/${href}`;
        // Página que a pessoa não vê (falta permissão): fica só o texto.
        if (!visiveis.has(pagina.split('#')[0])) return <>{children}</>;
      }
      const destino = href.startsWith('/') ? href : `/ajuda/${href.includes('/') ? href : `${modulo}/${href}`}`;
      return (
        <Link to={destino} className={linkClasse}>
          {children}
        </Link>
      );
    },
    // `código` no texto é o nome de um botão, aba ou campo da tela.
    code: ({ children }) => (
      <span className="whitespace-nowrap rounded-md border bg-card px-1.5 py-0.5 text-[13px] font-semibold shadow-sm">{children}</span>
    ),
    pre: ({ node }) => {
      const codigo = (node as NoHast | undefined)?.children?.[0];
      const classes = (codigo?.properties?.className as string[] | undefined) ?? [];
      const linhas = textoDoNo(codigo)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (classes.includes('language-fluxo'))
        return (
          <div className="my-4 flex flex-wrap items-center gap-1.5">
            {linhas.map((etapa, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 ? <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                <span className="rounded-md bg-muted px-2.5 py-1 text-[13px] font-medium">{etapa}</span>
              </span>
            ))}
          </div>
        );
      return (
        <div className="my-3 space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="rounded-lg border bg-card px-3.5 py-2.5 text-sm">
              {l}
            </div>
          ))}
        </div>
      );
    },
    blockquote: ({ children }) => <blockquote className="my-4 border-l-2 pl-4 text-muted-foreground">{children}</blockquote>,
    aside: ({ node, children }) => {
      const props = (node as NoHast | undefined)?.properties ?? {};
      const tipo = (props.dataAviso ?? props['data-aviso']) as string;
      const titulo = (props.dataTitulo ?? props['data-titulo']) as string;
      const Icone = tipo === 'atencao' ? TriangleAlert : Lightbulb;
      return (
        <aside
          className={cn(
            'my-5 flex gap-3 rounded-lg px-4 py-3 text-sm leading-relaxed [&_p]:my-0 [&_p]:text-sm [&_p]:leading-relaxed',
            tipo === 'atencao' ? 'bg-warning-subtle' : 'bg-info-subtle',
          )}
        >
          <Icone className={cn('mt-0.5 size-4 shrink-0', tipo === 'atencao' ? 'text-warning-strong' : 'text-info-strong')} aria-hidden />
          <div className="min-w-0">
            {titulo ? <p className={cn('font-semibold', tipo === 'atencao' ? 'text-warning-strong' : 'text-info-strong')}>{titulo}</p> : null}
            {children}
          </div>
        </aside>
      );
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b bg-muted/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{children}</th>,
    td: ({ children }) => <td className="border-b px-3 py-2.5 align-top leading-relaxed [tr:last-child>&]:border-b-0">{children}</td>,
  };
}

/** `visiveis`: as páginas (`modulo/pagina`) que a pessoa vê; links para as outras viram texto. */
export function MarkdownDaAjuda({ texto, modulo, visiveis }: { texto: string; modulo: string; visiveis: ReadonlySet<string> }) {
  const componentes = useMemo(() => criarComponentes(modulo, visiveis), [modulo, visiveis]);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkAvisos]} components={componentes}>
      {texto}
    </ReactMarkdown>
  );
}
