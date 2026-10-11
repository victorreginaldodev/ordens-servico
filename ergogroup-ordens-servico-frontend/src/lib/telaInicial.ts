import type { Permissao, Verificador } from './permissoes';

/**
 * Tela inicial por permissão (docs/ui/fluxos-e-navegacao.md §5, decidido em 11/10/2026).
 * A regra olha só códigos de permissão, nunca o nome da função ou do setor.
 */

export type TelaInicialId = 'visao-geral' | 'setor' | 'cobrancas' | 'vendas' | 'meus-servicos';

export interface TelaInicial {
  id: TelaInicialId;
  titulo: string;
  url: string;
  /** Quem pode abrir a tela: ao menos uma destas. Sem o campo, todos. */
  permissoes?: Permissao[];
  /** Some para quem tem alguma destas (ex.: o Painel do setor para quem vê todos os setores). */
  semPermissoes?: Permissao[];
}

export const TELAS_INICIAIS: TelaInicial[] = [
  { id: 'visao-geral', titulo: 'Visão geral', url: '/visao-geral', permissoes: ['setores.todos'] },
  { id: 'setor', titulo: 'Painel do setor', url: '/setor', permissoes: ['servicos.ver_setor'], semPermissoes: ['setores.todos'] },
  { id: 'cobrancas', titulo: 'Cobranças', url: '/cobrancas', permissoes: ['financeiro.registrar_cobranca'] },
  { id: 'vendas', titulo: 'Vendas', url: '/vendas', permissoes: ['os.gerenciar', 'os.ver_todas'] },
  { id: 'meus-servicos', titulo: 'Meus serviços', url: '/meus-servicos' },
];

const tela = (id: TelaInicialId) => TELAS_INICIAIS.find((t) => t.id === id)!;

export const podeAbrir = (t: Pick<TelaInicial, 'permissoes' | 'semPermissoes'>, v: Pick<Verificador, 'podeAlguma'>) =>
  (!t.permissoes || v.podeAlguma(t.permissoes)) && !(t.semPermissoes && v.podeAlguma(t.semPermissoes));

/**
 * Regras, em ordem:
 * 1. `setores.todos` → Visão geral (diretoria);
 * 2. distribui e acompanha um setor → Painel do setor;
 * 3. registra cobrança → Cobranças (vem antes de Vendas porque o financeiro também tem `os.gerenciar`);
 * 4. gerencia ou vê vendas → Vendas;
 * 5. senão → Meus serviços.
 */
export function telaPelasPermissoes(v: Pick<Verificador, 'pode'>): TelaInicial {
  if (v.pode('setores.todos')) return tela('visao-geral');
  if (v.pode('tarefas.distribuir') && v.pode('servicos.ver_setor')) return tela('setor');
  if (v.pode('financeiro.registrar_cobranca')) return tela('cobrancas');
  if (v.pode('os.gerenciar') || v.pode('os.ver_todas')) return tela('vendas');
  return tela('meus-servicos');
}

/* Escolha pessoal ("Abrir sempre em…"): fica só neste navegador, por pessoa. */
const chave = (usuarioId: number | string) => `tela-inicial:${usuarioId}`;

export function lerTelaPreferida(usuarioId: number | string | undefined): TelaInicialId | null {
  if (usuarioId == null) return null;
  try {
    const v = localStorage.getItem(chave(usuarioId));
    return TELAS_INICIAIS.some((t) => t.id === v) ? (v as TelaInicialId) : null;
  } catch {
    return null;
  }
}

export function gravarTelaPreferida(usuarioId: number | string, id: TelaInicialId | null) {
  try {
    if (id) localStorage.setItem(chave(usuarioId), id);
    else localStorage.removeItem(chave(usuarioId));
  } catch {
    /* sem armazenamento: vale a regra automática */
  }
}
