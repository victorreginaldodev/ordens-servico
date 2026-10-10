import { useMemo } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CobrancaBadge,
  EmptyState,
  PageHeader,
  PessoaChip,
  PrazoIndicator,
  PrioridadeIndicator,
  STATUS_DEFS,
  STATUS_ENCERRADOS,
  StatusBadge,
  isPrazoVencido,
  type StatusEntity,
} from '@/components/kit';
import { DataTable, col } from '@/components/data-table';
import { formatCurrency, formatDocumento } from '@/lib/format';
import { toast } from 'sonner';

/*
 * Vitrine do UI kit (docs/ui/plano-ui-kit.md, Fase 7). Rota /ui, só em desenvolvimento.
 * Dados fictícios: serve para ver e testar os componentes isolados das telas reais.
 */

interface OsFake {
  id: number;
  cliente: string;
  cnpj: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'alta' | 'media' | 'baixa';
  prazo: string | null;
  data_venda: string;
  contrato: boolean;
  liberada: boolean;
  cobrada: boolean;
  nf: number | null;
  valor: string;
  responsavel: string;
  horas: number;
  complexidade: 1 | 2 | 3;
}

const CLIENTES = [
  'Metalúrgica Paraná Ltda', 'Hospital São Lucas', 'Construtora Alfa Engenharia', 'Frigorífico Vale Verde S.A.',
  'Transportadora Rota Sul', 'Indústria Têxtil Nova Era', 'Cooperativa Agroindustrial Campos', 'Supermercados Bom Preço',
  'Laboratório Vida Análises', 'Usina Santa Clara', 'Plásticos Iguaçu Ltda', 'Química Fina Brasil',
];
const PESSOAS = ['Mariana Souza', 'Rafael Lima', 'Juliana Prado', 'Carlos Paiva', 'Fernanda Reis'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function makeFakeOs(): OsFake[] {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = <V,>(a: V[]) => a[Math.floor(rnd() * a.length)];
  const today = new Date();
  const shift = (n: number) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  return Array.from({ length: 143 }, (_, i) => {
    const r = rnd();
    const status = r < 0.22 ? 'aberta' : r < 0.48 ? 'em_andamento' : r < 0.93 ? 'concluida' : 'cancelada';
    const concluida = status === 'concluida';
    const liberada = concluida || rnd() < 0.12;
    const cobrada = concluida && rnd() < 0.55;
    const digits = Array.from({ length: 14 }, () => Math.floor(rnd() * 10)).join('');
    return {
      id: 1180 - i,
      cliente: pick(CLIENTES),
      cnpj: digits,
      status,
      prioridade: pick(['alta', 'media', 'media', 'baixa', 'baixa'] as const),
      prazo: rnd() < 0.15 ? null : shift(Math.round(rnd() * 50 - 22)),
      data_venda: shift(-Math.round(rnd() * 120 + 3)),
      contrato: rnd() < 0.3,
      liberada,
      cobrada,
      nf: cobrada ? 4200 + Math.floor(rnd() * 400) : null,
      valor: String(Math.round(rnd() * 18000 + 600)),
      responsavel: pick(PESSOAS),
      horas: Math.round(rnd() * 40) / 2,
      complexidade: pick([1, 2, 3] as const),
    };
  });
}

const encerrada = (r: OsFake) => STATUS_ENCERRADOS.has(r.status);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function UiKitPage() {
  const data = useMemo(makeFakeOs, []);

  const columns = useMemo(
    () => [
      col.registro<OsFake>('cliente', 'Cliente / OS', {
        title: (r) => r.cliente,
        subtitle: (r) => `OS ${r.id} · ${formatDocumento('cnpj', r.cnpj)}`,
      }),
      col.status<OsFake>('status', 'Status', (r) => r.status, { entity: 'os' }),
      col.prioridade<OsFake>('prioridade', 'Prioridade', (r) => r.prioridade),
      col.prazo<OsFake>('prazo', 'Prazo', (r) => r.prazo, { encerrado: encerrada }),
      col.pessoa<OsFake>('responsavel', 'Responsável', (r) => r.responsavel, { priority: 2, facet: true }),
      col.booleano<OsFake>('contrato', 'Contrato', (r) => r.contrato, { label: 'Vigente', priority: 2 }),
      col.cobranca<OsFake>('cobranca', 'Cobrança', (r) => ({ liberada: r.liberada, cobrada: r.cobrada, nf: r.nf }), { priority: 2 }),
      col.moeda<OsFake>('valor', 'Valor', (r) => r.valor),
      col.data<OsFake>('data_venda', 'Data da venda', (r) => r.data_venda, { priority: 3 }),
      col.numero<OsFake>('horas', 'Horas est.', (r) => r.horas, { format: 'horas', priority: 3 }),
      col.nivel<OsFake>('complexidade', 'Complexidade', (r) => r.complexidade, { priority: 3 }),
    ],
    [],
  );

  const prazoHoje = iso(new Date());
  const prazo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="UI kit"
        description="Componentes do design system com dados fictícios. Referência: docs/ui/design-system-tabelas.md"
        actions={<Button><Plus className="size-4" />Ação primária</Button>}
      />

      <Section title="Status">
        <div className="space-y-2">
          {(Object.keys(STATUS_DEFS) as StatusEntity[]).map((entity) => (
            <div key={entity} className="flex flex-wrap items-center gap-2">
              <span className="w-20 text-xs font-medium text-muted-foreground">{entity}</span>
              {Object.keys(STATUS_DEFS[entity]).map((s) => (
                <StatusBadge key={s} entity={entity} value={s} />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Prioridade, cobrança, prazo e pessoa">
        <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <PrioridadeIndicator value="alta" />
            <br />
            <PrioridadeIndicator value="media" />
            <br />
            <PrioridadeIndicator value="baixa" />
          </div>
          <div className="space-y-2">
            <CobrancaBadge />
            <br />
            <CobrancaBadge liberada />
            <br />
            <CobrancaBadge liberada cobrada nf={4321} />
          </div>
          <div className="space-y-2">
            <PrazoIndicator prazo={prazo(12)} />
            <PrazoIndicator prazo={prazo(2)} />
            <PrazoIndicator prazo={prazoHoje} />
            <PrazoIndicator prazo={prazo(-7)} />
            <PrazoIndicator prazo={prazo(-7)} encerrado />
          </div>
          <div className="space-y-2">
            <PessoaChip nome="Mariana Souza" />
            <br />
            <PessoaChip nome="Rafael Lima" variant="full" />
            <br />
            <span className="tabular-nums">{formatCurrency(12450)}</span>
          </div>
        </div>
      </Section>

      <Section title="DataTable">
        <DataTable
          id="ui-kit-demo"
          data={data}
          columns={columns}
          getRowId={(r) => String(r.id)}
          onRowClick={(r) => toast(`Abriria a OS ${r.id}`)}
          views={[
            { id: 'todas', label: 'Todas' },
            { id: 'abertas', label: 'Em aberto', filter: (r) => r.status === 'aberta' || r.status === 'em_andamento' },
            { id: 'atrasadas', label: 'Atrasadas', filter: (r) => isPrazoVencido(r.prazo, encerrada(r)), tone: 'danger' },
            { id: 'concluidas', label: 'Concluídas', filter: (r) => r.status === 'concluida' },
          ]}
          search={{ placeholder: 'Buscar por cliente, nº da OS ou CNPJ', fields: (r) => [r.cliente, r.id, r.cnpj] }}
          facets={[{ columnId: 'status' }, { columnId: 'prioridade' }, { columnId: 'responsavel' }, { columnId: 'cobranca' }]}
          defaultSort={{ id: 'prazo' }}
          rowActions={(r) => [
            { label: 'Editar', icon: Pencil, onSelect: () => toast(`Editar OS ${r.id}`) },
            { label: 'Excluir', icon: Trash2, destructive: true, onSelect: () => toast(`Excluir OS ${r.id}`) },
          ]}
          footerSummary={(rows) => (
            <span>
              Total da página: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(rows.reduce((s, r) => s + Number(r.valor), 0))}</span>
            </span>
          )}
        />
      </Section>

      <Section title="Estados da tabela">
        <div className="grid gap-6 lg:grid-cols-2">
          <DataTable id="ui-kit-loading" data={[]} columns={columns.slice(0, 4)} isLoading syncWithUrl={false} />
          <DataTable id="ui-kit-empty" data={[]} columns={columns.slice(0, 4)} syncWithUrl={false} emptyStates={{ noData: { title: 'Nenhuma OS cadastrada ainda', description: 'Crie a primeira ordem de serviço.' } }} />
          <DataTable id="ui-kit-error" data={[]} columns={columns.slice(0, 4)} isError onRetry={() => toast('Tentando de novo')} syncWithUrl={false} />
          <div className="rounded-lg border bg-card">
            <EmptyState title="EmptyState avulso" description="Usado fora de tabelas também." action={<Button variant="outline">Ação</Button>} />
          </div>
        </div>
      </Section>
    </div>
  );
}
