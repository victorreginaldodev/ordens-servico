# Plano de frontend: organização, setores, funções e time

Plano de 10/10/2026. Escopo: **só frontend**, com foco em UX e UI. Adapta o React à refatoração de setores, funções e permissões do backend (`epic/v3`) e cria as telas de **Organização**, **Setores**, **Funções e permissões** e **Time** (novo nome de "Usuários").

Documentos de referência:
- backend: `docs/plano-setores-e-permissoes.md`, `docs/mapa-de-permissoes.md` e `apps/organizacoes/permissoes.py`;
- frontend: `docs/ui/design-system.md`, `docs/ui/design-system-tabelas.md` e `docs/ui/plano-ui-kit.md`.

---

## 1. O que mudou no backend e o que isso quebra no front

| Antes | Agora (`epic/v3`, fase 4 ainda não commitada) |
|---|---|
| `Usuario.tipo_usuario` com 10 papéis | **Removido** (migração `contas/0004`). Também sai o endpoint `/usuarios/tipos/` |
| `ativo` e `is_active` duplicados | Um campo só. A API continua devolvendo `ativo`, que agora vem de `is_active` |
| Papel fixo define o acesso | Acesso = **vínculos** (usuário + setor + função) → **funções** → **permissões** (lista fixa em código) |
| Login e `/me` devolvem `tipo_usuario` | Devolvem `vinculos[]` e `permissoes: { globais[], todos_os_setores, por_setor[{setor, setor_nome, permissoes[]}] }` |

Endpoints que o front passa a usar:

| Recurso | Endpoint | Escrita exige |
|---|---|---|
| Organização | `GET/PATCH /api/organizacoes/organizacoes/` | `organizacao.configurar` |
| Setores | `/api/organizacoes/setores/` (`q`, `ativo`) | `organizacao.configurar`; excluir em uso → 409 |
| Funções | `/api/organizacoes/funcoes/` (`q`, `ativo`) + `GET funcoes/permissoes-disponiveis/` | `organizacao.configurar`; excluir em uso → 409 |
| Vínculos | `/api/organizacoes/membros/` (`usuario`, `setor`, `funcao`) | `usuarios.gerenciar` |
| Usuários | `/api/contas/usuarios/` (`q`, `setor`, `funcao`, `ativo`); `vinculos` no create/patch substitui todos | `usuarios.gerenciar`; diretoria exige `usuarios.gerenciar_diretoria` |

Regra transversal: **ninguém concede o que não tem**. Criar ou editar função e vínculo falha se quem edita não tiver todas as permissões envolvidas (no setor, para as de escopo por setor).

### Impacto imediato (bloqueante)

`useUserRole` lê `user.tipo_usuario`, que deixa de existir. Com o campo vazio, `isRestricted` fica falso e **todo usuário passa a ver na tela todos os botões e valores**. O backend continua barrando, então o efeito é uma tela que oferece ações que respondem 403 e esconde nada. Os 22 componentes que usam `useUserRole` são afetados, além de `UsersManagementPage`, `UserProfilePage`, `services/auth.ts` e `features/usuarios/services.ts`.

**O deploy da fase 4 do backend depende da Fase F0 deste plano.**

---

## 2. Princípios de UX

1. **Falar a língua da gestora, não do modelo.** Na tela: "Time", "pessoa", "setor", "função", "o que pode fazer". Evitar "vínculo", "permissão global", "escopo" e códigos como `os.ver_todas`.
2. **Permissão decide o que aparece; layout não muda.** O que já vale no brief de identidade visual continua: ação proibida some (ou fica desabilitada com o motivo, quando ajuda a entender), mas a tela é a mesma para todos.
3. **Mostrar a consequência antes de confirmar.** Antes de salvar uma função: "afeta 6 pessoas". Antes de desativar um setor: "3 pessoas perdem as permissões deste setor".
4. **Desativar em vez de excluir.** Excluir fica escondido num menu secundário, e o 409 do backend vira uma explicação com a saída ("desative em vez de excluir"), não um erro.
5. **Prever o resultado ao editar acesso.** Ao montar os setores e funções de uma pessoa, a tela mostra ao vivo o que ela vai poder fazer.
6. **Reaproveitar o kit.** `PageHeader`, `EmptyState`, `ToneBadge`, `PessoaChip`, `DataTable` e as regras de `design-system-tabelas.md`. Sem cores cruas do Tailwind e sem tamanhos arbitrários.

---

## 3. Arquitetura de informação

### Menu lateral

O item "Usuários" sai de **Cadastros** e nasce um grupo **Organização**:

```
Operação      Ordens de serviço · OS operacionais · Cobranças
Análise       Operacional · Financeiro
Cadastros     Clientes · Catálogo · Catálogo operacional
Organização   Time · Setores · Funções e permissões · Dados da empresa
```

| Item | Rota | Quem vê no menu |
|---|---|---|
| Time | `/time` (redirect de `/usuarios`) | todos, como diretório; ações só com `usuarios.gerenciar` (ver decisão D1) |
| Setores | `/organizacao/setores` | todos podem ler; edição com `organizacao.configurar` |
| Funções e permissões | `/organizacao/funcoes` | `organizacao.configurar` ou `usuarios.gerenciar` |
| Dados da empresa | `/organizacao/dados` (redirect de `/empresa`) | todos leem; edição com `organizacao.configurar` |

"Meu perfil" continua no menu do usuário (`/time/eu`, com redirect de `/usuarios/profile`).

Mudanças em `navigation.ts`: o `NavItem` troca `requiresFinancials` por `permissao?: Permissao | Permissao[]`, e `visibleNavGroups` recebe a função `pode()` (seção 4). Breadcrumb e `CommandMenu` herdam isso de graça.

### Glossário de interface

| No código / API | Na tela |
|---|---|
| Usuário | Pessoa (no plural, **Time**) |
| `MembroSetor` / vínculo | "Setores e funções" de uma pessoa; chip "Segurança do Trabalho · Gestor" |
| Função | Função |
| Permissão (`codigo`) | Frase do que libera (`descricao` da API, com texto de apoio no front) |
| Escopo `setor` / `global` | "Vale só nos setores da pessoa" / "Vale na empresa toda" |
| `setores.todos` | "Atua em todos os setores" |
| `ativo = false` | "Desativado" |

---

## 4. Fase F0: fundação de permissões (bloqueante)

Sem tela nova. Objetivo: o front funcionar com o backend novo exatamente como funciona hoje.

> **Implementada em 10/10/2026.** `src/lib/permissoes.ts`, `src/hooks/usePermissoes.ts`, `src/lib/api-errors.ts`, adaptador em `useUserRole.ts`, sessão relida do `/auth/me/` no `DashboardLayout` (a cada 5 min) e `tipo_usuario` removido de todo o front. Mudanças de comportamento, todas para alinhar a tela ao que o backend já aplica:
> - tarefas e serviços no detalhe da OS são verificados **no setor do serviço**; a diretoria passa a ter controle completo de tarefas (decisão 5 do mapa);
> - "Editar serviço" aparece para quem tem `os.gerenciar` ou `servicos.gerenciar` no setor; "Excluir serviço", só com `os.excluir`;
> - registrar cobrança de OS operacional exige `financeiro.registrar_cobranca` (decisão 2);
> - os menus Cobranças e Análise › Financeiro somem para quem não vê valores nem registra cobrança (o administrativo já recebia 403 do backend nesses dados);
> - os seletores e filtros de responsável listam todo o time, não só o antigo "tipo técnico";
> - a produtividade do painel operacional mostra quem o backend devolver, com as funções de cada pessoa como cargo.
>
> A gestão de usuários ganhou um editor simples de setores e funções (`VinculosEditor`), que a F4 reaproveita no painel lateral.

**4.1 Tipos e sessão** (`services/auth.ts`, `types/index.ts`)
- `UsuarioPayload` e `UserProfile` sem `tipo_usuario` e `tipo_usuario_display`, com `vinculos` e `permissoes`.
- Um tipo `Permissao` (união dos 19 códigos de `permissoes.py`) e um mapa `PERMISSOES_POR_SETOR`, iguais ao backend.
- O refresh de token já devolve `usuario`: gravar a versão nova no armazenamento local, para mudanças de função chegarem sem novo login.

**4.2 Hook `usePermissoes()`** (`src/hooks/usePermissoes.ts`), espelho de `PerfilDeAcesso.tem`:
- `pode(permissao, setorId?)`: superusuário → sim; permissão global → está em `globais`; permissão por setor → `todos_os_setores` ou está no setor (sem setor: em algum setor);
- `setoresCom(permissao)`: ids dos setores, ou `'todos'`;
- `meusSetores`: os vínculos da pessoa, para filtros e telas futuras (painel do setor).
- Componente `<Pode permissao="..." setor={id}>` para trechos de JSX.

**4.3 Adaptador de `useUserRole`.** Manter a mesma assinatura, agora calculada a partir de `pode()`, para não mexer nos 22 consumidores de uma vez:

| Flag atual | Passa a ser |
|---|---|
| `canViewOrderValues`, `canAccessFinancials` | `pode('financeiro.ver_valores')` |
| `canManageFinancials` / registrar cobrança | `pode('financeiro.registrar_cobranca')` |
| `canManageOrders` | `pode('os.gerenciar')` |
| `canManageServices` | `pode('os.gerenciar') \|\| pode('servicos.gerenciar', setor)` |
| `canManageTasks`, `canCreateTasks` | `pode('tarefas.distribuir', setorDoServico)` |
| editar tarefa de outra pessoa | `pode('tarefas.editar_setor', setorDoServico)` |
| `canManageQuickTasks` (OSO) | `pode('os_operacional.gerenciar')` |
| `canManageCatalogoComum` | `pode('catalogo.gerenciar')` |
| `canManageUsers` | `pode('usuarios.gerenciar')` |
| `isRestricted` (vê só o que é seu) | `!pode('os.ver_todas') && !pode('servicos.ver_setor')` |
| `isDirector`, `isGestorComercial` | `pode('setores.todos')` (usar só onde não houver permissão melhor) |
| `isTechnicalSector`, `isLeadTechnician`, `isSubLeadTechnician`, `isFinance`, `isAdministrative*` | Não têm equivalente direto. Revisar cada uso (decisão D4) |

Depois, em PRs pequenos por feature, os componentes trocam o adaptador por `pode()` direto, passando o **setor do serviço** onde a regra é por setor (detalhe da OS, `ServicoAccordionCard`, `TarefaRow`). Esse é o ganho real: hoje um gestor de Ergonomia veria botões de tarefa num serviço de Segurança do Trabalho.

**4.4 Erros padronizados.** Levar `extractErrorMessage` de `UsersManagementPage` para `src/lib/api-errors.ts` e tratar de forma única:
- 403 → toast "Seu perfil não permite esta ação" + texto do backend;
- 409 em exclusão → diálogo explicativo com o botão "Desativar" ao lado.

**Pronto quando:** login, sidebar e as telas de OS se comportam igual a hoje para um usuário de cada função migrada (Diretor, Gestor Técnico, Técnico, Financeiro, Administrativo), testado no dev contra o backend `epic/v3`.

---

## 5. Fase F1: navegação e o novo nome "Time"

> **Implementada em 10/10/2026.** `features/usuarios` virou `features/time` (`TimePage`, `MeuPerfilPage`), rotas `/time` e `/time/eu`, redirects dos endereços antigos e grupo "Organização" no menu. "Dados da empresa" fica fora do menu até a F5, porque a tela ainda grava só no navegador. Wireframe de navegação e brief de identidade visual ainda não foram atualizados.

- Grupo **Organização** no menu, rotas novas e redirects (`/usuarios` → `/time`, `/usuarios/profile` → `/time/eu`, `/empresa` → `/organizacao/dados`).
- Pasta `features/usuarios` → `features/time` (serviços, hooks e páginas), com query keys `['time', ...]`.
- Textos: "Usuários" → "Time", "Adicionar usuário" → "Adicionar pessoa", "Tipo de usuário" → "Setores e funções".
- Atualizar `docs/ui/wireframes/navegacao.html` e o brief de identidade visual (seção de personas passa a falar de funções configuráveis, não de 10 tipos fixos).

---

## 6. Fase F2: Setores

> **Implementada em 10/10/2026** em `features/organizacao` (`SetoresPage`, `SetorCard`, `SetorModal`, `useResumoSetores`). **Revisado no mesmo dia:** os painéis laterais (`Sheet`) viraram um único modal por etapas (detalhe → editar, desativar ou excluir; "Voltar" retorna ao detalhe), e nunca há um modal sobre outro. Esse é o padrão para as próximas telas (Funções, Time, Dados da empresa): onde este plano fala em "Sheet" ou "painel lateral", leia "modal". O formulário de catálogo ganhou o campo "Setor responsável", destino do aviso de catálogos sem setor. Kit: `AtivoBadge` e `AvatarStack`.

**Lista** (`/organizacao/setores`). Poucos itens (5 hoje), então **cards em grade** em vez de tabela:
- nome, descrição curta, status (`ToneBadge`: Ativo / Desativado);
- quem gerencia: avatares das pessoas cuja função tem `tarefas.distribuir` naquele setor;
- contadores: pessoas no setor e catálogos ligados;
- filtro Ativos / Desativados / Todos e busca (`q`).

Os contadores vêm de uma carga única de `/membros/` (a organização tem ~43 pessoas), agregada no cliente. Se pesar, pedir `membros_count` ao backend (seção 11).

**Detalhe** em `Sheet` lateral (ou rota `/organizacao/setores/:id`):
- abas **Pessoas** (agrupadas por função, com atalho "Adicionar pessoa ao setor") e **Catálogos** (lista com link para o catálogo);
- aviso quando há catálogos sem setor na organização: "N catálogos ainda sem setor. Os serviços deles não aparecem na fila de nenhum setor." com link para o catálogo filtrado. Isso prepara a classificação exigida pelo painel do setor (fase 5 do backend).

**Criar e editar**: `Sheet` com nome, descrição e status. Validação de nome único mostrada no campo.

**Desativar**: confirmação com consequência: "As N pessoas deste setor deixam de ter as permissões que ele concede. Os serviços já vinculados continuam no setor." **Excluir** fica no menu `⋯`; se o backend responder 409, o diálogo explica e oferece "Desativar".

---

## 7. Fase F3: Funções e permissões

> **Funções liberadas por setor (backend fase 4b, 10/10/2026):** cada função tem `setores` (obrigatório) e só pode ser atribuída neles. Já aplicado no front:
> - o editor de setores e funções de uma pessoa (`VinculosEditor`) só lista as funções liberadas no setor escolhido, deixa a função bloqueada até escolher o setor e limpa a função ao trocar para um setor em que ela não vale;
> - o modal do setor ganhou a aba **Funções** (liberadas no setor, pessoas que usam cada uma, "Retirar") e a etapa **Liberar funções**, no mesmo modal. "Retirar" fica bloqueado, com o motivo, quando há pessoas com a função no setor, quando é o único setor da função ou quando quem edita não tem as permissões dela;
> - ao criar um setor, o modal abre na aba Funções, porque sem funções liberadas ninguém pode entrar no setor.
>
> No editor de função desta fase, `setores` vira um campo obrigatório (seleção múltipla), com o mesmo bloqueio para retirar setores em uso.

> **Implementada em 10/10/2026** (`FuncoesPage`, `FuncaoModal`, `MatrizFuncoes`, `permissoesCatalogo.ts`), em `/organizacao/funcoes`, no padrão de modal único (formulário → desativar/excluir, "Voltar" retorna ao formulário). Em relação ao desenho acima:
> - o editor é um modal largo, não uma rota própria;
> - lista no `DataTable` (Nome, Descrição, Setores, Permissões, Pessoas, Situação; filtro por setor; visões Ativas/Inativas/Todas); "Duplicar" abre o formulário já preenchido;
> - "Setores em que pode ser usada" é obrigatório; setores com pessoas usando a função ficam travados, com o motivo;
> - função com permissões que quem abre não tem abre só para leitura;
> - o rodapé avisa quantas pessoas a alteração afeta;
> - "Comparar funções" mostra a matriz só das funções ativas.

É a tela mais sensível e a mais difícil de entender. O desenho precisa deixar óbvio o que cada função libera.

**Lista** (`/organizacao/funcoes`): tabela com nome, descrição, nº de permissões, nº de pessoas, em quais setores é usada e status. Ações: editar, **duplicar** (atalho para criar variações, ex.: "Gestor Técnico" → "Gestor de Ergonomia"), desativar e excluir.

**Editor** (rota própria `/organizacao/funcoes/:id`, porque a lista de permissões é longa):
- cabeçalho com nome, descrição e status;
- permissões **agrupadas por assunto**, cada uma com switch, a frase da API e um texto de apoio:

| Grupo | Permissões |
|---|---|
| Ordens de serviço | `os.ver_todas`, `os.gerenciar`, `os.excluir`, `os_operacional.gerenciar` |
| Execução no setor | `servicos.ver_setor`, `servicos.gerenciar`, `tarefas.distribuir`, `tarefas.editar_setor`, `setores.todos` |
| Financeiro | `financeiro.ver_valores`, `financeiro.registrar_cobranca` |
| Cadastros | `clientes.gerenciar`, `catalogo.gerenciar` |
| Time e organização | `usuarios.gerenciar`, `usuarios.gerenciar_diretoria`, `usuarios.redefinir_senha`, `organizacao.configurar` |
| Indicadores e histórico | `indicadores.ver_geral`, `auditoria.ver` |

- selo de escopo em cada permissão: "Vale só nos setores da pessoa" ou "Vale na empresa toda";
- permissões **sensíveis** (`os.excluir`, `usuarios.gerenciar_diretoria`, `setores.todos`, `organizacao.configurar`) com destaque de alerta e texto explicando o risco;
- **dependências sugeridas** sem bloquear: marcar `tarefas.distribuir` sem `servicos.ver_setor` mostra "Quem distribui tarefas normalmente também precisa ver os serviços do setor";
- **o que você não pode conceder fica desabilitado**, com tooltip "Você não tem esta permissão, então não pode concedê-la". Se a função tiver alguma permissão que quem edita não tem, a tela abre em modo leitura com o motivo;
- rodapé fixo com "Salvar" e o impacto: "Esta alteração vale para 6 pessoas em 2 setores".

**Comparar funções**: alternância na lista que mostra uma matriz (linhas = permissões agrupadas, colunas = funções, células ✓). É a visão de que a gestora precisa para responder as 8 perguntas pendentes do mapa de permissões e restringir acessos com segurança. Só leitura; clicar numa coluna abre o editor.

---

## 8. Fase F4: Time

**Lista** (`/time`), sobre o `DataTable` do kit, com estado na URL (`useDataTableUrlState`):

| Coluna | Conteúdo |
|---|---|
| Pessoa | avatar, nome e e-mail (`PessoaChip`) |
| Setores e funções | chips "Setor · Função"; "+2" quando houver mais; "Todos os setores" para quem tem `setores.todos`; aviso discreto "Sem setor" quando não há vínculo |
| Status | Ativo / Desativado |
| Desde | `data_criacao` |
| `⋯` | editar, desativar/reativar, redefinir senha, excluir |

- Filtros no servidor: busca (`q`), setor, função e status, com chips de filtros ativos como na listagem de OS.
- Alternância **Lista / Por setor**: a segunda agrupa as pessoas por setor e função, como um organograma simples. Ajuda o gestor a ver o tamanho de cada equipe.
- Em telas estreitas, a tabela vira lista de cards (padrão das outras listagens).
- Sem `usuarios.gerenciar`: a tela é um diretório só leitura, sem coluna de ações.

**Adicionar e editar pessoa**: `Sheet` lateral largo no lugar do `Dialog` atual, em três seções:
1. **Dados**: nome, e-mail, username (gerado a partir do e-mail, editável);
2. **Acesso**: senha e confirmação (só na criação, com indicador de força), status;
3. **Setores e funções**: linhas `[Setor] [Função] [remover]` + "Adicionar setor".
   - setor já usado some das próximas linhas (um vínculo por setor);
   - funções que quem edita não pode conceder naquele setor aparecem desabilitadas, com o motivo;
   - **prévia ao vivo** "O que esta pessoa poderá fazer", calculada no cliente a partir das permissões das funções escolhidas: lista curta "Na empresa toda: …" e "Em Segurança do Trabalho: …";
   - sem nenhum setor: alerta "Sem setor, esta pessoa só vê as próprias tarefas e OS."

Envio único: `POST`/`PATCH /usuarios/` com `vinculos`, que o backend aplica de forma atômica. Erros de `vinculos` aparecem na linha correspondente.

**Pessoa da diretoria** (alguma função com `usuarios.gerenciar_diretoria`): quem não tem essa permissão vê as ações desabilitadas com "Só a diretoria altera pessoas da diretoria".

**Desativar** é a ação principal: "Desativada, a pessoa não entra mais no sistema. Tarefas e histórico continuam." **Excluir** fica no menu secundário; se a pessoa for responsável por tarefas (409), o diálogo oferece desativar.

**Redefinir senha de outra pessoa** (`usuarios.redefinir_senha`): o endpoint valida `senha_atual` contra quem está logado, então o campo deve se chamar "Sua senha, para confirmar", e não "Senha atual".

**Meu perfil** (`/time/eu`): dados pessoais e senha como hoje, mais um bloco só leitura "Meus setores e funções" e "O que posso fazer", a partir de `permissoes` do `/me`. Some o seletor de tipo e o switch de status, que a própria pessoa não pode mais alterar.

---

## 9. Fase F5: Dados da empresa

A tela atual grava só no `localStorage` (`features/empresa/services.ts`, com dados de exemplo). Passa a usar `/api/organizacoes/organizacoes/`:
- seções **Identificação** (nome, razão social, CNPJ, inscrições), **Contato** (e-mail, telefone, site) e **Endereço**;
- máscaras de CNPJ, CEP e telefone;
- sem `organizacao.configurar`: só leitura;
- o campo de **logo** não existe no backend (decisão D3).

---

## 10. Fase F6: acabamento

- Estados vazios, de carregamento (skeleton no formato do conteúdo) e de erro em todas as telas novas.
- Acessibilidade: switches e checkboxes com rótulo, foco preso no `Sheet`, navegação por teclado na matriz de permissões, contraste dos selos conforme `design-system.md`.
- Componentes novos no kit (`src/components/kit/`) e na vitrine `/ui`: `SetorFuncaoChip`, `EscopoBadge`, `AtivoBadge`, `ConfirmarComConsequencia` e `PermissaoSwitch`.
- Teste manual por função, com uma pessoa de cada função migrada, no dev.

---

## 11. Pedidos opcionais ao backend

Não bloqueiam. O front funciona sem eles, agregando no cliente.

| Pedido | Para quê |
|---|---|
| `membros_count` em setores e funções | contadores das listas sem carregar todos os vínculos |
| `last_login` na listagem de usuários | coluna "Último acesso", útil para achar contas abandonadas |
| campo de logo na `Organizacao` | manter o logo hoje salvo no navegador (D3) |

---

## 12. Ordem de entrega

| Fase | Entrega | Depende de | Tamanho |
|---|---|---|---|
| F0 | Permissões no front, adaptador de `useUserRole`, tipos e erros | backend `epic/v3` com a fase 4 | M |
| F1 | Menu "Organização", rotas, renomeação para Time | F0 | P |
| F2 | Setores | F1 | M |
| F3 | Funções e permissões (editor + comparação) | F1 | G |
| F4 | Time (lista, formulário com setores e funções, perfil) | F2, F3 | G |
| F5 | Dados da empresa na API | F1 | P |
| F6 | Acabamento e kit | F2–F5 | P |

F2, F3 e F5 podem andar em paralelo depois de F1. Fora deste plano: painel do setor (fase 5 do backend) e migração dos consumidores restantes do adaptador `useUserRole`.

---

## 13. Decisões pendentes

| # | Decisão | Recomendação |
|---|---|---|
| D1 | O Time é visível a todos (diretório) ou só a quem gerencia? (pergunta 8 do mapa) | Visível a todos, só leitura. A lista já é permissão base no backend e ajuda a saber quem é de cada setor |
| D2 | Time fica no grupo Organização ou como item próprio? | No grupo Organização, primeiro item |
| D3 | Logo da empresa | Pedir o campo ao backend; até lá, esconder |
| D4 | Usos de `isTechnicalSector`, `isFinance` e similares que decidem layout, não acesso | Trocar por permissões (`servicos.ver_setor`, `financeiro.registrar_cobranca`) caso a caso na F0 |
| D5 | Branch: o front está em `feat/ui-kit` com alterações não commitadas | Fechar ou guardar o trabalho do ui-kit e abrir uma branch nova para este plano |
