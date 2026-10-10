import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth';
import { Badge } from '@/components/ui/badge';
import { profileResponseToUserProfile, AlterarSenhaPayload } from '../services';
import { nomeDaPessoa } from '../utils';
import { getIniciais } from '@/lib/format';
import {
  useMyProfile,
  useUpdateProfile,
  useAlterarSenha,
} from '../hooks';

const profileSchema = z.object({
  username: z.string().min(2, 'Username muito curto'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email('E-mail inválido'),
});

const senhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'Informe a senha atual'),
    nova_senha: z.string().min(6, 'Nova senha deve ter ao menos 6 caracteres'),
    nova_senha_confirmacao: z.string().min(6, 'Confirmação deve ter ao menos 6 caracteres'),
  })
  .refine(v => v.nova_senha === v.nova_senha_confirmacao, {
    path: ['nova_senha_confirmacao'],
    message: 'As senhas não coincidem',
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type SenhaFormValues = z.infer<typeof senhaSchema>;

const MeuPerfilPage = () => {
  const { toast } = useToast();

  const { data: profile, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const alterarSenha = useAlterarSenha();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      nome_completo: '',
      email: '',
    },
  });

  const senhaForm = useForm<SenhaFormValues>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { senha_atual: '', nova_senha: '', nova_senha_confirmacao: '' },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        username: profile.username ?? '',
        nome_completo: profile.nome_completo ?? '',
        email: profile.email ?? '',
      });
    }
  }, [profile]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    if (!profile) return;
    try {
      const payload = {
        username: values.username,
        nome_completo: values.nome_completo,
        email: values.email,
      };
      const updated = await updateProfile.mutateAsync({ id: profile.id, payload });
      toast({ title: 'Dados atualizados', description: 'Seu perfil foi atualizado com sucesso.' });
      authService.setCurrentUser(profileResponseToUserProfile(updated));
      window.dispatchEvent(new Event('servix:auth-updated'));
    } catch {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar suas alterações.',
        variant: 'destructive',
      });
    }
  };

  const onSubmitSenha = async (values: SenhaFormValues) => {
    if (!profile) return;
    try {
      await alterarSenha.mutateAsync({ id: profile.id, payload: values as AlterarSenhaPayload });
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      senhaForm.reset();
    } catch {
      toast({
        title: 'Erro ao alterar senha',
        description: 'Verifique se a senha atual está correta.',
        variant: 'destructive',
      });
    }
  };

  const vinculos = profile?.vinculos ?? [];
  const usernamePreview = profileForm.watch('username') || profile?.username || '';
  const emailPreview = profileForm.watch('email') || profile?.email || '';
  // Nome completo por padrão; sem ele, o nome de usuário.
  const nomePreview = nomeDaPessoa({
    nome_completo: profileForm.watch('nome_completo') || profile?.nome_completo,
    username: usernamePreview,
    email: emailPreview,
  });
  const initials = getIniciais(nomePreview) || 'U';

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Não foi possível carregar suas informações. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Atualize seus dados pessoais</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32 ml-auto" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                  <h2 className="text-lg font-semibold">{nomePreview}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[emailPreview, usernamePreview && `@${usernamePreview}`].filter(Boolean).join(' • ')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {vinculos.map((v) => (
                      <Badge key={v.id} variant="secondary" className="font-medium">
                        {v.funcao_nome}
                        <span className="ml-1 font-normal text-muted-foreground">· {v.setor_nome}</span>
                      </Badge>
                    ))}
                    {profile?.permissoes?.todos_os_setores && <Badge variant="outline">Atua em todos os setores</Badge>}
                    {!vinculos.length && !profile?.is_superuser && (
                      <span className="text-xs text-muted-foreground">
                        Sem setor: você vê só as próprias tarefas e OS. Fale com quem gerencia o time.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Form {...profileForm}>
                <form className="space-y-8" onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Dados Pessoais</h3>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="seu.username" {...field} disabled={updateProfile.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="nome_completo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu Nome" {...field} disabled={updateProfile.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                {...field}
                                disabled={updateProfile.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="min-w-32" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Alterar Senha</h3>
            <Separator />
            <Form {...senhaForm}>
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={senhaForm.handleSubmit(onSubmitSenha)}
              >
                <FormField
                  control={senhaForm.control}
                  name="senha_atual"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Senha atual</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                          disabled={alterarSenha.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={senhaForm.control}
                  name="nova_senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                          disabled={alterarSenha.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={senhaForm.control}
                  name="nova_senha_confirmacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar nova senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                          disabled={alterarSenha.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="outline"
                    className="min-w-32"
                    disabled={alterarSenha.isPending}
                  >
                    {alterarSenha.isPending ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeuPerfilPage;
