import { useState } from 'react';
import { Check, Clock, Loader2, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { MoneyValue } from '@/components/common/MoneyValue';
import { formatCurrency, formatDateTime, formatDate } from '../utils';
import { InfoField, FieldGrid } from './InfoField';
import { useRegistrarCobranca } from '../hooks';
import type { OrdemServicoDetalhe } from '../services';

interface OrdemCobrancaPanelProps {
  ordem: OrdemServicoDetalhe;
}

type CobrancaEstado = 'nao_liberada' | 'liberada' | 'realizada';

const STEPS: { key: CobrancaEstado; label: string }[] = [
  { key: 'nao_liberada', label: 'Não liberada' },
  { key: 'liberada', label: 'Liberada' },
  { key: 'realizada', label: 'Cobrança realizada' },
];

function Stepper({ estado }: { estado: CobrancaEstado }) {
  const currentIdx = STEPS.findIndex((s) => s.key === estado);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step.key} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold',
                  done && 'border-green-500 bg-green-500 text-white',
                  current && !done && 'border-primary bg-primary/10 text-primary',
                  !done && !current && 'border-border bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('whitespace-nowrap text-xs font-semibold', done || current ? 'text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 mb-5 h-0.5 flex-1', i < currentIdx ? 'bg-green-500' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OrdemCobrancaPanel({ ordem }: OrdemCobrancaPanelProps) {
  const { pode } = usePermissoes();
  const canViewOrderValues = pode('financeiro.ver_valores');
  const canRegistrar = pode('financeiro.registrar_cobranca');
  const { toast } = useToast();
  const registrarMutation = useRegistrarCobranca(ordem.id);

  const [numeroNf, setNumeroNf] = useState('');
  const [dataCobranca, setDataCobranca] = useState('');

  const estado: CobrancaEstado = ordem.cobranca_realizada
    ? 'realizada'
    : ordem.liberada_para_cobranca
      ? 'liberada'
      : 'nao_liberada';

  const handleRegistrar = () => {
    registrarMutation.mutate(
      {
        numero_nf: numeroNf ? Number(numeroNf) : null,
        data_cobranca: dataCobranca || null,
      },
      {
        onSuccess: () => {
          toast({ title: 'Cobrança registrada', description: 'A cobrança foi registrada com sucesso.' });
          setNumeroNf('');
          setDataCobranca('');
        },
        onError: () => {
          toast({ title: 'Erro ao registrar cobrança', description: 'Não foi possível concluir a operação.', variant: 'destructive' });
        },
      },
    );
  };

  const cardCopy: Record<CobrancaEstado, { title: string; description: string; icon: React.ReactNode; tone: string }> = {
    nao_liberada: {
      title: 'Não liberada para cobrança',
      description: 'Esta OS ainda não foi liberada. O registro de cobrança só fica disponível depois da liberação.',
      icon: <Clock className="h-5 w-5" />,
      tone: 'border-border bg-card',
    },
    liberada: {
      title: 'Liberada, aguardando faturamento',
      description: 'A OS está liberada para cobrança — falta registrar o número da nota fiscal.',
      icon: <ReceiptText className="h-5 w-5" />,
      tone: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-900/10',
    },
    realizada: {
      title: 'Cobrança realizada',
      description: 'O faturamento desta OS foi concluído.',
      icon: <Check className="h-5 w-5" />,
      tone: 'border-green-200 bg-green-50/60 dark:border-green-900/40 dark:bg-green-900/10',
    },
  };

  const copy = cardCopy[estado];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-6">
        <Stepper estado={estado} />
      </div>

      <div className={cn('overflow-hidden rounded-2xl border', copy.tone)}>
        <div className="flex items-start gap-4 px-[22px] py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-background/80 text-foreground">
            {copy.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">{copy.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        {estado === 'liberada' && (
          <div className="border-t border-border/60 px-[22px] py-4">
            <FieldGrid>
              <InfoField label="Liberada em" value={formatDateTime(ordem.liberada_para_cobranca_em)} />
              <InfoField label="Liberada por" value={ordem.liberada_para_cobranca_por_nome} />
            </FieldGrid>
          </div>
        )}

        {estado === 'realizada' && (
          <div className="border-t border-border/60 px-[22px] py-4">
            <FieldGrid>
              <InfoField label="Número da NF" value={ordem.numero_nf ? String(ordem.numero_nf) : null} />
              <InfoField label="Data da cobrança" value={formatDate(ordem.data_cobranca)} />
              <InfoField label="Registrada por" value={ordem.cobranca_realizada_por_nome} />
            </FieldGrid>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 px-[22px] py-4">
          <div className="flex gap-8">
            {canViewOrderValues && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Valor</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  <MoneyValue value={ordem.valor} formatter={formatCurrency} />
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Forma</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{ordem.forma_pagamento_display}</p>
            </div>
          </div>

          {estado === 'liberada' && canRegistrar && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="cobranca-nf" className="text-xs">Número da NF</Label>
                <Input
                  id="cobranca-nf"
                  type="number"
                  value={numeroNf}
                  onChange={(e) => setNumeroNf(e.target.value)}
                  className="h-9 w-32 border-border bg-background text-sm"
                  placeholder="Ex.: 4823"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cobranca-data" className="text-xs">Data</Label>
                <Input
                  id="cobranca-data"
                  type="date"
                  value={dataCobranca}
                  onChange={(e) => setDataCobranca(e.target.value)}
                  className="h-9 border-border bg-background text-sm"
                />
              </div>
              <Button
                variant="hero"
                className="h-9"
                onClick={handleRegistrar}
                disabled={registrarMutation.isPending}
              >
                {registrarMutation.isPending
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Check className="mr-1.5 h-4 w-4" />}
                Registrar cobrança
              </Button>
            </div>
          )}

          {estado === 'liberada' && !canRegistrar && (
            <span className="text-xs font-medium text-muted-foreground">
              Somente Financeiro ou Diretoria registram a cobrança
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
