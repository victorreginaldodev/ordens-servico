import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlarmClock, AlertTriangle, Building2, CircleCheck, CircleDashed, Clock, CreditCard, Layers, PartyPopper, Receipt, SearchX } from 'lucide-react';
import {
  AndamentoServicos,
  BarraDeFiltros,
  ChipsDeFiltros,
  EmptyState,
  EspacoDeFiltros,
  FiltroDePeriodo,
  FiltroDropdown,
  Indicadores,
  OpcaoDeFiltro,
  PageHeader,
  TipoCondicaoBadge,
  TituloDoFiltro,
  type Indicador,
} from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabelaAgrupada, type Coluna } from '@/features/execucao/components/TabelaAgrupada';
import { FORMA_PAGAMENTO_LABEL, LIBERAR_EM_LABEL, TIPO_CONDICAO_LABEL } from '@/features/vendas/condicao';
import type { FormaPagamento, TipoCondicao } from '@/features/vendas/services';
import { useClients } from '@/features/clientes/hooks';
import { usePermissoes } from '@/hooks/usePermissoes';
import { formatCurrency, formatDate } from '@/lib/format';
import { intervaloDoPeriodo, rotuloDoPeriodo, type Periodo } from '@/lib/periodo';
import { cn } from '@/lib/utils';
import { RegistrarLancamentoModal, type OrdemParaLancar } from '../components/RegistrarLancamentoModal';
import { useCobrancas } from '../hooks';
import type { FiltrosDeCobrancas, LinhaDeCobranca, SituacaoDeCobranca } from '../services';

/**
 * Cobranças (`/cobrancas`, fluxos-e-navegacao.md §6.7; wireframe do lote 3): as três situações como
 * indicadores (quantidade e valor), o aviso das liberadas sem lançamento e o "Registrar lançamento"
 * na própria linha. Os filtros vão para o backend e os contadores respeitam os filtros.
 */

const SITUACOES: SituacaoDeCobranca[] = ['a_faturar', 'previsao', 'faturadas'];
const DIAS_ALERTA = 3; // DIAS_ALERTA_SEM_LANCAMENTO no backend
const dataHora = (v: string | null | undefined) => (v ? formatDate(new Date(v)) : null);

export default function CobrancasPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { pode } = usePermissoes();
  const clientesQ = useClients();
  const [pop, setPop] = useState<string | null>(null);
  const [lancar, setLancar] = useState<OrdemParaLancar | null>(null);

  // Situação e filtros na URL: dá para mandar o link de "a faturar em alerta" para alguém.
  const sitParam = params.get('situacao') as SituacaoDeCobranca | null;
  const situacao: SituacaoDeCobranca = sitParam && SITUACOES.includes(sitParam) ? sitParam : 'a_faturar';
  const cliente = Number(params.get('cliente')) || null;
  const tipo = (params.get('tipo_condicao') as TipoCondicao | null) || null;
  const forma = (params.get('forma_pagamento') as FormaPagamento | null) || null;
  const emAlerta = params.get('em_alerta') === 'true';
  const periodo: Periodo | null = params.get('periodo') ? { preset: params.get('periodo') as Periodo['preset'], de: params.get('de') ?? undefined, ate: params.get('ate') ?? undefined } : null;
  const intervalo = periodo ? intervaloDoPeriodo(periodo) : null;
  const de = intervalo?.de;
  const ate = intervalo?.ate;

  const mudar = (p: Record<string, string | null>) => {
    setParams(
      (atual) => {
        const n = new URLSearchParams(atual);
        Object.entries(p).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, v)));
        return n;
      },
      { replace: true },
    );
    setPop(null);
  };

  const filtros: FiltrosDeCobrancas = useMemo(
    () => ({
      situacao,
      ...(cliente ? { cliente } : {}),
      ...(tipo ? { tipo_condicao: tipo } : {}),
      ...(forma ? { forma_pagamento: forma } : {}),
      ...(emAlerta && situacao === 'a_faturar' ? { em_alerta: 'true' as const } : {}),
      ...(de && ate ? { de, ate } : {}),
    }),
    [situacao, cliente, tipo, forma, emAlerta, de, ate],
  );
  const cobrancasQ = useCobrancas(filtros);
  const dados = cobrancasQ.data;
  const c = dados?.contadores;

  const indicadores: Indicador<SituacaoDeCobranca>[] = [
    { id: 'a_faturar', rotulo: 'A faturar', icone: Clock, tom: 'warning', valor: c ? c.a_faturar.quantidade : null, detalhe: c ? formatCurrency(c.a_faturar.valor) : null, dica: 'Liberadas para faturar e ainda sem lançamento. As liberadas há mais tempo primeiro.' },
    { id: 'previsao', rotulo: 'Previsão', icone: CircleDashed, tom: 'neutral', valor: c ? c.previsao.quantidade : null, detalhe: c ? formatCurrency(c.previsao.valor) : null, dica: 'Ainda não liberadas. As mais perto de liberar primeiro; canceladas não entram.' },
    { id: 'faturadas', rotulo: 'Faturadas', icone: CircleCheck, tom: 'success', valor: c ? c.faturadas.quantidade : null, detalhe: c ? formatCurrency(c.faturadas.valor) : null, dica: 'Já lançadas no sistema financeiro. As mais recentes primeiro.' },
  ];

  const nomeCliente = (clientesQ.data ?? []).find((x) => Number(x.id) === cliente)?.name ?? (dados?.ordens.find((o) => o.cliente_id === cliente)?.cliente_nome ?? `#${cliente}`);
  const chips = [
    ...(cliente ? [{ id: 'cliente', texto: `Cliente: ${nomeCliente}` }] : []),
    ...(periodo ? [{ id: 'periodo', texto: `Venda: ${rotuloDoPeriodo(periodo)}` }] : []),
    ...(tipo ? [{ id: 'tipo_condicao', texto: `Condição: ${TIPO_CONDICAO_LABEL[tipo]}` }] : []),
    ...(forma ? [{ id: 'forma_pagamento', texto: `Forma: ${FORMA_PAGAMENTO_LABEL[forma]}` }] : []),
    ...(emAlerta && situacao === 'a_faturar' ? [{ id: 'em_alerta', texto: 'Só em alerta' }] : []),
  ];
  const removerChip = (id: string) => mudar(id === 'periodo' ? { periodo: null, de: null, ate: null } : { [id]: null });

  const liberacao = (o: LinhaDeCobranca) =>
    o.liberada_para_cobranca_em ? (
      <span className="flex flex-col">
        <span className="tabular-nums">{dataHora(o.liberada_para_cobranca_em)}</span>
        <span className="text-xs text-muted-foreground">
          {o.liberar_em === 'venda' ? 'na venda' : 'serviços concluídos'}
          {o.liberada_para_cobranca_por_nome ? ` · ${o.liberada_para_cobranca_por_nome}` : ''}
        </span>
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  const colunas: Coluna<LinhaDeCobranca>[] = [
    { id: 'os', titulo: 'OS', className: 'w-20', celula: (o) => <span className="font-semibold tabular-nums">{o.ordem_servico_id}</span> },
    { id: 'cliente', titulo: 'Cliente', celula: (o) => <span className="block min-w-[10rem]">{o.cliente_nome}</span> },
    { id: 'venda', titulo: 'Venda', className: 'w-28', celula: (o) => <span className="tabular-nums">{formatDate(o.data_venda)}</span> },
    {
      id: 'valor',
      titulo: 'Valor',
      className: 'w-32 text-right',
      celula: (o) => (
        <span className="tabular-nums">
          {formatCurrency(o.valor)}
          {o.valor_mensal ? <span className="block text-xs text-muted-foreground">{formatCurrency(o.valor_mensal)}/mês</span> : null}
        </span>
      ),
    },
    {
      id: 'condicao',
      titulo: 'Condição',
      celula: (o) => (
        <span className="flex max-w-[16rem] flex-col items-start gap-1">
          <TipoCondicaoBadge value={o.tipo_condicao} />
          <span className="text-xs text-muted-foreground">
            {o.condicao_resumo} · {FORMA_PAGAMENTO_LABEL[o.forma_pagamento]}
          </span>
        </span>
      ),
    },
    {
      id: 'nf',
      titulo: 'NF para',
      celula: (o) =>
        o.contato_envio_nf || o.nome_contato_envio_nf ? (
          <span className="flex flex-col">
            <span>{o.nome_contato_envio_nf || '—'}</span>
            <span className="text-xs text-muted-foreground">{o.contato_envio_nf}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Não informado</span>
        ),
    },
    ...(situacao === 'a_faturar'
      ? ([
          { id: 'liberada', titulo: 'Liberada', className: 'w-40', celula: liberacao },
          {
            id: 'aguardando',
            titulo: 'Aguardando',
            className: 'w-32',
            celula: (o) => {
              const d = o.dias_aguardando_lancamento ?? 0;
              return o.em_alerta ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-md bg-warning-subtle px-1.5 text-xs font-medium text-warning-strong">
                  <AlarmClock className="size-3.5" aria-hidden /> {d} dia{d === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="tabular-nums text-muted-foreground">{d === 0 ? 'Liberada hoje' : `${d} dia${d === 1 ? '' : 's'}`}</span>
              );
            },
          },
          {
            id: 'acao',
            titulo: '',
            acao: true,
            className: 'w-32',
            celula: (o) => (
              <Button size="sm" title="Registrar lançamento" aria-label={`Registrar lançamento da OS ${o.ordem_servico_id}`} onClick={() => setLancar(o)}>
                <Receipt className="size-4" /> Registrar
              </Button>
            ),
          },
        ] satisfies Coluna<LinhaDeCobranca>[])
      : situacao === 'previsao'
        ? ([
            { id: 'andamento', titulo: 'Andamento', className: 'w-40', celula: (o) => <AndamentoServicos andamento={o.andamento} /> },
            { id: 'libera', titulo: 'Libera', className: 'w-44', celula: (o) => <span className="text-sm">{LIBERAR_EM_LABEL[o.liberar_em]}</span> },
          ] satisfies Coluna<LinhaDeCobranca>[])
        : ([
            {
              id: 'lancamento',
              titulo: 'Lançamento',
              celula: (o) => (
                <span className="flex flex-col">
                  <span>{o.referencia_lancamento || 'Sem referência'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(o.data_cobranca)}
                    {o.cobranca_realizada_por_nome ? ` · ${o.cobranca_realizada_por_nome}` : ''}
                    {o.origem_lancamento === 'integracao' ? ' · integração' : ' · manual'}
                  </span>
                </span>
              ),
            },
            { id: 'liberada', titulo: 'Liberada', className: 'w-40', celula: liberacao },
          ] satisfies Coluna<LinhaDeCobranca>[])),
  ];

  const ordens = dados?.ordens ?? [];
  const filtrosAtivos = chips.length > 0;
  const ordem = { a_faturar: 'As liberadas há mais tempo primeiro.', previsao: 'As mais perto de liberar primeiro. Vendas canceladas não entram.', faturadas: 'As lançadas mais recentemente primeiro.' }[situacao];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cobranças" description="O que pode ser faturado, o que vai liberar e o que já foi lançado no sistema financeiro." />
      <Indicadores
        titulo="Situação das vendas"
        subtitulo="Os números respeitam os filtros. Clique para ver cada situação."
        itens={indicadores}
        ativo={situacao}
        onEscolher={(s) => mudar({ situacao: s === 'a_faturar' ? null : s })}
      />

      {dados && dados.em_alerta > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-subtle px-4 py-3 text-warning-strong">
          <AlarmClock className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-sm">
            <b>
              {dados.em_alerta} venda{dados.em_alerta === 1 ? ' liberada' : 's liberadas'} há {DIAS_ALERTA} dias ou mais sem lançamento
            </b>
            <span className="block text-warning-strong/80">Aparecem primeiro em “A faturar”, com o tempo de espera destacado.</span>
          </span>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => mudar({ situacao: null, em_alerta: emAlerta ? null : 'true' })}>
            {emAlerta ? 'Ver todas' : 'Ver só essas'}
          </Button>
        </div>
      ) : null}

      <BarraDeFiltros>
        <FiltroDropdown icone={Building2} rotulo="Cliente" valor={cliente ? nomeCliente.split(' ').slice(0, 2).join(' ') : null} aberto={pop === 'cliente'} onAberto={(o) => setPop(o ? 'cliente' : null)} largura="w-72">
          <TituloDoFiltro>Cliente</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!cliente} onClick={() => mudar({ cliente: null })}>
            Todos os clientes
          </OpcaoDeFiltro>
          {(clientesQ.data ?? []).map((x) => (
            <OpcaoDeFiltro key={x.id} marcado={cliente === Number(x.id)} onClick={() => mudar({ cliente: String(x.id) })}>
              {x.name}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        <FiltroDePeriodo
          campos={{ venda: 'Venda' }}
          campo="venda"
          periodo={periodo}
          onChange={(_, p) => setParams((atual) => {
            const n = new URLSearchParams(atual);
            ['periodo', 'de', 'ate'].forEach((k) => n.delete(k));
            if (p) {
              n.set('periodo', p.preset);
              if (p.de) n.set('de', p.de);
              if (p.ate) n.set('ate', p.ate);
            }
            return n;
          }, { replace: true })}
          aberto={pop === 'data'}
          onAberto={(o) => setPop(o ? 'data' : null)}
        />
        <FiltroDropdown icone={Layers} rotulo="Condição" valor={tipo ? TIPO_CONDICAO_LABEL[tipo] : null} aberto={pop === 'tipo'} onAberto={(o) => setPop(o ? 'tipo' : null)} largura="w-52">
          <TituloDoFiltro>Tipo de condição</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!tipo} onClick={() => mudar({ tipo_condicao: null })}>
            Todas
          </OpcaoDeFiltro>
          {(Object.keys(TIPO_CONDICAO_LABEL) as TipoCondicao[]).map((t) => (
            <OpcaoDeFiltro key={t} marcado={tipo === t} onClick={() => mudar({ tipo_condicao: t })}>
              {TIPO_CONDICAO_LABEL[t]}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        <FiltroDropdown icone={CreditCard} rotulo="Forma" valor={forma ? FORMA_PAGAMENTO_LABEL[forma] : null} aberto={pop === 'forma'} onAberto={(o) => setPop(o ? 'forma' : null)} largura="w-52">
          <TituloDoFiltro>Forma de pagamento</TituloDoFiltro>
          <OpcaoDeFiltro marcado={!forma} onClick={() => mudar({ forma_pagamento: null })}>
            Todas
          </OpcaoDeFiltro>
          {(Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).map((f) => (
            <OpcaoDeFiltro key={f} marcado={forma === f} onClick={() => mudar({ forma_pagamento: f })}>
              {FORMA_PAGAMENTO_LABEL[f]}
            </OpcaoDeFiltro>
          ))}
        </FiltroDropdown>
        <EspacoDeFiltros />
        <span className="text-xs text-muted-foreground">{ordem}</span>
      </BarraDeFiltros>
      <ChipsDeFiltros itens={chips} onRemover={removerChip} onLimpar={() => mudar({ cliente: null, tipo_condicao: null, forma_pagamento: null, em_alerta: null, periodo: null, de: null, ate: null })} />

      {cobrancasQ.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : cobrancasQ.isError ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível carregar as cobranças" description="Verifique a conexão e tente de novo." />
      ) : ordens.length ? (
        <div className={cn('[&_tbody_tr]:align-top')}>
          <TabelaAgrupada
            rotulo={`Cobranças: ${situacao}`}
            colunas={colunas}
            grupos={[{ chave: situacao, linhas: ordens }]}
            chaveDaLinha={(o) => o.ordem_servico_id}
            onAbrir={pode('financeiro.ver_valores') ? (o) => navigate(`/cobrancas/${o.ordem_servico_id}`) : undefined}
          />
        </div>
      ) : (
        <EmptyState
          icon={situacao === 'a_faturar' && !filtrosAtivos ? PartyPopper : SearchX}
          title={situacao === 'a_faturar' && !filtrosAtivos ? 'Nada para faturar' : 'Nenhuma venda nesta situação'}
          description={situacao === 'a_faturar' && !filtrosAtivos ? 'Tudo o que foi liberado já foi lançado.' : 'Mude os filtros para ver outras vendas.'}
        />
      )}

      <RegistrarLancamentoModal ordem={lancar} onClose={() => setLancar(null)} />
    </div>
  );
}
