# Revisão de permissões, setores e catálogo por setor

Revisão de 14/10/2026, pedida pelo usuário ("o gestor comercial precisa receber tarefas, o diretor também; está confuso"). **Tudo na seção 3 é proposta**, a decidir. As seções 1 e 2 descrevem o código e os dados do banco de dev nesta data.

> **Decisões do usuário (14/10/2026):** aprovadas as recomendações deste documento (P1 a P7, na ordem da seção 4).
> - **Gestor Técnico e ver valores:** por padrão **não** vê; a permissão fica disponível para a diretoria ativar na função, se quiser.
> - **Começar por P1 e P2** (backend e, depois do wireframe, as telas).
>
> **Definições de implementação (proposta minha, a validar na entrega):**
> - "Também executa em" fica **na pessoa** (modelo `AtuacaoEmSetor`), e não no vínculo, para não se perder quando a pessoa muda de setor;
> - quem marca ou desmarca "Também executa em" no setor S precisa gerenciar usuários e **distribuir em S** (ninguém concede o que não tem);
> - a permissão "Recebe tarefas" (`tarefas.receber`) é de escopo por setor e **não** é estendida por `setores.todos`: o diretor só recebe onde estiver lotado com ela ou onde "também executa".

## 1. Como funciona hoje

### 1.1 O modelo
- **Organização → Setor → Função → Vínculo** (ADR 0003).
- **Vínculo** (`MembroSetor`): usuário + setor + função. **Cada pessoa tem um vínculo só** (decisão de 10/10/2026; restrição `membro_setor_um_setor_por_usuario`).
- **Função**: nome livre, as permissões marcadas e os setores em que pode ser usada.
- **Permissões** (`apps/organizacoes/permissoes.py`): 19 códigos, de dois escopos:
  - **por setor** (4): `servicos.ver_setor`, `servicos.gerenciar`, `tarefas.distribuir`, `tarefas.editar_setor`. Valem só no setor do vínculo;
  - **globais** (15): as demais, que valem na organização toda;
  - **`setores.todos`** é uma permissão especial: faz as 4 por setor valerem em todos os setores.
- **Organizador do setor**: membro com `servicos.ver_setor` + `tarefas.distribuir` no setor. Recebe o aviso de chegada.

### 1.2 Quem recebe tarefas
- Regra (ADR 0008, 2; `validar_responsavel_no_setor`): **só quem tem vínculo ativo no setor do serviço**.
- **Não existe permissão para "receber tarefa"**: qualquer membro do setor recebe, seja qual for a função; ninguém de fora recebe.
- Consequência: **o Diretor e o Gestor Comercial não podem receber tarefas de Segurança do Trabalho**, porque o vínculo deles é com Diretoria e Comercial, e cada pessoa só tem um. Eles **podem distribuir** (têm `setores.todos` + `tarefas.distribuir`), mas não podem se atribuir.

### 1.3 Os dados reais (banco de dev, 14/10/2026)

| Setor | Membros | Catálogos | Quem organiza |
|---|---|---|---|
| Segurança do Trabalho | 28 | 122 | 7 pessoas |
| Ergonomia | **0** | 1 | **ninguém** |
| Diretoria | 4 | 0 | os 4 diretores |
| Comercial | 3 | 0 | 1 (o Gestor Comercial) |
| Administrativo | 7 | 0 | ninguém |
| Financeiro | 1 | 0 | ninguém |

| Função | Setores | Pessoas | Destaques |
|---|---|---|---|
| Diretor | Diretoria | 4 | todas as permissões, inclusive `setores.todos` e `usuarios.gerenciar_diretoria` |
| **Gestor Comercial** | Comercial | 1 | **as mesmas permissões do Diretor**, inclusive `setores.todos` e `usuarios.gerenciar_diretoria` |
| Gestor Técnico | Segurança do Trabalho | 4 | gestão do setor, `usuarios.gerenciar`, `organizacao.configurar` |
| Sub-Gestor Técnico | Segurança do Trabalho | 3 | gestão do setor, sem `os.gerenciar` |
| Técnico | Segurança do Trabalho | 21 | `auditoria.ver`, `clientes.gerenciar` (e a OS operacional, fora de escopo) |
| Comercial, Administrativo, Financeiro | o setor de mesmo nome | 2, 7, 1 | variações de vendas, clientes, valores e cobrança |
| Gestor Administrativo, Gestor Financeiro | | 0 | sem ninguém |

**Catálogo:** dos 123 catálogos, 122 estão em Segurança do Trabalho, inclusive **9 com nome "ERGONOMIA - …"** (ex.: "ERGONOMIA - PSICOSSOCIAL LEGAL", que estão entre os 63 novos do painel). É a migração de 10/10/2026, que pôs tudo em Segurança do Trabalho e deixou a classificação fina para depois.

## 2. Diagnóstico

| # | Problema | Efeito |
|---|---|---|
| D1 | **Lotação e atuação são a mesma coisa.** O vínculo único diz ao mesmo tempo onde a pessoa está (organograma) e onde ela pode executar. | Quem executa em mais de um lugar (diretor, gestor comercial, um técnico que faz ergonomia e segurança) não pode receber tarefas fora do seu setor. É o caso relatado. |
| D2 | **Receber tarefa é implícito.** Não há permissão; vale "ser membro". | Não dá para dizer "este cargo recebe tarefas" nem "este não recebe" (ex.: um estagiário, um administrativo dentro de um setor de execução). |
| D3 | **Gestor Comercial = Diretor.** A função tem `setores.todos` e `usuarios.gerenciar_diretoria`. | O sistema trata o Gestor Comercial como diretoria (`eh_diretoria`): pode gerenciar diretores, distribuir e editar tarefas em qualquer setor e configurar a organização. Pode ser intencional, mas não está registrado em lugar nenhum. |
| D4 | **`setores.todos` mistura duas coisas.** É uma permissão que altera as outras, e ainda faz a pessoa aparecer como organizadora do próprio setor (os 4 diretores "organizam a Diretoria"). | Difícil de explicar na tela de funções; ninguém sabe o efeito de marcá-la. |
| D5 | **Permissões amplas demais em funções comuns.** Técnico com `auditoria.ver` e `clientes.gerenciar` (pode excluir cliente); Gestor Técnico com `usuarios.gerenciar` e `organizacao.configurar`. | Risco de alteração indevida; o princípio do menor privilégio não está sendo seguido. |
| D6 | **Funções com o mesmo nome do setor** (Comercial no Comercial, Administrativo no Administrativo, Financeiro no Financeiro) e funções sem ninguém (Gestor Administrativo, Gestor Financeiro). | Confusão entre "setor" e "função" na conversa e nas telas. |
| D7 | **Catálogo mal classificado.** 9 catálogos de ergonomia em Segurança do Trabalho; Ergonomia tem 1 catálogo e 0 membros. | Os serviços de ergonomia caem na fila de Segurança do Trabalho; um serviço do catálogo de Ergonomia cairia numa fila sem ninguém (hoje só o aviso no cadastro do catálogo). |
| D8 | **Os códigos e nomes das permissões não falam a língua da tela.** "servicos.ver_setor", "tarefas.editar_setor", "setores.todos". O escopo (setor ou organização) não aparece. | A matriz de funções é difícil de ler; não dá para prever o que uma pessoa vai ver. |

## 3. Propostas

### P1. Separar lotação de atuação: "Também executa em" (resolve D1) — **recomendada**
- O vínculo continua único: é a **lotação** (o setor da pessoa, a função, as permissões de gestão).
- Nova lista por pessoa: **setores em que também executa** (`MembroSetor.tambem_executa_em`, muitos-para-muitos com Setor). Ali a pessoa **só recebe tarefas**: não ganha nenhuma permissão de gestão (não vê a fila, não distribui).
- A regra de quem recebe passa a ser: **membro do setor do serviço, ou setor listado em "também executa em"**.
- Na tela da pessoa (Time): "Lotação: Comercial · Gestor Comercial" e "Também executa em: Segurança do Trabalho".
- No modal de distribuir, essas pessoas aparecem num grupo separado ("De outros setores").
- **Alternativas descartadas:**
  - *voltar a permitir vários vínculos*: resolve, mas reabre a decisão de 10/10/2026 e multiplica as permissões de gestão por setor, que é justamente o que confunde;
  - *quem tem `setores.todos` recebe em qualquer setor*: resolve o diretor e o gestor comercial sem tela nova, mas põe a diretoria inteira na lista de responsáveis de todos os setores e não resolve o técnico que atua em dois setores.

### P2. Permissão explícita "Recebe tarefas" (resolve D2)
- Nova permissão **por setor**: `tarefas.receber` ("Pode ser responsável por tarefas").
- Marcada nas funções que executam (Técnico, Sub-Gestor, Gestor Técnico); a migração marca em todas as funções que hoje têm membros em setores com catálogo, para nada mudar no dia.
- Regra final: **recebe tarefa no setor S quem (tem vínculo em S e a função tem `tarefas.receber`) ou (S está em "também executa em")**.
- Ganho: a lista de responsáveis do modal mostra só quem executa; um "Administrativo" lotado num setor de execução não aparece.

### P3. Rever as funções existentes (resolve D3, D5 e D6) — **decisão do usuário, com a minha sugestão**

| Função | Sugestão |
|---|---|
| Gestor Comercial | Confirmar se deve ser igual ao Diretor. Sugestão: tirar `usuarios.gerenciar_diretoria` (deixa de ser tratado como diretoria) e avaliar `organizacao.configurar`; manter `setores.todos` se ele de fato acompanha a execução. |
| Técnico | Tirar `clientes.gerenciar` (excluir cliente não é do técnico) e avaliar `auditoria.ver`. |
| Gestor Técnico | Avaliar `usuarios.gerenciar` e `organizacao.configurar`: hoje o gestor de um setor configura a organização inteira. |
| Comercial / Administrativo / Financeiro | Renomear para o cargo (ex.: "Analista Comercial", "Assistente Administrativo", "Analista Financeiro"), para não confundir com o setor. |
| Gestor Administrativo / Gestor Financeiro | Sem ninguém: manter (cargo previsto) ou desativar. |

Isso é configuração (tela de Funções), não código; dá para fazer junto com o usuário.

### P4. Explicar as permissões na tela (resolve D4 e D8)
- **Agrupar** a matriz de funções por área: Vendas · Execução · Financeiro · Cadastros · Pessoas e organização · Indicadores e auditoria.
- **Nome e descrição em linguagem de tela**, com o escopo visível. Exemplos:
  - `servicos.ver_setor` → "Acompanhar o setor: ver a fila, o andamento e a equipe" · *no setor da pessoa*;
  - `tarefas.distribuir` → "Distribuir: escolher responsável e prazo" · *no setor da pessoa*;
  - `setores.todos` → "Atuar em todos os setores: as permissões de setor valem em qualquer setor" · *organização*.
- **Prévia** na função e na pessoa: "Quem tem esta função vê: Vendas, Painel do setor (Segurança do Trabalho) …; pode: distribuir, editar tarefas …".
- **Organizador**: a diretoria não aparece como organizadora da própria Diretoria (filtrar setores sem catálogo), para a lista fazer sentido.

### P5. Catálogo por setor (resolve D7)
- **Classificar o catálogo agora:** mover os 9 "ERGONOMIA - …" para Ergonomia **depois** de Ergonomia ter quem organize (P1/P2 ou vínculos novos); senão os serviços vão para uma fila sem ninguém.
- **Tela de catálogo:** filtro por setor, coluna Setor e **mudar o setor em lote** (selecionar vários catálogos e escolher o setor).
- **Ao mudar o setor de um catálogo**, perguntar: "Mover também os N serviços em aberto deste catálogo?" (hoje, de propósito, os já vendidos ficam no setor original; a pergunta torna isso uma escolha consciente).
- **Bloquear (e não só avisar)** apontar um catálogo ativo para um setor sem quem receba tarefas, ou oferecer configurar o setor na mesma hora.

### P6. Setores: mostrar o papel de cada um (apoia D7 e D4)
- Na tela de Setores, cada setor mostra o que é, derivado (sem campo novo): **"Executa N catálogos"** ou **"Não executa serviços"**; quem organiza; quantas pessoas recebem tarefas (P2); e avisos: "sem quem organize", "sem quem receba tarefas".

### P7. Ver valores (`financeiro.ver_valores`) — pergunta do usuário em 14/10/2026
**Já existe e já bloqueia.** Sem ela, a pessoa não vê:
- na OS (lista, detalhe e edição): valor, tipo de condição, forma de pagamento, parcelas, vencimento, liberação, o resumo da condição e a observação de pagamento; a busca também não procura na observação;
- no resumo da venda (`/api/comercial/vendas/{id}/`): as condições e o bloco financeiro;
- a situação financeira da OS (`/api/financeiro/ordens/{id}/`) e os indicadores financeiros (`/api/analise/financeiro/`): 403;
- na linha do tempo: a condição de pagamento e a referência do lançamento;
- nos e-mails: os valores;
- no frontend: as colunas marcadas como financeiras, a condição de pagamento e o menu de Análise financeira.

**Quem tem hoje (banco de dev):** Diretor, Gestor Comercial, Comercial, Financeiro, Gestor Financeiro e **Gestor Técnico**. Não têm: Técnico, Sub-Gestor Técnico, Administrativo e Gestor Administrativo.

**Lacuna encontrada (D9):** a tela de Cobranças (`/api/financeiro/cobrancas/`) exige `financeiro.registrar_cobranca`, mas **não** `financeiro.ver_valores`, e mostra o valor. Hoje não vaza, porque todas as funções com uma têm a outra; mas uma função configurada só com "registrar cobrança" veria valores.

**Propostas:**
- **Registrar cobrança exige ver valores:** a tela de Funções não deixa marcar `financeiro.registrar_cobranca` sem `financeiro.ver_valores` (e o backend valida). Alternativa: esconder os valores nas Cobranças para quem não vê valores.
- **Confirmar o Gestor Técnico:** ele vê valores hoje; o Sub-Gestor e o Técnico não. Decidir se o gestor do setor de execução precisa ver o valor das vendas.
- Na tela de Funções (P4), "Ver valores" fica no grupo Financeiro, com a descrição do que ela libera e do que esconde.

## Entrega 1 — backend de P1 e P2 (implementada em 14/10/2026)
- **Modelo:** `AtuacaoEmSetor` (usuário + setor, único por par), "Também executa em".
- **Permissão:** `tarefas.receber` ("Pode ser responsável por tarefas do setor"), de escopo por setor; `setores.todos` não a estende.
- **Migrações (`organizacoes`):** `0019` (lista de permissões), `0020` (`AtuacaoEmSetor`), `0021` (marca `tarefas.receber` nas funções usadas em setores que executam: os que têm catálogo e Segurança do Trabalho; nada muda no dia), `0022` (Gestor Técnico sem `financeiro.ver_valores`, decisão do usuário; a diretoria pode reativar na função).
- **Regra de quem recebe** (`Setor.recebedores()` e `recebe_tarefas()`; `validar_responsavel_no_setor`): lotado com `tarefas.receber` ou com o setor em "também executa em". Mensagem: "Fulano não recebe tarefas do setor X". Vale na distribuição, na criação e na troca de responsável.
- **Conceder:** "Recebe tarefas" pode ser concedida por quem distribui no setor (senão a diretoria, que não recebe, não conseguiria dar a função Técnico a ninguém).
- **API de usuários** (`/api/usuarios/`): `tambem_executa_em` na lista e no detalhe (`[{setor, setor_nome}]`) e na criação e edição (lista de IDs; substitui). Quem não gerencia usuários não altera; cada setor que entra ou sai exige distribuir nele; o setor da lotação não entra (400). A proteção existente continua: só a diretoria edita quem é tratado como diretoria (ex.: o Gestor Comercial).
- **Carga da equipe / lista de responsáveis** (`/api/execucao/equipe/`): traz quem recebe tarefas do setor, inclusive quem é de outro setor; novos campos `recebe_tarefas` e `setor_de_origem_nome`; `membro_do_setor` passa a significar "lotado neste setor". Quem é lotado mas não recebe não aparece (a não ser que ainda tenha tarefa ativa).
- **Testes:** `apps/organizacoes/tests_recebe_tarefas.py`; testes que montam funções próprias ganharam `tarefas.receber`.
- **Migrações aplicadas no banco de dev em 14/10/2026** (a pedido do usuário): "Recebe tarefas" marcada em Gestor Técnico, Sub-Gestor Técnico e Técnico; "Ver valores" retirada do Gestor Técnico.

## Entrega 2 — telas de P1 (implementada em 14/10/2026, wireframe aprovado)
- **Time, editar ou adicionar pessoa:** campo **"Também executa em"** abaixo de "Setores e funções" (`features/time/components/TambemExecutaEmEditor.tsx`): os setores em chips, com "+ Adicionar setor". Só aparecem para adicionar, e só têm o botão de tirar, os setores em que quem edita distribui; o setor da lotação não aparece. Na edição, a lista só é enviada se mudou.
- **Time, lista:** coluna **"Também executa em"** (prioridade 2) e filtro de mesmo nome.
- **Modal de distribuir:** a lista de responsáveis traz quem recebe tarefas do setor (`recebe_tarefas`), em dois grupos: **Do setor** e **De outros setores (também executam aqui)**, com o setor de origem no lugar da função. No "Dividir", o mesmo em `optgroup`.
- Contrato e tipos regenerados.

## Entrega 3 — P4 e P7 (implementada em 14/10/2026, a pedido do usuário: "finalize todas as fases")
> A tela de funções e a de setores já existiam; as mudanças seguem o desenho delas, **sem wireframe novo**. Revisar na tela.
- **Registrar cobrança exige ver valores (P7, D9):** a função com `financeiro.registrar_cobranca` sem `financeiro.ver_valores` é recusada (400, `FuncaoSerializer`); `/api/financeiro/cobrancas/` exige as duas. Na tela de Funções, marcar "Registrar cobrança" marca "Ver valores", e desmarcar "Ver valores" desmarca "Registrar cobrança". No banco de dev nenhuma função ficou fora da regra.
- **Tela de Funções (P4):**
  - grupos Vendas · Execução · Financeiro · Cadastros · Pessoas e organização · Indicadores e auditoria (`permissoesCatalogo.ts`);
  - nome em linguagem de tela (`TITULO_PERMISSAO`; ex.: "Acompanhar o setor: ver a fila, o andamento e a equipe", "Distribuir: escolher responsável e prazo", "Atuar em todos os setores") e escopo "No setor da pessoa" ou "Empresa toda", no modal e na matriz;
  - **"Recebe tarefas" aparece** no grupo Execução (até aqui o frontend não a conhecia);
  - prévia **"Quem tem esta função vê no menu"**, calculada pelo próprio menu (`previaDeAcesso.ts`).
- **Correção:** o frontend não aplicava a exceção de "Recebe tarefas" ao conceder; a diretoria não conseguia editar a função Técnico nem dar essa função a alguém no Time. Agora `podeConceder` (em `lib/permissoes.ts`) segue o backend.
- **Organizador (P4):** em setor que não executa serviços, `organizadores` vem vazio e `sem_organizador` falso (a diretoria deixa de "organizar a Diretoria").

## Entrega 4 — P5 e P6 (implementada em 14/10/2026, mesmo pedido; sem wireframe novo)
- **Catálogo ativo só em setor com quem receba tarefas** (criar, mudar de setor, reativar): 400 com "O setor X ainda não tem quem receba tarefas…". Editar só o nome de um catálogo já existente não reavalia o setor.
- **Mudar o setor com os serviços em aberto:** `servicos_em_aberto` no catálogo (abertos e sem tarefas); `mover_servicos_em_aberto` no `PATCH` e o lote `POST /api/catalogo/catalogos/mudar-setor/` (`{catalogos, setor, mover_servicos_em_aberto}` → `{catalogos_alterados, servicos_movidos, avisos}`). Os movidos voltam a "novo", a mudança vai para a auditoria e o setor de destino recebe o aviso de chegada (`apps/catalogo/services.py`).
- **Tela do catálogo:** ao trocar o setor no formulário, a caixa "Mover também os N serviços em aberto"; botão **"Mudar setor em lote"** (modal com De → Para, filtro pelo nome, marcar os filtrados e a mesma pergunta). Os setores sem quem receba aparecem como "(ninguém recebe tarefas)".
- **Papel do setor (P6):** `catalogos_ativos`, `executa_servicos`, `recebem_tarefas` e `sem_quem_receba` na API de setores. No card e no modal do setor: "Executa N catálogos" ou "Não executa serviços", "N recebem tarefas" e os avisos "Sem quem receba tarefas" e "Sem quem organize".
- **Testes:** `apps/catalogo/tests_setor_do_catalogo.py`; ajustes em `tests_regras_execucao.py` e `apps/catalogo/tests.py`. Sem migração nova.

## O que falta (depende do usuário)
- **P3 — rever as funções existentes:** a tabela da seção P3 é sugestão; mudar permissões ou nomes de funções no banco é decisão do usuário (tela de Funções).
- **Classificar os 9 "ERGONOMIA - …":** Ergonomia ainda não tem quem receba tarefas, então a mudança é recusada. Primeiro alguém precisa receber tarefas em Ergonomia (função com "Recebe tarefas" lotada lá, ou "Também executa em" na pessoa); depois, "Mudar setor em lote" no catálogo, filtrando por "ERGONOMIA".

## 4. Ordem sugerida

| Etapa | O quê | Onde |
|---|---|---|
| 1 | Decidir P1, P2 e P3 (as funções existentes) | conversa |
| 2 | Backend: `tambem_executa_em`, `tarefas.receber` (com migração que preserva o comportamento), regra de quem recebe em `validar_responsavel_no_setor`, lista de responsáveis do setor (`equipe/`) e testes | `apps/organizacoes`, `apps/ordens_servico` |
| 3 | Frontend: "Também executa em" na pessoa (Time), grupo "De outros setores" no modal de distribuir, matriz de funções agrupada e com escopo, prévia de acesso | `features/time`, `features/organizacao`, `features/execucao` |
| 4 | Catálogo: filtro e mudança de setor em lote, pergunta sobre os serviços em aberto; depois, a classificação dos catálogos de ergonomia | `apps/catalogo`, `features/catalogo` |
| 5 | Atualizar ADR 0003 e 0008, `mapa-de-permissoes.md` e o glossário | `docs/` |
