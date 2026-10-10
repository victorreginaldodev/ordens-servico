import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRegistrarCobrancaOperacional } from '../hooksOperacional';
import { OperationalOrderItem } from '../servicesOperacional';

interface OperationalOrderCobrancaDialogProps {
  item: OperationalOrderItem | null;
  onOpenChange: (open: boolean) => void;
}

export function OperationalOrderCobrancaDialog({ item, onOpenChange }: OperationalOrderCobrancaDialogProps) {
  const [numeroNf, setNumeroNf] = useState('');
  const registrarCobranca = useRegistrarCobrancaOperacional();
  const { toast } = useToast();

  useEffect(() => {
    setNumeroNf('');
  }, [item]);

  const handleSubmit = () => {
    if (!item || !numeroNf.trim()) return;
    registrarCobranca.mutate(
      { id: item.id, numeroNf: numeroNf.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Cobrança registrada', description: 'A cobrança foi registrada com sucesso.' });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Erro ao registrar cobrança', description: 'Não foi possível concluir a operação.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cobrança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero-nf">Número da NF</Label>
            <Input
              id="numero-nf"
              value={numeroNf}
              onChange={(e) => setNumeroNf(e.target.value)}
              className="bg-background border-border"
              placeholder="Ex.: 12345"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="hero"
              disabled={!numeroNf.trim() || registrarCobranca.isPending}
              onClick={handleSubmit}
            >
              {registrarCobranca.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
