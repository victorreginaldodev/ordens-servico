# OS — Fluxo Mensal: Abertas vs Concluídas

## O que este indicador mede

Volume de Ordens de Serviço abertas por mês (entrada) comparado ao volume de OS encerradas operacionalmente por mês (saída), nos últimos 12 meses.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `data_criacao` | `OrdemServico` | Data de abertura da OS |
| `data_termino` do último `Servico` com `status=concluida` | `Servico` | Proxy de encerramento operacional |

## Como ler o gráfico

O gráfico exibe duas barras por mês: **Abertas** (entrada de demanda) e **Concluídas** (saída de produção).

- **Barras de "Concluídas" maiores que "Abertas"** → a equipe está liquidando backlog. Situação favorável.
- **Barras de "Abertas" maiores que "Concluídas" de forma consistente** → acúmulo de backlog. A operação recebe mais do que entrega. Sinal de alerta de capacidade.
- **Picos isolados em "Abertas"** → ondas sazonais de demanda. Avaliar se a equipe absorve o volume no mês seguinte.
- **Queda simultânea em ambas as barras** → período de baixa demanda ou férias coletivas. Verificar se é esperado.

## O que este indicador diz sobre a saúde da operação

É o **indicador central de throughput operacional**. A diferença acumulada entre abertas e concluídas ao longo dos meses é o crescimento (ou encolhimento) do backlog. Uma operação saudável mantém essas duas linhas próximas ou com "Concluídas" à frente.

## Perguntas que este indicador responde

- A operação está crescendo em demanda sem crescer em capacidade de entrega?
- Existe sazonalidade clara no volume de abertura de OS?
- Em quais meses a equipe performou acima da média de entrega?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| "Abertas" supera "Concluídas" por 3+ meses consecutivos | Revisar capacidade da equipe ou critérios de aceite de novas OS |
| Pico de abertura sem pico correspondente de conclusão no mês seguinte | Investigar gargalo: falta de técnico, dependência externa, escopo mal definido |
| Queda brusca em "Concluídas" sem queda em "Abertas" | Verificar impedimentos operacionais: ausências, bloqueios técnicos, problemas de sistema |
