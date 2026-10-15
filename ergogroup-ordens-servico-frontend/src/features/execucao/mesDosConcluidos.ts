import { useSearchParams } from 'react-router-dom';

/**
 * Concluídos por mês (fluxos-e-navegacao.md §6.2.6): o mês fica na URL (`?mes=2026-10` ou `?mes=todo`); sem ele,
 * o mês atual. Usado no Painel do setor, na Visão geral e em Meus serviços (o componente é `NavegacaoDoMes`).
 */

export const TODO_O_PERIODO = 'todo';
/** Início do "período todo": antes de qualquer venda registrada no sistema (o backend exige um intervalo). */
const INICIO_DO_HISTORICO = '2000-01-01';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const mesDe = (d: Date) => iso(d).slice(0, 7);
export const somarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number);
  return mesDe(new Date(a, m - 1 + n, 1));
};
export const rotuloDoMes = (mes: string, curto = false) => {
  const [a, m] = mes.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: curto ? 'short' : 'long' }).replace('.', '');
  return curto ? `${nome}/${a}` : `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
};
/** Intervalo buscado no backend: o mês (até hoje, no mês atual) ou o período todo. */
export function intervaloDoMes(mes: string, hoje = new Date()): { de: string; ate: string } {
  if (mes === TODO_O_PERIODO) return { de: INICIO_DO_HISTORICO, ate: iso(hoje) };
  const [a, m] = mes.split('-').map(Number);
  const fim = new Date(a, m, 0);
  return { de: `${mes}-01`, ate: iso(fim > hoje ? hoje : fim) };
}

/** O mês dos concluídos na URL, a troca dele e o rótulo da aba ("Concluídos · out/2026"). */
export function useMesDosConcluidos() {
  const [params, setParams] = useSearchParams();
  const mesParam = params.get('mes');
  const mes = mesParam === TODO_O_PERIODO || /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : mesDe(new Date());
  const mudarMes = (novo: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (novo === mesDe(new Date())) n.delete('mes');
        else n.set('mes', novo);
        return n;
      },
      { replace: true },
    );
  const rotulo = (titulo: string) => (mes === TODO_O_PERIODO ? titulo : `${titulo} · ${rotuloDoMes(mes, true)}`);
  return { mes, mudarMes, rotulo };
}
