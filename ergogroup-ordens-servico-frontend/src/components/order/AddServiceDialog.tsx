import { useState, useMemo, useEffect } from "react";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/data/mockData";
import { Service, ServiceItem } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  services: Service[];
  existingIds: string[];
  onAdd: (item: ServiceItem) => void;
  itemToEdit?: ServiceItem;
  onUpdate?: (item: ServiceItem) => void;
};

export default function AddServiceDialog({ open, onOpenChange, services, existingIds, onAdd, itemToEdit, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [openSelect, setOpenSelect] = useState(false);
  const selected = useMemo(() => services.find(s => String(s.id) === String(selectedId)), [services, selectedId]);
  const [note, setNote] = useState<string>("");

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  useEffect(() => {
    if (!open) return;
    if (itemToEdit) {
      setSelectedId(String(itemToEdit.serviceId));
      setNote(itemToEdit.note || "");
    } else {
      setSelectedId("");
      setNote("");
    }
  }, [open, itemToEdit]);

  const reset = () => {
    setSelectedId("");
    setNote("");
  };

  const onSelectService = (id: string) => {
    setSelectedId(id);
    setNote("");
  };

  const handleAdd = () => {
    if (!selected) return;
    if (!note || !note.trim()) return;
    const isDuplicate = existingIds.includes(String(selected.id)) && String(selected.id) !== String(itemToEdit?.serviceId);
    if (isDuplicate) return;
    const payload: ServiceItem = {
      id: itemToEdit ? itemToEdit.id : `${Date.now()}`,
      persistedId: itemToEdit?.persistedId,
      serviceId: String(selected.id),
      serviceName: selected.name,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      status: itemToEdit ? itemToEdit.status : "pending",
      note: note || "",
    };
    if (itemToEdit && onUpdate) {
      onUpdate(payload);
    } else {
      onAdd(payload);
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar Serviço</DialogTitle>
          <DialogDescription>Escolha no catálogo e escreva a descrição</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Serviço do catálogo</Label>
            <Popover open={openSelect} onOpenChange={setOpenSelect} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSelect}
                  className="w-full justify-between bg-secondary border-border font-normal"
                >
                  {selectedId
                    ? services.find((s) => String(s.id) === String(selectedId))?.name.toUpperCase()
                    : "SELECIONE UM SERVIÇO"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 z-[9999]" align="start">
                <Command className="w-full">
                  <CommandInput placeholder="BUSCAR SERVIÇO..." />
                  <CommandList className="max-h-[240px] w-full overflow-y-auto overflow-x-hidden">
                    <CommandEmpty>NENHUM SERVIÇO ENCONTRADO.</CommandEmpty>
                    {sortedServices.map((svc) => {
                      const isDisabled = existingIds.includes(String(svc.id)) && String(svc.id) !== String(itemToEdit?.serviceId);
                      return (
                        <CommandItem
                          key={svc.id}
                          value={svc.name}
                          onSelect={() => {
                            if (!isDisabled) {
                              onSelectService(String(svc.id));
                              setOpenSelect(false);
                            }
                          }}
                          disabled={isDisabled}
                          className={cn(isDisabled && "opacity-50 cursor-not-allowed")}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedId === String(svc.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {svc.name.toUpperCase()}
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-secondary border-border min-h-40"
              placeholder="Detalhes ou observações do serviço"
            />
            {(!note || !note.trim()) && <p className="text-sm text-destructive">Informe a descrição do serviço.</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button type="button" variant="hero" onClick={handleAdd} disabled={!selected || !note.trim()}>
              <Plus className="w-4 h-4" />
              {itemToEdit ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
