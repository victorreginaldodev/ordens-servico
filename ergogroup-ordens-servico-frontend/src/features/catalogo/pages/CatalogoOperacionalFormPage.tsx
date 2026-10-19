import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Lock, Save, Trash2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatDocumento } from '@/lib/format';
import { useClients } from '@/features/clientes/hooks';
import type { TipoCliente } from '@/features/clientes/services';
import { SeletorBusca } from '@/features/vendas/components/SeletorBusca';
import { useCatalogoOperacional, useUpsertCatalogoOperacional } from '../hooks';

type FormValues = {
  nome: string;
  descricao: string;
  geraCobranca: boolean;
  clientesIsentosCobranca: number[];
};

const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  gestao: 'Gestão',
  avulso: 'Avulso',
  fornecedor: 'Fornecedor',
};

const CatalogoOperacionalFormPage = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId ? Number(paramId) : undefined;
  const { pode } = usePermissoes();
  const canManage = pode('catalogo_operacional.gerenciar');
  const podeConfigurarCobranca = pode('catalogo_operacional.configurar_cobranca');
  const { data: catalogItem } = useCatalogoOperacional(id);
  const { data: clientes = [], isLoading: carregandoClientes } = useClients();
  const upsert = useUpsertCatalogoOperacional();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: { nome: '', descricao: '', geraCobranca: false, clientesIsentosCobranca: [] },
  });
  const geraCobranca = form.watch('geraCobranca');
  const isentos = form.watch('clientesIsentosCobranca');

  useEffect(() => {
    if (!canManage) {
      toast({
        title: 'Permissão insuficiente',
        description: 'Seu perfil não pode gerenciar o catálogo.',
        variant: 'destructive',
      });
      navigate('/catalogo/operacional');
    }
  }, [canManage, navigate, toast]);

  useEffect(() => {
    if (catalogItem) {
      form.reset({
        nome: catalogItem.nome ?? '',
        descricao: catalogItem.descricao ?? '',
        geraCobranca: catalogItem.geraCobranca,
        clientesIsentosCobranca: catalogItem.clientesIsentosCobranca,
      });
    }
  }, [catalogItem]);

  const clientesPorId = useMemo(() => new Map(clientes.map((c) => [Number(c.id), c])), [clientes]);
  // Clientes inativos não entram como nova exceção, mas os que já são isentos continuam na tabela.
  const opcoesDeCliente = clientes
    .filter((c) => c.active !== false && !isentos.includes(Number(c.id)))
    .map((c) => ({
      valor: Number(c.id),
      rotulo: c.name,
      detalhe: formatDocumento(c.tipo_inscricao, c.document) ?? undefined,
    }));
  const isentosOrdenados = [...isentos].sort((a, b) =>
    (clientesPorId.get(a)?.name ?? '').localeCompare(clientesPorId.get(b)?.name ?? '', 'pt-BR'),
  );

  const adicionarIsento = (clienteId: number) =>
    form.setValue('clientesIsentosCobranca', [...isentos, clienteId], { shouldDirty: true });
  const removerIsento = (clienteId: number) =>
    form.setValue(
      'clientesIsentosCobranca',
      isentos.filter((x) => x !== clienteId),
      { shouldDirty: true },
    );

  const onSubmit = (values: FormValues) => {
    if (!canManage) return;
    upsert.mutate(
      {
        id,
        payload: {
          nome: values.nome,
          descricao: values.descricao || null,
          // Sem a permissão, a API recusa qualquer envio destes campos.
          ...(podeConfigurarCobranca
            ? { geraCobranca: values.geraCobranca, clientesIsentosCobranca: values.clientesIsentosCobranca }
            : {}),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: id ? 'Serviço atualizado' : 'Serviço criado',
            description: 'Operação concluída com sucesso.',
          });
          navigate('/catalogo/operacional');
        },
        onError: () => {
          toast({
            title: 'Erro ao salvar',
            description: 'Não foi possível concluir a operação.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{id ? 'Editar serviço' : 'Novo serviço'}</h1>
          <p className="text-muted-foreground">
            Defina as informações do serviço utilizado nas OS Operacionais.
          </p>
        </div>
        <BackButton to="/catalogo/operacional" />
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Informações do serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex.: Revisão PGR - Correção Cliente"
                maxLength={50}
                {...form.register('nome', { required: true })}
                className="bg-secondary border-border uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Detalhes adicionais do serviço"
                rows={5}
                {...form.register('descricao')}
                className="bg-secondary border-border min-h-28"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Cobrança</CardTitle>
              {!podeConfigurarCobranca && (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  <Lock className="size-3" aria-hidden />
                  Somente leitura
                </span>
              )}
            </div>
            <CardDescription>Regra aplicada automaticamente ao criar cada OS operacional deste serviço.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 rounded-md border px-4 py-3">
              <Controller
                control={form.control}
                name="geraCobranca"
                render={({ field }) => (
                  <Switch
                    id="geraCobranca"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!podeConfigurarCobranca}
                    className="mt-0.5"
                  />
                )}
              />
              <div className="space-y-0.5">
                <Label htmlFor="geraCobranca">Este serviço gera cobrança</Label>
                <p className="text-sm text-muted-foreground">
                  {geraCobranca
                    ? 'Novas OS deste serviço são liberadas para o financeiro ao serem finalizadas, exceto para os clientes isentos.'
                    : 'Novas OS deste serviço não geram cobrança para nenhum cliente.'}
                </p>
              </div>
            </div>

            {geraCobranca && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    Clientes isentos <span className="font-normal text-muted-foreground">· {isentos.length}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Para estes clientes, as novas OS deste serviço não geram cobrança.
                  </p>
                </div>

                {podeConfigurarCobranca && (
                  <SeletorBusca
                    id="clienteIsento"
                    opcoes={opcoesDeCliente}
                    valor={null}
                    onChange={adicionarIsento}
                    placeholder="Buscar cliente por nome ou documento para tornar isento"
                    vazio="Nenhum cliente encontrado."
                    carregando={carregandoClientes}
                  />
                )}

                {isentos.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="w-52 border-l border-border/70">Documento</TableHead>
                          <TableHead className="w-32 border-l border-border/70">Tipo</TableHead>
                          {podeConfigurarCobranca && <TableHead className="w-28" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isentosOrdenados.map((clienteId) => {
                          const cliente = clientesPorId.get(clienteId);
                          return (
                            <TableRow key={clienteId}>
                              <TableCell>{cliente?.name ?? `Cliente ${clienteId}`}</TableCell>
                              <TableCell className="border-l border-border/70">
                                {formatDocumento(cliente?.tipo_inscricao, cliente?.document) ?? '—'}
                              </TableCell>
                              <TableCell className="border-l border-border/70">
                                {cliente?.tipoCliente ? TIPO_CLIENTE_LABEL[cliente.tipoCliente] : '—'}
                              </TableCell>
                              {podeConfigurarCobranca && (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removerIsento(clienteId)}
                                  >
                                    <Trash2 className="size-4 mr-1" aria-hidden />
                                    Remover
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    Nenhum cliente isento. Todas as novas OS deste serviço geram cobrança.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 rounded-md border border-warning bg-warning-subtle px-4 py-3 text-sm text-warning-strong">
              <Info className="size-4 mt-0.5 shrink-0" aria-hidden />
              <span>
                A regra vale também para as OS operacionais deste serviço ainda não faturadas: as finalizadas que
                passarem a cobrar vão para "Para faturar", e as que deixarem de cobrar saem da fila. As já faturadas
                não mudam.
              </span>
            </div>

            {!podeConfigurarCobranca && (
              <p className="text-xs text-muted-foreground">
                Somente quem tem a permissão de configurar a cobrança do catálogo operacional pode alterar esta seção.
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="hero"
          className="min-w-40"
          disabled={upsert.isPending || !canManage}
        >
          <Save className="w-4 h-4 mr-2" />
          {id ? 'Salvar alterações' : 'Adicionar serviço'}
        </Button>
      </form>
    </div>
  );
};

export default CatalogoOperacionalFormPage;
