# Mapa de permissões

Levantamento de 09/10/2026 de todas as funcionalidades expostas pela API, com a regra de acesso que vale hoje e a permissão que passaria a controlá-la no modelo de setores e funções.

## Como ler

- **Regra atual**: o que o código faz hoje. "Autenticado" significa qualquer usuário logado, de qualquer tipo.
- **Permissão proposta**: código da permissão no catálogo fixo do sistema (seção 3). "Base" significa que todo usuário tem, sem precisar de permissão.
- **Escopo**:
  - **global**: vale para a empresa toda;
  - **setor**: vale só nos setores em que o usuário tem um vínculo cuja função inclui a permissão;
  - **próprio**: só o que é do próprio usuário.
- Gestores = `diretor`, `gestor_comercial`, `gestor_tecnico`, `gestor_financeiro`, `gestor_administrativo` (`TIPOS_GESTORES` em `apps/contas/permissions.py`).

Modelo proposto: **permissão** (lista fixa no código) → **função** (nome livre, conjunto de permissões, por organização) → **vínculo** usuário + setor + função. O código verifica códigos de permissão, nunca nomes de função ou de setor.

---

## 1. Achados que precisam de atenção independentemente do redesenho

| # | Achado | Risco | Onde |
|---|---|---|---|
| A1 | **Qualquer usuário pode alterar o próprio `tipo_usuario` e o próprio `ativo`.** A edição de usuário permite "o próprio usuário ou gestor", e o serializer de edição deixa `tipo_usuario` gravável. Um técnico pode fazer `PATCH /api/contas/usuarios/<seu id>/` com `tipo_usuario=diretor`. | **Crítico**: escalada de privilégio | `usuario_viewset.py:87-96`; `UsuarioUpdateSerializer` |
| A2 | O valor da OS é devolvido a todos. A restrição "ver valores" só existe no endpoint de indicadores financeiros. Técnicos e administrativos recebem `valor` na listagem e no detalhe de OS. | Alto | `ordem_servico_serializer.py` |
| A3 | Registrar cobrança (OS e OS operacional) é permitido a qualquer autenticado. Os campos de cobrança também são graváveis pela edição genérica da OS (INC-01/02). | Alto | viewsets de OS e OSO |
| A4 | A auditoria é legível por qualquer autenticado, incluindo snapshots com valores e dados de cobrança. | Médio | `auditoria/views` |
| A5 | O técnico não tem filtro de visibilidade em **serviços**: vê todos os serviços de todas as OS, embora em OS e tarefas veja só as dele. | Médio | `servico_viewset.py` |
| A6 | Criar tarefa (e escolher o responsável) é permitido a qualquer autenticado. `PodeModificarTarefa` só vale para tarefa existente. | Médio | `tarefa_viewset.py`; `permissions.py:56-69` |
| A7 | Clientes, catálogos, OS e serviços: criar, editar e excluir é permitido a qualquer autenticado, incluindo técnicos. | Médio | viewsets correspondentes |
| A8 | Qualquer gestor, inclusive o gestor comercial, cria, exclui, ativa e desativa usuários de qualquer tipo, incluindo diretores. | Médio | `usuario_viewset.py:87-93` |

---

## 2. Mapa por funcionalidade

### 2.1 Acesso e conta própria

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Login, refresh, logout | `POST /api/contas/auth/login/` etc. | Público / token | — | — |
| Recuperar senha por e-mail | `POST /api/contas/auth/password/reset/` e `/confirm/` | Público | — | — |
| Ver o próprio perfil | `GET /api/contas/auth/me/`, `GET /usuarios/me/` | Autenticado | Base | próprio |
| Alterar a própria senha | `PATCH /usuarios/<id>/alterar-senha/` | O próprio | Base | próprio |
| Editar o próprio nome e e-mail | `PATCH /usuarios/<id>/` | O próprio ou gestor | Base (**sem** tipo, ativo, setores e funções; ver A1) | próprio |

### 2.2 Usuários

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver usuários | `GET /usuarios/` | Autenticado | Base (necessário para atribuir tarefas). Avaliar ocultar e-mail e dados administrativos. | global |
| Criar usuário | `POST /usuarios/` | Gestor | `usuarios.gerenciar` | global |
| Editar dados de outro usuário | `PATCH /usuarios/<id>/` | Gestor | `usuarios.gerenciar` | global |
| Ativar e desativar | `PATCH /usuarios/<id>/ativar/`, `/desativar/` | Gestor | `usuarios.gerenciar` | global |
| Excluir | `DELETE /usuarios/<id>/` | Gestor (409 se responsável por tarefas) | `usuarios.gerenciar` | global |
| Alterar senha de outro usuário | `PATCH /usuarios/<id>/alterar-senha/` | Diretor ou gestor administrativo | `usuarios.gerenciar` | global |
| Definir setores e funções do usuário | *novo* (vínculos) | — | `usuarios.gerenciar` | global |
| Listar tipos de usuário | `GET /usuarios/tipos/` | Autenticado | Some com o fim do `tipo_usuario`; dá lugar à listagem de funções | — |

### 2.3 Organização, setores e funções

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Ver dados da organização | `GET /api/organizacoes/organizacoes/` | Autenticado | Base | global |
| Editar dados da organização | `PATCH /organizacoes/<id>/` | Gestor | `organizacao.configurar` | global |
| Ver setores | `GET /setores/` | Autenticado | Base | global |
| Criar, editar, desativar e excluir setores | `/setores/` | Gestor | `organizacao.configurar` | global |
| Criar e editar funções e suas permissões | *novo* | — | `organizacao.configurar` | global |

### 2.4 Clientes

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver clientes | `GET /api/clientes/clientes/` | Autenticado | Base (o técnico precisa ver o cliente da OS) | global |
| Criar e editar cliente | `POST/PATCH /clientes/` | Autenticado | `clientes.gerenciar` | global |
| Excluir cliente | `DELETE /clientes/<id>/` | Autenticado (409 se tem OS) | `clientes.gerenciar` | global |

### 2.5 Catálogos

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar catálogos, subitens e catálogo operacional | `GET /api/catalogo/...` | Autenticado | Base | global |
| Criar, editar e excluir catálogo e subitens | `/catalogos/`, `/subitens/` | Autenticado | `catalogo.gerenciar` | global |
| Definir o setor de um catálogo | `PATCH /catalogos/<id>/` (`setor`) | Autenticado | `catalogo.gerenciar` | global |
| Criar, editar e excluir catálogo operacional | `/catalogos-operacionais/` | Autenticado | `catalogo.gerenciar` | global |

### 2.6 Ordem de serviço (venda)

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver OS | `GET /api/ordens-servico/ordens/` | Técnico: só OS em que tem tarefa. Demais: todas. | `os.ver_todas` → todas. `servicos.ver_setor` → OS com serviço nos seus setores. Base → OS em que tem tarefa. | global / setor / próprio |
| Criar OS (venda, condições, contrato) | `POST /ordens/` | Autenticado | `os.gerenciar` | global |
| Editar OS | `PATCH /ordens/<id>/` | Autenticado | `os.gerenciar` (sem campos de cobrança; ver A3) | global |
| Excluir OS (apaga serviços e tarefas) | `DELETE /ordens/<id>/` | Autenticado | `os.excluir` (separado por ser destrutivo) | global |
| Ver valor e condições de pagamento | campos `valor`, `forma_pagamento`, parcelas | Todos (A2) | `financeiro.ver_valores`; sem ela os campos vêm ocultos | global |
| Ver situação de liberação para cobrança | `GET /ordens/<id>/liberada-cobranca/` | Autenticado | `financeiro.ver_valores` | global |
| Registrar cobrança e NF | `PATCH /ordens/<id>/cobranca/` | Autenticado (A3) | `financeiro.registrar_cobranca` | global |

### 2.7 Serviços

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver serviços | `GET /servicos/` | Autenticado, sem filtro (A5) | `os.ver_todas` → todos. `servicos.ver_setor` → do setor. Base → onde tem tarefa. | global / setor / próprio |
| Criar serviço na OS | `POST /servicos/` | Autenticado | `os.gerenciar` (faz parte da venda) | global |
| Ajustar prazo, prioridade, horas e complexidade | `PATCH /servicos/<id>/` | Autenticado | `os.gerenciar` ou `servicos.gerenciar` no setor do serviço | global / setor |
| Excluir serviço (apaga tarefas) | `DELETE /servicos/<id>/` | Autenticado | `os.excluir` | global |
| Forçar ressincronização de status | `POST /servicos/<id>/sincronizar/` | Autenticado | `servicos.gerenciar` | setor |
| **Fila do setor** (serviços sem tarefa) | *novo, painel* | — | `servicos.ver_setor` | setor |

### 2.8 Tarefas

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver tarefas | `GET /tarefas/` | Técnico: só as dele. Demais: todas. | `os.ver_todas` → todas. `servicos.ver_setor` → do setor. Base → as próprias. | global / setor / próprio |
| Criar tarefa e escolher responsável (**distribuir**) | `POST /tarefas/` | Autenticado (A6) | `tarefas.distribuir` no setor do serviço | setor |
| Reatribuir tarefa a outra pessoa | `PATCH /tarefas/<id>/` (`responsavel`) | Responsável, diretor, líder ou sublíder técnico | `tarefas.distribuir` no setor do serviço | setor |
| Atualizar status e datas da própria tarefa | `PATCH /tarefas/<id>/` | Responsável | Base | próprio |
| Editar qualquer tarefa do setor | `PATCH /tarefas/<id>/` | Diretor, líder ou sublíder técnico | `tarefas.editar_setor` | setor |
| Excluir tarefa | `DELETE /tarefas/<id>/` | Responsável, diretor, líder ou sublíder técnico | `tarefas.distribuir` no setor | setor |

### 2.9 OS operacional (fora desta sprint)

Hoje não tem setor. Até ser incorporada, sugiro manter regras próprias com as mesmas permissões globais.

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Listar e ver | `GET /operacionais/` | Técnico: só as dele. Demais: todas. | `os.ver_todas` → todas. Base → as próprias. | global / próprio |
| Criar, editar e excluir | `/operacionais/` | Autenticado | `os.gerenciar`; o responsável atualiza o status da sua | global / próprio |
| Registrar cobrança | `PATCH /operacionais/<id>/cobranca/` | Autenticado (A3) | `financeiro.registrar_cobranca` | global |

### 2.10 Indicadores e auditoria

| Funcionalidade | Endpoint | Regra atual | Permissão proposta | Escopo |
|---|---|---|---|---|
| Indicadores financeiros | `GET /api/analise/financeiro/` | Todos, exceto sublíder técnico, técnico e (gestor) administrativo | `financeiro.ver_valores` | global |
| Indicadores operacionais gerais | `GET /api/analise/operacional/` | Autenticado | `indicadores.ver_geral` | global |
| Produtividade de outros técnicos | `por_tecnico` no operacional | Técnico vê só a própria linha | `indicadores.ver_geral` → todos. `servicos.ver_setor` → membros do setor. Base → a própria. | global / setor / próprio |
| Painel do setor (novos, em andamento, atrasados) | *novo* | — | `servicos.ver_setor` | setor |
| Auditoria e histórico de OS | `GET /api/auditoria/registros/` e timelines | Autenticado (A4) | `auditoria.ver` | global |

---

## 3. Catálogo de permissões proposto (rascunho)

> **Implementado na fase 1** (09/10/2026). A fonte de verdade é o enum `Permissao` em `apps/organizacoes/permissoes.py` e as permissões marcadas em cada função (`/api/organizacoes/funcoes/`). Desde 10/10/2026, a tabela por tipo de usuário foi removida; as funções iniciais saíram dela (migração `organizacoes/0013`) e seguem as travas do frontend (seção 5) com as decisões abaixo. Em relação a este rascunho, a implementação acrescentou:
> - `os_operacional.gerenciar`: OS operacional e catálogo operacional, que na tela têm regra própria;
> - `usuarios.gerenciar_diretoria`: gerenciar diretor e gestor comercial (A8);
> - `usuarios.redefinir_senha`: alterar a senha de terceiros.
>
> Decisões de 09/10/2026 sobre a seção 5:
> 1. Gestor comercial tem o mesmo acesso do diretor.
> 2. Cobrança de OS operacional segue a da OS comercial.
> 3. Clientes continuam abertos a todos.
> 4. Excluir OS fica só com a diretoria.
> 5. Diretoria tem controle completo de tarefas.
> 6. Auditoria continua aberta a todos.

**Globais**

| Código | O que libera |
|---|---|
| `os.ver_todas` | Ver todas as OS, serviços, tarefas e OS operacionais, de qualquer setor |
| `os.gerenciar` | Criar e editar OS (venda, contrato, condições) e seus serviços; criar e editar OS operacional |
| `os.excluir` | Excluir OS e serviços (apaga o que está abaixo) |
| `financeiro.ver_valores` | Ver valor e condições de pagamento das OS e os indicadores financeiros |
| `financeiro.registrar_cobranca` | Registrar cobrança e NF de OS e OS operacional |
| `clientes.gerenciar` | Criar, editar e excluir clientes |
| `catalogo.gerenciar` | Criar, editar e excluir catálogos, subitens e catálogo operacional, e definir o setor do catálogo |
| `usuarios.gerenciar` | Criar, editar, ativar, desativar e excluir usuários, alterar senhas e definir setores e funções |
| `organizacao.configurar` | Editar dados da organização e cadastrar setores e funções |
| `indicadores.ver_geral` | Ver os indicadores operacionais de toda a empresa |
| `auditoria.ver` | Ver o histórico de auditoria |

**Por setor** (valem nos setores do vínculo que traz a permissão)

| Código | O que libera |
|---|---|
| `servicos.ver_setor` | Ver OS, serviços e tarefas do setor, a fila de triagem, o painel e a produtividade dos membros do setor |
| `servicos.gerenciar` | Ajustar prazo, prioridade e estimativas dos serviços do setor e ressincronizar status |
| `tarefas.distribuir` | Criar, reatribuir e excluir tarefas nos serviços do setor, escolhendo o responsável |
| `tarefas.editar_setor` | Editar qualquer tarefa do setor, não só as próprias |

**Base** (todo usuário ativo, sem permissão): ver e editar o próprio perfil e senha; ver e atualizar as próprias tarefas e OS operacionais; ver as OS e serviços em que tem tarefa; ver clientes, catálogos, setores e a lista de usuários.

### Equivalência com os tipos de hoje (referência para a migração futura)

| Tipo atual | Permissões equivalentes ao comportamento de hoje |
|---|---|
| Diretor | todas |
| Gestor comercial / comercial | `os.ver_todas`, `os.gerenciar`, `os.excluir`, `financeiro.ver_valores`, `financeiro.registrar_cobranca`, `clientes.gerenciar`, `catalogo.gerenciar`, `indicadores.ver_geral`, `auditoria.ver` (+ `usuarios.gerenciar` e `organizacao.configurar` para o gestor) |
| Gestor técnico | as do comercial + `servicos.ver_setor`, `servicos.gerenciar`, `tarefas.distribuir`, `tarefas.editar_setor` + `usuarios.gerenciar`, `organizacao.configurar` |
| Sublíder técnico | as do gestor técnico, **sem** `financeiro.ver_valores` e sem `usuarios.gerenciar`/`organizacao.configurar` |
| Técnico | só Base |
| Gestor financeiro / financeiro | como o comercial (+ `usuarios.gerenciar` e `organizacao.configurar` para o gestor) |
| Gestor administrativo / administrativo | como o comercial, **sem** `financeiro.ver_valores` (+ `usuarios.gerenciar` e `organizacao.configurar` para o gestor) |

Hoje quase todo mundo, exceto o técnico, pode tudo nas OS, clientes e catálogos (A7). A tabela reproduz isso para a migração não mudar comportamento. **Restringir é decisão de vocês na hora de montar as funções.**

---

## 4. Decisões para validar com a gestora

1. **Quem cria a OS e os serviços?** Só o comercial, ou o gestor do setor também lança serviços numa OS existente?
2. **Excluir OS** deve ficar separado de editar? A proposta separa por ser destrutivo.
3. **Ver valores**: o gestor de um setor de execução precisa ver o valor da venda dos serviços do seu setor?
4. **Técnico vê a OS inteira** (inclusive serviços de outros setores) ou só o próprio serviço?
5. **Quem cadastra clientes e catálogo**: só comercial e administrativo?
6. **Auditoria**: só gestores, ou qualquer pessoa vê o histórico das OS em que trabalha?
7. **Gestão de usuários**: o gestor de um setor gerencia só os usuários do próprio setor, ou isso é centralizado (administrativo/diretoria)? A proposta atual é centralizada (global).
8. **Lista de usuários**: todos podem ver todos (nome, e-mail, setor), ou só os do próprio setor?

---

## 5. Regras aplicadas hoje pelo frontend

Levantadas em 09/10/2026 no projeto `ergogroup-ordens-servico-frontend`, sobretudo em `src/hooks/useUserRole.ts`, `OrdemDetalhePage.tsx`, `ServicoAccordionCard.tsx`, `TarefaRow.tsx`, `OrdemCobrancaPanel.tsx`, `UsersManagementPage.tsx` e `UserProfilePage.tsx`.

Siglas: D diretor · GC gestor comercial · C comercial · GT gestor técnico · SGT subgestor técnico · T técnico · GF gestor financeiro · F financeiro · GA gestor administrativo · A administrativo.

**Importante:** o frontend trata **GC exatamente como D** (`normalizeRole` em `useUserRole.ts`). O backend não faz isso.

| Ação | Quem pode no frontend | Backend hoje |
|---|---|---|
| Criar e editar OS (formulário, inclui serviços) | todos, menos T e SGT | qualquer autenticado |
| Excluir OS | ninguém (não há botão) | qualquer autenticado |
| Ver valores da OS | todos, menos T, SGT, GA e A | todos recebem `valor` |
| Indicadores financeiros | menu: todos, menos T e SGT; valores: menos GA e A | 403 para T, SGT, GA e A |
| Registrar cobrança de OS | F, GF, D, GC | qualquer autenticado |
| Editar e excluir serviço (detalhe da OS) | GT, SGT | qualquer autenticado |
| Criar tarefa | GT, SGT, D, GC | qualquer autenticado |
| Editar, reatribuir, cancelar e excluir tarefa | GT, SGT | responsável, D, GT e SGT |
| Prioridade, prazo e horas de tarefa | GT, SGT, D, GC | responsável, D, GT e SGT |
| Mudar status de qualquer tarefa | GT, SGT, D, GC | D, GT, SGT (**GC recebe 403**) |
| Mudar status da própria tarefa | todos | responsável |
| Clientes (criar, editar, excluir) | todos, **inclusive T** | qualquer autenticado |
| Catálogo de serviços (gerenciar) | D, GC, C, GT, SGT | qualquer autenticado |
| Catálogo operacional (gerenciar) | todos, menos A | qualquer autenticado |
| OS operacional (criar, editar, **registrar cobrança**) | todos, menos A (**inclusive T**) | qualquer autenticado |
| Gerenciar usuários | D, GC, GT, GF, GA | D, GC, GT, GF, GA |
| Alterar o próprio tipo e status | só os gestores acima | **qualquer um** (A1) |
| Aba de auditoria da OS | todos, inclusive T | qualquer autenticado |
| Ver OS e tarefas | T: só as dele; demais: todas | igual |
| Indicadores operacionais | todos; T vê só a própria linha | igual |
| Dados da empresa | tela salva só no navegador (`localStorage`), sem trava | — (API de `Organizacao` existe, não está ligada) |

### Diferenças em relação à seção 3 que precisam de decisão

1. **Gestor comercial = diretor também no backend?** O frontend já trata assim, e hoje o GC recebe 403 ao mudar o status de tarefa de outra pessoa, embora a tela ofereça o botão.
2. **Cobrança da OS operacional:** na tela, qualquer um menos o administrativo, inclusive técnico, registra cobrança de OSO; a da OS comercial é restrita a F, GF, D e GC. Igualar as duas?
3. **Clientes:** na tela, qualquer um, inclusive técnico, cria, edita e exclui clientes. Manter?
4. **Excluir OS:** não existe na tela. Restringir a D e GC no backend?
5. **Tarefas para D e GC:** a tela deixa criar tarefa e mudar status e planejamento, mas não reatribuir, cancelar nem excluir. Dar controle completo (mesma permissão do GT e SGT) ou manter a diferença?
6. **Auditoria:** a tela mostra para todos. Seguir assim (permissão base) em vez de restringir como sugerido em A4?
