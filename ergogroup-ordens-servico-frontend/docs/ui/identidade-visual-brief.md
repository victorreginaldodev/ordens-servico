# Brief de Identidade Visual — Ergogroup OS

> Documento-mãe de identidade visual para uso com ferramentas de design assistidas por IA.
> Não descreve uma tela específica — descreve o sistema (marca, cor, tipografia, componentes, personas) que **todo** brief de página individual (ex: [`listagem-ordens-brief.md`](./listagem-ordens-brief.md), [`gestor-operacional-brief.md`](./gestor-operacional-brief.md), [`ordem-detalhe-brief.md`](./ordem-detalhe-brief.md)) deve herdar.
>
> Ao gerar qualquer tela nova, use este documento como fundação e o brief da página específica (se existir) para a estrutura de informação daquela tela.
>
> **Valores de cor, tipografia, espaçamento, raio e elevação:** a fonte da verdade é [`design-system.md`](./design-system.md). As seções 3 a 6 abaixo descrevem o estado anterior e serão revisadas conforme as propostas daquele documento forem aprovadas.

---

## 1. O produto

**Ergogroup OS** é o sistema interno de gestão de Ordens de Serviço da Ergogroup, empresa de saúde e segurança do trabalho. É uma ferramenta **operacional interna** (não um produto voltado ao cliente final), usada por múltiplos setores da empresa para criar, executar, acompanhar e faturar Ordens de Serviço.

- **Plataforma**: aplicação web (React + Vite), acessada via navegador
- **Uso primário**: desktop (1280px+), em ambiente de escritório/campo técnico
- **Natureza**: ferramenta de trabalho diário, não um site institucional — prioriza clareza e velocidade de execução sobre estética decorativa
- **Stack de UI**: Tailwind CSS + shadcn/ui (Radix UI) + lucide-react (ícones) + Recharts (gráficos)

### Nome e marca
- Nome do produto: **Ergogroup OS**
- Logo: variações em `public/images/logos/` (`logo-ergo.png`, `logo-ergo-completa.png`, `logo-sem-fundo.png`)
- A marca não tem uma cor "vibrante de marketing" própria — a cor primária (teal) **é** a cor institucional do produto, usada com moderação, não como decoração

---

## 2. Personas — quem usa o sistema

O sistema tem **10 perfis de usuário** (`tipo_usuario`), organizados em 4 áreas. A UI é a mesma para todos — o que muda é **visibilidade de dado** e **permissão de ação**, nunca o layout.

### Diretoria / Comercial
| Perfil | Papel | Acesso |
|--------|-------|--------|
| **Diretor** | Visão executiva, acesso total | Financeiro completo, todas as ações |
| **Gestor Comercial** | Equivalente a Diretor em nível de acesso (normalizado como `diretor` no sistema) | Financeiro completo |
| **Comercial** | Time comercial, relação com cliente/proposta | — |

### Técnico (operação de campo)
| Perfil | Papel | Acesso |
|--------|-------|--------|
| **Líder Técnico** (`gestor_tecnico`) | Gestor do setor técnico — cria/reatribui tarefas e mini-OS, monitora todos os técnicos | Vê valores financeiros da OS |
| **Sub-Líder Técnico** (`sub_gestor_tecnico`) | Braço operacional do Líder Técnico, mesmas ações de gestão de tarefas | **Não** vê valores financeiros nem dados comerciais |
| **Técnico** (`tecnico`) | Executa o trabalho — abre a página, vê suas tarefas, muda status | Só altera status das próprias tarefas; não cria/edita/exclui; não vê valores |

### Financeiro
| Perfil | Papel |
|--------|-------|
| **Gestor Financeiro** | Gestão de faturamento, notas fiscais, valores |
| **Financeiro** | Operação financeira do dia a dia |

### Administrativo
| Perfil | Papel | Acesso |
|--------|-------|--------|
| **Gestor Administrativo** | Gestão administrativa da OS (contratos, documentos) | **Não** vê valores monetários |
| **Administrativo** | Operação administrativa | **Não** vê valores monetários; não gerencia serviços/tarefas |

### Como isso deve orientar o design
- **Nunca** desenhar dois layouts diferentes para perfis do mesmo grupo (ex: Líder e Sub-Líder Técnico) — a diferença é campo oculto/visível ou botão habilitado/desabilitado, não uma tela nova
- Dados financeiros (R$) são o dado mais sensível do sistema — sempre trate como **condicional**, nunca hardcoded no layout
- Técnico é o perfil que mais usa o sistema no dia a dia e o que tem menos permissões — para essa persona, **clareza da própria tarefa** vence qualquer outra prioridade de design
- Líder/Sub-Líder Técnico pensam em **carga de trabalho da equipe**, não na própria tarefa — telas para esse público devem favorecer comparação e priorização visual (quem está sobrecarregado, o que está travado)

---

## 3. Tipografia

- **Família**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (Google Fonts) — única família tipográfica do produto, sem serifada nem monoespaçada de apoio
- **Pesos disponíveis**: 300, 400, 500, 600, 700, 800
- **Uso por peso**:
  - `400` — corpo de texto (body)
  - `500` — labels, texto de média ênfase
  - `600` (semibold) — títulos de card, headings padrão (`h1`–`h6` usam `font-semibold` por padrão)
  - `700` (bold) — ênfase forte, números de destaque
  - `800` (display/extrabold) — títulos grandes, hero
- **Escala de tamanho** (aproximada, ajustar por contexto):
  - `10px` — label uppercase (meta info, eyebrow)
  - `12px` — texto de metadado (datas, contadores secundários)
  - `14px` — corpo de texto padrão
  - `16px` — título de card / componente
  - `24px` — título de página
- **Tracking**:
  - Headings: `tracking-tight`
  - Labels uppercase: `tracking-wider uppercase`
- **Nunca** usar outra família tipográfica — inclusive em números/dados tabulares, manter Plus Jakarta Sans

---

## 4. Cor

O sistema usa tokens HSL via CSS variables (`hsl(var(--token))`), consumidos pelo Tailwind. **Sempre referenciar pelo nome do token semântico** (`primary`, `muted-foreground`, `status-completed`), nunca por valor de cor cru — isso é o que permite funcionar em light e dark mode automaticamente.

### Paleta base — Light mode

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `0 0% 100%` | Fundo da página |
| `--foreground` | `222 47% 11%` | Texto principal (azul-escuro quase preto) |
| `--card` | `0 0% 100%` | Fundo de cards |
| `--card-foreground` | `222 47% 11%` | Texto sobre card |
| `--popover` | `0 0% 100%` | Fundo de popovers/dropdowns |
| `--primary` | `173 50% 38%` | **Teal escuro** — cor de marca e ação principal |
| `--primary-foreground` | `222 47% 6%` | Texto sobre primary |
| `--secondary` | `210 40% 96%` | Fundo cinza-claro secundário |
| `--muted` | `210 40% 96%` | Fundo neutro (headers de card, superfícies discretas) |
| `--muted-foreground` | `215 20% 47%` | Texto secundário/terciário |
| `--accent` | `210 40% 96%` | Realce sutil |
| `--destructive` | `0 84% 60%` | Vermelho — erro, exclusão, alerta crítico |
| `--border` / `--input` | `214 32% 91%` | Bordas, divisores, contorno de input |
| `--ring` | `173 50% 38%` | Focus ring (mesma cor do primary) |

### Paleta base — Dark mode

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `222 47% 6%` | Azul-marinho muito escuro (não é preto puro) |
| `--foreground` | `210 40% 98%` | Texto quase branco |
| `--card` | `222 47% 8%` | Cards levemente mais claros que o fundo |
| `--popover` | `222 47% 10%` | Fundo de popovers |
| `--primary` | `173 50% 38%` | Mesmo teal do light mode (não muda) |
| `--secondary` | `222 30% 14%` | Superfície secundária escura |
| `--muted` | `222 30% 18%` | Fundo neutro em dark |
| `--muted-foreground` | `215 20% 55%` | Texto secundário em dark (mais claro que no light, para contraste) |
| `--accent` | `173 50% 38%` | Em dark, accent usa a cor primary (mais presença) |
| `--border` / `--input` | `222 30% 18%` / `222 30% 14%` | Bordas sutis |

> Regra geral: dark mode **não é** só inverter preto/branco — é um azul-marinho profundo com cards levemente mais claros que o fundo, criando profundidade em camadas.

### Sidebar (tokens dedicados)
| Token | Light | Dark |
|-------|-------|------|
| `--sidebar-background` | `0 0% 100%` | `222 47% 7%` |
| `--sidebar-primary` | `173 80% 40%` (teal mais saturado que o primary geral) | mesmo |
| `--sidebar-accent` | `210 40% 96%` | `222 30% 12%` |

### Cores de status (OS / Serviço / Tarefa)
Linguagem visual mais importante do produto — usada em badges, dots e barras.

| Status | Token | HSL | Cor |
|--------|-------|-----|-----|
| Aberta/Aberto (pendente) | `--status-pending` | `45 93% 47%` | Amarelo/âmbar |
| Em andamento | `--status-progress` | `173 80% 40%` | Teal (variante saturada do primary) |
| Concluída | `--status-completed` | `142 76% 36%` | Verde |
| Cancelada | `--status-cancelled` | `0 84% 60%` | Vermelho (mesma cor do destructive) |

> Nota: os briefs de página individuais descrevem "Aberta = vermelho" para o *badge de urgência/atraso* — isso é intencional e **diferente** do dot de status acima. Vermelho é reservado para **urgência/erro/cancelamento**, nunca para "aberta" como estado neutro. Ao gerar uma tela nova, confirme qual convenção o brief da página pede antes de aplicar.

### Cores de prioridade da OS
| Prioridade | Cor |
|------------|-----|
| Alta | Vermelho forte (`destructive`) |
| Média | Amarelo (`status-pending`) |
| Baixa | Neutro (`muted-foreground`) — não usa cor de destaque |

### Cores de gráfico (Recharts)
| Token | HSL |
|-------|-----|
| `--chart-1` | `173 50% 38%` (primary) |
| `--chart-2` | `190 60% 45%` |
| `--chart-3` | `142 60% 34%` |
| `--chart-4` | `45 80% 45%` |
| `--chart-5` | `280 55% 56%` |

### Gradientes e sombras
| Token | Valor | Uso |
|-------|-------|-----|
| `--gradient-primary` | `linear-gradient(135deg, hsl(173 50% 38%), hsl(190 60% 45%))` | Uso pontual — texto/ícone de destaque, nunca fundo de área grande |
| `--gradient-hero` | `linear-gradient(180deg, ...)` | Fundo de seções hero (landing/login), não em telas operacionais |
| `--shadow-card` | `0 4px 20px hsl(0 0% 0% / 0.08)` (dark: `/ 0.3`) | Sombra padrão de card |
| `--shadow-glow` | `0 0 60px hsl(173 50% 38% / 0.12)` (dark: `/ 0.08`) | Glow sutil em elementos de destaque, uso raro |

**Regra de ouro**: gradientes e glow são para telas de marketing/auth (login, landing) — **não usar em telas operacionais de trabalho** (dashboards, listagens, hub de OS). Nessas, cor é linguagem funcional (status/prioridade), não decoração.

---

## 5. Componentes e biblioteca

- **Base**: [shadcn/ui](https://ui.shadcn.com/) sobre [Radix UI](https://www.radix-ui.com/) — todos os componentes primitivos (Button, Dialog, Select, Tabs, Toast, etc.) já existem em `src/components/ui/`
- **Ícones**: [lucide-react](https://lucide.dev/) exclusivamente — não misturar com outra biblioteca de ícones
- **Gráficos**: [Recharts](https://recharts.org/), usando os tokens `chart-1..5`
- **Variantes de componente**: seguem `class-variance-authority` (cva) — ex. `Button` tem variants `default | destructive | outline | secondary | ghost | link | hero | hero-outline` e sizes `sm | default | lg | xl | icon`
- **Border radius**:
  - `--radius: 0.75rem` (12px) — base para cards grandes (`rounded-lg`)
  - `calc(var(--radius) - 2px)` (~10px) — inputs, elementos médios (`rounded-md`)
  - `calc(var(--radius) - 4px)` (~8px) — elementos pequenos (`rounded-sm`)
  - Badges/pills: `9999px` (full)
- Ao pedir para uma ferramenta de IA gerar uma tela nova: **referencie os componentes shadcn/ui existentes por nome** (Card, Badge, Select, Sheet, DropdownMenu, Tabs) em vez de descrever do zero — o objetivo é reuso, não reinvenção visual a cada tela

---

## 6. Movimento e interação

- Transições padrão: `transition-all duration-200` (rápido, quase imperceptível — não é o foco da experiência)
- Animações de entrada disponíveis: `animate-fade-in` (0.5s), `animate-slide-up` (0.5s, sobe 20px), `animate-float` (flutuação contínua, 6s — uso decorativo apenas), `animate-pulse-slow` (4s)
- Shimmer (`animate-shimmer`, 2s infinito) — usado em skeletons de loading
- **Princípio**: movimento é sutil e funcional (indicar carregamento, entrada de conteúdo). Nunca chamar atenção para si mesmo em telas operacionais.

---

## 7. Princípios gerais de UX do produto

1. **Densidade com clareza** — o produto é usado por profissionais durante o expediente inteiro; prioriza escaneabilidade e velocidade sobre espaçamento generoso "premium"
2. **Status e prioridade são a linguagem visual primária** — cor + ícone + label, nunca cor isolada (acessibilidade e clareza)
3. **Hierarquia por peso tipográfico e espaçamento**, não por decoração — títulos maiores/mais pesados, não bordas ou fundos extras
4. **Ação mais próxima possível do dado** — evitar modais para ações simples (mudar status, reatribuir); preferir dropdown/select inline
5. **Visibilidade de dado é condicional por perfil, layout não é** — nunca desenhar uma segunda versão de tela só por permissão
6. **Presente > histórico nas telas operacionais** — gráficos de tendência retrospectiva pertencem ao módulo de Analytics, não às telas de execução do dia a dia
7. **Desktop-first, mas não quebra em tablet** (768px) — mobile não é prioridade de design, mas o layout não pode falhar completamente

---

## 8. Referências de estilo

- **Estética geral**: [Linear.app](https://linear.app), [Notion](https://notion.so), [Height](https://height.app) — denso mas limpo, dark mode tratado como cidadão de primeira classe (não um filtro invertido)
- **Inspiração para telas de monitoramento/urgência**: painéis de on-call/incident (PagerDuty, Datadog) — priorização visual do que precisa de atenção agora
- **Não usar**: gradientes decorativos em telas operacionais, cores vibrantes fora do sistema de status/prioridade, ilustrações genéricas de stock, glassmorphism pesado
- **Preferir**: espaço em branco estratégico (não excessivo), tipografia como principal ferramenta de hierarquia, bordas sutis em vez de sombras pesadas

---

## 9. Como usar este documento com uma ferramenta de IA de design

1. **Sempre** cole ou referencie este brief primeiro, como contexto de sistema — ele define o que **não muda** entre telas (cor, tipografia, componentes, personas)
2. Em seguida, forneça o brief da página específica (se existir um em `docs/ui/`) para a estrutura de informação daquela tela
3. Se a tela não tem brief próprio ainda, descreva a estrutura de informação da tela seguindo o mesmo formato dos briefs existentes (contexto → entidades → personas → problema → objetivos → estrutura de informação → componentes-chave)
4. Peça explicitamente **light mode e dark mode** como entregáveis — o produto trata os dois como igualmente importantes, não dark mode como um extra
5. Ao pedir variação de conteúdo (estado vazio, loading, erro), lembre a ferramenta que o *skeleton* usa `animate-shimmer` e os tokens de cor acima — não gerar um estilo de loading genérico divergente
