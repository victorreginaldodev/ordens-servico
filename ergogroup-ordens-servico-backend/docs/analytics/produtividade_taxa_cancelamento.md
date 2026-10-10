# Produtividade — Taxa de Cancelamento

## O que este indicador mede

Proporção de tarefas e serviços cancelados em relação ao total criado nos últimos 12 meses, calculada separadamente para cada entidade.

| Métrica | Filtro | Campo |
|---|---|---|
| Cancelamento de tarefas | `criada_em >= T-12` | `status = CANCELADA` |
| Cancelamento de serviços | `criado_em >= T-12` | `status = CANCELADO` |

## Fonte de dados

```
Tarefa.filter(criada_em__gte=limite_12_meses)
Servico.filter(criado_em__gte=limite_12_meses)
```

**Nota técnica:** O filtro usa comparação direta com datetime timezone-aware em vez de `__date`, pois `__date` em `DateTimeField` no MySQL requer `CONVERT_TZ()`, que retorna NULL quando as tabelas de timezone do servidor não estão instaladas.

## Como ler o indicador

Dois blocos independentes, cada um com:
- **Total** no período
- **Cancelados** no período
- **Percentual** de cancelamento

### Cancelamento de tarefas
Revela instabilidade no **planejamento interno** dentro dos serviços. Tarefas são canceladas quando o escopo de um serviço muda durante a execução.

### Cancelamento de serviços
Revela instabilidade no **processo de aceite de OS** ou na **viabilidade técnica** dos serviços prometidos. Um serviço cancelado representa trabalho iniciado (ou planejado) que não gerou entrega — custo sem receita correspondente.

## O que este indicador diz sobre a saúde da operação

São proxies de **qualidade de processo** em dois níveis distintos:

- **Cancelamento de serviço alto** → problema de escopo na abertura da OS: a empresa está comprometendo serviços que depois descobre que não pode ou não deve entregar
- **Cancelamento de tarefa alto** → problema de planejamento dentro da execução: o escopo do serviço muda depois que as tarefas já foram criadas

A combinação de ambos altos indica que tanto o processo comercial quanto o operacional têm falhas de previsibilidade.

## Perguntas que este indicador responde

- Com que frequência a equipe abre tarefas que depois são descartadas?
- A taxa de cancelamento de serviços está acima do aceitável?
- O cancelamento é concentrado em algum tipo de serviço ou cliente específico?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Cancelamento de serviço > 10% | Revisar critérios de aceite na abertura de OS — análise de viabilidade técnica antes de comprometer |
| Cancelamento de tarefa > 20% | Revisar processo de planejamento dentro das OS — escopo sendo definido muito tarde na execução |
| Ambos os cancelamentos crescendo | Sinal de deterioração sistemática de processo — investigar mudanças recentes em equipe, clientes ou tipos de serviço |
