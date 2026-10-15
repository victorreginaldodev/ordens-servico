# Design System — Tabelas e Listagens (Ergogroup OS)

> Extensão de [`design-system.md`](./design-system.md) (cor, tipografia, espaçamento). Aqui ficam as regras de **listagem**: anatomia, tipos de coluna, densidade, paginação, filtros, estados e o mapa de colunas de cada tela.
> Wireframe navegável: [`wireframes/listagens.html`](./wireframes/listagens.html) (abrir no navegador).
>
> **Vigente** = já é assim no código. **Proposto** = recomendado, ainda não implementado.

---

## 0. Premissa: a listagem é um índice, não um painel

O produto é usado por técnicos de campo, engenheiros e gestores de SST (segurança do trabalho, ergonomia, higiene ocupacional), além de comercial e financeiro. Para todos eles, uma listagem responde **uma** pergunta:

> **"Qual é o registro que eu procuro?"**, e leva até ele com um clique.

Ela **não** responde "o que eu tenho que fazer hoje?", "o que chegou de novo?" ou "quem está sobrecarregado?". Essas perguntas são da líder técnica e pertencem ao **Painel do setor** (dashboard, próxima etapa, ver `briefing-sprint-setores.md` §4.4).

A listagem de OS atual tenta responder as duas coisas e por isso ficou pesada:

| Hoje na listagem de OS | Para onde vai |
|---|---|
| Contadores de tarefas por OS ("Minhas tarefas": novas/andamento/atrasadas) | Painel do setor / Minhas tarefas |
| Badges de "Serviços relacionados" | Hub de detalhe da OS (já existe lá) |
| Borda vermelha lateral por urgência + pill colorida de dias + legenda em 10px | Uma única coluna **Prazo** com estado (§3.5) |
| Ordenação fixa por status, sem escolha do usuário | Ordenação por coluna (§6) |

**Consequência prática:** a linha volta a ter de 5 a 7 colunas, cabem de 2 a 3 vezes mais linhas na tela, e o olho encontra o que procura.

---

## 1. Diagnóstico das listagens atuais (outubro/2026)

| Problema | Onde | Efeito para o usuário |
|---|---|---|
| **10 linhas por página** (`PAGE_SIZE = 10` / `itemsPerPage = 10`), sem opção de mudar | 8 das 9 listagens | "Não consigo listar muita coisa." Com 143 OS são 15 páginas |
| Os dados **já estão todos em memória**: o backend não pagina (sem `pagination_class`) e o front fatia no cliente | OS, OS operacionais, catálogos, usuários, contatos | Mostrar 50 ou 100 linhas custa **zero** requisições extras. O limite de 10 é só uma escolha de UI |
| ~~Exceção: Clientes faz **1 requisição de detalhe por linha**~~ (resolvido em 14/10/2026, §12) | Clientes | — |
| Sem ordenação por coluna | Todas | Não dá para pedir "prazo mais próximo primeiro" ou "maior valor" |
| Filtros e página não ficam na URL | Todas | Voltar do detalhe da OS perde filtro e página. Não dá para mandar um link "OS atrasadas" para alguém |
| Linha clicável via `onClick`, sem `<a>` | Todas | Sem Ctrl+clique / abrir em nova aba, sem navegação por teclado |
| Cabeçalho `text-[11px] uppercase tracking-widest` copiado 39×; paginação copiada 8× | Todas | Inconsistência e manutenção cara |
| Nome do cliente forçado em `uppercase` | OS, OS operacionais | Caixa alta reduz a legibilidade em nomes longos de razão social |

---

## 2. Anatomia padrão

Toda listagem segue a mesma estrutura, de cima para baixo:

```
┌ PageHeader ──────────────────────────────────────────────────────────┐
│ Título  [contagem]                                   [Ação primária] │
│ Descrição curta                                                      │
├ Visões ──────────────────────────────────────────────────────────────┤
│ Todas 143 · Em aberto 38 · Atrasadas 7 · Concluídas 92               │
├ Toolbar ─────────────────────────────────────────────────────────────┤
│ [🔍 Buscar…]  [+ Status] [+ Prioridade] [+ …]   [Colunas] [Densidade]│
│ Filtros ativos: (Status: Aberta ✕) (Prioridade: Alta ✕)  Limpar      │
├ Tabela ──────────────────────────────────────────────────────────────┤
│ Cabeçalho fixo (sticky), ordenável                                   │
│ Linhas                                                               │
├ Rodapé ──────────────────────────────────────────────────────────────┤
│ 1–50 de 143          Linhas por página [50 ▾]       ‹  1 2 3  ›      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Visões** são atalhos de filtro com contagem, **definidas por tela** (§10). Não são dashboard: só preenchem os filtros. A contagem ajuda a pessoa a se orientar ("7 atrasadas") sem virar painel.
- Toolbar, tabela e rodapé ficam **dentro de uma única moldura** (`border rounded-lg`) para a tabela não parecer desconectada dos próprios controles.
- Se houver só uma visão relevante, a faixa de visões não aparece.

---

## 3. Tipos de coluna

Cada coluna de qualquer tabela é **um** destes tipos. O tipo define alinhamento, formatação, largura e célula vazia. É isso que torna todas as tabelas "da mesma família".

| Tipo | Exemplo | Alinhamento | Formato | Largura |
|---|---|---|---|---|
| **Registro** (coluna principal) | `Metalúrgica Paraná Ltda` + `OS 1042 · 12.345.678/0001-90` | esquerda | linha 1: `text-sm font-medium`; linha 2: `text-xs text-muted-foreground`, nº com `tabular-nums` | flexível, mín. 240px |
| **Status** | `● Em andamento` | esquerda | `StatusBadge` subtle com ícone (§3.1) | 140px |
| **Prioridade** | `⇈ Alta` | esquerda | ícone + texto, sem badge (§3.2) | 100px |
| **Prazo** | `14/10/26` · `3 dias atrasada` | esquerda | data + estado relativo (§3.3) | 140px |
| **Data** | `02/10/2026` | esquerda | `dd/mm/aaaa`, `tabular-nums` | 110px |
| **Pessoa** | `(MS) Mariana S.` | esquerda | avatar 20px + primeiro nome e inicial do sobrenome | 160px |
| **Moeda** | `R$ 12.450,00` | **direita** | `Intl` pt-BR, `tabular-nums`, `font-medium`. Oculta por perfil via `MoneyText` | 130px |
| **Número / horas** | `12,5 h` | **direita** | `tabular-nums`, vírgula decimal | 90px |
| **Nível** (complexidade 1–3) | `▮▮▯ Média` | esquerda | medidor de 3 barras + texto | 110px |
| **Booleano** | `✓ Vigente` | esquerda | ícone + texto quando verdadeiro; `—` quando falso | 100px |
| **Situação cadastral** | `Ativo` / `Inativo` | esquerda | texto; inativo em `muted-foreground` + linha com opacidade 70% | 90px |
| **Texto longo** | descrição do catálogo | esquerda | 1 linha, `truncate`, tooltip com o texto completo | flexível |
| **Contato** | `contato@empresa.com.br` | esquerda | `text-sm`, clicável (`mailto:` / `tel:`) sem abrir a linha | 200px |
| **Ações** | `⋯` | direita | menu da linha (§7.3) | 48px |

### Regras gerais de célula

- **Vazio = `—`** em `muted-foreground`, sempre. Nunca "N/A", "null", "Não informado" ou célula em branco.
- **Nenhuma** célula em caixa alta. Dados aparecem como foram cadastrados.
- **Uma informação por coluna.** Se há espaço, cada dado ganha a própria coluna (ex.: nome e e-mail, setor e função). Juntar dois dados numa célula (título + subtítulo) é recurso para quando falta largura, não o padrão. *(Decisão de 10/10/2026.)*
- **No máximo 2 linhas** por célula: na coluna Registro (quando houver subtítulo) e em colunas de lista curta, como os setores de uma pessoa. As demais têm 1 linha.
- **No máximo 1 badge** por célula. Se precisa de dois, é informação demais para a listagem.
- Documentos e números de identificação **sempre formatados**: CNPJ `12.345.678/0001-90`, CPF `123.456.789-00`, telefone `(41) 99999-0000`.
- Números, datas e moeda **sempre** com `tabular-nums`, para as colunas alinharem verticalmente.

### 3.1 Status

Usa as famílias de feedback do [`design-system.md` §2.4](./design-system.md). Badge **subtle** (`bg-*-subtle text-*-strong`) com ícone:

| Valor (OS / Serviço / Tarefa / OSO) | Família | Ícone |
|---|---|---|
| `aberta` / `aberto` / `nao_iniciado` | warning | `CircleDashed` |
| `em_andamento` | info | `CircleDot` |
| `concluida` / `finalizada` | success | `CircleCheck` |
| `cancelada` / `cancelado` | neutro (`muted`) | `CircleSlash` |

> Mudança em relação ao design system geral: **cancelada vira neutra**, não vermelha. Em listagem, vermelho deve significar "precisa de atenção" (atraso, prioridade alta). Uma OS cancelada é um estado final e não pede ação. Pintá-la de vermelho compete com o que realmente é urgente.

### 3.2 Prioridade

Sem badge, porque badge demais vira ruído. Usa ícone + texto colorido:

| Valor | Visual |
|---|---|
| alta | `ChevronsUp` + "Alta" em `danger-strong`, `font-medium` |
| média | `ChevronUp` + "Média" em `warning-strong` |
| baixa | `Minus` + "Baixa" em `muted-foreground` |

### 3.3 Prazo

Substitui a combinação atual de "Em aberto" (pill + legenda) com a borda vermelha lateral. Uma célula com a data e, se relevante, o estado:

| Situação | Linha 1 | Linha 2 |
|---|---|---|
| Sem prazo | `—` | n/a |
| No prazo, > 3 dias | `14/10/26` | n/a |
| Vence em ≤ 3 dias | `14/10/26` | `vence em 2 dias` (`warning-strong`) |
| Vence hoje | `09/10/26` | `vence hoje` (`warning-strong`, `font-medium`) |
| Atrasada | `02/10/26` | `7 dias atrasada` (`danger-strong`, `font-medium`) com ícone `AlertTriangle` |
| Concluída / cancelada | `14/10/26` | n/a (atraso não importa mais) |

A **idade** da OS (`dias_em_aberto`) vira uma coluna opcional "Aberta há", oculta por padrão. O sinal de urgência para quem lista é o prazo; a idade serve para análise, e análise mora em Analytics.

---

## 4. Densidade

| Modo | Altura da linha (1 linha / 2 linhas) | Padding da célula | Uso |
|---|---|---|---|
| **Confortável** *(padrão)* | 44px / 56px | `px-3 py-2.5` | Uso geral |
| **Compacta** | 36px / 44px | `px-3 py-1.5` | Quem precisa ver muitas linhas: financeiro, liderança técnica |

- Alternável na toolbar (ícone `Rows3` / `Rows4`) e **lembrada por usuário** (`localStorage`, chave `table:density`).
- Tipografia não muda entre os modos, só o espaçamento vertical.

---

## 5. Paginação

| Regra | Valor |
|---|---|
| Linhas por página (padrão) | **50** |
| Opções | 25 · 50 · 100 |
| Preferência | lembrada por tabela (`localStorage`, chave `table:<id>:pageSize`) |
| Rodapé | `1–50 de 143` à esquerda; seletor e navegação à direita |
| Navegação | `‹ 1 … 4 5 6 … 15 ›`, componente **único** `DataTablePagination` |
| Ao mudar filtro ou busca | volta para a página 1 |
| Página ≤ 1 | rodapé mostra só a contagem |

Por que 50: com densidade confortável, 50 linhas equivalem a umas 3 telas de rolagem. Combinado com o cabeçalho fixo, é o equilíbrio entre "ver muita coisa" e "não perder o contexto". Para mais que isso, a ferramenta certa é o filtro.

> Scroll infinito **não** é recomendado aqui. Os usuários voltam do detalhe da OS para a lista o tempo todo e precisam cair no mesmo lugar, e a paginação na URL resolve isso de forma simples.

---

## 6. Ordenação

- Cabeçalho clicável com indicador `ArrowUp` / `ArrowDown`. Os cliques alternam: ascendente → descendente → padrão da tabela.
- Só uma coluna de ordenação por vez.
- Cada tabela tem uma **ordenação padrão** que faz sentido no domínio (§10).
- Ordenação de texto usa `localeCompare('pt-BR')` (acentos corretos). Valores vazios vão sempre para o fim.

---

## 7. Busca, filtros e interação

### 7.1 Busca
- Um campo, à esquerda da toolbar, com placeholder que diz **o que** é buscado (`Buscar por cliente, nº da OS ou CNPJ`).
- Debounce de 250ms. Busca ignora acentos e caixa.
- Atalho `/` foca a busca da tabela. O `Ctrl K` continua sendo a busca global.

### 7.2 Filtros
- **Filtros facetados** (botão `+ Status` → popover com checkboxes e a **contagem** de cada opção). Padrão shadcn "faceted filter".
- Filtros ativos viram **chips** removíveis abaixo da toolbar, mais "Limpar filtros".
- Filtros visíveis variam por perfil (regra do brief de listagem), mas **a posição e o estilo nunca mudam**.
- **Estado na URL** (`?status=aberta&prioridade=alta&page=2&sort=prazo`). Voltar do detalhe preserva tudo e permite compartilhar o link.

### 7.3 Linha
- A linha inteira é um `<a>` real (via `Link` com overlay). Clique abre o detalhe; **Ctrl/⌘+clique ou botão do meio abre em nova aba**.
- Navegável por teclado: `Tab` foca a linha, `Enter` abre.
- Hover: `bg-muted/50`. Foco: `ring-2 ring-ring ring-inset`.
- Ações secundárias (editar, registrar cobrança, desativar) ficam no menu `⋯` no fim da linha, **sempre visível** (em opacidade reduzida até o hover). Botão que só aparece no hover não existe no tablet.
- Links internos à célula (e-mail, telefone) não disparam a navegação da linha.

### 7.4 Colunas
- Menu **Colunas** na toolbar para mostrar/ocultar colunas opcionais, lembrado por usuário.
- Cada coluna tem **prioridade responsiva**:
  - **P1**: sempre visível.
  - **P2**: oculta abaixo de 1280px.
  - **P3**: oculta por padrão, liga pelo menu Colunas.
- Coluna Registro fica **fixa à esquerda** quando há rolagem horizontal.

---

## 8. Estados

| Estado | Comportamento |
|---|---|
| **Carregando (primeira vez)** | Skeleton com a estrutura real das colunas, 10 linhas, mesma altura da densidade escolhida |
| **Atualizando (refetch)** | Mantém os dados na tela e mostra uma barra fina de progresso no topo da moldura. Nunca volta para skeleton |
| **Vazio, sem dados** | `EmptyState`: ícone + "Nenhuma OS cadastrada ainda" + ação primária (se o perfil puder criar) |
| **Vazio, por filtro** | "Nenhum resultado para esses filtros" + botão **Limpar filtros**. Mensagem diferente do caso anterior |
| **Vazio, por escopo de perfil** | Técnico: "Nenhuma OS com tarefas suas no momento" (sem botão de limpar, porque o escopo é automático) |
| **Erro** | "Não foi possível carregar as ordens de serviço" + **Tentar novamente**. Sem mensagem técnica crua |
| **Sem permissão** | Coluna simplesmente não existe. Nunca mostrar coluna com cadeado ou `***` |

---

## 9. Especificação visual

| Elemento | Classes / valor |
|---|---|
| Moldura | `rounded-lg border bg-card` (sem `Card` + `CardContent p-0` em volta) |
| Cabeçalho | `bg-secondary`, `h-10`, texto `text-xs font-semibold uppercase tracking-wide text-muted-foreground`: **caixa alta** (decisão de 10/10/2026, substitui o sentence case). Só o cabeçalho: os dados das células continuam como foram cadastrados |
| Cabeçalho ordenável | `hover:text-foreground`, ícone `size-3.5` |
| Linha | `border-b last:border-0`, sem zebra |
| Linhas de grade | Divisória vertical entre colunas de dados: `border-l border-border/70`, sem divisória na primeira coluna nem na coluna de ações. Padrão do `DataTable` (`gridLines`, desligável). Ajuda a separar colunas de texto vizinhas, que sem ela se leem como uma frase só. *(Decisão de 10/10/2026.)* |
| Linha inativa (cadastro desativado) | `opacity-70` + situação "Inativo" |
| Badge de status | `h-6 px-2 rounded-full text-xs font-medium gap-1.5`, ícone `size-3.5` |
| Avatar de pessoa | `size-5`, iniciais `text-2xs font-semibold` |
| Toolbar | `px-3 py-2.5 border-b gap-2`, controles `h-9` (`size="sm"`) |
| Rodapé | `px-3 py-2.5 border-t text-xs text-muted-foreground` |
| Contagem no título | `Badge` neutro `text-xs tabular-nums` |

Tom visual para SST: sóbrio e documental, como um bom laudo. Cor só onde há sinal (status, prioridade, atraso). O resto da tabela é neutro, para o sinal aparecer.

---

## 10. Mapa de colunas por tela

Legenda: **P1** sempre visível · **P2** oculta < 1280px · **P3** oculta por padrão · 💲 só para perfis com acesso financeiro.

### Ordens de serviço (`/ordens`)
| Coluna | Tipo | Prioridade |
|---|---|---|
| Cliente / OS (nome; `OS 1042 · CNPJ`) | Registro | P1 |
| Status | Status | P1 |
| Prioridade | Prioridade | P1 |
| Prazo | Prazo | P1 |
| Contrato | Booleano | P2 |
| Cobrança (`Não liberada` / `Liberada` / `Cobrada · NF 1234`) | Status (família própria, §10.1) | P2 💲 |
| Valor | Moeda | P1 💲 |
| Data da venda | Data | P3 |
| Aberta há | Número (`12 d`) | P3 |

- **Visões:** Todas · Em aberto (aberta + em andamento) · Atrasadas · Concluídas.
- **Ordenação padrão:** prazo ascendente (atrasadas e próximas primeiro, sem prazo no fim).
- **Técnico:** mesmas colunas sem 💲. A visão padrão dele é "Em aberto".
- **Removido:** "Minhas tarefas" e "Serviços relacionados" (§0).

### Vendas (`/vendas`) — **Vigente** (13/10/2026)
| Coluna | Tipo | Prioridade |
|---|---|---|
| OS | Número (identificador, ordenável) | P1 |
| Cliente | Texto | P1 |
| Venda | Data | P1 |
| Vendedor (nome completo) | Pessoa | P1 |
| Andamento (`AndamentoServicos`) | próprio da tela | P1 |
| Status | Status | P1 |
| Condição | Status (família `TIPO_CONDICAO_DEFS`) | P1 💲 |
| Valor | Moeda | P1 💲 |
| Valor mensal | Moeda | P3 💲 |
| Financeiro (Previsão / A faturar / Faturada) | Status (família `SITUACAO_FINANCEIRA_DEFS`) | P1 💲 |

- **Visões:** Todas · Para distribuir · Em execução · Concluídas.
- **Filtros:** Vendedor ("Minhas vendas" no topo), Cliente (com busca), Status, Condição 💲, Financeiro 💲 e Data da venda (período).
- **Ordenação padrão:** OS decrescente (mais recente primeiro).
- O `DataTable` ganhou, opcionais: `periodFilter` (filtro por período de uma data, na URL como `f.<id>`) e `searchable` nos filtros facetados (busca dentro da lista de opções).
- **Coluna de ações com título (14/10/2026):** `actionsColumn={{ header: 'Ações', width }}` dá cabeçalho visível e largura fixa à coluna de ações. Com `renderRowAction` e `rowActions` juntos, a linha mostra a ação principal (botão discreto, contorno e ícone) **e** o menu ⋯ ao lado, sempre no mesmo lugar. Usado na execução (fluxos-e-navegacao.md §6.2.5).
- **Filtro de período reutilizável:** `SeletorDePeriodo` (kit, `BarraDeFiltros.tsx`) é o conteúdo único de qualquer filtro de data: períodos prontos em lista e, no "Personalizado", um calendário de intervalo (clica o início e o fim) com o resumo De/Até. Usado pelo `periodFilter` do `DataTable` e pelo `FiltroDePeriodo` dos painéis. Substitui os dois campos de data nativos, que não cabiam no popover.

### Visão geral (`/visao-geral`) e Painel do setor (`/setor/:id`) — **Vigente** (14/10/2026)
Uma linha por serviço. As colunas mudam com a visão (detalhe em `fluxos-e-navegacao.md` §6.2.4).

| Coluna | Tipo | Prioridade |
|---|---|---|
| Serviço (só o nome; a descrição fica no detalhe do serviço) | Texto, até 240px | P1 |
| Cliente | Texto, até 224px | P1 |
| OS (link para o resumo da venda) | Número | P1 |
| Setor (só na Visão geral) | Texto, até 160px | P1 |
| Etapa | Status (família `ETAPA_DEFS`) | P1 |
| Responsável (nomes completos) | Texto, até 192px | P1 |
| Situação (prazo e alerta, `Situacoes`) | próprio da tela | P1 |
| Na fila há · Prioridade | Número · Prioridade | P1 (só Para distribuir) |
| Outros serviços da OS | próprio da tela | P2 (só Para distribuir) |
| Concluído por · Término · Prazo | Pessoa · Data · Status | P1 (só Concluídos) |

- **Visões:** Todos · Para distribuir (padrão) · Em andamento · Atrasados · Parados · Concluídos no mês.
- **Filtros:** Setor (Visão geral), Pessoa, Cliente, Prioridade, Etapa e Data (Chegada, Prazo ou Conclusão, conforme a visão).
- **Ação na linha:** Distribuir (fila) ou Estou ciente (parado).
- **Visões de layout:** Tabela | Quadro (`renderBoard`).

### Meus serviços (`/meus-servicos`) — **Vigente** (14/10/2026)
Uma linha por tarefa: Serviço (só o nome) · Cliente · OS · Situação · Status (nos concluídos, Concluída em). Visões: Todos · Com você (padrão) · Atrasados · Vencem em 7 dias · Concluídos no mês. Filtros: Cliente, Status e Data (Prazo ou Conclusão). Ações Iniciar e Concluir. Tabela | Quadro.

### OS operacionais (`/ordens/operacionais`)
| Coluna | Tipo | Prioridade |
|---|---|---|
| Cliente / OSO (nome; `OSO 318 · Recebida 02/10/26`) | Registro | P1 |
| Serviço (catálogo operacional) | Texto | P1 |
| Responsável | Pessoa | P1 |
| Status | Status | P1 |
| Prazo | Prazo | P1 |
| Qtd. | Número | P2 |
| Horas est. | Número | P3 |
| Revisão do cliente | Booleano | P2 |
| Cobrança | Status | P2 💲 |

- **Visões:** Todas · Não iniciadas · Em andamento · Finalizadas.
- **Ordenação padrão:** prazo ascendente.

### Cobranças (`/cobrancas`)
Hoje o título da página é "Financeiro", que colide com *Análise › Financeiro*. **Renomear para "Cobranças"**, igual ao menu.

Duas abas (`Tabs`) com a mesma estrutura: **OS** | **OS operacionais**.

| Coluna | Tipo | Prioridade |
|---|---|---|
| Cliente / OS | Registro | P1 |
| Situação (`Liberada` / `Cobrada`) | Status | P1 |
| Liberada em | Data | P1 |
| Liberada por | Pessoa | P2 |
| NF | Número | P1 |
| Data da cobrança | Data | P2 |
| Valor *(só aba OS, a OSO não tem valor)* | Moeda | P1 |
| Ações (`Registrar cobrança`) | Ações | P1 |

- **Visões:** A cobrar (liberadas não cobradas) · Cobradas · Todas.
- **Ordenação padrão:** liberada em ascendente (o que espera há mais tempo primeiro).
- **Rodapé com total:** `Total da página: R$ 48.900,00`, porque o financeiro precisa da soma.

### Clientes (`/clientes`) — **Vigente** (14/10/2026)
| Coluna | Tipo | Prioridade |
|---|---|---|
| Cliente (nome como foi cadastrado) | Registro | P1 |
| Documento (`CNPJ 12.345.678/0001-90`) | Texto, `tabular-nums` | P1 |
| Tipo (Gestão / Avulso / Fornecedor) | Texto | P1 |
| Representante (nome completo) | Texto | P1 |
| E-mail do representante | Contato | P2 |
| Contato do representante | Contato (telefone) | P3 |
| Setor do representante | Texto | P3 |
| Cliente desde | Data | P2 |
| Cobra revisão | Booleano | P2 |
| Situação | Situação cadastral | P1 |

- **Visões:** Ativos · Inativos · Todos. Padrão: Ativos.
- **Filtros:** Tipo, Documento (tipo de inscrição), Cobra revisão, Representante (com ou sem) e Cliente desde (período).
- **Ordenação padrão:** nome A–Z.
- **Linha:** abre a edição para quem tem `clientes.gerenciar`. Menu `⋯`: Editar, Ver vendas do cliente, Desativar/Reativar e Excluir (com confirmação; 409 oferece desativar). Detalhe em `fluxos-e-navegacao.md` §6.9; wireframe em [`wireframes/clientes.html`](./wireframes/clientes.html).

### Contatos (`/clientes/contacts`)
Contato (Registro: nome; cargo/setor) P1 · E-mail (Contato) P1 · Telefone (Contato) P1 · Cliente (Texto) P1. Ordenação: nome A–Z.

### Catálogo de serviços (`/catalogo`) — **Vigente**
| Coluna | Tipo | Prioridade |
|---|---|---|
| Serviço | Registro | P1 |
| Descrição | Texto longo | P2 |
| Setor responsável | Texto | P1 |
| Situação | Situação cadastral | P1 |

- **Visão padrão: cards agrupados por setor** (§13), porque o catálogo é uma lista curta de referência e a pergunta comum é "o que cada setor executa?". A tabela fica a um clique, para comparar e ordenar.
- **Visões:** Ativos · Inativos · Todos. **Filtro:** Setor. **Ordenação padrão:** nome A–Z.
- Horas estimadas e complexidade saíram do catálogo no backend (outubro/2026).

### Catálogo de OS operacionais
Ainda na listagem antiga; segue o mapa anterior até ser migrada.

### Time (`/time`, antes `/usuarios`) — **Vigente**
| Coluna | Tipo | Prioridade |
|---|---|---|
| Nome (avatar + nome) | Registro (`col.registro` com `avatar`) | P1 |
| E-mail | Contato | P1 |
| Setor (um por linha, até 2 + `+N`; "Sem setor" quando não há vínculo) | Texto | P1 |
| Função (mesma ordem da coluna Setor: a linha N de uma corresponde à linha N da outra) | Texto | P1 |
| Situação | Situação cadastral | P1 |
| No sistema desde | Data | P3 |

- **Visões:** Ativos · Inativos · Todos. **Ordenação padrão:** nome A–Z.
- **Filtros:** Setor e Função. Uma pessoa com vários vínculos conta em cada opção (faceta com `getValue` devolvendo lista).
- **Linha:** clique abre a edição para quem tem `usuarios.gerenciar`. Menu `⋯`: Editar, Desativar/Reativar e Excluir (com confirmação; 409 oferece desativar). Sem menu na própria linha e em pessoas da diretoria para quem não tem `usuarios.gerenciar_diretoria`.
- O antigo "Papel" deixou de existir: o acesso vem das funções em cada setor.

### 10.1 Família visual da cobrança
| Estado | Família | Ícone |
|---|---|---|
| Não liberada | neutro | `CircleDashed` |
| Liberada (a cobrar) | warning | `Clock` |
| Cobrada | success | `CircleCheck` + `NF 1234` como texto auxiliar |

---

## 13. Visão em cards — **Vigente**

O `DataTable` aceita `renderCard` (conteúdo do card) e, opcionalmente, `cardGroupBy` (agrupa os cards da página por um rótulo) e `defaultLayout`. Com `renderCard`, a toolbar ganha a alternância **Tabela | Cards**, e a escolha fica salva por tabela (`table:<id>:layout`).

- Busca, visões, filtros, ordenação e paginação são os mesmos nas duas visões. Nos cards, "Colunas" e "Densidade" dão lugar a um menu **Ordenar**.
- O card é clicável como a linha (mesma navegação e teclado) e tem o menu `⋯` no canto.
- Quando usar cards como padrão: listas curtas de cadastro, com poucos campos e texto livre (catálogo). Quando usar tabela: listas longas, com números, datas e comparação entre colunas (OS, cobranças, time).

## 14. Visão em quadro — **Vigente** (14/10/2026)

O `DataTable` aceita `renderBoard(rows)`: a tela desenha um quadro em colunas (ex.: kanban por etapa) com todos os registros filtrados e ordenados, sem paginação. A toolbar ganha a opção **Quadro** na alternância de visão, e a escolha fica salva por tabela (`table:<id>:layout`). Usado no Painel do setor, na Visão geral e em Meus serviços.

O `periodFilter` também aceita uma lista, para mais de um filtro de data na mesma tela.

**Texto longo não empurra colunas (14/10/2026):** a célula usa `whitespace-nowrap`, então todo texto livre numa coluna precisa de largura máxima e corte com reticências (`CellTexto` com `max-w-*`; o texto inteiro fica no `title`). Descrições longas não entram na tabela. E, quando a soma das colunas passa da largura disponível, o `DataTable` passa a rolar na horizontal em vez de cortar as colunas na moldura (antes, acima de 1280px, as colunas que não cabiam sumiam).

**Cartão do quadro** (`features/execucao/components/Quadro.tsx`, `Cartao`; redesenho de 14/10/2026, wireframe validado pelo usuário em 14/10/2026). Descrições sem conteúdo (".", "-"), comuns nos dados migrados, não aparecem (`temTexto` em `lib/format.ts`). Ordem de leitura, de cima para baixo:
1. **Cabeçalho:** `OS 1042` (etiqueta neutra), setor (só na Visão geral) e prioridade Alta ou Média à direita (Baixa não aparece);
2. **Serviço:** nome em negrito (até 2 linhas) e a descrição ou a parte da tarefa abaixo (até 2 linhas);
3. **Cliente:** com ícone, nome completo (truncado, nome inteiro no `title`);
4. **Situação:** chips de prazo e alerta (`Situacoes`) ou o resultado do prazo nos concluídos, e o tempo ("Na fila há 6 dias", em destaque a partir de 5; "Concluído em 08/10/2026"; "Iniciada em…" nas tarefas);
5. **Extra:** na fila, os outros serviços da venda (um ponto com a cor da etapa de cada um e a lista no `title`);
6. **Rodapé** (fundo levemente destacado): avatares e o nome completo do primeiro responsável ("e mais N"), ou "Sem responsável" na fila, e a ação à direita (Distribuir, Estou ciente, Iniciar, Concluir). Em Meus serviços o rodapé não repete a própria pessoa.

Faixa lateral à esquerda: vermelha para atrasado, amarela para parado. Hover eleva o cartão. Exemplo na vitrine `/ui` (desenvolvimento).

## 11. Componentes — Proposto

Base: **`@tanstack/react-table`** (headless, mesma família do TanStack Query que o projeto já usa). Resolve ordenação, visibilidade de colunas e paginação sem escrever isso à mão em cada tela. A camada visual continua sendo o `Table` do shadcn.

| Componente | Local | Responsabilidade |
|---|---|---|
| `DataTable` | `src/components/data-table/` | Moldura, cabeçalho fixo, linhas-link, densidade, estados (§8) |
| `DataTableToolbar` | idem | Busca + slots de filtro + menus Colunas/Densidade |
| `DataTableFacetedFilter` | idem | Filtro com checkboxes e contagem |
| `DataTableViews` | idem | Faixa de visões com contagem |
| `DataTableColumnHeader` | idem | Título + ordenação |
| `DataTablePagination` | idem | Rodapé (substitui as 8 cópias) |
| `useDataTableUrlState` | idem | Sincroniza filtro/ordem/página com a URL |
| Células: `CellRegistro`, `CellStatus`, `CellPrioridade`, `CellPrazo`, `CellPessoa`, `CellMoeda`, `CellData`, `CellNivel`, `CellBooleano` | `src/components/data-table/cells/` | Implementam os tipos do §3. Uma tela **só** declara colunas usando estas células |

Uma tela nova passa a ser basicamente: definição de colunas + visões + filtros. Nada de JSX de tabela.

---

## 12. Dependências de backend (fora do escopo de UI, registrar)

1. ~~**Clientes:** o serializer de listagem não traz todos os campos exibidos, e o front busca o detalhe de cada linha (N+1).~~ **Resolvido em 14/10/2026:** o `ClienteList` traz os campos da tabela, e a tela faz uma requisição só.
2. **Paginação no servidor:** hoje todas as listagens carregam tudo e paginam no cliente. Funciona com o volume atual e torna a paginação deste documento barata. Quando o volume crescer, ativar `PageNumberPagination` com `page_size_query_param` e `OrderingFilter` no DRF. Os componentes do §11 devem aceitar os dois modos (`manualPagination`).
3. **Contagens das visões:** calculadas no cliente sobre os dados carregados. Com paginação no servidor, precisarão de um endpoint de contagem ou de `count` por filtro.

---

## 13. Ordem de implementação sugerida

1. `DataTable` + células + paginação aplicados na **listagem de OS** (a tela mais usada). Validar com a líder técnica e o financeiro.
2. OS operacionais e Cobranças.
3. Cadastros (clientes, contatos, catálogos, usuários). Clientes depende do item 12.1.
4. Remover as cópias antigas de paginação e os estilos de cabeçalho duplicados.

**Ganho rápido independente de tudo isso:** trocar `PAGE_SIZE = 10` por 50 nas telas que já carregam tudo em memória (todas menos Clientes) é uma mudança de uma linha por arquivo e resolve a dor imediata de "não consigo listar muita coisa".
