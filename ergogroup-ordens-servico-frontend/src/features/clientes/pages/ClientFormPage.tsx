import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/BackButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient, useUpsertClient } from '../hooks';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const schema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  tipo_inscricao: z.enum(['cnpj', 'cpf', 'cei', 'cno', 'caepf'], { required_error: 'Selecione o tipo' }),
  numero_inscricao: z.string().min(3, 'Número de inscrição inválido').max(30, 'Número de inscrição muito longo'),
  tipo_cliente: z.enum(['gestao', 'avulso', 'fornecedor']).optional(),
  observacao: z.string().optional(),
  nome_representante: z.string().max(50, 'Nome muito longo').optional(),
  setor_representante: z.string().max(50, 'Setor muito longo').optional(),
  email_representante: z.string().email('E-mail do representante inválido').max(254).optional().or(z.literal('')),
  contato_representante: z.string().max(50, 'Contato muito longo').optional(),
  cliente_ativo: z.boolean().default(true),
  cobranca_revisao_alteracao: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

const ClientFormPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;
  const { data: existing } = useClient(id);
  const upsert = useUpsertClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: undefined,
      nome: '',
      tipo_inscricao: 'cpf',
      numero_inscricao: '',
      tipo_cliente: 'gestao',
      observacao: '',
      nome_representante: '',
      setor_representante: '',
      email_representante: '',
      contato_representante: '',
      cliente_ativo: true,
      cobranca_revisao_alteracao: false,
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        id: existing.id,
        nome: existing.name,
        tipo_inscricao: (existing.tipo_inscricao as FormValues['tipo_inscricao']) || 'cpf',
        numero_inscricao: existing.document || '',
        tipo_cliente: (existing.tipoCliente as FormValues['tipo_cliente']) || 'gestao',
        observacao: existing.notes || '',
        nome_representante: existing.representativeName || '',
        setor_representante: existing.representativeSector || '',
        email_representante: existing.representativeEmail || '',
        contato_representante: existing.representativeContact || '',
        cliente_ativo: !!existing.active,
        cobranca_revisao_alteracao: !!existing.chargeRevisionChange,
      });
    }
  }, [existing]);

  const onSubmit = (values: FormValues) => {
    // Campos de representante e observação são nullable no backend — envia null
    // em vez de string vazia para ficar de acordo com o contrato da API.
    const payload = {
      ...(values.id ? { id: values.id } : {}),
      nome: values.nome,
      tipo_inscricao: values.tipo_inscricao,
      numero_inscricao: values.numero_inscricao,
      tipo_cliente: values.tipo_cliente,
      observacao: values.observacao || null,
      nome_representante: values.nome_representante || null,
      setor_representante: values.setor_representante || null,
      email_representante: values.email_representante || null,
      contato_representante: values.contato_representante || null,
      ativo: values.cliente_ativo,
      cobranca_revisao_alteracao: values.cobranca_revisao_alteracao,
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        navigate('/clientes');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">{id ? 'Editar Cliente' : 'Adicionar Cliente'}</h1>
        <BackButton to="/clientes" />
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Dados do cliente</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" maxLength={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo_cliente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de cliente</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gestao">Gestão</SelectItem>
                            <SelectItem value="avulso">Avulso</SelectItem>
                            <SelectItem value="fornecedor">Fornecedor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Status e regras</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cliente_ativo"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <FormLabel className="m-0">Cliente ativo</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cobranca_revisao_alteracao"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <FormLabel className="m-0">Cobrança por revisão/alteração</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Identificação</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo_inscricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de inscrição</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cnpj">CNPJ</SelectItem>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="cei">CEI</SelectItem>
                            <SelectItem value="cno">CNO</SelectItem>
                            <SelectItem value="caepf">CAEPF</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numero_inscricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de inscrição</FormLabel>
                        <FormControl>
                          <Input placeholder="CPF/CNPJ/..." maxLength={30} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Representante</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do representante</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do representante" maxLength={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="setor_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor do representante</FormLabel>
                        <FormControl>
                          <Input placeholder="Setor" maxLength={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail do representante</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@dominio.com" maxLength={254} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contato_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato do representante</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-0000" maxLength={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Observação</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="observacao"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Observação</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações gerais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/clientes')}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-w-32">{id ? 'Salvar' : 'Adicionar'}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientFormPage;
