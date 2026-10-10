import { Check, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRUPOS_PERMISSOES, PERMISSOES_SENSIVEIS } from '../permissoesCatalogo';
import type { Funcao, PermissaoDisponivel } from '../services';

interface MatrizFuncoesProps {
  funcoes: Funcao[];
  catalogo: PermissaoDisponivel[];
  onAbrir: (funcao: Funcao) => void;
}

/**
 * Comparação lado a lado: linhas = permissões agrupadas, colunas = funções.
 * Só leitura; clicar no nome da função abre o formulário dela.
 */
export function MatrizFuncoes({ funcoes, catalogo, onAbrir }: MatrizFuncoesProps) {
  const porCodigo = new Map(catalogo.map((p) => [p.codigo, p]));
  const colunas = [...funcoes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 min-w-72 bg-secondary px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_-1px_-1px_0_hsl(var(--border))]">
              Permissão
            </th>
            {colunas.map((f) => (
              <th
                key={f.id}
                scope="col"
                className="sticky top-0 z-10 min-w-28 border-l border-border/70 bg-secondary px-2 py-2 text-center align-bottom text-xs font-semibold uppercase tracking-wide shadow-[inset_0_-1px_0_hsl(var(--border))]"
              >
                <button
                  type="button"
                  onClick={() => onAbrir(f)}
                  className={cn('rounded px-1 uppercase hover:text-primary hover:underline', !f.ativo && 'text-muted-foreground line-through')}
                  title={f.ativo ? `Abrir ${f.nome}` : `${f.nome} (desativada)`}
                >
                  {f.nome}
                </button>
                <span className="mt-0.5 block text-2xs font-normal normal-case tracking-normal text-muted-foreground">
                  {f.setores_detalhe.map((s) => s.nome).join(', ') || '—'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRUPOS_PERMISSOES.map((grupo) => {
            const itens = grupo.permissoes.filter((p) => porCodigo.has(p));
            if (!itens.length) return null;
            return [
              <tr key={`g-${grupo.id}`}>
                <th
                  scope="colgroup"
                  colSpan={colunas.length + 1}
                  className="sticky left-0 border-y bg-muted/40 px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground"
                >
                  {grupo.titulo}
                </th>
              </tr>,
              ...itens.map((codigo) => (
                <tr key={codigo} className="border-b last:border-0 hover:bg-muted/30">
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal shadow-[inset_-1px_0_0_hsl(var(--border))]">
                    <span className="flex items-center gap-1.5">
                      {porCodigo.get(codigo)!.descricao}
                      {PERMISSOES_SENSIVEIS.has(codigo) && <TriangleAlert className="size-3 shrink-0 text-warning-strong" aria-label="Sensível" />}
                    </span>
                  </th>
                  {colunas.map((f) => (
                    <td key={f.id} className="border-l border-border/70 px-2 py-2 text-center">
                      {f.permissoes.includes(codigo) ? (
                        <Check className="mx-auto size-4 text-primary" aria-label="Sim" />
                      ) : (
                        <span className="text-muted-foreground/50" aria-label="Não">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
