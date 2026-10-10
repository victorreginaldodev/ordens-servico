import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCompany, useUpsertCompany } from '../hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  cnpj: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  logo: z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const CompanySettingsPage = () => {
  const { data: company, isLoading } = useCompany();
  const upsert = useUpsertCompany();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', cnpj: '', email: '', phone: '', address: '', logo: '' },
  });

  const onlyDigits = (v: string) => v.replace(/\D/g, '');
  const formatCNPJ = (v: string) => {
    const d = onlyDigits(v).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.replace(/(\d{2})(\d{1,3})/, '$1.$2');
    if (d.length <= 8) return d.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (d.length <= 12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
  };
  const formatPhone = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return d.replace(/(\d{2})(\d{1,4})/, '($1) $2');
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    return d.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
  };

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || '',
        cnpj: company.cnpj || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        logo: company.logo || '',
      });
    }
  }, [company]);

  const onSubmit = (values: FormValues) => {
    upsert.mutate(values, {
      onSuccess: () => {
        toast({
          title: 'Dados salvos',
          description: 'As informações da empresa foram atualizadas.',
        });
      },
      onError: () => {
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar. Tente novamente.',
          variant: 'destructive',
        });
      },
    });
  };

  const logoSrc = form.watch('logo') || company?.logo || '';
  const initials = (company?.name || 'E')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dados da Empresa</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua empresa</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-32 ml-auto" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-20 h-20">
                    {logoSrc ? <AvatarImage src={logoSrc} /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="w-full">
                  <h2 className="text-lg font-semibold">Marca</h2>
                  <p className="text-sm text-muted-foreground">Logo e identidade visual</p>
                </div>
              </div>
              <Form {...form}>
                <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Dados Gerais</h3>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da empresa" {...field} disabled={upsert.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="00.000.000/0000-00"
                                value={field.value}
                                onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                                disabled={upsert.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Contato</h3>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contato@empresa.com" {...field} disabled={upsert.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(00) 00000-0000"
                                value={field.value}
                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                disabled={upsert.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Endereço</h3>
                    <Separator />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número - cidade/UF" {...field} disabled={upsert.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Logo</h3>
                    <Separator />
                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logo</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} disabled={upsert.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" className="min-w-32" disabled={upsert.isPending}>
                      {upsert.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;
