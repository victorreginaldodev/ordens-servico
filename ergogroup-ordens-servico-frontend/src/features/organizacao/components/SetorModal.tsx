import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { MoreHorizontal, Package, Pencil, Power, Trash2, Users } from 'lucide-react';
import { AtivoBadge, EmptyState, PessoaChip } from '@/components/kit';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { useAlterarStatusSetor, useExcluirSetor, useOrganizacaoAtual, useSalvarSetor } from '../hooks';
import type { Funcao, Membro } from '../services';
import { EtapaLiberarFuncoes, FuncoesDoSetor } from './SetorFuncoes';
import type { ResumoSetor } from '../useResumoSetores';

/**
 * Etapas do modal de setores. Há sempre um único modal aberto: ir do detalhe para editar,
 * desativar ou excluir troca o conteúdo dele, e "Cancelar" volta para o detalhe.
 */
export type AbaSetor = 'pessoas' | 'funcoes' | 'catalogos';

export type EtapaSetor =
  | { tipo: 'detalhe'; id: number; aba?: AbaSetor }
  | { tipo: 'form'; id?: number }
  | { tipo: 'desativar'; id: number }
  | { tipo: 'excluir'; id: number }
  | { tipo: 'liberar'; id: number };

interface SetorModalProps {
  etapa: EtapaSetor | null;
  onEtapa: (etapa: EtapaSetor | null) => void;
  resumos: ResumoSetor[];
  /** Todas as funções da organização, para liberar novas no setor. */
  todasAsFuncoes: Funcao[];
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const LARGURA: Record<EtapaSetor['tipo'], string> = {
  detalhe: 'sm:max-w-2xl',
  form: 'sm:max-w-lg',
  desativar: 'sm:max-w-md',
  excluir: 'sm:max-w-md',
  liberar: 'sm:max-w-lg',
};

export function SetorModal({ etapa, onEtapa, resumos, todasAsFuncoes }: SetorModalProps) {
  const resumo = etapa && 'id' in etapa && etapa.id ? resumos.find((r) => r.setor.id === etapa.id) ?? null : null;
  const fechar = () => onEtapa(null);
  // Voltar ao detalhe só faz sentido para um setor que já existe.
  const voltar = () => (resumo ? onEtapa({ tipo: 'detalhe', id: resumo.setor.id }) : fechar());

  // O setor sumiu da lista (ex.: excluído em outra aba): fecha em vez de mostrar um modal vazio.
  const semSetor = !!etapa && etapa.tipo !== 'form' && !resumo;
  useEffect(() => {
    if (semSetor) onEtapa(null);
  }, [semSetor, onEtapa]);

  let conteudo: React.ReactNode = null;
  if (etapa?.tipo === 'form') conteudo = <EtapaForm resumo={resumo} onCancelar={voltar} onSalvo={(id) => onEtapa({ tipo: 'detalhe', id, aba: resumo ? undefined : 'funcoes' })} />;
  else if (resumo && etapa?.tipo === 'detalhe') conteudo = <EtapaDetalhe resumo={resumo} aba={etapa.aba} onEtapa={onEtapa} />;
  else if (resumo && etapa?.tipo === 'liberar')
    conteudo = (
      <EtapaLiberarFuncoes
        resumo={resumo}
        todasAsFuncoes={todasAsFuncoes}
        onVoltar={() => onEtapa({ tipo: 'detalhe', id: resumo.setor.id, aba: 'funcoes' })}
      />
    );
  else if (resumo && etapa?.tipo === 'desativar') conteudo = <EtapaDesativar resumo={resumo} onCancelar={voltar} onConcluido={voltar} />;
  else if (resumo && etapa?.tipo === 'excluir')
    conteudo = (
      <EtapaExcluir
        resumo={resumo}
        onCancelar={voltar}
        onExcluido={fechar}
        onDesativar={() => onEtapa({ tipo: 'desativar', id: resumo.setor.id })}
      />
    );

  return (
    <Dialog open={!!conteudo} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', etapa && LARGURA[etapa.tipo])}>{conteudo}</DialogContent>
    </Dialog>
  );
}

// ── Detalhe ─────────────────────────────────────────────────────────────────

/** Pessoas agrupadas por função, com as funções de gestão primeiro. */
const agruparPorFuncao = (membros: Membro[], gestores: Membro[]) => {
  const grupos = new Map<string, Membro[]>();
  membros.forEach((m) => grupos.set(m.funcao_nome, [...(grupos.get(m.funcao_nome) ?? []), m]));
  const funcoesGestao = new Set(gestores.map((g) => g.funcao_nome));
  return [...grupos.entries()].sort(
    ([a], [b]) => Number(funcoesGestao.has(b)) - Number(funcoesGestao.has(a)) || a.localeCompare(b, 'pt-BR'),
  );
};

function EtapaDetalhe({
  resumo,
  aba = 'pessoas',
  onEtapa,
}: {
  resumo: ResumoSetor;
  aba?: AbaSetor;
  onEtapa: (e: EtapaSetor | null) => void;
}) {
  const { toast } = useToast();
  const { pode } = usePermissoes();
  const alterarStatus = useAlterarStatusSetor();
  const { setor, membros, gestores, catalogos, funcoes } = resumo;
  const podeConfigurar = pode('organizacao.configurar');

  const reativar = () =>
    alterarStatus.mutate(
      { id: setor.id, ativo: true },
      {
        onSuccess: () => toast({ title: 'Setor reativado', description: setor.nome }),
        onError: (error) =>
          toast({ title: 'Não foi possível reativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  return (
    <>
      <DialogHeader className="space-y-2 pr-6 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-xl">{setor.nome}</DialogTitle>
          <AtivoBadge ativo={setor.ativo} />
        </div>
        <DialogDescription>{setor.descricao || 'Sem descrição.'}</DialogDescription>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">
        {setor.executa_servicos
          ? `Executa ${setor.catalogos_ativos} ${setor.catalogos_ativos === 1 ? 'catálogo' : 'catálogos'} · ${setor.recebem_tarefas} ${setor.recebem_tarefas === 1 ? 'pessoa recebe' : 'pessoas recebem'} tarefas`
          : 'Não executa serviços: nenhum catálogo ativo é deste setor.'}
      </p>

      {setor.ativo && setor.sem_quem_receba ? (
        <p className="rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
          <b>Este setor executa serviços, mas ninguém recebe tarefas nele.</b> Dê a alguém do setor uma função com "Recebe tarefas", ou
          marque "Também executa em" na pessoa, no Time.
        </p>
      ) : null}
      {setor.ativo && setor.sem_organizador ? (
        <p className="rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
          <b>Este setor ainda não tem quem organize.</b> Ninguém tem as permissões de ver e distribuir os serviços dele, então o que
          chegar fica na fila sem responsável. Dê a alguém do setor uma função com essas permissões.
        </p>
      ) : setor.organizadores.length ? (
        <p className="text-sm text-muted-foreground">
          Organiza o trabalho: <span className="text-foreground">{setor.organizadores.map((o) => o.nome).join(', ')}</span>
        </p>
      ) : null}

      {podeConfigurar && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEtapa({ tipo: 'form', id: setor.id })}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (setor.ativo ? onEtapa({ tipo: 'desativar', id: setor.id }) : reativar())}
            disabled={alterarStatus.isPending}
          >
            <Power className="size-4" /> {setor.ativo ? 'Desativar' : 'Reativar'}
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Mais ações">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onEtapa({ tipo: 'excluir', id: setor.id })}
              >
                <Trash2 className="mr-2 size-4" /> Excluir setor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Tabs defaultValue={aba}>
        <TabsList className="w-full">
          <TabsTrigger value="pessoas" className="flex-1">
            Pessoas ({membros.length})
          </TabsTrigger>
          <TabsTrigger value="funcoes" className="flex-1">
            Funções ({funcoes.length})
          </TabsTrigger>
          <TabsTrigger value="catalogos" className="flex-1">
            Catálogos ({catalogos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pessoas" className="mt-4">
          {membros.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Ninguém neste setor"
              description={
                funcoes.length
                  ? 'Defina o setor e a função de cada pessoa na tela do Time.'
                  : 'Libere ao menos uma função na aba Funções; depois, coloque as pessoas pelo Time.'
              }
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/time">Ir para o Time</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {agruparPorFuncao(membros, gestores).map(([funcao, pessoas]) => (
                  <section key={funcao}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {funcao} · {pessoas.length}
                    </h3>
                    <ul className="space-y-2">
                      {pessoas.map((p) => (
                        <li key={p.id} className="text-sm">
                          <PessoaChip nome={p.usuario_nome} variant="full" />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <Button asChild variant="link" size="sm" className="h-auto px-0">
                <Link to={`/time?f.setor=${encodeURIComponent(setor.nome)}`}>Ver estas pessoas no Time</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="funcoes" className="mt-4">
          <FuncoesDoSetor resumo={resumo} onLiberar={() => onEtapa({ tipo: 'liberar', id: setor.id })} />
        </TabsContent>

        <TabsContent value="catalogos" className="mt-4">
          {catalogos.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum catálogo neste setor"
              description="Os serviços de um catálogo caem na fila do setor dele. Defina o setor ao editar o catálogo."
            />
          ) : (
            <ul className="divide-y rounded-md border">
              {catalogos.map((c) => (
                <li key={c.id} className="px-3 py-2.5 text-sm">
                  {pode('catalogo.gerenciar') ? (
                    <Link to={`/catalogo/${c.id}/edit`} className="hover:underline">
                      {c.nome}
                    </Link>
                  ) : (
                    c.nome
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Criar e editar ──────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do setor').max(100, 'Use no máximo 100 caracteres'),
  descricao: z.string().trim().max(500, 'Use no máximo 500 caracteres'),
});

type Valores = z.infer<typeof schema>;

function EtapaForm({
  resumo,
  onCancelar,
  onSalvo,
}: {
  resumo: ResumoSetor | null;
  onCancelar: () => void;
  onSalvo: (id: number) => void;
}) {
  const setor = resumo?.setor;
  const { toast } = useToast();
  const salvar = useSalvarSetor();
  const { data: organizacao } = useOrganizacaoAtual();
  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: { nome: setor?.nome ?? '', descricao: setor?.descricao ?? '' },
  });

  const onSubmit = (valores: Valores) =>
    salvar.mutate(
      { id: setor?.id, organizacao: organizacao?.id, payload: { nome: valores.nome, descricao: valores.descricao || null } },
      {
        onSuccess: (salvo) => {
          toast({ title: setor ? 'Setor atualizado' : 'Setor criado', description: salvo.nome });
          onSalvo(salvo.id);
        },
        onError: (error) => {
          const dados = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
          const msg = mensagemDeErro(error, 'Não foi possível salvar o setor.');
          // Nome repetido volta como erro do campo ou da restrição de unicidade.
          if (dados?.nome || /nome/i.test(msg)) {
            form.setError('nome', { message: /único|unique|existe/i.test(msg) ? 'Já existe um setor com este nome.' : msg });
          } else {
            toast({ title: 'Não foi possível salvar', description: msg, variant: 'destructive' });
          }
        },
      },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{setor ? `Editar ${setor.nome}` : 'Novo setor'}</DialogTitle>
        <DialogDescription>
          Setores organizam quem executa cada tipo de serviço. As funções das pessoas valem dentro do setor.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form id="setor-form" className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Ergonomia" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="O que o setor faz e quais serviços executa" {...field} />
                </FormControl>
                <FormDescription>Opcional. Aparece nos cards e ajuda quem distribui o trabalho.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancelar}>
          {setor ? 'Voltar' : 'Cancelar'}
        </Button>
        <Button type="submit" form="setor-form" disabled={salvar.isPending || (!setor && !organizacao)}>
          {salvar.isPending ? 'Salvando…' : setor ? 'Salvar' : 'Criar setor'}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Desativar ───────────────────────────────────────────────────────────────

function EtapaDesativar({ resumo, onCancelar, onConcluido }: { resumo: ResumoSetor; onCancelar: () => void; onConcluido: () => void }) {
  const { toast } = useToast();
  const alterarStatus = useAlterarStatusSetor();
  const { setor, membros } = resumo;
  // Setor com catálogos ativos não é desativado (o backend devolve 400): as vendas desses serviços iriam para ele.
  const catalogosAtivos = setor.catalogos_ativos;

  if (catalogosAtivos > 0)
    return (
      <>
        <DialogHeader>
          <DialogTitle>{setor.nome} ainda executa catálogos</DialogTitle>
          <DialogDescription>
            Este setor executa {plural(catalogosAtivos, 'catálogo ativo', 'catálogos ativos')}. Passe-os a outro setor (ou
            desative-os) no Catálogo antes de desativar o setor; senão, os serviços vendidos iriam para um setor desativado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancelar}>
            Voltar
          </Button>
          <Button asChild>
            <Link to={`/catalogo?f.setor=${encodeURIComponent(setor.nome)}`}>Ir para o Catálogo</Link>
          </Button>
        </DialogFooter>
      </>
    );

  const desativar = () =>
    alterarStatus.mutate(
      { id: setor.id, ativo: false },
      {
        onSuccess: () => {
          toast({ title: 'Setor desativado', description: setor.nome });
          onConcluido();
        },
        onError: (error) =>
          toast({ title: 'Não foi possível desativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Desativar {setor.nome}?</DialogTitle>
        <DialogDescription>
          {membros.length > 0
            ? `${plural(membros.length, 'pessoa deixa', 'pessoas deixam')} de ter as permissões que este setor concede enquanto ele estiver desativado.`
            : 'Ninguém está neste setor agora.'}{' '}
          Os serviços já vendidos continuam no setor, e você pode reativá-lo depois.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancelar}>
          Voltar
        </Button>
        <Button onClick={desativar} disabled={alterarStatus.isPending}>
          Desativar setor
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Excluir ─────────────────────────────────────────────────────────────────

function EtapaExcluir({
  resumo,
  onCancelar,
  onExcluido,
  onDesativar,
}: {
  resumo: ResumoSetor;
  onCancelar: () => void;
  onExcluido: () => void;
  onDesativar: () => void;
}) {
  const { toast } = useToast();
  const excluir = useExcluirSetor();
  const { setor, membros, catalogos } = resumo;
  const emUso = membros.length > 0 || catalogos.length > 0;

  const confirmar = () =>
    excluir.mutate(setor.id, {
      onSuccess: () => {
        toast({ title: 'Setor excluído', description: setor.nome });
        onExcluido();
      },
      onError: (error) => {
        // 409: o setor está em uso (pessoas, catálogos ou serviços). A saída é desativar.
        if (statusDoErro(error) === 409) {
          toast({ title: 'Este setor está em uso', description: 'Desative o setor em vez de excluí-lo.' });
          if (setor.ativo) onDesativar();
        } else {
          toast({ title: 'Não foi possível excluir', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' });
        }
      },
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{emUso ? `${setor.nome} está em uso` : `Excluir ${setor.nome}?`}</DialogTitle>
        <DialogDescription>
          {emUso
            ? `O setor tem ${plural(membros.length, 'pessoa', 'pessoas')} e ${plural(catalogos.length, 'catálogo', 'catálogos')}, por isso não pode ser excluído. Desative-o para tirá-lo de uso sem perder o histórico.`
            : 'O setor será removido de vez. Esta ação não pode ser desfeita.'}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancelar}>
          Voltar
        </Button>
        {emUso ? (
          setor.ativo && <Button onClick={onDesativar}>Desativar setor</Button>
        ) : (
          <Button variant="destructive" onClick={confirmar} disabled={excluir.isPending}>
            Excluir
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
