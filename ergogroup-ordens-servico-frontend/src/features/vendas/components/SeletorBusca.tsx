import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface OpcaoDeBusca {
  valor: number;
  rotulo: string;
  /** Texto à direita (ex.: o setor do catálogo). */
  detalhe?: string;
  grupo?: string;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Campo de escolha com busca (cliente, catálogo). Agrupa as opções quando elas trazem `grupo`. */
export function SeletorBusca({
  id,
  opcoes,
  valor,
  onChange,
  placeholder,
  vazio,
  invalido,
  carregando,
}: {
  id?: string;
  opcoes: OpcaoDeBusca[];
  valor: number | null;
  onChange: (valor: number) => void;
  placeholder: string;
  vazio: string;
  invalido?: boolean;
  carregando?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const escolhida = opcoes.find((o) => o.valor === valor);
  const termo = normalizar(busca.trim());
  const filtradas = termo ? opcoes.filter((o) => normalizar(`${o.rotulo} ${o.detalhe ?? ''}`).includes(termo)) : opcoes;
  const grupos = [...new Set(filtradas.map((o) => o.grupo ?? ''))];

  return (
    <Popover open={aberto} onOpenChange={(o) => { setAberto(o); if (!o) setBusca(''); }}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalido || undefined}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            invalido && 'border-danger',
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !escolhida && 'text-muted-foreground')}>
            {escolhida ? escolhida.rotulo : carregando ? 'Carregando…' : placeholder}
          </span>
          {escolhida?.detalhe ? <span className="shrink-0 text-xs text-muted-foreground">{escolhida.detalhe}</span> : null}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={busca} onValueChange={setBusca} placeholder="Buscar…" />
          <CommandList className="max-h-72">
            <CommandEmpty>{vazio}</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g || 'todos'} heading={g || undefined}>
                {filtradas
                  .filter((o) => (o.grupo ?? '') === g)
                  .map((o) => (
                    <CommandItem
                      key={o.valor}
                      value={String(o.valor)}
                      onSelect={() => {
                        onChange(o.valor);
                        setAberto(false);
                        setBusca('');
                      }}
                      className="gap-2"
                    >
                      <Check className={cn('size-4 shrink-0', o.valor === valor ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                      {o.detalhe && !o.grupo ? <span className="shrink-0 text-xs text-muted-foreground">{o.detalhe}</span> : null}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
