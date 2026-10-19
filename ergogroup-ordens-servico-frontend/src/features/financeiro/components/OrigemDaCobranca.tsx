import { Handshake, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Origem } from '../operacional';

const ORIGEM = {
  venda: { rotulo: 'Venda', icone: Handshake, classe: 'bg-info-subtle text-info-strong' },
  // Roxo só para a OS operacional, para ela se destacar das vendas na mesma fila (wireframe lote7, aprovado).
  oso: { rotulo: 'OS operacional', icone: Wrench, classe: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
} as const;

/** De onde vem a cobrança: uma venda ou uma OS operacional. */
export function OrigemDaCobranca({ origem, className }: { origem: Origem; className?: string }) {
  const { rotulo, icone: Icone, classe } = ORIGEM[origem];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-2.5 text-xs font-medium', classe, className)}>
      <Icone className="size-3.5" aria-hidden />
      {rotulo}
    </span>
  );
}
