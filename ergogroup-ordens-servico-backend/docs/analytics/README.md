# Analytics — Visão Geral

Documentação dos indicadores analíticos expostos pelo módulo `apps/analise/`.
Cada indicador possui arquivo próprio com análise de BI detalhada — este arquivo serve como índice de navegação.

---

## Endpoints

| Rota | View | Permissão |
|---|---|---|
| `/api/analise/dados/` | `AnaliseDadosView` | Autenticado |
| `/api/analise/financeiro/kpis/` | `FinanceiroKPIsView` | Restrito a perfis financeiros |
| `/api/analise/produtividade/` | `ProdutividadeView` | Autenticado |

---

## Índice de indicadores

### Ordens de Serviço (`ordens_servico`)

| Indicador | Arquivo |
|---|---|
| Fluxo Mensal — Abertas vs Concluídas | [os_fluxo_mensal.md](os_fluxo_mensal.md) |
| KPIs do Mês Atual (total, concluídas, em andamento) | [os_kpis_mes_atual.md](os_kpis_mes_atual.md) |
| Distribuição por Prazo de Encerramento | [os_distribuicao_prazo.md](os_distribuicao_prazo.md) |
| Tempo Médio de Encerramento | [os_tempo_medio_encerramento.md](os_tempo_medio_encerramento.md) |

### Serviços (`servicos`)

| Indicador | Arquivo |
|---|---|
| Principais por Quantidade | [servicos_principais_por_quantidade.md](servicos_principais_por_quantidade.md) |
| Distribuição por Status | [servicos_por_status.md](servicos_por_status.md) |
| Tempo Médio de Conclusão por Repositório | [servicos_tempo_por_repositorio.md](servicos_tempo_por_repositorio.md) |

### Tarefas (`tarefas`)

| Indicador | Arquivo |
|---|---|
| Distribuição por Status | [tarefas_por_status.md](tarefas_por_status.md) |

### Mini-OS (`minios`)

| Indicador | Arquivo |
|---|---|
| Fluxo Mensal — Criadas vs Finalizadas | [minios_fluxo_mensal.md](minios_fluxo_mensal.md) |
| Taxa de Revisão do Cliente | [minios_revisao_cliente.md](minios_revisao_cliente.md) |
| Clientes com Mais Revisões | [minios_clientes_mais_revisoes.md](minios_clientes_mais_revisoes.md) |

### Financeiro (`/api/analise/financeiro/kpis/`)

| Indicador | Arquivo |
|---|---|
| KPIs de Faturamento | [financeiro_kpis.md](financeiro_kpis.md) |
| Clientes por Faturamento e por Vendas | [financeiro_clientes.md](financeiro_clientes.md) |

### Produtividade (`/api/analise/produtividade/`)

| Indicador | Arquivo |
|---|---|
| Tempos Médios (OS, serviço, lead time de tarefa) | [produtividade_tempos_medios.md](produtividade_tempos_medios.md) |
| Taxa de Cancelamento | [produtividade_taxa_cancelamento.md](produtividade_taxa_cancelamento.md) |
| Por Técnico | [produtividade_por_tecnico.md](produtividade_por_tecnico.md) |

---

## Decisões de design

**Por que não calcular deltas no backend:** Os endpoints retornam séries temporais brutas. O frontend calcula variações percentuais. Isso evita que mudanças na lógica de comparação exijam alterações no backend.

**Por que histórico completo para métricas absolutas:** KPIs como total concluído, tempo médio de OS e tempo médio por técnico usam todo o histórico sem restrição de período. Filtros de 12 meses são aplicados apenas em séries temporais para o gráfico mensal.

**Por que `Max(Servico.data_termino)` como encerramento de OS:** O campo `concluida` é derivado automaticamente mas não tem timestamp próprio. A data do último serviço concluído é o único ponto no tempo que representa o encerramento operacional da OS.

**MySQL e timezone tables:** `TruncMonth`, `ExtractYear` e `ExtractMonth` sobre `DateTimeField` no MySQL dependem de `CONVERT_TZ()`, que retorna NULL sem tabelas de timezone instaladas. Solução: buscar datetimes brutos e converter em Python via `timezone.localtime()`.

**Restrição de valores monetários:** `vendas_por_mes` e o bloco `clientes` são omitidos para perfis Sub-Líder Técnico, Técnico, Gestor Administrativo e Administrativo — verificado via `usuario_pode_ver_valores(request.user)` em `apps/contas/permissions.py`.
