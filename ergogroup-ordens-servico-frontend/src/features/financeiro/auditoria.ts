import type { OsoDaAuditoria } from './services';

/** Cálculos da auditoria das OS operacionais (gráficos e resumo do que deveria ter sido cobrado). */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const rotuloDoMes = (mes: string) => {
  const [ano, m] = mes.split('-');
  return `${MESES[Number(m) - 1]}/${ano.slice(2)}`;
};
const proximoMes = (mes: string) => {
  const [ano, m] = mes.split('-').map(Number);
  return m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
};

export const naoCobradaPeloCatalogo = (o: OsoDaAuditoria) => o.deveria_ser_cobrada === 'catalogo_sem_revisao';

export interface Ponto {
  rotulo: string;
  chave: string;
  osos: number;
  unidades: number;
}

function contar(osos: OsoDaAuditoria[], chave: (o: OsoDaAuditoria) => string) {
  const contagem = new Map<string, { osos: number; unidades: number }>();
  for (const o of osos) {
    const k = chave(o);
    const c = contagem.get(k) ?? { osos: 0, unidades: 0 };
    c.osos += 1;
    c.unidades += o.quantidade;
    contagem.set(k, c);
  }
  return contagem;
}

/**
 * Por mês do término, com todos os meses do período (os sem nenhuma OSO valem zero, para o tempo não pular). O período
 * começa no primeiro mês com dados que tem o mês seguinte também com dados: um registro isolado muito antes (ex.: data
 * digitada errada) não estica o gráfico por um ano de zeros. Esses ficam em `anteriores`, para a tela avisar.
 */
export function porMes(osos: OsoDaAuditoria[]): { pontos: Ponto[]; anteriores: { osos: number; ate: string } | null } {
  const contagem = contar(osos, (o) => o.mes_referencia);
  const meses = [...contagem.keys()].sort();
  if (!meses.length) return { pontos: [], anteriores: null };
  const inicio = Math.max(0, meses.findIndex((m, i) => meses[i + 1] === proximoMes(m)));
  const antes = meses.slice(0, inicio);
  const pontos: Ponto[] = [];
  for (let mes = meses[inicio]; mes <= meses[meses.length - 1]; mes = proximoMes(mes)) {
    pontos.push({ chave: mes, rotulo: rotuloDoMes(mes), ...(contagem.get(mes) ?? { osos: 0, unidades: 0 }) });
  }
  return {
    pontos,
    anteriores: antes.length
      ? { osos: antes.reduce((s, m) => s + (contagem.get(m)?.osos ?? 0), 0), ate: rotuloDoMes(antes[antes.length - 1]) }
      : null,
  };
}

/**
 * Os `limite` maiores por `chave` (cliente ou serviço), do maior para o menor. O resto não vira uma barra "Outros"
 * (ela achataria as demais): fica em `restantes`, para a tela dizer quantos ficaram de fora e quantas OSOs eles somam.
 */
export function porGrupo(
  osos: OsoDaAuditoria[],
  chave: (o: OsoDaAuditoria) => string,
  rotulo: (chave: string) => string = (k) => k,
  limite = 15,
): { pontos: Ponto[]; restantes: { grupos: number; osos: number } } {
  const ordenados = [...contar(osos, chave).entries()].sort(
    (a, b) => b[1].osos - a[1].osos || a[0].localeCompare(b[0], 'pt-BR'),
  );
  const resto = ordenados.slice(limite);
  return {
    pontos: ordenados.slice(0, limite).map(([k, c]) => ({ chave: k, rotulo: rotulo(k), ...c })),
    restantes: { grupos: resto.length, osos: resto.reduce((s, [, c]) => s + c.osos, 0) },
  };
}
