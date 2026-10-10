# Mini-OS — Clientes com Mais Revisões

## O que este indicador mede

Ranking dos 10 clientes com maior volume absoluto de Mini-OS que geraram revisão do cliente (`revisao_cliente=True`), exibido em ordem decrescente com donut proporcional ao total.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `cliente_id`, `cliente__nome` | `MiniOS` | Agrupador |
| `revisao_cliente=True` | `MiniOS` | Filtro de retrabalho |
| `count(id)` | `MiniOS` | Volume de revisões por cliente |

Sem filtro de período. Apenas Mini-OS com `cliente` preenchido entram no cálculo.

## Como ler o gráfico

Cada linha representa um cliente, com seu volume absoluto de revisões. O donut à esquerda mostra a proporção de cada cliente sobre o total de revisões do top 10.

- **Cliente no topo com volume muito acima dos demais** → relacionamento específico com problema crônico de alinhamento
- **Distribuição uniforme entre vários clientes** → problema sistêmico, não específico de cliente
- **Cliente com alto volume de revisões e alto volume de Mini-OS total** → calcular taxa individual para avaliar se é volume ou qualidade

## O que este indicador diz sobre a saúde da operação

Decompõe a taxa global de revisão por cliente, permitindo **diagnóstico direcionado**. A taxa global pode ser aceitável enquanto esconde que um único cliente concentra 60% de todo o retrabalho.

Clientes com muitas revisões podem indicar:
- Escopo mal definido desde a abertura da OS
- Expectativas não alinhadas antes da execução
- Comunicação deficiente durante o processo
- Mudança de requisito frequente por parte do cliente

## Perguntas que este indicador responde

- Existe concentração de retrabalho em clientes específicos?
- Algum cliente está gerando sistematicamente mais revisões que a média?
- A distribuição de revisões mudou após mudanças no time ou no processo?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Um único cliente representa > 30% do total de revisões | Realizar reunião de alinhamento de processo com esse cliente — revisar como OS são abertas e escopo definido |
| Cliente com alta taxa de revisão e alto valor financeiro (ver financeiro) | Prioridade máxima de atenção — risco de churn de cliente estratégico |
| Clientes novos aparecendo no ranking | Processo de onboarding pode estar falhando no alinhamento de expectativas |
