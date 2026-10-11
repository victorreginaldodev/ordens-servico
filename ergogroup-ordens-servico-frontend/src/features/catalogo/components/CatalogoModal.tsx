import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Network, TriangleAlert } from 'lucide-react';
import { AtivoBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro, statusDoErro } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { useSetores } from '@/features/organizacao/hooks';
import { useDeleteCatalogo, useUpsertCatalogo } from '../hooks';
import type { CatalogoItem } from '../services';

/**
 * Etapas do modal do catálogo: um único modal troca de conteúdo, nunca um sobre o outro.
 * "Voltar" nas confirmações retorna ao formulário quando foi de lá que a pessoa veio.
 */
export type EtapaCatalogo =
  | { tipo: 'form'; id?: number }
  | { tipo: 'desativar'; id: number; voltarAoForm?: boolean }
  | { tipo: 'excluir'; id: number; voltarAoForm?: boolean };

interface CatalogoModalProps {
  etapa: EtapaCatalogo | null;
  onEtapa: (etapa: EtapaCatalogo | null) => void;
  catalogos: CatalogoItem[];
  /** Ainda carregando a lista: o formulário de edição espera o registro chegar. */
  carregando?: boolean;
}

export function CatalogoModal({ etapa, onEtapa, catalogos, carregando }: CatalogoModalProps) {
  const item = etapa?.id ? catalogos.find((c) => c.id === etapa.id) ?? null : null;
  const fechar = () => onEtapa(null);
  const voltar = () =>
    etapa && 'voltarAoForm' in etapa && etapa.voltarAoForm && item ? onEtapa({ tipo: 'form', id: item.id }) : fechar();

  // Registro inexistente (link antigo, excluído em outra aba): fecha em vez de mostrar um modal vazio.
  const sumiu = !!etapa?.id && !carregando && !item;
  useEffect(() => {
    if (sumiu) onEtapa(null);
  }, [sumiu, onEtapa]);

  let conteudo: React.ReactNode = null;
  if (etapa?.tipo === 'form' && (!etapa.id || item)) {
    conteudo = <EtapaForm key={etapa.id ?? 'novo'} item={item} onFechar={fechar} onEtapa={onEtapa} />;
  } else if (item && etapa?.tipo === 'desativar') {
    conteudo = <EtapaDesativar item={item} onVoltar={voltar} onConcluido={fechar} />;
  } else if (item && etapa?.tipo === 'excluir') {
    conteudo = (
      <EtapaExcluir
        item={item}
        onVoltar={voltar}
        onExcluido={fechar}
        onDesativar={() => onEtapa({ tipo: 'desativar', id: item.id, voltarAoForm: etapa.voltarAoForm })}
      />
    );
  }

  return (
    <Dialog open={!!conteudo} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', etapa?.tipo === 'form' ? 'sm:max-w-xl' : 'sm:max-w-md')}>
        {conteudo}
      </DialogContent>
    </Dialog>
  );
}

// ── Formulário ──────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do serviço').max(100, 'Use no máximo 100 caracteres'),
  descricao: z.string().trim().max(2000, 'Use no máximo 2000 caracteres'),
  setor: z.string().min(1, 'Escolha o setor que executa este serviço'),
  ativo: z.boolean(),
});

type Valores = z.infer<typeof schema>;

function EtapaForm({
  item,
  onFechar,
  onEtapa,
}: {
  item: CatalogoItem | null;
  onFechar: () => void;
  onEtapa: (e: EtapaCatalogo | null) => void;
}) {
  const { toast } = useToast();
  const { data: setores = [] } = useSetores();
  const salvar = useUpsertCatalogo();
  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: item?.nome ?? '',
      descricao: item?.descricao ?? '',
      setor: item?.setor ? String(item.setor) : '',
      ativo: item?.ativo ?? true,
    },
  });

  const setorEscolhido = form.watch('setor');
  const nomeSetor = setores.find((s) => String(s.id) === setorEscolhido)?.nome;
  // Mudar o setor não move os serviços já vendidos (eles guardam o setor da época).
  const mudouSetor = !!item?.setor && setorEscolhido !== '' && setorEscolhido !== String(item.setor);
  // Setor inativo só aparece se já for o atual (o backend não aceita escolher um setor inativo).
  const opcoesSetor = setores.filter((s) => s.ativo || s.id === item?.setor);

  const onSubmit = (v: Valores) =>
    salvar.mutate(
      { id: item?.id, payload: { nome: v.nome, descricao: v.descricao || null, setor: Number(v.setor), ativo: v.ativo } },
      {
        onSuccess: (salvo) => {
          const titulo = item ? 'Serviço atualizado' : 'Serviço adicionado ao catálogo';
          // O backend salva, mas avisa quando o setor não tem quem organize (a fila ficaria sem responsável).
          // Um aviso só, no lugar da confirmação: o toast mostra uma mensagem por vez.
          if (salvo.avisos?.length) toast({ title: `${titulo}, com um aviso`, description: salvo.avisos.join(' '), duration: 12_000 });
          else toast({ title: titulo, description: v.nome });
          onFechar();
        },
        onError: (error) => {
          const dados = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
          const msg = mensagemDeErro(error, 'Não foi possível salvar.');
          if (dados?.setor) form.setError('setor', { message: mensagemDeErro({ response: { data: dados.setor } }, msg) });
          else if (dados?.nome) form.setError('nome', { message: mensagemDeErro({ response: { data: dados.nome } }, msg) });
          else toast({ title: 'Não foi possível salvar', description: msg, variant: 'destructive' });
        },
      },
    );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <DialogHeader className="space-y-1.5 pr-6 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{item ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
            {item && !item.ativo && <AtivoBadge ativo={false} />}
          </div>
          <DialogDescription>Um serviço que a empresa vende e que entra nas ordens de serviço.</DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do serviço</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Laudo ergonômico (AET)" autoFocus={!item} {...field} />
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
              <FormLabel>Setor responsável</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha quem executa este serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {opcoesSetor.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                      {!s.ativo && ' (desativado)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              {mudouSetor ? (
                <p className="flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-xs text-warning-strong">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Só as próximas OS usam o novo setor. Os serviços já vendidos continuam com o setor antigo.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Network className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {nomeSetor ? (
                      <>
                        Quando vendido, o serviço entra na fila de <strong className="font-medium text-foreground">{nomeSetor}</strong>.
                      </>
                    ) : (
                      'Os serviços vendidos deste tipo entram na fila do setor escolhido.'
                    )}{' '}
                    <Link to="/organizacao/setores" className="font-medium text-primary hover:underline">
                      Ver setores
                    </Link>
                  </span>
                </p>
              )}
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
                <Textarea rows={4} placeholder="O que está incluído, entregáveis, normas de referência…" {...field} />
              </FormControl>
              <FormDescription>Opcional. Ajuda o comercial a escolher o serviço certo ao montar a OS.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {item && (
          <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
                <div className="space-y-0.5">
                  <FormLabel>Disponível para novas OS</FormLabel>
                  <FormDescription>Desativado, some da montagem de OS, mas continua nas OS já vendidas.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <DialogFooter className="gap-2 border-t pt-4 sm:justify-between sm:space-x-0">
          {item ? (
            <Button type="button" variant="ghost" className="text-danger-strong" onClick={() => onEtapa({ tipo: 'excluir', id: item.id, voltarAoForm: true })}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : item ? 'Salvar' : 'Adicionar ao catálogo'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ── Desativar ───────────────────────────────────────────────────────────────

function EtapaDesativar({ item, onVoltar, onConcluido }: { item: CatalogoItem; onVoltar: () => void; onConcluido: () => void }) {
  const { toast } = useToast();
  const salvar = useUpsertCatalogo();
  const desativar = () =>
    salvar.mutate(
      { id: item.id, payload: { ativo: false } },
      {
        onSuccess: () => {
          toast({ title: 'Serviço desativado', description: item.nome });
          onConcluido();
        },
        onError: (error) => toast({ title: 'Não foi possível desativar', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' }),
      },
    );
  return (
    <>
      <DialogHeader>
        <DialogTitle>Desativar {item.nome}?</DialogTitle>
        <DialogDescription>
          O serviço deixa de aparecer ao montar novas OS. As OS já vendidas com ele não mudam, e você pode reativá-lo depois.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
        <Button onClick={desativar} disabled={salvar.isPending}>
          Desativar
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Excluir ─────────────────────────────────────────────────────────────────

function EtapaExcluir({
  item,
  onVoltar,
  onExcluido,
  onDesativar,
}: {
  item: CatalogoItem;
  onVoltar: () => void;
  onExcluido: () => void;
  onDesativar: () => void;
}) {
  const { toast } = useToast();
  const excluir = useDeleteCatalogo();
  const confirmar = () =>
    excluir.mutate(item.id, {
      onSuccess: () => {
        toast({ title: 'Serviço excluído do catálogo', description: item.nome });
        onExcluido();
      },
      onError: (error) => {
        // 409: já há serviços vendidos com este catálogo. A saída é desativar.
        if (statusDoErro(error) === 409) {
          toast({ title: 'Este serviço já foi vendido', description: 'Desative em vez de excluir para manter o histórico das OS.' });
          if (item.ativo) onDesativar();
        } else {
          toast({ title: 'Não foi possível excluir', description: mensagemDeErro(error, 'Tente novamente.'), variant: 'destructive' });
        }
      },
    });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Excluir {item.nome}?</DialogTitle>
        <DialogDescription>
          O serviço sai do catálogo de vez. Se ele já foi vendido em alguma OS, o sistema não deixa excluir: desative-o para
          tirá-lo de uso sem perder o histórico.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
        {item.ativo && (
          <Button variant="outline" onClick={onDesativar}>
            Desativar
          </Button>
        )}
        <Button variant="destructive" onClick={confirmar} disabled={excluir.isPending}>
          Excluir
        </Button>
      </DialogFooter>
    </>
  );
}
