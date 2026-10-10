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
import { useClients, useContact, useUpsertContact } from '../hooks';
import type { ContactApiInput } from '../services';

const schema = z.object({
  id: z.string().optional(),
  cliente: z.string().min(1, 'Selecione o cliente'),
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  setor: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ContactFormPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;
  const { data: existing } = useContact(id);
  const upsert = useUpsertContact();
  const { data: clients = [] } = useClients();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: undefined,
      cliente: '',
      nome: '',
      email: '',
      telefone: '',
      setor: '',
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        id: existing.id,
        cliente: existing.cliente,
        nome: existing.nome,
        email: existing.email,
        telefone: existing.telefone,
        setor: existing.setor || '',
      });
    }
  }, [existing]);

  const onSubmit = (values: FormValues) => {
    const payload: ContactApiInput & { id?: string } = {
      id: values.id,
      cliente: Number(values.cliente),
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      setor: values.setor,
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        navigate('/clientes/contacts');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">{id ? 'Editar Contato' : 'Adicionar Contato'}</h1>
        <BackButton to="/clientes/contacts" />
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <Form {...form}>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@dominio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <Input placeholder="Financeiro, Comercial, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/clientes/contacts')}>
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

export default ContactFormPage;
