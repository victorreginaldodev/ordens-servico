# UI/UX Brief — Análise Financeira

> Documento para geração de UI com ferramenta de design assistida por IA.
> Contexto: sistema web interno de gestão de Ordens de Serviço — Ergogroup OS.
> Escopo deste brief: **apenas a tela de Análise Financeira** (`/dashboard/analise/financeiro`, endpoint `GET /api/analise/financeiro/`). Complementa a Análise Operacional (brief próprio: `analise-operacional-brief.md`) — mesma área do produto, mas esta tela é exclusiva de quem tem acesso a valor monetário.
>
> **Este brief descreve os dados disponíveis, não a visualização.** A escolha de como representar cada bloco é do designer/ferramenta de IA — a única coisa fixa é o significado e o formato do dado, descritos abaixo.

---

## 1. Propósito da tela

Visão retrospectiva do dinheiro que passa pela operação: quanto já foi cobrado, quanto está represado em cada etapa do funil de cobrança, ticket médio, evolução mensal de vendas e quais clientes mais pesam — tanto em venda quanto em cobrança já realizada.

Não é uma tela de ação (não é aqui que se registra uma cobrança) — é leitura/análise. O registro de cobrança em si acontece no hub da própria Ordem de Serviço.

---

## 2. Controle de acesso — diferente do resto do produto

Este é o único endpoint de análise com **bloqueio de tela inteira**: `GET /api/analise/financeiro/` responde `403` (nenhum dado, nem parcial) para os perfis:

- Sub-Líder Técnico
- Técnico
- Gestor Administrativo
- Administrativo

Todos os outros perfis (Diretor, Líder Técnico, Comercial, Gestor Comercial, Financeiro, Gestor Financeiro) recebem a resposta completa, sem nenhum campo oculto ou mascarado dentro dela.

Isso é diferente do padrão usado no restante do produto (ex.: no hub da OS, quem não pode ver valor recebe a tela normal com o campo "Valor" simplesmente ausente/mascarado). Aqui não existe versão parcial: **ou a pessoa tem a tela inteira, ou não tem acesso a ela** — a UI precisa de um estado de acesso negado para essa rota, não de um mascaramento campo a campo.

---

## 3. Dados disponíveis (schema real do endpoint)

### 3.1 Totais do funil de cobrança

| Campo | Tipo | Descrição |
|---|---|---|
| `total_cobrado` | decimal (R$) | Soma do que já foi efetivamente cobrado |
| `total_para_cobrar` | decimal (R$) | Soma do que já está liberado para cobrança mas ainda não foi cobrado |
| `total_sem_liberacao` | decimal (R$) | Soma do que ainda nem foi liberado para cobrança |

Os três valores representam **etapas sequenciais do mesmo funil** (uma OS passa por: sem liberação → liberada/a cobrar → cobrada). Juntos, os três somam o valor total em aberto + já realizado da operação — não são três métricas independentes, são um recorte do mesmo todo em estágios diferentes.

### 3.2 Ticket médio

| Campo | Tipo | Descrição |
|---|---|---|
| `ticket_medio` | decimal (R$), nullable | Valor médio de venda por Ordem de Serviço |

Pode vir `null` quando não há base suficiente para calcular — tratar como "sem dado", não como R$ 0,00.

### 3.3 Vendas por mês

| Campo | Tipo | Descrição |
|---|---|---|
| `vendas_por_mes` | array de `{ano, mes, total}` (decimal) | Série mensal do valor total vendido |

Série cronológica corrida (mais recente por último), mesmo formato de série mensal usado na Análise Operacional, mas aqui `total` é dinheiro (decimal), não contagem (inteiro) — atenção ao formatar.

### 3.4 `clientes` — dois rankings distintos

| Campo | Tipo | Descrição |
|---|---|---|
| `clientes.mais_vendas` | array de `{cliente_id, cliente_nome, total_valor_vendas}` | Ranking de clientes por valor total vendido |
| `clientes.mais_cobranca` | array de `{cliente_id, cliente_nome, total_valor_cobrado}` | Ranking de clientes por valor total já efetivamente cobrado |

São dois recortes diferentes e podem ter ordens/composição diferentes entre si: um cliente pode comprar muito mas ainda não ter sido cobrado (apareceria alto em `mais_vendas` e baixo/ausente em `mais_cobranca`), ou o inverso, se cobranças antigas ainda estão sendo realizadas. Não presumir que as duas listas têm os mesmos clientes na mesma posição.

Nenhum dos dois vem com `percentual` de participação pré-calculado (diferente dos rankings da Análise Operacional, que trazem `percentual`) — aqui só vem o valor absoluto.

Nenhum limite de itens é documentado no schema — tratar como uma lista que pode ser curta ou longa dependendo da base de clientes.

---

## 4. Particularidades importantes do dado

- **Tudo aqui é R$** — não há contagens nem percentuais neste endpoint (exceto os dois rankings de cliente, que também não trazem percentual — só valor absoluto). Todo campo numérico deve ser tratado como moeda.
- **`total_cobrado` + `total_para_cobrar` + `total_sem_liberacao` formam um funil**, não três números soltos — a relação entre eles (quanto já foi realizado vs. quanto ainda está represado em cada etapa) é o dado mais importante deste bloco.
- **`ticket_medio` nulo é "sem dado"**, não zero.
- **Os dois rankings de cliente respondem perguntas diferentes** ("quem mais compra" vs. "quem mais já pagou") — tratar como comparação, não como uma lista única com dois nomes de coluna.
- **Tela de tudo-ou-nada**: não existe estado "parcialmente visível" para esta tela — só "acesso completo" ou "sem acesso".

---

## 5. Design tokens do projeto

*(mesmo design system das demais telas — ver `gestor-operacional-brief.md` seção 8 para a tabela completa)*

- **Tipografia**: Plus Jakarta Sans; pesos 400/500/600/700/800
- **Cor de marca**: teal `173 50% 38%`
- **Valores monetários**: fonte com `tabular-nums`, já é convenção no resto do produto para qualquer R$
- Layout primário: desktop (1280px+); precisa funcionar em tablet (768px)

---

## 6. O que a tela precisa resolver (sem prescrever o formato)

1. Comunicar os três totais do funil (`total_cobrado`, `total_para_cobrar`, `total_sem_liberacao`) como **etapas relacionadas de um mesmo processo**, não como três caixas desconectadas.
2. Diferenciar visualmente `ticket_medio` nulo de R$ 0,00, caso ocorra.
3. Apresentar os dois rankings de cliente (`mais_vendas` e `mais_cobranca`) de um jeito que deixe claro que são perguntas diferentes sobre o cliente — não uma tabela só com duas colunas de valor.
4. Cobrir o estado de **acesso negado** para quem tentar entrar nessa rota sem permissão — via navegação direta por URL, por exemplo — já que o backend devolve 403 para a tela inteira, sem dados parciais para compor uma versão "capada".

---

## 7. Entregáveis esperados da ferramenta de design

- [ ] Layout completo da página em light mode
- [ ] Layout completo em dark mode
- [ ] Estado de acesso negado (perfil sem permissão)
- [ ] Estado com `ticket_medio` nulo / sem dado suficiente
- [ ] Estado de loading (skeleton)
