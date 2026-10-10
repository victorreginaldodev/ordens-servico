# Design System — Fundamentos (Ergogroup OS)

> **Fonte da verdade** para cor, tipografia, espaçamento, raio, elevação e movimento do frontend.
> O [`identidade-visual-brief.md`](./identidade-visual-brief.md) descreve *personas, princípios e intenção* (para ferramentas de design com IA); **este documento define os valores e as regras de código**. Em caso de conflito, vale este.
>
> Documentos irmãos: [`design-system-tabelas.md`](./design-system-tabelas.md) (listagens), [`plano-ui-kit.md`](./plano-ui-kit.md) (plano de implementação) e [`wireframes/listagens.html`](./wireframes/listagens.html).
>
> Legenda de status em cada seção:
> - **Vigente** — já é assim no código; só formaliza.
> - **Proposto** — mudança recomendada, ainda não aplicada. Precisa de aprovação antes de virar código.

---

## 0. Diagnóstico (outubro/2026)

Levantamento feito em `src/` (contagem de classes Tailwind nos `.tsx`/`.ts`):

| Aspecto | Situação | Leitura |
|---|---|---|
| Base de componentes | shadcn/ui + Radix, ~50 primitivos em `src/components/ui/` | Boa fundação, não precisa trocar |
| Cor via token (`bg-primary`, `text-muted-foreground`…) | ~1.350 usos | **84% do código já usa token** |
| Cor crua do Tailwind (`text-amber-600`, `bg-blue-500/10`…) | ~250 usos em 22 arquivos, + 56 `dark:` manuais | Concentrado em **status, prioridade e feedback** — exatamente onde faltam tokens |
| `hsl(...)` inline | `OperacionalPage`, `MonthlyBarChart`, `HorizontalBarChart`, `FinanceiroPage` | Gráficos ignorando `--chart-*` |
| Tamanho de fonte arbitrário | 11 valores diferentes: `9`, `10`, `10.5`, `11`, `11.5`, `12.5`, `13`, `13.5`, `15`, `22px`… (~170 usos) | **Maior fonte de inconsistência visual do produto** |
| Escala de fonte documentada no brief (10/12/14/16/24) | Não é seguida | Brief e código divergiram |
| Espaçamento arbitrário | `px-[22px]` (23×), `px-[18px]` (8×) | Quase todo em `OperacionalPage` |
| Raio arbitrário | `rounded-[3px]`, `[4px]`, `[5px]`, `[7px]`, `[11px]` | 5 raios fora da escala |
| Contraste (light mode) | `status-pending` como texto: **1,98:1**; `primary` com texto branco: **3,79:1** | Reprova WCAG AA (4,5:1). É por isso que o código "foge" para `amber-600`, `red-600`… |
| Botão primário | Usa `text-white` fixo, ignorando `--primary-foreground` (que é escuro) | Token e componente discordam |
| Utilitários órfãos | `gradient-text`, `gradient-border`, `glass`, `animate-float`, `animate-pulse-slow`, `animate-slide-up`, `shadow-glow`, `shadow-card`, `animate-shimmer`: **0 usos** | Herança do template Lovable |
| `src/App.css` | Boilerplate do Vite, **não é importado** | Remover |

**Conclusão:** o projeto não precisa de uma UI kit nova. Precisa (1) completar a camada de tokens onde ela tem buracos (feedback/status), (2) **restringir** a escala do Tailwind e (3) proibir valores arbitrários.

---

## 1. Decisão: tokens ou Tailwind puro?

Não é uma escolha entre os dois: **Tailwind é o motor, tokens são o vocabulário.** A pergunta real é *em quais dimensões* vale criar token próprio e em quais vale usar a escala nativa do Tailwind.

### Alternativas avaliadas

| | A) Paleta crua do Tailwind (`bg-amber-500`, `text-slate-600`) | B) Tokens semânticos via CSS vars, expostos como classes Tailwind (`bg-warning`, `text-muted-foreground`) |
|---|---|---|
| Dark mode | Cada uso precisa de `dark:` manual (já são 56 hoje) e cada dev escolhe um tom diferente | Automático: o token troca de valor em `.dark` |
| Consistência | "Amarelo de pendente" vira `amber-400`, `amber-500`, `amber-600`, `yellow-400`, `yellow-500` (o que acontece hoje) | Um nome, um valor |
| Contraste | Responsabilidade de cada tela | Validado uma vez, no token |
| Rebrand / ajuste de tom | Busca e troca em dezenas de arquivos | Muda uma linha em `index.css` |
| Curva de aprendizado | Zero, é Tailwind puro | Baixa: é o padrão do shadcn, que o projeto já usa |
| Custo | Nenhum agora, alto depois | Pequeno agora (criar ~16 tokens) |

### Veredito

| Dimensão | Estratégia | Por quê |
|---|---|---|
| **Cor** | **Token semântico obrigatório** | É onde mora o significado (status, erro, marca) e onde light/dark divergem. Paleta crua do Tailwind fica **proibida** em componentes de feature |
| **Raio** | Token (`--radius`), já vigente | Controla o "tom" visual do produto inteiro com uma variável |
| **Sombra** | Escala nativa do Tailwind, uso restrito por papel | Poucos níveis bastam, criar token não traz ganho |
| **Espaçamento** | **Escala nativa do Tailwind (4px), restrita** | Criar `--space-*` seria reinventar o que o Tailwind já resolve bem. O problema não é a escala, é a falta de regra + valores arbitrários |
| **Tipografia** | Escala nativa do Tailwind + **1 tamanho extra** (`text-2xs`) + **papéis documentados** | O Tailwind já tem tamanho + line-height casados. Falta definir *quem usa o quê* |

Regra prática: **se a decisão carrega significado ou muda entre light/dark, é token. Se é só medida, é escala do Tailwind.**

### Arquitetura em camadas

```
1. Primitivos ......... index.css  (:root / .dark)  → valores HSL brutos
2. Semânticos ......... tailwind.config.ts          → classes: bg-primary, text-warning-strong, bg-success-subtle
3. Componentes base ... src/components/ui/          → shadcn (Button, Badge, Card…) consomem só semânticos
4. Componentes de domínio  src/components/common/   → StatusBadge, PrioridadeBadge, PageHeader, KpiCard…
5. Telas .............. src/features/*/             → montam 3 e 4; quase nunca escolhem cor diretamente
```

Uma tela de feature **nunca** deveria precisar saber que "pendente é âmbar". Ela usa `<StatusBadge status={os.status} />`.

---

## 2. Cor

### 2.1 Neutros e superfícies — Vigente (com 2 ajustes propostos)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `background` | `0 0% 100%` | `222 47% 6%` | Fundo da página |
| `foreground` | `222 47% 11%` | `210 40% 98%` | Texto principal |
| `card` / `popover` | `0 0% 100%` | `222 47% 8%` / `222 47% 10%` | Superfícies elevadas |
| `secondary` | `210 40% 96%` | `222 30% 14%` | Botão secundário, hover neutro |
| `muted` | `210 40% 96%` | `222 30% 18%` | Fundo discreto (header de tabela, área desabilitada) |
| `muted-foreground` | `215 20% 47%` → **`215 20% 42%`** *(proposto)* | `215 20% 55%` → **`215 20% 62%`** *(proposto)* | Texto secundário. Hoje reprova sobre `muted` (4,36 e 4,07:1); com o ajuste fica 5,2:1 nos dois modos |
| `accent` | `210 40% 96%` | `173 50% 38%` → **`222 30% 14%`** *(proposto)* | Hover de item de menu/dropdown. Hoje, no dark, o hover fica **teal** e no light fica **cinza**, então o mesmo componente se comporta diferente por tema |
| `border` / `input` | `214 32% 91%` | `222 30% 18%` / `222 30% 14%` | Bordas e contorno de input |

### 2.2 Marca (primary) — Proposto

O teal atual (`173 50% 38%`, `#309186`) com texto branco dá **3,79:1** e reprova AA em texto de botão (14px). E o `Button` usa `text-white` fixo em vez de `text-primary-foreground`.

| Token | Light | Dark |
|---|---|---|
| `primary` | **`173 58% 31%`** (`#217d72`) | **`173 55% 45%`** (`#34b2a3`) |
| `primary-foreground` | **`0 0% 100%`** (branco, 4,96:1) | `222 47% 6%` (navy, 7,46:1) |
| `ring` | igual a `primary` | igual a `primary` |

- O teal fica um pouco mais fechado no light e mais luminoso no dark. É o mesmo matiz, então a identidade se mantém.
- `primary` como **texto** (links) passa a ter 4,96:1 no light e 7,2:1 no dark.
- `sidebar-primary` (`173 80% 40%`) hoje é um **segundo teal** diferente do `primary`. Proposta: apontar para o mesmo valor de `primary`.
- Ajuste necessário no código: `button.tsx` deve usar `text-primary-foreground` nas variantes `default` e `hero`.

### 2.3 Feedback semântico — Proposto (é o buraco principal)

Hoje só existe `destructive`. Faltam sucesso, alerta e informação, e cada tela improvisa com a paleta crua. Proposta: 4 famílias × 4 papéis.

| Papel | Classe | Uso |
|---|---|---|
| `DEFAULT` | `bg-success`, `bg-warning`… | Preenchimento sólido: dot, barra de progresso, badge sólido |
| `foreground` | `text-success-foreground` | Texto **sobre** o sólido |
| `subtle` | `bg-success-subtle` | Fundo tingido (badge suave, alert, linha destacada) |
| `strong` | `text-success-strong` | Texto/ícone colorido sobre `subtle`, `card` ou `background`, sempre ≥ 4,5:1 |

**Light**

| Família | `DEFAULT` | `foreground` | `subtle` | `strong` | Contraste `strong`/`subtle` |
|---|---|---|---|---|---|
| `success` | `142 71% 36%` | `222 47% 11%` | `138 76% 96%` | `142 72% 26%` | 5,7:1 |
| `warning` | `38 92% 50%` | `222 47% 11%` | `48 96% 94%` | `26 90% 33%` | 5,7:1 |
| `danger` (= `destructive`) | `0 72% 51%` | `0 0% 100%` | `0 86% 96%` | `0 70% 40%` | 6,1:1 |
| `info` | `217 91% 52%` | `0 0% 100%` | `214 95% 96%` | `224 70% 42%` | 7,1:1 |

**Dark**

| Família | `DEFAULT` | `foreground` | `subtle` | `strong` | Contraste `strong`/`subtle` |
|---|---|---|---|---|---|
| `success` | `142 69% 45%` | `222 47% 6%` | `172 50% 11%` | `142 69% 62%` | 9,1:1 |
| `warning` | `38 92% 50%` | `222 47% 6%` | `35 26% 14%` | `43 96% 62%` | 9,5:1 |
| `danger` | `0 72% 51%` | `0 0% 100%` | `329 35% 12%` | `0 91% 72%` | 6,5:1 |
| `info` | `217 91% 60%` | `222 47% 6%` | `219 55% 16%` | `213 94% 72%` | 7,1:1 |

> Os `subtle` do dark equivalem ao sólido a 15% sobre `card`. Por isso os matizes "puxam" para o navy.

- `destructive` continua existindo (shadcn depende dele) como **alias** de `danger`. Hoje, com texto branco, o vermelho atual (`0 84% 60%`) dá 3,61:1; o novo `0 72% 51%` dá 4,80:1.
- **Sólido nunca carrega texto pequeno colorido.** Texto colorido usa sempre `*-strong`.

### 2.4 Status e prioridade do domínio — Proposto

Status e prioridade **não ganham tokens de cor próprios**. Eles são *mapeados* para as famílias de feedback, em um único lugar do código (componentes de domínio). Os tokens `--status-*` atuais (14 usos) são substituídos por esse mapeamento.

| Entidade | Valor | Família | Ícone sugerido (lucide) |
|---|---|---|---|
| OS / Serviço / Tarefa | `aberta` / `nao_iniciado` | `warning` | `CircleDashed` |
| | `em_andamento` | `info` | `CircleDot` / `Loader` |
| | `concluida` / `finalizada` | `success` | `CircleCheck` |
| | `cancelada` | neutro (`muted`) | `CircleSlash` |
| Prioridade | `alta` | `danger` | `ChevronsUp` |
| | `media` | `warning` | `ChevronUp` |
| | `baixa` | neutro (`muted-foreground`) | `Minus` |
| Atraso / urgência | vencida | `danger` | `AlertTriangle` |

> **Decisão a validar:** hoje "em andamento" é **teal** nos tokens (`--status-progress`) e **azul** em `utilsOperacional.ts`. A proposta é **azul (`info`)**. Um badge teal se confunde com a cor de ação (botão primário) e parece clicável. Teal fica reservado para marca e ação.

Regra do brief mantida: **status = cor + ícone + texto**, nunca só cor.

> Cancelada é **neutra**, não vermelha: é um estado final que não pede ação, e vermelho fica reservado para o que precisa de atenção (atraso, prioridade alta). Ver [`design-system-tabelas.md` §3.1](./design-system-tabelas.md).

### 2.5 Gráficos — Vigente (com regra nova)

`chart-1..5` continuam como estão. Regras:
- Gráficos **sempre** usam `hsl(var(--chart-N))` ou os tokens de feedback; `hsl(...)` literal no componente fica proibido.
- Série que representa status usa a família do status (ex.: concluídas = `success`), não `chart-N`.
- Grid e eixos usam `border` e `muted-foreground`.

### 2.6 Regras de cor

1. Em `src/features/**` e `src/components/**` (exceto `ui/`): **proibido** `bg|text|border-{slate,gray,red,amber,yellow,green,blue,purple,…}-N` e hex/hsl literal.
2. `dark:` com cor crua é sinal de token faltando. Crie ou use o token.
3. Opacidade sobre token é permitida para estados (`hover:bg-primary/90`, `border-success/30`), mas **não** para criar uma cor nova de texto.
4. Avatares (`lib/avatar.ts`) são a única exceção aceitável à regra 1: paleta decorativa sem significado. Mesmo assim, devem usar uma lista fixa definida ali.

---

## 3. Tipografia

### 3.1 Família — Vigente, com revisão

**Plus Jakarta Sans**, única família.

Avaliação crítica:
- ✅ Dá personalidade ao produto e o tira da cara de "shadcn genérico com Inter".
- ✅ Tem algarismos tabulares (`tabular-nums`), essenciais para valores em R$ e contagens.
- ⚠️ É **larga**: em tabelas densas ocupa mais espaço horizontal que Inter/Geist.
- ⚠️ Abaixo de 11px perde legibilidade rápido, e o código hoje usa 9px e 10px.

**Recomendação: manter.** Trocar a fonte é uma mudança de identidade com ganho marginal. Os problemas reais são de *uso* (tamanhos minúsculos e arbitrários) e de *carregamento*, ambos resolvidos abaixo. Se no futuro a densidade de tabelas virar gargalo real, a alternativa natural é **Inter** (mais estreita, mesma sensação neutra).

**Carregamento — Proposto:**
- Hoje a fonte vem por `@import` do Google Fonts dentro do `index.css`, que bloqueia renderização e carrega 6 pesos (300–800).
- Trocar por self-host com `@fontsource-variable/plus-jakarta-sans` (um arquivo variável, sem request externo, funciona offline/intranet).
- Remover o `font-family` duplicado em `body` (o Tailwind já aplica via `font-sans`).

### 3.2 Escala — Proposto

Usa a escala nativa do Tailwind (tamanho + line-height já casados) **mais um tamanho extra**, `2xs`. Nada fora desta tabela.

| Classe | Tamanho / altura de linha | Substitui (hoje) |
|---|---|---|
| `text-2xs` *(novo)* | 11px / 16px | `text-[9px]`, `[10px]`, `[10.5px]`, `[11px]`, `[11.5px]` |
| `text-xs` | 12px / 16px | `text-[12.5px]` |
| `text-sm` | 14px / 20px | `text-[13px]`, `[13.5px]` |
| `text-base` | 16px / 24px | `text-[15px]` |
| `text-lg` | 18px / 28px | n/a |
| `text-xl` | 20px / 28px | n/a |
| `text-2xl` | 24px / 32px | `text-[22px]` |
| `text-3xl` | 30px / 36px | n/a |

Configuração (`tailwind.config.ts` → `theme.extend.fontSize`):

```ts
fontSize: {
  '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px / 16px
},
```

**Mínimo absoluto: 11px.** O `text-[10px]` dos contadores de notificação/filtro vira `text-2xs`.

### 3.3 Pesos — Proposto

| Peso | Classe | Uso |
|---|---|---|
| 400 | `font-normal` | Corpo de texto, células de tabela |
| 500 | `font-medium` | Labels de formulário, itens de menu, botões, texto de ênfase leve |
| 600 | `font-semibold` | Títulos de card/seção, cabeçalho de tabela, badges |
| 700 | `font-bold` | Título de página, números de KPI |

- **Removidos:** 300 (sem uso) e 800 (`font-extrabold`, 19 usos em 3 arquivos → vira `font-bold`). Quatro pesos dão hierarquia suficiente; 800 ao lado de 700 não se distingue em tela.

### 3.4 Papéis tipográficos e densidade — Vigente (10/2026)

**Princípio: densidade de ferramenta, não de site.** O produto é usado o dia inteiro para localizar e acompanhar registros. A escala é calibrada para o maior número de informação útil por tela, mantendo legibilidade (mínimo 11px, corpo 14px).

**A régua é a sidebar.** Ela está no tamanho de referência do mercado (itens de 36px, texto de 14px, ícones de 16px, como Vercel, GitHub e Stripe). A área de conteúdo segue a mesma régua: nenhum texto corrido maior que o corpo, e títulos só um passo acima. Se a sidebar "parece pequena", o problema está no conteúdo inflado ao lado, não nela.

| Papel | Classes | Tamanho | Exemplo |
|---|---|---|---|
| **Corpo (padrão global)** | aplicado no `body` (`text-sm`) | 14px | Parágrafos, descrições, células |
| Título de página | `text-xl font-bold tracking-tight` (via `PageHeader`) | 20px | "Ordens de serviço" |
| Descrição da página | `text-sm text-muted-foreground` | 14px | "Visão comercial de todas as OS" |
| Título de seção | `text-base font-semibold` | 16px | "Serviços da OS" |
| Título de card | `text-sm font-semibold` | 14px | "Dados comerciais" |
| Label de campo | `text-sm font-medium` | 14px | "Cliente" |
| Meta / legenda | `text-xs text-muted-foreground` | 12px | "Atualizado há 2h" |
| Eyebrow / overline | `text-2xs font-semibold uppercase tracking-wider text-muted-foreground` | 11px | "PRAZO" (raro) |
| Cabeçalho de tabela | `text-xs font-medium text-muted-foreground` (sentence case) | 12px | "Cliente / OS" |
| Badge | `text-xs font-medium` | 12px | Status, prioridade |
| KPI (número grande) | `text-2xl font-bold tracking-tight tabular-nums` | 24px | "128" |
| Navegação lateral | `text-sm font-medium` | 14px | Itens do menu |
| Marca (sidebar) | `text-base font-bold` + logo 32px | 16px | ERGOGROUP |

**Teto:** nada na área de conteúdo passa de 24px (o KPI). `text-3xl` ou maior só em telas de autenticação.

**Ritmo vertical da página:** área de conteúdo `px-6 py-5`; `PageHeader` → conteúdo `mb-5`; entre blocos `space-y-6`.

**Já aplicado no código:** corpo de 14px no `body`, `PageHeader` com 20px, os 17 `<h1>` das páginas padronizados em `text-xl font-bold tracking-tight` e o padding da área de conteúdo. **Ainda não aplicado:** as listagens antigas (linhas de cerca de 73px, nomes em caixa alta, "Em aberto" com pill e legenda), que é o maior volume visual da área de conteúdo. Elas encolhem ao migrar para a `DataTable` ([`plano-ui-kit.md`](./plano-ui-kit.md), Fases 5–6).

---

## 4. Espaçamento

### 4.1 Escala — Proposto

Grade de **4px** (escala nativa do Tailwind). Passos permitidos:

| Classe | px | Uso típico |
|---|---|---|
| `0.5` | 2 | Ajuste ótico (ícone ↔ texto em badge) |
| `1` | 4 | Gap entre ícone e texto pequeno |
| `1.5` | 6 | Gap ícone ↔ label em botão/menu; `space-y` label ↔ input |
| `2` | 8 | Gap entre controles relacionados (botões lado a lado) |
| `3` | 12 | Padding de célula/linha; gap em grupos densos |
| `4` | 16 | Padding de card denso; gap entre campos de formulário |
| `6` | 24 | Padding de card padrão; gap entre seções |
| `8` | 32 | Padding horizontal da página |
| `12` | 48 | Estados vazios, respiro grande |

**Evitar:** `2.5`, `3.5`, `5`, `7`, `10` e **proibido** qualquer valor arbitrário (`px-[22px]`, `px-[18px]`). Se o design pede um valor fora da escala, a escala vence.

### 4.2 Padrões de layout

| Contexto | Regra | Status |
|---|---|---|
| Área de conteúdo da página | `px-8 py-6` (definido em `DashboardLayout`) | Vigente |
| Entre blocos da página | `space-y-6` (ou `gap-6`) | Proposto como padrão |
| Header da página → conteúdo | `mb-6`, via `PageHeader` | Proposto |
| Card padrão | `p-6` (shadcn) | Vigente |
| Card denso (lista, KPI, painel lateral) | `p-4` | Proposto |
| Dentro de card, entre grupos | `space-y-4` | Proposto |
| Formulário: entre campos | `space-y-4`; em grid, `gap-4` | Proposto |
| Formulário: label ↔ input ↔ ajuda | `space-y-1.5` | Vigente (shadcn `FormItem`) |
| Tabela: célula | `px-3 py-3` (padrão), `px-3 py-2` (densa) | Proposto |
| Grupo de ações (botões) | `gap-2` | Proposto |
| Ícone ↔ texto | `gap-1.5` (14px), `gap-2` (16px) | Vigente |

### 4.3 Alturas de controle — Vigente

| Tamanho | Altura | Uso |
|---|---|---|
| `sm` | 36px (`h-9`) | Barras de filtro, ações em tabela/toolbar |
| `default` | 40px (`h-10`) | Formulários, ações principais |
| `lg` | 48px (`h-12`) | Login / CTA isolado |
| `xl` | 56px (`h-14`) | Só telas de auth. **Não usar em telas operacionais** |

Inputs, selects e botões **lado a lado** devem ter a mesma altura.

---

## 5. Raio — Vigente, com limpeza proposta

`--radius: 0.75rem` (12px).

| Classe | Valor | Uso |
|---|---|---|
| `rounded` | 4px | Micro: `kbd`, checkbox, chip minúsculo |
| `rounded-sm` | 8px | Elementos pequenos: tag, item de menu |
| `rounded-md` | 10px | **Controles**: botão, input, select |
| `rounded-lg` | 12px | **Containers**: card, dialog, popover, sheet |
| `rounded-full` | 9999px | Badge/pill, avatar, dot |

- **Proibido** raio arbitrário (`rounded-[3px]` … `[11px]` → mapear para a tabela acima).
- `rounded-xl` hoje vale **12px, igual a `rounded-lg`** (padrão Tailwind), então é redundante. Usar `rounded-lg`. `rounded-2xl` (16px) fica restrito a telas de auth.

---

## 6. Elevação e bordas — Proposto

Princípio do brief: **borda sutil em vez de sombra pesada.**

| Nível | Classe | Uso |
|---|---|---|
| 0 | `border` (sem sombra) | Cards e painéis em telas operacionais |
| 1 | `shadow-sm` | Botão primário, controle levemente destacado |
| 2 | `shadow-md` | Popover, dropdown, tooltip, combobox |
| 3 | `shadow-lg` | Dialog, sheet, drawer |

- `shadow-xl` não é usado.
- `shadow-card` e `shadow-glow` (0 usos) saem do config.
- Linha/card em destaque (selecionado, foco) usa `ring-2 ring-ring` ou `border-primary`, não sombra.

---

## 7. Iconografia — Vigente

- **lucide-react** exclusivamente.
- Tamanhos: `size-4` (16px) padrão, em botões/menus/linhas; `size-3.5` (14px) dentro de badge ou com `text-xs`; `size-5` (20px) em header de card/KPI; `size-8`+ só em estado vazio.
- Ícone isolado com ação precisa de `aria-label` e, de preferência, `Tooltip`.
- `stroke-width` padrão (2). Não misturar espessuras.

---

## 8. Movimento — Vigente, com limpeza

| Uso | Classe |
|---|---|
| Hover/foco/troca de estado | `transition-colors duration-150` (preferir a `transition-all`) |
| Entrada de conteúdo | `animate-fade-in` (único utilitário de entrada em uso, 12×) |
| Accordion / collapsible | `animate-accordion-*` (shadcn) |
| Loading | `Skeleton` (shadcn, `animate-pulse`) |

- Remover: `animate-float`, `animate-pulse-slow`, `animate-slide-up`, `shimmer` (0 usos).
- Respeitar `prefers-reduced-motion` em qualquer animação nova.

---

## 9. Componentes de domínio a criar — Proposto

Esta é a "UI kit" de verdade, construída sobre o shadcn. Ficam em `src/components/common/`.

| Componente | Resolve |
|---|---|
| `StatusBadge` (`status`, `entidade`) | Centraliza o mapa status → família + ícone + label. Elimina `utilsOperacional.ts` com cores cruas |
| `PrioridadeBadge` | Idem para prioridade (`utils.ts`: `bg-yellow-500`, `bg-red-600`) |
| `PageHeader` (`title`, `description?`, `actions?`, `back?`) | Os 5 estilos de `<h1>` |
| `KpiCard` | Cards de número em Analytics/Operacional (hoje com `text-[22px]`, `px-[22px]`, `font-extrabold`) |
| `EmptyState` | Ícone + título + texto + ação |
| `SectionCard` | Card com título de card + ações no header, padding padronizado |
| `MoneyText` | `tabular-nums`, formatação `pt-BR` e ocultação por permissão de perfil |

Variantes novas no `Badge` (`cva`): `success`, `warning`, `danger`, `info`, `neutral` × `solid` / `subtle`.

---

## 10. Garantir que a regra se mantém — Proposto

Documentação sem verificação apodrece. Opções, da mais leve para a mais completa:

1. **Script de verificação** (`npm run lint:ui`): `grep` que falha se encontrar cor crua, `text-[Npx]`, `p*-[Npx]`, `rounded-[Npx]` ou `hsl(` fora de `components/ui/` e `index.css`. Zero dependência.
2. **`eslint-plugin-tailwindcss`** com `no-arbitrary-value` e `no-custom-classname`. Mais robusto, mas a regra de "paleta proibida" precisa de configuração extra.

Recomendação: começar pela opção 1 e rodar no CI.

---

## 11. Plano de migração — Proposto

Incremental e sem parar sprint. Cada fase é um PR pequeno.

| Fase | Escopo | Risco |
|---|---|---|
| **1. Fundação** | Tokens de feedback (§2.3), ajuste de `primary`/`muted-foreground`/`accent` (§2.1–2.2), `text-2xs`, limpeza de órfãos e `App.css`, self-host da fonte, `button.tsx` com `text-primary-foreground` | Baixo, com mudança visual leve e global (teal mais fechado no light) |
| **2. Domínio** | `StatusBadge`, `PrioridadeBadge`, `PageHeader`; trocar usos em `features/ordens` | Baixo |
| **3. Telas críticas** | `OperacionalPage` (63 fontes arbitrárias, 25 espaçamentos arbitrários, `hsl` inline), `OrdemServicoListPage`, `OrdemHeroCard`, painéis da OS | Médio, por ser a maior concentração |
| **4. Varredura** | Demais telas + script de verificação no CI | Baixo |
| **5. Vitrine** *(opcional)* | Rota interna `/ui` mostrando tokens e componentes em light/dark | Nenhum |

---

## 12. Decisões pendentes

1. **Em andamento: azul ou teal?** A proposta é azul (`info`), §2.4.
2. **Escurecer o teal no light mode** (`#309186` → `#217d72`)? É a mudança mais visível; resolve o contraste do botão primário.
3. **Manter Plus Jakarta Sans?** A proposta é manter, §3.1.
4. **Densidade de tabela:** `py-3` padrão ou `py-2` como padrão do produto?
5. **Futuro: Tailwind v4.** O v4 define tokens direto no CSS (`@theme`), o que encaixa naturalmente com este documento. Não é prioridade, mas a estrutura em camadas proposta aqui migra sem retrabalho.
