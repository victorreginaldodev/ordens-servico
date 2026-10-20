import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '@/features/analytics/constants';
import type { Ponto } from '../auditoria';

/**
 * Gráficos do que deveria ter sido cobrado e não foi (auditoria das OS operacionais, 20/10/2026): o foco é
 * "catálogo cobrável, sem revisão do cliente". Uma série só (contagem de OSOs), na cor de dados do tema; as unidades
 * aparecem no tooltip. Barras finas com a ponta arredondada, grade só na direção do valor, eixos discretos.
 */

const COR = 'hsl(var(--chart-1))';
const TEXTO = 'hsl(var(--muted-foreground))';
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

function Dica({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={tooltipContentStyle} className="max-w-xs px-3 py-2 text-xs shadow-md">
      <p style={tooltipLabelStyle} className="mb-1 font-semibold">{p.rotulo}</p>
      <p style={tooltipItemStyle}>
        <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: COR }} />
        {plural(p.osos, 'OS operacional', 'OS operacionais')} · {plural(p.unidades, 'unidade', 'unidades')}
      </p>
    </div>
  );
}

const eixo = { stroke: TEXTO, fontSize: 11, tickLine: false, axisLine: false } as const;

/** A mesma altura nos dois gráficos (cabe o ranking de 15), para os cartões ficarem lado a lado alinhados. */
const ALTURA_DOS_GRAFICOS = 420;
const semZero = (valor: unknown) => (valor ? String(valor) : '');

/** Barras verticais por mês; o eixo mostra um rótulo a cada poucos meses para não encavalar. */
export function GraficoPorMes({ pontos }: { pontos: Ponto[] }) {
  if (!pontos.length) return <Vazio />;
  const intervalo = pontos.length > 18 ? Math.ceil(pontos.length / 9) - 1 : 0;
  return (
    <div style={{ height: ALTURA_DOS_GRAFICOS }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pontos} margin={{ top: 20, right: 4, left: -16, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis dataKey="rotulo" {...eixo} interval={intervalo} tickMargin={6} />
          <YAxis allowDecimals={false} {...eixo} width={40} />
          <Tooltip content={<Dica />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
          <Bar dataKey="osos" fill={COR} radius={[4, 4, 0, 0]} maxBarSize={24}>
            <LabelList dataKey="osos" position="top" fontSize={11} fill={TEXTO} offset={4} formatter={semZero} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const LARGURA_DO_NOME = 230;
const LETRAS_QUE_CABEM = 34;

/** Nome numa linha só, cortado com reticências; o nome inteiro aparece ao passar o mouse. */
function NomeDoGrupo({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const nome = (payload?.value ?? '').toLocaleUpperCase('pt-BR');
  const curto = nome.length > LETRAS_QUE_CABEM ? `${nome.slice(0, LETRAS_QUE_CABEM - 1).trimEnd()}…` : nome;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={TEXTO}>
      <title>{nome}</title>
      {curto}
    </text>
  );
}

/** Ranking em barras horizontais, com o número na ponta; clicar numa barra chama `onEscolher` com a chave. */
export function GraficoPorGrupo({ pontos, onEscolher }: { pontos: Ponto[]; onEscolher?: (chave: string) => void }) {
  if (!pontos.length) return <Vazio />;
  return (
    <div style={{ height: ALTURA_DOS_GRAFICOS }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pontos} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis type="number" allowDecimals={false} {...eixo} />
          <YAxis type="category" dataKey="rotulo" width={LARGURA_DO_NOME} interval={0} {...eixo} tick={<NomeDoGrupo />} />
          <Tooltip content={<Dica />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
          <Bar
            dataKey="osos"
            fill={COR}
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            className={onEscolher ? 'cursor-pointer' : undefined}
            onClick={(p: { payload?: Ponto }) => p.payload && onEscolher?.(p.payload.chave)}
          >
            <LabelList dataKey="osos" position="right" fontSize={11} fill={TEXTO} offset={6} formatter={semZero} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Vazio() {
  return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma OS operacional nesta situação.</p>;
}
