import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Conferencia } from '../services';

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * A conferência do faturamento como um item pequeno no cabeçalho de Cobranças (pedido do usuário em 19/10/2026,
 * no lugar da faixa grande): um ponto colorido e o resumo; ao abrir, as verificações com problema, "Verificar de
 * novo" e o atalho para a conferência completa.
 */
export function ResumoDaConferencia({
  conferencia,
  carregando,
  atualizando,
  onVerificar,
}: {
  conferencia: Conferencia | undefined;
  carregando: boolean;
  atualizando: boolean;
  onVerificar: () => void;
}) {
  if (carregando || !conferencia) {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Conferindo…
      </span>
    );
  }
  const falhas = conferencia.verificacoes.filter((v) => v.tipo === 'garantia' && v.quantidade > 0);
  const atencoes = conferencia.verificacoes.filter((v) => v.tipo === 'atencao' && v.quantidade > 0);
  const totalFalhas = falhas.reduce((s, v) => s + v.quantidade, 0);
  const pontos = atencoes.reduce((s, v) => s + v.quantidade, 0);
  const hora = new Date(conferencia.verificado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const estado = totalFalhas ? 'falha' : pontos ? 'atencao' : 'ok';
  const rotulo = totalFalhas
    ? `${plural(totalFalhas, 'item fora', 'itens fora')} de sincronia`
    : pontos
      ? `Conferência · ${plural(pontos, 'ponto', 'pontos')}`
      : 'Tudo conferido';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium hover:bg-accent',
            estado === 'falha' && 'border-danger/40 bg-danger-subtle text-danger-strong hover:bg-danger-subtle',
          )}
          aria-label={`Conferência do faturamento: ${rotulo}. Verificada às ${hora}.`}
        >
          <span
            className={cn('size-2 rounded-full', estado === 'ok' ? 'bg-success' : estado === 'atencao' ? 'bg-warning' : 'bg-danger')}
            aria-hidden
          />
          {rotulo}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-3">
        <p className="text-sm font-semibold">Conferência do faturamento</p>
        <p className="text-xs text-muted-foreground">Verificada às {hora} · vendas e OS operacionais</p>
        {falhas.length || atencoes.length ? (
          <ul className="my-2 grid">
            {[...falhas, ...atencoes].map((v) => (
              <li key={v.codigo} className="flex justify-between gap-3 border-b border-dashed py-1.5 text-sm last:border-0">
                <span className="min-w-0">{v.titulo}</span>
                <span className={cn('shrink-0 font-semibold tabular-nums', v.tipo === 'garantia' ? 'text-danger-strong' : 'text-warning-strong')}>
                  {v.quantidade}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="my-2 text-sm text-success-strong">Todo trabalho concluído está numa cobrança liberada ou em execução.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onVerificar} disabled={atualizando}>
            <RefreshCw className={cn('size-3.5', atualizando && 'animate-spin')} /> Verificar de novo
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/cobrancas/conferencia">{totalFalhas ? 'Corrigir na conferência' : 'Abrir conferência'}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
