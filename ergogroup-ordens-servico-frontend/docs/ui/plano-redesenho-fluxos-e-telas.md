# Plano — redesenho de fluxos, navegação e telas (frontend)

Plano de 10/10/2026. Escopo: **só frontend**. Integra o que o backend entregou nas fases 6 a 11 (`ergogroup-ordens-servico-backend/docs/plano-execucao-comercial-financeiro.md`) e redesenha as telas principais em volta do novo modelo de trabalho. É a **fase 12** daquele plano.

**Legenda de status:**
- **Decidido:** aprovado pelo usuário.
- **Proposta:** sugestão ainda não aprovada.

| Item | Status |
|---|---|
| Rever fluxos, navegação e telas principais, em vez de só adaptar campos | **Decidido** (usuário, 10/10/2026) |
| R0 é a releitura do contrato da API e a camada nova (tipos, serviços, hooks e componentes), sem remendar as telas antigas | **Decidido** (usuário, 10/10/2026) |
| Tipos gerados do schema OpenAPI com `openapi-typescript` | **Decidido** (usuário, 10/10/2026) |
| Trabalho do frontend (R0 a R8) na branch `v3` deste monorepo, que reúne o estado de desenvolvimento antes chamado `epic/v3` | **Decidido** (usuário, 10/10/2026) |
| R1 (fluxos e navegação) e R2 (wireframes) validadas; respostas na seção 9 e na 6.2.3 de `fluxos-e-navegacao.md` | **Decidido** (usuário, 11/10/2026) |
| Diretoria abre numa Visão geral consolidada de todos os setores, com filtro por setor | **Decidido** (usuário, 11/10/2026) |
| Lista (tabela) como visualização padrão da execução; quadro como opção | **Decidido** (usuário, 11/10/2026) |
| Vendas com o mesmo padrão de indicadores clicáveis e filtros em dropdown da execução | **Decidido** (usuário, 11/10/2026) |
| Fases R3 em diante: ordem e conteúdo | Proposta |

Referências:
- backend: ADRs 0003 a 0008, `docs/telas-blocos-e-endpoints.md`, `docs/conceitos-de-dominio.md`, `docs/mapa-de-permissoes.md`;
- frontend: `docs/ui/design-system.md`, `docs/ui/design-system-tabelas.md`, `docs/ui/plano-ui-kit.md`, `docs/ui/plano-organizacao-setores-time.md`.

**Fora de escopo:** OS operacional e catálogo operacional.

---

## 1. Por que redesenhar

1. **O frontend é centrado na OS.** Todos entram pela lista de OS e trabalham no detalhe da OS, que atende técnico, gestor, comercial, financeiro e administrativo ao mesmo tempo (`ordem-detalhe-brief.md`).
2. **O backend agora é centrado no uso.** A unidade de trabalho do setor é o serviço (ADR 0006). Cada pessoa tem um ponto de entrada (fila do setor, meus serviços, vendas, cobranças), e o acesso vem das permissões (ADR 0003).
3. **Conceitos novos sem lugar nas telas atuais:** triagem, distribuição em um passo, alerta sem movimentação com "estou ciente", carga da equipe, linha do tempo, condição de pagamento por tipo, recorrente e as três situações do financeiro.
4. **Contratos quebrados:** vários campos usados pelo frontend saíram ou mudaram (`docs/api/contrato-por-dominio.md`, última seção).
5. **Briefs de UI desatualizados:** `listagem-ordens-brief.md`, `ordem-detalhe-brief.md` e `gestor-operacional-brief.md` usam líder/sub-líder, contrato, horas e complexidade.

## 2. Princípios (proposta)

1. **Navegação por trabalho, não por entidade.** O menu responde "o que eu tenho para fazer?", e não "qual tabela quero ver?".
2. **Cada tela declara a permissão que exige.** Nunca um teste por nome de função ou setor. O `useUserRole` deixa de ser usado em código novo e sai no fim (R7).
3. **Um hook por bloco**, espelhando um endpoint por bloco. A página combina blocos, e cada bloco carrega, atualiza e trata o erro sozinho.
4. **A ação acontece onde a informação está:** distribuir na fila, dar ciência no alerta, lançar na linha de cobrança.
5. **Convenções do projeto:** modais em etapas, nunca empilhados e sem drawers; nome completo das pessoas; uma informação por coluna.
6. **Valores ocultos não são erro.** Sem `financeiro.ver_valores` a API remove os campos. Os tipos tratam esses campos como opcionais, e a tela simplesmente não mostra a seção.

---

## 3. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| R0 | Camada de contrato da API (tipos gerados, serviços, hooks e componentes de domínio) | — |
| R1 | Fluxos por persona e mapa de navegação (documento) | — |
| R2 | Wireframes das telas principais | R1 |
| R3 | Navegação nova e tela inicial por permissão | R1 e R2 validados |
| R4 | Execução: meus serviços, detalhe do serviço, painel do setor | R0 e R3 |
| R5 | Venda: nova venda, vendas, resumo da venda, linha do tempo | R0 e R3 |
| R6 | Financeiro: cobranças e situação financeira | R0 e R3 |
| R7 | Ajustes nas demais telas e remoção do legado | R4 a R6 |
| R8 | Revisão final e atualização dos documentos | R7 |

**Ordem sugerida (proposta):**
- R0 e R1 em paralelo.
- Depois R2 e R3.
- Em seguida, R4 (execução, de onde veio a dor original da gestora técnica), R5 e R6.

R5 e R6 podem trocar de lugar com R4, se você preferir começar pela venda.

**Regra de entrega:** ao fim de cada fase, `npm run lint` e `npm run build` sem erro, teste manual contra o backend local com usuários de perfis diferentes, e commit só quando você pedir.

---

### R0 — Camada de contrato da API ✅

Concluída em 10/10/2026. **Decidido:** a R0 não remenda as telas antigas, que vão ser substituídas nas fases R4 a R6. Ela relê o contrato e constrói a camada nova sobre a qual as telas novas vão nascer.

**Por que não corrigir as telas atuais antes:** o estado do monorepo é o estado de desenvolvimento (confirmado pelo usuário em 10/10/2026). O backend da `v3` (antes `epic/v3`) não está publicado. A quebra das telas antigas existe só no desenvolvimento, e elas serão substituídas.

As telas antigas ficam como estão até a R7.

| # | Item | Resultado |
|---|---|---|
| 0.1 | Schema atual do backend | `docs/api/api-schema.yaml`, gerado com `manage.py spectacular` |
| 0.2 | Leitura do contrato por domínio | `docs/api/contrato-por-dominio.md`: endpoints, permissões, campos ocultáveis e regras de erro |
| 0.3 | Tipos gerados, serviços e hooks | `npm run api:tipos` → `src/api/schema.d.ts`. Utilitários em `src/api/tipos.ts`. Módulos novos `features/execucao`, `features/vendas`, `features/financeiro` e `features/linha-do-tempo`, com um hook por bloco e invalidação entre domínios |
| 0.4 | Componentes de domínio do kit | `EtapaBadge`, `SituacaoPrazoBadge`, `SituacaoFinanceiraBadge`, `TipoCondicaoBadge`, `CondicaoPagamento`, `AndamentoServicos`, `AlertaMovimentacao` e `LinhaDoTempo` |
| 0.5 | Briefing do frontend | `CLAUDE.md` e `AGENTS.md` atualizados |

**Verificação:**
- `tsc` sem erros, inclusive os arquivos novos em modo estrito;
- `npm run build` ok;
- `npm run lint` sem problemas novos (os 49 que já existiam continuam).

Nenhuma tela usa a camada nova ainda: ela entra na R3 em diante.

---

### R1 — Fluxos e navegação (documento) ✅

Entregue em 10/10/2026: [`fluxos-e-navegacao.md`](./fluxos-e-navegacao.md). As perguntas para validar estão na seção 9 dele. Os briefs antigos foram marcados como em revisão.

Entrega: `docs/ui/fluxos-e-navegacao.md`, para validação sua.

Conteúdo:
1. **Personas** = as 10 funções iniciais (antigos tipos), descritas pelas permissões, não pelo nome.
2. **Jornada de cada persona:** o que vê ao entrar, o que faz no dia e com que frequência, e onde cada ação acontece.

| Persona (permissões) | Jornada (proposta) |
|---|---|
| Organizador do setor (`servicos.ver_setor` + `tarefas.distribuir`) | Painel → "X novos para distribuir" → distribuir (responsável + prazo; dividir se preciso) → atrasados e alertas → ciência → concluídos do período |
| Quem executa (sem permissão específica) | Meus serviços → abrir serviço → iniciar e concluir tarefa → ver os outros serviços da OS → ciência do alerta, se for o caso |
| Comercial (`os.gerenciar`) | Nova venda (cliente → condição → serviços) → Vendas (andamento, "minhas") → resumo da venda e linha do tempo |
| Financeiro (`financeiro.registrar_cobranca`) | Cobranças "a faturar" (alertas primeiro) → situação da OS → registrar lançamento → previsão e faturadas |
| Diretoria (`setores.todos`) | Painel com todos os setores, Vendas, Cobranças e Análise |
| Administrativo (`os.gerenciar` sem `ver_valores`) | Nova venda (informa a condição) → Vendas sem valores |

3. **Mapa de navegação (proposta):**

| Grupo | Item | Rota | Permissão |
|---|---|---|---|
| Meu trabalho | Meus serviços | `/meus-servicos` | nenhuma |
| Setor | Painel do setor | `/setor/:setorId?` | `servicos.ver_setor` |
| Vendas | Vendas | `/vendas` (redireciona `/ordens`) | `os.gerenciar` ou `os.ver_todas` |
| Vendas | Nova venda | `/vendas/nova` | `os.gerenciar` |
| Financeiro | Cobranças | `/cobrancas` | `financeiro.registrar_cobranca` |
| Análise | Operacional, Financeiro | como hoje | como hoje |
| Cadastros | Clientes | como hoje | como hoje |
| Organização | Time, Setores, Funções, Catálogo | como hoje | como hoje |

Detalhes, fora do menu: `/servicos/:id` (detalhe do serviço) e `/vendas/:id` (resumo da venda).

4. **Regra da tela inicial (proposta, em ordem):** distribui em algum setor → painel do setor; registra cobrança → cobranças; gerencia OS → vendas; senão → meus serviços.
5. **Briefs antigos:** marcar `listagem-ordens-brief.md`, `ordem-detalhe-brief.md` e `gestor-operacional-brief.md` como superados pelo novo documento.

**Pronto quando:** você aprovar personas, jornadas, menu e regra da tela inicial.

---

### R2 — Wireframes ✅

Validada em 11/10/2026. Os ajustes pedidos na validação (Visão geral da diretoria, lista como padrão, agrupamento do primeiro wireframe e o padrão novo em Vendas) estão nos três arquivos e descritos na seção 6.2.3 de `fluxos-e-navegacao.md`.

Feita em três lotes, um por fluxo, cada um validado antes do próximo (decidido pelo usuário em 10/10/2026):

| Lote | Telas | Situação |
|---|---|---|
| 1 | Menu e tela inicial, Painel do setor (com distribuir e ciência), Meus serviços, Detalhe do serviço | Entregue: [`wireframes/lote1-execucao.html`](./wireframes/lote1-execucao.html) |
| 2 | Vendas, Nova venda (e edição), Resumo da venda com linha do tempo, Acrescentar serviço | Entregue: [`wireframes/lote2-vendas.html`](./wireframes/lote2-vendas.html), que inclui as telas do lote 1 para navegar da venda aos serviços |
| 3 | Cobranças (três situações, contadores, filtros e alerta), Registrar lançamento, Situação financeira | Entregue: [`wireframes/lote3-cobrancas.html`](./wireframes/lote3-cobrancas.html), que inclui os lotes 1 e 2; é o protótipo completo |

O lote 1 usa as propostas da seção 9 de `fluxos-e-navegacao.md` (nomes do menu, tela inicial), até a validação do usuário. O seletor "Ver como" mostra o menu e a tela inicial de cada persona.

Entrega: HTML em `docs/ui/wireframes/`, no padrão dos existentes, com dados de exemplo realistas.

| Wireframe | Blocos (endpoints) |
|---|---|
| Painel do setor | `setores/`, `fila/`, `andamento/`, `alertas/`, `equipe/`, `concluidos/` |
| Modal de distribuir (etapas: responsável e prazo → dividir, opcional) | `POST servicos/{id}/distribuir/`, `equipe/` |
| Meus serviços | `meus-servicos/` |
| Detalhe do serviço | `execucao/servicos/{id}/`, `servicos/{id}/linha-do-tempo/`, ciência |
| Nova venda (etapas: cliente → condição → serviços → revisão) | `POST /ordens/` com `servicos` |
| Vendas | `GET /ordens/` com `andamento`, `?minhas=`, `?etapa=` |
| Resumo da venda | `comercial/vendas/{id}/`, `ordens/{id}/linha-do-tempo/` |
| Cobranças | `financeiro/cobrancas/`, `financeiro/ordens/{id}/`, `PATCH /ordens/{id}/cobranca/` |

**Pronto quando:** você aprovar. A validação com a gestora técnica não vai acontecer (decidido em 11/10/2026).

---

### R3 — Navegação e tela inicial ✅

Concluída em 11/10/2026. **Decidido pelo usuário:** o visual do header, da sidebar e da área principal não muda; só o conteúdo (itens, rotas, permissões).

| # | Resultado |
|---|---|
| 3.1 | `components/layout/navigation.ts`: grupos Meu trabalho (Meus serviços, Visão geral, Painel do setor), Comercial (Vendas, Nova venda, OS operacionais), Financeiro (Cobranças), Análise, Cadastros (Clientes, Catálogo, Catálogo operacional) e Organização. Cada item declara `permissoes` e, quando precisa, `semPermissoes` (o Painel do setor some para quem tem `setores.todos`) |
| 3.2 | `lib/telaInicial.ts` (regra da seção 5 de `fluxos-e-navegacao.md`) e `hooks/useTelaInicial.ts`. Rota `/inicio` leva à tela inicial; `/` vai para ela quando há sessão; o login abre `/inicio`; o logo da sidebar também. "Abrir sempre em…" no menu do usuário, gravado por pessoa só no navegador |
| 3.3 | `components/common/RequerPermissao.tsx`: sem permissão → tela "Você não tem acesso a esta página" com o botão para a tela inicial; sem sessão → login; sessão antiga sem permissões → espera o `/auth/me/`. Guardas em Visão geral, Painel do setor (quem tem `setores.todos` vai para a Visão geral), Vendas, Nova venda, edição, Cobranças (`financeiro.registrar_cobranca`), Análise financeira e Funções |
| 3.4 | `/ordens` → `/vendas` (mantém a busca), `/ordens/new` → `/vendas/nova`, `/ordens/:id` → `/vendas/:id`, `/ordens/:id/edit` → `/vendas/:id/editar`. `/ordens/operacionais` continua igual |
| 3.5 | Breadcrumb com as rotas novas (`Comercial › Vendas › OS 12 › Editar`). Busca global: vendas por número ou cliente abrindo `/vendas/:id` (só para quem vê vendas, com `useVendas` da R0) e a ação "Nova venda" |

**Provisório até as próximas fases:**
- `/vendas`, `/vendas/nova`, `/vendas/:id` e `/vendas/:id/editar` mostram as telas atuais de OS (substituídas na R5). Os links internos delas ainda apontam para `/ordens/...` e passam pelos redirecionamentos.
- Meus serviços, Visão geral, Painel do setor e `/servicos/:id` mostram uma página "em construção" (`pages/EmConstrucaoPage.tsx`), com título e descrição; o conteúdo chega na R4.

**Verificação:** `tsc` sem erros (arquivos novos também em modo estrito), `npm run build` ok, `npm run lint` sem problemas novos (os 49 de antes continuam). Teste no navegador com a API simulada para gestora técnica, técnico, diretoria, comercial e financeiro: tela inicial, menu, guardas, redirecionamentos, breadcrumb e "Abrir sempre em…" conforme a regra; nenhum erro na página.

Itens planejados:

| # | Item |
|---|---|
| 3.1 | `navigation.ts` com os grupos da R1 e as permissões por item, incluindo a Visão geral (`setores.todos`) no lugar do Painel do setor |
| 3.2 | Redirecionamento pós-login pela regra da tela inicial (`LoginPage` e rota `/`) |
| 3.3 | Guarda de rota por permissão (componente `RequerPermissao`): sem acesso → tela "sem acesso", não 403 cru |
| 3.4 | Redirecionamentos dos endereços antigos (`/ordens` → `/vendas`, `/ordens/:id` → `/vendas/:id`) |
| 3.5 | Breadcrumb e busca global (`CommandMenu`, `OrderSearch`) com as rotas novas |

**Pronto quando:** cada perfil de teste vê só o que suas permissões liberam e cai na tela inicial certa.

---

### R4 — Execução ✅ (aguardando o teste contra o backend local)

Entregue em 11/10/2026, no desenho validado na R2 (lista como padrão, quadro como opção, indicadores clicáveis, filtros em dropdown, agrupamento do primeiro wireframe). Header, sidebar e área principal não mudaram.

| # | Resultado |
|---|---|
| 4.1 | `features/execucao/services.ts` e `hooks.ts` ganharam `editarTarefa`/`useEditarTarefa` (status, responsável, prazo, descrição) e `excluirTarefa`/`useExcluirTarefa`, com a mesma invalidação de distribuir e ciência. `useBlocosDoPainel.ts` carrega os cinco blocos de um ou de vários setores e junta tudo (com o setor de origem em cada item) |
| 4.2 | Kit: `Indicadores` (indicador que também é filtro), `BarraDeFiltros` (`FiltroDropdown`, `OpcaoDeFiltro`, `FiltroDePeriodo`, `BuscaDeFiltros`, `ChipsDeFiltros`, `AlternarVisualizacao`) e `Chip`. `lib/periodo.ts`: esta semana, próximos 7 dias, este mês, mês passado e personalizado |
| 4.3 | `pages/MeusServicosPage.tsx` (`/meus-servicos`): indicadores Com você, Atrasados, Vencem em 7 dias e Concluídos no mês; filtros Cliente e Data (prazo ou conclusão) e busca; Iniciar e Concluir na linha; quadro A fazer / Em andamento / Concluídas, com arrastar para mudar o status |
| 4.4 | `pages/DetalheDoServicoPage.tsx` (`/servicos/:id`): etapa, prazo e situação, prioridade, início, término, movimentação e ciência; tarefas com Iniciar/Concluir/Reabrir para o responsável e "Editar" (responsável, prazo, status, parte, excluir) conforme `tarefas.distribuir` e `tarefas.editar_setor` no setor; venda sem valores; outros serviços da OS (com link só para quem acompanha setor ou vê vendas); linha do tempo; Distribuir/Dividir e Estou ciente por `pode_distribuir` e `pode_dar_ciencia` |
| 4.5 | `pages/PainelDoSetorPage.tsx` (`/setor/:setorId` e `/visao-geral`): indicadores Para distribuir, Em andamento, Atrasados, Parados e Concluídos no mês (o escolhido fica na URL, `?foco=`); filtros Setor (Visão geral), Pessoa (com a carga), Cliente, Prioridade (na fila), Data (chegada, prazo ou conclusão, conforme o indicador), Agrupar e busca. Lista: fila com "Outros serviços da OS"; andamento, atrasados e parados agrupados por pessoa; concluídos com o resultado do prazo. Quadro: colunas por etapa, arrastar da fila para "Distribuído" abre a distribuição. Visão geral: tabela por setor que filtra ao clicar (`?setor=`) e coluna Setor na lista |
| 4.6 | `components/DistribuirModal.tsx`: responsável (só `membro_do_setor`, com ativos e atrasados), prazo rápido (7, 15, 30 dias, sem prazo) ou data, observação; "Dividir entre pessoas" cria uma tarefa por parte |
| 4.7 | `components/CienciaModal.tsx`: motivo opcional e observação; avisa que o prazo continua contando |
| 4.8 | 403 em `setores/` → "Você não acompanha nenhum setor"; setor da URL que a pessoa não acompanha → lista dos que acompanha; 404 do serviço → "Serviço não encontrado" com a explicação; erros de distribuir, ciência e tarefa aparecem no modal com a mensagem do backend (ex.: responsável fora do setor) |

**Verificação:** `tsc` sem erros (os arquivos novos também em modo estrito), `npm run build` ok, `npm run lint` sem problemas novos. Teste no navegador com a API simulada (gestora técnica, técnico e diretoria): distribuir pelo botão e arrastando, ciência, edição de prazo da tarefa, Iniciar e arrastar no quadro do técnico, agrupamento por pessoa e por OS, Visão geral com filtro por setor, largura de 400px sem rolagem horizontal; as chamadas saíram com o corpo certo e não houve erro na página.

**Falta para fechar:** o teste manual contra o backend local com usuários reais (regra de entrega das fases).

**Limitações conhecidas (propostas em `fluxos-e-navegacao.md` §10):**
- o quadro deduz "Distribuído" ou "Em execução" das tarefas ativas quando o serviço não está nos alertas; o bloco `quadro/` resolveria;
- a Visão geral faz cinco chamadas por setor;
- `setores/` não diz se o setor está sem quem organize, então o aviso da Visão geral ainda não aparece;
- o quadro ainda não tem raias por OS nem por pessoa (a lista tem os dois agrupamentos).

Itens planejados:

| # | Item | Detalhe |
|---|---|---|
| 4.1 | Serviços e hooks | Um hook por bloco; invalidação após distribuir e após ciência (fila, andamento, alertas, equipe, contadores) |
| 4.2 | Componentes do kit | Etapa do serviço (`na_fila`, `distribuido`, `em_execucao`, `concluido`, `cancelado`), situação de prazo (`atrasado`, `vence_7_dias`, `depois`, `sem_prazo`), badge de alerta, motivo da ciência |
| 4.3 | Meus serviços | Lista com os atrasados primeiro, mudança de status da tarefa em um clique, aba de histórico (`?status=concluida&de=&ate=`) |
| 4.4 | Detalhe do serviço | Etapa, prazo, tarefas, alerta e ciência, contexto da OS sem valores, outros serviços da OS e linha do tempo do serviço; ações conforme `pode_distribuir` e `pode_dar_ciencia` |
| 4.5 | Painel do setor | Seletor de setor com contadores; destaque da triagem; fila (agrupar por cliente ou OS); andamento agrupado por pessoa; alertas; equipe; concluídos no período |
| 4.6 | Distribuir | Modal em etapas; responsáveis vindos de `equipe/` (só `membro_do_setor`); prazo opcional, com aviso de "sem prazo" |
| 4.7 | Ciência | Modal curto: motivo opcional (`cliente`, `documentacao`, `agendamento`, `terceiro`, `outro`) + observação |
| 4.8 | Tratamento de erros | 400 sem setor, 403 sem acompanhar o setor, 404 de serviço não visível, 400 de responsável fora do setor |

**Pronto quando:** o fluxo fila → distribuição → execução → conclusão roda de ponta a ponta com um organizador e um técnico, incluindo um setor novo sem nada no código.

---

### R5 — Venda ✅ (aguardando o teste contra o backend local)

Entregue em 11/10/2026. As telas antigas de OS (`features/ordens/pages/OrdemServico*`, `OrdemDetalhePage`) saíram das rotas e ficam no código até a R7.

| # | Resultado |
|---|---|
| 5.1 | `features/vendas/pages/NovaVendaPage.tsx` (`/vendas/nova`): página em quatro etapas (cliente e venda → condição → serviços → revisão). Cliente e catálogo com busca (`components/SeletorBusca.tsx`); catálogos inativos não aparecem; cada serviço mostra "vai para <setor>". Condição por tipo, com as regras do backend conferidas antes de enviar (`condicao.ts`: `validarCondicao`) e a prévia do texto (`previaDaCondicao`). Contato da NF sugerido pelo representante do cliente. Revisão com a condição em texto e os serviços por setor, avisando quem recebe e-mail. Um `POST` com `servicos`; erros 400 voltam para a etapa e o campo |
| 5.2 | Edição (`/vendas/:id/editar`): etapas 1 e 2; a 2 some para quem não vê valores (o `PATCH` não manda a condição). Serviços se acrescentam no resumo (`AcrescentarServicoModal`, `POST /servicos/`, avisa só o setor dele) |
| 5.3 | `pages/VendasPage.tsx` (`/vendas`): indicadores Para distribuir, Em execução, Concluídas e A faturar (este só para quem vê valores); filtros Vendedor ("Minhas vendas" usa `?minhas=true`), Cliente, Financeiro e Data da venda, e busca por cliente ou número; colunas OS, Cliente, Venda, Vendedor, Andamento, Status e, com valores, Condição (o texto completo ao passar o mouse), Valor e Financeiro |
| 5.4 | `pages/ResumoDaVendaPage.tsx` (`/vendas/:id`): status, andamento, prioridade e observação; serviços com setor, etapa, com quem (e quando começou ou concluiu), prazo e conclusão, abrindo o detalhe do serviço para quem acompanha setor ou vê todas as OS; condição e financeiro (liberação e lançamento) só com valores; ações PDF, Acrescentar serviço, Editar venda e Excluir venda (`os.excluir`, com confirmação) |
| 5.5 | A linha do tempo da venda usa o `LinhaDoTempo` da R0 (o mesmo do detalhe do serviço) |
| 5.6 | `components/ResumoDaVendaPdf.tsx`: PDF a partir do resumo da venda, gerado sob demanda (o `@react-pdf` só carrega ao clicar); sem valores, a condição não entra |

**Verificação:** `tsc` sem erros (`features/vendas` também em modo estrito), `npm run build` ok, `npm run lint` sem problemas novos. Teste no navegador com a API simulada, como comercial (vê valores, pode excluir) e administrativo (sem valores): lista com indicadores e filtros, nova venda recorrente com dois serviços de setores diferentes (validação do valor mensal, contato da NF sugerido, revisão por setor), resumo, acrescentar serviço, PDF (arquivo válido), edição e exclusão; as chamadas saíram com o corpo certo e não houve erro na página. O teste da R4 continuou passando.

**Falta para fechar:** o teste manual contra o backend local, criando vendas dos três tipos com serviços de setores diferentes e conferindo a fila de cada setor.

**Diferenças em relação ao decidido em 11/10/2026 (limitação da API, proposta em `fluxos-e-navegacao.md` §10):** o indicador "Com atraso" e o filtro Setor não entraram, e "Concluídas no mês" virou "Concluídas", porque a lista de vendas não traz atraso, setores nem a data de conclusão.

Itens planejados:

| # | Item | Detalhe |
|---|---|---|
| 5.1 | Nova venda | Modal ou página em etapas: cliente → condição (campos por `tipo_condicao`, `valor_mensal` no recorrente, `liberar_em`) → serviços (catálogos ativos, setor de cada um à vista) → revisão com `condicao_resumo` montado no front só como prévia. Um `POST` com `servicos` |
| 5.2 | Edição da venda | Dados da venda e condição; serviços acrescentados pela API de serviços (avisa só o setor do serviço) |
| 5.3 | Vendas | Tabela com cliente, data, quem vendeu, condição, andamento ("2 de 4 concluídos") e etapa; filtros "minhas" e etapa; valores só com `financeiro.ver_valores` |
| 5.4 | Resumo da venda | Quem vendeu e quando, condições (se puder ver), serviços com setor, etapa, responsáveis e datas, liberação e lançamento |
| 5.5 | Linha do tempo | Componente único para OS e serviço, a partir dos 23 tipos de evento; substitui `OrdemAuditoriaTimeline` |
| 5.6 | PDF da OS | Ajustado ao resumo da venda |

**Pronto quando:** comercial e administrativo criam vendas dos três tipos com vários serviços de setores diferentes, e o organizador de cada setor vê os serviços na fila.

---

### R6 — Financeiro ✅ (aguardando o teste contra o backend local)

Entregue em 11/10/2026, no desenho do wireframe do lote 3 (que o usuário pediu para manter), com os componentes do kit. A tela antiga (`features/faturamento`) saiu das rotas e é removida na R7.

| # | Resultado |
|---|---|
| 6.1 | `features/financeiro/pages/CobrancasPage.tsx` (`/cobrancas`): as três situações (A faturar, Previsão, Faturadas) como indicadores com a quantidade e o valor; aviso das liberadas há 3 dias ou mais sem lançamento, com "Ver só essas" (`em_alerta=true`); filtros Cliente, Data da venda, Condição e Forma em dropdown, enviados ao backend; situação e filtros na URL; a ordem de cada situação explicada na barra |
| 6.2 | Linha: OS, Cliente, Venda, Valor (e o mensal), Condição (tipo, texto e forma), NF para; em A faturar, Liberada (quando, por quê e por quem), Aguardando (destacado em alerta) e o botão Registrar; na Previsão, Andamento e quando libera; nas Faturadas, o lançamento (referência, data, quem, manual ou integração) e a liberação |
| 6.3 | `components/RegistrarLancamentoModal.tsx`: mostra a condição para lançar, referência opcional e data (padrão: hoje); erro do backend no modal. Disponível na linha e na situação da OS |
| 6.4 | `pages/SituacaoFinanceiraPage.tsx` (`/cobrancas/:id`, `financeiro.ver_valores`): o que lançar (condição, valor, mensal, parcelas, vencimento, forma, NF com botão de copiar o e-mail), observação, eventos financeiros, liberação, lançamento e serviços com a etapa; links para o resumo da venda |
| 6.5 | Análise › Financeiro: indicadores Faturado, A faturar, Previsão (`total_previsao`), Receita recorrente mensal (com `recorrentes_ativos`) e Ticket médio, e a tabela "Por tipo de condição" (`por_tipo_condicao`). A página passou a usar `useIndicadoresFinanceiros` (tipos gerados); os gráficos continuam como estavam |

**Verificação:** `tsc` sem erros (`features/financeiro` também em modo estrito), `npm run build` ok, `npm run lint` sem problemas novos. Teste no navegador com a API simulada, como financeiro: as três situações com contadores, "Ver só essas", registrar lançamento (`PATCH /ordens/{id}/cobranca/` com referência e data), filtro de condição refletido nos contadores, situação financeira com o breadcrumb "OS 1286" e a Análise financeira; nenhum erro na página. Os testes da R4 e da R5 continuaram passando.

**Falta para fechar:** o teste manual contra o backend local, faturando uma OS do começo ao fim (liberação na venda e na conclusão).

Itens planejados:

| # | Item | Detalhe |
|---|---|---|
| 6.1 | Cobranças | Três abas (a faturar, faturadas, previsão) com os contadores (quantidade e valor); filtros de cliente, período, tipo de condição, forma de pagamento e "em alerta"; os alertas primeiro |
| 6.2 | Linha de cobrança | Cliente, OS, venda, condição, primeiro vencimento, contato da NF, liberação, dias aguardando; na previsão, o andamento |
| 6.3 | Registrar lançamento | Na própria linha ou na situação da OS: referência (texto) e data |
| 6.4 | Situação financeira da OS | `financeiro/ordens/{id}/`: tudo da linha, os serviços com a etapa e os eventos |
| 6.5 | Indicadores | KPIs da tela de cobranças e da análise financeira com `total_previsao`, `por_tipo_condicao`, `receita_recorrente_mensal` e `recorrentes_ativos` |

**Pronto quando:** o financeiro fatura uma OS do início ao fim sem sair da tela de cobranças.

---

### R7 — Ajustes e remoção do legado

| # | Item |
|---|---|
| 7.1 | Setores: badge "sem organizador" e a lista de organizadores |
| 7.2 | Catálogo: mostrar os `avisos` devolvidos ao salvar |
| 7.3 | Remover o `useUserRole` e trocar os usos por `usePermissoes().pode()` |
| 7.4 | Remover a lista de OS e o detalhe da OS antigos, depois que vendas e resumo cobrirem tudo |
| 7.5 | Remover código morto (tipos antigos em `types/index.ts`, `mockData`, componentes sem uso) |
| 7.6 | Análise operacional: tirar `complexidade_media_concluidas` e `horas_estimadas_entregues` da produtividade |
| 7.7 | Telas de cadastro e time que continuam: trocar os tipos escritos à mão pelos gerados (`src/api/tipos.ts`) |

### R8 — Revisão final

- Teste manual completo com cada persona.
- Atualizar `telas-blocos-e-endpoints.md` (seção 5, páginas do frontend) nos dois repositórios.
- Atualizar o ADR 0006, seção 8, com as visões efetivamente implementadas.
- Marcar a fase 12 como concluída no plano do backend.

---

## 4. Decisões pendentes (perguntar antes da fase correspondente)

| # | Pergunta | Fase |
|---|---|---|
| 1 | Ordem: execução (R4) antes da venda (R5), ou o contrário? | antes da R4 |
| 2 | ~~Nomes no menu~~ Respondida em 11/10/2026: Vendas, Painel do setor, Cobranças e Visão geral | R1 |
| 3 | ~~Regra e ordem da tela inicial~~ Respondida em 11/10/2026: seção 5 de `fluxos-e-navegacao.md` | R1 |
| 4 | ~~Nova venda em modal ou página~~ Respondida em 11/10/2026: página com etapas | R2 |
| 5 | ~~Validar com a gestora técnica~~ Respondida em 11/10/2026: não haverá | R2 |
| 6 | O técnico também pode distribuir a si mesmo um serviço da fila? (hoje exige `tarefas.distribuir`) | R4 |
| 7 | Análise operacional: só ajustar campos (R7) ou redesenhar com os indicadores de prazo? | depois da R8 |

## 5. Riscos

- **Schema desatualizado:** a cada mudança no backend, baixar o schema e rodar `npm run api:tipos`. Os erros de compilação mostram o que mudou.
- **Banco de dev compartilhado:** testes manuais criam vendas e disparam e-mails se `EMAIL_NOTIFICATIONS_ENABLED` estiver ligado.
- **Período de convivência:** entre R3 e R7 existem telas novas e antigas. Os redirecionamentos da R3 evitam links quebrados.
- **Telas antigas quebradas na dev:** contra o backend da `v3`, as telas atuais perdem campos (contrato, NF, horas). Use as telas novas para testar o que o backend mudou.
