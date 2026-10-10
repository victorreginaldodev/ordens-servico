# Financeiro — Clientes por Faturamento e por Vendas

## O que este indicador mede

Dois rankings de clientes baseados em valor financeiro:

| Ranking | Definição | Filtro |
|---|---|---|
| Mais faturamento | Top clientes por soma de `valor` de OS faturadas | `faturada=True` |
| Mais vendas | Top clientes por soma de `valor` de todas as OS emitidas | Sem filtro de status |

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `cliente_id`, `cliente__nome` | `OrdemServico` | Agrupador |
| `valor` | `OrdemServico` | Valor financeiro |
| `faturada` | `OrdemServico` | Distingue faturado de vendido |

Top 5 para faturamento, top 10 para vendas. Sem filtro de período.

## Como ler os rankings

### Mais faturamento
Clientes que geraram mais receita **efetivamente realizada** (com NF emitida). Este é o ranking de clientes mais valiosos em termos de receita concretizada.

### Mais vendas
Clientes com maior volume de OS emitidas, independente de estarem faturadas. Inclui OS em aberto, liberadas para faturamento ou ainda sem liberação.

### A diferença entre os dois rankings
É a informação mais rica deste indicador. Um cliente no top de "vendas" mas ausente no top de "faturamento" indica:
- Alto volume de OS abertas que ainda não foram concluídas e faturadas
- Possível gargalo no processo de liberação para aquele cliente
- Cliente estratégico com ciclo financeiro lento

## O que este indicador diz sobre a saúde da operação

Revela a **concentração de receita e risco de dependência**. Se os 3 maiores clientes representam > 60% do faturamento, a saúde financeira da empresa é altamente dependente desses relacionamentos.

A comparação entre "vendas" e "faturamento" expõe clientes com ciclo financeiro longo — trabalho executado que demora a virar caixa.

## Perguntas que este indicador responde

- Quais clientes são estrategicamente mais importantes em termos de receita?
- Existe concentração excessiva de receita em poucos clientes?
- Algum cliente grande tem trabalho executado mas ainda não faturado?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Top 3 clientes > 60% do faturamento | Estratégia de diversificação de carteira — risco de concentração |
| Cliente no top de vendas mas ausente no top de faturamento | Investigar backlog de faturamento específico para esse cliente |
| Cliente grande com queda no ranking entre períodos | Verificar relacionamento comercial — possível perda de volume |

## Restrição de acesso

Restrito a perfis financeiros. Ver `financeiro_kpis.md` para detalhes de permissão.
