# Telas, blocos de informação e endpoints

Documento de referência da **frente de definição de telas** (comercial, setores de execução e financeiro). Reúne o que foi discutido com o usuário em 10/10/2026: quem vê o quê, a diferença entre bloco e página, a lista de blocos, as permissões de cada bloco e os endpoints candidatos.

**Legenda de status:**
- **Decidido:** afirmado ou aprovado pelo usuário.
- **Mapeado:** levantado junto com o usuário, sem objeção.
- **Proposta:** sugestão ainda não aprovada.

Contexto completo: ADR 0006 (fluxo de execução) e ADR 0003 (permissões).

**Fora de escopo:** telas de cadastro e configuração (perfil, catálogo, setores, funções, organização) e a OS operacional.

---

## 1. Como a discussão chegou aqui

1. **Pergunta do usuário:** "Vai ter um painel ou uma API dedicada a cada setor? A UX disso eu penso no front-end, ou definimos agora quais telas e quais componentes?"
2. **Resposta, aceita em princípio:**
   - **agora** define-se **o quê**: que informação existe, que ações existem e quem acessa. É isso que define a API;
   - **na implementação do frontend** define-se **o como**: telas, componentes e layout;
   - as listagens atuais (OS, serviços, tarefas) continuam existindo.
3. **Correção do usuário:** a tabela de "visões de trabalho" (minhas tarefas, painel do setor, minhas vendas, visão consolidada) não tinha sido decidida. Ela continua como **proposta** (ADR 0006, seção 8), e foi aberta esta frente para definir as telas.
4. **Dúvida do usuário:** "Com o antigo tipo de usuário eu sabia dizer: o gestor comercial tem acesso a tal painel, o técnico vê os serviços e tarefas dele, o diretor vê tudo. Como defino isso agora, com setores e funções configuráveis?" A resposta está na seção 3.
5. **Primeira lista:** uma lista por telas, separando comercial, execução e financeiro (seção 6, superada).
6. **Correção do usuário, decidida:** aquilo eram **blocos de informação**, praticamente os endpoints, e não páginas. Como agrupá-los em páginas (por exemplo, fila, acompanhamento, equipe e KPIs numa tela só) é decisão do frontend.
7. **A lista foi reescrita como blocos** (seção 4) e considerada mapeada pelo usuário ("a gente já tem bem mapeado isso").

---

## 2. Princípios

| Princípio | Status |
|---|---|
| **Bloco não é página.** O bloco é o que precisa existir e de onde vem o dado. A página é como os blocos são combinados na tela (seções, abas, cards, dashboards com KPIs). | **Decidido** |
| **O backend entrega API por caso de uso; o frontend monta as páginas.** Telas e componentes são definidos na implementação do frontend. | **Decidido** |
| **As listagens atuais continuam** (OS, serviços, tarefas). Os blocos novos são acréscimos. | **Decidido** (confirmado pelo usuário ao perguntar se as listagens continuariam) |
| **Um endpoint por bloco**, para o frontend montar as páginas livremente e cada bloco carregar e atualizar sozinho. | Proposta |
| **A API é desenhada pelo uso, não pela tela:** um endpoint como "fila do setor" e não um endpoint por componente. Assim a interface pode mudar sem mexer no backend. | Proposta |
| **Destaque próprio para a triagem.** É uma tarefa com hora marcada (de manhã, distribuir), enquanto o acompanhamento é consulta ao longo do dia. Mesmo na mesma página, vale um destaque como "X novos para distribuir". | Proposta |
| **Protótipo antes do frontend:** wireframes simples das telas principais, validados com a gestora técnica antes de implementar. | Proposta |

---

## 3. Quem vê o quê: do antigo tipo de usuário às permissões

### 3.1 O raciocínio por perfil continua valendo
- As 10 funções criadas pela migração (Diretor, Gestor Comercial, Comercial, Gestor Técnico, Sub-Gestor Técnico, Técnico, Gestor Financeiro, Financeiro, Gestor Administrativo, Administrativo) **são os antigos tipos de usuário**, com os mesmos nomes e as mesmas permissões.
- Para desenhar telas, continua valendo pensar por perfil, como "o gestor comercial vê o painel de vendas".
- **A diferença é um passo a mais no fim:** cada tela ou bloco declara **qual permissão exige**, e vê a tela quem tem essa permissão, por qualquer função.

```
Antes:  tipo de usuário → telas
Agora:  pessoa → função → permissões → telas
```

### 3.2 Exemplos de tradução (proposta)
| Raciocínio por perfil | Regra da tela/bloco |
|---|---|
| Gestor Comercial e Comercial acessam a lista de vendas | Lista de vendas exige `os.gerenciar` |
| Técnico vê os serviços e tarefas dele | "Meus serviços" não exige permissão: qualquer pessoa vê o que está com ela |
| Gestora técnica vê a fila do setor e distribui | Fila do setor exige `servicos.ver_setor` + `tarefas.distribuir`, e mostra só os setores onde a pessoa tem as duas |
| Financeiro vê cobranças | Cobranças exige `financeiro.registrar_cobranca` |
| Diretor vê tudo | Consequência natural: a função Diretor tem todas as permissões, inclusive `setores.todos` |

### 3.3 Regras
- **Proposta:** o menu do frontend mostra o que as permissões liberam. Hoje já existe algo parecido (`requiresFinancials` em `navigation.ts`), que viraria `requer: '<código da permissão>'`.
- **Proposta:** uma tela ou bloco que não se encaixe em nenhuma permissão existente pede uma **permissão nova**, e nunca um teste pelo nome da função ("é Diretor?").
- **Ganhos:**
  - um setor novo, como Ergonomia, ganha as telas dele só configurando funções;
  - casos fora do padrão, como um comercial que registra cobrança, não exigem mudar código;
  - outra empresa usa os próprios nomes de função.

### 3.4 Tela inicial (proposta)
A tela que cada pessoa vê ao entrar sai de uma regra simples pelas permissões. Exemplo:
- quem distribui em algum setor entra na fila do setor;
- quem só executa entra em "meus serviços";
- quem registra cobrança entra em cobranças;
- quem vende entra na lista de vendas.

A ordem das regras ainda vai ser definida.

---

## 4. Blocos de informação (mapeados)

> **Atualização de 10/10/2026:** os blocos da execução estão implementados em `/api/execucao/` (fase 8) os do comercial em `/api/comercial/` e na lista de OS (fase 9) os do financeiro em `/api/financeiro/` e `/api/analise/financeiro/` (fase 10) e a linha do tempo em `/ordens/{id}/linha-do-tempo/` e `/servicos/{id}/linha-do-tempo/` (fase 11). Os blocos foram detalhados, com permissão e endpoint definitivos, nas fases 8 a 11 de `docs/plano-execucao-comercial-financeiro.md`, a partir das decisões do ADR 0008. Entraram dois blocos novos: **resumo da venda** (comercial) e **linha do tempo** (todos). A tabela abaixo fica como registro do mapeamento.

Em cada bloco, a permissão exigida e o endpoint candidato são **propostas**. Os endpoints marcados como "existe" já estão na API.

### Comercial
| Bloco | O que mostra / faz | Permissão (proposta) | Endpoint (proposta) |
|---|---|---|---|
| Lista de vendas | Todas as OS, com cliente, valor, condições e **a etapa da execução** de cada uma | `os.gerenciar` (valores só com `financeiro.ver_valores`) | existe: `GET /api/ordens-servico/ordens/`; **falta** a etapa da execução, derivada dos serviços |
| Criação e edição da venda | A venda com cliente, condições comerciais e os serviços vendidos | `os.gerenciar` | existe: `POST/PATCH /ordens/` e `/servicos/` |
| Andamento dos serviços de uma OS | Cada serviço da OS: setor, responsável, status e prazo, para responder ao cliente sem perguntar à equipe técnica | `os.gerenciar` ou `os.ver_todas` | existe em parte: `GET /servicos/?ordem_servico=` |
| Resumo da venda | Quem vendeu e quando, condições (`condicao_resumo`), e por serviço: setor, etapa, quem executou e quando (ADR 0008, 6) | quem vê a OS; valores só com `financeiro.ver_valores` | novo: `GET /api/comercial/vendas/{id}/` |
| Linha do tempo | O que aconteceu com a OS e com cada serviço, em eventos legíveis (ADR 0008, 4) | quem vê a OS ou o serviço | novo: `GET /ordens/{id}/linha-do-tempo/` e `/servicos/{id}/linha-do-tempo/` |

### Setor de execução
| Bloco | O que mostra / faz | Permissão (proposta) | Endpoint (proposta) |
|---|---|---|---|
| Fila de triagem | O que chegou ao setor e ainda não foi distribuído (serviços sem tarefa), com cliente, OS e data da venda; opção de agrupar por cliente/OS | `servicos.ver_setor` + `tarefas.distribuir` no setor | novo: `GET /api/execucao/fila/?setor=` |
| Ação de distribuir | Responsável + prazo em um passo (cria a tarefa); "dividir entre técnicos" acrescenta tarefas | `tarefas.distribuir` no setor | novo: `POST /servicos/{id}/distribuir/`; dividir: existe `POST /tarefas/` |
| Em andamento por responsável | O que está em execução, agrupado por pessoa | `servicos.ver_setor` | novo: `GET /api/execucao/andamento/?setor=` |
| Atrasados e sem movimentação | Prazo vencido; alerta de serviço sem movimentação há 7 dias, com "estou ciente" e motivo (ADR 0008, substitui "aguardando" e "parado") | `servicos.ver_setor` | novo: `GET /api/execucao/alertas/?setor=`; ciência: `POST /api/execucao/servicos/{id}/ciencia/` |
| Concluídos no período | O que o setor concluiu entre duas datas | `servicos.ver_setor` | novo: `GET /api/execucao/concluidos/?setor=&de=&ate=` |
| Carga da equipe | Por pessoa: itens ativos por faixa de prazo e idade do que está com ela (sem horas) | `servicos.ver_setor` | novo: `GET /api/execucao/carga/?setor=` |
| Meus serviços | Para quem executa: o que está comigo, o que vence primeiro e o que está atrasado | nenhuma (só o próprio) | novo: `GET /api/execucao/meus-servicos/` |
| Detalhe do serviço | Tarefas, responsáveis, prazo, aguardando, histórico e **os outros serviços da mesma OS** com o status de cada um | quem vê o serviço (regra de visibilidade atual) | existe em parte: `GET /servicos/{id}/`; **falta** a lista dos outros serviços da OS; histórico: existe a auditoria |

### Financeiro
| Bloco | O que mostra / faz | Permissão (proposta) | Endpoint (proposta) |
|---|---|---|---|
| Cobranças | Liberadas e não lançadas, já lançadas e não liberadas, com a condição organizada (ADR 0007) | `financeiro.registrar_cobranca` | existe: `GET /ordens/?liberada=&cobranca_realizada=`; muda com o ADR 0007 |
| Ação de registrar a cobrança ("lançado") | Marca a OS como lançada no outro sistema, com referência e data | `financeiro.registrar_cobranca` | existe: `PATCH /ordens/{id}/cobranca/`; muda com o ADR 0007 |
| Situação financeira de uma OS | Condições, liberação, lançamento e NF/referência | `financeiro.ver_valores` | existe: `GET /ordens/{id}/` |
| Indicadores financeiros | KPIs | `financeiro.ver_valores` | existe: `GET /api/analise/financeiro/` |

---

## 5. Páginas atuais do frontend (ponto de partida)

Rotas em `src/app/routes.tsx`, na branch `epic/v3` do frontend:

| Área | Rotas |
|---|---|
| Ordens de serviço | `/ordens` (lista), `/ordens/new` e `/ordens/:id/edit` (formulário), `/ordens/:id` (detalhe) |
| Cobranças | `/cobrancas` |
| Análise | `/analise/operacional`, `/analise/financeiro` |
| Clientes | `/clientes`, `/clientes/contacts` e formulários |
| Catálogo | `/catalogo` (modal de edição) |
| Time e organização | `/time`, `/time/eu`, `/organizacao/setores`, `/organizacao/funcoes`, `/organizacao/dados` |

Ainda não existem páginas para os blocos de execução (fila, andamento, alertas, carga, meus serviços).

---

## 6. Primeira lista, por telas (superada)

Registrada só como histórico. Foi substituída pelos blocos (seção 4) porque misturava bloco com página.
- **Comercial:** lista de vendas; nova/editar OS; detalhe da OS (visão comercial).
- **Execução:** fila do setor; acompanhamento do setor; equipe do setor; meus serviços; detalhe do serviço.
- **Financeiro:** cobranças; detalhe da OS (visão financeira); indicadores financeiros.

---

## 7. Próximos passos da frente de telas (proposta)

1. Personas = as 10 funções atuais. Começar pela **gestora técnica**, que trouxe a dor, e depois o **técnico**.
2. Por persona: o que precisa ver e fazer no dia, e com que frequência.
3. Definir a regra da tela inicial (seção 3.4).
4. Agrupar os blocos em páginas e fazer os wireframes das páginas principais. Validar com a gestora.
5. Depois disso, implementar no backend os endpoints novos da seção 4 e, no frontend, as páginas.

## 8. Dependências de outras decisões
- **Aguardando e parado:** aceitos (ADR 0006), implementação pendente.
- **Faixas de prazo e histórico de replanejamento:** proposta (ADR 0006).
- **Remoção de horas e complexidade de serviço e tarefa:** aceita, pendente (ADR 0005).
- **Mudanças na OS para o faturamento:** implementadas na camada de dados (ADR 0007); faltam os blocos e telas.
