# OS — KPIs do Mês Atual

## O que este indicador mede

Três números de leitura imediata sobre o estado atual das Ordens de Serviço:

- **Total de OS** — volume histórico completo no banco
- **Total Concluídas** — OS encerradas operacionalmente em toda a história
- **Em Andamento** — OS com status diferente de `CONCLUIDA` e `CANCELADA` neste momento

Cada KPI exibe a variação do mês atual em relação ao mês anterior.

## Fonte de dados

| KPI | Campo | Modelo |
|---|---|---|
| Total | `count()` sem filtro | `OrdemServico` |
| Total Concluídas | `concluida=True` | `OrdemServico` |
| Em Andamento | `status` ∉ {concluida, cancelada} | `OrdemServico` |
| Abertas este mês | `data_criacao >= início do mês` | `OrdemServico` |
| Concluídas este mês | `data_termino` do último serviço ≥ início do mês | `Servico` |

## Como ler os KPIs

### Total de OS
Número bruto de toda a demanda histórica. Sozinho tem pouca relevância analítica, mas serve de denominador para taxas de conclusão e cancelamento.

### Total Concluídas
Junto com o total, forma a **taxa de conclusão histórica** (`concluidas / total`). Se essa taxa for muito baixa, há backlog histórico não resolvido ou alto volume de cancelamento.

### Em Andamento
É o **backlog ativo** — a pressão real sobre a equipe no momento da consulta. Este número deve ser monitorado continuamente. Crescimento consistente sem crescimento de equipe é sinal de crise operacional.

### Variação mês a mês
- Variação positiva em "abertas este mês" com variação negativa em "concluídas" → entrada > saída → backlog crescendo
- Variação positiva em ambas → a operação está acelerando
- Variação negativa em ambas → período de baixa, esperado ou não

## O que este indicador diz sobre a saúde da operação

Os KPIs funcionam como **painel de instrumentos**: não revelam a causa de um problema, mas apontam onde olhar. O "Em Andamento" é o número mais crítico para o gestor — ele representa trabalho comprometido com clientes que ainda não foi entregue.

## Perguntas que este indicador responde

- Qual é o ritmo atual de abertura de novas demandas?
- A equipe está acelerando ou desacelerando a entrega?
- Qual é o estoque de compromissos pendentes com clientes?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| "Em Andamento" crescendo mês a mês | Revisar priorização e distribuição de carga entre técnicos |
| Delta negativo em "Concluídas" com delta positivo em "Abertas" | Verificar impedimentos e realinhar capacidade |
| Taxa de conclusão histórica abaixo de 60% | Auditar OS antigas em aberto — podem ser candidatas a cancelamento ou redesign de processo |
