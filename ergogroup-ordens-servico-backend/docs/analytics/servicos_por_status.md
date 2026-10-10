# Serviços — Por Status

## O que este indicador mede

Distribuição de todos os serviços (`Servico`) por status atual, sem filtro de período. Reflete o estado do banco em tempo real.

| Status | Significado operacional |
|---|---|
| Aberto | Serviço criado mas não iniciado |
| Em Andamento | Execução iniciada, não concluída |
| Concluído | Entrega finalizada |
| Cancelado | Serviço descartado antes ou durante a execução |

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `status` | `Servico` | Agrupador |
| `count(id)` | `Servico` | Volume por status |

## Como ler o gráfico

O gráfico de pizza mostra a proporção de cada status sobre o total de serviços já criados na história. As cores seguem convenção semafórica:

- **Vermelho** → Aberto (demanda não iniciada)
- **Amarelo** → Em Andamento (trabalho em progresso)
- **Verde** → Concluído (entregue)
- **Cinza** → Cancelado

## O que este indicador diz sobre a saúde da operação

Foto instantânea da **fila de trabalho técnico**. Ao contrário do fluxo mensal (que mostra movimento), este indicador mostra o **estoque atual** de cada status.

- **Alto percentual em "Aberto"** → serviços aguardando início. Pode indicar gargalo de alocação de técnicos ou priorização deficiente.
- **Alto percentual em "Em Andamento"** com crescimento mensal pequeno → trabalho represado, possível WIP (Work In Progress) excessivo.
- **Alto percentual em "Cancelado"** relativo ao total → investigar causa: mudança de escopo, inviabilidade técnica, erro de cadastro.

## Perguntas que este indicador responde

- Qual proporção do trabalho cadastrado já foi entregue?
- Existe estoque excessivo de serviços não iniciados?
- A taxa de cancelamento é anômala?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| "Aberto" > 30% do total | Verificar regras de priorização e alocação de técnicos |
| "Cancelado" > 10% | Auditar causas de cancelamento — pode indicar problema no processo de aceite de OS |
| "Em Andamento" cresce sem crescimento em "Concluído" | Investigar bloqueios ativos na execução técnica |
