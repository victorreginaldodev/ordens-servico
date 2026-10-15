# 07. Indicadores (Análise BI)

Dois painéis de números agregados: o **operacional**, com volume, tempos, prazos e produtividade, e o **financeiro**, com o que foi faturado, o que está a faturar e a previsão. Eles servem para acompanhar tendências. O trabalho do dia a dia fica nos painéis de execução (módulo 03) e em Cobranças (módulo 04).

---

## 1. Quem vê o quê

| Painel | Rota | Acesso | Recorte |
|---|---|---|---|
| **Painel operacional** | `/analise/operacional` | Todos | Os números são da **empresa toda**, sem filtro por setor. Só o bloco **por técnico** é recortado: com `indicadores.ver_geral`, a pessoa vê todos; sem ela, vê **só a própria linha**. |
| **Painel financeiro** | `/analise/financeiro` | `financeiro.ver_valores` (403 sem ela) | Empresa toda. |

O período dos gráficos mensais é sempre **os últimos 12 meses**, contados até o mês atual.

---

## 2. Painel operacional

| Bloco | O que mostra | Como é calculado |
|---|---|---|
| **Vendas (OS)** | Total, concluídas, não concluídas e em aberto; abertas e concluídas por mês; mês atual × mês anterior. | "Aberta no mês" usa a **data da venda**. "Em aberto" é toda OS que não está concluída nem cancelada. |
| **Serviços** | Concluídos por mês, os itens do catálogo mais vendidos (quantidade e %) e a distribuição por status. | Pelo status calculado do serviço (módulo 03). |
| **Tarefas** | Distribuição por status e concluídas por mês. | Pela data de término. |
| **Tempos médios** | Da criação ao encerramento da OS, com a distribuição em faixas; da criação à conclusão da OS; do início ao fim do serviço; da criação ao início da tarefa (o tempo de espera); e o tempo médio por item do catálogo. | Médias em dias, só com os registros que têm as duas datas. |
| **Cancelamento** | Taxa de tarefas e de serviços cancelados no período, e a taxa por item do catálogo. | Canceladas ÷ total do período. Hoje não há como cancelar um serviço (módulo 02), então a taxa de serviços reflete dados antigos. |
| **Cumprimento de prazo** | Percentual de tarefas concluídas **dentro do prazo**. | Só as tarefas concluídas que têm prazo. "No prazo" é término ≤ prazo. |
| **Por técnico** | Por pessoa: tarefas concluídas, abertas, atrasadas e de alta prioridade; tempo médio de execução; % no prazo; e concluídas por mês. | Os KPIs usam o histórico completo; o gráfico mensal usa os últimos 12 meses. Recorte: seção 1. |

O painel também traz números das OS operacionais, que estão **fora do escopo** desta documentação.

---

## 3. Painel financeiro

| Indicador | O que é |
|---|---|
| **Faturado** | Soma do valor das OS com lançamento registrado. |
| **A faturar** | Soma das OS liberadas e ainda sem lançamento. |
| **Previsão** | Soma das OS ainda não liberadas (as canceladas ficam de fora). |
| **Ticket médio** | Valor médio das vendas. |
| **Por tipo de condição** | A faturar, faturado e previsão, separados em à vista e parcelado. |
| **Vendas por mês** | Soma do valor vendido por mês, pela data da venda. |
| **Clientes** | Os 5 que mais pagaram (faturado) e os 10 com maior valor vendido. |

As três somas principais seguem exatamente as **três situações** do módulo 04 (Previsão, A faturar e Faturada). Por isso os números batem com os contadores de Cobranças.

---

## 4. Endpoints

| Painel | Endpoint |
|---|---|
| Operacional | `GET /api/analise/operacional/` |
| Financeiro | `GET /api/analise/financeiro/` |

---

## 5. Onde está no código

| Assunto | Arquivo |
|---|---|
| Endpoints | `apps/analise/views/operacional_view.py`, `financeiro_view.py` |
| Cálculos | `apps/analise/services/` (`ordens_servico.py`, `servicos.py`, `tarefas.py`, `tempos.py`, `prazo.py`, `cancelamento.py`, `produtividade.py`, `financeiro.py`) |
| Telas | Frontend: `src/features/analytics/pages/` |
