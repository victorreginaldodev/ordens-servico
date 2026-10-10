# UI/UX Brief — Listagem de Ordens de Serviço

> Documento para geração de UI com ferramenta de design assistida por IA.
> Contexto: sistema web interno de gestão de Ordens de Serviço — Ergogroup OS.
> Este brief herda tipografia, cor, componentes e personas de [`identidade-visual-brief.md`](./identidade-visual-brief.md) — leia-o primeiro.
> Escopo: **apenas a listagem geral de Ordens de Serviço**, tela de entrada usada por todos os perfis. Não cobre o painel de comando do setor técnico ([`gestor-operacional-brief.md`](./gestor-operacional-brief.md)), o hub de detalhe de uma OS ([`ordem-detalhe-brief.md`](./ordem-detalhe-brief.md)) nem o dashboard de Analytics.

---

## 1. Contexto do produto

Esta é a tela que qualquer usuário autenticado vê ao entrar na área de Ordens de Serviço: uma lista/tabela de OS, com busca e filtros, cujo destino final é sempre o mesmo — abrir uma OS específica no hub de detalhe.

O desafio central desta tela é que **um único perfil de UI precisa servir públicos com necessidades muito diferentes**, sem virar nem uma planilha genérica (ruim para quem executa tarefas) nem um painel técnico carregado (ruim para quem só precisa localizar uma OS e ver seu status comercial).

---

## 2. Modelo de dados por trás da tela

```
Ordem de Serviço (OS)         — cliente, status, prioridade, prazo, dias em aberto,
                                 valor, forma de pagamento, contrato, cobrança
  └── Serviço                 — item de catálogo, status (derivado das tarefas)
        └── Tarefa            — responsável (técnico), status, prazo
```

Pontos importantes do domínio que moldam esta tela:

- **A OS não tem um "responsável técnico" próprio.** O vínculo com um técnico existe apenas no nível da Tarefa (`tarefa.responsavel`). Ou seja, "as OS de um técnico" é sempre uma consulta indireta: *OS que contêm ao menos um Serviço com ao menos uma Tarefa atribuída a ele*.
- **Status da OS** (`aberta` / `em_andamento` / `concluida` / `cancelada`) é um resultado agregado do que acontece nos Serviços e Tarefas abaixo dela — a OS raramente é editada diretamente para mudar de status.
- **Prioridade** (`baixa` / `média` / `alta`) existe tanto na OS quanto em Serviço e Tarefa — nesta tela, o que importa é a prioridade da OS.
- **`dias_em_aberto`** já vem calculado pela API — é o principal sinal de urgência disponível para qualquer perfil, sem depender de dado técnico.
- **Cobrança e faturamento têm um ciclo próprio**, independente do status operacional: `liberada_para_cobranca` → `cobranca_realizada` (com número de NF e data). Uma OS pode estar `concluida` operacionalmente e ainda não liberada/faturada.
- **Contrato** é um booleano simples na OS (`contrato: true/false`) que indica se aquela venda está vinculada a um contrato vigente (com objeto, vigência e gestor de contrato) — informação comercial/administrativa, não operacional.
- **Valores monetários são o dado mais restrito do sistema.** Ficam indisponíveis para Técnico, Sub-Líder Técnico, Gestor Administrativo e Administrativo.

---

## 3. Perfis de usuário e o que cada um precisa ver

Esta é a única tela do produto usada literalmente por **todos os 10 perfis**. A estrutura da tabela/lista é a mesma para todos — o que muda é quais colunas aparecem e quais filtros fazem sentido. Nunca desenhar layouts diferentes por perfil.

### Técnico
- Vê **apenas OS que têm ao menos uma tarefa atribuída a ele** — a listagem geral, para este perfil, é na prática "minhas OS".
- Não precisa (nem pode) ver valor, forma de pagamento, cobrança ou contrato.
- O que importa: em quais OS ele tem trabalho pendente, e qual a urgência desse trabalho. Cada linha deve comunicar, de forma compacta, quantas das suas tarefas naquela OS estão **novas/sem ação**, **em andamento** e **atrasadas** — sem virar um mini-dashboard dentro da linha.

### Líder Técnico / Sub-Líder Técnico (`gestor_tecnico`, `sub_gestor_tecnico`)
- Precisam enxergar **tudo que está no setor técnico**, com filtragem inteligente — não a listagem "achatada" de todas as OS da empresa, mas também não um dashboard completo (isso é papel do painel próprio).
- Filtros adicionais relevantes para eles: por técnico responsável, por atraso, por prioridade, por status — os mesmos eixos que usariam para decidir "o que olhar primeiro", só que aqui em formato de tabela filtrável, não de KPI.
- Líder Técnico vê valor da OS; Sub-Líder Técnico não (mesma estrutura, campo condicional — igual ao padrão do restante do produto).

### Diretor / Gestor Comercial / Comercial
- Precisam da visão comercial completa: cliente, valor, forma de pagamento, contrato, status de cobrança.
- Nenhuma necessidade de ver contagem de tarefas por técnico ou qualquer granularidade operacional — isso é ruído para este público.

### Gestor Financeiro / Financeiro
- Foco em cobrança: quais OS estão liberadas para cobrança e ainda não foram faturadas, quais já foram (com NF e data), valor.
- Filtro por cobrança realizada/liberada é o mais importante para este grupo.

### Gestor Administrativo / Administrativo
- Foco em contrato e dados cadastrais da OS (cliente, prazo, status do contrato) — **sem valores monetários**.

---

## 4. Papel desta tela no produto

A listagem é o **ponto de entrada**, não o destino. Sua função é permitir que qualquer perfil encontre rapidamente a OS relevante para o seu contexto do dia — seja "minhas tarefas" (Técnico), "o que está travado no setor" (gestão técnica) ou "o que falta faturar" (Financeiro) — e a leve, com um clique, para o hub de detalhe onde o trabalho de fato acontece.

Ela **não** deve tentar resolver o que já tem lugar próprio no produto:
- Não é um painel de KPIs do setor técnico (isso é o painel do gestor).
- Não é onde se edita uma OS, Serviço ou Tarefa (isso é o hub de detalhe).
- Não mostra tendência histórica (isso é Analytics).

---

## 5. Objetivos de design

1. **Uma tela, múltiplos públicos** — mesma estrutura visual para todos; visibilidade de coluna/filtro é o único eixo de variação
2. **Urgência é o primeiro sinal**, não o último — `dias_em_aberto`, prioridade alta e tarefas atrasadas devem ser visualmente óbvios ao rolar a lista
3. **Técnico enxerga trabalho, não burocracia** — zero dado comercial/financeiro na visão dele; o resumo de tarefas por OS deve ser lido em menos de 1 segundo por linha
4. **Filtros como ferramenta de trabalho, não como formulário** — barra de filtros compacta, combináveis, sem exigir "aplicar" para cada mudança
5. **Elegância funcional para o público não-técnico** — para Comercial/Financeiro/Administrativo/Diretor, a tela deve parecer uma tabela de gestão limpa, sem qualquer vestígio de linguagem operacional (badges de tarefa, contagem de técnico etc.)

---

## 6. Estrutura de informação da página

### Nível 1 — Barra de busca e filtros (topo, sempre visível)
- Busca textual por cliente ou observação
- Filtros combináveis, mas **renderizados por relevância de perfil**: Técnico não vê filtro de cobrança/contrato; Financeiro não vê filtro de "atrasada por técnico"
- Filtros comuns a todos: status, prioridade, período
- Filtros condicionais: cliente (todos exceto Técnico), cobrança/liberação (Comercial/Financeiro/Diretor/Administrativo), técnico responsável e atraso de tarefa (Líder/Sub-Líder Técnico)

### Nível 2 — Lista/tabela principal
Uma linha por OS. Colunas-base (todos os perfis): cliente, status, prioridade, prazo, dias em aberto.

Colunas condicionais, adicionadas conforme perfil:
- **Financeiras** (ocultas para Técnico, Sub-Líder Técnico, Gestor Administrativo, Administrativo): valor, forma de pagamento, status de cobrança
- **Contrato** (visível para Comercial, Administrativo, Financeiro, Diretor): indicador de contrato vigente
- **Resumo de tarefas do técnico** (visível apenas para Técnico e, em versão agregada, para Líder/Sub-Líder Técnico): três contadores compactos — novas/sem ação, em andamento, atrasadas

### Nível 3 — Estado vazio e paginação
- Estado vazio contextual por perfil (ex: Técnico sem tarefas atribuídas → mensagem "Nenhuma OS com tarefas suas no momento", bem diferente de um Financeiro sem resultado de filtro)
- Paginação ou scroll infinito, consistente com o padrão do restante do produto

---

## 7. Comportamentos esperados

| Ação | Quem | Como |
|------|------|------|
| Ver apenas OS com tarefas próprias | Técnico | Escopo automático da listagem, sem filtro manual |
| Filtrar por técnico responsável / atraso | Líder + Sub-Líder Técnico | Filtros adicionais na barra, não disponíveis para outros perfis |
| Ver valor e forma de pagamento | Diretor, Gestor Comercial, Comercial, Gestor Financeiro, Financeiro, Líder Técnico | Coluna condicional; oculta para os demais |
| Filtrar por status de cobrança/liberação | Diretor, Comercial, Financeiro | Filtro dedicado na barra |
| Abrir o hub da OS | Todos | Clique na linha |
| Criar nova OS | Perfis com permissão comercial (Comercial, Diretor, Gestor Comercial) | Ação no topo da tela, fora do escopo deste brief (ver hub de detalhe) |

---

## 8. Diretrizes de UX

### Urgência como primeiro filtro visual
- `dias_em_aberto` alto + prioridade alta devem se destacar na linha sem exigir leitura de texto — cor e peso tipográfico, não apenas número
- Para Técnico, uma tarefa atrasada dentro de uma OS deve pesar visualmente tanto quanto (ou mais que) o status geral da OS

### Resumo de tarefas do técnico é um selo, não uma tabela
- Os três contadores (novas/sem ação · em andamento · atrasadas) cabem em um conjunto pequeno de badges/pills na própria linha — nunca uma sub-tabela expandida
- Evitar redundância com o painel do gestor técnico: aqui é reconhecimento rápido ("tenho algo atrasado nesta OS"), não análise

### Visibilidade condicional, nunca layout condicional
- A tabela tem sempre a mesma "espinha dorsal" de colunas-base; colunas extras entram/saem, a estrutura não muda de perfil para perfil

### Densidade alta, mas escaneável
- Tabela densa (compatível com dezenas de linhas visíveis), texto secundário para metadados (data, cliente), texto primário para status/urgência

### Responsividade
- Desktop-first (1280px+); funcional em tablet (768px) com colunas menos prioritárias colapsando primeiro (contrato, forma de pagamento)

---

## 9. Componentes-chave a projetar

1. **Barra de Busca e Filtros** — busca textual + filtros combináveis, condicionais por perfil
2. **Linha de OS** — cliente, status, prioridade, prazo, dias em aberto + colunas condicionais
3. **Selo de Resumo de Tarefas** — três badges compactos (novas · em andamento · atrasadas), exclusivo da visão do Técnico
4. **Badge de Status da OS** — dot + label, consistente com o restante do produto
5. **Badge de Urgência** — "X dias em aberto", cor escalonada por severidade
6. **Indicador de Cobrança/Contrato** — ícone ou pill compacto para os perfis comerciais/financeiros
7. **Empty State** — variantes por perfil (Técnico sem tarefas vs. filtro sem resultado)
8. **Estado de loading** — skeleton de linhas de tabela

---

## 10. Ponto em aberto para validar com o negócio

- **Definição de "tarefa nova"**: o backend não distingue "nova" de "aberta/sem ação" como estados separados — ambos são o mesmo status (`aberta`). Este brief assume que "nova" é uma categoria de UX (ex: tarefa atribuída/criada nas últimas 24–48h e ainda não iniciada) para dar ao técnico um sinal de "isso acabou de cair pra mim". O critério exato precisa ser confirmado antes da implementação — na ausência de definição, tratar "novas" e "sem ação" como o mesmo contador.

---

## 11. Referências de estilo

- Ver seção 8 de [`identidade-visual-brief.md`](./identidade-visual-brief.md)
- Adicional para esta tela: tabelas de gestão densas no estilo **Linear.app** (lista de issues) e **Notion** (database view) — a mesma estrutura precisa parecer "leve" para o Comercial e "cheia de sinal" para o Técnico, sem ser duas telas diferentes

---

## 12. Entregáveis esperados da ferramenta de design

- [ ] Layout completo em light mode e dark mode
- [ ] Variante da visão do Técnico (com selo de resumo de tarefas, sem dado financeiro)
- [ ] Variante da visão do Líder/Sub-Líder Técnico (com filtros por técnico/atraso)
- [ ] Variante da visão comercial/financeira (com colunas de valor, cobrança, contrato)
- [ ] Estado vazio (por perfil) e estado de loading (skeleton)
- [ ] Detalhe do badge de urgência em pelo menos 3 níveis de severidade
