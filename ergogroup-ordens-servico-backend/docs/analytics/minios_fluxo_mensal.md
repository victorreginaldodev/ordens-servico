# Mini-OS — Fluxo Mensal: Criadas vs Finalizadas

## O que este indicador mede

Volume de Mini-OS criadas por mês (entrada) comparado ao volume de Mini-OS finalizadas por mês (saída), nos últimos 12 meses.

Mini-OS são entregas pontuais e atômicas dentro de um serviço — representam o nível mais operacional de execução técnica.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `criada_em` | `MiniOS` | Data de criação (DateTimeField) |
| `data_termino` | `MiniOS` | Data de finalização (DateField) |
| `status = FINALIZADA` | `MiniOS` | Filtro para finalizadas |

**Nota técnica:** `criada_em` é um `DateTimeField` com timezone. Por limitação do MySQL (sem tabelas de timezone instaladas), a agregação mensal é feita em Python via `timezone.localtime()`, evitando funções de conversão de fuso no banco que retornam NULL silenciosamente.

## Como ler o gráfico

Duas barras por mês: **Criadas** (demanda gerada) e **Finalizadas** (demanda entregue).

- **Finalizadas ≈ Criadas** → equipe em equilíbrio, sem acúmulo de Mini-OS em aberto
- **Criadas consistentemente acima de Finalizadas** → backlog de Mini-OS crescendo
- **Pico em Finalizadas sem pico em Criadas** → equipe "limpando" backlog acumulado de períodos anteriores
- **Queda abrupta em Finalizadas** → investigar: ausências, bloqueios de cliente, sobrecarga

## O que este indicador diz sobre a saúde da operação

Mini-OS têm ciclo de vida curto por natureza — são entregas rápidas e pontuais. Se o fluxo de finalizadas fica consistentemente abaixo do de criadas, o problema não é de capacidade de planejamento, mas de execução ou priorização.

Alta taxa de criação com baixa finalização também pode indicar que Mini-OS estão sendo criadas com escopo mal definido, gerando retrabalho (ver `minios_revisao_cliente.md`).

## Perguntas que este indicador responde

- A equipe consegue finalizar Mini-OS no mesmo ritmo em que são criadas?
- Existe sazonalidade no volume de criação de Mini-OS?
- Em quais meses houve maior represamento?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Criadas > Finalizadas por 3+ meses consecutivos | Investigar backlog de Mini-OS por técnico — possível sobrecarga localizada |
| Queda brusca em Finalizadas | Verificar ausências de técnicos, dependências externas ou bloqueios de acesso |
| Volume de criação muito acima da média histórica | Verificar se novas OS estão sendo cadastradas com Mini-OS em excesso — pode ser problema de granularidade |
