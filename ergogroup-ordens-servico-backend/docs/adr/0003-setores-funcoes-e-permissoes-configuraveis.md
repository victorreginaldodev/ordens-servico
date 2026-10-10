# ADR 0003: Setores, funções e permissões configuráveis

## Status
Aceito e implementado no backend (09–10/10/2026). Frontend pendente.

## Contexto
O problema original (09/10/2026) foi a falta de gerenciamento nos setores técnicos de execução. O usuário listou duas dependências: **criar os setores** (ergonomia, segurança do trabalho etc.) e **revisar os tipos de usuário e as permissões**.

O modelo anterior tinha um campo `Usuario.tipo_usuario` com 10 valores fixos (`diretor`, `gestor_comercial`, `comercial`, `gestor_tecnico`, `sub_gestor_tecnico`, `tecnico`, `gestor_financeiro`, `financeiro`, `gestor_administrativo`, `administrativo`). Esse campo misturava duas informações: a **área** (comercial, técnico, financeiro, administrativo) e o **nível** (gestor, subgestor, membro). As regras de acesso eram listas fixas de tipos espalhadas pelo código (47 pontos em 12 arquivos).

O levantamento de 09/10/2026 (`docs/mapa-de-permissoes.md`) mostrou ainda que várias regras só existiam no frontend (falhas A1 a A8). A mais grave era a A1: qualquer usuário podia alterar o próprio `tipo_usuario` para `diretor` pela API.

Requisitos do usuário ao longo da discussão:
- O termo usado na empresa é **"gestor"**, não "líder".
- Os nomes das funções devem ser **definidos pela própria empresa**, e não fixos no software, pensando em comercializar o sistema para outras empresas (multi-tenant).
- As permissões **não podem ficar presas ao tipo de setor**: um setor novo não tem permissões conhecidas de antemão, e alguém de um setor pode precisar de uma funcionalidade de outro.
- As permissões são definidas **ao criar o usuário, dentro de cada setor**.
- Uma função não pode ser usada num setor ao qual não pertence: por exemplo, não pode existir "Técnico" no setor Comercial.

## Decisão

### Estrutura
| Conceito | Modelo | Regra |
|---|---|---|
| Organização | `organizacoes.Organizacao` | Dados cadastrais da empresa (base da tela de configurações). Setores e funções pertencem a ela, preparando um futuro multi-tenant. |
| Setor | `organizacoes.Setor` | Nome único por organização; pode ser desativado. |
| Função | `organizacoes.Funcao` | **Nome livre** por organização, com as **permissões marcadas** (`FuncaoPermissao`) e a lista de **setores em que pode ser usada** (`setores`, obrigatória e não vazia). |
| Vínculo | `organizacoes.MembroSetor` | Usuário + setor + função. **Cada usuário pertence a um único setor** (decisão de 10/10/2026, que substituiu a ideia inicial de vários setores por pessoa). A função precisa ser da mesma organização e estar liberada no setor. |
| Permissão | `organizacoes.permissoes.Permissao` | **Lista fixa no código**, porque cada permissão corresponde a código que a verifica. O que é configurável é quem recebe cada permissão. |

Tudo vive no app `organizacoes`, que o usuário pediu explicitamente para separar o domínio. Ver também `docs/conceitos-de-dominio.md`.

### Regra central
**O código verifica códigos de permissão, nunca nomes de função, de setor ou de tipo de usuário.** Assim a empresa renomeia e cria funções à vontade sem quebrar nada.

### Escopo das permissões
- **Globais:** valem na organização toda (ex.: `financeiro.ver_valores`, `os.gerenciar`).
- **Por setor:** `servicos.ver_setor`, `servicos.gerenciar`, `tarefas.distribuir` e `tarefas.editar_setor` valem só no setor do vínculo que as concede.
- **`setores.todos`:** faz as permissões por setor de quem a tem valerem em todos os setores. Foi criada para manter o acesso da diretoria (diretor e gestor comercial distribuem tarefas em qualquer serviço).
- **Serviço sem setor:** segue as permissões por setor de quem as tem em algum setor. Regra de transição; hoje só um serviço, sem catálogo, está nessa situação.

### Permissões (catálogo em 10/10/2026)
`os.ver_todas`, `os.gerenciar`, `os.excluir`, `os_operacional.gerenciar`, `financeiro.ver_valores`, `financeiro.registrar_cobranca`, `clientes.gerenciar`, `catalogo.gerenciar`, `servicos.ver_setor`, `servicos.gerenciar`, `tarefas.distribuir`, `tarefas.editar_setor`, `usuarios.gerenciar`, `usuarios.gerenciar_diretoria`, `usuarios.redefinir_senha`, `organizacao.configurar`, `indicadores.ver_geral`, `auditoria.ver`, `setores.todos`. O detalhamento por funcionalidade está em `docs/mapa-de-permissoes.md`.

### Proteções
1. **Ninguém concede o que não tem.** Para criar, editar ou excluir uma função, ou criar, alterar ou remover um vínculo, é preciso ter as permissões envolvidas. As permissões por setor precisam valer para quem concede naquele setor.
2. **Diretoria protegida.** Só quem tem `usuarios.gerenciar_diretoria` gerencia usuários da diretoria. A verificação considera os vínculos mesmo de usuários inativos, para que reativar um diretor também exija ser da diretoria.
3. **Edição do próprio cadastro:** sem `usuarios.gerenciar`, `ativo` e `vinculos` ficam somente leitura (corrige a A1).
4. **Funções liberadas por setor:** a validação está em `MembroSetor.clean()` e vale em todos os caminhos (API de vínculos, cadastro e edição de usuário, admin). Não é possível retirar de uma função um setor que ainda tem pessoas vinculadas a ela.

### Migração dos dados (decisão do usuário, 10/10/2026)
| Setor | Funções (equivalentes aos antigos tipos, mesmas permissões) |
|---|---|
| Diretoria | Diretor |
| Comercial | Gestor Comercial, Comercial |
| Segurança do Trabalho | Gestor Técnico, Sub-Gestor Técnico, Técnico |
| Financeiro | Gestor Financeiro, Financeiro |
| Administrativo | Gestor Administrativo, Administrativo |

Os 43 usuários do dev foram vinculados, e o acesso foi conferido usuário a usuário, sem diferença. Depois, `tipo_usuario` foi removido. `ativo` foi unificado em `is_active`: desativado em qualquer das duas flags ficou desativado.

### Decisões sobre as regras do frontend (09/10/2026)
1. Gestor comercial tem o mesmo acesso do diretor.
2. Cobrança de OS operacional segue a da OS comercial (financeiro e diretoria).
3. Clientes continuam abertos a todos.
4. Excluir OS fica só com a diretoria.
5. Diretoria tem controle completo de tarefas.
6. Auditoria continua aberta a todos, agora como permissão configurável.

### API
- `/api/organizacoes/{organizacoes,setores,funcoes,membros}/`.
- `/funcoes/permissoes-disponiveis/` lista as permissões com o escopo de cada uma.
- `/funcoes/?setor=` lista as funções liberadas num setor.
- Criar e editar usuário aceitam `vinculos: [{setor, funcao}]`, com no máximo um item. O formato de lista foi mantido para não quebrar o frontend.
- Login, refresh, `/auth/me/` e detalhe de usuário devolvem `vinculos` e `permissoes` (`globais`, `por_setor`, `todos_os_setores`).

### Regras de acesso em detalhe (implementadas em 09–10/10/2026)
- **Valores (A2):** para quem não tem `financeiro.ver_valores`, valor, forma de pagamento, parcelas e data acordada de cobrança:
  - **somem da resposta** da OS, na lista e no detalhe;
  - **são ignorados na edição**, porque o formulário do frontend reenvia o valor e sem isso a OS seria gravada com valor zero;
  - **continuam aceitos na criação**, porque quem lança a venda informa o valor.
- **Cobrança (A3):** só pelo endpoint dedicado, com `financeiro.registrar_cobranca`. Os campos de cobrança são somente leitura na edição comum da OS.
- **Visibilidade (A5):** sem `os.ver_todas`, a pessoa vê o que tem tarefa dela e os serviços dos setores onde tem `servicos.ver_setor` (`apps/ordens_servico/services/visibilidade.py`). Vale para OS, serviços e tarefas.
- **Tarefas (A6):**
  - criar, reatribuir e excluir exigem `tarefas.distribuir` no setor do serviço;
  - editar tarefa de outra pessoa exige `tarefas.editar_setor`;
  - sem essas permissões, **o responsável altera apenas o status da própria tarefa**, como o frontend já fazia;
  - mover uma tarefa para outro serviço exige `tarefas.distribuir` no setor de destino.
- **Serviços:** ajustar, excluir e ressincronizar exigem `os.gerenciar` ou `servicos.gerenciar` no setor do serviço.
- **Escrita em cadastros (A7):** clientes exigem `clientes.gerenciar`; catálogo exige `catalogo.gerenciar`; OS exige `os.gerenciar` para criar e editar e `os.excluir` para excluir; auditoria exige `auditoria.ver` (concedida a todos).
- **Notificações por e-mail:**
  - destinatários escolhidos por permissão:
    - liberação para cobrança → quem tem `financeiro.registrar_cobranca`;
    - cobrança realizada → quem tem `financeiro.ver_valores` e (`os.gerenciar` ou `financeiro.registrar_cobranca`);
    - o e-mail de nova OS com contrato deixou de existir junto com o contrato (ADR 0007);
  - as notificações estão **desligadas pela configuração `EMAIL_NOTIFICATIONS_ENABLED`**; os testes rodam com elas ligadas.

### Achado de segurança (10/10/2026)
- O login (`LoginView` e `LoginSerializer`) tinha `print`s que gravavam no log **os dados recebidos, incluindo a senha, e a resposta com os tokens**. Foram removidos.
- **Recomendação:** verificar se os logs de produção guardaram essa saída. Se sim, limpar os logs e avaliar a troca de senhas e a invalidação dos tokens.

### Organização: pendência
- A `Organizacao` guarda dados cadastrais básicos: nome, razão social, CNPJ, inscrições, contato e endereço. É a base da futura tela de configurações; a Ergogroup foi criada por migração.
- No pedido do usuário apareceu "nome, dar o grupo, razão social". **Um campo de grupo econômico não foi criado**; falta confirmar se é necessário.

## Alternativas consideradas
- **Função por setor (cada função pertence a um único setor):** rejeitada, porque impede reaproveitar uma função genérica (ex.: "Gestor de Área") em vários setores.
- **Permissões marcadas direto em cada usuário:** rejeitada; com dezenas de usuários vira configuração repetida e sujeita a erro. A função funciona como molde, e exceções por usuário podem ser acrescentadas no futuro.
- **Permissões totalmente livres (estilo grupos do Django):** rejeitadas; multiplicam as combinações, são fáceis de configurar errado e difíceis de testar.
- **Campo `Setor.lider`:** rejeitado; comporta uma pessoa só e não cobre subgestor. Quem organiza um setor é quem tem as permissões de organização nele (ver ADR 0006).
- **Pessoa em vários setores:** foi a ideia inicial, abandonada em 10/10/2026 para simplificar. Quem precisa atuar além do próprio setor recebe uma função com as permissões necessárias (globais, ou `setores.todos` para as de setor). Restrição única por usuário no banco (migrações `organizacoes/0016` a `0018`); a `0016` para e lista os usuários se algum tiver mais de um vínculo.
- **Multi-tenant completo agora:** rejeitado. Exige isolamento em todas as tabelas, e o `django-tenants` só funciona com PostgreSQL. Ficou a preparação: setores e funções já pertencem à organização.
- **Papéis fixos "líder/sublíder":** rejeitados pelo usuário.

## Consequências
- Setores e funções novos não exigem código.
- O frontend precisa trocar o `useUserRole` (que decide pelo tipo) pelas permissões devolvidas no login e no `/auth/me/` (pendente).
- Usuário sem vínculo só acessa o que é dele.
- O primeiro vínculo de diretoria em um ambiente novo precisa ser feito por superusuário ou pelo admin do Django.
