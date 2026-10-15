/**
 * Catálogo de permissões e verificação de acesso, espelho de
 * `apps/organizacoes/permissoes.py` no backend.
 *
 * As permissões de cada pessoa vêm das funções que ela exerce nos setores e chegam
 * prontas no login e no `/auth/me/` (`permissoes`). A tela pergunta por código de
 * permissão (`pode('os.gerenciar')`), nunca por nome de função ou de setor.
 */

export const PERMISSOES = [
  'os.ver_todas',
  'os.gerenciar',
  'os.excluir',
  'os_operacional.gerenciar',
  'financeiro.ver_valores',
  'financeiro.registrar_cobranca',
  'clientes.gerenciar',
  'catalogo.gerenciar',
  'servicos.ver_setor',
  'servicos.gerenciar',
  'tarefas.distribuir',
  'tarefas.editar_setor',
  'tarefas.receber',
  'usuarios.gerenciar',
  'usuarios.gerenciar_diretoria',
  'usuarios.redefinir_senha',
  'organizacao.configurar',
  'indicadores.ver_geral',
  'auditoria.ver',
  'setores.todos',
] as const;

export type Permissao = (typeof PERMISSOES)[number];

/** Permissões que valem só nos setores do vínculo que as concede; as demais valem na empresa toda. */
export const PERMISSOES_POR_SETOR: ReadonlySet<Permissao> = new Set<Permissao>([
  'servicos.ver_setor',
  'servicos.gerenciar',
  'tarefas.distribuir',
  'tarefas.editar_setor',
  'tarefas.receber',
]);

/** Setor e função que uma pessoa exerce (`Vinculo` na API). */
export interface Vinculo {
  id: number;
  setor: number;
  setor_nome: string;
  funcao: number;
  funcao_nome: string;
}

/** Permissões efetivas de uma pessoa (`ResumoPermissoes` na API). */
export interface ResumoPermissoes {
  /** Valem na empresa toda. Com `todos_os_setores`, inclui também as permissões por setor. */
  globais: string[];
  todos_os_setores: boolean;
  por_setor: Array<{ setor: number; setor_nome: string; permissoes: string[] }>;
}

export const RESUMO_SEM_PERMISSOES: ResumoPermissoes = { globais: [], todos_os_setores: false, por_setor: [] };

export interface Verificador {
  /**
   * Indica se a pessoa tem a permissão. Para permissões por setor, `setor` restringe a
   * verificação àquele setor; sem setor (ou serviço ainda sem setor), basta tê-la em algum.
   */
  pode: (permissao: Permissao, setor?: number | null) => boolean;
  /** Pelo menos uma das permissões. */
  podeAlguma: (permissoes: Permissao[], setor?: number | null) => boolean;
  /** IDs dos setores em que a permissão vale, ou `'todos'`. */
  setoresCom: (permissao: Permissao) => number[] | 'todos';
  /**
   * Ninguém concede o que não tem (`pode_conceder` no backend). Exceção: "Recebe tarefas" não é um poder, é
   * ser elegível para receber; quem distribui no setor pode concedê-la.
   */
  podeConceder: (permissao: Permissao, setor?: number | null) => boolean;
}

export function criarVerificador(resumo: ResumoPermissoes | null | undefined, superusuario = false): Verificador {
  const r = resumo ?? RESUMO_SEM_PERMISSOES;
  const globais = new Set(r.globais);
  const porSetor = new Map(r.por_setor.map((s) => [s.setor, new Set(s.permissoes)]));

  const pode = (permissao: Permissao, setor?: number | null) => {
    if (superusuario) return true;
    if (!PERMISSOES_POR_SETOR.has(permissao) || r.todos_os_setores) return globais.has(permissao);
    if (setor == null) return [...porSetor.values()].some((p) => p.has(permissao));
    return porSetor.get(setor)?.has(permissao) ?? false;
  };

  return {
    pode,
    podeAlguma: (permissoes, setor) => permissoes.some((p) => pode(p, setor)),
    podeConceder: (permissao, setor) => pode(permissao === 'tarefas.receber' ? 'tarefas.distribuir' : permissao, setor),
    setoresCom: (permissao) => {
      if (superusuario || (r.todos_os_setores && globais.has(permissao))) return 'todos';
      return [...porSetor.entries()].filter(([, p]) => p.has(permissao)).map(([id]) => id);
    },
  };
}

/** "Gestor Técnico · Segurança do Trabalho", ou as funções separadas por vírgula quando há mais de um setor. */
export function descreverVinculos(vinculos: Vinculo[] | undefined): string {
  if (!vinculos?.length) return '';
  if (vinculos.length === 1) return `${vinculos[0].funcao_nome} · ${vinculos[0].setor_nome}`;
  return [...new Set(vinculos.map((v) => v.funcao_nome))].join(', ');
}
