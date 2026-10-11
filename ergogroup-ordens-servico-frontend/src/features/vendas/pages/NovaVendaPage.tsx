import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight, Banknote, Check, Layers, Loader2, Mail, Plus, Repeat, Trash2, type LucideIcon } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCatalogos } from '@/features/catalogo/hooks';
import { useClient, useClients } from '@/features/clientes/hooks';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SeletorBusca } from '../components/SeletorBusca';
import { FORMA_PAGAMENTO_LABEL, LIBERAR_EM_LABEL, previaDaCondicao, validarCondicao } from '../condicao';
import { useCriarVenda, useEditarVenda, useVenda } from '../hooks';
import type { EdicaoDaVendaPayload, FormaPagamento, LiberarEm, NovaVendaPayload, Prioridade, TipoCondicao } from '../services';

/**
 * Nova venda (`/vendas/nova`) e edição (`/vendas/:id/editar`), em etapas numa página
 * (fluxos-e-navegacao.md §6.5): cliente e venda → condição → serviços → revisão. Um envio só.
 * Na edição, só as etapas 1 e 2; a 2 some para quem não vê valores (o backend ignora esses campos).
 */

type Etapa = 1 | 2 | 3 | 4;
interface LinhaDeServico {
  chave: number;
  catalogo: number | null;
  descricao: string;
  prioridade: Prioridade | '';
}
interface Formulario {
  cliente: number | null;
  data_venda: string;
  prioridade: Prioridade;
  observacao: string;
  tipo_condicao: TipoCondicao;
  valor: string;
  valor_mensal: string;
  forma_pagamento: FormaPagamento;
  quantidade_parcelas: string;
  intervalo_parcelas_dias: string;
  data_acordada_cobranca: string;
  dia_fechamento: string;
  dia_vencimento: string;
  liberar_em: LiberarEm;
  nome_contato_envio_nf: string;
  contato_envio_nf: string;
  servicos: LinhaDeServico[];
}

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let proximaChave = 1;
const linhaVazia = (): LinhaDeServico => ({ chave: proximaChave++, catalogo: null, descricao: '', prioridade: '' });
const VAZIO = (): Formulario => ({
  cliente: null,
  data_venda: hoje(),
  prioridade: 'media',
  observacao: '',
  tipo_condicao: 'a_vista',
  valor: '',
  valor_mensal: '',
  forma_pagamento: 'boleto',
  quantidade_parcelas: '',
  intervalo_parcelas_dias: '30',
  data_acordada_cobranca: '',
  dia_fechamento: '',
  dia_vencimento: '',
  liberar_em: 'conclusao',
  nome_contato_envio_nf: '',
  contato_envio_nf: '',
  servicos: [linhaVazia()],
});

/** "1.500,00", "1500,5" ou "1500.50" → "1500.50" (decimal da API). Vazio → "". */
const paraDecimal = (v: string) => {
  const limpo = v.replace(/[^\d,.-]/g, '');
  if (!limpo) return '';
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normal);
  return Number.isNaN(n) ? '' : n.toFixed(2);
};
const deDecimal = (v: string | null | undefined) => (v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const numOuNulo = (v: string) => (v.trim() ? Number(v) : null);

const CAMPOS_DA_ETAPA: Record<string, Etapa> = {
  cliente: 1, data_venda: 1, prioridade: 1, observacao: 1,
  tipo_condicao: 2, valor: 2, valor_mensal: 2, forma_pagamento: 2, quantidade_parcelas: 2, intervalo_parcelas_dias: 2,
  data_acordada_cobranca: 2, dia_fechamento: 2, dia_vencimento: 2, liberar_em: 2, nome_contato_envio_nf: 2, contato_envio_nf: 2,
};

const TIPOS: { v: TipoCondicao; titulo: string; texto: string; icone: LucideIcon }[] = [
  { v: 'a_vista', titulo: 'À vista', texto: 'Um pagamento só.', icone: Banknote },
  { v: 'parcelado', titulo: 'Parcelado', texto: 'Parcelas combinadas; o sistema não controla cada uma.', icone: Layers },
  { v: 'recorrente', titulo: 'Recorrente', texto: 'Um valor por mês, por um número de meses.', icone: Repeat },
];

function Campo({ id, rotulo, erro, dica, opcional, children, className }: { id?: string; rotulo: string; erro?: string; dica?: string; opcional?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>
        {rotulo}
        {opcional ? <span className="font-normal text-muted-foreground"> (opcional)</span> : null}
      </Label>
      {children}
      {erro ? <span className="text-xs text-danger-strong">{erro}</span> : dica ? <span className="text-xs text-muted-foreground">{dica}</span> : null}
    </div>
  );
}

export default function NovaVendaPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const idEdicao = Number(useParams().id) || undefined;
  const editando = !!idEdicao;
  const { pode } = usePermissoes();
  const veValores = pode('financeiro.ver_valores');
  const vendaQ = useVenda(idEdicao);
  const clientesQ = useClients();
  const catalogosQ = useCatalogos();
  const criar = useCriarVenda();
  const editar = useEditarVenda();

  const [form, setForm] = useState<Formulario>(VAZIO);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosServicos, setErrosServicos] = useState<Record<number, string>>({});
  const [carregouEdicao, setCarregouEdicao] = useState(false);
  const clienteQ = useClient(form.cliente ? String(form.cliente) : undefined);

  const etapas: { n: Etapa; titulo: string }[] = editando
    ? [{ n: 1, titulo: 'Cliente e venda' }, ...(veValores ? [{ n: 2 as Etapa, titulo: 'Condição' }] : [])]
    : [
        { n: 1, titulo: 'Cliente e venda' },
        { n: 2, titulo: 'Condição' },
        { n: 3, titulo: 'Serviços' },
        { n: 4, titulo: 'Revisão' },
      ];
  const ultima = etapas[etapas.length - 1].n;

  // Edição: preenche com a venda salva (uma vez).
  useEffect(() => {
    const v = vendaQ.data;
    if (!v || carregouEdicao) return;
    setForm({
      ...VAZIO(),
      cliente: v.cliente,
      data_venda: v.data_venda,
      prioridade: v.prioridade ?? 'media',
      observacao: v.observacao ?? '',
      tipo_condicao: v.tipo_condicao ?? 'a_vista',
      valor: deDecimal(v.valor),
      valor_mensal: deDecimal(v.valor_mensal),
      forma_pagamento: v.forma_pagamento ?? 'boleto',
      quantidade_parcelas: v.quantidade_parcelas ? String(v.quantidade_parcelas) : '',
      intervalo_parcelas_dias: v.intervalo_parcelas_dias ? String(v.intervalo_parcelas_dias) : '',
      data_acordada_cobranca: v.data_acordada_cobranca ?? '',
      dia_fechamento: v.dia_fechamento ? String(v.dia_fechamento) : '',
      dia_vencimento: v.dia_vencimento ? String(v.dia_vencimento) : '',
      liberar_em: v.liberar_em ?? 'conclusao',
      nome_contato_envio_nf: v.nome_contato_envio_nf ?? '',
      contato_envio_nf: v.contato_envio_nf ?? '',
      servicos: [],
    });
    setCarregouEdicao(true);
  }, [vendaQ.data, carregouEdicao]);

  // Contato da NF: sugere o representante do cliente, sem apagar o que já foi digitado.
  useEffect(() => {
    const c = clienteQ.data;
    if (!c || editando) return;
    setForm((f) => ({
      ...f,
      nome_contato_envio_nf: f.nome_contato_envio_nf || c.representativeName || '',
      contato_envio_nf: f.contato_envio_nf || c.representativeEmail || c.email || '',
    }));
  }, [clienteQ.data, editando]);

  const muda = (p: Partial<Formulario>) => {
    setForm((f) => ({ ...f, ...p }));
    setErros((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => delete n[k]);
      return n;
    });
  };
  const mudaServico = (chave: number, p: Partial<LinhaDeServico>) => {
    setForm((f) => ({ ...f, servicos: f.servicos.map((s) => (s.chave === chave ? { ...s, ...p } : s)) }));
    setErrosServicos((e) => ({ ...e, [chave]: '' }));
  };

  const catalogos = useMemo(() => (catalogosQ.data ?? []).filter((c) => c.ativo), [catalogosQ.data]);
  const clientes = (clientesQ.data ?? []).filter((c) => c.active !== false || Number(c.id) === form.cliente);
  const catalogo = (id: number | null) => catalogos.find((c) => c.id === id) ?? (catalogosQ.data ?? []).find((c) => c.id === id);
  const clienteNome = clientes.find((c) => Number(c.id) === form.cliente)?.name ?? vendaQ.data?.cliente_detail?.nome ?? '';

  /* ── Validação por etapa (as regras do backend, antes de enviar) ── */
  const validar = (e: Etapa): boolean => {
    const novos: Record<string, string> = {};
    if (e === 1) {
      if (!form.cliente) novos.cliente = 'Escolha o cliente.';
      if (!form.data_venda) novos.data_venda = 'Informe a data da venda.';
    }
    if (e === 2) {
      if (!paraDecimal(form.valor)) novos.valor = 'Informe o valor total da venda.';
      Object.assign(
        novos,
        validarCondicao({
          tipo_condicao: form.tipo_condicao,
          quantidade_parcelas: form.quantidade_parcelas,
          valor_mensal: paraDecimal(form.valor_mensal) || null,
          dia_fechamento: form.dia_fechamento,
          dia_vencimento: form.dia_vencimento,
          data_acordada_cobranca: form.data_acordada_cobranca,
        }),
      );
      if (form.contato_envio_nf && !/^\S+@\S+\.\S+$/.test(form.contato_envio_nf)) novos.contato_envio_nf = 'E-mail inválido.';
    }
    if (e === 3) {
      const es: Record<number, string> = {};
      if (!form.servicos.length) novos.servicos = 'Acrescente pelo menos um serviço.';
      form.servicos.forEach((s) => {
        if (!s.catalogo) es[s.chave] = 'Escolha o serviço do catálogo.';
        else if (!s.descricao.trim()) es[s.chave] = 'Descreva o serviço (local, escopo).';
      });
      setErrosServicos(es);
      if (Object.keys(es).length) novos.servicos = novos.servicos ?? 'Complete os serviços marcados.';
    }
    setErros(novos);
    return !Object.keys(novos).length;
  };
  const avancar = () => {
    if (!validar(etapa)) return;
    const i = etapas.findIndex((x) => x.n === etapa);
    setEtapa(etapas[i + 1].n);
    window.scrollTo({ top: 0 });
  };
  const voltar = () => {
    const i = etapas.findIndex((x) => x.n === etapa);
    if (i > 0) setEtapa(etapas[i - 1].n);
  };

  const condicao = () => {
    const t = form.tipo_condicao;
    return {
      tipo_condicao: t,
      valor: paraDecimal(form.valor) || '0.00',
      valor_mensal: t === 'recorrente' ? paraDecimal(form.valor_mensal) || null : null,
      forma_pagamento: form.forma_pagamento,
      quantidade_parcelas: t === 'a_vista' ? null : numOuNulo(form.quantidade_parcelas),
      intervalo_parcelas_dias: t === 'parcelado' ? numOuNulo(form.intervalo_parcelas_dias) : null,
      data_acordada_cobranca: form.data_acordada_cobranca || null,
      dia_fechamento: t === 'recorrente' ? numOuNulo(form.dia_fechamento) : null,
      dia_vencimento: t === 'recorrente' ? numOuNulo(form.dia_vencimento) : null,
      liberar_em: form.liberar_em,
      nome_contato_envio_nf: form.nome_contato_envio_nf.trim(),
      contato_envio_nf: form.contato_envio_nf.trim(),
    };
  };

  /** 400 do backend: cada campo volta para a sua etapa. */
  const tratarErro = (e: unknown) => {
    const data = isAxiosError(e) ? e.response?.data : null;
    if (data && typeof data === 'object' && !Array.isArray(data) && !('detail' in data)) {
      const novos: Record<string, string> = {};
      let primeira: Etapa | null = null;
      Object.entries(data as Record<string, unknown>).forEach(([campo, msg]) => {
        if (campo === 'servicos' && Array.isArray(msg)) {
          const es: Record<number, string> = {};
          msg.forEach((m, i) => {
            const texto = mensagemDeErro({ response: { data: m } }, '');
            if (texto && form.servicos[i]) es[form.servicos[i].chave] = texto;
          });
          setErrosServicos(es);
          novos.servicos = 'Corrija os serviços marcados.';
          primeira = primeira ?? 3;
          return;
        }
        novos[campo] = mensagemDeErro({ response: { data: msg } }, 'Valor inválido.');
        primeira = primeira ?? CAMPOS_DA_ETAPA[campo] ?? null;
      });
      setErros(novos);
      if (primeira && etapas.some((x) => x.n === primeira)) setEtapa(primeira);
    }
    toast({ title: 'Não foi possível salvar a venda', description: mensagemDeErro(e, 'Confira os campos marcados.'), variant: 'destructive' });
  };

  const salvar = () => {
    if (!validar(etapa)) return;
    if (editando) {
      const payload: EdicaoDaVendaPayload = {
        cliente: form.cliente!,
        data_venda: form.data_venda,
        prioridade: form.prioridade,
        observacao: form.observacao.trim() || null,
        ...(veValores ? condicao() : {}),
      };
      editar.mutate(
        { id: idEdicao!, payload },
        {
          onSuccess: () => {
            toast({ title: 'Venda atualizada', description: `OS ${idEdicao} · ${clienteNome}` });
            navigate(`/vendas/${idEdicao}`);
          },
          onError: tratarErro,
        },
      );
      return;
    }
    const payload: NovaVendaPayload = {
      cliente: form.cliente!,
      data_venda: form.data_venda,
      prioridade: form.prioridade,
      observacao: form.observacao.trim() || null,
      ...condicao(),
      servicos: form.servicos.map((s) => ({ catalogo: s.catalogo!, descricao: s.descricao.trim(), ...(s.prioridade ? { prioridade: s.prioridade } : {}) })),
    };
    criar.mutate(payload, {
      onSuccess: (v) => {
        toast({ title: `Venda registrada · OS ${v.id}`, description: 'Cada setor recebeu os seus serviços e foi avisado por e-mail.' });
        navigate(`/vendas/${v.id}`);
      },
      onError: tratarErro,
    });
  };

  if (editando && vendaQ.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (editando && vendaQ.isError) return <EmptyState title="Não foi possível abrir a venda" description={mensagemDeErro(vendaQ.error, 'Ela não existe ou não está visível para você.')} />;

  const salvando = criar.isPending || editar.isPending;
  const porSetor = new Map<string, { catalogo: string; descricao: string }[]>();
  form.servicos.forEach((s) => {
    const c = catalogo(s.catalogo);
    if (!c) return;
    const k = c.setorNome ?? 'Sem setor';
    porSetor.set(k, [...(porSetor.get(k) ?? []), { catalogo: c.nome, descricao: s.descricao }]);
  });
  const resumo = previaDaCondicao({ ...condicao(), quantidade_parcelas: form.quantidade_parcelas, intervalo_parcelas_dias: form.intervalo_parcelas_dias });

  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      <PageHeader
        title={editando ? `Editar venda · OS ${idEdicao}` : 'Nova venda'}
        description={editando ? 'Dados da venda e condição. Os serviços são acrescentados no resumo da venda.' : 'Cliente, condição de pagamento e serviços vendidos. Cada setor recebe os seus serviços ao salvar.'}
        backTo={editando ? `/vendas/${idEdicao}` : '/vendas'}
      />

      {/* Etapas */}
      <ol className="mb-5 flex flex-wrap gap-2" aria-label="Etapas">
        {etapas.map((x, i) => {
          const atual = x.n === etapa;
          const feita = etapas.findIndex((y) => y.n === etapa) > i;
          return (
            <li key={x.n}>
              <button
                type="button"
                disabled={!feita}
                onClick={() => setEtapa(x.n)}
                aria-current={atual ? 'step' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
                  atual ? 'border-primary bg-primary/10 font-semibold text-foreground' : feita ? 'bg-card hover:bg-muted' : 'bg-card text-muted-foreground',
                )}
              >
                <span className={cn('grid size-5 place-items-center rounded-full text-2xs font-bold', atual || feita ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {feita ? <Check className="size-3" /> : i + 1}
                </span>
                {x.titulo}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        {etapa === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="v-cliente" rotulo="Cliente" erro={erros.cliente} className="sm:col-span-2">
              <SeletorBusca
                id="v-cliente"
                opcoes={clientes.map((c) => ({ valor: Number(c.id), rotulo: c.name, detalhe: c.document }))}
                valor={form.cliente}
                onChange={(cliente) => muda({ cliente })}
                placeholder="Escolha o cliente"
                vazio="Nenhum cliente com esse nome."
                invalido={!!erros.cliente}
                carregando={clientesQ.isLoading}
              />
            </Campo>
            <Campo id="v-data" rotulo="Data da venda" erro={erros.data_venda}>
              <Input id="v-data" type="date" value={form.data_venda} onChange={(e) => muda({ data_venda: e.target.value })} />
            </Campo>
            <Campo rotulo="Prioridade" erro={erros.prioridade} dica="Os serviços herdam a prioridade da venda, se não tiverem uma própria.">
              <div className="flex gap-1.5">
                {(['baixa', 'media', 'alta'] as Prioridade[]).map((p) => (
                  <Button key={p} type="button" size="sm" variant={form.prioridade === p ? 'default' : 'outline'} onClick={() => muda({ prioridade: p })}>
                    {{ baixa: 'Baixa', media: 'Média', alta: 'Alta' }[p]}
                  </Button>
                ))}
              </div>
            </Campo>
            <Campo id="v-obs" rotulo="Observação" opcional erro={erros.observacao} className="sm:col-span-2" dica="Aparece para os setores no detalhe de cada serviço.">
              <Textarea id="v-obs" rows={3} value={form.observacao} onChange={(e) => muda({ observacao: e.target.value })} />
            </Campo>
          </div>
        ) : null}

        {etapa === 2 ? (
          <div className="grid gap-5">
            <Campo rotulo="Tipo de condição" erro={erros.tipo_condicao}>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de condição">
                {TIPOS.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    role="radio"
                    aria-checked={form.tipo_condicao === t.v}
                    onClick={() => muda({ tipo_condicao: t.v })}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                      form.tipo_condicao === t.v ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-muted/50',
                    )}
                  >
                    <t.icone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold">{t.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{t.texto}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Campo>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="v-valor" rotulo="Valor total (R$)" erro={erros.valor}>
                <Input id="v-valor" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => muda({ valor: e.target.value })} />
              </Campo>
              {form.tipo_condicao === 'recorrente' ? (
                <Campo id="v-mensal" rotulo="Valor mensal (R$)" erro={erros.valor_mensal} dica="O total não é calculado do mensal: informe os dois.">
                  <Input id="v-mensal" inputMode="decimal" placeholder="0,00" value={form.valor_mensal} onChange={(e) => muda({ valor_mensal: e.target.value })} />
                </Campo>
              ) : null}
              {form.tipo_condicao !== 'a_vista' ? (
                <Campo id="v-qtd" rotulo={form.tipo_condicao === 'parcelado' ? 'Parcelas' : 'Meses'} erro={erros.quantidade_parcelas}>
                  <Input id="v-qtd" type="number" min={form.tipo_condicao === 'parcelado' ? 2 : 1} value={form.quantidade_parcelas} onChange={(e) => muda({ quantidade_parcelas: e.target.value })} />
                </Campo>
              ) : null}
              {form.tipo_condicao === 'parcelado' ? (
                <Campo id="v-int" rotulo="Intervalo (dias)" opcional erro={erros.intervalo_parcelas_dias}>
                  <Input id="v-int" type="number" min={1} value={form.intervalo_parcelas_dias} onChange={(e) => muda({ intervalo_parcelas_dias: e.target.value })} />
                </Campo>
              ) : null}
              {form.tipo_condicao === 'recorrente' ? (
                <>
                  <Campo id="v-fecha" rotulo="Dia de fechamento" opcional erro={erros.dia_fechamento}>
                    <Input id="v-fecha" type="number" min={1} max={31} value={form.dia_fechamento} onChange={(e) => muda({ dia_fechamento: e.target.value })} />
                  </Campo>
                  <Campo id="v-vence" rotulo="Dia de vencimento" erro={erros.dia_vencimento}>
                    <Input id="v-vence" type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => muda({ dia_vencimento: e.target.value })} />
                  </Campo>
                </>
              ) : null}
              <Campo id="v-venc" rotulo={form.tipo_condicao === 'a_vista' ? 'Vencimento' : '1º vencimento'} opcional={form.tipo_condicao !== 'parcelado'} erro={erros.data_acordada_cobranca}>
                <Input id="v-venc" type="date" value={form.data_acordada_cobranca} onChange={(e) => muda({ data_acordada_cobranca: e.target.value })} />
              </Campo>
              <Campo id="v-forma" rotulo="Forma de pagamento" erro={erros.forma_pagamento}>
                <select id="v-forma" value={form.forma_pagamento} onChange={(e) => muda({ forma_pagamento: e.target.value as FormaPagamento })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {(Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGAMENTO_LABEL[f]}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo rotulo="Quando libera para o financeiro" erro={erros.liberar_em} dica="Liberada, a OS aparece em Cobranças “a faturar” e o financeiro é avisado.">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(LIBERAR_EM_LABEL) as LiberarEm[]).map((l) => (
                  <Button key={l} type="button" size="sm" variant={form.liberar_em === l ? 'default' : 'outline'} onClick={() => muda({ liberar_em: l })}>
                    {LIBERAR_EM_LABEL[l]}
                  </Button>
                ))}
              </div>
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="v-nf-nome" rotulo="Contato para a NF" opcional erro={erros.nome_contato_envio_nf}>
                <Input id="v-nf-nome" maxLength={50} value={form.nome_contato_envio_nf} onChange={(e) => muda({ nome_contato_envio_nf: e.target.value })} />
              </Campo>
              <Campo id="v-nf-mail" rotulo="E-mail para a NF" opcional erro={erros.contato_envio_nf} dica={!editando ? 'Sugerido a partir do representante do cliente.' : undefined}>
                <Input id="v-nf-mail" type="email" value={form.contato_envio_nf} onChange={(e) => muda({ contato_envio_nf: e.target.value })} />
              </Campo>
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Como vai aparecer: </span>
              <span className="font-medium">{resumo}</span>
            </p>
            {!veValores ? (
              <p className="text-xs text-muted-foreground">Você informa a condição ao registrar a venda, mas depois de salva ela só aparece para quem vê valores.</p>
            ) : null}
          </div>
        ) : null}

        {etapa === 3 ? (
          <div className="grid gap-3">
            {form.servicos.map((s, i) => {
              const c = catalogo(s.catalogo);
              return (
                <div key={s.chave} className={cn('grid gap-3 rounded-lg border p-3', errosServicos[s.chave] && 'border-danger/60')}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    Serviço {i + 1}
                    {c?.setorNome ? <span className="rounded-full bg-info-subtle px-2 py-0.5 text-xs font-medium text-info-strong">vai para {c.setorNome}</span> : null}
                    <Button type="button" variant="ghost" size="icon" className="ml-auto size-8" aria-label={`Remover serviço ${i + 1}`} disabled={form.servicos.length === 1} onClick={() => setForm((f) => ({ ...f, servicos: f.servicos.filter((x) => x.chave !== s.chave) }))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <Campo id={`s-cat-${s.chave}`} rotulo="Catálogo">
                      <SeletorBusca
                        id={`s-cat-${s.chave}`}
                        opcoes={catalogos.map((x) => ({ valor: x.id, rotulo: x.nome, grupo: x.setorNome ?? 'Sem setor', detalhe: x.setorNome ?? undefined }))}
                        valor={s.catalogo}
                        onChange={(catalogo) => mudaServico(s.chave, { catalogo })}
                        placeholder="Escolha o serviço"
                        vazio="Nenhum catálogo ativo com esse nome."
                        carregando={catalogosQ.isLoading}
                      />
                    </Campo>
                    <Campo id={`s-pri-${s.chave}`} rotulo="Prioridade" dica="Vazio = a da venda">
                      <select id={`s-pri-${s.chave}`} value={s.prioridade} onChange={(e) => mudaServico(s.chave, { prioridade: e.target.value as Prioridade | '' })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">Da venda</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </Campo>
                  </div>
                  <Campo id={`s-desc-${s.chave}`} rotulo="Descrição" erro={errosServicos[s.chave]}>
                    <Input id={`s-desc-${s.chave}`} placeholder="Ex.: fábrica e depósito, 40 colaboradores" value={s.descricao} onChange={(e) => mudaServico(s.chave, { descricao: e.target.value })} />
                  </Campo>
                </div>
              );
            })}
            {erros.servicos ? <p className="text-sm text-danger-strong">{erros.servicos}</p> : null}
            <Button type="button" variant="outline" className="justify-self-start" onClick={() => setForm((f) => ({ ...f, servicos: [...f.servicos, linhaVazia()] }))}>
              <Plus className="size-4" /> Mais um serviço
            </Button>
          </div>
        ) : null}

        {etapa === 4 ? (
          <div className="grid gap-5 text-sm">
            <div>
              <h3 className="mb-2 font-semibold">Venda</h3>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd>{clienteNome}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Data</dt><dd>{formatDate(form.data_venda)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Prioridade</dt><dd>{{ baixa: 'Baixa', media: 'Média', alta: 'Alta' }[form.prioridade]}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Observação</dt><dd className="line-clamp-2">{form.observacao || '—'}</dd></div>
              </dl>
            </div>
            <div className="border-t pt-4">
              <h3 className="mb-2 font-semibold">Condição</h3>
              <p className="font-medium">{resumo}</p>
              <p className="mt-1 text-muted-foreground">
                {formatCurrency(paraDecimal(form.valor) || 0)} · {FORMA_PAGAMENTO_LABEL[form.forma_pagamento]} · libera {form.liberar_em === 'venda' ? 'na venda' : 'quando todos os serviços terminarem'}
                {form.contato_envio_nf ? ` · NF para ${form.nome_contato_envio_nf || form.contato_envio_nf}` : ''}
              </p>
            </div>
            <div className="border-t pt-4">
              <h3 className="mb-2 font-semibold">Serviços por setor</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {[...porSetor.entries()].map(([setor, itens]) => (
                  <div key={setor} className="rounded-lg border p-3">
                    <p className="font-semibold">{setor}</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {itens.map((x, i) => (
                        <li key={i}>
                          <span className="text-foreground">{x.catalogo}</span> · {x.descricao}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3.5" /> Quem organiza o setor recebe um e-mail.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-4 flex items-center justify-between gap-2">
        {etapas[0].n !== etapa ? (
          <Button type="button" variant="outline" onClick={voltar}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => navigate(editando ? `/vendas/${idEdicao}` : '/vendas')}>
            Cancelar
          </Button>
        )}
        {etapa === ultima ? (
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {editando ? 'Salvar alterações' : 'Registrar venda'}
          </Button>
        ) : (
          <Button type="button" onClick={avancar}>
            Continuar <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
