import { Lock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useFuncoes, useSetores } from '@/features/organizacao/hooks';
import { funcaoLiberadaNoSetor, type Funcao } from '@/features/organizacao/services';

/** Linha do editor; setor e função ficam nulos até serem escolhidos. */
export interface VinculoLinha {
  setor?: number | null;
  funcao?: number | null;
}

interface VinculosEditorProps {
  value: VinculoLinha[];
  onChange: (value: VinculoLinha[]) => void;
  /** Vínculos que a pessoa já tinha ao abrir o formulário (para travar os que quem edita não pode mexer). */
  originais?: VinculoLinha[];
  disabled?: boolean;
}

/** Setores e funções de uma pessoa: uma linha por setor. */
export function VinculosEditor({ value, onChange, originais = [], disabled }: VinculosEditorProps) {
  const { pode } = usePermissoes();
  const { data: setores = [] } = useSetores();
  const { data: funcoes = [] } = useFuncoes();

  // Ninguém concede permissão que não tem (mesma regra do backend).
  const podeConceder = (funcao: Funcao | undefined, setor: number | null) =>
    !!funcao && funcao.permissoes.every((p) => pode(p, setor));
  const funcaoPorId = new Map(funcoes.map((f) => [f.id, f]));

  const travada = (linha: VinculoLinha) =>
    originais.some((o) => o.setor === linha.setor && o.funcao === linha.funcao) &&
    !podeConceder(funcaoPorId.get(linha.funcao ?? -1), linha.setor);

  const atualizar = (i: number, parcial: Partial<VinculoLinha>) =>
    onChange(value.map((linha, idx) => (idx === i ? { ...linha, ...parcial } : linha)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
          Sem setor, a pessoa só vê as próprias tarefas e OS.
        </p>
      )}

      {value.map((linha, i) => {
        const bloqueada = disabled || travada(linha);
        const usados = new Set(value.filter((_, idx) => idx !== i).map((l) => l.setor));
        const opcoesSetor = setores.filter((s) => (s.ativo || s.id === linha.setor) && !usados.has(s.id));
        // Só as funções liberadas no setor escolhido (a função atual entra mesmo inativa, para aparecer).
        const opcoesFuncao = funcoes.filter(
          (f) => funcaoLiberadaNoSetor(f, linha.setor) && (f.ativo || f.id === linha.funcao),
        );
        const trocarSetor = (setor: number) => {
          const atual = funcaoPorId.get(linha.funcao ?? -1);
          // A função escolhida antes só continua se também for liberada no novo setor.
          atualizar(i, { setor, funcao: atual && funcaoLiberadaNoSetor(atual, setor) ? atual.id : null });
        };

        return (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <Select
              value={linha.setor ? String(linha.setor) : ''}
              onValueChange={(v) => trocarSetor(Number(v))}
              disabled={bloqueada}
            >
              <SelectTrigger aria-label="Setor">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                {opcoesSetor.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={linha.funcao ? String(linha.funcao) : ''}
              onValueChange={(v) => atualizar(i, { funcao: Number(v) })}
              disabled={bloqueada || !linha.setor}
            >
              <SelectTrigger aria-label="Função">
                <SelectValue placeholder={linha.setor ? 'Função' : 'Escolha o setor primeiro'} />
              </SelectTrigger>
              <SelectContent>
                {opcoesFuncao.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhuma função liberada neste setor. Libere funções em Organização › Setores.
                  </p>
                )}
                {opcoesFuncao.map((f) => {
                  const permitida = podeConceder(f, linha.setor);
                  return (
                    <SelectItem key={f.id} value={String(f.id)} disabled={!permitida}>
                      {f.nome}
                      {!permitida && <span className="ml-1.5 text-xs text-muted-foreground">(acima do seu acesso)</span>}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {bloqueada && !disabled ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                    <Lock className="h-4 w-4" aria-label="Vínculo travado" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Esta função tem permissões que você não tem, então você não pode alterá-la.</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                disabled={disabled}
                aria-label="Remover setor"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => onChange([...value, { setor: null, funcao: null }])}
        disabled={disabled || value.length >= setores.filter((s) => s.ativo).length}
      >
        <Plus className="h-4 w-4" />
        Adicionar setor
      </Button>
    </div>
  );
}

