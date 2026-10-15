import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Ação de linha das tabelas da execução: só o ícone, sem borda; o que ela faz aparece no tooltip e no
 * `aria-label` (fluxos-e-navegacao.md §6.2.7, terceira rodada).
 */
export function AcaoComIcone({
  rotulo,
  icone: Icone,
  onClick,
  desabilitado,
  className,
}: {
  rotulo: string;
  icone: LucideIcon;
  onClick: () => void;
  desabilitado?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className={cn('size-8', className)} aria-label={rotulo} disabled={desabilitado} onClick={onClick}>
          <Icone className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{rotulo}</TooltipContent>
    </Tooltip>
  );
}
