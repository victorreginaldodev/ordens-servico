import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, Loader2, Plus, Search, User } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/kit';
import { useVendas } from '@/features/vendas/hooks';
import { usePermissoes } from '@/hooks/usePermissoes';
import { cn } from '@/lib/utils';
import { visibleNavGroups } from './navigation';

const normalize = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const MAX_OS = 8;

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

/** Gatilho da busca global, à direita do header. Único lugar da busca no app. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { pode, podeAlguma } = usePermissoes();
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (url: string) => {
    setOpen(false);
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
    { label: 'Meu perfil', group: 'Conta', url: '/time/eu', icon: User },
  ].filter((p) => matches(`${p.label} ${p.group}`) && !actions.some((a) => a.url === p.url));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm transition-colors',
          'hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'w-8 justify-center px-0 sm:w-60 sm:justify-start sm:px-2.5',
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Buscar…</span>
        <kbd className="hidden rounded border border-b-2 bg-background px-1.5 text-2xs font-medium sm:inline">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          {/* shouldFilter={false}: filtro próprio (ignora acentos e limita as OS); o do cmdk ficaria lento com centenas de OS. */}
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:h-10 [&_[cmdk-item]]:rounded-md"
          >
            <CommandInput value={query} onValueChange={setQuery} placeholder="Buscar venda (nº da OS ou cliente), página ou ação…" />
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
              <CommandEmpty>Nada encontrado para “{query}”.</CommandEmpty>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
