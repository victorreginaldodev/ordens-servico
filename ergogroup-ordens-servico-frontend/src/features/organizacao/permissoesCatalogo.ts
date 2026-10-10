import type { Permissao } from '@/lib/permissoes';

/**
 * Como as permissões aparecem na tela de funções. A lista oficial (código, frase e escopo) vem do
 * backend em `funcoes/permissoes-disponiveis/`; aqui ficam só o agrupamento, o texto de apoio e os
 * avisos, que são decisões de interface.
 */

export interface GrupoPermissoes {
  id: string;
  titulo: string;
  permissoes: Permissao[];
}

export const GRUPOS_PERMISSOES: GrupoPermissoes[] = [
  { id: 'os', titulo: 'Ordens de serviço', permissoes: ['os.ver_todas', 'os.gerenciar', 'os.excluir', 'os_operacional.gerenciar'] },
  {
    id: 'execucao',
    titulo: 'Execução no setor',
    permissoes: ['servicos.ver_setor', 'servicos.gerenciar', 'tarefas.distribuir', 'tarefas.editar_setor', 'setores.todos'],
  },
  { id: 'financeiro', titulo: 'Financeiro', permissoes: ['financeiro.ver_valores', 'financeiro.registrar_cobranca'] },
  { id: 'cadastros', titulo: 'Cadastros', permissoes: ['clientes.gerenciar', 'catalogo.gerenciar'] },
  {
    id: 'organizacao',
    titulo: 'Time e organização',
    permissoes: ['usuarios.gerenciar', 'usuarios.gerenciar_diretoria', 'usuarios.redefinir_senha', 'organizacao.configurar'],
  },
  { id: 'indicadores', titulo: 'Indicadores e histórico', permissoes: ['indicadores.ver_geral', 'auditoria.ver'] },
];

/** Texto de apoio abaixo da frase oficial: o que muda na prática. */
export const AJUDA_PERMISSAO: Partial<Record<Permissao, string>> = {
  'os.ver_todas': 'Sem ela, a pessoa vê só as OS em que tem tarefa ou que são dos seus setores.',
  'os.gerenciar': 'Cria a OS, define cliente, contrato, condições e serviços.',
  'os.excluir': 'Apaga a OS com seus serviços e tarefas. Não há como desfazer.',
  'os_operacional.gerenciar': 'Inclui o catálogo operacional.',
  'servicos.ver_setor': 'Vê a fila de triagem, o painel e a produtividade das pessoas do setor.',
  'servicos.gerenciar': 'Ajusta prazo, prioridade e estimativas dos serviços do setor.',
  'tarefas.distribuir': 'Cria tarefas e escolhe quem executa. É o papel de quem faz a triagem.',
  'tarefas.editar_setor': 'Muda status e dados de tarefas de outras pessoas do setor.',
  'setores.todos': 'As permissões de execução desta função passam a valer em todos os setores, não só nos da pessoa.',
  'financeiro.ver_valores': 'Sem ela, valores e condições de pagamento ficam ocultos em toda a tela.',
  'financeiro.registrar_cobranca': 'Marca a OS como cobrada e informa a nota fiscal.',
  'usuarios.gerenciar': 'Adiciona pessoas, define setores e funções, desativa e exclui.',
  'usuarios.gerenciar_diretoria': 'Altera pessoas cuja função também tem esta permissão.',
  'usuarios.redefinir_senha': 'Troca a senha de outra pessoa sem precisar da senha dela.',
  'organizacao.configurar': 'Cria setores e funções e decide o que cada função pode fazer.',
  'indicadores.ver_geral': 'Sem ela, os indicadores mostram só os números da própria pessoa ou do setor.',
  'auditoria.ver': 'Vê quem alterou o quê nas OS, com os valores antes e depois.',
};

/** Permissões que pedem atenção ao marcar (destrutivas ou que ampliam muito o acesso). */
export const PERMISSOES_SENSIVEIS: ReadonlySet<Permissao> = new Set<Permissao>([
  'os.excluir',
  'setores.todos',
  'usuarios.gerenciar_diretoria',
  'organizacao.configurar',
]);

/** Combinações que costumam andar juntas: aviso, nunca bloqueio. */
export const DEPENDENCIAS_SUGERIDAS: Array<{ se: Permissao; entao: Permissao; texto: string }> = [
  {
    se: 'tarefas.distribuir',
    entao: 'servicos.ver_setor',
    texto: 'Quem distribui tarefas normalmente também precisa ver os serviços do setor.',
  },
  {
    se: 'financeiro.registrar_cobranca',
    entao: 'financeiro.ver_valores',
    texto: 'Quem registra cobrança normalmente também precisa ver os valores.',
  },
  {
    se: 'usuarios.gerenciar_diretoria',
    entao: 'usuarios.gerenciar',
    texto: 'Gerenciar a diretoria só funciona junto com gerenciar o time.',
  },
];
