import { X } from 'lucide-react';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useSetores } from '@/features/organizacao/hooks';
import { cn } from '@/lib/utils';

/**
 * "Também executa em" (revisão de permissões, P1): setores, fora o da lotação, em que a pessoa também recebe
 * tarefas, sem acompanhar nem distribuir. Só dá para pôr ou tirar os setores em que quem edita distribui (a mesma
 * regra do backend); os demais aparecem, mas sem o botão de remover.
 */
export function TambemExecutaEmEditor({
  value,
  onChange,
  lotacao,
  disabled,
}: {
  value: number[];
  onChange: (setores: number[]) => void;
  /** Setor da lotação, que não entra na lista. */
  lotacao: number | null;
  disabled?: boolean;
}) {
  const { data: setores = [] } = useSetores();
  const { pode } = usePermissoes();
  const nomePorId = new Map(setores.map((s) => [s.id, s.nome]));
  const podeMexer = (setorId: number) => !disabled && pode('tarefas.distribuir', setorId);
  const disponiveis = setores.filter((s) => s.ativo && s.id !== lotacao && !value.includes(s.id) && podeMexer(s.id));

  return (
    <div className="grid gap-1.5">
      <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5', disabled && 'opacity-60')}>
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
            {nomePorId.get(id) ?? `Setor ${id}`}
            {podeMexer(id) ? (
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Tirar ${nomePorId.get(id) ?? 'o setor'}`}
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </span>
        ))}
        {disponiveis.length ? (
          <select
            aria-label="Adicionar setor"
            value=""
            disabled={disabled}
            onChange={(e) => e.target.value && onChange([...value, Number(e.target.value)])}
            className="h-7 rounded-md bg-transparent px-1 text-sm text-muted-foreground"
          >
            <option value="">+ Adicionar setor</option>
            {disponiveis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        ) : !value.length ? (
          <span className="text-sm text-muted-foreground">Nenhum</span>
        ) : null}
      </div>
      <span className="text-xs text-muted-foreground">
        Recebe tarefas nesses setores, sem acompanhar nem distribuir. Só aparecem os setores em que você distribui.
      </span>
    </div>
  );
}
