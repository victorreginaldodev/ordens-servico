# ADR 0006: Fluxo de execução nos setores

## Status
Aceito (10/10/2026), com a seção 6 substituída pelo ADR 0008. O prazo do serviço calculado (5.1) está implementado; os endpoints estão na fase 8 de `docs/plano-execucao-comercial-financeiro.md`.

| Seção | Situação |
|---|---|
| 1. Fluxo de execução | Aceita |
| 2. O que cada setor executa | Aceita (decorre do ADR 0004) |
| 3. Agregação: unidade de trabalho é o serviço | **Aceita** pelo usuário |
| 4. Distribuição em um passo | **Aceita** pelo usuário |
| 5. Prazos | Prazo definido na distribuição, sem catálogo e sem estimativa: **aceito**. Faixas, alerta de "sem prazo" e histórico de replanejamento: **proposta, a confirmar** |
| 6. "Aguardando" e trabalho parado | **Substituída** pelo ADR 0008, seção 3: alerta de serviço sem movimentação com "estou ciente" |
| 7. Carga por pessoa | **Aceita** pelo usuário |
| 8. Quem organiza o setor e o que cada pessoa vê | Quem organiza: **decidido** pelas permissões, valendo para qualquer setor novo (ADR 0008, seção 1). O que cada pessoa vê: blocos e permissões no plano de execução; páginas no frontend |
| 9. Aviso de chegada por e-mail | **Decidido** (ADR 0008, seção 5): serviços enviados junto na criação da OS e um e-mail por setor |
| 10. Blocos de informação | Lista de blocos **mapeada com o usuário**. A composição em páginas é decidida no frontend. "Um endpoint por bloco" e o acesso às telas por permissão: **proposta, a confirmar** |

## Contexto

### O problema
A gestora da área técnica relatou falta de organização e de controle no dia a dia. Os pontos principais foram:
- não saber o que acabou de chegar;
- não saber o que está em andamento, nem com quem;
- não ter o status de conclusão do que foi distribuído.

O "painel do setor" foi uma solução pensada de antemão. O problema real é mais amplo: **o sistema cobre bem a venda (criação da OS pelo Comercial), mas não enxerga a execução como um fluxo.** Falta mostrar a cada pessoa a informação que importa para ela, de acordo com o setor e com o que ela pode fazer. Também falta responder, para qualquer setor de execução, atual ou futuro: o que esse setor tem para executar, como isso é distribuído e como está andando.

O modelo de dados pode não estar no nível ideal para isso, e esse trabalho virá algum dia. Esta decisão trata primeiro da **experiência de uso e da forma de exibir os dados**, aproveitando a reorganização de setores, funções e permissões (ADR 0003).

### Respostas da gestão (10/10/2026, repassadas pelo usuário)
1. **O que ela faz quando chega uma OS:** provavelmente a triagem, isto é, distribuir entre os técnicos o que cada um vai fazer dentro do serviço. Pode haver agendamento e contato com o cliente; se houver algo além da triagem, fica como ideia de funcionalidade futura, a ser confirmada com ela.
2. **Distribuição:** na maioria das vezes um serviço pertence a um técnico, mas há serviços distribuídos para mais de um. É preciso avaliar se a forma atual de gerenciar isso é a mais eficiente para o controle do setor.
3. **Bloqueios ("aguardando"):** provavelmente útil. A prioridade é **agilidade**: quem executa ou faz qualquer ação no sistema não pode perder tempo. Registrar "aguardando" deve ser no mínimo **opcional**, e a equipe escolhe se usa. O usuário pediu avaliação crítica.
4. **Conclusão:** hoje o sistema não acompanha a entrega do laudo ao cliente. O serviço está concluído quando todas as tarefas estão concluídas. A entrega ao cliente pode virar funcionalidade futura.
5. **Prazos:** ao distribuir as tarefas, ela gosta de definir o prazo final de cada uma. O sistema deve oferecer controle de prazo de nível profissional, **sem colocar nada disso no catálogo** e **sem estimativa automática**. A duração depende do tipo de serviço, do cliente e da tarefa, com fatores externos que fazem um serviço levar X ou 2X dias (ADR 0005).
6. **Carga por pessoa:** sem definição; o usuário pediu uma sugestão baseada no domínio.
7. **Frequência:** provavelmente todo dia de manhã, ou à tarde. É o período em que ela distribui as tarefas do setor.
8. **Como ela fica sabendo de uma OS nova:** hoje vai pessoalmente ao Comercial conversar. Não dá para impedir essa conversa, mas o sistema pode avisá-la por e-mail.
9. **Ponto levantado pelo usuário:** a OS entra com as condições comerciais e vários serviços agregados, e hoje a gestora recebe todos os serviços dentro da OS e distribui tarefas dentro deles. **Faz sentido manter essa agregação para a execução, ou ela é só conveniência comercial?** Qualquer que seja a evolução dos outros módulos, os serviços vão chegar aos setores de execução mais ou menos desse jeito, então isso precisa ser bem resolvido.

### O que os dados mostram (banco de dev, 10/10/2026)
| Medida | Valor |
|---|---|
| OS / serviços / tarefas | 634 / 1.527 / 1.538 |
| Serviços por OS | 279 OS com 1 serviço, 120 com 2, 56 com 4, 106 com 5 (pacotes) |
| Responsáveis distintos por serviço | 1.416 com 1 (93%), 46 com 2, 2 com 3, 63 sem nenhum |
| Tarefas por serviço | 1.395 com 1, 65 com 2, 3 com 3, 1 com 4 |
| Prazo preenchido | 18 tarefas, nenhum serviço, nenhuma OS; as 18 estão vencidas |
| Serviços sem tarefa (fila invisível) | 63 |
| Duração das tarefas concluídas | metade em até 3 dias; 10% acima de 39 dias |
| Tarefas abertas por pessoa | uma pessoa com 75; as seguintes com 28, 28, 25, 21 |
| Tarefas com horas estimadas | 2 |

Leitura:
- **"Uma pessoa faz o serviço inteiro" é a regra.** A camada de tarefas virou um passo burocrático no caso comum.
- **Prazo não faz parte do fluxo hoje**, então "atrasado" não pode ser calculado para quase nada.
- **Existe uma fila que ninguém vê:** os serviços sem tarefa.
- **A cauda longa da duração** sugere trabalho parado esperando algo.
- **A concentração de 75 tarefas** pode ser carga real ou tarefas nunca fechadas; o indicador de idade vai mostrar qual dos dois.

### Referências externas
Ferramentas maduras de gestão de execução separam o **pedido agrupado** da **unidade de trabalho**:
- **ServiceNow:** um *Request* contém vários *Requested Items*; quem executa trabalha nas *Catalog Tasks* de cada item, e o pedido fecha quando todos os itens fecham.
- **Salesforce Field Service:** a *Work Order* guarda o trabalho, e quem distribui trabalha nos *Service Appointments* abaixo dela.
- **Kanban:** a carga por pessoa costuma ser acompanhada pela contagem de itens ativos e pela **idade** de cada item (*aging WIP*), para ver o que está parado e com quem.

Fontes: [ServiceNow — request, requested item e task](https://www.servicenow.com/community/servicenow-ai-platform-forum/what-is-the-relation-between-request-request-item-and-task-when/td-p/1121622), [ServiceNow — Request Management architecture](https://www.servicenow.com/docs/r/Recj91eIo1YnsOabQjgskg/i4OIcnMnQ8ixda9LLc9HFA), [Salesforce Field Service — guia de implementação](https://www.salesforce.com/in/blog/salesforce-field-service-implementation-guide/), [Salesforce Field Service — objetos principais](https://developer.salesforce.com/docs/atlas.en-us.222.0.field_service_dev.meta/field_service_dev/fsl_dev_soap_core.htm), [KanbanZone — aging work in progress](https://kanbanzone.com/2019/aging-work-in-progress/), [Businessmap — WIP](https://businessmap.io/kanban-resources/getting-started/what-is-wip), [ProKanban — managing WIP](https://prokanban.org/kanban-playbook/managing-wip-volume).

## Decisão

### 1. O fluxo de execução de um serviço
```
Chegou  →  Distribuído  →  Em execução  →  Concluído
(vendido,   (tarefas com    (alguém já       (todas as tarefas
 sem dono)   responsável)    começou)         concluídas)
```
- As perguntas da gestão são perguntas sobre esse fluxo: o que chegou, o que está em andamento e com quem, o que está atrasado e o que foi concluído.
- Hoje o status "aberto" do serviço mistura "chegou e ninguém olhou" com "distribuído, mas ninguém começou". As visões de trabalho precisam separar as duas situações. Hoje a separação pode ser derivada: o serviço tem ou não tem tarefas.
- **Concluído** = todas as tarefas concluídas. A entrega ao cliente não faz parte do fluxo por enquanto.

### 2. O que cada setor executa
- Um setor executa os serviços cujo catálogo tem ele como responsável (ADR 0004).
- Um setor de execução novo passa a ter fila assim que receber catálogos, sem mudar código.

### 3. Agregação: a OS continua, mas a unidade de trabalho do setor é o serviço
- **A OS tem papéis legítimos:** é a venda e a base do faturamento, é o contexto do cliente e define quando tudo terminou. Não é só conveniência comercial.
- **Para quem executa, a unidade de trabalho é o serviço.** Uma OS pode envolver setores, ritmos e pessoas diferentes.
- **Meio-termo adotado:**
  - **Fila do setor centrada no serviço.** Cada item é um serviço do setor, com cliente, número da OS, data da venda e prazo como contexto.
  - **Agrupar por cliente ou por OS é uma opção da tela, não estrutura.** Na triagem, ver que "chegaram 4 serviços da empresa X" ajuda a decidir, por exemplo, entregar PGR e LTCAT ao mesmo técnico.
  - **No detalhe do serviço aparecem os outros serviços da mesma OS, com o status de cada um.** Em SST há dependências reais: o inventário de riscos do PGR alimenta o PCMSO e o LTCAT. Quem executa um precisa saber como o outro está, mesmo que seja de outro setor.
  - **A OS continua sendo a visão do Comercial e do Financeiro,** com o status derivado dos serviços.
- O modelo de dados não muda; muda por onde cada setor entra.

### 4. Distribuição em um passo
- **Distribuir é um passo só:** na fila, quem organiza escolhe o responsável e o prazo. Por trás, o sistema cria uma tarefa única para o serviço inteiro.
- **"Dividir entre técnicos"** é uma opção para os casos de mais de um responsável (3% hoje), acrescentando tarefas.
- **A tarefa continua existindo no modelo,** mas fica escondida no caso comum.
- **Alternativa rejeitada por ora:** criar um "responsável do serviço" separado das tarefas. Duplicaria o conceito de responsável sem resolver uma dor relatada. Pode ser revista na remodelagem futura.

### 5. Prazos
> O prazo na distribuição, sem catálogo e sem estimativa automática, está aceito. Os itens 2 e 3 abaixo são proposta a confirmar.

1. **O prazo é informado na distribuição,** junto com o responsável, que é quando a gestão planeja.
   - O prazo fica na tarefa; o do serviço é a maior data entre as tarefas.
   - Deixar sem prazo é permitido, mas aparece como alerta.
2. **Faixas de prazo em vez de datas soltas:** atrasado, vence hoje, vence nesta semana, depois e sem prazo.
3. **Histórico de replanejamento:** mostrar quantas vezes o prazo foi alterado e qual era o original. É o que separa controle de prazo de uma data empurrada. A auditoria já registra as alterações.
4. **Sem prazo no catálogo e sem estimativa automática** (ADR 0005).
5. **Futuro:** separar o prazo combinado com o cliente na venda do prazo interno, com aviso quando o interno passar do combinado.

### 6. "Aguardando" e trabalho parado (avaliação crítica)
Um status novo foi rejeitado: complicaria o controle de status de um clique e o cálculo do status do serviço e da OS. Foram adotados dois mecanismos complementares:
1. **"Parado há N dias", automático.** O sistema calcula há quanto tempo a tarefa não muda. Não exige nada de ninguém e pega o que foi esquecido.
2. **Marcação opcional "aguardando".**
   - É um clique, com um motivo de uma lista curta: cliente, documentação, agendamento, terceiro, outro.
   - É uma marcação, não um status.
   - Sai sozinha quando a tarefa volta a andar.
   - Explica o "parado": "aguardando cliente há 12 dias" é diferente de "parado há 12 dias".
   - Quem não usa não perde nada. **Não congela o prazo**, para o atraso continuar visível.

### 7. Carga por pessoa
Só com prazo e datas, sem horas nem complexidade (ADR 0005):
- **Itens ativos por pessoa**, sem contar os marcados como aguardando, divididos por faixa de prazo: atrasados, vencem nos próximos 7 dias e sem prazo.
- **Idade do que está com cada pessoa:** há quanto tempo cada item está com ela e há quanto tempo está parado.
- **Sem limite fixo de itens por pessoa por enquanto;** pode virar configuração do setor no futuro.

### 8. Quem organiza o setor e o que cada pessoa vê
> Ver também `docs/telas-blocos-e-endpoints.md`, seção 3.

> **Proposta, não decidida (10/10/2026).** Registrada como ponto de partida para a frente de definição de telas. Nada aqui deve ser implementado antes dessa definição.

- **"Gestor do setor" não é um campo.** O sistema sabe quem organiza cada setor pelas permissões: quem tem `tarefas.distribuir` e `servicos.ver_setor` no setor X organiza o setor X, seja qual for o nome da função.
- **O que cada pessoa vê é montado pelas permissões, não pelo nome do cargo:**

| Quem tem | Visão de trabalho |
|---|---|
| Tarefas atribuídas (executor) | **Minhas tarefas:** o que fazer, o que está atrasado, o que vem a seguir |
| `servicos.ver_setor` + `tarefas.distribuir` no setor (organizador) | **Painel do setor:** fila do que chegou para triagem, carga por pessoa, atrasados e concluídos no período |
| `os.gerenciar` (comercial) | **Minhas vendas:** em que etapa da execução está cada OS vendida |
| `setores.todos` (diretoria) | **Visão consolidada** de todos os setores |

- Uma pessoa pode ter mais de uma visão. Um gestor que também executa vê a fila do setor e as próprias tarefas.
- Uma função nova com essas permissões (ex.: "Coordenador de Ergonomia") ganha a visão correspondente automaticamente.

### 9. Aviso de chegada
- **E-mail para quem organiza o setor:** quem tem `tarefas.distribuir` no setor recebe um e-mail quando uma OS traz serviços para ele, com um e-mail por setor listando esses serviços. Não substitui a conversa com o Comercial, mas garante que ela saiba.
- **No painel, "novos desde a sua última triagem".**
- **Resumo diário por e-mail pela manhã:** combina com a rotina, mas exige agendador de tarefas, que o sistema não tem. Fica para o futuro.

### 10. Blocos de informação (comercial, execução e financeiro)
> **Documento de referência completo:** `docs/telas-blocos-e-endpoints.md`. Reúne a discussão sobre telas, quem vê o quê, blocos, permissões e endpoints candidatos.

Mapeados em 10/10/2026, deixando de fora telas de configuração e cadastro (perfil, catálogo, setores, organização).

**Distinção importante, feita pelo usuário:** isto é uma lista de **blocos de informação**, não de páginas.
- **Bloco:** o que precisa existir e de onde vem o dado. Define o backend: em geral, um bloco é um endpoint.
- **Página:** como os blocos são combinados na tela (seções, abas, cards, dashboards com KPIs). É decisão de UI, tomada na implementação do frontend. Por exemplo, fila, acompanhamento e carga da equipe podem estar numa página só, o painel do setor.

**Comercial**
- Lista de vendas (OS), com a etapa da execução de cada uma
- Criação e edição da venda
- Andamento dos serviços de uma OS

**Setor de execução**
- Fila de triagem (o que chegou e ainda não foi distribuído)
- Ação de distribuir (responsável e prazo)
- Em andamento por responsável
- Atrasados, aguardando e parados
- Concluídos no período
- Carga da equipe
- Meus serviços (de quem executa)
- Detalhe do serviço

**Financeiro**
- Cobranças: liberadas, cobradas e não liberadas
- Ação de registrar a cobrança
- Situação financeira de uma OS
- Indicadores financeiros

**Recomendações (proposta, a confirmar):**
- **Um endpoint por bloco** no backend, para o frontend montar as páginas livremente e cada bloco carregar e atualizar sozinho.
- **Destaque próprio para a triagem.** Triagem é uma tarefa com hora marcada (de manhã, distribuir); o acompanhamento é consulta ao longo do dia. Mesmo na mesma página, vale um destaque como "X novos para distribuir".
- **Acesso às telas por permissão.** Com o fim do `tipo_usuario`, o raciocínio por perfil continua valendo para desenhar: as 10 funções iniciais são os antigos tipos, com os mesmos nomes e permissões. O caminho passa a ser pessoa → função → permissões → telas: cada tela ou bloco declara a permissão que exige, e o menu do frontend mostra o que as permissões liberam (como o `requiresFinancials` atual).
  - Exemplos: lista de vendas exige `os.gerenciar`; fila do setor exige `servicos.ver_setor` + `tarefas.distribuir`, só nos setores onde a pessoa os tem; cobranças exige `financeiro.registrar_cobranca`; "meus serviços" não exige permissão.
  - Uma tela que não se encaixe em nenhuma permissão existente pede uma permissão nova, e nunca um teste pelo nome da função.
  - Ganhos: um setor novo ganha suas telas só configurando funções; casos fora do padrão (ex.: um comercial que registra cobrança) não exigem mudar código; outra empresa usa os próprios nomes de função.

## Ideias para levantar com a gestão (backlog, não decidido)
- Agendamento e contato com o cliente como parte da triagem.
- Entrega do laudo ao cliente como etapa após a conclusão.
- Prazo combinado com o cliente registrado na venda.
- Limite de itens em andamento por pessoa.
- Resumo diário por e-mail.
- Rever, na remodelagem futura, se o serviço deve ter um responsável principal além das tarefas.

## Consequências
- As listagens atuais (OS, serviços, tarefas) continuam existindo. Quais visões de trabalho haverá, e portanto quais endpoints dedicados, depende da frente de definição de telas (seção 8).
- A distribuição em um passo, a marcação "aguardando", o "parado há N dias" e o histórico de replanejamento exigem pequenas extensões no backend:
  - um endpoint de distribuição;
  - a marcação e o motivo de aguardando na tarefa;
  - o cálculo de idade e de replanejamento.
- O aviso por e-mail depende de religar as notificações por setor, hoje desligadas por configuração.
- Os indicadores existentes de produtividade que usam horas e complexidade serão substituídos pelos baseados em prazo (ADR 0005).
