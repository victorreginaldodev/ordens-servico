import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setIsSubmitted(true);
      toast({
        title: 'Verifique seu e-mail',
        description: 'Se o e-mail estiver cadastrado, enviamos as instruções.',
      });
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.email?.[0] ||
        'Não foi possível enviar o e-mail de recuperação.';
      toast({
        title: 'Falha ao enviar',
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
            <CardTitle style={{ marginTop: '1.5rem' }}>Recuperar senha</CardTitle>
            <CardDescription>
              {isSubmitted
                ? 'Verifique sua caixa de entrada'
                : 'Informe seu e-mail para receber o link de recuperação'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    Enviamos as instruções para <strong className="text-primary">{email}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Caso não encontre o e-mail na sua caixa de entrada, lembre-se de conferir a pasta de spam ou lixo eletrônico.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button asChild variant="default" className="w-full h-10">
                    <Link to="/login">Voltar ao login</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Tentar outro e-mail
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 bg-secondary border-border"
                    />
                  </div>
                </div>

                <Button type="submit" variant="default" className="w-full h-10" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
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

export default ForgotPasswordPage;
