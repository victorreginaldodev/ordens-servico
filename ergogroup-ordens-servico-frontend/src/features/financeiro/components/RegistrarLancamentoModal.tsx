import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORMA_PAGAMENTO_LABEL } from '@/features/vendas/condicao';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatCurrency } from '@/lib/format';
import { useRegistrarLancamento } from '../hooks';
import type { LinhaDeCobranca } from '../services';

export type OrdemParaLancar = Pick<
  LinhaDeCobranca,
  'ordem_servico_id' | 'cliente_nome' | 'valor' | 'condicao_resumo' | 'forma_pagamento' | 'contato_envio_nf' | 'nome_contato_envio_nf'
>;

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * "Faturar": guarda o check de que a OS foi lançada no sistema financeiro externo (ADR 0007).
 * Referência opcional e data (padrão: hoje). O backend recusa (400) se a OS não estiver liberada.
 */
export function RegistrarLancamentoModal({ ordem, onClose }: { ordem: OrdemParaLancar | null; onClose: () => void }) {
  const { toast } = useToast();
  const registrar = useRegistrarLancamento();
  const [referencia, setReferencia] = useState('');
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (ordem) {
      setReferencia('');
      setData(hoje());
      setErro('');
    }
  }, [ordem]);

  const confirmar = () => {
    if (!ordem) return;
    if (!data) return setErro('Informe a data do lançamento.');
    registrar.mutate(
      { ordemId: ordem.ordem_servico_id, payload: { referencia_lancamento: referencia.trim() || null, data_cobranca: data } },
      {
        onSuccess: () => {
          toast({ title: `OS ${ordem.ordem_servico_id} faturada`, description: `${ordem.cliente_nome}${referencia.trim() ? ` · ref. ${referencia.trim()}` : ''}` });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível registrar. Tente de novo.')),
      },
    );
  };

  return (
    <Dialog open={!!ordem} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar lançamento</DialogTitle>
          <DialogDescription>
            OS {ordem?.ordem_servico_id} · {ordem?.cliente_nome} · {formatCurrency(ordem?.valor)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="block text-xs text-muted-foreground">Condição para lançar no sistema financeiro</span>
              <span className="font-medium">{ordem?.condicao_resumo}</span>
              <span className="block text-xs text-muted-foreground">
                {ordem ? FORMA_PAGAMENTO_LABEL[ordem.forma_pagamento] : ''}
                {ordem?.contato_envio_nf ? ` · NF para ${ordem.nome_contato_envio_nf || ordem.contato_envio_nf} (${ordem.contato_envio_nf})` : ''}
              </span>
            </span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="l-ref">
              Referência no sistema financeiro <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="l-ref" maxLength={100} placeholder="Número da NF ou código do lançamento" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            <span className="text-xs text-muted-foreground">Ajuda a encontrar o lançamento depois. Pode ficar em branco.</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="l-data">Data do lançamento</Label>
            <Input id="l-data" type="date" className="sm:w-48" value={data} onChange={(e) => { setData(e.target.value); setErro(''); }} />
          </div>
          {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={registrar.isPending}>
            {registrar.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Registrar lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
