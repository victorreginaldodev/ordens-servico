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
  { id: 'vendas', titulo: 'Vendas', permissoes: ['os.ver_todas', 'os.gerenciar', 'os.excluir', 'os_operacional.gerenciar', 'catalogo_operacional.gerenciar', 'catalogo_operacional.configurar_cobranca'] },
  {
    id: 'execucao',
    titulo: 'Execução',
    permissoes: ['tarefas.receber', 'servicos.ver_setor', 'tarefas.distribuir', 'servicos.gerenciar', 'tarefas.editar_setor', 'setores.todos'],
  },
  { id: 'financeiro', titulo: 'Financeiro', permissoes: ['financeiro.ver_valores', 'financeiro.registrar_cobranca'] },
  { id: 'cadastros', titulo: 'Cadastros', permissoes: ['clientes.gerenciar', 'catalogo.gerenciar'] },
  {
    id: 'organizacao',
    titulo: 'Pessoas e organização',
    permissoes: ['usuarios.gerenciar', 'usuarios.gerenciar_diretoria', 'usuarios.redefinir_senha', 'organizacao.configurar'],
  },
  { id: 'indicadores', titulo: 'Indicadores e auditoria', permissoes: ['indicadores.ver_geral', 'auditoria.ver'] },
];

/**
 * Nome da permissão em linguagem de tela (revisão de permissões, P4). Quando falta, vale a frase do backend.
 */
export const TITULO_PERMISSAO: Partial<Record<Permissao, string>> = {
  'os.ver_todas': 'Ver todas as vendas',
  'os.gerenciar': 'Vender: criar e editar OS e seus serviços',
  'os.excluir': 'Excluir OS',
  'os_operacional.gerenciar': 'Criar e editar OS operacionais',
  'catalogo_operacional.gerenciar': 'Cadastrar o catálogo operacional',
  'catalogo_operacional.configurar_cobranca': 'Configurar a cobrança do catálogo operacional',
  'tarefas.receber': 'Recebe tarefas: pode ser responsável por tarefas',
  'servicos.ver_setor': 'Acompanhar o setor: ver a fila, o andamento e a equipe',
  'tarefas.distribuir': 'Distribuir: escolher responsável e prazo',
  'servicos.gerenciar': 'Ajustar e excluir os serviços do setor',
  'tarefas.editar_setor': 'Editar as tarefas de qualquer pessoa do setor',
  'setores.todos': 'Atuar em todos os setores',
  'financeiro.ver_valores': 'Ver valores e condições de pagamento',
  'financeiro.registrar_cobranca': 'Registrar cobrança e nota fiscal',
  'clientes.gerenciar': 'Cadastrar, editar e excluir clientes',
  'catalogo.gerenciar': 'Cadastrar o catálogo de serviços e o setor de cada um',
  'usuarios.gerenciar': 'Gerenciar o time',
  'usuarios.gerenciar_diretoria': 'Gerenciar as pessoas da diretoria',
  'usuarios.redefinir_senha': 'Trocar a senha de outra pessoa',
  'organizacao.configurar': 'Configurar a empresa e os setores',
  'indicadores.ver_geral': 'Ver os indicadores de toda a equipe',
  'auditoria.ver': 'Ver o histórico de alterações',
};

export const tituloDaPermissao = (p: { codigo: string; descricao: string }) =>
  TITULO_PERMISSAO[p.codigo as Permissao] ?? p.descricao;

/** Onde a permissão vale, como aparece ao lado do nome. */
export const ESCOPO_PERMISSAO = { setor: 'No setor da pessoa', global: 'Empresa toda' } as const;

/** Texto de apoio abaixo da frase oficial: o que muda na prática. */
export const AJUDA_PERMISSAO: Partial<Record<Permissao, string>> = {
  'os.ver_todas': 'Sem ela, a pessoa vê só as OS em que tem tarefa ou que são dos seus setores.',
  'os.gerenciar': 'Cria a OS, define cliente, contrato, condições e serviços.',
  'os.excluir': 'Apaga a OS com seus serviços e tarefas. Não há como desfazer.',
  'os_operacional.gerenciar': 'Não inclui o catálogo operacional, que tem permissão própria.',
  'catalogo_operacional.gerenciar':
    'Cria, edita e exclui os serviços do catálogo operacional. A regra de cobrança exige também "Configurar a cobrança do catálogo operacional".',
  'catalogo_operacional.configurar_cobranca':
    'Define se cada serviço do catálogo operacional gera cobrança e quais clientes são isentos. Vale também para as OS operacionais ainda não faturadas desse serviço.',
  'tarefas.receber':
    'A pessoa aparece na lista de responsáveis do setor. Quem é de outro setor recebe pelo "Também executa em", na pessoa. "Atuar em todos os setores" não estende esta permissão.',
  'servicos.ver_setor': 'Vê o Painel do setor: a fila, o andamento, a equipe e a produtividade das pessoas. Com "Distribuir", organiza o setor e recebe o aviso de chegada.',
  'servicos.gerenciar': 'Ajusta prazo e prioridade dos serviços do setor e pode excluí-los.',
  'tarefas.distribuir': 'Cria tarefas e escolhe quem executa. É o papel de quem faz a triagem.',
  'tarefas.editar_setor': 'Muda a situação e os dados de tarefas de outras pessoas do setor.',
  'setores.todos':
    'As permissões de execução desta função passam a valer em todos os setores (vê a Visão geral no lugar do Painel do setor). Não inclui receber tarefas.',
  'financeiro.ver_valores': 'Sem ela, valores e condições de pagamento ficam ocultos em toda a tela, e o Painel financeiro some do menu.',
  'financeiro.registrar_cobranca': 'Vê as Cobranças, marca a OS como cobrada e informa a nota fiscal. Exige "Ver valores".',
  'usuarios.gerenciar': 'Adiciona pessoas, define setores e funções, desativa e exclui.',
  'usuarios.gerenciar_diretoria': 'Altera pessoas cuja função também tem esta permissão.',
  'usuarios.redefinir_senha': 'Troca a senha de outra pessoa sem precisar da senha dela.',
  'organizacao.configurar': 'Edita os dados da empresa e cria, edita e desativa setores. Funções e permissões são só de superusuários.',
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
    se: 'usuarios.gerenciar_diretoria',
    entao: 'usuarios.gerenciar',
    texto: 'Gerenciar a diretoria só funciona junto com gerenciar o time.',
  },
];

/**
 * Combinações obrigatórias (o backend recusa sem elas): marcar `se` marca `exige`; desmarcar `exige` desmarca `se`.
 * Revisão de permissões, P7: as Cobranças mostram valores.
 */
export const PERMISSOES_EXIGIDAS: Array<{ se: Permissao; exige: Permissao }> = [
  { se: 'financeiro.registrar_cobranca', exige: 'financeiro.ver_valores' },
];

/** Aplica as combinações obrigatórias ao marcar ou desmarcar `codigo`. */
export function aplicarExigidas(marcadas: Permissao[], codigo: Permissao, marcar: boolean): Permissao[] {
  let lista = marcar ? [...new Set([...marcadas, codigo])] : marcadas.filter((p) => p !== codigo);
  for (const regra of PERMISSOES_EXIGIDAS) {
    if (marcar && codigo === regra.se && !lista.includes(regra.exige)) lista = [...lista, regra.exige];
    if (!marcar && codigo === regra.exige) lista = lista.filter((p) => p !== regra.se);
  }
  return lista;
}
