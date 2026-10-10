# Modulo de Analytics Operacional

## Objetivo

Criar um modulo de indicadores analiticos para acompanhar a operacao da Ergogroup, apoiar decisoes internas e dar visibilidade sobre produtividade, tempos medios e volume de trabalho por tecnico, tipo de servico e cliente.

Os indicadores cobrem Ordens de Servico, Servicos, Tarefas, Mini-OS / OS Operacional e dados financeiros.

A documentacao de BI de cada indicador esta em `documentation/analytics/README.md`.

---

## Endpoints

Tres endpoints compoe o modulo:

```
GET /api/analise/dados/          AnaliseDadosView       Autenticado
GET /api/analise/financeiro/kpis/ FinanceiroKPIsView    Perfis financeiros
GET /api/analise/produtividade/  ProdutividadeView      Autenticado
```

---

## Indicadores implementados

### /api/analise/dados/

**Ordens de Servico**

- Fluxo mensal de OS abertas vs concluidas (ultimos 12 meses).
- KPIs do mes atual: total historico, total concluidas, em andamento, variacao mensal.
- Distribuicao por prazo de encerramento em 5 faixas: ate 7 dias, 8-15, 16-30, 31-60, acima de 60.
- Tempo medio de encerramento em dias (historico completo).

**Servicos**

- Principais servicos executados por volume (top 8 + demais, historico completo).
- Distribuicao por status atual (Aberto, Em Andamento, Concluido, Cancelado).
- Tempo medio de conclusao por repositorio: media de dias entre `data_inicio` e `data_termino` de servicos concluidos (historico completo), ordenado do mais lento ao mais rapido.

**Tarefas**

- Distribuicao por status atual.

**Mini-OS / OS Operacional**

- Fluxo mensal de Mini-OS criadas vs finalizadas (ultimos 12 meses).
- Taxa de revisao do cliente: proporcao de Mini-OS com `revisao_cliente=True` sobre o total.
- Ranking dos 10 clientes com mais revisoes de cliente.

### /api/analise/financeiro/kpis/

- Total faturado, total para faturar, total sem liberacao para faturamento.
- Ranking de clientes por valor faturado (top 5) e por valor de vendas (top 10).
- Restrito a perfis com `usuario_pode_ver_valores`.

### /api/analise/produtividade/

- Tempos medios: OS (criacao ate encerramento), Servico (data_inicio ate data_termino), lead time de tarefa (criacao ate inicio).
- Taxa de cancelamento de tarefas e servicos nos ultimos 12 meses.
- Por tecnico: tarefas concluidas, Mini-OS concluidas, em aberto, tempo medio por tarefa (historico completo) e evolucao mensal dos ultimos 12 meses por tecnico selecionado.

---

## Regras de calculo

### Historico completo vs ultimos 12 meses

Metricas absolutas (totais, medias globais, distribuicoes) usam todo o historico do banco sem filtro de data.

Series temporais exibidas em graficos mensais usam os ultimos 12 meses.

Tecnico — separacao explicita:
- KPIs de producao (tarefas concluidas, Mini-OS concluidas, tempo medio): historico completo.
- Grafico mensal de evolucao: ultimos 12 meses.

### Encerramento de OS

O encerramento operacional de uma OS e calculado como `Max(Servico.data_termino)` entre os servicos com `status=concluida` relacionados a ela. O campo `concluida=True` identifica as OS elegíveis; o campo `data_fim_real` e anotado em tempo de consulta.

### Tempo por repositorio

Servicos com `data_termino < data_inicio` sao descartados do calculo (dados invalidos). Apenas servicos com `status=CONCLUIDA`, `data_inicio` e `data_termino` preenchidos entram na media.

### Restricao de acesso por tecnico

Usuarios com `tipo_usuario = TECNICO` recebem apenas os proprios dados em `por_tecnico`. Outros perfis recebem todos os tecnicos.

---

## Restricao de MySQL sem timezone tables

Funcoes de banco que operam sobre `DateTimeField` no MySQL (`TruncMonth`, `ExtractYear`, `ExtractMonth`) dependem de `CONVERT_TZ()` internamente. Sem as tabelas de timezone instaladas no servidor MySQL, essas funcoes retornam `NULL` silenciosamente.

Solucao adotada: buscar os datetimes brutos via `values_list` e converter o fuso em Python com `timezone.localtime()`, evitando qualquer funcao de conversao no banco.

Campos afetados: `MiniOS.criada_em`, `Tarefa.criada_em`.

Campos seguros para agregacao no banco: qualquer `DateField` (`data_termino`, `data_inicio`, `data_criacao`).

---

## Restricao de valores monetarios

Os campos `vendas_por_mes` e o bloco `clientes` sao omitidos da resposta de `/api/analise/dados/` para os perfis:

- Sub-Lider Tecnico
- Tecnico
- Gestor Administrativo
- Administrativo

A verificacao e feita via `usuario_pode_ver_valores(request.user)` em `apps/contas/permissions.py`.
