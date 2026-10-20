import { useMemo, useState } from 'react';
import { Check, CircleSlash, FileDown, Loader2, ScanSearch } from 'lucide-react';
import { DataTable, col, type DataTableColumn, type DataTableView } from '@/components/data-table';
import { COBRANCA_DEFS, PageHeader, PessoaChip, StatusBadge, ToneBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { mensagemDeErro } from '@/lib/api-errors';
import { formatDate, formatDocumento } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SeletorBusca } from '@/features/vendas/components/SeletorBusca';
import { naoCobradaPeloCatalogo, porGrupo, porMes } from '../auditoria';
import { GraficoPorGrupo, GraficoPorMes } from '../components/GraficosDoNaoCobrado';
import { useAuditoriaOperacional } from '../hooks';
import { baixarAuditoriaOperacionalExcel, type OsoDaAuditoria } from '../services';

/**
 * Auditoria das OS operacionais anteriores à regra do catálogo (`/cobrancas/auditoria-operacionais`, proposta
 * aprovada e revista em 20/10/2026): todas as OSOs criadas antes de 20/10/2026, sem filtro no conjunto. O foco é o
 * que deveria ter sido cobrado e não foi, principalmente "catálogo cobrável, sem revisão do cliente": resumo,
 * gráficos por mês e por cliente (ou por serviço, com um cliente escolhido) e as visões da tabela. O filtro de cliente
 * vale para o resumo, os gráficos, a tabela e o Excel.
 */

const maiusculas = (texto: string) => texto.toLocaleUpperCase('pt-BR');

const NAO_GERA = { tone: 'neutral', icon: CircleSlash, label: 'Não gera cobrança' } as const;
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const soma = (osos: OsoDaAuditoria[]) => osos.reduce((t, o) => t + o.quantidade, 0);

const VIEWS: DataTableView<OsoDaAuditoria>[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'deveriam', label: 'Deveriam ter sido cobradas', filter: (o) => !!o.deveria_ser_cobrada, tone: 'danger' },
  { id: 'catalogo', label: 'Catálogo cobrável, sem revisão', filter: naoCobradaPeloCatalogo },
  { id: 'revisao', label: 'Revisão marcada, não cobrada', filter: (o) => o.deveria_ser_cobrada === 'revisao_sem_cobranca' },
];

/** Um número do resumo: o valor grande, o rótulo e o detalhe. */
function Numero({ valor, rotulo, detalhe, destaque }: { valor: string; rotulo: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-card px-4 py-3', destaque && 'border-danger/40')}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', destaque && 'text-danger-strong')}>{valor}</p>
      {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

const curta = (data: string) => formatDate(data)?.replace(/\/(\d{2})(\d{2})$/, '/$2') ?? data;

/** Sim/Não compacto: verde quando ligado, apagado quando não. */
function Marca({ ligado, rotulo, dica }: { ligado: boolean; rotulo: string; dica: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-0.5 rounded px-1.5 text-xs font-medium',
        ligado ? 'bg-success-subtle text-success-strong' : 'bg-muted text-muted-foreground line-through decoration-muted-foreground/50',
      )}
      title={`${dica}: ${ligado ? 'sim' : 'não'}`}
    >
      {ligado ? <Check className="size-3" aria-hidden /> : null}
      {rotulo}
    </span>
  );
}

function SituacaoDaCobranca({ o }: { o: OsoDaAuditoria }) {
  if (o.situacao_cobranca === 'nao_gera') return <ToneBadge def={NAO_GERA} />;
  if (o.situacao_cobranca === 'cobrada') return <ToneBadge def={COBRANCA_DEFS.cobrada} />;
  return <ToneBadge def={o.situacao_cobranca === 'a_cobrar' ? COBRANCA_DEFS.liberada : COBRANCA_DEFS.nao_liberada} />;
}

export default function AuditoriaOperacionalPage() {
  const { toast } = useToast();
  const auditoriaQ = useAuditoriaOperacional();
  const [cliente, setCliente] = useState<number | null>(null);
  const [baixando, setBaixando] = useState(false);

  // O cliente escolhido vale para tudo: resumo, gráficos, tabela e Excel.
  const doCliente = useMemo(
    () => (cliente ? auditoriaQ.data?.osos.filter((o) => o.cliente_id === cliente) : auditoriaQ.data?.osos) ?? [],
    [auditoriaQ.data, cliente],
  );
  const clientes = useMemo(() => {
    const vistos = new Map<number, OsoDaAuditoria>();
    for (const o of auditoriaQ.data?.osos ?? []) if (!vistos.has(o.cliente_id)) vistos.set(o.cliente_id, o);
    return [...vistos.values()]
      .map((o) => ({
        valor: o.cliente_id,
        rotulo: maiusculas(o.cliente_nome),
        detalhe: formatDocumento(o.cliente_tipo_inscricao, o.cliente_documento, { withLabel: false }) ?? undefined,
      }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }, [auditoriaQ.data]);
  const pelaRegra = useMemo(() => doCliente.filter(naoCobradaPeloCatalogo), [doCliente]);
  const comRevisao = useMemo(() => doCliente.filter((o) => o.deveria_ser_cobrada === 'revisao_sem_cobranca'), [doCliente]);
  const porMesDoCatalogo = useMemo(() => porMes(pelaRegra), [pelaRegra]);
  // Por cliente (a chave leva o id, para o clique escolher o cliente) ou, com um cliente escolhido, por serviço.
  const ranking = useMemo(
    () =>
      cliente
        ? porGrupo(pelaRegra, (o) => o.servico)
        : porGrupo(pelaRegra, (o) => `${o.cliente_id}|${o.cliente_nome}`, (k) => k.slice(k.indexOf('|') + 1)),
    [pelaRegra, cliente],
  );

  const clientesAfetados = new Set(pelaRegra.map((o) => o.cliente_id)).size;
  const { pontos: meses, anteriores } = porMesDoCatalogo;
  const periodo = meses.length ? `${meses[0].rotulo} a ${meses[meses.length - 1].rotulo}` : '—';

  /*
   * Cliente e Serviço dividem o espaço que as outras colunas (fixas, ~1100px com o menu) deixam livre, na proporção
   * dos nomes reais (cliente: 54 letras em 90% dos casos; serviço: 33): 60% e 40%, com mínimo e máximo.
   *
   * Colunas compactas: exceção ao padrão "uma informação por coluna" (pedido do usuário em 20/10/2026), para a
   * tabela caber sem rolar para os lados. As informações relacionadas ficam juntas numa coluna; cada uma continua
   * separada no menu Colunas e no Excel.
   */
  const colunas = useMemo<DataTableColumn<OsoDaAuditoria>[]>(
    () => [
      col.custom<OsoDaAuditoria>('id', 'Nº', { accessor: (o) => o.id, width: '64px', cell: (o) => <span className="font-semibold tabular-nums">{o.id}</span> }),
      col.custom<OsoDaAuditoria>('cliente', 'Cliente', {
        accessor: (o) => o.cliente_nome,
        sortingFn: 'textPtBr',
        cell: (o) => (
          <span className="block max-w-[clamp(150px,calc((100vw_-_1100px)*0.6),460px)] truncate text-xs font-medium" title={o.cliente_nome}>
            {maiusculas(o.cliente_nome)}
          </span>
        ),
      }),
      col.custom<OsoDaAuditoria>('servico', 'Serviço', {
        accessor: (o) => o.servico,
        sortingFn: 'textPtBr',
        cell: (o) => (
          <span className="flex min-w-0 max-w-[clamp(110px,calc((100vw_-_1100px)*0.4),320px)] items-center gap-1 text-xs" title={o.descricao ?? o.servico}>
            <span className="truncate">{maiusculas(o.servico)}</span>
            {o.quantidade > 1 ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">× {o.quantidade}</span> : null}
          </span>
        ),
      }),
      col.custom<OsoDaAuditoria>('execucao', 'Execução', {
        accessor: (o) => o.data_termino ?? undefined,
        width: '150px',
        cell: (o) => (
          <span className="grid gap-0.5 leading-tight">
            <StatusBadge entity="oso" value={o.status} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {o.data_termino ? `Término ${curta(o.data_termino)}` : 'Sem término'}
            </span>
          </span>
        ),
      }),
      {
        ...col.pessoa<OsoDaAuditoria>('tecnico', 'Técnico', (o) => o.responsavel_nome, { width: '180px' }),
        cell: ({ row }) => (
          <span className="block max-w-[10.5rem] truncate" title={row.original.responsavel_nome ?? undefined}>
            <PessoaChip nome={row.original.responsavel_nome} variant="full" />
          </span>
        ),
      },
      col.custom<OsoDaAuditoria>('decisao', 'Revisão e hoje', {
        accessor: (o) => Number(o.revisao_cliente) * 2 + Number(o.cobraria_hoje),
        width: '140px',
        cell: (o) => (
          <span className="flex flex-wrap gap-1">
            <Marca ligado={o.revisao_cliente} rotulo="Revisão" dica="O técnico marcou &quot;Revisão do cliente&quot;" />
            <Marca ligado={o.cobraria_hoje} rotulo="Hoje" dica="Cobraria pela regra do catálogo de hoje" />
          </span>
        ),
      }),
      col.custom<OsoDaAuditoria>('cobranca', 'Cobrança', {
        accessor: (o) => ['nao_gera', 'nao_liberada', 'a_cobrar', 'cobrada'].indexOf(o.situacao_cobranca),
        width: '180px',
        cell: (o) => (
          <span className="grid gap-0.5 leading-tight">
            <SituacaoDaCobranca o={o} />
            {o.referencia ? (
              <span className="truncate text-xs tabular-nums text-muted-foreground">{o.referencia}</span>
            ) : o.cobrada ? (
              <span className="text-xs font-medium text-warning-strong">{o.numero_nf_original === '0' ? 'NF "0"' : 'Sem NF'}</span>
            ) : o.deveria_ser_cobrada ? (
              <span className="text-xs font-medium text-danger-strong">Deveria ter sido cobrada</span>
            ) : null}
          </span>
        ),
      }),

      // Detalhes: uma informação por coluna, ocultas por padrão (menu Colunas).
      col.texto<OsoDaAuditoria>('documento', 'CNPJ/CPF', (o) => formatDocumento(o.cliente_tipo_inscricao, o.cliente_documento, { withLabel: false }), { width: '170px', priority: 3 }),
      col.numero<OsoDaAuditoria>('quantidade', 'Quantidade', (o) => o.quantidade, { priority: 3 }),
      col.texto<OsoDaAuditoria>('descricao', 'Descrição', (o) => o.descricao, { priority: 3 }),
      col.data<OsoDaAuditoria>('recebimento', 'Recebimento', (o) => o.data_recebimento, { priority: 3 }),
      col.data<OsoDaAuditoria>('inicio', 'Início', (o) => o.data_inicio, { priority: 3 }),
      col.data<OsoDaAuditoria>('termino', 'Término', (o) => o.data_termino, { priority: 3 }),
      col.numero<OsoDaAuditoria>('dias', 'Dias até terminar', (o) => o.dias_ate_terminar, { priority: 3, width: '130px' }),
      col.data<OsoDaAuditoria>('liberada_em', 'Liberada em', (o) => o.liberada_em, { priority: 3 }),
      {
        ...col.pessoa<OsoDaAuditoria>('liberada_por', 'Liberada por', (o) => o.liberada_por_nome, { width: '200px', priority: 3 }),
        cell: ({ row }) => <PessoaChip nome={row.original.liberada_por_nome} variant="full" />,
      },
      col.booleano<OsoDaAuditoria>('catalogo_cobra', 'Catálogo cobra hoje', (o) => o.catalogo_cobra_hoje, { width: '140px', priority: 3 }),
      col.booleano<OsoDaAuditoria>('isento', 'Cliente isento hoje', (o) => o.cliente_isento_hoje, { width: '140px', priority: 3 }),
      col.data<OsoDaAuditoria>('lancamento', 'Data do lançamento', (o) => o.data_lancamento, { priority: 3, width: '140px' }),
      {
        ...col.pessoa<OsoDaAuditoria>('faturada_por', 'Faturada por', (o) => o.faturada_por_nome, { width: '200px', priority: 3 }),
        cell: ({ row }) => <PessoaChip nome={row.original.faturada_por_nome} variant="full" />,
      },
      col.numero<OsoDaAuditoria>('alteracoes', 'Alterações registradas', (o) => o.alteracoes_registradas, { priority: 3, width: '150px' }),
      col.data<OsoDaAuditoria>('ultima_alteracao', 'Última alteração', (o) => o.ultima_alteracao, { priority: 3, width: '140px' }),
    ],
    [],
  );

  const exportar = async () => {
    setBaixando(true);
    try {
      await baixarAuditoriaOperacionalExcel(cliente);
    } catch (e) {
      toast({ title: 'Não foi possível exportar', description: mensagemDeErro(e, 'Tente de novo.'), variant: 'destructive' });
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Auditoria das OS operacionais"
        count={auditoriaQ.isPending ? null : auditoriaQ.data?.total ?? 0}
        description="Todas as OS operacionais criadas antes de 20/10/2026: o que deveria ter sido cobrado e não foi, a decisão de cobrança gravada e o que a regra do catálogo diria hoje."
        backTo="/cobrancas"
        actions={
          <Button onClick={exportar} disabled={baixando || !auditoriaQ.data}>
            {baixando ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {cliente ? 'Exportar Excel do cliente' : 'Exportar Excel'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Cliente</span>
        <div className="w-full sm:w-96">
          <SeletorBusca
            id="auditoria-cliente"
            opcoes={clientes}
            valor={cliente}
            onChange={setCliente}
            placeholder="Todos os clientes"
            vazio="Nenhum cliente encontrado."
            carregando={auditoriaQ.isLoading}
          />
        </div>
        {cliente ? (
          <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>
            Ver todos os clientes
          </Button>
        ) : null}
      </div>

      {auditoriaQ.data ? (
        <section className="mb-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Numero
              destaque
              rotulo="Catálogo cobrável, sem revisão do cliente"
              valor={String(pelaRegra.length)}
              detalhe={`${plural(soma(pelaRegra), 'unidade', 'unidades')} · finalizadas e nunca cobradas`}
            />
            <Numero
              rotulo="Revisão marcada, não cobrada"
              valor={String(comRevisao.length)}
              detalhe={`${plural(soma(comRevisao), 'unidade', 'unidades')} · finalizadas`}
            />
            <Numero rotulo="Clientes afetados" valor={String(clientesAfetados)} detalhe="com catálogo cobrável, sem revisão" />
            <Numero rotulo="Período" valor={periodo} detalhe="mês do término das não cobradas" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Catálogo cobrável, sem revisão: por mês</h2>
              <p className="mb-3 text-xs text-muted-foreground">OS operacionais finalizadas e não cobradas, pelo mês do término</p>
              <GraficoPorMes pontos={meses} />
              {anteriores ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fora do gráfico: {plural(anteriores.osos, 'OS operacional isolada', 'OS operacionais isoladas')} até {anteriores.ate} (estão na tabela e no Excel).
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Catálogo cobrável, sem revisão: por {cliente ? 'serviço' : 'cliente'}</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                {cliente ? 'Os serviços do cliente escolhido' : 'Os 15 clientes com mais OS operacionais; clique numa barra para ver só o cliente'}
              </p>
              <GraficoPorGrupo
                pontos={ranking.pontos}
                onEscolher={cliente ? undefined : (chave) => setCliente(Number(chave.slice(0, chave.indexOf('|'))))}
              />
              {ranking.restantes.grupos ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  E mais {plural(ranking.restantes.grupos, cliente ? 'serviço' : 'cliente', cliente ? 'serviços' : 'clientes')}, com{' '}
                  {plural(ranking.restantes.osos, 'OS operacional', 'OS operacionais')} (estão na tabela e no Excel).
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <DataTable
        id="auditoria-operacionais-compacta"
        data={doCliente}
        views={VIEWS}
        defaultView="todas"
        columns={colunas}
        getRowId={(o) => String(o.id)}
        getRowHref={(o) => `/cobrancas/operacionais/${o.id}`}
        search={{
          placeholder: 'Buscar cliente, nº, serviço ou NF',
          fields: (o) => [o.cliente_nome, o.id, `OSO ${o.id}`, o.servico, o.responsavel_nome, o.referencia],
        }}
        defaultSort={{ id: 'id' }}
        defaultPageSize={50}
        isLoading={auditoriaQ.isLoading}
        isFetching={auditoriaQ.isFetching && !auditoriaQ.isLoading}
        isError={auditoriaQ.isError}
        onRetry={() => auditoriaQ.refetch()}
        emptyStates={{
          noData: { icon: ScanSearch, title: 'Nenhuma OS operacional anterior à regra do catálogo', description: 'Todas as OS operacionais já seguem a regra do catálogo.' },
        }}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        “Deveria ter sido cobrada”: finalizada e não cobrada, com o catálogo cobrável (cliente não isento) e sem “Revisão do cliente”, ou com a revisão marcada.
        “Data do lançamento” fica vazia nas cobranças antigas: o sistema anterior guardava só a NF. O Excel traz todas as colunas e as abas Não cobradas por
        cliente e por mês, Resumo por serviço e Sobre.
      </p>
    </div>
  );
}
