import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useCatalogoOperacional, useUpsertCatalogoOperacional } from '../hooks';

type FormValues = {
  nome: string;
  descricao: string;
};

const CatalogoOperacionalFormPage = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId ? Number(paramId) : undefined;
  const { canManageQuickTasks: canManage } = useUserRole();
  const { data: catalogItem } = useCatalogoOperacional(id);
  const upsert = useUpsertCatalogoOperacional();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: { nome: '', descricao: '' },
  });

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
      });
    }
  }, [catalogItem]);

  const onSubmit = (values: FormValues) => {
    if (!canManage) return;
    upsert.mutate(
      {
        id,
        payload: {
          nome: values.nome,
          descricao: values.descricao || null,
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Informações do serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogoOperacionalFormPage;
