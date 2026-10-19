import { useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { AtivoBadge, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { useAlterarFuncoesDoSetor, usePodeEditarFuncao } from '../hooks';
import { funcaoLiberadaNoSetor, type Funcao } from '../services';
import type { ResumoSetor } from '../useResumoSetores';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Outros setores em que a função também está liberada. */
const outrosSetores = (f: Funcao, setorId: number) =>
  f.setores_detalhe.filter((s) => s.id !== setorId).map((s) => s.nome);

// ── Aba "Funções" do detalhe do setor ──────────────────────────────────────

export function FuncoesDoSetor({ resumo, onLiberar }: { resumo: ResumoSetor; onLiberar: () => void }) {
  const { toast } = useToast();
  const { superusuario: podeConfigurar } = usePermissoes();
  const podeEditar = usePodeEditarFuncao();
  const alterar = useAlterarFuncoesDoSetor();
  const { setor, funcoes, membros } = resumo;

  const retirar = (f: Funcao) =>
    alterar.mutate([{ funcao: f, setores: f.setores.filter((id) => id !== setor.id) }], {
      onSuccess: () => toast({ title: 'Função retirada do setor', description: `${f.nome} não pode mais ser usada em ${setor.nome}.` }),
      onError: (error) =>
        toast({ title: 'Não foi possível retirar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
    });

  /** Motivo para não poder retirar a função deste setor, ou `null` se pode. */
  const bloqueio = (f: Funcao, pessoasAqui: number) => {
    if (pessoasAqui > 0) return `${plural(pessoasAqui, 'pessoa usa', 'pessoas usam')} esta função aqui. Troque a função delas no Time antes.`;
    if (f.setores.length === 1) return 'Este é o único setor da função. Toda função precisa estar liberada em ao menos um setor.';
    if (!podeEditar(f)) return 'Somente superusuários alteram funções e permissões.';
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Só estas funções podem ser atribuídas a pessoas em {setor.nome}.
        </p>
        {podeConfigurar && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={onLiberar}>
            <Plus className="size-4" /> Liberar funções
          </Button>
        )}
      </div>

      {funcoes.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhuma função liberada"
          description="Sem funções liberadas, não é possível colocar pessoas neste setor."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {funcoes.map((f) => {
            const pessoasAqui = membros.filter((m) => m.funcao === f.id).length;
            const outros = outrosSetores(f, setor.id);
            const motivo = bloqueio(f, pessoasAqui);
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{f.nome}</span>
                    {!f.ativo && <AtivoBadge ativo={false} />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {pessoasAqui ? plural(pessoasAqui, 'pessoa neste setor', 'pessoas neste setor') : 'Ninguém com esta função aqui'}
                    {outros.length > 0 && ` · também em ${outros.join(', ')}`}
                  </p>
                </div>
                {podeConfigurar &&
                  (motivo ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* span: botão desabilitado não dispara o tooltip */}
                        <span tabIndex={0} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Button variant="ghost" size="sm" disabled className="pointer-events-none">
                            Retirar
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">{motivo}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => retirar(f)} disabled={alterar.isPending}>
                      Retirar
                    </Button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Etapa "Liberar funções" ─────────────────────────────────────────────────

export function EtapaLiberarFuncoes({
  resumo,
  todasAsFuncoes,
  onVoltar,
}: {
  resumo: ResumoSetor;
  todasAsFuncoes: Funcao[];
  onVoltar: () => void;
}) {
  const { toast } = useToast();
  const podeEditar = usePodeEditarFuncao();
  const alterar = useAlterarFuncoesDoSetor();
  const { setor } = resumo;
  const [marcadas, setMarcadas] = useState<number[]>([]);

  const disponiveis = todasAsFuncoes
    .filter((f) => f.ativo && !funcaoLiberadaNoSetor(f, setor.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const alternar = (id: number, marcar: boolean) =>
    setMarcadas((atual) => (marcar ? [...atual, id] : atual.filter((x) => x !== id)));

  const liberar = () => {
    const escolhidas = disponiveis.filter((f) => marcadas.includes(f.id));
    alterar.mutate(
      escolhidas.map((f) => ({ funcao: f, setores: [...f.setores, setor.id] })),
      {
        onSuccess: () => {
          toast({
            title: escolhidas.length === 1 ? 'Função liberada' : `${escolhidas.length} funções liberadas`,
            description: `Agora podem ser atribuídas em ${setor.nome}.`,
          });
          onVoltar();
        },
        onError: (error) =>
          toast({ title: 'Não foi possível liberar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Liberar funções em {setor.nome}</DialogTitle>
        <DialogDescription>
          Escolha as funções que poderão ser atribuídas a pessoas neste setor. Uma função pode ser liberada em vários setores.
        </DialogDescription>
      </DialogHeader>

      {disponiveis.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nada para liberar"
          description="Todas as funções ativas já podem ser usadas neste setor."
          className="py-8"
        />
      ) : (
        <ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
          {disponiveis.map((f) => {
            const permitida = podeEditar(f);
            const outros = outrosSetores(f, setor.id);
            const id = `liberar-funcao-${f.id}`;
            return (
              <li key={f.id}>
                <label
                  htmlFor={id}
                  className={cn('flex items-start gap-3 px-3 py-2.5', permitida ? 'cursor-pointer hover:bg-muted/50' : 'opacity-60')}
                >
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    checked={marcadas.includes(f.id)}
                    onCheckedChange={(v) => alternar(f.id, v === true)}
                    disabled={!permitida}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{f.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {permitida ? `Hoje em ${outros.join(', ') || 'nenhum setor'}` : 'Tem permissões que você não tem'}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
        {disponiveis.length > 0 && (
          <Button onClick={liberar} disabled={!marcadas.length || alterar.isPending}>
            {alterar.isPending ? 'Liberando…' : marcadas.length > 1 ? `Liberar ${marcadas.length} funções` : 'Liberar função'}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
