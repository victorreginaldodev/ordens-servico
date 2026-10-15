import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ExternalLink,
  KeyRound,
  MapPin,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/kit";
import { MarcaSimbolo } from "@/components/layout/Marca";
import { TITULO_PERMISSAO } from "@/features/organizacao/permissoesCatalogo";
import { cn } from "@/lib/utils";
import {
  urlDaPagina,
  type ModuloDaAjuda,
  type PaginaDaAjuda,
} from "../conteudo";
import { IndiceDaAjuda } from "../components/IndiceDaAjuda";
import { MarkdownDaAjuda } from "../components/MarkdownDaAjuda";
import { NestaPagina } from "../components/NestaPagina";
import { rolarAte } from "../rolarAte";
import { telaDeOrigem } from "../telaDeOrigem";
import { useAjuda } from "../useAjuda";

const ID_VER_TAMBEM = "ver-tambem";

/** `pagina` (mesmo módulo) ou `modulo/pagina`, entre as páginas que a pessoa vê. */
function resolverVerTambem(
  pagina: PaginaDaAjuda,
  modulos: ModuloDaAjuda[],
): PaginaDaAjuda[] {
  return pagina.ver.flatMap((ref) => {
    const [modulo, id] = ref.includes("/")
      ? ref.split("/")
      : [pagina.modulo, ref];
    const achada = modulos
      .find((m) => m.id === modulo)
      ?.paginas.find((p) => p.id === id);
    return achada ? [achada] : [];
  });
}

/** Tela cheia, sem o menu do sistema: só o cabeçalho com o "Voltar ao sistema". */
function MolduraDaAjuda({ children }: { children: React.ReactNode }) {
  const voltar = useMemo(telaDeOrigem, []);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <Link to={voltar} aria-label="Voltar ao sistema">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar <span className="hidden sm:inline">ao sistema</span>
            </Link>
          </Button>
          <span className="h-5 w-px bg-border" aria-hidden />
          <Link to="/ajuda" className="flex items-center gap-2 rounded-md">
            <MarcaSimbolo className="size-7" />
            <span className="text-base font-bold tracking-tight">Ajuda</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

function Etiqueta({
  icone: Icone,
  children,
}: {
  icone: typeof KeyRound;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium">
      <Icone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </span>
  );
}

/**
 * Ajuda do sistema (wireframe `docs/ui/wireframes/ajuda.html`, aprovado em 15/10/2026): índice à esquerda,
 * a página no centro e "Nesta página" à direita. No celular, o índice abre acima da página. Abre em tela cheia,
 * sem o menu do sistema; o "Voltar ao sistema" leva à última tela aberta (`telaDeOrigem`).
 */
export default function AjudaPage() {
  const { modulo: moduloId, pagina: paginaId } = useParams();
  const { hash } = useLocation();
  const modulos = useAjuda();
  const topoRef = useRef<HTMLDivElement>(null);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const visiveis = useMemo(
    () =>
      new Set(modulos.flatMap((m) => m.paginas.map((p) => `${m.id}/${p.id}`))),
    [modulos],
  );

  const sequencia = modulos.flatMap((m) =>
    m.paginas.map((p) => ({ modulo: m, pagina: p })),
  );
  const indice = sequencia.findIndex(
    (s) => s.modulo.id === moduloId && s.pagina.id === paginaId,
  );
  const atual = sequencia[indice];

  // Ao trocar de página, volta ao topo; com `#secao`, rola até a seção.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const t = window.setTimeout(
      () => rolarAte(decodeURIComponent(hash.slice(1))),
      50,
    );
    return () => window.clearTimeout(t);
  }, [moduloId, paginaId, hash]);

  if (!modulos.length)
    return (
      <MolduraDaAjuda>
        <EmptyState icon={BookOpen} title="Nada na ajuda por aqui" />
      </MolduraDaAjuda>
    );
  // `/ajuda` abre a primeira página; `/ajuda/vendas` abre a primeira página de Vendas.
  if (!paginaId) {
    const destino =
      modulos.find((m) => m.id === moduloId)?.paginas[0] ??
      modulos[0].paginas[0];
    return <Navigate to={urlDaPagina(destino)} replace />;
  }

  const anterior = sequencia[indice - 1];
  const proxima = sequencia[indice + 1];
  const verTambem = atual ? resolverVerTambem(atual.pagina, modulos) : [];
  const secoes = atual
    ? [
        ...atual.pagina.secoes,
        ...(verTambem.length
          ? [{ id: ID_VER_TAMBEM, titulo: "Ver também" }]
          : []),
      ]
    : [];
  const p = atual?.pagina;

  return (
    <MolduraDaAjuda>
      <div
        ref={topoRef}
        className="scroll-mt-20 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[220px_minmax(0,1fr)_200px]"
      >
        <aside className="hidden lg:block">
          <div className="sticky top-14 -mt-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-6 pr-1 pt-1">
            <IndiceDaAjuda
              modulos={modulos}
              atual={{ modulo: moduloId ?? "", pagina: paginaId }}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Celular e tablet: o índice abre aqui, acima da página. */}
          <div className="mb-4 rounded-lg border lg:hidden">
            <button
              type="button"
              onClick={() => setIndiceAberto((v) => !v)}
              aria-expanded={indiceAberto}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium"
            >
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">
                {atual
                  ? `${atual.modulo.titulo} · ${atual.pagina.titulo}`
                  : "Índice da ajuda"}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  indiceAberto && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {indiceAberto ? (
              <div className="border-t p-3">
                <IndiceDaAjuda
                  modulos={modulos}
                  atual={{ modulo: moduloId ?? "", pagina: paginaId }}
                  onNavegar={() => setIndiceAberto(false)}
                />
              </div>
            ) : null}
          </div>

          {!atual || !p ? (
            <EmptyState
              icon={SearchX}
              title="Página da ajuda não encontrada"
              description="Ela pode ter mudado de lugar ou depender de uma permissão que as suas funções não incluem."
              action={
                <Button asChild variant="outline">
                  <Link to="/ajuda">Abrir o início da ajuda</Link>
                </Button>
              }
            />
          ) : (
            <article className="mx-auto max-w-[720px] pb-12 lg:pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {atual.modulo.titulo}
              </p>
              <h1 className="mt-1 text-[28px] font-bold leading-9 tracking-tight">
                {p.titulo}
              </h1>
              {p.resumo ? (
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                  {p.resumo}
                </p>
              ) : null}

              {p.permissoes || p.tela ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.permissoes ? (
                    <Etiqueta icone={KeyRound}>
                      Precisa de:{" "}
                      {p.permissoes
                        .map((c) => TITULO_PERMISSAO[c] ?? c)
                        .join(" ou ")}
                    </Etiqueta>
                  ) : null}
                  {p.tela && p.url ? (
                    <Link
                      to={p.url}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                      Abrir a tela: {p.tela}
                    </Link>
                  ) : p.tela ? (
                    <Etiqueta icone={MapPin}>Onde fica: {p.tela}</Etiqueta>
                  ) : null}
                </div>
              ) : null}

              <MarkdownDaAjuda
                texto={p.corpo}
                modulo={p.modulo}
                visiveis={visiveis}
              />

              {verTambem.length ? (
                <>
                  <h2
                    id={ID_VER_TAMBEM}
                    className="mt-10 scroll-mt-20 text-xl font-bold tracking-tight"
                  >
                    Ver também
                  </h2>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {verTambem.map((v) => (
                      <Link
                        key={`${v.modulo}/${v.id}`}
                        to={urlDaPagina(v)}
                        className="flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium transition-colors hover:border-primary/50"
                      >
                        <BookOpen
                          className="size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        {v.titulo}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="mt-12 flex flex-col gap-3 border-t pt-5 sm:flex-row">
                {anterior ? (
                  <Link
                    to={urlDaPagina(anterior.pagina)}
                    className="flex flex-col gap-0.5 rounded-lg border px-4 py-3 transition-colors hover:border-primary/50 sm:max-w-[48%] sm:min-w-[200px]"
                  >
                    <span className="text-xs text-muted-foreground">
                      Anterior
                    </span>
                    <span className="font-semibold text-primary">
                      {anterior.pagina.titulo}
                    </span>
                  </Link>
                ) : null}
                {proxima ? (
                  <Link
                    to={urlDaPagina(proxima.pagina)}
                    className="flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-right transition-colors hover:border-primary/50 sm:ml-auto sm:max-w-[48%] sm:min-w-[200px]"
                  >
                    <span className="text-xs text-muted-foreground">
                      Próxima
                    </span>
                    <span className="font-semibold text-primary">
                      {proxima.pagina.titulo}
                    </span>
                  </Link>
                ) : null}
              </div>
              {p.atualizado ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Atualizado em {p.atualizado}
                </p>
              ) : null}
            </article>
          )}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pt-4">
            <NestaPagina
              key={`${moduloId}/${paginaId}`}
              secoes={secoes}
              onTopo={() =>
                topoRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            />
          </div>
        </aside>
      </div>
    </MolduraDaAjuda>
  );
}
