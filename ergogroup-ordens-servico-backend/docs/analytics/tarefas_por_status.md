# Tarefas — Por Status

## O que este indicador mede

Distribuição de todas as tarefas (`Tarefa`) por status atual, sem filtro de período.

| Status | Significado operacional |
|---|---|
| Aberta | Tarefa criada mas não iniciada |
| Em Andamento | Técnico alocado e execução iniciada |
| Concluída | Entrega finalizada e validada |
| Cancelada | Tarefa descartada |

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `status` | `Tarefa` | Agrupador |
| `count(id)` | `Tarefa` | Volume por status |

## Como ler o gráfico

Mesmo padrão visual e semântico do gráfico "Serviços por Status". Tarefas são a camada mais granular de trabalho dentro de um serviço — enquanto um serviço pode ter múltiplas tarefas, cada tarefa pertence a um único técnico responsável.

- **Alto volume em "Aberta"** → fila de trabalho não consumida
- **Alto volume em "Em Andamento"** → WIP elevado; risco de dispersão de atenção dos técnicos
- **Proporção de "Cancelada" crescente** → instabilidade de planejamento dentro dos serviços

## O que este indicador diz sobre a saúde da operação

Complementa a visão de serviços com granularidade técnica. Uma OS pode estar "Em Andamento" no nível do serviço enquanto suas tarefas internas estão todas "Abertas" — o que revela atraso de ativação, não de execução.

A relação entre status de tarefas e status de serviços é o dado mais preciso sobre onde o trabalho técnico realmente está represado.

## Perguntas que este indicador responde

- Quantas tarefas estão aguardando início neste momento?
- O WIP (trabalho em progresso simultâneo) está dentro de um nível saudável?
- A taxa de cancelamento de tarefas é sintoma de replanejamento frequente?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| "Aberta" representa > 40% do total | Verificar se técnicos estão sendo alocados em tempo hábil após criação das tarefas |
| "Em Andamento" alto sem crescimento em "Concluída" | Investigar bloqueios ativos — dependência de cliente, acesso, material |
| "Cancelada" > 15% | Revisar processo de planejamento dentro das OS: tarefas sendo criadas sem viabilidade confirmada |
