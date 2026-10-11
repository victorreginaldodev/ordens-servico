import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalogos } from '@/features/catalogo/hooks';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { useAcrescentarServico } from '../hooks';
import type { Prioridade } from '../services';
import { SeletorBusca } from './SeletorBusca';

/** Acrescentar um serviço a uma venda já registrada: avisa só o setor dele (ADR 0008, 5). */
export function AcrescentarServicoModal({ venda, onClose }: { venda: { id: number; cliente: string } | null; onClose: () => void }) {
  const { toast } = useToast();
  const catalogosQ = useCatalogos();
  const acrescentar = useAcrescentarServico();
  const [catalogo, setCatalogo] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (venda) {
      setCatalogo(null);
      setDescricao('');
      setPrioridade('');
      setErro('');
    }
  }, [venda]);

  const ativos = (catalogosQ.data ?? []).filter((c) => c.ativo);
  const escolhido = ativos.find((c) => c.id === catalogo);

  const confirmar = () => {
    if (!venda) return;
    if (!catalogo) return setErro('Escolha o serviço do catálogo.');
    if (!descricao.trim()) return setErro('Descreva o serviço (local, escopo).');
    acrescentar.mutate(
      { ordem_servico: venda.id, catalogo, descricao: descricao.trim(), ...(prioridade ? { prioridade } : {}) },
      {
        onSuccess: () => {
          toast({ title: `${escolhido?.nome ?? 'Serviço'} acrescentado`, description: escolhido?.setorNome ? `${escolhido.setorNome} recebeu o serviço na fila.` : undefined });
          onClose();
        },
        onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível acrescentar. Tente de novo.')),
      },
    );
  };

  return (
    <Dialog open={!!venda} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Acrescentar serviço</DialogTitle>
          <DialogDescription>
            OS {venda?.id} · {venda?.cliente}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ac-cat">Catálogo</Label>
            <SeletorBusca
              id="ac-cat"
              opcoes={ativos.map((c) => ({ valor: c.id, rotulo: c.nome, grupo: c.setorNome ?? 'Sem setor', detalhe: c.setorNome ?? undefined }))}
              valor={catalogo}
              onChange={(v) => {
                setCatalogo(v);
                setErro('');
              }}
              placeholder="Escolha o serviço"
              vazio="Nenhum catálogo ativo com esse nome."
              carregando={catalogosQ.isLoading}
            />
            {escolhido?.setorNome ? <span className="text-xs text-muted-foreground">Vai para a fila de {escolhido.setorNome}.</span> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ac-desc">Descrição</Label>
            <Input id="ac-desc" placeholder="Ex.: fábrica e depósito" value={descricao} onChange={(e) => { setDescricao(e.target.value); setErro(''); }} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ac-pri">Prioridade</Label>
            <select id="ac-pri" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade | '')} className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-48">
              <option value="">Da venda</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          {erro ? <p className="text-sm text-danger-strong">{erro}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={acrescentar.isPending}>
            {acrescentar.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Acrescentar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
