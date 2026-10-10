# Plano de implementação — UI Kit Ergogroup OS

> Plano executável para transformar o design system documentado em código.
>
> **Status (09/10/2026, branch `feat/ui-kit`):** o **kit já existe em código**: tokens de feedback (aditivos), `src/components/kit/`, `src/components/data-table/`, `src/lib/format.ts` e a vitrine `/ui` (só em `npm run dev`). **Nenhuma tela foi migrada ainda.** Pendentes: ajustes de cor que dependem das decisões D1–D2 (Fase 1), shell (Fase 3) e migração das telas (Fases 5–6).
>
> Documentos de referência (ler antes de começar qualquer fase):
> - [`design-system.md`](./design-system.md) — tokens: cor, tipografia, espaçamento, raio, elevação
> - [`design-system-tabelas.md`](./design-system-tabelas.md) — modelo de tabela/listagem
> - [`wireframes/listagens.html`](./wireframes/listagens.html) — protótipo navegável (shell + tabela). Abrir servindo a pasta por HTTP, ex.: `python -m http.server 4321 --directory docs/ui/wireframes`
> - [`identidade-visual-brief.md`](./identidade-visual-brief.md) — personas e princípios

---

## 1. O que é o UI kit deste projeto

Não é uma biblioteca externa. É uma **camada própria sobre o shadcn/ui** que já existe, organizada em 4 níveis:

```
Nível 1  Tokens ............ src/index.css + tailwind.config.ts
Nível 2  Primitivos ........ src/components/ui/            (shadcn — já existe, ajustar variantes)
Nível 3  Kit de domínio .... src/components/kit/            (NOVO — status, prioridade, PageHeader…)
Nível 4  Data table ........ src/components/data-table/     (NOVO — tabela padrão + células)
```

**Regra de ouro:** telas em `src/features/**` só montam peças dos níveis 2–4. Uma tela nunca decide cor de status, estilo de cabeçalho de tabela ou formato de data.

### Estrutura final de pastas

```
src/components/
├── ui/                        shadcn (existente)
├── kit/                       NOVO
│   ├── index.ts
│   ├── PageHeader.tsx
│   ├── EmptyState.tsx
│   ├── StatusBadge.tsx        status de OS / Serviço / Tarefa / OSO
│   ├── PrioridadeIndicator.tsx
│   ├── CobrancaBadge.tsx
│   ├── PrazoIndicator.tsx
│   ├── PessoaChip.tsx
│   └── tones.ts               mapa único domínio → família de cor + ícone + label
├── data-table/                NOVO
│   ├── index.ts
│   ├── DataTable.tsx
│   ├── DataTableToolbar.tsx
│   ├── DataTableViews.tsx
│   ├── DataTableFacetedFilter.tsx
│   ├── DataTableColumnHeader.tsx
│   ├── DataTableColumnsMenu.tsx
│   ├── DataTablePagination.tsx
│   ├── DataTableSkeleton.tsx
│   ├── useDataTableUrlState.ts
│   ├── useTablePreferences.ts densidade, pageSize, colunas visíveis (localStorage)
│   ├── types.ts
│   └── cells/
│   (implementado: cells.tsx + columns.tsx com as fábricas `col.*`; status, prioridade,
│    prazo, pessoa e cobrança reutilizam os componentes do kit)
├── layout/                    existente (refatorar na Fase 3)
│   ├── DashboardLayout.tsx
│   ├── AppSidebar.tsx         NOVO (extraído)
│   ├── AppHeader.tsx          NOVO (extraído)
│   └── navigation.ts          NOVO (config única de menu + breadcrumbs)
└── common/                    existente (MoneyValue etc.)
src/lib/format.ts              NOVO — formatadores pt-BR (data, moeda, CNPJ/CPF, telefone, horas)
```

---

## 2. Visão geral das fases

| Fase | Entrega | Depende de | Tamanho | Risco |
|---|---|---|---|---|
| **0** | Ganho rápido: 50 linhas por página | — | P (1–2h) | Baixo |
| **1** | Tokens e fundação | — | M (1–2 dias) | Baixo, mudança visual global leve |
| **2** | Kit de domínio | 1 | M (2 dias) | Baixo |
| **3** | Shell: sidebar + header | 1, 2 | M (2 dias) | Médio (toca todas as telas) |
| **4** | Data table (kit) | 1, 2 | G (3–4 dias) | Médio |
| **5** | Piloto: listagem de OS | 4 | M (2 dias) | Médio (tela mais usada) |
| **6** | Demais listagens | 5 + backend §7 para Clientes | G (3–5 dias) | Baixo |
| **7** | Vitrine `/ui`, verificação automática, limpeza | 6 | P (1 dia) | Nenhum |

Cada fase = **uma branch + um PR**, a partir de `main` (ex.: `feat/ui-kit-fase-1-tokens`). Fases 3 e 4 podem andar em paralelo depois da 2.

---

## 3. Decisões que precisam estar fechadas antes da Fase 1

| # | Decisão | Recomendação | Impacto se mudar depois |
|---|---|---|---|
| D1 | "Em andamento": azul (`info`) ou teal? | Azul | Só `kit/tones.ts` |
| D2 | Escurecer o teal da marca no light (`#309186` → `#217d72`)? | Sim (contraste AA do botão) | Só `index.css` |
| D3 | Manter Plus Jakarta Sans? | Sim | Só fonte |
| D4 | Densidade padrão das tabelas | Confortável (44px), com opção compacta | Só `useTablePreferences` |
| D5 | Linhas por página padrão | 50 (opções 25/50/100) | Constante |
| D6 | Esconder o sino de notificações até existirem notificações reais | Sim | Header |
| D7 | Tirar "Minhas tarefas" e "Serviços relacionados" da listagem de OS (vão para o futuro painel do setor) | Sim | Fase 5 |

Registrar as respostas aqui antes de começar:

> D1: ___ · D2: ___ · D3: ___ · D4: ___ · D5: ___ · D6: ___ · D7: ___

---

## Fase 0 — Ganho rápido (pode ser feito a qualquer momento)

Resolve a dor imediata sem esperar o kit.

**Tarefas**
- [ ] Trocar o tamanho de página de 10 para 50 nas telas que já carregam tudo em memória:
  - `features/ordens/pages/OrdemServicoListPage.tsx` (`itemsPerPage = 10`)
  - `features/ordens/pages/OperationalOrderListPage.tsx`
  - `features/catalogo/pages/CatalogListPage.tsx`
  - `features/catalogo/pages/CatalogoOperacionalListPage.tsx`
  - `features/clientes/pages/ContactListPage.tsx`
  - `features/usuarios/pages/UsersManagementPage.tsx`
  - `features/faturamento/pages/FaturamentoPage.tsx` (hoje 20)
- [ ] **Não** mexer em `ClientListPage` (faz 1 requisição de detalhe por linha, ver §7).

**Pronto quando:** listagens mostram 50 linhas sem aumento de requisições na aba Network.

---

## Fase 1 — Tokens e fundação

Referência: `design-system.md` §2, §3, §5, §6, §8.

**Tarefas**
- [ ] `src/index.css`
  - [ ] Ajustar `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-ring` (§2.2, conforme D2)
  - [ ] Ajustar `--muted-foreground` (light e dark) e `--accent` (dark) (§2.1)
  - [ ] Criar `--success|warning|danger|info` × `DEFAULT / -foreground / -subtle / -strong` para light e dark (§2.3)
  - [ ] `--destructive` vira alias de `--danger`
  - [ ] Remover `--status-*` **só depois** da Fase 2 trocar os 14 usos (manter nesta fase)
  - [ ] Remover utilitários órfãos: `gradient-text`, `gradient-border`, `glass`, `animate-float`, `animate-pulse-slow`, `animate-slide-up` e os keyframes `float`/`slideUp`
  - [ ] Remover `@import` do Google Fonts e o `font-family` duplicado em `body`
- [ ] `tailwind.config.ts`
  - [ ] Expor `success`, `warning`, `danger`, `info` com `DEFAULT`, `foreground`, `subtle`, `strong`
  - [ ] `fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] }`
  - [ ] Remover `boxShadow.glow/card`, `keyframes/animation.shimmer`
- [ ] Fonte self-hosted: `npm i @fontsource-variable/plus-jakarta-sans`, importar em `main.tsx`, `fontFamily.sans: ['"Plus Jakarta Sans Variable"', …]`
- [ ] `components/ui/button.tsx`: variantes `default` e `hero` usam `text-primary-foreground` (hoje `text-white` fixo)
- [ ] `components/ui/badge.tsx`: variantes `success | warning | danger | info | neutral` × `appearance: solid | subtle` via `cva`
- [ ] Apagar `src/App.css` (não é importado)

**Pronto quando**
- `npm run build` e `npm run lint` passam
- Telas principais conferidas em light e dark (login, listagem de OS, detalhe da OS, analytics)
- Contrastes do `design-system.md` §2 conferidos no DevTools (botão primário ≥ 4,5:1)

---

## Fase 2 — Kit de domínio (`src/components/kit/`)

**`tones.ts` é o coração do kit.** Mapa único e tipado, usado por badges, células e gráficos:

```ts
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export interface ToneDef { tone: Tone; icon: LucideIcon; label: string }

export const STATUS_OS: Record<OrdemStatus, ToneDef>;        // aberta, em_andamento, concluida, cancelada
export const STATUS_SERVICO: Record<ServicoStatus, ToneDef>;
export const STATUS_TAREFA: Record<TarefaStatus, ToneDef>;
export const STATUS_OSO: Record<OsoStatus, ToneDef>;         // nao_iniciado, em_andamento, finalizada
export const PRIORIDADE: Record<Prioridade, ToneDef>;
export const COBRANCA: Record<'nao_liberada' | 'liberada' | 'cobrada', ToneDef>;
```

Valores conforme `design-system.md` §2.4 e `design-system-tabelas.md` §3.1, §3.2 e §10.1.

**Componentes**

| Componente | API | Substitui |
|---|---|---|
| `StatusBadge` | `<StatusBadge entity="os" value={os.status} size="sm" />` | `STATUS_DOT`, `utilsOperacional.ts`, `OperationalOrderStatusBadge`, `dotBadge()` |
| `PrioridadeIndicator` | `<PrioridadeIndicator value="alta" />` | `PRIORITY_DOT`, `PRIORITY_TEXT_CLASSES` em `ordens/utils.ts` |
| `CobrancaBadge` | `<CobrancaBadge liberada cobrada nf={1234} />` | objeto `cobranca` inline da listagem |
| `PrazoIndicator` | `<PrazoIndicator prazo={date} encerrado={bool} layout="stack" \| "inline" />` | `URGENCY_PILL_CLASSES`, `getDurationMeta` na listagem |
| `PessoaChip` | `<PessoaChip nome="Mariana Souza" foto={url} />` | avatares ad hoc |
| `PageHeader` | `<PageHeader title count description actions back />` | os 5 estilos de `<h1>` das páginas |
| `EmptyState` | `<EmptyState icon title description action />` | blocos de vazio copiados |

Mais `src/lib/format.ts`: `formatDate`, `formatDateShort`, `formatCurrency`, `formatDocumento(tipo, numero)`, `formatTelefone`, `formatHoras`. Centralizar os formatadores hoje espalhados.

**Tarefas**
- [ ] Criar `tones.ts` + componentes + `index.ts`
- [ ] Criar `lib/format.ts` e migrar os formatadores existentes para ele
- [ ] Trocar os usos antigos de status, prioridade e cobrança nas telas de **detalhe** (hero da OS, accordion de serviço, `TarefaRow`). As listagens migram nas Fases 5 e 6
- [ ] Remover os tokens `--status-*` e as classes cruas de status (`bg-yellow-500`, `text-blue-400`…)

**Pronto quando:** `grep` por `STATUS_DOT|PRIORITY_DOT|bg-yellow-|text-blue-4` em `src/features` não retorna nada.

---

## Fase 3 — Shell: sidebar e header

Referência: wireframe [`wireframes/navegacao.html`](./wireframes/navegacao.html), com duas direções (A · Painel inset / B · Clássico refinado), estado recolhido, tablet com drawer, busca `Ctrl K` e menu do usuário. **Decidido (09/10/2026): direção A (Painel inset), com a busca global (`Ctrl K`) num lugar só: à direita do header.** Sem busca nem botão "+" na sidebar; criar fica no botão da página e nas ações da busca.

**Tarefas**
- [ ] `layout/navigation.ts`: config única dos itens (título, rota, ícone, grupo, regra de visibilidade por perfil). Grupos: **Operação** (Ordens de serviço, OS operacionais, Cobranças) · **Análise** (Operacional, Financeiro) · **Cadastros** (Clientes, Catálogo, Catálogo operacional, Usuários)
- [ ] Um ícone distinto por item: `ClipboardList`, `Wrench`, `Receipt`, `Activity`, `Wallet`, `Building2`, `Package`, `Boxes`, `Users`
- [ ] `AppSidebar.tsx`: botão de recolher dentro da sidebar; item ativo = fundo `card` + borda sutil + ícone `primary`; usuário só no rodapé (menu: Meu perfil, Tema, Sair)
- [ ] `AppHeader.tsx`: altura `h-14`; breadcrumb derivado de `navigation.ts` + rota (ex.: `Operação › Ordens de serviço › OS 1042`); busca global `Ctrl K` à direita do header (único lugar da busca); alternância de tema como botão de ícone; **remover** o menu de usuário duplicado; esconder notificações (D6), já que `NOTIFICATIONS` hoje é mock fixo
- [ ] Renomear o título da página de Cobranças de "Financeiro" para "Cobranças"
- [ ] Conferir se "Sair" executa logout de fato (hoje é um `Link` para `/`)

**Pronto quando:** todas as rotas navegam pelo menu novo; o menu recolhido continua identificável pelos ícones; o breadcrumb está correto nas páginas de detalhe; o layout não quebra em 768px.

---

## Fase 4 — Data table (`src/components/data-table/`)

Referência: `design-system-tabelas.md` inteiro.

**Dependência:** `npm i @tanstack/react-table`

### API alvo (como uma tela vai declarar a tabela)

```tsx
const columns: DataTableColumn<OrdemServicoItem>[] = [
  col.registro('cliente', 'Cliente / OS', {
    title: (r) => r.cliente_nome,
    subtitle: (r) => `OS ${r.id} · ${formatDocumento(r.cliente_tipo_inscricao, r.cliente_inscricao)}`,
  }),
  col.status('status', 'Status', { entity: 'os' }),
  col.prioridade('prioridade', 'Prioridade'),
  col.prazo('prazo', 'Prazo', { encerrado: (r) => isEncerrada(r.status) }),
  col.booleano('contrato', 'Contrato', { label: 'Vigente', priority: 2 }),
  col.cobranca('cobranca', 'Cobrança', { financial: true, priority: 2 }),
  col.moeda('valor', 'Valor', { financial: true }),
  col.data('data_venda', 'Data da venda', { priority: 3 }),
];

<DataTable
  id="ordens"                                   // chave de preferências e URL
  data={ordens}
  columns={columns}
  getRowHref={(r) => `/ordens/${r.id}`}
  views={[
    { id: 'todas', label: 'Todas' },
    { id: 'abertas', label: 'Em aberto', filter: (r) => ['aberta', 'em_andamento'].includes(r.status) },
    { id: 'atrasadas', label: 'Atrasadas', filter: isAtrasada, tone: 'danger' },
    { id: 'concluidas', label: 'Concluídas', filter: (r) => r.status === 'concluida' },
  ]}
  search={{ placeholder: 'Buscar por cliente, nº da OS ou CNPJ', fields: (r) => [r.cliente_nome, r.id, r.cliente_inscricao] }}
  facets={[{ column: 'status' }, { column: 'prioridade' }, { column: 'cobranca', financial: true }]}
  defaultSort={{ id: 'prazo', desc: false }}
  rowActions={(r) => [...]}
  isLoading={isLoading}
  isError={isError}
  onRetry={refetch}
  emptyState={{ noData: {...}, noResults: {...} }}
/>
```

- `col.*` são fábricas em `data-table/columns.ts` que já trazem célula, alinhamento, largura, `sortingFn` e regra de vazio do tipo (§3 do doc de tabelas).
- `financial: true` esconde a coluna e o filtro quando `useUserRole().canViewOrderValues` for falso. Isso centraliza a regra de perfil.
- `priority: 2 | 3` controla a responsividade e o menu Colunas.

### Tarefas
- [ ] `types.ts` + `columns.ts` (fábricas `col.*`)
- [ ] Células em `cells/` reutilizando o kit da Fase 2
- [ ] `DataTable.tsx`: moldura, cabeçalho fixo (sticky abaixo do header), linha como link real (overlay `<Link>`, Ctrl+clique, `Enter`), hover/foco, densidade, coluna Registro fixa na rolagem horizontal
- [ ] `DataTableToolbar` (busca com debounce de 250ms e atalho `/`) + `DataTableFacetedFilter` (checkbox + contagem) + chips de filtros ativos + "Limpar filtros"
- [ ] `DataTableViews` com contagem (aplicada sobre busca + filtros)
- [ ] `DataTableColumnHeader` (ordenação asc → desc → padrão; `localeCompare('pt-BR')`; vazios no fim)
- [ ] `DataTableColumnsMenu` + `useTablePreferences` (densidade, pageSize e colunas por `id` da tabela, em `localStorage` com `try/catch`)
- [ ] `DataTablePagination`: `1–50 de 143`, seletor 25/50/100, `‹ 1 … 4 5 6 … 15 ›`, slot opcional de total (Cobranças)
- [ ] `useDataTableUrlState`: `view`, `q`, filtros, `sort`, `page` em `useSearchParams` (react-router v6), com `replace` para não poluir o histórico ao digitar
- [ ] Estados: skeleton (primeira carga), barra fina de refetch, vazio sem dados, vazio por filtro, vazio por escopo, erro com "Tentar novamente"
- [ ] Modo servidor preparado (`manualPagination`/`manualSorting`), mesmo sem uso agora (§7)

**Pronto quando:** uma página de teste com dados fictícios reproduz o comportamento do wireframe (ordenar, filtrar, visões, densidade, colunas, paginação, URL, teclado) em light e dark.

---

## Fase 5 — Piloto: listagem de OS

**Tarefas**
- [ ] Reescrever `OrdemServicoListPage` com `PageHeader` + `DataTable` (colunas do §10 do doc de tabelas)
- [ ] Remover da listagem: "Minhas tarefas", "Serviços relacionados" e as queries `useServicosResumo` / `useTarefasResumo` **se** não forem usadas em outro lugar (D7)
- [ ] Mapear os filtros atuais (`OrdemServicoFiltros`, `OrdemServicoFiltrosAtivos`) para facetas + visões; manter o filtro por técnico para a liderança técnica como faceta
- [ ] Visão padrão por perfil: técnico → "Em aberto"; demais → "Todas"
- [ ] Testar com os perfis Diretor, Líder técnico, Sub-líder, Técnico, Financeiro e Administrativo
- [ ] **Validar com a líder técnica e o financeiro** antes de seguir para a Fase 6

**Pronto quando:** paridade funcional com a tela antiga (menos o que D7 tirou), filtros sobrevivem ao voltar do detalhe e o feedback dos usuários foi coletado.

---

## Fase 6 — Demais listagens

Ordem sugerida (do maior impacto para o menor):

| # | Tela | Observação |
|---|---|---|
| 1 | OS operacionais | Substitui `OperationalOrderRow` |
| 2 | Cobranças | Abas OS / OS operacionais; visões A cobrar · Cobradas · Todas; total no rodapé; ação "Registrar cobrança" na linha |
| 3 | Usuários | |
| 4 | Catálogo + Catálogo operacional | Mesma definição de colunas; preparar colunas Setor e Situação para a sprint de setores |
| 5 | Contatos | |
| 6 | Clientes | **Bloqueada** até o backend §7.1 |

**Pronto quando:** nenhuma página usa mais `<Table>` do shadcn diretamente para listagem e as 8 cópias de paginação sumiram.

---

## Fase 7 — Vitrine, verificação e limpeza

- [ ] Rota interna `/ui` (fora do menu, só para desenvolvimento ou diretor) mostrando tokens, badges, indicadores, `PageHeader`, `EmptyState` e uma `DataTable` com dados fictícios, em light e dark. Ela vira a documentação viva do kit
- [ ] Script `npm run lint:ui` (`scripts/check-ui.mjs`) que falha se encontrar em `src/features/**` e `src/components/**` (exceto `ui/`):
  - cores cruas do Tailwind (`(bg|text|border)-(red|amber|yellow|green|blue|…)-\d+`)
  - tamanhos/espaços/raios arbitrários (`text-\[\d`, `p[xy]?-\[\d`, `rounded-\[\d`)
  - `hsl(` literal em `.tsx`
- [ ] Rodar `lint:ui` junto com `lint` (pré-commit ou CI, quando houver CI)
- [ ] Atualizar `identidade-visual-brief.md` §3–6 para apontar só para os docs de design system
- [ ] Remover `.claude/launch.json` da raiz da pasta se o wireframe não for mais necessário

---

## 7. Dependências de backend (registrar no backlog do backend)

| # | Item | Necessário para |
|---|---|---|
| 7.1 | `ClienteList` (serializer de listagem) com todos os campos exibidos na tabela: documento, tipo, representante, data, `cobranca_revisao_alteracao`, `ativo` | Fase 6, Clientes (elimina o N+1 de `clientes/services.ts`) |
| 7.2 | Listagem de OS trazendo tipo e número de inscrição do cliente | Subtítulo "OS 1042 · CNPJ …" |
| 7.3 | *(futuro)* `PageNumberPagination` com `page_size_query_param`, `OrderingFilter` e contagens por visão | Quando o volume exigir paginação no servidor; o `DataTable` já nasce preparado |

---

## 8. Riscos e cuidados

- **Mudança visual global na Fase 1** (teal mais fechado e cinzas de texto mais escuros): avisar os usuários e fazer o deploy num momento calmo.
- **Shell (Fase 3) toca todas as telas:** fazer uma passada manual em todas as rotas antes do merge.
- **Listagem de OS é a tela mais usada:** o piloto (Fase 5) só segue depois do feedback real. Se for preciso, mantenha a tela antiga atrás de um flag em `config/features.ts` por uma semana.
- **Sprint de setores em paralelo:** as colunas Setor (catálogo, usuários) entram quando o backend expuser `Catalogo.setor` e o vínculo usuário↔setor. O kit não depende disso.
- **Branch atual:** o trabalho de UI não deve ser misturado com `feat/lider-tecnico-ajustes-os`. Cada fase sai de `main`.

---

## 9. Checklist de acompanhamento

- [ ] Decisões D1–D7 registradas (§3)
- [ ] Fase 0 — 50 linhas por página
- [ ] Fase 1 — Tokens e fundação
- [x] Fase 2 — Kit de domínio: componentes criados (falta trocar os usos antigos nas telas de detalhe)
- [x] Fase 3 — Shell (direção A, busca só no header; contadores no menu ficaram para depois, dependem de dados)
- [x] Fase 4 — Data table: componente criado e testado na vitrine `/ui`
- [ ] Fase 5 — Piloto listagem de OS (validado com usuários)
- [ ] Fase 6 — Demais listagens
- [ ] Fase 7 — Vitrine `/ui` (feita), `lint:ui`, limpeza
- [ ] Backend 7.1 e 7.2
