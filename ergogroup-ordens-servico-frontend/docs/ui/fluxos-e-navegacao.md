# Fluxos e navegação

Entrega da fase **R1** de `docs/ui/plano-redesenho-fluxos-e-telas.md` (10/10/2026). Define quem usa o sistema, o que cada pessoa faz no dia, por onde entra, o menu e o que cada página reúne. É a base dos wireframes (R2) e da implementação (R3 a R6).

**Status:** todo o documento é **proposta**, aguardando a validação do usuário. As perguntas abertas estão na seção 9. O que for aprovado passa a "decidido" aqui mesmo.

**Fontes:**
- ADRs 0003, 0006, 0007 e 0008;
- `docs/telas-blocos-e-endpoints.md`;
- `docs/api/contrato-por-dominio.md`;
- as funções iniciais da migração `organizacoes/0013` do backend.

**Fora de escopo:** OS operacional e catálogo operacional. Esses itens continuam no menu como estão.

---

## 1. Princípios de navegação

1. **O menu responde "o que eu tenho para fazer?"** O primeiro grupo é o trabalho da pessoa, e não a lista de entidades.
2. **Quatro portas de entrada**, uma por jeito de trabalhar:
   - **Meus serviços**: quem executa;
   - **Painel do setor**: quem organiza;
   - **Vendas**: quem vende;
   - **Cobranças**: quem fatura.
3. **Cada item de menu e cada rota declaram a permissão que exigem.** Nunca um teste por nome de função ou setor.
4. **A OS deixa de ser o lugar onde todos trabalham.**
   - A execução acontece no **detalhe do serviço**.
   - A venda é vista no **resumo da venda**.
   - O faturamento acontece em **Cobranças**.
   - As três telas se ligam por links.
5. **A ação fica onde a informação está:**
   - distribuir na fila;
   - dar ciência no alerta;
   - mudar o status da tarefa em Meus serviços;
   - lançar na linha de cobrança.
6. **Convenções do projeto:**
   - modais em etapas, nunca empilhados e sem drawers;
   - nome completo das pessoas;
   - uma informação por coluna.
7. **Desktop.** O sistema é usado no navegador do computador. Telas estreitas devem funcionar, mas não são o alvo do desenho.

---

## 2. Personas

As personas são as 10 funções criadas pela migração (os antigos tipos de usuário), descritas pelo que as **permissões** liberam. Uma função nova com as mesmas permissões cai na mesma persona, seja qual for o nome dela.

| Persona | Funções iniciais | Permissões que definem a persona |
|---|---|---|
| **Organizador do setor** | Gestor Técnico, Sub-Gestor Técnico | `servicos.ver_setor` + `tarefas.distribuir` no setor do vínculo |
| **Quem executa** | Técnico (e qualquer pessoa com tarefa) | nenhuma: vê só o que está com ela |
| **Comercial** | Comercial | `os.gerenciar`, `os.ver_todas`, `financeiro.ver_valores` |
| **Financeiro** | Gestor Financeiro, Financeiro | `financeiro.registrar_cobranca`, `financeiro.ver_valores` (e `os.gerenciar`) |
| **Diretoria** | Diretor, Gestor Comercial | `setores.todos` e todas as demais |
| **Administrativo** | Gestor Administrativo, Administrativo | `os.gerenciar` **sem** `financeiro.ver_valores` |

Uma pessoa pode ter mais de uma persona. Por exemplo, o Gestor Técnico organiza o setor, também executa e pode registrar vendas (`os.gerenciar`).

---

## 3. Jornadas

### 3.1 Organizador do setor (a gestora técnica)
Frequência: todo dia, de manhã ou à tarde, para distribuir. Ao longo do dia, consulta o andamento.

1. Entra no **Painel do setor**. Se acompanha mais de um setor, escolhe o setor (o último fica lembrado).
2. Vê o destaque **"N serviços para distribuir"** (a fila) e os contadores: em andamento, atrasados, em alerta e sem prazo.
3. **Triagem:**
   - percorre a fila, agrupando por cliente ou por OS quando ajuda (ex.: PGR e LTCAT do mesmo cliente para a mesma pessoa);
   - em cada item vê os outros serviços da OS e a etapa de cada um.
4. **Distribui:** abre "Distribuir" no item, escolhe o responsável (só membros do setor, com a carga ao lado do nome) e o prazo, e confirma.
   - O caso raro de mais de uma pessoa usa "Dividir entre pessoas", que acrescenta linhas no mesmo passo.
5. **Acompanha:**
   - **Alertas:** atrasados e sem movimentação. Dá ciência quando está tudo bem ("aguardando o cliente") ou abre o serviço para agir.
   - **Andamento por pessoa:** o que está com quem, os mais urgentes primeiro.
   - **Equipe:** carga de cada pessoa por faixa de prazo e a idade do item mais antigo.
6. No fim do período, consulta os **Concluídos**, com "no prazo" ou não.
7. Quando precisa mexer num serviço (reatribuir, mudar prazo, cancelar tarefa), abre o **detalhe do serviço**.

### 3.2 Quem executa (o técnico)
Frequência: várias vezes ao dia, com ações rápidas.

1. Entra em **Meus serviços**: o que está com ele, os atrasados primeiro, com o prazo e o cliente.
2. Muda o status da própria tarefa ali mesmo (iniciar, concluir), em um clique.
3. Abre o **detalhe do serviço** quando precisa de contexto:
   - a observação da venda;
   - os outros serviços da OS e quem está com eles (ex.: o PGR que alimenta o PCMSO);
   - a linha do tempo.
4. Se o serviço está em alerta sem movimentação e ele está esperando algo, dá **ciência** com o motivo.
5. Consulta o **histórico** do que concluiu num período.

### 3.3 Comercial
Frequência: a cada venda, e para responder ao cliente "como está meu serviço?".

1. Entra em **Vendas**: as próprias ("minhas") ou todas, com o andamento ("2 de 4 concluídos") e a condição de cada uma.
2. **Nova venda**, em etapas:
   - cliente;
   - condição de pagamento (à vista, parcelado ou recorrente; quando libera para o financeiro);
   - serviços (catálogo; o setor que vai executar aparece na hora);
   - revisão.

   Ao salvar, cada setor recebe os seus serviços e é avisado por e-mail.
3. Para responder ao cliente, abre o **resumo da venda**:
   - por serviço: setor, etapa, quem está com ele, prazo e quem concluiu;
   - a linha do tempo da venda.
4. Edita a venda (dados e condição) ou acrescenta um serviço a partir do resumo.

### 3.4 Financeiro
Frequência: diária, na fila do que pode ser faturado.

1. Entra em **Cobranças**, na aba **A faturar**, com os que estão em alerta (liberados há 3 dias ou mais sem lançamento) primeiro.
2. Em cada linha vê:
   - cliente;
   - condição (`condicao_resumo`);
   - primeiro vencimento;
   - contato para envio da NF;
   - quando foi liberada e por quê.
3. Lança no sistema externo e **registra o lançamento** na própria linha (referência e data).
4. Quando precisa de mais contexto, abre a **situação financeira** da OS: serviços, eventos e observação.
5. Acompanha a **Previsão** (o que vai liberar, pelo andamento da execução) e as **Faturadas**.
6. Consulta os **indicadores** (Análise › Financeiro).

### 3.5 Diretoria
1. Tem acesso a tudo.
2. Usa **Vendas** e o **Painel do setor** com todos os setores (os contadores por setor formam a visão consolidada).
3. Usa **Cobranças** e **Análise**.
4. Age em qualquer setor, mas só distribui para membros daquele setor.

### 3.6 Administrativo
1. Registra vendas (**Nova venda**) e informa a condição de pagamento.
2. Depois da venda, **não vê valores nem condição**: as seções financeiras simplesmente não aparecem (decisão do ADR 0008, 8).

---

## 4. Menu

| Grupo | Item | Rota | Aparece para |
|---|---|---|---|
| **Meu trabalho** | Meus serviços | `/meus-servicos` | todos |
| | Painel do setor | `/setor` | `servicos.ver_setor` (em algum setor) |
| **Comercial** | Vendas | `/vendas` | `os.gerenciar` ou `os.ver_todas` |
| | Nova venda (botão em Vendas; atalho no menu) | `/vendas/nova` | `os.gerenciar` |
| **Financeiro** | Cobranças | `/cobrancas` | `financeiro.registrar_cobranca` |
| **Análise** | Operacional | `/analise/operacional` | todos (como hoje) |
| | Financeiro | `/analise/financeiro` | `financeiro.ver_valores` |
| **Cadastros** | Clientes | `/clientes` | como hoje |
| | Catálogo | `/catalogo` | como hoje |
| **Organização** | Time, Setores, Funções e permissões, Dados da empresa | como hoje | como hoje |
| *(fora de escopo, sem mudança)* | OS operacionais, Catálogo operacional | como hoje | como hoje |

**Mudanças em relação ao menu atual:**
- **Entram:** Meus serviços, Painel do setor e o grupo Comercial.
- **"Ordens de serviço" vira "Vendas".** A lista continua existindo, agora com o andamento.
- **Cobranças passa a exigir `financeiro.registrar_cobranca`.** Hoje aparece também para quem só tem `financeiro.ver_valores`, mas o endpoint novo responde 403 para essa pessoa. Quem só vê valores (ex.: Comercial) acompanha a condição e o faturamento no resumo da venda.
- **Catálogo vai para Cadastros**, junto com Clientes.

**Busca global (Ctrl+K):**
- vendas por número da OS ou nome do cliente, abrindo o resumo da venda;
- páginas do menu.

---

## 5. Tela inicial

A tela depois do login sai das permissões, nesta ordem:

| # | Regra | Tela | Quem cai aqui (funções iniciais) |
|---|---|---|---|
| 1 | `tarefas.distribuir` + `servicos.ver_setor` no setor do vínculo, **sem** `setores.todos` (organizador) | Painel do setor | Gestor Técnico, Sub-Gestor Técnico |
| 2 | `financeiro.registrar_cobranca` **sem** `setores.todos` | Cobranças | Gestor Financeiro, Financeiro |
| 3 | `os.gerenciar` ou `os.ver_todas` | Vendas | Diretor, Gestor Comercial, Comercial, Gestor Administrativo, Administrativo |
| 4 | nenhuma das anteriores | Meus serviços | Técnico |

**Por que essa ordem:**
- O financeiro também tem `os.gerenciar`, por isso a regra 2 vem antes da 3.
- A diretoria tem todas as permissões, inclusive no próprio setor (Diretoria). Sem a condição "sem `setores.todos`" nas regras 1 e 2, ela cairia no painel ou em Cobranças. Com ela, vai para Vendas, que é a entrada do Gestor Comercial.
- Diretor e Gestor Comercial têm exatamente as mesmas permissões, então o sistema não consegue separá-los sem testar o nome da função (proibido).

**Complemento:** cada pessoa pode escolher a própria tela inicial no menu do usuário ("Abrir sempre em…"). A escolha fica gravada só no navegador dela e substitui a regra.

---

## 6. Páginas

Em cada página: rota, permissão, blocos (endpoint), ações e estados. "Bloco" = um hook de `features/*/hooks.ts`, que carrega e trata erro sozinho.

### 6.1 Meus serviços — `/meus-servicos`
- **Permissão:** nenhuma.
- **Blocos:**
  - aba "Em aberto": `useMeusServicos()`;
  - aba "Concluídos": `useMeusServicos({concluidas: true, de, ate})`, com seletor de período (padrão: mês atual).
- **Colunas:**
  - serviço (catálogo e descrição);
  - cliente;
  - OS;
  - setor;
  - prazo com a situação de prazo (`SituacaoPrazoBadge`);
  - status da tarefa (controle de um clique);
  - alerta do serviço (`AlertaMovimentacao`).
- **Ações:**
  - mudar o status da própria tarefa;
  - abrir o detalhe do serviço.
- **Vazio:** "Nada com você agora."

### 6.2 Painel do setor — `/setor/:setorId`
- **Permissão:** `servicos.ver_setor` no setor. Em `/setor` sem id, abre o último setor usado ou o primeiro da lista.
- **Topo:**
  - seletor de setor (`useSetoresAcompanhados`), com os contadores de cada setor;
  - com `setores.todos`, a lista mostra todos os setores de execução: essa é a visão consolidada da diretoria.
- **Seções**, na mesma página e nesta ordem; a aba ativa fica na URL (`?aba=`):
  1. **Para distribuir** (`useFila`). Destaque com a contagem. Agrupar por: nenhum, cliente ou OS. Cada item mostra:
     - catálogo e descrição;
     - cliente e OS;
     - data da venda e quem vendeu;
     - prioridade;
     - há quantos dias está na fila;
     - os outros serviços da OS.

     Ação: **Distribuir** (só se `organiza`).
  2. **Alertas** (`useAlertas`): motivos (atrasado, sem movimentação), dias sem movimentação, responsáveis e a ciência vigente. Ações: **Estou ciente** e abrir o serviço.
  3. **Em andamento** (`useAndamento`): agrupado por responsável, os mais urgentes primeiro, com a situação de prazo e há quantos dias está com a pessoa. Filtro por responsável.
  4. **Equipe** (`useEquipe`): por pessoa, com a função e os contadores `ativos`, `atrasados`, `vence_7_dias`, `sem_prazo`, `em_alerta` e o mais antigo. Clicar numa pessoa filtra "Em andamento".
  5. **Concluídos** (`useConcluidos`): período (padrão: mês atual), quem concluiu, prazo, término e no prazo ou não.
- **Sem permissão no setor (403):** mensagem "Você não acompanha este setor", com a lista dos que acompanha.

### 6.3 Detalhe do serviço — `/servicos/:id`
- **Permissão:** quem vê o serviço (404 para quem não vê).
- **Blocos:**
  - `useDetalheDoServico(id)`;
  - `useLinhaDoTempoDoServico(id)`.
- **Conteúdo:**
  - cabeçalho com catálogo, setor, etapa (`EtapaBadge`), prazo e situação, e alerta ou ciência;
  - **tarefas**: responsável, status, prazo, início e término;
  - **contexto da venda**, sem valores: cliente, OS (link para o resumo), data, quem vendeu, prioridade e observação;
  - **outros serviços da OS**: setor, etapa e responsáveis, com link para cada um;
  - **linha do tempo do serviço**.
- **Ações**, conforme permissão:
  - **Distribuir / Dividir** (`pode_distribuir`);
  - **Estou ciente** (`pode_dar_ciencia`);
  - na tarefa:
    - mudar o status (o próprio responsável);
    - reatribuir, mudar o prazo ou excluir (`tarefas.distribuir` no setor);
    - editar a tarefa de outra pessoa (`tarefas.editar_setor`);
  - ajustar o serviço (descrição, prioridade) ou excluir (`os.gerenciar` ou `servicos.gerenciar` no setor).

### 6.4 Vendas — `/vendas`
- **Permissão:** `os.gerenciar` ou `os.ver_todas`.
- **Bloco:** `useVendas(filtros)`. Os filtros ficam na URL: busca, cliente, "minhas", etapa, concluída, liberada e lançada.
- **Colunas:**
  - OS;
  - cliente;
  - data da venda;
  - quem vendeu;
  - andamento (`AndamentoServicos`);
  - status;
  - condição (`CondicaoPagamento`, só com `financeiro.ver_valores`);
  - valor (só com `financeiro.ver_valores`);
  - situação financeira (liberada e lançada).
- **Ações:**
  - **Nova venda**;
  - abrir o resumo da venda.
- **Visões rápidas:**
  - Minhas vendas (`?minhas=true`);
  - Com serviço na fila (`?etapa=na_fila`);
  - Em execução;
  - Concluídas.

### 6.5 Nova venda — `/vendas/nova` (e edição em `/vendas/:id/editar`)
- **Permissão:** `os.gerenciar`.
- **Formato:** página em etapas. Uma página (e não um modal) porque a venda tem muitos campos e uma lista de serviços. A revisão do fim evita o vai e volta.
- **Etapas:**
  1. **Cliente e venda:** cliente, data da venda, prioridade e observação.
  2. **Condição:**
     - tipo (à vista, parcelado ou recorrente), com os campos de cada tipo;
     - valor total;
     - valor mensal (recorrente);
     - forma de pagamento;
     - quando libera para o financeiro (na venda ou na conclusão);
     - contato para envio da NF.
  3. **Serviços:** um ou mais catálogos ativos, com descrição e prioridade. O setor de cada um aparece na linha ("vai para Segurança do Trabalho").
  4. **Revisão:** prévia da condição em texto, dos serviços por setor e dos e-mails que serão enviados.
- **Salvar:** `useCriarVenda`, um envio só. Erros 400 voltam para a etapa e o campo do erro. Ao terminar, abre o resumo da venda.
- **Edição:** etapas 1 e 2. Os serviços são acrescentados ou ajustados a partir do resumo da venda.
- **Sem `financeiro.ver_valores`:** cria com a condição normalmente. Na edição, a etapa 2 não aparece, porque o backend ignora esses campos.

### 6.6 Resumo da venda — `/vendas/:id`
- **Permissão:** quem vê a OS.
- **Blocos:**
  - `useResumoDaVenda(id)`;
  - `useLinhaDoTempoDaOS(id)`.
- **Conteúdo:**
  - cabeçalho com cliente, OS, data, quem vendeu, status e andamento;
  - **serviços**: por serviço, setor, etapa, responsáveis com início e término, prazo e quem concluiu, com link para o detalhe do serviço;
  - **condições** (só com `financeiro.ver_valores`): resumo, valor, valor mensal, vencimentos e contato da NF;
  - **financeiro** (só com `financeiro.ver_valores`): liberação e lançamento;
  - **linha do tempo da venda**.
- **Ações:**
  - Editar venda (`os.gerenciar`);
  - Acrescentar serviço (`os.gerenciar`);
  - PDF da OS;
  - Excluir (`os.excluir`).

### 6.7 Cobranças — `/cobrancas`
- **Permissão:** `financeiro.registrar_cobranca`.
- **Bloco:** `useCobrancas(filtros)`.
- **Abas:** A faturar, Previsão e Faturadas. Cada aba mostra o contador (quantidade e valor). A aba e os filtros ficam na URL.
- **Filtros:** cliente, período da venda, tipo de condição, forma de pagamento e "só em alerta".
- **Linha:**
  - OS;
  - cliente;
  - data da venda;
  - quem vendeu;
  - valor (e o valor mensal, se houver);
  - condição;
  - primeiro vencimento;
  - liberação (quando e por quê);
  - dias aguardando;
  - na previsão, o andamento;
  - nas faturadas, a referência, a data e quem lançou.
- **Ações:**
  - **Registrar lançamento**: modal curto com referência e data (padrão: hoje);
  - **Ver situação**: página `/cobrancas/:id` com `useSituacaoFinanceira`, os serviços, os eventos e a observação.

### 6.8 Telas que ficam como estão (ajustes na R7)
- Análise operacional e financeira.
- Clientes e contatos.
- Catálogo: mostrar os `avisos` ao salvar.
- Time e Setores: mostrar "sem organizador".
- Funções e permissões, Dados da empresa.

---

## 7. Como as telas se ligam

```
Login → tela inicial (seção 5)

Meus serviços ──► Detalhe do serviço ──► Resumo da venda
Painel do setor ──► Detalhe do serviço       ▲    │
   (distribuir, ciência na própria página)   │    └──► Detalhe dos outros serviços
Vendas ──► Resumo da venda ──────────────────┘
   └──► Nova venda ──(salvar)──► Resumo da venda
Cobranças ──► Situação financeira ──► Resumo da venda
Busca global ──► Resumo da venda
```

---

## 8. Rotas

| Rota | Página | Substitui |
|---|---|---|
| `/meus-servicos` | Meus serviços | — |
| `/setor`, `/setor/:setorId` | Painel do setor | — |
| `/servicos/:id` | Detalhe do serviço | o acordeão de serviços no detalhe da OS |
| `/vendas` | Vendas | `/ordens` (redireciona) |
| `/vendas/nova` | Nova venda | `/ordens/new` (redireciona) |
| `/vendas/:id` | Resumo da venda | `/ordens/:id` (redireciona) |
| `/vendas/:id/editar` | Edição da venda | `/ordens/:id/edit` (redireciona) |
| `/cobrancas` | Cobranças | a tela atual de mesmo endereço |
| `/cobrancas/:id` | Situação financeira | o painel lateral de cobrança atual |

A rota `/ordens/operacionais` (fora de escopo) continua igual. O redirecionamento de `/ordens` precisa ser exato, para não capturá-la.

---

## 9. Perguntas para validar

| # | Pergunta | Proposta |
|---|---|---|
| 1 | Nome da lista de OS no menu | **Vendas** (é a visão comercial; "OS" continua no número e no PDF) |
| 2 | Nome da área do financeiro | **Cobranças** (mantém o endereço atual; o nome do passo "lançado" segue provisório, ADR 0007) |
| 3 | Nome da porta do organizador | **Painel do setor** |
| 4 | Regra e ordem da tela inicial | Seção 5, com a escolha pessoal "Abrir sempre em…" |
| 5 | Diretoria entra em Vendas ou no Painel do setor? | Vendas |
| 6 | Cobranças só para quem registra cobrança (o Comercial deixa de ver a tela) | Sim; o Comercial vê condição e faturamento no resumo da venda |
| 7 | Nova venda em página com etapas (e não em modal) | Página |
| 8 | Painel do setor em uma página com seções (e não em páginas separadas) | Uma página com seções e aba na URL |
| 9 | Validar o painel com a gestora técnica no wireframe (R2) | Sim |

## 10. Lacunas encontradas para as próximas fases
- **Mutações de tarefa e de serviço:** a camada da R0 não tem as funções de mudar status, reatribuir, mudar prazo e excluir tarefa (`/api/ordens-servico/tarefas/{id}/`), nem as de ajustar e excluir serviço (`/servicos/{id}/`). Entram em `features/execucao` na R4.
- **Permissões por tarefa no detalhe:** o detalhe do serviço traz `pode_distribuir` e `pode_dar_ciencia`, mas não traz por tarefa se a pessoa pode editá-la. O frontend deriva isso com `pode('tarefas.distribuir', setor_id)`, `pode('tarefas.editar_setor', setor_id)` e "a tarefa é minha". *Proposta para o backend, se ficar frágil:* um `pode_editar` por tarefa.
- **Briefs antigos:** `listagem-ordens-brief.md`, `ordem-detalhe-brief.md` e `gestor-operacional-brief.md` ficam superados por este documento depois da aprovação.
