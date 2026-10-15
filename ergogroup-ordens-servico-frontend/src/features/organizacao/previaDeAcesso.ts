import { NAV_GROUPS, NAV_ORGANIZACAO, podeVerItem } from '@/components/layout/navigation';
import { PERMISSOES_POR_SETOR, criarVerificador, type Permissao } from '@/lib/permissoes';

/**
 * Prévia do que uma função libera (revisão de permissões, P4): as telas do menu que dependem de permissão e que
 * quem tem a função passa a ver. As telas que todos veem ficam de fora, para a lista mostrar só o que a função muda.
 */
export function telasDaFuncao(permissoes: Permissao[], setores: number[]): string[] {
  const todosOsSetores = permissoes.includes('setores.todos');
  const porSetor = permissoes.filter((p) => PERMISSOES_POR_SETOR.has(p));
  const { podeAlguma } = criarVerificador({
    globais: todosOsSetores ? permissoes : permissoes.filter((p) => !PERMISSOES_POR_SETOR.has(p)),
    todos_os_setores: todosOsSetores,
    por_setor: todosOsSetores ? [] : setores.map((setor) => ({ setor, setor_nome: '', permissoes: porSetor })),
  });
  return [...NAV_GROUPS, NAV_ORGANIZACAO]
    .flatMap((g) => g.items)
    .filter((item) => item.permissoes && podeVerItem(item, podeAlguma))
    .map((item) => item.title);
}
