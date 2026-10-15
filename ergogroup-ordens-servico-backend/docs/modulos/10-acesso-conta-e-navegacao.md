# 10. Acesso, conta e navegação

Como a pessoa **entra** no sistema, **mantém a sessão**, **recupera a senha** e **edita o próprio perfil**. Também cobre como o sistema decide **o que ela vê**: o menu, a tela inicial e o bloqueio de páginas. No fim, há as **regras que valem em todo o sistema**.

Quem pode o quê vem das permissões do módulo [01. Organização](01-organizacao-setores-funcoes-permissoes-e-time.md).

---

## 1. Entrar e manter a sessão

| Regra | Comportamento |
|---|---|
| Login | Por **e-mail e senha**. Pessoa inativa não entra. |
| Sessão | Usa tokens (JWT). O de acesso vale **8 horas**; o de renovação vale **7 dias** e é trocado a cada renovação. O token antigo é invalidado. |
| O que o login devolve | Os tokens e os dados da pessoa, com o **vínculo** e o resumo das **permissões** (empresa, por setor, todos os setores). O frontend usa isso para montar o menu e a tela inicial. |
| Renovar | A renovação devolve também os dados atualizados da pessoa. Uma mudança de função vale a partir da próxima renovação ou do próximo login. |
| Sair | Invalida o token de renovação. |
| Já logado | Quem abre `/login` com sessão ativa vai para a tela inicial. |

## 2. Recuperar a senha

1. Na tela de login, "Esqueci a senha" (`/forgot-password`): a pessoa informa o e-mail.
2. Se o e-mail for de uma pessoa **ativa**, sai um e-mail com o link para criar a senha nova. A resposta é **sempre a mesma**, exista o e-mail ou não, para não revelar quem tem cadastro.
3. O link abre `/reset-password`. A senha nova precisa ter pelo menos 8 caracteres e passar nas regras de senha do sistema.
4. O link **expira** (o prazo padrão do Django é de 3 dias) e deixa de valer depois de usado, porque a senha mudou.

Esse e-mail sai mesmo com as notificações desligadas: é uma ação pedida pela própria pessoa.

## 3. Meu perfil

| Rota | O que a pessoa faz |
|---|---|
| `/time/eu` | Edita **nome completo, e-mail e username**. Troca a **própria senha**, informando a atual. |

A pessoa **não** muda o próprio status, setor, função nem "também executa em", nem mesmo pela API. Só quem tem `usuarios.gerenciar` faz isso, pelo Time (módulo 01).

## 4. O que cada pessoa vê

### 4.1 Menu

O menu lateral segue a ordem do fluxo: vende, executa, cobra; depois análise e cadastros. Cada item só aparece para quem tem a permissão.

| Grupo | Item | Aparece para |
|---|---|---|
| Vendas | Vendas | `os.gerenciar` ou `os.ver_todas` |
| | Nova venda | `os.gerenciar` |
| Execução | Visão geral | `setores.todos` |
| | Painel do setor | `servicos.ver_setor`, sem `setores.todos` |
| | Meus serviços | Todos |
| Financeiro | Cobranças | `financeiro.registrar_cobranca` |
| Análise BI | Painel operacional | Todos |
| | Painel financeiro | `financeiro.ver_valores` |
| Cadastros | Clientes, Catálogo | Todos (editar exige a permissão do módulo) |
| Menu do usuário | Time, Setores, Funções e permissões | `organizacao.configurar` ou `usuarios.gerenciar` |
| | Meu perfil, Dados da empresa | Todos |

O menu também mostra os itens da OS operacional, que está **fora do escopo** desta documentação.

### 4.2 Tela inicial

Ao entrar (rota `/inicio`), a pessoa vai para a primeira tela desta lista que se aplica a ela:

1. Tem `setores.todos` → **Visão geral** (diretoria).
2. Distribui e acompanha um setor → **Painel do setor**.
3. Registra cobrança → **Cobranças**. Fica antes de Vendas porque o financeiro também costuma ter `os.gerenciar`.
4. Gerencia ou vê vendas → **Vendas**.
5. Os demais → **Meus serviços**.

A pessoa pode trocar isso em **"Abrir sempre em…"**, no menu do usuário. Essa escolha fica **só naquele navegador**.

### 4.3 Página sem acesso

Quem abre uma página que as permissões não liberam vê uma tela **"sem acesso"**, em vez de um erro. Algumas páginas redirecionam em vez disso: quem tem `setores.todos` e abre o Painel do setor vai para a Visão geral. A API sempre confere a permissão de novo; esconder o botão na tela é só conforto, não é a proteção.

---

## 5. Regras que valem em todo o sistema

| Regra | Comportamento |
|---|---|
| **Permissões, não cargos** | O código pergunta por códigos de permissão, nunca pelo nome da função ou do setor (módulo 01). |
| **Valores ocultos** | Sem `financeiro.ver_valores`, valor, condição de pagamento e observação da venda não vêm da API e somem das telas, da linha do tempo e da busca. |
| **Excluir o que está em uso é bloqueado** | Excluir um registro que outros usam responde **409**, com a explicação e a lista do que está ligado a ele (ex.: "2 tarefas"). A saída é **desativar**: pessoa, setor, função, catálogo e cliente têm "ativo". A exceção é **excluir uma venda**, que apaga os serviços e as tarefas dela; por isso exige `os.excluir` (ADR 0002). |
| **Desativar não apaga histórico** | O que é inativo some das escolhas novas (vender, distribuir, vincular), mas continua nos registros antigos. |
| **Calculado não se edita** | Status e etapas da venda, do serviço e da tarefa, o prazo do serviço, a liberação e os "concluído por" são calculados pelo sistema. A API ignora esses campos na escrita. |
| **Tudo fica na auditoria** | Toda mudança em vendas, serviços e tarefas é registrada, com quem, quando e o antes e depois (módulo 08). |
| **Avisar sem travar** | Situações que quem age não consegue corrigir (ex.: o setor ficou sem quem receba tarefas) **não bloqueiam** a ação; a resposta traz `avisos`. |
| **Modais** | Na tela, os modais são em etapas e nunca empilhados, sem gavetas laterais. As pessoas aparecem com o nome completo, e as tabelas mostram uma informação por coluna. |

---

## 6. Endpoints

| Ação | Endpoint |
|---|---|
| Login, renovar, sair | `POST /api/contas/auth/login/`, `auth/refresh/`, `auth/logout/` |
| Meus dados | `GET /api/contas/auth/me/` (ou `GET /api/contas/usuarios/me/`) |
| Pedir e confirmar a redefinição de senha | `POST /api/contas/auth/password/reset/`, `auth/password/reset/confirm/` |
| Editar o próprio cadastro | `PATCH /api/contas/usuarios/<id>/` |
| Trocar a própria senha | `PATCH /api/contas/usuarios/<id>/alterar-senha/` |
| Documentação da API | `/api/schema/swagger-ui/` e `/api/schema/redoc/` |

---

## 7. Onde está no código

| Assunto | Arquivo |
|---|---|
| Login, sessão e senha | `apps/contas/authentication/`, `apps/contas/emails.py`, `config/settings.py` (`SIMPLE_JWT`) |
| Tratamento do 409 | `config/exceptions.py` |
| Menu | Frontend: `src/components/layout/navigation.ts` |
| Tela inicial | Frontend: `src/lib/telaInicial.ts` |
| Bloqueio de páginas | Frontend: `src/components/common/RequerPermissao.tsx`, `src/app/routes.tsx` |
| Meu perfil | Frontend: `src/features/time/pages/MeuPerfilPage.tsx` |
