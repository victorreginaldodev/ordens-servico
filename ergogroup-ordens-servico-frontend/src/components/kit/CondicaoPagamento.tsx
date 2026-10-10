import { cn } from '@/lib/utils';
import { TipoCondicaoBadge } from './DefBadges';

export interface CondicaoPagamentoProps {
  tipo?: string | null;
  /** Texto pronto do backend (`condicao_resumo`), o mesmo do comercial, do financeiro e dos e-mails. */
  resumo?: string | null;
  className?: string;
}

/**
 * Condição de pagamento da venda. Sem `financeiro.ver_valores` o backend não envia a condição:
 * o componente mostra um traço, sem tratar como erro.
 */
export function CondicaoPagamento({ tipo, resumo, className }: CondicaoPagamentoProps) {
  if (!tipo && !resumo) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn('flex flex-col items-start gap-1', className)}>
      {tipo ? <TipoCondicaoBadge value={tipo} /> : null}
      {resumo ? <span className="text-sm text-muted-foreground">{resumo}</span> : null}
    </span>
  );
}
