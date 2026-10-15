import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, Trash2, Users as UsersIcon } from 'lucide-react';
import { DataTable, col, type DataTableFacet, type DataTableRowAction } from '@/components/data-table';
import { PageHeader } from '@/components/kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { toastComAvisos } from '@/lib/avisos';
import { useFuncoes } from '@/features/organizacao/hooks';
import { useDeleteUser, useProfileDetail, useSetUserAtivo, useUpsertUser, useUsers } from '../hooks';
import { CreateUserPayload, UpdateUserPayload, UsuarioApi, VinculoPayload } from '../services';
import { TambemExecutaEmEditor } from '../components/TambemExecutaEmEditor';
import { VinculosEditor, type VinculoLinha } from '../components/VinculosEditor';
import { mesmosVinculos, nomeDaPessoa } from '../utils';

const schema = z
  .object({
    id: z.number().optional(),
    username: z.string().min(2, 'Username muito curto'),
    nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional().or(z.literal('')),
    email: z.string().email('E-mail inválido'),
    ativo: z.boolean(),
    vinculos: z.array(z.object({ setor: z.number().nullable(), funcao: z.number().nullable() })),
    tambem_executa_em: z.array(z.number()),
  })
  .superRefine((val, ctx) => {
    if (!val.id && (!val.password || val.password.length < 6)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Senha é obrigatória na criação',
      });
    }
    if (val.vinculos.some((v) => !v.setor || !v.funcao)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vinculos'],
        message: 'Escolha o setor e a função em cada linha, ou remova a linha.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  username: '',
  nome_completo: '',
  password: '',
  email: '',
  ativo: true,
  vinculos: [],
  tambem_executa_em: [],
};

const mesmosSetores = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

const paraPayload = (linhas: VinculoLinha[]): VinculoPayload[] =>
  linhas.map((l) => ({ setor: l.setor as number, funcao: l.funcao as number }));

const TimePage = () => {
  const { toast } = useToast();
  const { data: users = [], isLoading, isFetching, isError, refetch } = useUsers();
  const { data: funcoes = [] } = useFuncoes();
  const upsert = useUpsertUser();
  const del = useDeleteUser();
  const setAtivo = useSetUserAtivo();
  const [confirmar, setConfirmar] = useState<{ tipo: 'desativar' | 'excluir'; pessoa: UsuarioApi } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: editingDetail } = useProfileDetail(editingId);
  const [open, setOpen] = useState(false);
  const { pode } = usePermissoes();
  const canManageUsers = pode('usuarios.gerenciar');
  const podeGerenciarDiretoria = pode('usuarios.gerenciar_diretoria');
  const meuId = useCurrentUser().user?.id;
  const vinculosOriginais: VinculoLinha[] = (editingId && editingDetail?.vinculos) || [];
  const atuacoesOriginais = (editingId && editingDetail?.tambem_executa_em?.map((a) => a.setor)) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // O endpoint de listagem não retorna username — ao editar, buscamos o detalhe
  // completo do usuário (`useProfileDetail`) e só então preenchemos o formulário.
  useEffect(() => {
    if (editingId && editingDetail) {
      form.reset({
        id: editingDetail.id,
        username: editingDetail.username,
        nome_completo: editingDetail.nome_completo,
        email: editingDetail.email,
        ativo: editingDetail.ativo ?? true,
        vinculos: editingDetail.vinculos.map((v) => ({ setor: v.setor, funcao: v.funcao })),
        tambem_executa_em: editingDetail.tambem_executa_em?.map((a) => a.setor) ?? [],
        password: '',
      });
    } else if (!editingId) {
      form.reset(defaultValues);
    }
  }, [editingId, editingDetail]);

  const onSubmit = (values: FormValues) => {
    if (!canManageUsers) return;

    if (values.id) {
      const payload: UpdateUserPayload & { id: number } = {
        id: values.id,
        username: values.username,
        nome_completo: values.nome_completo,
        email: values.email,
        ativo: values.ativo,
        // Só envia os vínculos se mudaram: reenviar uma função que quem edita não pode conceder
        // seria recusado pelo backend, mesmo sem alteração.
        ...(mesmosVinculos(values.vinculos, vinculosOriginais) ? {} : { vinculos: paraPayload(values.vinculos) }),
        // Mesma ideia: só envia "também executa em" se mudou.
        ...(mesmosSetores(values.tambem_executa_em, atuacoesOriginais) ? {} : { tambem_executa_em: values.tambem_executa_em }),
      };
      upsert.mutate(payload, {
        onSuccess: (salva) => {
          toast({
            title: salva.avisos?.length ? 'Pessoa atualizada, com um aviso' : 'Pessoa atualizada',
            ...toastComAvisos(salva.avisos, 'As alterações foram salvas.'),
          });
          setEditingId(null);
          form.reset(defaultValues);
          setOpen(false);
        },
        onError: (error) => {
          toast({
            title: 'Não foi possível salvar',
            description: mensagemDeErro(error, 'Não foi possível salvar as alterações.'),
            variant: 'destructive',
          });
        },
      });
    } else {
      const payload: CreateUserPayload = {
        username: values.username,
        nome_completo: values.nome_completo,
        password: values.password || '',
        password_confirmacao: values.password || '',
        email: values.email,
        ativo: values.ativo,
        vinculos: paraPayload(values.vinculos),
        tambem_executa_em: values.tambem_executa_em,
      };
      upsert.mutate(payload, {
        onSuccess: () => {
          toast({ title: 'Pessoa adicionada', description: 'Ela já pode entrar no sistema com o e-mail e a senha cadastrados.' });
          setEditingId(null);
          form.reset(defaultValues);
          setOpen(false);
        },
        onError: (error) => {
          toast({
            title: 'Não foi possível adicionar',
            description: mensagemDeErro(error, 'Não foi possível adicionar a pessoa.'),
            variant: 'destructive',
          });
        },
      });
    }
  };

  const funcaoPorId = useMemo(() => new Map(funcoes.map((f) => [f.id, f])), [funcoes]);
  // Pessoa da diretoria (alguma função com `usuarios.gerenciar_diretoria`) só é alterada por quem também é.
  const protegida = (u: UsuarioApi) =>
    !podeGerenciarDiretoria &&
    u.vinculos.some((v) => funcaoPorId.get(v.funcao)?.permissoes.includes('usuarios.gerenciar_diretoria'));
  // O próprio cadastro se edita em "Meu perfil".
  const podeAlterar = (u: UsuarioApi) => canManageUsers && !protegida(u) && u.id !== meuId;

  const columns = useMemo(
    () => [
      col.registro<UsuarioApi>('pessoa', 'Nome', { title: nomeDaPessoa, avatar: true }),
      col.contato<UsuarioApi>('email', 'E-mail', (u) => u.email, { kind: 'email', width: '280px' }),
      col.custom<UsuarioApi>('setor', 'Setor', {
        accessor: (u) => u.vinculos.map((v) => v.setor_nome).join(', ') || undefined,
        sortingFn: 'textPtBr',
        width: '220px',
        cell: (u) => <VinculosLinhas vinculos={u.vinculos} campo="setor_nome" />,
      }),
      col.custom<UsuarioApi>('funcao', 'Função', {
        accessor: (u) => u.vinculos.map((v) => v.funcao_nome).join(', ') || undefined,
        sortingFn: 'textPtBr',
        width: '200px',
        cell: (u) => <VinculosLinhas vinculos={u.vinculos} campo="funcao_nome" />,
      }),
      col.custom<UsuarioApi>('tambem_executa_em', 'Também executa em', {
        accessor: (u) => u.tambem_executa_em.map((a) => a.setor_nome).join(', ') || undefined,
        sortingFn: 'textPtBr',
        width: '220px',
        priority: 2,
        cell: (u) =>
          u.tambem_executa_em.length ? (
            <span className="flex flex-wrap gap-1" title={u.tambem_executa_em.map((a) => a.setor_nome).join(', ')}>
              {u.tambem_executa_em.map((a) => (
                <span key={a.setor} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                  {a.setor_nome}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      col.situacao<UsuarioApi>('situacao', 'Situação', (u) => u.ativo),
      col.data<UsuarioApi>('desde', 'No sistema desde', (u) => u.data_criacao, { priority: 3 }),
    ],
    [],
  );

  const facets = useMemo<DataTableFacet<UsuarioApi>[]>(
    () => [
      {
        columnId: 'setor',
        label: 'Setor',
        getValue: (u) => (u.vinculos.length ? u.vinculos.map((v) => v.setor_nome) : 'Sem setor'),
      },
      { columnId: 'funcao', label: 'Função', getValue: (u) => u.vinculos.map((v) => v.funcao_nome) },
      { columnId: 'tambem_executa_em', label: 'Também executa em', getValue: (u) => u.tambem_executa_em.map((a) => a.setor_nome) },
    ],
    [],
  );

  const mudarAtivo = (u: UsuarioApi, ativo: boolean) =>
    setAtivo.mutate(
      { id: u.id, ativo },
      {
        onSuccess: (r) => {
          const titulo = ativo ? 'Pessoa reativada' : 'Pessoa desativada';
          toast({ title: r.avisos?.length ? `${titulo}, com um aviso` : titulo, ...toastComAvisos(r.avisos, nomeDaPessoa(u)) });
          setConfirmar(null);
        },
        onError: (error) =>
          toast({ title: 'Não foi possível alterar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );

  const excluir = (u: UsuarioApi) =>
    del.mutate(u.id, {
      onSuccess: () => {
        toast({ title: 'Pessoa excluída', description: nomeDaPessoa(u) });
        setConfirmar(null);
      },
      onError: (error) => {
        // 409: a pessoa é responsável por tarefas. A saída é desativar.
        if (statusDoErro(error) === 409) {
          setConfirmar({ tipo: 'desativar', pessoa: u });
          toast({ title: 'Esta pessoa tem tarefas no sistema', description: 'Desative em vez de excluir para manter o histórico.' });
        } else {
          toast({ title: 'Não foi possível excluir', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' });
        }
      },
    });

  const openCreate = () => {
    if (!canManageUsers) return;
    setEditingId(null);
    form.reset(defaultValues);
    setOpen(true);
  };

  const openEdit = (u: UsuarioApi) => {
    setEditingId(u.id);
    setOpen(true);
  };

  const rowActions = (u: UsuarioApi): DataTableRowAction<UsuarioApi>[] => {
    if (!podeAlterar(u)) return [];
    return [
      { label: 'Editar', icon: Pencil, onSelect: openEdit },
      u.ativo
        ? { label: 'Desativar', icon: Power, onSelect: (p) => setConfirmar({ tipo: 'desativar', pessoa: p }) }
        : { label: 'Reativar', icon: Power, onSelect: (p) => mudarAtivo(p, true) },
      { label: 'Excluir', icon: Trash2, destructive: true, onSelect: (p) => setConfirmar({ tipo: 'excluir', pessoa: p }) },
    ];
  };

  const alvo = confirmar?.pessoa;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Time"
        count={isLoading ? null : users.filter((u) => u.ativo).length}
        description="Quem trabalha na empresa, em quais setores e com qual função."
        actions={
          canManageUsers && (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Adicionar pessoa
            </Button>
          )
        }
      />

      <DataTable
        id="time"
        data={users}
        columns={columns}
        getRowId={(u) => String(u.id)}
        onRowClick={canManageUsers ? (u) => podeAlterar(u) && openEdit(u) : undefined}
        isRowInactive={(u) => !u.ativo}
        views={[
          { id: 'ativos', label: 'Ativos', filter: (u) => u.ativo },
          { id: 'inativos', label: 'Inativos', filter: (u) => !u.ativo },
          { id: 'todos', label: 'Todos' },
        ]}
        search={{ placeholder: 'Buscar por nome ou e-mail', fields: (u) => [u.nome_completo, u.email] }}
        facets={facets}
        defaultSort={{ id: 'pessoa' }}
        rowActions={canManageUsers ? rowActions : undefined}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => refetch()}
        emptyStates={{
          noData: {
            icon: UsersIcon,
            title: 'Ninguém no time ainda',
            description: 'Adicione as pessoas e defina o setor e a função de cada uma.',
            action: canManageUsers ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Adicionar pessoa
              </Button>
            ) : undefined,
          },
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar pessoa' : 'Adicionar pessoa'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
              autoComplete="off"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="joao.silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@dominio.com"
                        autoComplete="off"
                        autoCapitalize="none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha {editingId ? '(opcional)' : ''}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ativo</FormLabel>
                    <FormControl>
                      <div className="h-10 flex items-center">
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vinculos"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Setores e funções</FormLabel>
                    <FormControl>
                      <VinculosEditor
                        value={field.value}
                        onChange={field.onChange}
                        originais={vinculosOriginais}
                        disabled={!canManageUsers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tambem_executa_em"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Também executa em <span className="font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <TambemExecutaEmEditor
                        value={field.value}
                        onChange={field.onChange}
                        lotacao={form.watch('vinculos')[0]?.setor ?? null}
                        disabled={!canManageUsers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-w-32" disabled={!canManageUsers}>
                  {editingId ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmar?.tipo === 'desativar'} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {alvo && nomeDaPessoa(alvo)}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa deixa de entrar no sistema. Tarefas, OS e histórico continuam, e você pode reativá-la depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => alvo && mudarAtivo(alvo, false)} disabled={setAtivo.isPending}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmar?.tipo === 'excluir'} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {alvo && nomeDaPessoa(alvo)}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro é removido de vez. Se a pessoa só vai deixar de usar o sistema, prefira desativar: o histórico
              dela continua visível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {alvo?.ativo && (
              <Button variant="outline" onClick={() => mudarAtivo(alvo, false)} disabled={setAtivo.isPending}>
                Desativar
              </Button>
            )}
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (alvo) excluir(alvo);
              }}
              disabled={del.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/**
 * Setores ou funções da pessoa, um vínculo por linha. As colunas Setor e Função usam a mesma ordem,
 * então a linha N de uma corresponde à linha N da outra. Acima de 2 vínculos, "+N" com a lista no title.
 */
function VinculosLinhas({ vinculos, campo }: { vinculos: UsuarioApi['vinculos']; campo: 'setor_nome' | 'funcao_nome' }) {
  if (!vinculos.length) {
    return campo === 'setor_nome' ? <span className="text-muted-foreground">Sem setor</span> : <span className="text-muted-foreground">—</span>;
  }
  const visiveis = vinculos.slice(0, 2);
  const resto = vinculos.length - visiveis.length;
  return (
    <div className="min-w-0" title={vinculos.map((v) => `${v.funcao_nome} · ${v.setor_nome}`).join('\n')}>
      {visiveis.map((v) => (
        <div key={v.id} className="truncate">
          {v[campo]}
        </div>
      ))}
      {resto > 0 && campo === 'setor_nome' && <div className="text-xs text-muted-foreground">+{resto} setor(es)</div>}
    </div>
  );
}

export default TimePage;
