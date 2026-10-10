# ADR 0008: Acompanhamento da execução, linha do tempo, visão comercial e controle financeiro

## Status
Aceito (10/10/2026), na discussão sobre as views. Cada item diz o que o usuário **decidiu** e o que foi **modelagem do agente**. A modelagem do alerta (seção 3), incluindo o alerta no serviço e quem pode dar ciência, foi **aprovada pelo usuário** em 10/10/2026. As demais modelagens seguem como proposta até a implementação da fase correspondente.

| # | Tema | Situação |
|---|---|---|
| 1 | Setor novo funciona sem mudar código | **Decidido** |
| 2 | Só quem pertence ao setor recebe tarefas dele | **Decidido** |
| 3 | Alerta de serviço sem movimentação, com "estou ciente" | **Decidido** (conceito e modelagem) |
| 4 | Linha do tempo por OS e por serviço | **Decidido** (necessidade); modelagem proposta |
| 5 | Serviços enviados junto na criação da OS e um aviso por setor | **Decidido** |
| 6 | Resumo da condição e resumo completo da venda para o Comercial | **Decidido** |
| 7 | Valor mensal no recorrente | **Decidido** |
| 8 | Quem não vê valores (Administrativo) | **Decidido:** fica como está |
| 9 | Controle total do financeiro | **Decidido** (requisito); blocos propostos |

Substitui a seção 6 do ADR 0006 ("aguardando" e "parado") e completa as seções 8, 9 e 10 do ADR 0006 e o ADR 0007.

## Decisões

### 1. Setor novo funciona sem mudar código
**Decidido:** quando um setor novo é criado, ele precisa seguir o mesmo fluxo dos outros sem que ninguém mexa no código: receber serviços pelo catálogo, ter quem organiza pelas permissões e conseguir tocar o trabalho.

Como isso fica garantido:
- **Já é assim hoje:**
  - o setor do serviço vem do catálogo (ADR 0004);
  - as regras verificam permissões no setor do serviço, nunca o nome do setor (ADR 0003);
  - a diretoria (`setores.todos`) consegue distribuir em qualquer setor.
- **Implementado (fase 7):** o setor diz na API se tem quem o organize:
  - `organizadores`: pessoas com `servicos.ver_setor` + `tarefas.distribuir` nele;
  - `sem_organizador: true` quando ninguém tem essas permissões.
- **Implementado:** ao apontar um catálogo para um setor sem organizador, a API **aceita, mas avisa** na resposta (`avisos`). Não bloqueia, para não travar o cadastro enquanto as funções são montadas.
- **Organizadores são membros do setor:** a diretoria age em todos os setores por `setores.todos`, mas não conta como organizadora. Assim ela não recebe o aviso de chegada de todos os setores, e um setor que só a diretoria consegue tocar aparece como sem organizador.
- **Teste obrigatório (implementado na fase 7):** um teste cria um setor novo, uma função com as permissões de organização, um catálogo e uma venda, e percorre o fluxo inteiro: fila → distribuição → execução → conclusão → liberação. Se alguém amarrar código a um setor, esse teste quebra.

### 2. Só quem pertence ao setor recebe tarefas dele
**Decidido.** O responsável de uma tarefa precisa ter vínculo ativo no setor do serviço.
- Vale em todos os caminhos: distribuição, criação e reatribuição de tarefa.
- **Diretoria:** distribui em qualquer setor, mas só para membros daquele setor.
- **Tarefas antigas** com responsável de fora do setor continuam válidas; a regra vale para atribuições novas.
- **Serviço sem setor** (legado, sem catálogo): a regra não se aplica.

### 3. Alerta de serviço sem movimentação, com "estou ciente"
**Decidido (conceito):**
- o sistema **não marca serviço como "parado"** sozinho. A pessoa pode estar esperando algo, e um rótulo automático seria injusto;
- o sistema mostra um **alerta**: "sem movimentação há N dias. Está tudo bem?";
- quem acompanha o serviço pode clicar em **"estou ciente, deixar assim"**, opcionalmente com o motivo.

**Modelagem (aprovada pelo usuário; dados implementados na fase 6):**
- **Unidade:** o serviço, que é a unidade de trabalho do setor.
- **Movimentação:** `Servico.ultima_movimentacao_em`, atualizada pelo sistema quando:
  - o serviço é criado (chegou ao setor);
  - uma tarefa é criada ou excluída;
  - muda o status, o responsável ou o prazo de uma tarefa.

  Corrigir a descrição não conta como movimentação.
- **Alerta:** serviço aberto ou em andamento cuja última referência tem **7 dias ou mais** (`DIAS_ALERTA_SEM_MOVIMENTACAO`, configuração do sistema). A referência é a mais recente entre a última movimentação e a última ciência.
- **Ciência ("estou ciente"):**
  - campos `alerta_ciente_em`, `alerta_ciente_por`, `alerta_ciente_motivo` e `alerta_ciente_observacao`, todos opcionais exceto a data e a pessoa;
  - motivos: `cliente`, `documentacao`, `agendamento`, `terceiro` e `outro`;
  - a ciência silencia o alerta por mais 7 dias. Se nada acontecer, o alerta volta;
  - o motivo só aparece como vigente enquanto não houver movimentação depois da ciência.
- **Quem pode dar ciência:** um responsável por tarefa do serviço, ou quem tem `servicos.ver_setor` no setor (aprovado). Entra na fase 8, com o endpoint.
- **Prazo continua contando:** a ciência não congela o prazo; o atraso continua visível.
- **Substitui** a marcação "aguardando" na tarefa e o "parado há N dias" automático do ADR 0006, seção 6.
- **Histórico:** cada ciência fica na auditoria e aparece na linha do tempo.

### 4. Linha do tempo
**Decidido (necessidade):** hoje a visão do Comercial é só a lista de OS. Comercial, diretoria, financeiro e setores técnicos precisam ver **o que aconteceu e o que está acontecendo** com uma venda e com cada serviço.

**Modelagem (implementada na fase 11; definições da implementação no plano):**
- **Duas linhas do tempo:**
  - **da OS:** a venda inteira, com os eventos da OS e de todos os serviços dela;
  - **do serviço:** só aquele serviço e suas tarefas.
- **Fonte dos dados:** a auditoria, que já registra criação, alterações, status, liberação e cobrança de OS, serviços e tarefas. Não se cria uma tabela nova; a linha do tempo **traduz** os registros em eventos legíveis.
- **Eventos (exemplos):**
  - Venda registrada por Fulano em 10/10;
  - PGR chegou à Segurança do Trabalho;
  - Distribuído para Beltrano, prazo 30/10;
  - Beltrano iniciou;
  - Sem movimentação há 9 dias — Beltrano está ciente (aguardando cliente);
  - PGR concluído por Beltrano;
  - OS liberada para o financeiro;
  - Lançada por Ciclana (ref. 4567).
- **Visibilidade:**
  - vê a linha do tempo quem vê a OS ou o serviço (regras de visibilidade atuais);
  - eventos com valores e condições de pagamento só aparecem para quem tem `financeiro.ver_valores`.
- **Formato:** cada evento tem `quando`, `quem` (nome completo), `tipo`, `texto` e as referências (OS, serviço e tarefa). O frontend escolhe como desenhar.

### 5. Serviços enviados junto na criação da OS e um aviso por setor
**Decidido:**
- a criação da OS aceita os serviços vendidos na mesma requisição, numa transação só;
- ao final, **um e-mail por setor** vai para quem tem `tarefas.distribuir` naquele setor, listando os serviços que chegaram;
- um serviço acrescentado depois a uma OS existente avisa só o setor dele;
- o endpoint de serviços avulsos continua existindo para edição.

### 6. Resumo para o Comercial
**Decidido:**
- **`condicao_resumo`:** texto pronto da condição. Exemplos:
  - "Parcelado em 6x a cada 30 dias, 1º vencimento 10/08/2026";
  - "Recorrente: 24 meses de R$ 1.500,00, fecha dia 25, vence dia 15";
  - "À vista, 1º vencimento 10/11/2026".

  É o mesmo texto no comercial, no financeiro e nos e-mails.
- **Resumo da venda:** o Comercial precisa ver, de forma estruturada:
  - quem vendeu e quando;
  - as condições comerciais;
  - por serviço: para que setor foi, a etapa, quem executou e quando (início e término), e o prazo;
  - os serviços concluídos, com quem concluiu.
- **Lista de vendas:** cada OS mostra o andamento ("2 de 4 concluídos") e a etapa.

### 7. Valor mensal no recorrente
**Decidido:** novo campo `valor_mensal`.
- No recorrente, `valor_mensal` é obrigatório e `quantidade_parcelas` é o número de meses.
- O `valor` continua sendo o valor total da venda.
- O sistema **não calcula** um a partir do outro, porque o comercial pode ter negociado arredondamentos. *Proposta:* o resumo mostra os dois.

### 8. Quem não vê valores
**Decidido:** fica como está. O Administrativo informa as condições ao criar a OS e não as vê depois. O usuário vai rever as permissões do Administrativo pela configuração das funções.

### 9. Controle total do financeiro
**Decidido (requisito):** o financeiro precisa de **controle total** sobre o que está acontecendo e sobre o que precisa para faturar.

"Faturar", no vocabulário do usuário, é **dar o OK no sistema (o lançamento) e lançar no sistema financeiro externo**.

Blocos (implementados na fase 10; detalhes e definições da implementação no plano):

**Cobranças:** um endpoint com as três situações, contadores e filtros.

| Situação | O que é | Ordem |
|---|---|---|
| A faturar | liberada e ainda não lançada (a fila do financeiro) | mais antigas primeiro |
| Faturadas | já lançadas | mais recentes primeiro |
| Previsão | ainda não liberadas | pela etapa da execução |

**Cada linha mostra:**
- cliente, OS, data da venda e quem vendeu;
- valor e valor mensal;
- `condicao_resumo`, primeiro vencimento e forma de pagamento;
- contato para envio da NF;
- liberação: quando, por quem e por quê (na venda ou na conclusão);
- lançamento: referência, data e quem lançou;
- na previsão: o andamento da execução ("3 de 4 serviços concluídos").

**Alerta:** liberada há N dias sem lançamento (proposta: 3 dias).

**Situação financeira de uma OS:** tudo da linha acima, mais a linha do tempo financeira (liberação e lançamento).

**Indicadores:**
- a faturar, faturado e em previsão;
- separação por tipo de condição;
- receita recorrente mensal: a soma do `valor_mensal` dos recorrentes ativos.

**Ação de faturar:** é a que já existe (`PATCH /ordens/{id}/cobranca/`), com referência e data.

## Alternativas consideradas
- **"Parado" automático:** rejeitado pelo usuário; marcaria como parado quem está esperando algo legítimo.
- **Marcação "aguardando" na tarefa (ADR 0006, seção 6):** substituída pela ciência do alerta no serviço, que cobre o mesmo caso ("estou esperando o cliente") com um clique só e no nível em que o setor acompanha.
- **Tabela própria de eventos para a linha do tempo:** desnecessária por ora; a auditoria já guarda os eventos. Pode ser revista se a tradução ficar cara.

## Consequências
- Plano de implementação: `docs/plano-execucao-comercial-financeiro.md`.
- O frontend precisa acompanhar cada fase; as mudanças de API ficam listadas no plano.
