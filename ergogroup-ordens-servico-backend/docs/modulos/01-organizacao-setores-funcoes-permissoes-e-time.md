# 01. Organização: setores, funções, permissões e time

Este módulo define **quem é quem** e **o que cada pessoa pode fazer** no sistema. Todos os outros módulos (vendas, execução, financeiro) consultam as regras daqui para decidir o que mostrar e o que permitir.

Decisões de origem: ADR 0003 (setores, funções e permissões), ADR 0004 (setor responsável pela execução) e ADR 0008, seção 1 (quem organiza o setor).

---

## 1. Conceitos

```
Organização
 ├── Setores ─────────────┐
 ├── Funções ─ permissões │  (a função é liberada em alguns setores)
 └── Pessoas ─ vínculo = setor + função
                └── "também executa em" (outros setores, só para receber tarefas)
```

| Conceito | O que é | Onde fica no código |
|---|---|---|
| **Organização** | A empresa, com dados cadastrais (razão social, CNPJ, endereço). Hoje existe uma só, a ErgoGroup. | `Organizacao` |
| **Setor** | Uma área da empresa (ex.: Segurança do Trabalho, Comercial, Financeiro, Diretoria). O setor que é dono de catálogos é um **setor de execução**: é para ele que vão os serviços vendidos. | `Setor` |
| **Função** | O papel que a pessoa exerce (ex.: "Gestor Técnico", "Técnico"). O nome é livre; o que a função permite vem das **permissões marcadas** nela. Cada função é **liberada** em alguns setores e só pode ser usada neles. | `Funcao`, `FuncaoPermissao` |
| **Permissão** | Uma ação que o sistema controla (ex.: `tarefas.distribuir`). A lista é **fixa no código**: não se cria permissão pela tela. | enum `Permissao` em `apps/organizacoes/permissoes.py` |
| **Vínculo** (lotação) | Pessoa + setor + função. **Cada pessoa tem no máximo um vínculo**, ou seja, pertence a um único setor. | `MembroSetor` |
| **Também executa em** | Setores, fora o da lotação, em que a pessoa **também pode receber tarefas**. Não dá nenhum outro poder nesses setores. | `AtuacaoEmSetor` |
| **Pessoa** (usuário) | Quem acessa o sistema: nome completo, e-mail (usado no login), username, senha, ativo ou inativo. | `Usuario` (`apps/contas`) |

**Regra de ouro:** o código pergunta sempre por **códigos de permissão**, nunca pelo nome da função ou do setor. Renomear uma função ou um setor não muda nenhum comportamento.

---

## 2. Permissões

### 2.1 Catálogo

Há dois escopos:
- **Empresa toda** (global): vale em qualquer lugar.
- **No setor**: vale só no setor do vínculo que concede a permissão.

| Grupo na tela | Código | Escopo | O que libera |
|---|---|---|---|
| Vendas | `os.ver_todas` | Empresa | Ver todas as vendas (OS), serviços e tarefas. Sem ela, a pessoa vê só as OS em que tem tarefa ou que são do seu setor. |
| | `os.gerenciar` | Empresa | Vender: criar e editar a OS e os serviços dela. |
| | `os.excluir` | Empresa | Excluir OS, junto com os serviços e as tarefas. Não há como desfazer. |
| | `os_operacional.gerenciar` | Empresa | OS operacional (fora do escopo desta documentação). |
| | `catalogo_operacional.gerenciar` | Empresa | Cadastro do catálogo operacional (fora do escopo desta documentação). |
| Execução | `tarefas.receber` | Setor | **Recebe tarefas**: a pessoa pode ser escolhida como responsável por tarefas do setor. |
| | `servicos.ver_setor` | Setor | Acompanhar o setor: Painel do setor com a fila, o andamento, a equipe e a produtividade. |
| | `tarefas.distribuir` | Setor | Distribuir: criar tarefas, escolher responsável e prazo, reatribuir e excluir tarefas. |
| | `servicos.gerenciar` | Setor | Ajustar prazo e prioridade dos serviços do setor e excluí-los. |
| | `tarefas.editar_setor` | Setor | Editar as tarefas de qualquer pessoa do setor, não só as próprias. |
| | `setores.todos` | Empresa | As permissões de execução da função passam a valer **em todos os setores**. A pessoa vê a Visão geral no lugar do Painel do setor. **Não estende `tarefas.receber`.** |
| Financeiro | `financeiro.ver_valores` | Empresa | Ver valores e condições de pagamento. Sem ela, esses campos ficam ocultos em todas as telas e o Painel financeiro some do menu. |
| | `financeiro.registrar_cobranca` | Empresa | Ver as Cobranças e registrar o faturamento (lançamento e nota fiscal). **Exige `financeiro.ver_valores` na mesma função.** |
| Cadastros | `clientes.gerenciar` | Empresa | Cadastrar, editar e excluir clientes. |
| | `catalogo.gerenciar` | Empresa | Cadastrar o catálogo de serviços e definir o setor de cada catálogo. |
| Pessoas e organização | `usuarios.gerenciar` | Empresa | Gerenciar o time: adicionar pessoas, definir setor e função, ativar, desativar e excluir. |
| | `usuarios.gerenciar_diretoria` | Empresa | Gerenciar as pessoas da diretoria (quem tem esta mesma permissão). |
| | `usuarios.redefinir_senha` | Empresa | Trocar a senha de outra pessoa. |
| | `organizacao.configurar` | Empresa | Editar os dados da empresa e cadastrar setores e funções. |
| Indicadores e auditoria | `indicadores.ver_geral` | Empresa | Ver os indicadores de toda a equipe. Sem ela, só os números da própria pessoa ou do setor. |
| | `auditoria.ver` | Empresa | Ver o histórico de alterações das OS, com os valores antes e depois. |

O endpoint `GET /api/organizacoes/funcoes/permissoes-disponiveis/` devolve essa lista com código, descrição e escopo. O agrupamento, os títulos e os textos de ajuda da tela ficam no frontend (`features/organizacao/permissoesCatalogo.ts`).

### 2.2 Como o sistema calcula as permissões de uma pessoa

1. **Superusuário:** tem todas as permissões, em todos os setores.
2. **Pessoa inativa ou sem login:** não tem nenhuma.
3. **Pessoa ativa:** o sistema lê o vínculo (setor + função).
   - Se o **setor** ou a **função** estiverem inativos, o vínculo é ignorado e a pessoa fica sem permissões.
   - As permissões de escopo **empresa** da função valem em qualquer lugar.
   - As permissões de escopo **setor** valem só no setor do vínculo.
   - Se a função tem `setores.todos`, as permissões de setor dela passam a valer em todos os setores.
4. **Pessoa sem vínculo:** não tem permissões. Ela só acessa o que é dela (o próprio perfil e as próprias tarefas).

**Base (todo mundo ativo, sem precisar de permissão):** ver e editar o próprio perfil e trocar a própria senha; ver e atualizar as próprias tarefas; ver as OS e os serviços em que tem tarefa; ver clientes, catálogos, setores e a lista de pessoas.

O login (`POST /api/contas/auth/login/`) e o `GET /api/contas/auth/me/` devolvem o vínculo e o resumo das permissões (empresa, por setor e se vale em todos os setores). O frontend usa esse resumo para montar o menu, a tela inicial e as guardas de rota.

### 2.3 Quem tem um papel especial no setor

| Papel | Quem é | Para que serve |
|---|---|---|
| **Organizador do setor** | Pessoa **lotada** no setor cuja função ativa tem `servicos.ver_setor` **e** `tarefas.distribuir`. A diretoria, que atua em todos os setores por `setores.todos`, **não** conta. | Recebe o e-mail de chegada de serviços e o resumo diário de pendências do setor (ADR 0010). Aparece no card do setor como "Organiza o trabalho". |
| **Quem recebe tarefas** | Pessoa ativa **lotada** no setor com função ativa que tem `tarefas.receber`, **ou** que tem o setor em "também executa em". | É a lista de responsáveis possíveis na distribuição. A diretoria só recebe onde está lotada com essa permissão ou onde também executa. |

---

## 3. Regras de negócio

### 3.1 Regra geral: ninguém concede o que não tem

Vale para montar funções e para vincular pessoas a elas.
- Para **criar ou editar uma função**, quem edita precisa ter todas as permissões que está acrescentando. Para editar uma função que já existe, precisa ter **todas** as permissões que ela já concede.
- Para **colocar alguém numa função**, quem edita precisa ter, naquele setor, todas as permissões da função. Para **trocar ou remover** um vínculo, vale o mesmo para a função atual da pessoa.
- **Exceção:** `tarefas.receber` é ser elegível, não um poder. Quem **distribui** no setor (`tarefas.distribuir`) pode concedê-la ali.

### 3.2 Setores

| Regra | Comportamento |
|---|---|
| Quem cadastra | Criar, editar, desativar e excluir exige `organizacao.configurar`. Ver a lista é liberado para todos. |
| Nome | Único dentro da organização. |
| Setor de execução | Não é um campo: o setor é de execução quando tem **catálogos ativos** (ADR 0004). |
| Desativar | **Bloqueado** se o setor tiver catálogos ativos, porque as vendas desses serviços iriam para um setor parado. Primeiro passe os catálogos para outro setor (ou desative-os) no Catálogo. |
| Efeito de desativar | O setor deixa de ter membros ativos. Quem está lotado nele perde as permissões do vínculo e ninguém recebe tarefas nele. |
| Excluir | **Bloqueado (409)** se o setor estiver em uso: pessoas lotadas, catálogos ou serviços. A saída é desativar. Se passar, o setor sai também da lista de setores liberados das funções e do "também executa em" das pessoas. |
| Alertas no setor | **"Sem quem organize":** é setor de execução e não tem organizador. **"Sem quem receba tarefas":** é setor de execução e ninguém pode receber tarefas nele. Só aparecem em setores de execução. |

### 3.3 Funções

| Regra | Comportamento |
|---|---|
| Quem cadastra | Criar, editar, desativar e excluir exige `organizacao.configurar`, mais a regra da seção 3.1. Ver a lista é liberado para todos. |
| Nome | Livre e único dentro da organização. |
| Setores liberados | **Obrigatório** ter pelo menos um. Os setores precisam ser da mesma organização. |
| Retirar um setor da função | **Bloqueado** se houver pessoas vinculadas à função naquele setor. Troque esses vínculos antes. |
| Combinação obrigatória | `financeiro.registrar_cobranca` exige `financeiro.ver_valores`. O backend recusa a função sem as duas. Na tela, marcar a primeira marca a segunda, e desmarcar a segunda desmarca a primeira. |
| Combinações sugeridas (só aviso na tela) | Quem tem `tarefas.distribuir` normalmente também precisa de `servicos.ver_setor`. `usuarios.gerenciar_diretoria` só funciona junto com `usuarios.gerenciar`. |
| Permissões sensíveis (destacadas na tela) | `os.excluir`, `setores.todos`, `usuarios.gerenciar_diretoria`, `organizacao.configurar`. |
| Desativar | As pessoas continuam vinculadas, mas a função para de conceder permissões. |
| Excluir | **Bloqueado (409)** se houver pessoas vinculadas. A saída é desativar. Também exige poder conceder todas as permissões da função. |

### 3.4 Time (pessoas e vínculos)

| Regra | Comportamento |
|---|---|
| Quem gerencia | Adicionar, ativar, desativar e excluir pessoas, e definir setor, função e "também executa em", exige `usuarios.gerenciar`. |
| Um setor por pessoa | Cada pessoa tem **no máximo um vínculo** (setor + função). Para mudar de setor, edite o vínculo; não se cria um segundo. |
| Função do vínculo | Precisa ser da mesma organização do setor e estar **liberada** naquele setor. |
| Pessoa sem vínculo | É permitido. A pessoa entra no sistema, mas só acessa o que é dela. |
| Diretoria | Pessoa cuja função tem `usuarios.gerenciar_diretoria` só é editada, ativada, desativada ou excluída por quem também tem essa permissão. A regra vale mesmo que o vínculo esteja inativo, então reativar um diretor também exige ser da diretoria. |
| Editar o próprio cadastro | Qualquer pessoa edita o próprio nome, e-mail e username em "Meu perfil". Sem `usuarios.gerenciar`, **não** altera o próprio status, setor, função nem "também executa em". |
| Desativar | A pessoa perde o acesso e sai das listas de responsáveis. **Não é possível desativar a si mesmo.** |
| Excluir | **Bloqueado (409)** se a pessoa for responsável por tarefas. A saída é desativar. |
| Senha | Cada pessoa troca a própria informando a senha atual. Trocar a senha de outra pessoa exige `usuarios.redefinir_senha`. Também há a recuperação por e-mail na tela de login. |
| E-mail | Único. É o login. |

### 3.5 Também executa em

| Regra | Comportamento |
|---|---|
| O que dá | **Só** receber tarefas no setor. Não dá acesso ao Painel do setor nem permite distribuir. |
| Fica na pessoa | Fica na pessoa, não no vínculo. Por isso não se perde quando a pessoa muda de setor. |
| Quem pode mudar | Cada setor que **entra ou sai** da lista exige que quem edita tenha `tarefas.distribuir` naquele setor. Na tela, os setores em que quem edita não distribui aparecem sem o botão de remover. |
| Restrições | Não pode incluir o setor da lotação (lá, quem decide é a função). Não pode incluir setor inativo. |

### 3.6 Avisos que não bloqueiam

Mudar o vínculo de alguém, editar uma função ou desativar uma pessoa **nunca é barrado** por deixar um setor sem gente: desligar ou transferir alguém não pode depender do catálogo. Nesses casos, a resposta da API traz `avisos` com os setores de execução que **ficaram sem quem receba tarefas por causa desta mudança**, e a tela mostra o aviso.

---

## 4. Fluxo básico

### 4.1 Montar a estrutura (uma vez, e a cada reorganização)

1. **Criar os setores** (Setores → Novo setor): nome e descrição.
2. **Criar as funções** (Funções e permissões → Nova função). Para cada uma:
   - o nome;
   - as permissões, agrupadas por Vendas, Execução, Financeiro, Cadastros, Pessoas e organização, e Indicadores e auditoria;
   - os setores em que a função pode ser usada.

   A tela mostra uma prévia das telas do menu que a função libera. "Duplicar" cria uma função a partir de outra.
3. **Liberar funções num setor**, se preciso. Também dá para fazer pelo detalhe do setor, na aba Funções → Liberar funções.
4. **Ligar os catálogos ao setor de execução** (módulo Catálogo). Só a partir daí o setor recebe serviços vendidos.

### 4.2 Colocar uma pessoa para trabalhar

1. **Time → Adicionar pessoa:** username, nome completo, e-mail, senha e ativo.
2. **Setores e funções:** escolha o setor e depois a função. Só aparecem as funções liberadas no setor e que você pode conceder.
3. **Também executa em** (opcional): outros setores em que a pessoa recebe tarefas.
4. Salvar. A pessoa já pode entrar. O menu e a tela inicial dela dependem das permissões da função.

### 4.3 Mudar alguém de setor ou de função

Time → Editar → troque o setor e/ou a função no mesmo vínculo e salve. As permissões mudam na hora. Se o setor antigo ficar sem quem receba tarefas, aparece um aviso.

### 4.4 Desligar alguém

Time → Desativar. A pessoa perde o acesso e deixa de aparecer como responsável. As tarefas e o histórico continuam com o nome dela. Excluir só é possível se ela nunca teve tarefas.

### 4.5 Reorganizar ou encerrar um setor

1. Passe os catálogos ativos do setor para outro (Catálogo).
2. Mude as pessoas lotadas nele para outro setor (Time).
3. Desative o setor. Excluir só funciona se ele nunca foi usado.

---

## 5. Telas

O menu do usuário mostra **Time**, **Setores** e **Funções e permissões** para quem tem `organizacao.configurar` ou `usuarios.gerenciar`.

| Tela | Rota | O que mostra e faz |
|---|---|---|
| **Time** | `/time` | Tabela de pessoas com nome, e-mail, setor, função e "também executa em". Tem visões Ativos, Inativos e Todos, busca e filtros. As ações são adicionar, editar, desativar ou reativar e excluir. O próprio cadastro não se edita aqui, e sim em Meu perfil. |
| **Setores** | `/organizacao/setores` | Cards dos setores com quem organiza, quantas pessoas recebem tarefas e os alertas "Sem quem organize" e "Sem quem receba tarefas". O detalhe abre em modal com as abas **Pessoas** (agrupadas por função), **Funções** (liberadas no setor e liberar mais) e **Catálogos**. Ações: editar, desativar ou reativar e excluir. |
| **Funções e permissões** | `/organizacao/funcoes` | Lista das funções com permissões e setores, e a visão **Matriz** (funções × permissões lado a lado). O modal da função permite criar, editar, duplicar, desativar e excluir. Quem não pode alterar uma função vê a função em modo de leitura. |
| **Meu perfil** | `/time/eu` | Dados pessoais e troca da própria senha. |
| **Dados da empresa** | `/organizacao/dados` | Dados cadastrais da organização. |

Os modais seguem as convenções do projeto: são em etapas, um de cada vez, e "Cancelar" volta para o detalhe.

---

## 6. Endpoints

Prefixos: `/api/organizacoes/` e `/api/contas/`.

| Recurso | Endpoint | Leitura | Escrita |
|---|---|---|---|
| Organização | `organizacoes/` | Todos | `organizacao.configurar` (não há exclusão) |
| Setores | `setores/` (filtros `q`, `ativo`) | Todos | `organizacao.configurar` |
| Funções | `funcoes/` (filtros `organizacao`, `setor`, `ativo`, `q`) | Todos | `organizacao.configurar`, mais a regra "não concede o que não tem" |
| Catálogo de permissões | `funcoes/permissoes-disponiveis/` | Todos | — |
| Vínculos | `membros/` (filtros `usuario`, `setor`, `funcao`) | Todos | `usuarios.gerenciar`, mais a regra "não concede o que não tem" |
| Pessoas | `usuarios/` (filtros `q`, `setor`, `funcao`, `ativo`) | Todos | Criar e excluir: `usuarios.gerenciar`. Editar: a própria pessoa (só dados cadastrais) ou `usuarios.gerenciar`. Os campos `vinculos` e `tambem_executa_em` vão na criação e na edição. |
| Ativar e desativar | `usuarios/<id>/ativar/`, `usuarios/<id>/desativar/` | — | `usuarios.gerenciar` |
| Trocar senha | `usuarios/<id>/alterar-senha/` | — | A própria pessoa ou `usuarios.redefinir_senha` |
| Sessão | `auth/login/`, `auth/refresh/`, `auth/logout/`, `auth/me/` | — | — |
| Recuperar senha | `auth/password/reset/`, `auth/password/reset/confirm/` | — | Público |

As respostas de criar e editar vínculos, funções e pessoas, e a de desativar pessoa, podem trazer `avisos` (seção 3.6). Os setores trazem os campos calculados `organizadores`, `sem_organizador`, `catalogos_ativos`, `executa_servicos`, `recebem_tarefas` e `sem_quem_receba`.

---

## 7. Onde está no código

| Assunto | Arquivo |
|---|---|
| Catálogo de permissões e cálculo das permissões efetivas | `apps/organizacoes/permissoes.py` |
| Setor: organizadores e quem recebe tarefas | `apps/organizacoes/models/setor.py` |
| Função e as permissões dela | `apps/organizacoes/models/funcao.py` |
| Vínculo e "também executa em" | `apps/organizacoes/models/membro_setor.py`, `models/atuacao.py`, `services/vinculos.py` |
| Avisos de setor sem quem receba | `apps/organizacoes/views/avisos.py`, `apps/catalogo/services.py` |
| Pessoas e senha | `apps/contas/views/usuario_viewset.py`, `apps/contas/serializers/usuario_serializer.py` |
| Telas | Frontend: `src/features/time/` e `src/features/organizacao/` |
