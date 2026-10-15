import { Activity, Building2, Handshake, History, ListChecks, Network, Receipt, Rocket, type LucideIcon } from 'lucide-react';
import type { Permissao } from '@/lib/permissoes';

export interface DefinicaoDeModulo {
  /** Também é o nome da pasta em `conteudo/`. */
  id: string;
  titulo: string;
  icone: LucideIcon;
  /** O módulo inteiro só aparece para quem tem ao menos uma destas. Sem o campo, aparece para todos. */
  permissoes?: Permissao[];
  /** Ordem das páginas no índice: o nome de cada arquivo `.md`, sem a extensão. */
  paginas: string[];
}

/**
 * Índice da Ajuda, na ordem do fluxo do sistema (quem entra → vende → executa → fatura → cadastros, números e
 * organização). O texto de cada página fica em `conteudo/<modulo>/<pagina>.md` (convenções em `conteudo/README.md`).
 */
export const MODULOS_DA_AJUDA: DefinicaoDeModulo[] = [
  {
    id: 'inicio',
    titulo: 'Primeiros passos',
    icone: Rocket,
    paginas: ['entrar', 'menu-e-tela-inicial', 'meu-perfil', 'regras-gerais'],
  },
  {
    id: 'vendas',
    titulo: 'Vendas',
    icone: Handshake,
    permissoes: ['os.gerenciar', 'os.ver_todas'],
    paginas: [
      'o-que-e',
      'registrar',
      'condicao',
      'liberar',
      'acompanhar',
      'resumo',
      'editar',
      'servicos',
      'status',
      'excluir',
      'quem-pode',
    ],
  },
  {
    id: 'execucao',
    titulo: 'Execução nos setores',
    icone: ListChecks,
    paginas: [
      'como-funciona',
      'meus-servicos',
      'painel',
      'detalhe-do-servico',
      'receber',
      'distribuir',
      'tarefas',
      'etapas',
      'alertas',
      'quem-faz',
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    icone: Receipt,
    permissoes: ['financeiro.registrar_cobranca', 'financeiro.ver_valores'],
    paginas: ['como-funciona', 'cobrancas', 'faturar', 'resumo-para-faturar', 'conferencia', 'quem-pode'],
  },
  {
    id: 'cadastros',
    titulo: 'Cadastros',
    icone: Building2,
    paginas: ['clientes', 'contatos', 'catalogo', 'mudar-setor-do-catalogo'],
  },
  {
    id: 'indicadores',
    titulo: 'Indicadores',
    icone: Activity,
    paginas: ['painel-operacional', 'painel-financeiro'],
  },
  {
    id: 'organizacao',
    titulo: 'Organização',
    icone: Network,
    paginas: ['como-funciona', 'setores', 'funcoes', 'permissoes', 'time', 'colocar-pessoa', 'tambem-executa-em'],
  },
  {
    id: 'historico',
    titulo: 'Histórico e avisos',
    icone: History,
    paginas: ['linha-do-tempo', 'emails'],
  },
];
