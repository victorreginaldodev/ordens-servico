import { useEffect } from 'react';
import { Check, Circle, Loader2, ShieldAlert, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Conferencia, Verificacao } from '../services';
import type { useChecagemDaConferencia } from '../useChecagemDaConferencia';

/**
 * Checagem animada da conferência do faturamento: ao clicar em "Verificar de novo", mostra cada etapa sendo
 * conferida, com barra de progresso, mesmo que o backend responda antes. O ritmo é proposital: a pessoa vê o que o
 * sistema checa (pedido do usuário em 14/10/2026, para dar confiança). As contagens são as reais da resposta.
 */

const PASSO_MS = 420;
const PASSO_MS_REDUZIDO = 90;
const ESPERA_NO_FIM_MS = 900;

interface Etapa {
  chave: string;
  texto: string;
  verificacao?: Verificacao;
}

const movimentoReduzido = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** As etapas: buscar os dados, uma por verificação (com os títulos da consulta anterior) e fechar o resultado. */
function montarEtapas(titulos: { codigo: string; titulo: string }[], resultado: Conferencia | null): Etapa[] {
  const porCodigo = new Map<string, Verificacao>(resultado?.verificacoes.map((v) => [v.codigo, v]) ?? []);
  const lista = resultado ? resultado.verificacoes.map((v) => ({ codigo: v.codigo, titulo: v.titulo })) : titulos;
  return [
    { chave: 'buscar', texto: 'Buscando as vendas, os serviços e as tarefas' },
    ...lista.map((t) => ({ chave: t.codigo, texto: t.titulo, verificacao: porCodigo.get(t.codigo) })),
    { chave: 'fechar', texto: 'Fechando o resultado' },
  ];
}

export function ChecagemDaConferencia({
  checagem,
  titulosAnteriores,
  onFechar,
}: {
  checagem: ReturnType<typeof useChecagemDaConferencia>;
  titulosAnteriores: { codigo: string; titulo: string }[];
  onFechar: () => void;
}) {
  const { fase, setFase, passo, setPasso, resultado, iniciar } = checagem;
  const etapas = montarEtapas(titulosAnteriores, resultado);
  const total = etapas.length;

  // Avança uma etapa por vez. Depois de "buscar", só segue quando a resposta chegou (se o backend demorar, espera).
  useEffect(() => {
    if (fase !== 'rodando') return;
    if (passo >= total) {
      const t = setTimeout(() => setFase('concluido'), movimentoReduzido() ? 0 : ESPERA_NO_FIM_MS);
      return () => clearTimeout(t);
    }
    if (passo >= 1 && !resultado) return;
    const t = setTimeout(() => setPasso((p) => p + 1), movimentoReduzido() ? PASSO_MS_REDUZIDO : PASSO_MS);
    return () => clearTimeout(t);
  }, [fase, passo, total, resultado, setFase, setPasso]);

  if (fase === 'parado') return null;

  const concluidas = Math.min(passo, total);
  const percentual = fase === 'concluido' ? 100 : Math.round((concluidas / total) * 100);
  const atual = etapas[Math.min(passo, total - 1)];
  const atencoes = resultado?.verificacoes.filter((v) => v.tipo === 'atencao').reduce((s, v) => s + v.quantidade, 0) ?? 0;
  const falhas = resultado?.verificacoes.filter((v) => v.tipo === 'garantia').reduce((s, v) => s + v.quantidade, 0) ?? 0;
  const hora = resultado ? new Date(resultado.verificado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  if (fase === 'concluido') {
    const ok = !atencoes && !falhas;
    return (
      <div
        role="status"
        className={cn(
          'mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-in',
          falhas ? 'border-danger/40 bg-danger-subtle text-danger-strong' : ok ? 'border-success/40 bg-success-subtle text-success-strong' : 'border-warning/40 bg-warning-subtle text-warning-strong',
        )}
      >
        {ok ? <ShieldCheck className="size-5 shrink-0" aria-hidden /> : <ShieldAlert className="size-5 shrink-0" aria-hidden />}
        <span className="min-w-0 flex-1">
          <b>Checagem concluída às {hora}.</b>{' '}
          {plural(resultado?.verificacoes.length ?? 0, 'verificação feita', 'verificações feitas')}
          {falhas ? ` · ${plural(falhas, 'item fora de sincronia', 'itens fora de sincronia')} (use "Corrigir agora")` : ' · as garantias estão em dia'}
          {atencoes ? ` · ${plural(atencoes, 'ponto', 'pontos')} para olhar` : ''}.
        </span>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Fechar o resumo da checagem" onClick={onFechar}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <section className="mb-4 overflow-hidden rounded-xl border bg-card shadow-sm" aria-busy={fase === 'rodando'}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {fase === 'erro' ? <TriangleAlert className="size-5 text-danger-strong" aria-hidden /> : <Loader2 className="size-5 animate-spin text-primary" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{fase === 'erro' ? 'Não foi possível concluir a checagem' : 'Checando o faturamento…'}</p>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {fase === 'erro' ? 'Verifique a conexão e tente de novo.' : `Etapa ${Math.min(passo + 1, total)} de ${total}: ${atual.texto}`}
          </p>
        </div>
        {fase === 'erro' ? (
          <Button size="sm" variant="outline" onClick={iniciar}>
            Tentar de novo
          </Button>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">{percentual}%</span>
        )}
      </div>
      <Progress value={percentual} className="h-1.5 rounded-none" aria-label="Progresso da checagem" />
      <ol className="grid gap-1 px-4 py-3">
        {etapas.map((e, i) => {
          const feita = i < passo;
          const ativa = i === passo && fase === 'rodando';
          const v = e.verificacao;
          const problema = feita && v && v.quantidade > 0;
          return (
            <li
              key={e.chave}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-colors duration-300',
                ativa && 'bg-muted',
                !feita && !ativa && 'text-muted-foreground/70',
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center">
                {ativa ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                ) : feita ? (
                  problema ? (
                    <TriangleAlert className={cn('size-4 animate-in zoom-in-50', v.tipo === 'garantia' ? 'text-danger-strong' : 'text-warning-strong')} aria-hidden />
                  ) : (
                    <Check className="size-4 animate-in zoom-in-50 text-success-strong" aria-hidden />
                  )
                ) : (
                  <Circle className="size-3" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{e.texto}</span>
              {feita && v ? (
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold tabular-nums animate-in fade-in',
                    v.quantidade === 0 ? 'text-success-strong' : v.tipo === 'garantia' ? 'text-danger-strong' : 'text-warning-strong',
                  )}
                >
                  {v.quantidade === 0 ? 'ok' : v.quantidade}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
