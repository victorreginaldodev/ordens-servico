# Serviços — Principais por Quantidade

## O que este indicador mede

Ranking dos repositórios de serviço (catálogo) mais executados em toda a história da operação, por volume total de execuções (`Servico` criados com aquele `repositorio`).

Os 8 primeiros são exibidos individualmente. O restante é agrupado em "Demais (N serviços)" para não poluir o gráfico com itens de baixo volume.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `repositorio_id` | `Servico` | Agrupador (tipo de serviço) |
| `repositorio__nome` | `Repositorio` | Label de exibição |
| `count(id)` | `Servico` | Volume de execuções |

Sem filtro de data — reflete o histórico completo.

## Como ler o gráfico

Cada item representa um tipo de serviço e seu volume total de execuções. A ordenação é decrescente: o serviço com mais execuções aparece primeiro.

- **Serviços no topo** → onde a operação concentra a maior parte do esforço
- **Serviços "Demais"** → cauda longa de serviços nichados ou raros

## O que este indicador diz sobre a saúde da operação

Revela o **mix operacional** da empresa. Alta concentração no topo (um serviço representa 50%+ do volume) indica dependência de um único tipo de demanda — risco se esse serviço perder relevância no mercado.

Combinado com dados financeiros, permite identificar desalinhamentos entre volume e valor: serviços com alto volume mas baixa margem são candidatos à revisão de precificação, automação ou padronização.

## Perguntas que este indicador responde

- Quais tipos de serviço dominam a operação?
- Há concentração excessiva em poucos tipos de serviço?
- Existe correlação entre volume e complexidade (tempo médio de conclusão)?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Um único serviço representa > 40% do volume | Mapear dependência — risco de concentração operacional |
| Serviços no "Demais" têm volume crescente ao longo do tempo | Avaliar se devem ser promovidos como linha principal de serviço |
| Serviço de alto volume com tempo médio longo (ver `servicos_tempo_por_repositorio.md`) | Candidato à padronização ou criação de checklist de execução |
