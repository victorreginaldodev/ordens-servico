import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Building2, CircleHelp, FileText, Loader2, Plus, Search, User } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/kit';
import { urlDaPagina } from '@/features/ajuda/conteudo';
import { useAjuda } from '@/features/ajuda/useAjuda';
import { useVendas } from '@/features/vendas/hooks';
import { usePermissoes } from '@/hooks/usePermissoes';
import { NAV_ORGANIZACAO, podeVerItem, visibleNavGroups } from './navigation';

const normalize = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const MAX_OS = 8;
const MAX_AJUDA = 6;

/** Resultados de vendas: só monta (e só busca a lista) com a busca aberta e algo digitado. */
function VendasResults({ query, onSelect }: { query: string; onSelect: (url: string) => void }) {
  const { data: ordens = [], isLoading } = useVendas();
  const q = normalize(query.trim().replace(/^(os\s*)?#?/i, ''));
  const results = useMemo(
    () => (q ? ordens.filter((o) => normalize(o.cliente_nome).includes(q) || String(o.id).startsWith(q)).slice(0, MAX_OS) : []),
    [ordens, q],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Buscando vendas…
      </div>
    );
  }
  if (!results.length) return null;
  return (
    <CommandGroup heading="Vendas">
      {results.map((o) => (
        <CommandItem key={o.id} value={`os-${o.id}`} onSelect={() => onSelect(`/vendas/${o.id}`)} className="gap-2.5">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            <span className="tabular-nums text-muted-foreground">OS {o.id}</span> · {o.cliente_nome}
          </span>
          <StatusBadge entity="os" value={o.status} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/** Lupa que abre a busca global na barra do celular (no computador, a busca abre pelo Ctrl+K). */
export function BuscaGatilho({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buscar"
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-4" aria-hidden />
    </button>
  );
}

/** Busca global (Ctrl+K). Montada uma vez no layout; os gatilhos só mudam `open`. */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { pode, podeAlguma, superusuario } = usePermissoes();
  const ajuda = useAjuda();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  const q = normalize(query.trim());
  const matches = (text: string) => !q || normalize(text).includes(q);

  const actions = [
    ...(pode('os.gerenciar') ? [{ label: 'Nova venda', url: '/vendas/nova', icon: Plus }] : []),
    ...(pode('clientes.gerenciar') ? [{ label: 'Novo cliente', url: '/clientes/new', icon: Building2 }] : []),
  ].filter((a) => matches(a.label));

  const pages = [
    ...visibleNavGroups(podeAlguma).flatMap((g) => g.items.map((i) => ({ label: i.title, group: g.title, url: i.url, icon: i.icon }))),
    ...NAV_ORGANIZACAO.items
      .filter((i) => podeVerItem(i, podeAlguma, superusuario))
      .map((i) => ({ label: i.title, group: NAV_ORGANIZACAO.title, url: i.url, icon: i.icon })),
    { label: 'Meu perfil', group: 'Conta', url: '/time/eu', icon: User },
    { label: 'Ajuda', group: 'Conta', url: '/ajuda', icon: CircleHelp },
  ].filter((p) => matches(`${p.label} ${p.group}`) && !actions.some((a) => a.url === p.url));

  // Páginas da Ajuda: só com algo digitado, pelo título e pelo resumo.
  const paginasDaAjuda = q
    ? ajuda
        .flatMap((m) => m.paginas.map((p) => ({ ...p, moduloTitulo: m.titulo })))
        .filter((p) => normalize(`${p.titulo} ${p.resumo} ${p.moduloTitulo}`).includes(q))
        .slice(0, MAX_AJUDA)
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          {/* shouldFilter={false}: filtro próprio (ignora acentos e limita as OS); o do cmdk ficaria lento com centenas de OS. */}
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:h-10 [&_[cmdk-item]]:rounded-md"
          >
            <CommandInput value={query} onValueChange={setQuery} placeholder="Buscar venda (nº da OS ou cliente), página, ação ou ajuda…" />
            <CommandList className="max-h-96 pb-2">
              {q && podeAlguma(['os.gerenciar', 'os.ver_todas']) ? <VendasResults query={query} onSelect={go} /> : null}
              {actions.length ? (
                <CommandGroup heading="Ações">
                  {actions.map((a) => (
                    <CommandItem key={a.url} value={`acao-${a.url}`} onSelect={() => go(a.url)} className="gap-2.5">
                      <a.icon className="size-4 text-muted-foreground" />
                      {a.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {pages.length ? (
                <CommandGroup heading="Ir para">
                  {pages.map((p) => (
                    <CommandItem key={p.url} value={`pagina-${p.url}`} onSelect={() => go(p.url)} className="gap-2.5">
                      <p.icon className="size-4 text-muted-foreground" />
                      <span className="flex-1">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.group}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {paginasDaAjuda.length ? (
                <CommandGroup heading="Ajuda">
                  {paginasDaAjuda.map((p) => (
                    <CommandItem key={urlDaPagina(p)} value={`ajuda-${p.modulo}-${p.id}`} onSelect={() => go(urlDaPagina(p))} className="gap-2.5">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{p.titulo}</span>
                      <span className="text-xs text-muted-foreground">{p.moduloTitulo}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              <CommandEmpty>Nada encontrado para “{query}”.</CommandEmpty>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
