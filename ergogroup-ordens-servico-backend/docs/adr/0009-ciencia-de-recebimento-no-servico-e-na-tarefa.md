# ADR 0009: Ciência de recebimento no serviço e na tarefa

## Status
Aceito (14/10/2026), na discussão sobre o fluxo da ordem de serviço. Cada item diz o que o usuário **decidiu** e o que é **proposta** do agente. **Backend implementado em 14/10/2026 (fase 13 do plano)**, seguindo as propostas abaixo; o frontend é a fase 14.

| # | Tema | Situação |
|---|---|---|
| 1 | Etapas do serviço com a ciência do setor | **Decidido** |
| 2 | Etapas da tarefa com a ciência do responsável | **Decidido** |
| 3 | Regras da ciência no serviço | Proposta; nome "recebimento" **decidido** em 14/10/2026 |
| 4 | Regras da ciência na tarefa | Proposta; mudança de prazo mantém a ciência **decidido** em 14/10/2026 |
| 5 | Dados que já existem | **Decidido** em 14/10/2026 |
| 6 | Linha do tempo e acompanhamento | Proposta |

Completa a seção 1 do ADR 0006 (fluxo de execução de um serviço), que separava só "chegou" de "distribuído".

## Contexto
O ADR 0006 já apontava que o status "aberto" do serviço misturava "chegou e ninguém olhou" com "distribuído, mas ninguém começou". A separação adotada foi derivada das tarefas: sem tarefas é `na_fila`, com tarefas é `distribuido`.

Continuava faltando uma distinção: dentro da fila, o serviço que **acabou de chegar e ninguém do setor viu** e o serviço que **o responsável pelo setor já viu e só falta distribuir**. O mesmo acontece na tarefa: a tarefa `aberta` não diz se o técnico já sabe que ela é dele.

O usuário propôs que o setor dê **ciência** de que o serviço chegou, e que o técnico dê ciência da tarefa que recebeu. Assim cada passo do fluxo tem dono e data, e a experiência ganha as abas "novas", "a distribuir", "distribuídas", "em andamento" e "finalizadas".

## Decisões

### 1. Etapas do serviço
**Decidido:**
```
Novo  →  A distribuir  →  Distribuído  →  Em andamento  →  Finalizado
(chegou,    (o setor deu     (tem tarefas,    (alguém           (todas as tarefas
 sem         ciência, sem     ninguém          começou)          concluídas)
 ciência)    tarefas)         começou)
```
Cancelado continua como está.

| Etapa | Regra | Código na API (proposta) |
|---|---|---|
| Novo | aberto, sem tarefas e sem ciência | `novo` |
| A distribuir | aberto, sem tarefas e com ciência | `a_distribuir` |
| Distribuído | aberto e com tarefas | `distribuido` (sem mudança) |
| Em andamento | alguma tarefa em andamento | `em_execucao` (sem mudança) |
| Finalizado | todas as tarefas concluídas | `concluido` (sem mudança) |
| Cancelado | cancelado | `cancelado` (sem mudança) |

- A etapa continua **calculada**, sem campo de status novo. O `StatusServico` não muda.
- Só a etapa `na_fila` deixa de existir: ela vira `novo` e `a_distribuir`. Os códigos das outras etapas ficam como estão para não quebrar a API; os rótulos ("Em andamento", "Finalizado") são do frontend.

### 2. Etapas da tarefa
**Decidido:** a mesma abordagem, adaptada à tarefa. A tarefa já nasce com responsável e prazo (ela é a própria distribuição), então não existe "a distribuir". A ciência é do **responsável**: "vi que isso é meu".

| Etapa | Regra | Código na API (proposta) |
|---|---|---|
| Nova | aberta e sem ciência do responsável | `nova` |
| A iniciar | aberta e com ciência do responsável | `a_iniciar` |
| Em andamento | em andamento | `em_andamento` |
| Concluída | concluída | `concluida` |
| Cancelada | cancelada | `cancelada` |

- A etapa da tarefa também é **calculada**. O `StatusTarefa` não muda.
- A etapa do serviço **não depende** da ciência da tarefa: o serviço continua Distribuído até alguém começar.

### 3. Regras da ciência no serviço (proposta)
- **Nome no código (decidido em 14/10/2026):** "recebimento", e não "ciência", porque o serviço já tem a ciência do alerta sem movimentação (`alerta_ciente_*`, `registrar_ciencia`, `POST /execucao/servicos/{id}/ciencia/`). Na tela, o texto é decisão do frontend (ex.: "Confirmar recebimento" ou "Dar ciência").
- **Campos novos no `Servico`:** `recebido_em` (data e hora) e `recebido_por` (pessoa).
- **Quem pode dar ciência:** quem tem `tarefas.distribuir` no setor do serviço, a mesma regra de quem distribui. Inclui a diretoria por `setores.todos`.
- **Só para serviço aberto e sem ciência.** Dar ciência de novo num serviço que já tem não muda nada (não é erro), para a ação em lote não falhar por causa de um item.
- **Em lote:** a mesma ação recebe vários serviços de uma vez (ex.: os 4 serviços de uma venda que chegaram ao setor). Se a pessoa não puder dar ciência em algum, nada é gravado.
- **Distribuir registra a ciência:** se o serviço for distribuído (ou ganhar a primeira tarefa por outro caminho) sem ciência, a ciência é registrada na hora, em nome de quem distribuiu. Assim não existe "distribuído sem ciência" e ninguém precisa clicar duas vezes.
- **Excluir todas as tarefas:** o serviço volta para **A distribuir**, porque a ciência continua registrada.
- **Conta como movimentação** do serviço (ADR 0008, 3): alguém agiu sobre ele.
- **Serviço sem setor** (legado, sem catálogo): segue a mesma regra de quem distribui.

### 4. Regras da ciência na tarefa (proposta)
- **Campo novo na `Tarefa`:** `recebida_em` (data e hora). Não precisa de "recebida por": quem dá a ciência é sempre o responsável.
- **Quem pode dar ciência:** só o responsável da tarefa. O gestor não dá no lugar dele, senão a informação perde o sentido.
- **Só para tarefa aberta e sem ciência.** Repetir não muda nada.
- **Em lote:** o responsável dá ciência em várias tarefas suas de uma vez (Meus serviços).
- **Começar registra a ciência:** passar a tarefa para em andamento (ou concluída) sem ciência registra a ciência na hora.
- **Troca de responsável:** a ciência é zerada e a tarefa volta para **Nova**, agora para a pessoa nova.
- **Mudança de prazo (decidido em 14/10/2026):** a ciência **continua**; a tarefa segue em A iniciar. Zerar a ciência foi descartado. O aviso "prazo alterado" até o responsável ver fica para depois (proposta).
- **Voltar de em andamento para aberta:** a ciência continua, e a tarefa vai para **A iniciar**.
- **Conta como movimentação** do serviço da tarefa.

### 5. Dados que já existem (decidido em 14/10/2026)
| Situação hoje | Como fica |
|---|---|
| Serviço com tarefas (distribuído, em andamento, concluído) | ciência retroativa: `recebido_em` = criação da primeira tarefa; `recebido_por` vazio |
| Serviço aberto sem tarefas (hoje `na_fila`) | **Novo**, sem ciência: o setor confirma o recebimento como num serviço que acabou de chegar |
| Serviço cancelado sem tarefas | sem ciência (a etapa é Cancelado de qualquer forma) |
| Tarefa em andamento ou concluída | ciência retroativa: `recebida_em` = início da tarefa (ou a criação, se não houver início) |
| Tarefa aberta | **Nova**, sem ciência: cada responsável confirma o recebimento das suas |
| Tarefa cancelada | sem ciência |

Descartado: dar ciência retroativa, na data da migração, aos serviços da fila e às tarefas abertas.

Na linha do tempo, as ciências retroativas não viram eventos (a migração não grava auditoria de ciência).

### 6. Linha do tempo e acompanhamento (proposta)
- **Eventos novos:**
  - `recebimento`: "PGR recebido por Segurança do Trabalho (Fulano)";
  - `tarefa_recebida`: "Beltrano confirmou o recebimento de PGR".
- **A ciência automática não vira evento separado:** a de distribuir repete o "distribuído para", e a de começar repete o "iniciou".
- **Visibilidade:** a mesma das outras linhas (ADR 0008, 4).
- **Acompanhamento do setor:**
  - os contadores do setor separam novos e a distribuir;
  - a carga da equipe mostra, por pessoa, quantas tarefas estão sem ciência;
  - no detalhe do serviço, cada tarefa mostra a ciência (ou "aguardando ciência de Fulano há N dias").
- **Fica para depois (proposta):** alerta para serviço Novo parado há N dias, separado do alerta sem movimentação.

## Alternativas consideradas
- **Status novo no banco (`StatusServico.RECEBIDO`):** rejeitado. Mudaria a sincronização de status a partir das tarefas, a OS, os relatórios e o histórico. Uma data de ciência e a etapa calculada resolvem sem mexer no status.
- **Ciência da tarefa mudando a etapa do serviço** (ex.: "distribuído, aguardando ciência do técnico"): rejeitado por ora. Uma etapa a mais no serviço confunde o Comercial; o gestor vê a ciência por tarefa no detalhe e na carga da equipe.
- **Gestor dando ciência no lugar do técnico:** rejeitado; a ciência da tarefa só tem valor se for do próprio responsável.
- **Usar a ciência do alerta já existente:** rejeitado; são coisas diferentes ("estou ciente de que está parado" × "recebi").

## Implementação (14/10/2026)
Detalhes e definições tomadas na implementação: `docs/plano-execucao-comercial-financeiro.md`, fase 13. Em resumo:
- campos `Servico.recebido_em`, `Servico.recebido_por` e `Tarefa.recebida_em`; ação de auditoria `recebimento`;
- etapas `novo` e `a_distribuir` no lugar de `na_fila`; etapa da tarefa calculada (`nova`, `a_iniciar`, `em_andamento`, `concluida`, `cancelada`);
- endpoints `POST /api/execucao/servicos/recebimento/` e `POST /api/execucao/tarefas/recebimento/`, em lote;
- eventos `recebimento` e `tarefa_recebida` na linha do tempo.

## Consequências
- Plano de implementação: `docs/plano-execucao-comercial-financeiro.md`, fase 13 (backend). O frontend vem depois, numa fase própria.
- A etapa `na_fila` sai da API: lista de vendas (`andamento` e `?etapa=`), contadores do setor, fila, resumo da venda, cobranças (previsão) e outros serviços da OS passam a usar `novo` e `a_distribuir`.
- O frontend precisa acompanhar a troca de `na_fila` antes de a fase 13 ir para o ambiente usado pela equipe.
