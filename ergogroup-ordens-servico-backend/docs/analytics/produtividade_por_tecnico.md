# Produtividade — Por Técnico

## O que este indicador mede

Para cada técnico com tarefas ou Mini-OS registradas, exibe:

| Métrica | Base de cálculo |
|---|---|
| Tarefas concluídas | Histórico completo (`status=CONCLUIDA`) |
| Mini-OS concluídas | Histórico completo (`status=FINALIZADA`) |
| Em aberto (tarefas + Mini-OS) | Estado atual sem filtro de data |
| Tempo médio por tarefa | Média de dias entre `data_inicio` e `data_termino`, histórico completo |
| Evolução mensal (tarefas) | Últimos 12 meses, agrupado por `data_termino` |
| Evolução mensal (Mini-OS) | Últimos 12 meses, agrupado por `data_termino` |

## Fonte de dados

```
Tarefa.filter(status=CONCLUIDA)                         # histórico completo para KPIs
Tarefa.filter(status=CONCLUIDA, data_termino__gte=T-12) # últimos 12 meses para gráfico
MiniOS.filter(status=FINALIZADA)                        # histórico completo para KPIs
MiniOS.filter(status=FINALIZADA, data_termino__gte=T-12) # últimos 12 meses para gráfico
Tarefa.filter(status__in=[ABERTA, EM_ANDAMENTO])        # carga atual
MiniOS.filter(status__in=[NAO_INICIADO, EM_ANDAMENTO])  # carga atual
```

**Nota de permissão:** Técnicos veem apenas a própria linha. Gestores e perfis superiores veem todos os técnicos.

## Como ler o indicador

### Seletor de técnico
Permite alternar entre técnicos para análise individual. Cada técnico tem seu próprio contexto de KPIs e gráfico mensal.

### KPIs individuais
- **Tarefas concluídas** → volume total de entregas na história daquele técnico — métrica de produtividade acumulada
- **Mini-OS concluídas** → volume de entregas atômicas — complementa as tarefas na visão de execução
- **Em aberto** → carga atual do técnico (tarefas + Mini-OS). Detalhado por tipo ("X tarefas · Y mini-OS")
- **Tempo médio por tarefa** → velocidade de execução individual — calculado sobre `data_inicio → data_termino` no histórico completo

### Gráfico mensal (últimos 12 meses)
Exibe a evolução mês a mês de tarefas e Mini-OS concluídas pelo técnico selecionado. Revela padrões como:
- Meses de alta produção vs meses de queda
- Sazonalidade individual
- Impacto de férias, afastamentos ou mudança de projeto

## O que este indicador diz sobre a saúde da operação

Permite gestão individual de produtividade sem expor um ranking público que poderia ser mal interpretado. A análise correta considera **complexidade da OS**, não apenas volume.

Combinações relevantes:
- **Alto concluído + baixo em aberto** → técnico bem nivelado, sem sobrecarga
- **Baixo concluído + alto em aberto** → sobrecarga ou impedimento técnico — requer atenção
- **Tempo médio muito acima da média da equipe** → pode indicar alocação em OS complexas ou dificuldade técnica que requer suporte
- **Queda no gráfico mensal** → investigar: mudança de projeto, afastamento, redução de escopo

## Perguntas que este indicador responde

- A carga de trabalho está bem distribuída entre os técnicos?
- Existe técnico com backlog excessivo que pode comprometer prazos?
- O ritmo de um técnico mudou após algum evento (mudança de cliente, novo tipo de serviço)?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Técnico com "Em aberto" muito acima da média da equipe | Redistribuir tarefas ou identificar bloqueios que impedem conclusão |
| Tempo médio de um técnico 2× acima da média da equipe | Verificar se as OS atribuídas têm complexidade proporcional ou se há necessidade de suporte técnico |
| Gráfico mensal com queda brusca e sem recuperação | Verificar se o técnico saiu, foi realocado ou está com impedimento não reportado |
| Técnico com zero tarefas em aberto e zero concluídas nos últimos meses | Verificar se está ativo no sistema — possível problema de cadastro de responsável nas OS |
