import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Info, Lock, TriangleAlert } from 'lucide-react';
import { AtivoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import type { Permissao } from '@/lib/permissoes';
import { cn } from '@/lib/utils';
import {
  useAlterarStatusFuncao,
  useExcluirFuncao,
  useOrganizacaoAtual,
  usePermissoesDisponiveis,
  usePodeEditarFuncao,
  useSalvarFuncao,
} from '../hooks';
import { AJUDA_PERMISSAO, DEPENDENCIAS_SUGERIDAS, GRUPOS_PERMISSOES, PERMISSOES_SENSIVEIS } from '../permissoesCatalogo';
import type { Funcao, Membro, Setor } from '../services';

/**
 * Etapas do modal de funções: um único modal troca de conteúdo, nunca um sobre o outro.
 * `form` sem `id` cria; com `copiaDe`, cria a partir de outra função.
 */
export type EtapaFuncao =
  | { tipo: 'form'; id?: number; copiaDe?: number }
  | { tipo: 'desativar'; id: number }
  | { tipo: 'excluir'; id: number };

interface FuncaoModalProps {
  etapa: EtapaFuncao | null;
  onEtapa: (etapa: EtapaFuncao | null) => void;
  funcoes: Funcao[];
  setores: Setor[];
  membros: Membro[];
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function FuncaoModal({ etapa, onEtapa, funcoes, setores, membros }: FuncaoModalProps) {
  const porId = (id?: number) => (id ? funcoes.find((f) => f.id === id) ?? null : null);
  const funcao = etapa && 'id' in etapa ? porId(etapa.id) : null;
  const fechar = () => onEtapa(null);
  const voltar = () => (funcao ? onEtapa({ tipo: 'form', id: funcao.id }) : fechar());
  const membrosDa = (f: Funcao | null) => (f ? membros.filter((m) => m.funcao === f.id) : []);

  // A função sumiu da lista (ex.: excluída em outra aba): fecha em vez de mostrar um modal vazio.
  const sumiu = !!etapa && etapa.tipo !== 'form' && !funcao;
  useEffect(() => {
    if (sumiu) onEtapa(null);
  }, [sumiu, onEtapa]);

  let conteudo: React.ReactNode = null;
  let largura = 'sm:max-w-md';
  if (etapa?.tipo === 'form') {
    largura = 'sm:max-w-3xl';
    conteudo = (
      <EtapaForm
        key={`${etapa.id ?? 'nova'}-${etapa.copiaDe ?? ''}`}
        funcao={funcao}
        copia={etapa.copiaDe ? porId(etapa.copiaDe) : null}
        setores={setores}
        membros={membrosDa(funcao)}
        onFechar={fechar}
        onEtapa={onEtapa}
      />
    );
  } else if (funcao && etapa?.tipo === 'desativar') {
    conteudo = <EtapaDesativar funcao={funcao} membros={membrosDa(funcao)} onVoltar={voltar} onConcluido={fechar} />;
  } else if (funcao && etapa?.tipo === 'excluir') {
    conteudo = (
      <EtapaExcluir
        funcao={funcao}
        membros={membrosDa(funcao)}
        onVoltar={voltar}
        onExcluido={fechar}
        onDesativar={() => onEtapa({ tipo: 'desativar', id: funcao.id })}
      />
    );
  }

  return (
    <Dialog open={!!conteudo} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className={cn('max-h-[90vh] gap-0 overflow-y-auto p-0', largura)}>{conteudo}</DialogContent>
    </Dialog>
  );
}

// ── Formulário (criar, editar, duplicar ou só ver) ──────────────────────────

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da função').max(100, 'Use no máximo 100 caracteres'),
  descricao: z.string().trim().max(500, 'Use no máximo 500 caracteres'),
  setores: z.array(z.number()).min(1, 'Escolha ao menos um setor em que a função pode ser usada'),
  permissoes: z.array(z.string()),
});

type Valores = z.infer<typeof schema>;

function EtapaForm({
  funcao,
  copia,
  setores,
  membros,
  onFechar,
  onEtapa,
}: {
  funcao: Funcao | null;
  copia: Funcao | null;
  setores: Setor[];
  membros: Membro[];
  onFechar: () => void;
  onEtapa: (e: EtapaFuncao | null) => void;
}) {
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const podeEditarFuncao = usePodeEditarFuncao();
  const { data: catalogo = [], isPending: carregandoCatalogo } = usePermissoesDisponiveis();
  const { data: organizacao } = useOrganizacaoAtual();
  const salvar = useSalvarFuncao();

  const base = funcao ?? copia;
  const somenteLeitura = funcao ? !podeEditarFuncao(funcao) : !pode('organizacao.configurar');
  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: funcao?.nome ?? (copia ? `Cópia de ${copia.nome}` : ''),
      descricao: base?.descricao ?? '',
      setores: base?.setores ?? [],
      permissoes: base?.permissoes ?? [],
    },
  });

  const marcadas = form.watch('permissoes') as Permissao[];
  const setoresMarcados = form.watch('setores');
  const porCodigo = useMemo(() => new Map(catalogo.map((p) => [p.codigo, p])), [catalogo]);
  // Setores com pessoas usando a função não podem ser retirados (o backend recusa).
  const pessoasNoSetor = (setorId: number) => membros.filter((m) => m.setor === setorId).length;
  const setoresVisiveis = setores.filter((s) => s.ativo || setoresMarcados.includes(s.id));
  const setoresComPessoas = new Set(membros.map((m) => m.setor));

  const alternar = (campo: 'permissoes' | 'setores', valor: string | number, marcar: boolean) => {
    const atual = form.getValues(campo) as Array<string | number>;
    form.setValue(campo, (marcar ? [...atual, valor] : atual.filter((v) => v !== valor)) as never, {
      shouldDirty: true,
      shouldValidate: campo === 'setores',
    });
  };

  const onSubmit = (v: Valores) =>
    salvar.mutate(
      {
        id: funcao?.id,
        organizacao: organizacao?.id,
        payload: { nome: v.nome, descricao: v.descricao || null, setores: v.setores, permissoes: v.permissoes as Permissao[] },
      },
      {
        onSuccess: (salva) => {
          toast({ title: funcao ? 'Função atualizada' : 'Função criada', description: salva.nome });
          onFechar();
        },
        onError: (error) => {
          const dados = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
          const msg = mensagemDeErro(error, 'Não foi possível salvar a função.');
          if (dados?.nome) form.setError('nome', { message: /único|unique|existe/i.test(msg) ? 'Já existe uma função com este nome.' : msg });
          else if (dados?.setores) form.setError('setores', { message: mensagemDeErro({ response: { data: dados.setores } }, msg) });
          else toast({ title: 'Não foi possível salvar', description: msg, variant: 'destructive' });
        },
      },
    );

  const titulo = funcao ? (somenteLeitura ? funcao.nome : `Editar ${funcao.nome}`) : copia ? `Nova função a partir de ${copia.nome}` : 'Nova função';
  const erroSetores = form.formState.errors.setores?.message;
  const erroNome = form.formState.errors.nome?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      <DialogHeader className="space-y-1.5 border-b px-6 py-5 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          {funcao && <AtivoBadge ativo={funcao.ativo} />}
        </div>
        <DialogDescription>
          {funcao
            ? `${plural(membros.length, 'pessoa tem', 'pessoas têm')} esta função.`
            : 'Dê um nome, escolha onde ela pode ser usada e o que ela permite fazer.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-7 px-6 py-5">
        {somenteLeitura && (
          <p className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            {pode('organizacao.configurar')
              ? 'Esta função tem permissões que você não tem, então você pode vê-la, mas não alterá-la.'
              : 'Você pode ver esta função, mas configurar funções exige a permissão de configurar a organização.'}
          </p>
        )}

        {/* Identificação */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="funcao-nome">Nome</Label>
            <Input id="funcao-nome" placeholder="Ex.: Gestor de Ergonomia" disabled={somenteLeitura} {...form.register('nome')} />
            {erroNome && <p className="text-sm font-medium text-destructive">{erroNome}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="funcao-descricao">Descrição</Label>
            <Textarea id="funcao-descricao" rows={1} className="min-h-10" placeholder="Opcional" disabled={somenteLeitura} {...form.register('descricao')} />
          </div>
        </section>

        {/* Setores */}
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Setores em que pode ser usada</h3>
            <p className="text-xs text-muted-foreground">Só nesses setores alguém pode receber esta função.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {setoresVisiveis.map((s) => {
              const pessoas = pessoasNoSetor(s.id);
              const travado = setoresMarcados.includes(s.id) && setoresComPessoas.has(s.id);
              const id = `funcao-setor-${s.id}`;
              const item = (
                <label
                  htmlFor={id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
                    setoresMarcados.includes(s.id) && 'border-primary/40 bg-primary/5',
                    !somenteLeitura && !travado && 'cursor-pointer hover:bg-muted/50',
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={setoresMarcados.includes(s.id)}
                    onCheckedChange={(v) => alternar('setores', s.id, v === true)}
                    disabled={somenteLeitura || travado}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.nome}</span>
                  {pessoas > 0 && <span className="text-xs tabular-nums text-muted-foreground">{pessoas}</span>}
                </label>
              );
              return travado && !somenteLeitura ? (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    {plural(pessoas, 'pessoa usa', 'pessoas usam')} esta função em {s.nome}. Troque a função delas no Time antes de retirar o setor.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={s.id}>{item}</div>
              );
            })}
          </div>
          {erroSetores && <p className="text-sm font-medium text-destructive">{erroSetores}</p>}
        </section>

        {/* Permissões */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">O que esta função permite fazer</h3>
            <p className="text-xs text-muted-foreground">
              {marcadas.length ? plural(marcadas.length, 'permissão marcada', 'permissões marcadas') : 'Nenhuma permissão: a pessoa só vê o que é dela.'}
            </p>
          </div>

          {carregandoCatalogo ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
          ) : (
            GRUPOS_PERMISSOES.map((grupo) => {
              const itens = grupo.permissoes.filter((p) => porCodigo.has(p));
              if (!itens.length) return null;
              const avisos = DEPENDENCIAS_SUGERIDAS.filter(
                (d) => grupo.permissoes.includes(d.se) && marcadas.includes(d.se) && !marcadas.includes(d.entao),
              );
              return (
                <div key={grupo.id} className="overflow-hidden rounded-md border">
                  <h4 className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">{grupo.titulo}</h4>
                  <ul className="divide-y">
                    {itens.map((codigo) => {
                      const info = porCodigo.get(codigo)!;
                      const marcada = marcadas.includes(codigo);
                      // Ninguém concede o que não tem; desmarcar o que já está na função é permitido.
                      const bloqueada = somenteLeitura || (!marcada && !pode(codigo));
                      const sensivel = PERMISSOES_SENSIVEIS.has(codigo);
                      const id = `funcao-perm-${codigo}`;
                      return (
                        <li key={codigo} className={cn('flex items-start gap-3 px-3 py-2.5', marcada && sensivel && 'bg-warning-subtle/50')}>
                          <Switch
                            id={id}
                            className="mt-0.5"
                            checked={marcada}
                            onCheckedChange={(v) => alternar('permissoes', codigo, v)}
                            disabled={bloqueada}
                          />
                          <label htmlFor={id} className={cn('min-w-0 flex-1', !bloqueada && 'cursor-pointer')}>
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-sm font-medium">{info.descricao}</span>
                              <span className="rounded bg-muted px-1.5 text-2xs text-muted-foreground">
                                {info.escopo === 'setor' ? 'Nos setores da pessoa' : 'Empresa toda'}
                              </span>
                              {sensivel && (
                                <span className="inline-flex items-center gap-1 text-2xs font-medium text-warning-strong">
                                  <TriangleAlert className="size-3" /> Sensível
                                </span>
                              )}
                            </span>
                            {AJUDA_PERMISSAO[codigo] && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">{AJUDA_PERMISSAO[codigo]}</span>
                            )}
                            {!somenteLeitura && !marcada && !pode(codigo) && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">Você não tem esta permissão, então não pode concedê-la.</span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {avisos.map((a) => (
                    <p key={a.se} className="flex items-start gap-2 border-t bg-info-subtle px-3 py-2 text-xs text-info-strong">
                      <Info className="mt-0.5 size-3.5 shrink-0" /> {a.texto}
                    </p>
                  ))}
                </div>
              );
            })
          )}
        </section>
      </div>

      <DialogFooter className="sticky bottom-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
        <p className="text-xs text-muted-foreground">
          {funcao && !somenteLeitura && form.formState.isDirty && membros.length > 0
            ? `A alteração vale na hora para ${plural(membros.length, 'pessoa', 'pessoas')}.`
            : ''}
        </p>
        <div className="flex gap-2">
          {funcao && !somenteLeitura && (
            <Button type="button" variant="ghost" onClick={() => onEtapa(funcao.ativo ? { tipo: 'desativar', id: funcao.id } : { tipo: 'excluir', id: funcao.id })}>
              {funcao.ativo ? 'Desativar' : 'Excluir'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onFechar}>
            {somenteLeitura ? 'Fechar' : 'Cancelar'}
          </Button>
          {!somenteLeitura && (
            <Button type="submit" disabled={salvar.isPending || (!funcao && !organizacao)}>
              {salvar.isPending ? 'Salvando…' : funcao ? 'Salvar' : 'Criar função'}
            </Button>
          )}
        </div>
      </DialogFooter>
    </form>
  );
}

// ── Desativar ───────────────────────────────────────────────────────────────

function EtapaDesativar({ funcao, membros, onVoltar, onConcluido }: { funcao: Funcao; membros: Membro[]; onVoltar: () => void; onConcluido: () => void }) {
  const { toast } = useToast();
  const alterar = useAlterarStatusFuncao();
  const desativar = () =>
    alterar.mutate(
      { id: funcao.id, ativo: false },
      {
        onSuccess: () => {
          toast({ title: 'Função desativada', description: funcao.nome });
          onConcluido();
        },
        onError: (error) => toast({ title: 'Não foi possível desativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );
  return (
    <div className="p-6">
      <DialogHeader>
        <DialogTitle>Desativar {funcao.nome}?</DialogTitle>
        <DialogDescription>
          {membros.length
            ? `${plural(membros.length, 'pessoa perde', 'pessoas perdem')} as permissões desta função enquanto ela estiver desativada.`
            : 'Ninguém usa esta função agora.'}{' '}
          Ela deixa de aparecer para novos vínculos, e você pode reativá-la depois.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-6 gap-2 sm:gap-0">
        <Button variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
        <Button onClick={desativar} disabled={alterar.isPending}>
          Desativar função
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Excluir ─────────────────────────────────────────────────────────────────

function EtapaExcluir({
  funcao,
  membros,
  onVoltar,
  onExcluido,
  onDesativar,
}: {
  funcao: Funcao;
  membros: Membro[];
  onVoltar: () => void;
  onExcluido: () => void;
  onDesativar: () => void;
}) {
  const { toast } = useToast();
  const excluir = useExcluirFuncao();
  const emUso = membros.length > 0;
  const confirmar = () =>
    excluir.mutate(funcao.id, {
      onSuccess: () => {
        toast({ title: 'Função excluída', description: funcao.nome });
        onExcluido();
      },
      onError: (error) => {
        if (statusDoErro(error) === 409) {
          toast({ title: 'Esta função está em uso', description: 'Desative a função em vez de excluí-la.' });
          if (funcao.ativo) onDesativar();
        } else {
          toast({ title: 'Não foi possível excluir', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' });
        }
      },
    });
  return (
    <div className="p-6">
      <DialogHeader>
        <DialogTitle>{emUso ? `${funcao.nome} está em uso` : `Excluir ${funcao.nome}?`}</DialogTitle>
        <DialogDescription>
          {emUso
            ? `${plural(membros.length, 'pessoa tem', 'pessoas têm')} esta função, por isso ela não pode ser excluída. Desative-a ou troque a função dessas pessoas no Time.`
            : 'A função será removida de vez. Esta ação não pode ser desfeita.'}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-6 gap-2 sm:gap-0">
        <Button variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
        {emUso ? (
          funcao.ativo && <Button onClick={onDesativar}>Desativar função</Button>
        ) : (
          <Button variant="destructive" onClick={confirmar} disabled={excluir.isPending}>
            Excluir
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
