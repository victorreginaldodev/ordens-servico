import {
  Timer,
  Mail,
  Receipt,
  PieChart,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface EV2Highlight {
  title: string;
  detail: string;
}

export interface EV2Feature {
  id: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  badge: string;
  badgeColor: string;
  title: string;
  summary: string;
  description: string;
  highlights: EV2Highlight[];
  videoUrl?: string;
}

export const ev2Features: EV2Feature[] = [
  {
    id: 'planejamento',
    icon: Timer,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    badge: 'Novo',
    badgeColor: 'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950',
    title: 'Planejamento em serviços e tarefas',
    summary: 'Agora dá pra organizar prioridade, prazo e tempo estimado em cada serviço e em cada tarefa — não só na Ordem de Serviço.',
    description:
      'Antes, só a Ordem de Serviço tinha prioridade. Agora cada serviço e cada tarefa dentro dela também podem ter sua própria prioridade, seu próprio prazo e uma estimativa de quanto tempo devem levar. Isso ajuda o time a enxergar rapidinho o que precisa de atenção primeiro e a organizar melhor o dia a dia, sem precisar ficar checando tudo manualmente.',
    highlights: [
      {
        title: 'Prioridade por serviço e por tarefa',
        detail: 'Cada serviço e cada tarefa podem ser marcados como Baixa, Média ou Alta prioridade, independente da OS inteira.',
      },
      {
        title: 'Prazo próprio para cada item',
        detail: 'Dá pra definir até quando um serviço ou uma tarefa específica deve ser concluída, e acompanhar o que está vencendo.',
      },
      {
        title: 'Tempo estimado',
        detail: 'É possível informar quantas horas um serviço ou tarefa deve levar, ajudando a planejar a carga de trabalho do time.',
      },
      {
        title: 'Catálogo já vem com sugestão pronta',
        detail: 'Serviços cadastrados a partir do catálogo já puxam automaticamente uma estimativa de horas e complexidade, sem precisar preencher tudo de novo.',
      },
    ],
  },
  {
    id: 'notificacoes-email',
    icon: Mail,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-500/10',
    badge: 'E-mail',
    badgeColor: 'text-sky-600 border-sky-200 bg-sky-50 dark:text-sky-400 dark:border-sky-800 dark:bg-sky-950',
    title: 'Avisos automáticos por e-mail',
    summary: 'Agora o sistema te avisa por e-mail quando acontece algo importante, sem precisar ficar checando a todo momento.',
    description:
      'Algumas ações do dia a dia passaram a disparar um e-mail automático para as pessoas certas. A ideia é simples: quem precisa saber de algo, fica sabendo na hora, direto na caixa de entrada, sem depender de alguém lembrar de avisar.',
    highlights: [
      {
        title: 'Contrato novo',
        detail: 'Quando uma OS é criada como contrato, todo mundo é avisado por e-mail. Quem pode ver valores recebe com os valores; quem não pode, recebe sem eles.',
      },
      {
        title: 'Tarefa atribuída a você',
        detail: 'Se uma tarefa é criada pra você ou transferida pra você, você recebe um e-mail avisando.',
      },
      {
        title: 'Cobrança liberada',
        detail: 'Financeiro é avisado por e-mail assim que uma OS ou OS Operacional fica pronta para cobrança.',
      },
      {
        title: 'Cobrança realizada',
        detail: 'Financeiro e Comercial recebem um e-mail quando a cobrança de uma OS é efetivamente concluída.',
      },
    ],
  },
  {
    id: 'cobranca-nome',
    icon: Receipt,
    iconColor: 'text-fuchsia-500',
    iconBg: 'bg-fuchsia-500/10',
    badge: 'Ajuste',
    badgeColor: 'text-fuchsia-600 border-fuchsia-200 bg-fuchsia-50 dark:text-fuchsia-400 dark:border-fuchsia-800 dark:bg-fuchsia-950',
    title: '"Cobrança" no lugar de "Faturamento"',
    summary: 'Padronizamos o nome em todo o sistema: o que era chamado de Faturamento agora se chama Cobrança.',
    description:
      'É a mesma coisa de sempre, só que com um nome mais direto e consistente em todas as telas, filtros e relatórios. Além disso, agora também é possível registrar a data que foi combinada com o cliente para a cobrança acontecer.',
    highlights: [
      {
        title: 'Nome mais claro em todo o sistema',
        detail: 'Onde antes aparecia "Faturamento", agora aparece "Cobrança" — em telas, filtros e históricos.',
      },
      {
        title: 'Data combinada de cobrança',
        detail: 'Novo campo para registrar a data que ficou acertada com o cliente para a cobrança ser feita.',
      },
    ],
  },
  {
    id: 'indicadores-organizados',
    icon: PieChart,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-500/10',
    badge: 'Analytics',
    badgeColor: 'text-indigo-600 border-indigo-200 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950',
    title: 'Indicadores mais completos e organizados',
    summary: 'Os painéis de indicadores agora são divididos por assunto, e ganharam números novos.',
    description:
      'Os indicadores do sistema foram reorganizados em dois painéis separados: um operacional, que qualquer pessoa logada pode ver, e um financeiro, com acesso restrito a quem tem permissão para valores. Junto com essa organização, chegaram indicadores novos que antes não existiam.',
    highlights: [
      {
        title: 'Painel Operacional para todo mundo',
        detail: 'Mostra o andamento de OS, serviços, tarefas e prazos, sem nenhum valor financeiro — disponível para qualquer perfil.',
      },
      {
        title: 'Painel Financeiro restrito',
        detail: 'Valores, ticket médio e ranking de clientes ficam visíveis só para quem tem permissão de ver informações financeiras.',
      },
      {
        title: 'Técnico vê a própria produtividade',
        detail: 'Cada técnico enxerga os números da própria atuação, sem misturar com os dados do restante do time.',
      },
      {
        title: 'Números novos',
        detail: 'Tempo médio das OS Operacionais, percentual de prazos cumpridos, percentual de cancelamento e ticket médio por OS.',
      },
    ],
  },
];
