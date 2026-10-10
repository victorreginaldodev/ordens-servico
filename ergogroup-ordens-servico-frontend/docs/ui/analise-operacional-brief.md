# UI/UX Brief — Análise Operacional

> Documento para geração de UI com ferramenta de design assistida por IA.
> Contexto: sistema web interno de gestão de Ordens de Serviço — Ergogroup OS.
> Escopo deste brief: **apenas a tela de Análise Operacional** (`/dashboard/analise/operacional`, endpoint `GET /api/analise/operacional/`). Não cobre a Análise Financeira (brief próprio: `analise-financeiro-brief.md`) nem o painel operacional em tempo real do gestor (brief próprio: `gestor-operacional-brief.md`).
>
> **Este brief descreve os dados disponíveis, não a visualização.** A escolha de como representar cada bloco (contagem, série temporal, ranking, distribuição, taxa etc.) é do designer/ferramenta de IA — a única coisa fixa é o significado e o formato do dado, descritos abaixo.

---

## 1. Propósito da tela

Diferente do painel operacional do gestor (que é sobre "agora"), esta é a tela **retrospectiva**: volume, tempo, qualidade de execução e produtividade ao longo do tempo, para quem quer entender tendência e comparar períodos — não para agir em uma tarefa específica.

Não contém valores monetários nem dados de cliente ranqueados por valor (isso é exclusivo da Análise Financeira). Contém volume, tempo, taxas de cancelamento/cumprimento de prazo e produtividade por técnico.

---

## 2. Quem acessa e o que cada perfil vê

**Disponível para qualquer perfil autenticado** — não há bloqueio de tela inteira como na Análise Financeira.

A única segmentação de dado dentro da própria resposta é o bloco `por_tecnico`:

| Perfil | O que vê em `por_tecnico` | O que vê no resto da resposta |
|---|---|---|
| Técnico | **Apenas a própria linha** (um item no array) | Todos os totais agregados da empresa, normalmente (contagens, séries mensais, taxas) |
| Todos os demais perfis (Líder/Sub-Líder Técnico, Comercial, Financeiro, Administrativo, Diretor etc.) | **Todas as linhas** — uma por técnico, permitindo comparação entre pessoas | Idêntico |

Ou seja: os blocos de volume/tempo/taxa são sempre **agregados de toda a empresa**, vistos por qualquer perfil. Só a produtividade individual é que alterna entre "só a minha" (Técnico) e "todo mundo" (demais perfis). Isso precisa ficar claro na tela — o Técnico não deve ter a impressão de que os números gerais (ex: total de OS) são só dele.

---

## 3. Hierarquia de entidades por trás dos dados

```
Ordem de Serviço (OS) ─┬─ Serviço ── Tarefa (responsável = técnico)
                        └─ (dados comerciais fora deste brief)

OS Operacional / Mini-OS — unidade avulsa, também atribuída a um técnico,
                            contabilizada separadamente das Tarefas
```

Um técnico acumula trabalho em duas frentes ao mesmo tempo — Tarefas (dentro de Serviço/OS) e Mini-OS avulsas — e o bloco `por_tecnico` traz as duas frentes lado a lado para cada pessoa, sem somá-las automaticamente em um único número.

---

## 4. Dados disponíveis (schema real do endpoint)

### 4.1 `ordens_servico` — volume de Ordens de Serviço

| Campo | Tipo | Descrição |
|---|---|---|
| `total` | inteiro | Total histórico de OS |
| `total_concluidas` | inteiro | Quantas já foram concluídas |
| `total_nao_concluidas` | inteiro | Quantas ainda não foram concluídas |
| `em_aberto` | inteiro | Quantas estão abertas neste momento (fotografia atual, não histórico) |
| `abertas_por_mes` | array de `{ano, mes, total}` | Quantidade de OS abertas por mês |
| `concluidas_por_mes` | array de `{ano, mes, total}` | Quantidade de OS concluídas por mês |
| `abertas_mes_atual` / `abertas_mes_anterior` | inteiro / inteiro | Par para comparação direta entre o mês corrente e o anterior |
| `concluidas_mes_atual` / `concluidas_mes_anterior` | inteiro / inteiro | Mesmo padrão de comparação, para conclusões |

`abertas_por_mes`/`concluidas_por_mes` são séries cronológicas (não há garantia documentada de quantos meses vêm — trate como uma janela de histórico corrida, mais recente por último).

### 4.2 `servicos` — os itens de catálogo executados dentro das OS

| Campo | Tipo | Descrição |
|---|---|---|
| `concluidos_ultimos_12_meses_total` | inteiro | Total de serviços concluídos nos últimos 12 meses |
| `concluidos_por_mes` | array de `{ano, mes, total}` | Série mensal de conclusões |
| `por_status` | array de `{status, status_display, total}` | Distribuição atual dos serviços por status (aberto / em_andamento / concluída / cancelado) |
| `principais_por_quantidade` | array de `{catalogo_id, catalogo_nome, total, percentual}` | Ranking dos itens de catálogo mais executados, com o percentual que cada um representa do total |

`percentual` em `principais_por_quantidade` pode ser `null` — trate como "sem base de cálculo", não como zero.

### 4.3 `tarefas` — nível mais granular de execução

| Campo | Tipo | Descrição |
|---|---|---|
| `por_status` | array de `{status, status_display, total}` | Distribuição atual das tarefas por status |
| `concluidas_por_mes` | array de `{ano, mes, total}` | Série mensal de tarefas concluídas |

### 4.4 `minios` — Ordens de Serviço Operacionais (unidade avulsa)

| Campo | Tipo | Descrição |
|---|---|---|
| `total` | inteiro | Total histórico de Mini-OS |
| `total_revisao_cliente` | inteiro | Quantas foram abertas a pedido de revisão do cliente (subconjunto do total) |
| `criadas_por_mes` / `finalizadas_por_mes` | array de `{ano, mes, total}` | Séries mensais de criação e finalização |
| `criadas_mes_atual` / `criadas_mes_anterior` | inteiro / inteiro | Par de comparação mês a mês |
| `finalizadas_mes_atual` / `finalizadas_mes_anterior` | inteiro / inteiro | Par de comparação mês a mês |
| `revisoes_por_cliente` | array de `{cliente_id, cliente_nome, total, percentual}` | Ranking de clientes que mais geram Mini-OS de revisão — sinal de possível insatisfação recorrente, não é dado de venda |

`revisoes_por_cliente` é sobre **volume de revisão**, não sobre dinheiro — não confundir com os rankings de cliente da Análise Financeira.

### 4.5 `tempos_medios` — quanto tempo cada etapa está levando

| Campo | Tipo | Descrição |
|---|---|---|
| `os_criacao_para_encerramento_dias` | número (dias), pode ser `null` | Tempo médio da criação da OS até o encerramento (inclui canceladas) |
| `os_criacao_para_conclusao_dias` | número (dias), pode ser `null` | Tempo médio da criação até a conclusão (só concluídas com sucesso) |
| `os_total_com_data` | inteiro | Quantas OS entraram nesse cálculo — é o "tamanho da amostra" por trás das duas médias acima |
| `servicos_inicio_para_fim_dias` | número (dias), pode ser `null` | Tempo médio de execução de um Serviço, do início ao fim |
| `tarefa_criacao_para_inicio_dias` | número (dias), pode ser `null` | Tempo médio entre a tarefa ser criada e efetivamente começar (mede fila/atraso de início, não execução) |
| `os_distribuicao_tempo` | objeto `{ate_7, de_8_a_15, de_16_a_30, de_31_a_60, acima_60}` (todos inteiros) | Quantas OS caem em cada faixa de dias de duração — os 5 números juntos formam a distribuição completa (a soma dos 5 é o total de OS com data) |
| `tempo_por_catalogo_servico` | array de `{catalogo_id, catalogo_nome, horas_estimadas (nullable), complexidade (nullable, 1–3), total_concluidos, media_dias}` | Por item de catálogo de Serviço: quanto tempo real está levando, comparável com a estimativa de horas cadastrada |
| `tempo_por_catalogo_oso` | mesmo formato de `tempo_por_catalogo_servico` | Idêntico, mas para o catálogo de Mini-OS (OS Operacional) |

`os_distribuicao_tempo` é o único campo que já vem pré-quebrado em faixas fixas (bucket) — as demais médias são números soltos, sem essa quebra.

### 4.6 `taxa_cancelamento` — o que está sendo cancelado

| Campo | Tipo | Descrição |
|---|---|---|
| `tarefas` | `{total, canceladas, percentual (nullable)}` | Taxa de cancelamento de tarefas |
| `servicos` | `{total, canceladas, percentual (nullable)}` | Taxa de cancelamento de serviços |
| `por_catalogo` | array de `{catalogo_id, catalogo_nome, total, canceladas, percentual (nullable)}` | Mesma métrica, quebrada por item de catálogo — permite identificar se algum serviço específico do catálogo cancela desproporcionalmente mais que os outros |

`total` aqui é a base de cálculo (tudo que passou por aquele catálogo/entidade), `canceladas` é o subconjunto, `percentual` é a razão entre os dois — pode vir `null` quando `total` for baixo demais para o backend calcular uma taxa (não é o mesmo que "0% cancelado").

### 4.7 `taxa_cumprimento_prazo` — quanto está sendo entregue dentro do prazo

| Campo | Tipo | Descrição |
|---|---|---|
| `tarefas` | `{total_com_prazo, no_prazo, percentual (nullable)}` | Cumprimento de prazo das tarefas que tinham prazo definido |
| `minios` | mesmo formato | Cumprimento de prazo das Mini-OS |

Mesma lógica de base/subconjunto/taxa do bloco anterior. Só entram no cálculo itens que **tinham prazo definido** (`total_com_prazo`, não o total geral) — itens sem prazo ficam de fora dessa conta.

### 4.8 `por_tecnico` — produtividade individual (array, uma linha por técnico)

| Campo | Tipo | Descrição |
|---|---|---|
| `tecnico_id` | inteiro | Identificador |
| `tecnico_nome` | string, nullable | Nome |
| `tarefas_concluidas` | inteiro | Total histórico de tarefas concluídas por essa pessoa |
| `tempo_medio_tarefa_dias` | número, nullable | Tempo médio que essa pessoa leva por tarefa |
| `complexidade_media_concluidas` | número, nullable | Complexidade média (escala 1–3) das tarefas que essa pessoa concluiu — indica se a pessoa está pegando trabalho mais simples ou mais complexo em média |
| `horas_estimadas_entregues` | decimal | Soma das horas estimadas (de catálogo) do que essa pessoa já entregou — é uma medida de volume ponderado pelo tamanho do serviço, não horas realmente trabalhadas |
| `mini_os_concluidas` | inteiro | Total histórico de Mini-OS concluídas |
| `tarefas_em_aberto` / `mini_os_em_aberto` | inteiro / inteiro | Carga atual (não histórico) — quanto essa pessoa tem em aberto agora, nas duas frentes |
| `tarefas_atrasadas` / `mini_os_atrasadas` | inteiro / inteiro | Dentro do que está em aberto agora, quanto já passou do prazo |
| `tarefas_alta_prioridade_abertas` / `mini_os_alta_prioridade_abertas` | inteiro / inteiro | Dentro do que está em aberto agora, quanto é prioridade alta |
| `tarefas_concluidas_por_mes` / `mini_os_concluidas_por_mes` | array de `{ano, mes, total}` cada | Série mensal de conclusões, por pessoa — permite comparar a evolução de uma pessoa ao longo do tempo, não só o total acumulado |
| `taxa_cumprimento_prazo_tarefas` / `taxa_cumprimento_prazo_minios` | número (0–100 ou 0–1, nullable) | Taxa de cumprimento de prazo individual, mesmo conceito da seção 4.7 mas por pessoa |

Este bloco mistura **histórico** (`tarefas_concluidas`, `tempo_medio_tarefa_dias`, séries mensais) com **estado atual** (`tarefas_em_aberto`, `tarefas_atrasadas`, `tarefas_alta_prioridade_abertas`) na mesma linha — são naturezas diferentes de dado sobre a mesma pessoa, vale deixar essa distinção legível.

---

## 5. Particularidades importantes do dado

- **Nulo ≠ zero.** Vários campos (`percentual`, médias de tempo, `complexidade_media_concluidas`, taxas de cumprimento de prazo) vêm `null` quando não há base de cálculo suficiente (ex.: nenhum item cancelado ainda, ninguém com prazo definido). Isso é um estado de "sem dado", diferente de "a taxa é 0%".
- **Comparação de período já vem pronta** em vários blocos (`*_mes_atual` / `*_mes_anterior`) — o backend já entrega o par, não é preciso calcular a variação a partir da série mensal completa.
- **Rankings vêm com `percentual` de participação já calculado** (`principais_por_quantidade`, `revisoes_por_cliente`, `por_catalogo` de cancelamento) — o percentual é relativo ao total daquele bloco específico, não ao total geral da empresa.
- **Duas frentes de trabalho técnico** (Tarefa e Mini-OS) aparecem sempre como campos irmãos, nunca somados pelo backend — qualquer soma "carga total da pessoa" é responsabilidade da UI, se fizer sentido.
- **Amostra variável por métrica de tempo**: `os_total_com_data` é a única indicação explícita de tamanho de amostra; as demais médias de tempo (`servicos_inicio_para_fim_dias`, `tarefa_criacao_para_inicio_dias`, `media_dias` por catálogo) não vêm acompanhadas do tamanho da amostra que as gerou, exceto `total_concluidos` dentro de cada item de `tempo_por_catalogo_*`.
- **Sem dado de cliente ranqueado por valor, sem R$ em lugar nenhum deste endpoint** — qualquer necessidade financeira pertence exclusivamente ao brief de Análise Financeira.

---

## 6. Design tokens do projeto

*(mesmo design system usado nas demais telas do produto — ver `gestor-operacional-brief.md` seção 8 para a tabela completa de cores/tipografia/sombras. Resumo abaixo.)*

- **Tipografia**: Plus Jakarta Sans; pesos 400/500/600/700/800
- **Cor de marca**: teal `173 50% 38%` (light) / mesmo tom, contexto mais escuro (dark)
- **Fundo/cartão/borda**: seguem os tokens `--background`, `--card`, `--border`, `--muted-foreground` já documentados nos outros briefs
- **Cor de status** (Serviço/Tarefa): aberto = vermelho, em andamento = amarelo, concluído = verde, cancelado = cinza
- **Cor de prioridade**: alta = vermelho forte, média = amarelo, baixa = neutro
- Layout primário: desktop (1280px+); precisa funcionar em tablet (768px)

---

## 7. O que a tela precisa resolver (sem prescrever o formato)

1. Deixar claro, em qualquer ponto da tela, se um número é **histórico acumulado**, **do mês corrente**, ou **estado atual (agora)** — os três tipos convivem na mesma resposta e não podem ficar visualmente indistinguíveis.
2. Tratar o estado "sem dado suficiente" (`null`) de forma diferente de "zero" em qualquer lugar onde isso aparecer.
3. Deixar explícito, no bloco de produtividade por técnico, que o Técnico está vendo só a própria linha — e que os demais perfis estão vendo todo mundo.
4. Os pares `_mes_atual`/`_mes_anterior` existem para comunicar variação — a tela deveria aproveitar esse par pronto em vez de obrigar o usuário a comparar dois pontos numa série longa.
5. As duas frentes de trabalho (Tarefa vs. Mini-OS) precisam ser reconhecíveis como conceitos distintos sempre que aparecerem lado a lado — não fundir os rótulos.

---

## 8. Entregáveis esperados da ferramenta de design

- [ ] Layout completo da página em light mode
- [ ] Layout completo em dark mode
- [ ] Variante para o perfil Técnico (produtividade individual, resto igual)
- [ ] Variante para os demais perfis (produtividade comparativa entre todos os técnicos)
- [ ] Estado com valores `null`/sem base de cálculo em pelo menos um bloco de taxa
- [ ] Estado de loading (skeleton)
