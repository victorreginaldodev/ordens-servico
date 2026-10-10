# OS — Distribuição por Prazo de Encerramento

## O que este indicador mede

Para todas as OS encerradas (`concluida=True`) que possuem data de término registrada, este indicador classifica cada uma em um dos cinco intervalos de duração — medida em dias entre `data_criacao` e a data do último serviço concluído.

| Faixa | Significado |
|---|---|
| ≤ 7 dias | Entregas rápidas — escopo pequeno ou bem definido |
| 8 – 15 dias | Ciclo curto — padrão para serviços de baixa complexidade |
| 16 – 30 dias | Ciclo médio — típico da maioria das OS complexas |
| 31 – 60 dias | Ciclo longo — escopo extenso ou com impedimentos |
| > 60 dias | Crítico — OS represadas, com bloqueios ou escopo indefinido |

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `data_criacao` | `OrdemServico` | Data de início do ciclo |
| `concluida=True` | `OrdemServico` | Filtro: apenas OS encerradas |
| `Max(servicos__data_termino)` com `status=concluida` | `Servico` | Proxy de data de encerramento |

O cálculo usa **todo o histórico** (sem restrição de período), garantindo que a distribuição reflita o comportamento real da operação e não apenas os últimos 12 meses.

## Como ler o gráfico

Cada barra representa a proporção (%) e o volume absoluto de OS naquela faixa. A soma de todas as faixas equivale ao total de OS encerradas com data de término registrada.

- **Concentração nas faixas ≤ 15 dias** → operação ágil, escopo bem controlado
- **Concentração nas faixas 16–60 dias** → ciclo médio-longo, aceitável para serviços complexos
- **Volume significativo em > 60 dias** → atenção: OS que ultrapassam dois meses raramente têm escopo bem definido desde o início

## O que este indicador diz sobre a saúde da operação

Revela o **perfil de complexidade e velocidade** da operação. Uma distribuição fortemente concentrada em faixas longas indica que os processos internos (priorização, bloqueios externos, alocação de técnicos) estão introduzindo atraso sistemático.

Combinado com o tempo médio global, a distribuição responde a perguntas que a média esconde: uma média de 30 dias pode significar que 80% das OS fecham em 15 dias e 20% demoram mais de 90 — perfis completamente diferentes de operação.

## Perguntas que este indicador responde

- A operação entrega consistentemente rápido ou existe uma cauda longa de OS lentas?
- Há concentração anormal em determinada faixa de prazo?
- A distribuição está melhorando (migrando para faixas menores) ao longo do tempo?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| > 20% das OS na faixa > 60 dias | Auditar essas OS: identificar causa raiz (escopo, técnico, cliente, bloqueio externo) |
| Faixa 31–60 dias crescendo | Revisar processo de aceite: OS complexas podem exigir desmembramento antes de abrir |
| Faixa ≤ 7 dias com volume muito baixo | Avaliar se OS pequenas estão sendo abertas corretamente ou agrupadas desnecessariamente |
