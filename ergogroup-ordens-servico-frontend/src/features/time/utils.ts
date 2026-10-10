import type { UsuarioApi } from './services';
import type { VinculoLinha } from './components/VinculosEditor';

/** Nome para exibir: o nome completo cadastrado; sem ele, o nome de usuário; por último, o e-mail. */
export const nomeDaPessoa = (u: { nome_completo?: string | null; username?: string | null; email?: string | null }) =>
  u.nome_completo?.trim() || u.username?.trim() || u.email?.trim() || 'Sem nome';

/**
 * Opções de pessoa para seletores de responsável e filtros, em ordem alfabética.
 * Qualquer pessoa do time pode ser responsável por uma tarefa; não há mais um "tipo técnico".
 */
export const opcoesDePessoas = (usuarios: UsuarioApi[], { somenteAtivas = false } = {}) =>
  usuarios
    .filter((u) => !somenteAtivas || u.ativo)
    .map((u) => ({ value: String(u.id), label: nomeDaPessoa(u) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));

/** Compara listas de vínculos ignorando a ordem. */
export const mesmosVinculos = (a: VinculoLinha[], b: VinculoLinha[]) => {
  const chave = (l: VinculoLinha[]) =>
    l.map((v) => `${v.setor}:${v.funcao}`).sort().join('|');
  return chave(a) === chave(b);
};
