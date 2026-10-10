import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useOrdensLista } from '@/features/ordens/hooks';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const OrderSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: orders = [] } = useOrdensLista();

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    return orders
      .filter(
        (o) =>
          o.cliente_nome.toLowerCase().includes(term) ||
          String(o.id).toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [orders, search]);

  const goToSearch = (term: string) => {
    setOpen(false);
    setSearch('');
    navigate(`/ordens?q=${encodeURIComponent(term)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-10 sm:w-80 justify-start bg-secondary border-border text-muted-foreground hover:text-foreground gap-2"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline text-sm font-normal">Buscar OS...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nome do cliente ou ID..."
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                goToSearch(search.trim());
              }
            }}
          />
          <CommandList>
            {!search.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Digite para buscar uma OS
              </div>
            )}
            {search.trim() && filtered.length === 0 && (
              <CommandEmpty>Nenhuma OS encontrada</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Ordens de Serviço">
                {filtered.map((order) => (
                  <CommandItem
                    key={order.id}
                    value={String(order.id)}
                    onSelect={() => goToSearch(order.cliente_nome)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">{order.cliente_nome}</span>
                    <span className="text-xs text-muted-foreground uppercase">#{order.id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default OrderSearch;
