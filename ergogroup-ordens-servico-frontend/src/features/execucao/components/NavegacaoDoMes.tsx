import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TODO_O_PERIODO, mesDe, rotuloDoMes, somarMeses } from '../mesDosConcluidos';

/** ‹ Outubro de 2026 › e o botão do período todo. */
export function NavegacaoDoMes({ mes, onMudar, compacto = false }: { mes: string; onMudar: (mes: string) => void; compacto?: boolean }) {
  const atual = mesDe(new Date());
  if (mes === TODO_O_PERIODO) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="font-medium">Todo o período</span>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => onMudar(atual)}>
          Voltar ao mês atual
        </Button>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1', compacto ? 'text-xs' : 'text-sm')}>
      <Button size="icon" variant="ghost" className={compacto ? 'size-6' : 'size-8'} aria-label="Mês anterior" onClick={() => onMudar(somarMeses(mes, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className={cn('text-center font-medium tabular-nums', compacto ? 'min-w-16' : 'min-w-36')}>{rotuloDoMes(mes, compacto)}</span>
      <Button size="icon" variant="ghost" className={compacto ? 'size-6' : 'size-8'} aria-label="Próximo mês" disabled={mes >= atual} onClick={() => onMudar(somarMeses(mes, 1))}>
        <ChevronRight className="size-4" />
      </Button>
      <Button size="sm" variant={compacto ? 'link' : 'outline'} className={cn('gap-1.5', compacto ? 'ml-auto h-6 px-0 text-xs' : 'ml-1 h-8')} onClick={() => onMudar(TODO_O_PERIODO)}>
        {compacto ? null : <History className="size-3.5" />}
        {compacto ? 'Ver tudo' : 'Ver todo o período'}
      </Button>
    </span>
  );
}
