import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Banknote,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  CircleAlert,
  Hourglass,
  Layers,
  Loader2,
  Mail,
  Pencil,
  PlusCircle,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
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
import { toastComAvisos } from '@/lib/avisos';
import { formatCurrency, formatDate, formatDocumento } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ServicosDaVendaModal, type ServicoEscolhido } from '../components/ServicosDaVendaModal';
import { CampoData } from '../components/CampoData';
import { SeletorBusca } from '../components/SeletorBusca';
import { FORMA_PAGAMENTO_LABEL, avisosDaCondicao, datasDasParcelas, previaDaCondicao, rotuloDasDemais, validarCondicao, valorDaParcela, type ModoDasDemais, type ModoDoVencimento } from '../condicao';
import { useCriarVenda, useEditarVenda, useVenda } from '../hooks';
import type { EdicaoDaVendaPayload, FormaPagamento, LiberarEm, NovaVendaPayload, Prioridade, TipoCondicao } from '../services';

/**
 * Nova venda (`/vendas/nova`) e edição (`/vendas/:id/editar`) numa página só (fluxos-e-navegacao.md §6.5,
 * wireframe `docs/ui/wireframes/lote4-nova-venda.html`): três seções sempre visíveis (cliente e venda →
 * serviços → pagamento) e um resumo fixo com o que falta. Um envio só. Na edição, sem a seção de serviços;
 * o pagamento some para quem não vê valores (o backend ignora esses campos).
 */

interface LinhaDeServico extends ServicoEscolhido {
  chave: number;
}
interface Formulario {
  cliente: number | null;
  data_venda: string;
  prioridade: Prioridade;
  observacao: string;
  tipo_condicao: TipoCondicao;
  valor: string;
  forma_pagamento: FormaPagamento;
  quantidade_parcelas: string;
  modo_vencimento: ModoDoVencimento;
  data_acordada_cobranca: string;
  vencimento_dias_apos_nota: string;
  modo_demais: ModoDasDemais;
  dia_vencimento_demais: string;
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
const VAZIO = (): Formulario => ({
  cliente: null,
  data_venda: hoje(),
  prioridade: 'media',
  observacao: '',
  tipo_condicao: 'a_vista',
  valor: '',
  forma_pagamento: 'boleto',
  quantidade_parcelas: '',
  modo_vencimento: 'data',
  data_acordada_cobranca: '',
  vencimento_dias_apos_nota: '',
  modo_demais: 'mesmo_dia',
  dia_vencimento_demais: '',
  liberar_em: 'conclusao',
  nome_contato_envio_nf: '',
  contato_envio_nf: '',
  servicos: [],
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
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const PRIORIDADES: Record<Prioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

/** Campo do backend → elemento da página que recebe o foco quando há erro nele. */
const ALVO_DO_CAMPO: Record<string, string> = {
  cliente: 'v-cliente',
  data_venda: 'v-data',
  servicos: 'v-servicos',
  valor: 'v-valor',
  quantidade_parcelas: 'v-qtd',
  data_acordada_cobranca: 'v-vencimento',
  vencimento_dias_apos_nota: 'v-vencimento',
  dia_vencimento_demais: 'v-demais',
  contato_envio_nf: 'v-nf-mail',
};

const TIPOS: { v: TipoCondicao; titulo: string; texto: string; icone: LucideIcon }[] = [
  { v: 'a_vista', titulo: 'À vista', texto: 'O cliente paga tudo de uma vez.', icone: Banknote },
  { v: 'parcelado', titulo: 'Parcelado', texto: 'O cliente paga em parcelas mensais. Serve também para contratos mensais (ex.: gestão em 24x).', icone: Layers },
];

const MODOS_VENCIMENTO: { v: ModoDoVencimento; rotulo: string; icone: LucideIcon }[] = [
  { v: 'data', rotulo: 'Numa data', icone: CalendarDays },
  { v: 'apos_nota', rotulo: 'Dias após a nota', icone: Hourglass },
];

const MODOS_DAS_DEMAIS: { v: ModoDasDemais; rotulo: string }[] = [
  { v: 'mesmo_dia', rotulo: 'No mesmo dia da 1ª' },
  { v: 'dia_fixo', rotulo: 'Num dia fixo' },
];

const ORDINAL = (n: number) => `${n}ª`;

const LIBERACOES: { v: LiberarEm; titulo: string; texto: string; quando: string }[] = [
  {
    v: 'venda',
    titulo: 'Na venda',
    texto: 'Assim que você registrar a venda, o financeiro recebe um e-mail e ela aparece em Cobranças, em “A faturar”.',
    quando: 'Use quando a nota sai antes ou durante o serviço: pagamento antecipado, entrada, contrato mensal.',
  },
  {
    v: 'conclusao',
    titulo: 'Quando todos os serviços terminarem',
    texto: 'O financeiro só é avisado quando o último serviço da venda for concluído, de qualquer setor.',
    quando: 'Use quando a nota sai depois da entrega do serviço.',
  },
];

/** Botões de escolha com título e explicação (tipo, vencimento, liberação). */
function Opcao({ marcado, onClick, icone: Icone, titulo, texto, extra }: { marcado: boolean; onClick: () => void; icone?: LucideIcon; titulo: string; texto?: string; extra?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcado}
      onClick={onClick}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        marcado ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-muted/50',
      )}
    >
      {Icone ? (
        <Icone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', marcado && 'border-primary bg-primary')} aria-hidden>
          {marcado ? <Check className="size-3 text-primary-foreground" /> : null}
        </span>
      )}
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        {texto ? <span className="mt-0.5 block text-xs text-muted-foreground">{texto}</span> : null}
        {extra ? <span className="mt-1 block text-xs text-foreground/80">{extra}</span> : null}
      </span>
    </button>
  );
}

/** Escolha compacta entre poucas opções, na altura de um campo (40px). */
function Segmentado<T extends string>({ opcoes, valor, onChange, rotulo }: { opcoes: { v: T; rotulo: string; icone?: LucideIcon }[]; valor: T; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex h-10 w-full rounded-md border bg-muted p-0.5 sm:inline-flex sm:w-auto sm:shrink-0">
      {opcoes.map((o) => {
        const marcado = o.v === valor;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => onChange(o.v)}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none sm:px-3',
              marcado ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.icone ? <o.icone className={cn('hidden size-4 sm:block', marcado && 'text-primary')} aria-hidden /> : null}
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Uma pergunta do vencimento: rótulo à esquerda (em cima no celular), controles na mesma linha e uma ajuda só. */
function LinhaDoVencimento({ id, rotulo, ajuda, erro, children }: { id?: string; rotulo: string; ajuda?: React.ReactNode; erro?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="grid gap-1.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-4">
      <span className="text-sm font-semibold sm:pt-2.5">{rotulo}</span>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        {erro ? <span className="text-xs text-danger-strong">{erro}</span> : ajuda ? <span className="text-xs text-muted-foreground">{ajuda}</span> : null}
      </div>
    </div>
  );
}

function Campo({ id, rotulo, erro, dica, opcional, children, className }: { id?: string; rotulo: string; erro?: string; dica?: React.ReactNode; opcional?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
      <Label htmlFor={id}>
        {rotulo}
        {opcional ? <span className="font-normal text-muted-foreground"> (opcional)</span> : null}
      </Label>
      {children}
      {erro ? <span className="text-xs text-danger-strong">{erro}</span> : dica ? <span className="text-xs text-muted-foreground">{dica}</span> : null}
    </div>
  );
}

/** Seção numerada; o número vira ✓ quando ela está completa. */
function Secao({ n, completa, titulo, texto, id, children }: { n: number; completa: boolean; titulo: string; texto: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-4 rounded-xl border bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span
          className={cn('grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold', completa ? 'bg-success text-white' : 'bg-muted')}
          aria-label={completa ? 'Completa' : undefined}
        >
          {completa ? <Check className="size-3.5" /> : n}
        </span>
        <div>
          <h2 id={`${id}-titulo`} className="text-base font-bold">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{texto}</p>
        </div>
      </header>
      <div className="grid gap-5 p-5">{children}</div>
    </section>
  );
}

export default function NovaVendaPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const idEdicao = Number(useParams().id) || undefined;
  const editando = !!idEdicao;
  const { pode } = usePermissoes();
  const veValores = pode('financeiro.ver_valores');
  const mostraPagamento = !editando || veValores;
  const vendaQ = useVenda(idEdicao);
  const clientesQ = useClients();
  const catalogosQ = useCatalogos();
  const criar = useCriarVenda();
  const editar = useEditarVenda();

  const [form, setForm] = useState<Formulario>(VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregouEdicao, setCarregouEdicao] = useState(false);
  /** Modal de serviços: aberto para adicionar (`chave: null`) ou para editar um serviço. */
  const [modalServicos, setModalServicos] = useState<{ chave: number | null } | null>(null);
  const clienteQ = useClient(form.cliente ? String(form.cliente) : undefined);

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
      forma_pagamento: v.forma_pagamento ?? 'boleto',
      quantidade_parcelas: v.quantidade_parcelas ? String(v.quantidade_parcelas) : '',
      modo_vencimento: v.vencimento_dias_apos_nota ? 'apos_nota' : 'data',
      data_acordada_cobranca: v.data_acordada_cobranca ?? '',
      vencimento_dias_apos_nota: v.vencimento_dias_apos_nota ? String(v.vencimento_dias_apos_nota) : '',
      modo_demais: v.dia_vencimento_demais ? 'dia_fixo' : 'mesmo_dia',
      dia_vencimento_demais: v.dia_vencimento_demais ? String(v.dia_vencimento_demais) : '',
      liberar_em: v.liberar_em ?? 'conclusao',
      nome_contato_envio_nf: v.nome_contato_envio_nf ?? '',
      contato_envio_nf: v.contato_envio_nf ?? '',
    });
    setCarregouEdicao(true);
  }, [vendaQ.data, carregouEdicao]);

  // Contato da nota: sugere o representante do cliente, sem apagar o que já foi digitado.
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
      if ('modo_vencimento' in p || 'data_acordada_cobranca' in p) delete n.vencimento_dias_apos_nota;
      if ('modo_vencimento' in p || 'vencimento_dias_apos_nota' in p) delete n.data_acordada_cobranca;
      return n;
    });
  };

  const catalogosAtivos = useMemo(() => (catalogosQ.data ?? []).filter((c) => c.ativo), [catalogosQ.data]);
  const catalogo = (id: number) => (catalogosQ.data ?? []).find((c) => c.id === id);
  const clientes = (clientesQ.data ?? []).filter((c) => c.active !== false || Number(c.id) === form.cliente);
  const clienteNome = clientes.find((c) => Number(c.id) === form.cliente)?.name ?? vendaQ.data?.cliente_detail?.nome ?? '';

  /* ── Condição para o envio ── */
  const condicao = () => {
    const t = form.tipo_condicao;
    const porData = form.modo_vencimento === 'data';
    return {
      tipo_condicao: t,
      valor: paraDecimal(form.valor) || '0.00',
      forma_pagamento: form.forma_pagamento,
      quantidade_parcelas: t === 'parcelado' ? numOuNulo(form.quantidade_parcelas) : null,
      data_acordada_cobranca: porData ? form.data_acordada_cobranca || null : null,
      vencimento_dias_apos_nota: porData ? null : numOuNulo(form.vencimento_dias_apos_nota),
      dia_vencimento_demais: t === 'parcelado' && form.modo_demais === 'dia_fixo' ? numOuNulo(form.dia_vencimento_demais) : null,
      liberar_em: form.liberar_em,
      nome_contato_envio_nf: form.nome_contato_envio_nf.trim(),
      contato_envio_nf: form.contato_envio_nf.trim(),
      observacao: form.observacao.trim() || null,
    };
  };

  /* ── O que falta (as regras do backend, conferidas enquanto se preenche) ── */
  const verificacao = useMemo(() => {
    const e: Record<string, string> = {};
    const pend: { campo: string; texto: string }[] = [];
    const falta = (campo: string, mensagem: string, texto: string) => {
      e[campo] = e[campo] ?? mensagem;
      pend.push({ campo, texto });
    };
    if (!form.cliente) falta('cliente', 'Escolha o cliente.', 'Escolher o cliente');
    if (!form.data_venda) falta('data_venda', 'Informe a data da venda.', 'Informar a data da venda');
    if (!editando) {
      if (!form.servicos.length) falta('servicos', 'Adicione pelo menos um serviço.', 'Adicionar pelo menos um serviço');
      form.servicos
        .filter((s) => !s.descricao.trim())
        .forEach((s) => falta('servicos', 'Descreva os serviços marcados.', `Descrever “${catalogo(s.catalogo)?.nome ?? 'serviço'}”`));
    }
    if (mostraPagamento) {
      if (!paraDecimal(form.valor) || Number(paraDecimal(form.valor)) <= 0) falta('valor', 'Informe o valor total da venda.', 'Informar o valor total');
      const condicaoErros = validarCondicao({
        tipo_condicao: form.tipo_condicao,
        quantidade_parcelas: form.quantidade_parcelas,
        modo_vencimento: form.modo_vencimento,
        data_acordada_cobranca: form.data_acordada_cobranca,
        vencimento_dias_apos_nota: form.vencimento_dias_apos_nota,
        modo_demais: form.modo_demais,
        dia_vencimento_demais: form.dia_vencimento_demais,
      });
      if (condicaoErros.quantidade_parcelas) falta('quantidade_parcelas', condicaoErros.quantidade_parcelas, 'Informar o número de parcelas (mínimo 2)');
      const venc = condicaoErros.data_acordada_cobranca ?? condicaoErros.vencimento_dias_apos_nota;
      if (venc) falta(condicaoErros.data_acordada_cobranca ? 'data_acordada_cobranca' : 'vencimento_dias_apos_nota', venc, form.tipo_condicao === 'parcelado' ? 'Informar quando vence a 1ª parcela' : 'Informar quando vence');
      if (condicaoErros.dia_vencimento_demais) falta('dia_vencimento_demais', condicaoErros.dia_vencimento_demais, 'Informar o dia das demais parcelas');
      if (form.contato_envio_nf && !/^\S+@\S+\.\S+$/.test(form.contato_envio_nf)) falta('contato_envio_nf', 'E-mail inválido.', 'Corrigir o e-mail da nota');
    }
    return { erros: e, pendencias: pend };
  }, [form, editando, mostraPagamento]); // eslint-disable-line react-hooks/exhaustive-deps

  const irPara = (campo: string) => {
    const el = document.getElementById(ALVO_DO_CAMPO[campo] ?? campo);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const foco = el.matches('input,select,textarea,button') ? el : el.querySelector<HTMLElement>('input,select,textarea,button');
    window.setTimeout(() => foco?.focus({ preventScroll: true }), 300);
  };

  /** 400 do backend: a mensagem aparece no campo, e a página vai até o primeiro. */
  const tratarErro = (e: unknown) => {
    const data = isAxiosError(e) ? e.response?.data : null;
    if (data && typeof data === 'object' && !Array.isArray(data) && !('detail' in data)) {
      const novos: Record<string, string> = {};
      Object.entries(data as Record<string, unknown>).forEach(([campo, msg]) => {
        novos[campo] = campo === 'servicos' && Array.isArray(msg) ? 'Confira a descrição dos serviços.' : mensagemDeErro({ response: { data: msg } }, 'Valor inválido.');
      });
      setErros(novos);
      const primeiro = Object.keys(novos)[0];
      if (primeiro) irPara(primeiro);
    }
    toast({ title: 'Não foi possível salvar a venda', description: mensagemDeErro(e, 'Confira os campos marcados.'), variant: 'destructive' });
  };

  const salvar = () => {
    if (verificacao.pendencias.length) {
      setErros(verificacao.erros);
      irPara(verificacao.pendencias[0].campo);
      return;
    }
    if (editando) {
      const payload: EdicaoDaVendaPayload = {
        cliente: form.cliente!,
        data_venda: form.data_venda,
        prioridade: form.prioridade,
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
      ...condicao(),
      servicos: form.servicos.map((s) => ({ catalogo: s.catalogo, descricao: s.descricao.trim(), ...(s.prioridade ? { prioridade: s.prioridade } : {}) })),
    };
    criar.mutate(payload, {
      onSuccess: (v) => {
        // Setor sem quem receba tarefas não impede a venda: o backend devolve o aviso.
        toast({
          title: v.avisos?.length ? `Venda registrada · OS ${v.id}, com um aviso` : `Venda registrada · OS ${v.id}`,
          ...toastComAvisos(v.avisos, 'Cada setor recebeu os seus serviços e foi avisado por e-mail.'),
        });
        navigate(`/vendas/${v.id}`);
      },
      onError: tratarErro,
    });
  };

  const limparErroDeServicos = () =>
    setErros((e) => {
      const n = { ...e };
      delete n.servicos;
      return n;
    });
  const adicionarServico = (servico: ServicoEscolhido) => {
    setForm((f) => ({ ...f, servicos: [...f.servicos, { ...servico, chave: proximaChave++ }] }));
    limparErroDeServicos();
  };
  const salvarServico = (chave: number, servico: ServicoEscolhido) => {
    setForm((f) => ({ ...f, servicos: f.servicos.map((x) => (x.chave === chave ? { ...x, ...servico } : x)) }));
    setModalServicos(null);
    limparErroDeServicos();
  };
  const servicoEmEdicao = useMemo(() => {
    const x = modalServicos?.chave != null ? form.servicos.find((y) => y.chave === modalServicos.chave) : null;
    return x ? { catalogo: x.catalogo, descricao: x.descricao, prioridade: x.prioridade } : null;
  }, [modalServicos]); // eslint-disable-line react-hooks/exhaustive-deps
  const removerServico = (chave: number) => setForm((f) => ({ ...f, servicos: f.servicos.filter((x) => x.chave !== chave) }));

  if (editando && vendaQ.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (editando && vendaQ.isError) return <EmptyState title="Não foi possível abrir a venda" description={mensagemDeErro(vendaQ.error, 'Ela não existe ou não está visível para você.')} />;

  const salvando = criar.isPending || editar.isPending;
  const parcelado = form.tipo_condicao === 'parcelado';
  const valorNumerico = Number(paraDecimal(form.valor)) || 0;
  const parcela = valorDaParcela({ tipo_condicao: form.tipo_condicao, valor: paraDecimal(form.valor), quantidade_parcelas: form.quantidade_parcelas });
  const datasParcelas = parcelado && form.modo_vencimento === 'data' && form.data_acordada_cobranca ? datasDasParcelas(form.data_acordada_cobranca, Number(form.quantidade_parcelas) || 0, form.modo_demais === 'dia_fixo' ? Number(form.dia_vencimento_demais) || null : null) : [];
  const demaisTexto = form.modo_demais === 'dia_fixo' ? rotuloDasDemais(form.dia_vencimento_demais) : null;
  const avisos = avisosDaCondicao({ ...condicao(), modo_vencimento: form.modo_vencimento });
  const resumoCondicao = previaDaCondicao({ ...condicao(), quantidade_parcelas: form.quantidade_parcelas });
  const porSetor = new Map<string, number>();
  form.servicos.forEach((s) => {
    const setor = catalogo(s.catalogo)?.setorNome ?? 'Sem setor';
    porSetor.set(setor, (porSetor.get(setor) ?? 0) + 1);
  });
  const pend = verificacao.pendencias;
  const camposPendentes = new Set(pend.map((p) => p.campo));
  const completa = {
    cliente: !camposPendentes.has('cliente') && !camposPendentes.has('data_venda'),
    servicos: !camposPendentes.has('servicos'),
    pagamento: !['valor', 'quantidade_parcelas', 'data_acordada_cobranca', 'vencimento_dias_apos_nota', 'dia_vencimento_demais', 'contato_envio_nf'].some((c) => camposPendentes.has(c)),
  };
  const c = clienteQ.data;
  const documento = c ? formatDocumento(c.tipo_inscricao, c.document) : null;
  const rotuloBotao = editando ? 'Salvar alterações' : 'Registrar venda';
  const erro = (campo: string) => erros[campo];

  return (
    <div className="animate-fade-in mx-auto max-w-6xl pb-24 lg:pb-0">
      <PageHeader
        title={editando ? `Editar venda · OS ${idEdicao}` : 'Nova venda'}
        description={
          editando
            ? 'Dados da venda e pagamento. Serviços novos são acrescentados no resumo da venda.'
            : 'Registre o que foi vendido e como o cliente vai pagar. Cada setor recebe os seus serviços ao salvar.'
        }
        backTo={editando ? `/vendas/${idEdicao}` : '/vendas'}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          {/* 1. Cliente e venda */}
          <Secao id="secao-cliente" n={1} completa={completa.cliente} titulo="Cliente e venda" texto="Para quem foi a venda e quando.">
            <Campo id="v-cliente" rotulo="Cliente" erro={erro('cliente')}>
              <SeletorBusca
                id="v-cliente"
                opcoes={clientes.map((x) => ({ valor: Number(x.id), rotulo: x.name, detalhe: x.document }))}
                valor={form.cliente}
                onChange={(cliente) => muda({ cliente })}
                placeholder="Busque pelo nome ou CNPJ"
                vazio="Nenhum cliente com esse nome."
                invalido={!!erro('cliente')}
                carregando={clientesQ.isLoading}
              />
              {c ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2 text-xs">
                  <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                  {documento ? <span className="font-semibold">{documento}</span> : null}
                  <span>Representante: {c.representativeName || <span className="text-muted-foreground">não informado</span>}</span>
                  {c.representativeEmail || c.email ? <span className="text-muted-foreground">{c.representativeEmail || c.email}</span> : null}
                </div>
              ) : null}
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="v-data" rotulo="Data da venda" erro={erro('data_venda')} dica="O dia em que o cliente fechou a compra.">
                <CampoData id="v-data" aria-label="Data da venda" valor={form.data_venda} onChange={(data_venda) => muda({ data_venda })} invalido={!!erro('data_venda')} />
              </Campo>
              <Campo rotulo="Prioridade" erro={erro('prioridade')} dica="Ajuda os setores a decidir o que fazer primeiro. Cada serviço usa esta, a não ser que tenha uma própria.">
                <div className="flex gap-1.5" role="radiogroup" aria-label="Prioridade">
                  {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                    <Button key={p} type="button" size="sm" role="radio" aria-checked={form.prioridade === p} variant={form.prioridade === p ? 'default' : 'outline'} onClick={() => muda({ prioridade: p })}>
                      {PRIORIDADES[p]}
                    </Button>
                  ))}
                </div>
              </Campo>
            </div>
          </Secao>

          {/* 2. Serviços vendidos */}
          {!editando ? (
            <Secao
              id="secao-servicos"
              n={2}
              completa={completa.servicos}
              titulo="Serviços vendidos"
              texto="Cada serviço vai para o setor que executa. Quem organiza o setor recebe um e-mail ao salvar."
            >
              <div id="v-servicos" className="grid gap-3">
                {form.servicos.length ? (
                  <ul className="grid gap-2" aria-label="Serviços da venda">
                    {form.servicos.map((s) => {
                      const cat = catalogo(s.catalogo);
                      const semDescricao = !s.descricao.trim();
                      return (
                        <li key={s.chave} className="group flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20">
                          <div className="grid min-w-0 flex-1 gap-1.5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold uppercase">{cat?.nome ?? 'Serviço'}</span>
                              <span className="rounded bg-info-subtle px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-info-strong">{cat?.setorNome ?? 'Sem setor'}</span>
                              {s.prioridade && s.prioridade !== form.prioridade ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridade {PRIORIDADES[s.prioridade].toLowerCase()}</span>
                              ) : null}
                            </div>
                            <p className={cn('whitespace-pre-line text-sm', semDescricao ? 'font-medium text-danger-strong' : 'text-muted-foreground')}>
                              {semDescricao ? 'Falta descrever o que será feito' : s.descricao}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Editar ${cat?.nome ?? 'serviço'}`} onClick={() => setModalServicos({ chave: s.chave })}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-danger-strong" aria-label={`Remover ${cat?.nome ?? 'serviço'}`} onClick={() => removerServico(s.chave)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className={cn('grid place-items-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center', erro('servicos') && 'border-danger/50')}>
                    <p className="font-semibold">Nenhum serviço ainda</p>
                    <p className="text-xs text-muted-foreground">Adicione o que foi vendido, um serviço por vez.</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant={form.servicos.length ? 'outline' : 'default'} onClick={() => setModalServicos({ chave: null })}>
                    <PlusCircle className="size-4" /> Adicionar serviços
                  </Button>
                  {form.servicos.length ? (
                    <span className="text-xs text-muted-foreground">
                      {plural(form.servicos.length, 'serviço', 'serviços')} · {plural(porSetor.size, 'setor', 'setores')}
                    </span>
                  ) : null}
                </div>
                {erro('servicos') ? <p className="text-xs text-danger-strong">{erro('servicos')}</p> : null}
              </div>
            </Secao>
          ) : null}

          {/* 3. Pagamento */}
          {mostraPagamento ? (
            <Secao
              id="secao-pagamento"
              n={editando ? 2 : 3}
              completa={completa.pagamento}
              titulo="Pagamento"
              texto="O que foi combinado com o cliente. O financeiro usa isto para emitir a nota e lançar a cobrança. Depois de salvo, só quem vê valores enxerga."
            >
              <Campo rotulo="Como o cliente vai pagar" erro={erro('tipo_condicao')}>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Como o cliente vai pagar">
                  {TIPOS.map((t) => (
                    <Opcao key={t.v} marcado={form.tipo_condicao === t.v} onClick={() => muda({ tipo_condicao: t.v })} icone={t.icone} titulo={t.titulo} texto={t.texto} />
                  ))}
                </div>
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo id="v-valor" rotulo="Valor total (R$)" erro={erro('valor')} dica={parcelado ? 'A soma de todas as parcelas.' : 'Quanto o cliente paga pela venda.'}>
                  <Input id="v-valor" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => muda({ valor: e.target.value })} aria-invalid={!!erro('valor') || undefined} />
                </Campo>
                {parcelado ? (
                  <Campo
                    id="v-qtd"
                    rotulo="Número de parcelas"
                    erro={erro('quantidade_parcelas')}
                    dica={parcela ? `${form.quantidade_parcelas} parcelas de ${formatCurrency(parcela)}, uma por mês.` : 'Quantas vezes o cliente paga, uma por mês (mínimo 2).'}
                  >
                    <Input id="v-qtd" type="number" min={2} value={form.quantidade_parcelas} onChange={(e) => muda({ quantidade_parcelas: e.target.value })} aria-invalid={!!erro('quantidade_parcelas') || undefined} />
                  </Campo>
                ) : null}
                <Campo id="v-forma" rotulo="Forma de pagamento" erro={erro('forma_pagamento')} dica="Como o cliente paga.">
                  <select id="v-forma" value={form.forma_pagamento} onChange={(e) => muda({ forma_pagamento: e.target.value as FormaPagamento })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {(Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).map((f) => (
                      <option key={f} value={f}>
                        {FORMA_PAGAMENTO_LABEL[f]}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="grid gap-1.5">
                <Label>{parcelado ? 'Vencimento das parcelas' : 'Vencimento'}</Label>
                <div className="grid gap-4 rounded-lg border p-3 sm:p-4">
                  <LinhaDoVencimento
                    id="v-vencimento"
                    rotulo={parcelado ? '1ª parcela vence' : 'Vence'}
                    erro={erro('data_acordada_cobranca') || erro('vencimento_dias_apos_nota')}
                    ajuda={
                      form.modo_vencimento === 'data'
                        ? parcelado
                          ? 'O dia em que o cliente paga a 1ª parcela.'
                          : 'O dia em que o cliente paga.'
                        : 'Para quando a data depende da entrega: conta a partir da emissão da nota fiscal (ex.: nota após o relatório, vence em 21 dias).'
                    }
                  >
                    <Segmentado rotulo={parcelado ? 'Como vence a 1ª parcela' : 'Como vence'} opcoes={MODOS_VENCIMENTO} valor={form.modo_vencimento} onChange={(modo_vencimento) => muda({ modo_vencimento })} />
                    {form.modo_vencimento === 'data' ? (
                      <CampoData
                        id="v-venc"
                        className="w-full sm:w-56"
                        aria-label={parcelado ? 'Data da 1ª parcela' : 'Data do vencimento'}
                        valor={form.data_acordada_cobranca}
                        onChange={(data_acordada_cobranca) => muda({ data_acordada_cobranca })}
                        invalido={!!erro('data_acordada_cobranca')}
                        limpavel
                        atalhos={[{ rotulo: 'Em 30 dias', dias: 30 }, { rotulo: 'Em 60 dias', dias: 60 }]}
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        <Input id="v-dias" type="number" min={1} max={365} className="w-20" aria-label="Dias após a nota" value={form.vencimento_dias_apos_nota} onChange={(e) => muda({ vencimento_dias_apos_nota: e.target.value })} aria-invalid={!!erro('vencimento_dias_apos_nota') || undefined} />
                        <span className="text-sm text-muted-foreground">dias após a nota</span>
                      </span>
                    )}
                  </LinhaDoVencimento>

                  {parcelado ? (
                    <LinhaDoVencimento
                      id="v-demais"
                      rotulo="Demais parcelas"
                      erro={erro('dia_vencimento_demais')}
                      ajuda={
                        form.modo_demais === 'dia_fixo'
                          ? 'A 2ª vence no mês seguinte ao da 1ª. Dia 29, 30 ou 31 num mês mais curto vence no último dia do mês.'
                          : form.modo_vencimento === 'data' && form.data_acordada_cobranca
                            ? `Todo dia ${Number(form.data_acordada_cobranca.slice(8, 10))} de cada mês.`
                            : 'Todo mês, no mesmo dia do mês em que a 1ª vencer.'
                      }
                    >
                      <Segmentado rotulo="Quando vencem as demais parcelas" opcoes={MODOS_DAS_DEMAIS} valor={form.modo_demais} onChange={(modo_demais) => muda({ modo_demais })} />
                      {form.modo_demais === 'dia_fixo' ? (
                        <span className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Todo dia</span>
                          <Input
                            id="v-dia-demais"
                            type="number"
                            min={1}
                            max={31}
                            className="w-16"
                            aria-label="Dia do mês das demais parcelas"
                            value={form.dia_vencimento_demais}
                            onChange={(e) => muda({ dia_vencimento_demais: e.target.value })}
                            aria-invalid={!!erro('dia_vencimento_demais') || undefined}
                          />
                          <span className="text-sm text-muted-foreground">do mês</span>
                        </span>
                      ) : null}
                    </LinhaDoVencimento>
                  ) : null}

                  {parcelado && datasParcelas.length ? (
                    <div className="grid gap-2 border-t pt-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <CalendarRange className="size-3.5" aria-hidden /> Parcelas
                      </p>
                      <ol className="flex flex-wrap gap-1.5 text-xs">
                        {datasParcelas.slice(0, 6).map((d, i) => (
                          <li key={d + i} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 tabular-nums">
                            <span className="text-muted-foreground">{ORDINAL(i + 1)}</span>
                            {d}
                          </li>
                        ))}
                        {datasParcelas.length > 6 ? (
                          <li className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 tabular-nums text-muted-foreground">
                            … {ORDINAL(datasParcelas.length)} {datasParcelas[datasParcelas.length - 1]}
                          </li>
                        ) : null}
                      </ol>
                      <p className="text-xs text-muted-foreground">Só para conferir: quem controla as parcelas é o sistema financeiro.</p>
                    </div>
                  ) : parcelado && form.modo_vencimento === 'apos_nota' && Number(form.vencimento_dias_apos_nota) ? (
                    <div className="grid gap-1 border-t pt-3 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                        <CalendarRange className="size-3.5" aria-hidden /> Parcelas
                      </p>
                      <p>
                        1ª {Number(form.vencimento_dias_apos_nota)} dias após a nota · {demaisTexto ?? 'demais no mesmo dia do mês da 1ª'}
                      </p>
                      <p className="text-muted-foreground">As datas exatas só existem depois que a nota for emitida.</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <Campo rotulo="Quando o financeiro pode faturar" erro={erro('liberar_em')} dica="Acontece uma vez só.">
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Quando o financeiro pode faturar">
                  {LIBERACOES.map((l) => (
                    <Opcao key={l.v} marcado={form.liberar_em === l.v} onClick={() => muda({ liberar_em: l.v })} titulo={l.titulo} texto={l.texto} extra={l.quando} />
                  ))}
                </div>
              </Campo>

              {avisos.length ? (
                <div className="grid gap-2">
                  {avisos.map((a) => (
                    <p key={a} className="flex gap-2 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {a}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="v-nf-nome" rotulo="Para quem enviar a nota" opcional erro={erro('nome_contato_envio_nf')} dica="Nome de quem recebe a nota fiscal no cliente.">
                  <Input id="v-nf-nome" maxLength={50} value={form.nome_contato_envio_nf} onChange={(e) => muda({ nome_contato_envio_nf: e.target.value })} />
                </Campo>
                <Campo id="v-nf-mail" rotulo="E-mail da nota" opcional erro={erro('contato_envio_nf')} dica={!editando ? 'Sugerido a partir do representante do cliente.' : undefined}>
                  <Input id="v-nf-mail" type="email" value={form.contato_envio_nf} onChange={(e) => muda({ contato_envio_nf: e.target.value })} aria-invalid={!!erro('contato_envio_nf') || undefined} />
                </Campo>
              </div>

              <Campo
                id="v-obs"
                rotulo="Observações de pagamento e faturamento"
                opcional
                erro={erro('observacao')}
                dica="O que não cabe nos campos acima: pagamento já recebido, outro e-mail para a nota, nº do pedido de compra do cliente, preço por vida… Só o financeiro e quem vê valores enxergam."
              >
                <Textarea
                  id="v-obs"
                  rows={3}
                  placeholder="Ex.: sinal de 30% já pago via PIX; enviar a nota também para compras@cliente.com.br; pedido de compra 240650."
                  value={form.observacao}
                  onChange={(e) => muda({ observacao: e.target.value })}
                />
              </Campo>
              {!veValores ? <p className="text-xs text-muted-foreground">Você informa o pagamento ao registrar a venda, mas depois de salvo ele só aparece para quem vê valores.</p> : null}
            </Secao>
          ) : null}
        </div>

        {/* Resumo fixo (computador) */}
        <aside className="sticky top-4 hidden rounded-xl border bg-card shadow-sm lg:block" aria-label="Resumo da venda">
          <h2 className="border-b px-4 py-3 text-sm font-bold">Resumo da venda</h2>
          <div className="grid gap-1 border-b px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</span>
            <span className="font-semibold">{clienteNome || <span className="text-muted-foreground">—</span>}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(form.data_venda) ?? '—'} · prioridade {PRIORIDADES[form.prioridade].toLowerCase()}
            </span>
          </div>
          {!editando ? (
            <div className="grid gap-1 border-b px-4 py-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serviços ({form.servicos.length})</span>
              {porSetor.size ? (
                [...porSetor.entries()].map(([setor, n]) => (
                  <span key={setor} className="flex justify-between gap-2">
                    <span>{setor}</span>
                    <span className="tabular-nums">{n}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Nenhum ainda</span>
              )}
            </div>
          ) : null}
          {mostraPagamento ? (
            <div className="grid gap-1 border-b px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</span>
              <span className="text-lg font-bold tabular-nums">{valorNumerico ? formatCurrency(valorNumerico) : '—'}</span>
              <span className="text-xs">{resumoCondicao}</span>
              <span className="text-xs text-muted-foreground">
                {FORMA_PAGAMENTO_LABEL[form.forma_pagamento]} · {form.liberar_em === 'venda' ? 'libera na venda' : 'libera quando os serviços terminarem'}
              </span>
            </div>
          ) : null}
          {pend.length ? (
            <div className="grid gap-1 border-b px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Falta</span>
              {pend.map((p, i) => (
                <button
                  key={`${p.campo}-${i}`}
                  type="button"
                  onClick={() => irPara(p.campo)}
                  className="flex items-start gap-1.5 text-left text-sm font-medium text-warning-strong hover:underline"
                >
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {p.texto}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 px-4 py-3">
            <Button onClick={salvar} disabled={salvando || pend.length > 0} className="w-full">
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {rotuloBotao}
            </Button>
            {!editando ? (
              <span className="flex gap-1.5 text-xs text-muted-foreground">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Cada setor recebe um e-mail com os seus serviços.
              </span>
            ) : null}
            <Button variant="ghost" onClick={() => navigate(editando ? `/vendas/${idEdicao}` : '/vendas')}>
              Cancelar
            </Button>
          </div>
        </aside>
      </div>

      {/* Barra fixa (celular e tablet) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card px-4 py-2.5 shadow-[0_-6px_20px_hsl(var(--foreground)/0.08)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-bold tabular-nums">{mostraPagamento ? (valorNumerico ? formatCurrency(valorNumerico) : 'Sem valor') : clienteNome || 'Venda'}</p>
          {pend.length ? (
            <button type="button" onClick={() => irPara(pend[0].campo)} className="block max-w-full truncate text-left text-xs font-medium text-warning-strong">
              Falta: {pend[0].texto.charAt(0).toLowerCase() + pend[0].texto.slice(1)}
              {pend.length > 1 ? ` e mais ${pend.length - 1}` : ''}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">{editando ? 'Pronto para salvar' : `${plural(form.servicos.length, 'serviço', 'serviços')} · pronto para registrar`}</p>
          )}
        </div>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {editando ? 'Salvar' : 'Registrar'}
        </Button>
      </div>

      <ServicosDaVendaModal
        aberto={!!modalServicos}
        onFechar={() => setModalServicos(null)}
        catalogos={catalogosAtivos}
        carregando={catalogosQ.isLoading}
        prioridadeDaVenda={form.prioridade}
        naVenda={form.servicos}
        editando={servicoEmEdicao}
        onAdicionar={adicionarServico}
        onSalvar={(novo) => modalServicos?.chave != null && salvarServico(modalServicos.chave, novo)}
      />
    </div>
  );
}
