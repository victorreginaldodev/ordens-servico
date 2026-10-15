import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { useDeleteClient, useMudarAtivoCliente } from '../hooks';
import type { ClienteDaLista } from '../services';

/** Etapas do modal de exclusão: confirmar e, se o cliente tem vendas (409), desativar em vez de excluir. */
export type EtapaExclusao = { tipo: 'excluir' | 'tem-vendas'; cliente: ClienteDaLista };

interface Props {
  etapa: EtapaExclusao | null;
  onEtapa: (etapa: EtapaExclusao | null) => void;
}

export function ClienteExclusaoModal({ etapa, onEtapa }: Props) {
  const { toast } = useToast();
  const excluir = useDeleteClient();
  const mudarAtivo = useMudarAtivoCliente();
  const cliente = etapa?.cliente;
  const fechar = () => onEtapa(null);

  const confirmar = () => {
    if (!cliente) return;
    excluir.mutate(String(cliente.id), {
      onSuccess: () => {
        toast({ title: 'Cliente excluído', description: cliente.nome });
        fechar();
      },
      onError: (error) => {
        // 409: o cliente tem vendas (a OS protege o cliente). A saída é desativar.
        if (statusDoErro(error) === 409) onEtapa({ tipo: 'tem-vendas', cliente });
        else toast({ title: 'Não foi possível excluir', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' });
      },
    });
  };

  const desativar = () => {
    if (!cliente) return;
    mudarAtivo.mutate(
      { id: cliente.id, ativo: false },
      {
        onSuccess: () => {
          toast({ title: 'Cliente desativado', description: cliente.nome });
          fechar();
        },
        onError: (error) => toast({ title: 'Não foi possível desativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={!!etapa} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="sm:max-w-md">
        {cliente && etapa?.tipo === 'excluir' && (
          <>
            <DialogHeader>
              <DialogTitle>Excluir {cliente.nome}?</DialogTitle>
              <DialogDescription>
                O cadastro sai do sistema e não pode ser recuperado. Se o cliente já tem vendas, o sistema não deixa excluir: desative-o para
                tirá-lo de uso sem perder o histórico.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmar} disabled={excluir.isPending}>
                Excluir
              </Button>
            </DialogFooter>
          </>
        )}
        {cliente && etapa?.tipo === 'tem-vendas' && (
          <>
            <DialogHeader>
              <DialogTitle>{cliente.nome} tem vendas</DialogTitle>
              <DialogDescription>
                Um cliente com vendas não pode ser excluído.
                {cliente.ativo
                  ? ' Você pode desativá-lo: ele deixa de aparecer na escolha do cliente da nova venda e continua nas vendas já feitas.'
                  : ' Ele já está inativo e não aparece na escolha do cliente da nova venda.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={fechar}>
                {cliente.ativo ? 'Cancelar' : 'Fechar'}
              </Button>
              {cliente.ativo && (
                <Button onClick={desativar} disabled={mudarAtivo.isPending}>
                  Desativar
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
