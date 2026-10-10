# OS — Tempo Médio de Encerramento

## O que este indicador mede

Média aritmética dos dias decorridos entre a criação (`data_criacao`) e o encerramento operacional (data do último `Servico` concluído) de todas as OS que possuem data de término registrada.

Calculado sobre **todo o histórico** sem restrição de período.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `data_criacao` | `OrdemServico` | Início do ciclo |
| `concluida=True` | `OrdemServico` | Filtro: apenas OS encerradas |
| `Max(servicos__data_termino, filter=status='concluida')` | `Servico` | Data de encerramento real |

## Como ler o indicador

O valor exibido é a **média em dias** acompanhada do total de OS que entraram no cálculo. Exemplo: `Média: 32 dias | 601 OS encerradas`.

- O total de OS no cálculo deve ser comparado ao total de OS concluídas no KPI principal. Uma diferença grande indica OS concluídas sem data de término registrada nos serviços — gap de dados que precisa ser corrigido.
- A média é sensível a outliers (OS com centenas de dias). Use a distribuição por faixa para entender melhor o comportamento real.

## O que este indicador diz sobre a saúde da operação

É o **SLA médio percebido pelo cliente** — o tempo que o cliente espera desde a abertura da OS até sua entrega. Reduzir esse número sem comprometer qualidade é o objetivo central da gestão operacional.

Sozinho, a média mascara a variabilidade. Uma média de 25 dias pode esconder que metade das OS fecha em 5 dias e a outra metade leva 45. Por isso, este KPI deve sempre ser lido junto com a **Distribuição por Prazo de Encerramento**.

## Perguntas que este indicador responde

- Qual é o tempo de ciclo médio da operação?
- O SLA médio está dentro do acordado com os clientes?
- Mudanças no processo (novos técnicos, nova metodologia) estão reduzindo o tempo médio?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Média muito acima do SLA contratual | Revisar distribuição por faixa e identificar faixas > 30 dias como alvo de melhoria |
| Total de OS no cálculo muito abaixo do total concluído | Investigar OS concluídas sem serviços finalizados — possível inconsistência de dados |
| Média alta com distribuição concentrada em ≤ 15 dias | Outliers extremos estão puxando a média — identificar e tratar as OS acima de 90 dias |
