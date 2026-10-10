# Serviços — Tempo Médio de Conclusão por Repositório

## O que este indicador mede

Para cada tipo de serviço (repositório) que possui serviços concluídos com `data_inicio` e `data_termino` registradas, calcula:

- **Média de dias** entre `data_inicio` e `data_termino` de todos os serviços concluídos daquele tipo
- **Total concluídos** com datas válidas (denominador da média)

Calculado sobre todo o histórico. Ordenado do mais lento ao mais rápido.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `repositorio_id`, `repositorio__nome` | `Servico` | Agrupador |
| `data_inicio`, `data_termino` | `Servico` | Cálculo de duração |
| `status = CONCLUIDA` | `Servico` | Filtro: apenas serviços entregues |

Serviços com `data_termino < data_inicio` são descartados (dados inválidos).

## Como ler o gráfico

Barras horizontais ordenadas da maior para a menor média. O eixo X representa dias. A label à direita de cada barra exibe a média em dias.

- **Barras longas (muitos dias)** → serviços cronicamente demorados — candidatos a padronização ou redesign de processo
- **Barras curtas** → serviços bem executados ou de baixa complexidade
- **Repositório com barra longa e alto volume** (ver `servicos_principais_por_quantidade.md`) → impacto operacional alto — prioridade de melhoria

## O que este indicador diz sobre a saúde da operação

Revela o **tempo de ciclo por tipo de serviço**, que a média global de serviços esconde. Dois tipos de serviço podem ter a mesma média global mas perfis completamente diferentes — um fecha em 3 dias, outro em 45.

Este indicador é insumo direto para:
- **Precificação**: serviços com ciclo longo consomem mais horas de técnico
- **Promessas ao cliente**: SLA realista por tipo de serviço
- **Priorização de melhorias**: focar nos tipos com maior produto `volume × tempo_médio`

## Perguntas que este indicador responde

- Quais tipos de serviço são sistematicamente lentos?
- Existe diferença significativa de tempo entre serviços que parecem similares?
- O tempo médio de um determinado repositório melhorou após mudanças de processo?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Repositório no topo do ranking com média > 60 dias | Investigar causas: dependência externa, falta de padronização, baixa prioridade |
| Total concluídos muito baixo para um repositório com muitos "Em Andamento" | Verificar se serviços desse tipo têm dificuldade de conclusão |
| Diferença > 3× entre o repositório mais rápido e o mais lento | Revisar se a categorização dos serviços está correta — podem ser naturezas diferentes agrupadas num mesmo repositório |
