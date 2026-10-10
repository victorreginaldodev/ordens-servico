import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Lock, ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: 'Token ausente',
        description: 'O link de recuperação parece inválido. Solicite um novo link.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas divergentes',
        description: 'A confirmação de senha não confere com a nova senha digitada.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setIsSuccess(true);
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Você já pode fazer login com suas novas credenciais.',
      });
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.token?.[0] ||
        (Array.isArray(error?.response?.data?.new_password)
          ? error.response.data.new_password.join(' ')
          : error?.response?.data?.new_password) ||
        'Não foi possível redefinir a senha. O link pode ter expirado.';

      toast({
        title: 'Falha ao redefinir',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-2">
            <Link to="/login" className="inline-flex flex-col items-center">
              <img
                src="/images/logos/logo-ergo-completa.png"
                alt="Ergo"
                className="h-16 object-contain"
              />
            </Link>
            <CardTitle style={{ marginTop: '1.5rem' }}>Redefinir senha</CardTitle>
            <CardDescription>
              {isSuccess
                ? 'Sua senha foi alterada com sucesso'
                : !token
                ? 'Link de recuperação inválido ou não informado'
                : 'Crie uma nova senha segura para sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    Tudo pronto! Sua senha foi atualizada.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique no botão abaixo para ir para a tela de login.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="w-full h-10"
                  onClick={() => navigate('/login')}
                >
                  Ir para o login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : !token ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    Link de recuperação ausente ou incompleto
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para redefinir sua senha, utilize o link enviado no seu e-mail ou faça uma nova solicitação.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button asChild variant="default" className="w-full h-10">
                    <Link to="/forgot-password">Solicitar novo link</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground">
                    <Link to="/login">Voltar ao login</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="Mínimo de 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-10 bg-secondary border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-10 bg-secondary border-border"
                    />
                  </div>
                </div>

                <Button type="submit" variant="default" className="w-full h-10" disabled={isLoading}>
                  {isLoading ? 'Redefinindo...' : 'Salvar nova senha'}
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <div className="text-center text-sm">
                  <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
