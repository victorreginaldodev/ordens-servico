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
| Fases R1 em diante: ordem e conteúdo | Proposta |

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

**Por que não corrigir as telas atuais antes:**
- a `epic/v3` do backend não vai para a `main` antes de o trabalho terminar;
- em produção, frontend e backend antigos continuam consistentes entre si;
- a quebra existe só no ambiente de desenvolvimento.

*Pressuposto a confirmar com o usuário:* a `epic/v3` do backend não está publicada em nenhum ambiente usado de verdade.

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

### R1 — Fluxos e navegação (documento)

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

### R2 — Wireframes

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

**Pronto quando:** você aprovar, e o painel do setor for validado com a gestora técnica.

---

### R3 — Navegação e tela inicial

| # | Item |
|---|---|
| 3.1 | `navigation.ts` com os grupos da R1 e as permissões por item |
| 3.2 | Redirecionamento pós-login pela regra da tela inicial (`LoginPage` e rota `/`) |
| 3.3 | Guarda de rota por permissão (componente `RequerPermissao`): sem acesso → tela "sem acesso", não 403 cru |
| 3.4 | Redirecionamentos dos endereços antigos (`/ordens` → `/vendas`, `/ordens/:id` → `/vendas/:id`) |
| 3.5 | Breadcrumb e busca global (`CommandMenu`, `OrderSearch`) com as rotas novas |

**Pronto quando:** cada perfil de teste vê só o que suas permissões liberam e cai na tela inicial certa.

---

### R4 — Execução

Código novo em `src/features/execucao/` (`services.ts`, `hooks.ts`, `pages/`, `components/`).

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

### R5 — Venda

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

### R6 — Financeiro

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
| 2 | Nomes no menu: "Vendas" ou "Ordens de serviço"? "Painel do setor"? "Faturar" ou "Cobranças"? (o nome do passo "lançado" ainda é provisório, ADR 0007) | R1 |
| 3 | Regra e ordem da tela inicial | R1 |
| 4 | Nova venda em modal com etapas ou página com etapas? | R2 |
| 5 | Validar o painel do setor com a gestora técnica antes de implementar? | R2 |
| 6 | O técnico também pode distribuir a si mesmo um serviço da fila? (hoje exige `tarefas.distribuir`) | R4 |
| 7 | Análise operacional: só ajustar campos (R7) ou redesenhar com os indicadores de prazo? | depois da R8 |

## 5. Riscos

- **Schema desatualizado:** a cada mudança no backend, baixar o schema e rodar `npm run api:tipos`. Os erros de compilação mostram o que mudou.
- **Banco de dev compartilhado:** testes manuais criam vendas e disparam e-mails se `EMAIL_NOTIFICATIONS_ENABLED` estiver ligado.
- **Período de convivência:** entre R3 e R7 existem telas novas e antigas. Os redirecionamentos da R3 evitam links quebrados.
- **Telas antigas quebradas na dev:** contra o backend da `epic/v3`, as telas atuais perdem campos (contrato, NF, horas). Use as telas novas para testar o que o backend mudou.
