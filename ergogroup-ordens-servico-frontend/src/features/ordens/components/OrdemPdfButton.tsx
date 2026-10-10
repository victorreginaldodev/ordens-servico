import { useCallback, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { OrdemPdfDocument } from './OrdemPdfDocument';
import type { OrdemServicoDetalhe, ServicoDetalhe, TarefaDetalhe } from '../services';

interface OrdemPdfButtonProps {
  ordem: OrdemServicoDetalhe;
  servicos: ServicoDetalhe[];
  tarefasPorServico: Record<number, TarefaDetalhe[]>;
  disabled?: boolean;
}

// Cede o event loop ao browser antes do layout síncrono e pesado do react-pdf,
// para que o estado "Gerando..." realmente pinte na tela antes do bloqueio.
// Usa setTimeout (não requestAnimationFrame) porque rAF não dispara em abas
// em segundo plano/sem foco, o que travaria a geração indefinidamente.
function yieldToPaint() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function OrdemPdfButton({ ordem, servicos, tarefasPorServico, disabled }: OrdemPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      await yieldToPaint();

      const blob = await pdf(
        <OrdemPdfDocument ordem={ordem} servicos={servicos} tarefasPorServico={tarefasPorServico} />,
      ).toBlob();

      const fileName = `OS-${ordem.id}-${ordem.cliente_detail.nome.replace(/\s+/g, '-')}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Falha ao gerar PDF da OS', ordem.id, error);
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o PDF desta OS. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [ordem, servicos, tarefasPorServico, toast]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 rounded-[10px] px-4 font-bold"
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading
        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
      {loading ? 'Gerando...' : 'Exportar PDF'}
    </Button>
  );
}
