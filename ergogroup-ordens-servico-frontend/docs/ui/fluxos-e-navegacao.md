# Fluxos e navegação

Entrega da fase **R1** de `docs/ui/plano-redesenho-fluxos-e-telas.md` (10/10/2026). Define quem usa o sistema, o que cada pessoa faz no dia, por onde entra, o menu e o que cada página reúne. É a base dos wireframes (R2) e da implementação (R3 a R6).

**Status:** **validado em 11/10/2026** (fecha a R2). As respostas estão na seção 9, e as mudanças que elas trouxeram, na seção 6.2.3. O que não foi comentado foi aceito como estava na proposta.

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
   - condição de pagamento (à vista ou parcelado; quando libera para o financeiro);
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
2. Entra na **Visão geral** (decidido em 11/10/2026): o painel com todos os setores juntos, uma tabela por setor e o filtro por setor (seção 6.2.3). Também usa **Vendas**.
3. Usa **Cobranças** e **Análise**.
4. Age em qualquer setor, mas só distribui para membros daquele setor.

### 3.6 Administrativo
1. Registra vendas (**Nova venda**) e informa a condição de pagamento.
2. Depois da venda, **não vê valores nem condição**: as seções financeiras simplesmente não aparecem (decisão do ADR 0008, 8).

---

## 4. Menu

**Revisão de 13/10/2026 (decidida pelo usuário):** o menu lateral passou a ser dividido por área, na ordem do fluxo (vende, executa, cobra), seguido de Análise BI e Cadastros. A Organização saiu do menu lateral e foi para o menu do usuário.

| Grupo | Item | Rota | Aparece para |
|---|---|---|---|
| **Vendas** | Vendas | `/vendas` | `os.gerenciar` ou `os.ver_todas` |
| | Nova venda | `/vendas/nova` | `os.gerenciar` |
| **Execução** | Visão geral | `/visao-geral` | `setores.todos` (substitui o Painel do setor no menu dessa pessoa) |
| | Painel do setor | `/setor` | `servicos.ver_setor` (em algum setor), **sem** `setores.todos` |
| | Meus serviços | `/meus-servicos` | todos |
| | OS operacionais *(fora de escopo, sem mudança na tela)* | `/ordens/operacionais` | como hoje |
| **Financeiro** | Cobranças | `/cobrancas` | `financeiro.registrar_cobranca` |
| **Análise BI** | Painel operacional | `/analise/operacional` | todos (como hoje) |
| | Painel financeiro | `/analise/financeiro` | `financeiro.ver_valores` |
| **Cadastros** | Clientes | `/clientes` | como hoje |
| | Catálogo | `/catalogo` | como hoje |
| | Catálogo operacional *(fora de escopo, sem mudança na tela)* | `/catalogo/operacional` | como hoje |

**Menu do usuário (rodapé da sidebar):** Meu perfil, Abrir sempre em…, Tema, a seção **Organização** e Sair. A seção Organização (Time, Setores, Funções e permissões) só aparece para quem administra (`organizacao.configurar` ou `usuarios.gerenciar`). A rota `/time` passou a exigir uma dessas permissões.

**Ordem na Execução (14/10/2026, pedido do usuário):** Visão geral (ou Painel do setor) primeiro, depois Meus serviços e OS operacionais.

**Nova venda** aparece no menu e também como botão principal da página de Vendas e ação da busca global (Ctrl+K).

**Header e marca (13/10/2026, decididos pelo usuário):**
- **Sem header no computador.** O breadcrumb fica numa linha pequena acima do título, só nas páginas internas (ex.: `Vendas › OS 682 › Editar`, `Execução › Serviço › #12`). Nas páginas do menu não aparece, porque a sidebar já marca onde a pessoa está. O grupo sai do breadcrumb quando tem o mesmo nome do item (nada de "Vendas › Vendas").
- **Busca global** abre pelo Ctrl+K (⌘K no Mac). Não há campo de busca na sidebar.
- **Celular e tablet:** barra fina no topo com o botão do menu, o símbolo (leva à tela inicial) e a lupa da busca.
- **Marca:** símbolo + "ERGOGROUP" numa cor só (a do texto), sem o subtítulo "Gestão de OS". No tema escuro, o símbolo usa `logo-ergo-escuro.png`, com a figura cinza-escura clareada.
- **Sidebar recolhida:** mostra o símbolo; ao passar o mouse, ele vira o botão de expandir. Aberta, o botão de recolher fica sempre visível.

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

**Decidido em 11/10/2026.**

| # | Regra | Tela | Quem cai aqui (funções iniciais) |
|---|---|---|---|
| 1 | `setores.todos` | Visão geral | Diretor, Gestor Comercial |
| 2 | `tarefas.distribuir` + `servicos.ver_setor` no setor do vínculo (organizador) | Painel do setor | Gestor Técnico, Sub-Gestor Técnico |
| 3 | `financeiro.registrar_cobranca` | Cobranças | Gestor Financeiro, Financeiro |
| 4 | `os.gerenciar` ou `os.ver_todas` | Vendas | Comercial, Gestor Administrativo, Administrativo |
| 5 | nenhuma das anteriores | Meus serviços | Técnico |

**Por que essa ordem:**
- A diretoria tem todas as permissões. A regra 1 vem antes para que ela não caia no painel de um setor nem em Cobranças.
- O financeiro também tem `os.gerenciar`, por isso a regra 3 vem antes da 4.
- **Atenção:** Diretor e Gestor Comercial têm exatamente as mesmas permissões, então os dois abrem na Visão geral. O sistema não consegue separá-los sem testar o nome da função (proibido). Quem preferir abrir em Vendas usa "Abrir sempre em…" (abaixo), ou a função do Gestor Comercial perde `setores.todos` na tela de Funções.

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

### 6.1.1 Meus serviços por etapa (14/10/2026, plano aprovado)

Os mesmos princípios do Painel do setor (§6.2.6 a §6.2.8), aplicados a quem executa. Plano, decisões e o que foi implementado: [`plano-meus-servicos-por-etapa.md`](./plano-meus-servicos-por-etapa.md). Em resumo:
- abas = etapas da tarefa: **Novas** (padrão) · A iniciar · Em andamento · Concluídas · mês, sem sobreposição; substituem Todos · Com você · Atrasados · Vencem em 7 dias · Concluídos;
- **Precisa de atenção**: Atrasadas · Vencem em 7 dias · Sem andamento · Aguardando algo · Novas há 3 dias ou mais;
- quadro sem abas, com 4 colunas (Novas → A iniciar → Em andamento → Concluídas), concluídas por mês;
- ações só com ícone; Iniciar já confirma o recebimento; "Confirmar todas (N)" na linha das abas;
- "Recebida há N dias" conta da atribuição atual (`atribuida_em`), e não da criação da tarefa.

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

### 6.2.1 Variante em quadro (Painel do setor e Meus serviços)

Pedido do usuário em 10/10/2026: organizar a execução no estilo de um quadro (Kanban), para o gestor e para o técnico. **Proposta**, nos wireframes como visualização padrão, com o botão **Quadro | Lista** para comparar com a lista em abas.

**Painel do setor em quadro**
- **Colunas = etapas do serviço** (ADR 0006, 1): Para distribuir → Distribuído → Em execução → Concluídos no mês.
- **Cada cartão é um serviço:**
  - catálogo, descrição, cliente e OS;
  - prioridade alta destacada;
  - na fila: há quantos dias está ali e quantos outros serviços a OS tem;
  - distribuído e em execução: chip de prazo pela situação (atrasado, vence, sem prazo, data), chip de alerta (dias sem movimentação ou a ciência vigente) e avatares dos responsáveis;
  - concluído: data de término, se foi no prazo e quem concluiu.
- **Atrasado:** o cartão ganha uma faixa vermelha à esquerda.
- **Ordem dentro de cada coluna:**
  - na fila, os mais antigos primeiro;
  - em andamento, atrasados, depois parados, depois por prazo;
  - concluídos, os mais recentes primeiro.
- **Filtros:** pessoa da equipe (chips com a carga de cada um) e "Só atrasados e parados" (os KPIs de atrasados e de sem movimentação ligam o mesmo filtro). A fila não é filtrada: ela é a origem da distribuição.
- **Raias por pessoa (opcional):** a fila fica numa coluna lateral fixa, e cada membro do setor tem uma raia com Distribuído, Em execução e Concluídos. É a carga da equipe em forma de quadro.
- **Distribuir arrastando:**
  - arrastar um cartão da fila para "Distribuído", ou para a raia de alguém, abre o mesmo modal de distribuição, já com a pessoa escolhida;
  - o prazo continua sendo informado no modal;
  - o botão "Distribuir" do cartão faz o mesmo, pelo teclado.
- **O gestor não arrasta entre Distribuído, Em execução e Concluído.** Essas etapas mudam quando o responsável muda o status da tarefa (regra do backend). Mudar a tarefa de outra pessoa continua no detalhe do serviço, para quem tem `tarefas.editar_setor`.

**Meus serviços em quadro**
- **Colunas = status da minha tarefa:** A fazer → Em andamento → Concluídas no mês.
- **Mudar de status:** arrastar o cartão ou usar o botão Iniciar / Concluir. Voltar uma coluna reabre a tarefa, o que o responsável já pode fazer hoje.
- **Ordem:** atrasados primeiro e, depois, quem vence antes.
- **Histórico:** os meses anteriores ficam na visualização Lista, aba Concluídos.

**Impacto no backend (proposta, a confirmar na R4)**
- **Meus serviços:** os blocos atuais bastam. `meus-servicos` traz as tarefas ativas, e `?status=concluida&de=&ate=` traz as concluídas do mês.
- **Painel em quadro:** dá para montar com `fila/`, `andamento/` e `concluidos/`, mas `andamento/` é por tarefa. O frontend teria de agrupar por serviço e deduzir a etapa (um serviço com uma tarefa concluída e outra aberta continua "em execução", e isso não aparece nas tarefas ativas).
- *Proposta:* um bloco `GET /api/execucao/quadro/?setor=` que devolva os serviços do setor com etapa, prazo, situação de prazo, alerta, ciência e responsáveis. Seria uma lista por serviço, no formato do cartão.

### 6.2.2 Revisão de UX dos indicadores, filtros e cartões (10/10/2026)

**Pedido do usuário**, sobre o wireframe do painel (quadro e lista):
- havia informação demais, e não ficava claro o que cada marca significava;
- filtros demais na parte de cima (botões e chips), que poderiam ser dropdowns e ficar mais limpos;
- os indicadores (KPIs) filtravam ao clicar, mas isso só era descoberto explorando. Eles devem continuar sendo indicadores e deixar claro que também são ação;
- indicadores pedidos: para distribuir, em andamento, atrasados, sem movimentação e concluídos. "Sem prazo" é redundante e sai;
- faltava filtro por data.

**Solução no wireframe (proposta)**, aplicada ao Painel do setor e a Meus serviços:
1. **Indicadores clicáveis.**
   - Título "Resumo do setor" com a frase "Clique num indicador para ver só aqueles itens".
   - Cada cartão traz ícone, rótulo, número e um rodapé de ação: "Ver estes →", "Nenhum agora" quando zerado, ou "✓ Mostrando estes" quando selecionado. O cartão selecionado ganha borda e fundo de destaque, e há realce ao passar o mouse.
   - No quadro, clicar de novo mostra tudo. Na lista, os indicadores fazem o papel das antigas abas, e sempre há um selecionado.
   - Painel: Para distribuir, Em andamento, Atrasados, Parados (sem movimentação) e Concluídos no mês.
   - Meus serviços: Com você, Atrasados, Vencem em 7 dias e Concluídos no mês.
2. **Uma barra de filtros.**
   - Alternância Quadro | Lista.
   - Dropdowns: **Pessoa** (com a carga de cada um: ativos e atrasados), **Cliente**, **Prioridade**, **Data** e **Agrupar**.
   - Busca por serviço, cliente ou OS.
   - **Como ler**: a legenda das marcas.
   - Os filtros ativos aparecem como chips removíveis abaixo da barra, com "Limpar filtros".
   - Os números dos indicadores respeitam os filtros da barra.
3. **Filtro de data:** escolhe-se a data de referência (prazo, chegada ao setor ou conclusão; em Meus serviços, prazo ou conclusão) e o período (esta semana, próximos 7 dias, este mês, mês passado ou personalizado, de/até).
4. **Agrupar:**
   - no quadro: colunas por etapa, **raias por OS** ou raias por pessoa;
   - na lista: sem agrupar, **por OS**, por pessoa ou por cliente;
   - a antiga aba Equipe vira o dropdown Pessoa (carga) e as raias por pessoa.

   **Agrupamento por OS** (o usuário apontou que é importantíssimo, 10/10/2026): cada venda vira uma raia, ou um grupo na lista, com:
   - número, cliente, data e quem vendeu;
   - chips com **todos os serviços da OS, inclusive de outros setores**, e a etapa de cada um;
   - um link para o resumo da venda.

   Nas raias, as OS com algo atrasado vêm primeiro e, depois, as que têm algo na fila (a venda mais antiga primeiro). Dá para arrastar um serviço da fila da OS para "Distribuído" na mesma raia.
5. **Cartões e linhas mais simples:**
   - serviço, número da OS, cliente e quem está com ele;
   - no máximo duas situações, em palavras: "Atrasado 5 dias", "Vence 14/10", "Prazo 24/10", "Sem prazo", "Parado há 9 dias" ou o motivo da ciência;
   - descrição, outros serviços da OS e data da venda saem do cartão: ficam no detalhe e no texto que aparece ao passar o mouse;
   - na lista, uma informação por coluna.
6. **Removidos:** a linha de chips da equipe, o botão "Só atrasados e parados" (agora é o indicador) e o texto fixo sobre arrastar (agora está em "Como ler").

### 6.2.3 Validação da R2 (11/10/2026)

Respostas do usuário e o que mudou nos wireframes:

1. **Diretoria abre numa Visão geral (decidido).** Não é o Painel do setor, e sim uma tela consolidada de todos os setores, com filtro por setor. No wireframe (persona Diretoria):
   - item **Visão geral** no menu, no lugar do Painel do setor; rota `/visao-geral`;
   - os mesmos indicadores do painel, somando todos os setores;
   - uma **tabela por setor** abaixo dos indicadores (para distribuir, em andamento, atrasados, parados, concluídos no mês e o aviso "sem quem organize"). Clicar num setor aplica o filtro;
   - dropdown **Setor** na barra de filtros, com a fila e os atrasados de cada setor; a coluna Setor aparece na lista enquanto não há setor escolhido, e o Agrupar ganha "Por setor";
   - distribuir continua valendo só para membros do setor do serviço. Soltar um cartão na raia de alguém de outro setor mostra o aviso e não abre o modal.
2. **A visualização padrão é a lista (tabela); o quadro é a opção (decidido)**, no Painel do setor, na Visão geral e em Meus serviços.
3. **Agrupamento da lista volta ao do primeiro wireframe** (o usuário preferia o primeiro e deixou a decisão de UX comigo):
   - **Para distribuir** em ordem de chegada, sem agrupar, com a coluna **Outros serviços da OS** (chips com a etapa de cada um, inclusive de outros setores) e a descrição do serviço sob o nome;
   - **Em andamento, Atrasados e Parados agrupados por pessoa**, com o cabeçalho de cada pessoa (nome, função, quantos serviços e quantos atrasados), como a antiga aba "Em andamento";
   - o número da OS é um link para o resumo da venda;
   - o dropdown Agrupar continua com sem agrupar, por OS, por pessoa e por cliente. Ao trocar de indicador, a lista volta ao agrupamento padrão daquele indicador.
4. **Vendas segue o padrão da execução (decidido):**
   - indicadores clicáveis: **Para distribuir** (vendas com algum serviço na fila), **Em execução**, **Com atraso**, **Concluídas no mês** e, para quem vê valores, **A faturar**. Clicar de novo mostra todas;
   - barra de filtros em dropdown: **Vendedor** (com "Minhas vendas" no topo), **Cliente**, **Setor** (vendas com serviço no setor), **Financeiro** (só com `financeiro.ver_valores`) e **Data** (da venda ou da conclusão), com busca por cliente ou número;
   - a data da venda e o vendedor passam a ter colunas separadas (uma informação por coluna);
   - as antigas visões rápidas (Minhas vendas, Com serviço na fila, Em execução, Concluídas) viraram os indicadores e o filtro Vendedor.
   > **Revisto em 13/10/2026 (decidido pelo usuário), só na tela de Vendas:** os indicadores clicáveis saíram e Vendas passou ao padrão de listagem (`DataTable`). Ver §6.4. Painel do setor, Visão geral e Meus serviços continuam com os indicadores.
   >
   > **Revisto em 14/10/2026:** Painel do setor, Visão geral e Meus serviços também passaram ao padrão de listagem. Ver §6.2.4.
5. **Cobranças fica como está** (o usuário não pediu a mudança).
6. **Sem validação com a gestora técnica.** A pergunta 9 da seção 9 sai.

### 6.2.4 Painel do setor, Visão geral e Meus serviços no padrão de listagem (14/10/2026)

**Decidido pelo usuário (14/10/2026):** migrar as três telas para o padrão de listagem (`DataTable`, `design-system-tabelas.md`), como Vendas. Motivo: a Visão geral, tela inicial de quem tem `setores.todos` (ex.: Gestor Comercial), destoava das demais listagens. Substitui, nessas telas, os indicadores clicáveis, a barra de filtros em dropdown e a tabela agrupada da R4.

**Como ficou (implementado):**
- **Painel do setor e Visão geral** (`features/execucao/pages/PainelDoSetorPage.tsx`): uma linha por serviço, vinda da fila, do andamento (as tarefas do serviço viram uma linha), dos alertas ou dos concluídos.
  - **Visões com contagem:** Todos · **Para distribuir** (padrão) · Em andamento · Atrasados · Parados · Concluídos no mês (ou "no período", com o filtro Conclusão). *Substituídas em 14/10/2026 pelas abas por etapa (§6.2.6).*
  - **Colunas por visão** (uma informação por coluna): Serviço (só o nome; a descrição saiu da tabela em 14/10/2026, a pedido do usuário, e fica no detalhe do serviço), Cliente, OS, Setor (só na Visão geral), e mais:
    - Para distribuir: Na fila há, Prioridade, Outros serviços da OS; ação **Distribuir** (quando o setor tem quem organize);
    - Em andamento, Atrasados e Parados: Responsável, Etapa, Situação; ação **Estou ciente** nos parados;
    - Concluídos: Concluído por, Término, Prazo (no prazo ou dias depois);
    - Todos: Etapa, Responsável, Situação.
  - **Filtros facetados:** Setor (só na Visão geral), Pessoa, Cliente, Prioridade (em Para distribuir) e Etapa (em Todos). **Data:** Chegada ao setor (Para distribuir), Prazo (Todos, Em andamento, Atrasados, Parados) ou Conclusão (Concluídos; também define o período buscado no backend).
  - **Ordenação padrão:** Para distribuir pela mais antiga na fila; Concluídos pelo término mais recente; as demais pelo prazo (atrasados e próximos primeiro, sem prazo no fim).
- **Meus serviços** (`features/execucao/pages/MeusServicosPage.tsx`): uma linha por tarefa.
  - **Visões:** Todos · **Com você** (padrão) · Atrasados · Vencem em 7 dias · Concluídos no mês (ou "no período").
  - **Colunas:** Serviço (só o nome; a parte fica no detalhe do serviço), Cliente, OS, Situação, Status; nos concluídos, Concluída em no lugar de Situação e Status. Ações **Iniciar** e **Concluir** na linha.
  - **Filtros:** Cliente, Status (em Todos) e Data (Prazo ou Conclusão).
- **Quadro:** continua como alternativa à tabela, agora na alternância **Tabela | Quadro** da toolbar do `DataTable` (nova opção `renderBoard`). Busca, visões e filtros valem nos dois; o quadro mostra todos os registros filtrados, sem paginação. Arrastar continua distribuindo (painel) e mudando o status (Meus serviços).
- Busca, visão, filtros, ordem e página ficam na URL (`?view=`, `f.<filtro>=`), como nas outras listagens. O antigo `?foco=` deixou de existir.
- O `DataTable` passou a aceitar mais de um filtro de data (`periodFilter` como lista).

**Proposta (escolhas minhas na migração, a validar pelo usuário):**
1. **Agrupar por pessoa/OS/cliente/setor saiu.** O padrão de listagem não agrupa; o filtro Pessoa e a ordenação pelas colunas Responsável e Cliente cobrem o uso. Se fizer falta, o `DataTable` pode ganhar agrupamento.
2. **A tabela "Resumo por setor" da Visão geral saiu.** O filtro Setor mostra a contagem de cada setor na visão escolhida.
3. **Em andamento é por serviço, não por tarefa.** O Status de cada tarefa e o "Com a pessoa há" saíram do painel; a Etapa (Distribuído ou Em execução) e o Responsável (todos os da tarefa) ficam na linha. O detalhe por tarefa continua em `/servicos/:id`.
4. Visão **Todos** acrescentada nas três telas, para ver tudo junto (principalmente no quadro).

### 6.2.5 Revisão do conteúdo das tabelas da execução (14/10/2026, decidida pelo usuário)

**Pedido:** as abas estavam certas, mas o conteúdo das células não ajudava no dia a dia: coluna Setor redundante, faltava o que será feito, "Situação" misturava prazo e movimentação, "Outros serviços da OS" esticava a linha e as ações (Distribuir, Estou ciente, Iniciar, Concluir) ficavam soltas, com o "Distribuir" em verde cheio em toda linha.

**Decidido (as três perguntas: sim):**
1. **Serviço:** o nome em **caixa alta** e, embaixo, o **"o que será feito"** do serviço, em uma linha (texto completo no title). Exceção consciente à regra "uma informação por coluna": é a mesma informação, mais completa.
2. **Outros serviços da OS:** uma etiqueta curta de largura fixa (**"+2 na OS"**); ao clicar, lista cada serviço com setor, etapa e responsáveis.
3. **Caixa alta** no nome do serviço também nas tabelas, como na nova venda.

**E também:**
- **Sem a coluna Setor** (o serviço já diz o setor). Na Visão geral, o setor continua no filtro.
- **"Situação" dividida** em **Prazo** (data + "vence em 3 dias" / "4 dias atrasada") e **Última movimentação** ("Há 12 dias", em amarelo quando parado, e "Ciente: motivo" quando há ciência). Cada uma ordena sozinha.
- **Coluna "Ações"** com cabeçalho e largura fixa em todas as abas: a ação principal como botão discreto com ícone (contorno) e o menu **⋯** com "Abrir o serviço" e "Abrir a venda".
  - Painel do setor e Visão geral: **Distribuir** (na fila, para quem organiza) e **Estou ciente** (parados).
  - Meus serviços: **Iniciar** e **Concluir**.
- **Responsável, Vendido por e Concluído por** com o nome completo; vários responsáveis: o primeiro e "+N".

**Colunas por aba (Painel do setor e Visão geral):**

| Aba | Colunas |
|---|---|
| Para distribuir | Serviço · Cliente · OS · Chegou há (amarelo a partir de 5 dias) · Prioridade · Vendido por · Outros na OS · Ações |
| Em andamento | Serviço · Cliente · OS · Responsável · Etapa · Prazo · Última movimentação · Ações |
| Atrasados | Serviço · Cliente · OS · Responsável · Prazo · Etapa · Ações (mais atrasados primeiro) |
| Parados | Serviço · Cliente · OS · Responsável · Sem movimentação há · Prazo · Ações (mais tempo parado primeiro) |
| Concluídos | Serviço · Cliente · OS · Concluído por · Término · No prazo? · Ações |
| Todos | Serviço · Cliente · OS · Etapa · Responsável · Prazo · Ações |

Vendido por e Outros na OS são P2 (somem abaixo de 1280px; voltam pelo menu Colunas).

**Meus serviços:** Serviço (com o que será feito) · Cliente · OS · Status · Prazo · Última movimentação · Ações (Iniciar/Concluir + ⋯); concluídos: Serviço · Cliente · OS · Concluída em.

**Backend:** as linhas de tarefa (`/api/execucao/andamento/` e `/api/execucao/meus-servicos/`) ganharam `servico_descricao` (o "o que será feito" do serviço; a `descricao` da linha é a da tarefa).

### 6.2.6 Abas por etapa, "Precisa de atenção" e concluídos por mês (14/10/2026, wireframe aprovado)

**Problema relatado pelos responsáveis do setor de execução:** falta de controle sobre os serviços do setor. A gestora precisa ver, de forma clara, o que acabou de chegar, o que está distribuído, o que não foi iniciado, o que está iniciado e o que foi concluído.

**Diagnóstico das abas anteriores** (Todos · Para distribuir · Em andamento · Atrasados · Parados · Concluídos no mês):
- "Para distribuir" juntava **novo** e **a distribuir**, e "Em andamento" juntava **distribuído** (ninguém começou) e **em andamento** (ADR 0009);
- Atrasados e Parados não são etapas, e sim situações dentro de uma etapa: o mesmo serviço aparecia em duas abas e as contagens não somavam;
- o quadro tinha colunas diferentes das abas;
- ver outro mês de concluídos dependia de um filtro de data pouco visível.

**Decidido (wireframe aprovado pelo usuário em 14/10/2026), implementado em `features/execucao/pages/PainelDoSetorPage.tsx`:**
1. **Abas = etapas do serviço, sem sobreposição:** **Em aberto** (padrão; tudo que não foi concluído) · Novos · A distribuir · Distribuídos · Em andamento · Concluídos. *(Em aberto saiu e Novos virou a padrão: §6.2.7.)* Cada serviço está numa aba só (fora "Em aberto"), e as contagens são o resumo do setor.
2. **"Precisa de atenção"** é um filtro (dropdown), que cruza com qualquer aba e com o quadro: **Atrasados**, **Parados** (sem movimentação, sem ciência vigente), **Sem ciência do técnico** (alguma tarefa na etapa `nova`) e **Novos há 3 dias ou mais**.
3. **Colunas por aba** (uma informação por coluna):

   | Aba | Colunas |
   |---|---|
   | Em aberto | Serviço · Cliente · OS · Etapa · Responsável · Prazo · Ações |
   | Novos | Serviço · Cliente · OS · Chegou há (amarelo a partir de 3 dias) · Prioridade · Vendido por · Outros na OS · Ações |
   | A distribuir | Serviço · Cliente · OS · Chegou há · Recebido por · Prioridade · Outros na OS · Ações |
   | Distribuídos | Serviço · Cliente · OS · Responsável · Ciência do técnico ("Aguardando há N dias" ou "Ciente") · Prazo · Ações |
   | Em andamento | Serviço · Cliente · OS · Responsável · Prazo · Última movimentação · Ações |
   | Concluídos | Serviço · Cliente · OS · Concluído por · Término · No prazo? · Ações |
4. **Ações:**
   - Novos: **Confirmar** (ciência de recebimento do setor) na linha e, na barra, **Confirmar recebimento dos N** quando há mais de um; "Distribuir direto" no menu ⋯ (distribuir também registra a ciência);
   - A distribuir: **Distribuir**;
   - parados: **Estou ciente**;
   - só para quem organiza o setor.
5. **Quadro com as mesmas etapas, na mesma ordem:** Novos → A distribuir → Distribuídos → Em andamento → Concluídos.
   - Cada aba mostra as colunas da sua etapa; nas abas Novos e A distribuir aparecem também as colunas de destino do arraste.
   - **Arrastar** de Novos para A distribuir confirma o recebimento; de Novos ou A distribuir para Distribuídos abre o modal de distribuição. Depois disso, quem move é o técnico (iniciar e concluir a tarefa).
   - Em "Em aberto", a coluna Concluídos mostra a navegação do mês e o botão **Ver os N concluídos**, que abre a aba (os concluídos não entram nos filtros dos abertos).
6. **Concluídos por mês:** a barra da aba (e o cabeçalho da coluna no quadro) tem **‹ Outubro de 2026 ›** e **Ver todo o período**. O mês fica na URL (`?mes=2026-10` ou `?mes=todo`); sem ele, o mês atual. O filtro de data de conclusão saiu (a navegação por mês faz esse papel).
7. **Seletor de setor** mostra quantos novos cada setor tem.

**Definições tomadas na implementação (proposta):**
- "Novo há 3 dias ou mais" usa o limite fixo de 3 dias (`DIAS_NOVO_ANTIGO`), o mesmo do wireframe.
- "Ver todo o período" busca os concluídos desde 01/01/2000 (o backend exige um intervalo).
- "Aguardando ciência há N dias" conta da criação da tarefa (o backend não tem a data de atribuição; ADR 0009, fase 13).

> **Revisto em 14/10/2026 (§6.2.7):** a aba "Em aberto" saiu, a aba padrão passou a ser Novos e, no quadro, as abas somem.

### 6.2.7 Ajustes pedidos pelo usuário depois de usar o painel (14/10/2026, decididos)

**Pedido:**
1. No quadro, as abas de cima tiram o sentido do quadro (ao clicar em Distribuídos, sobrava uma coluna só). **No quadro, as colunas são as próprias abas.**
2. A primeira aba (e a padrão) é **Novos**, os recém-chegados. A aba "Em aberto" confundia com "Em andamento" e repetia o que o quadro mostra: **saiu**.
3. Uma ação de **um clique só** para confirmar a ciência e distribuir.
4. A barra de filtros quebrava a linha e deixava um bloco grande com espaço vazio.

**Como ficou (implementado):**
- **Abas da tabela:** Novos (padrão) · A distribuir · Distribuídos · Em andamento · Concluídos · mês. Saíram a coluna e o filtro Etapa, que só existiam em "Em aberto". Endereços antigos com `?view=em_aberto` abrem em Novos.
- **Quadro:** as abas somem e o quadro mostra sempre as 5 colunas (Novos → A distribuir → Distribuídos → Em andamento → Concluídos), com a busca e os filtros que valem em todas as colunas: Setor (Visão geral), Precisa de atenção, Pessoa e Cliente. Prioridade e os filtros de data ficam só na tabela. A coluna Concluídos traz a navegação do mês.
  - No `DataTable`, a nova opção `boardReplacesViews` faz isso: no quadro, esconde as visões, entrega ao quadro todos os registros da busca e dos filtros e pode trocar os filtros (`facets`, `periodFilter`).
- **Ações num serviço novo:**
  - tabela: **Confirmar** (só a ciência, botão discreto) e **Confirmar e distribuir** (abre o modal de distribuição; distribuir registra a ciência junto, ADR 0009). O modal se chama "Confirmar e distribuir" e avisa que o recebimento fica confirmado;
  - quadro: **Confirmar e distribuir** no cartão; só confirmar é arrastar para A distribuir;
  - barra da aba Novos: **Confirmar todos (N)**.
- **Barra de filtros em duas zonas:** à esquerda, busca e filtros (quebram linha só entre eles); à direita, as ações (mês, Colunas, densidade, Tabela | Quadro), sempre na primeira linha.

**Segunda rodada (14/10/2026, pedido do usuário: "UI básico"):**
- A busca cortava o texto ("…cliente ou O"): voltou a 20rem.
- "Chegada ao setor" caía para uma segunda linha: para caber numa linha, **Colunas** e **densidade** viraram botões só com ícone (o nome fica no `title` e no `aria-label`), e **Confirmar todos (N)** saiu da barra e foi para a **linha das abas**, à direita (nova opção `viewsActions` do `DataTable`). Vale para todas as listagens.
- **Modais maiores:** o `Dialog` base passou de `max-w-lg` para `max-w-2xl`, com altura máxima de 90% da tela e rolagem interna. O de distribuir foi para `max-w-4xl`, com a lista de membros em duas colunas e as linhas de "dividir" mais largas. Ciência do alerta, tarefa, registrar lançamento e acrescentar serviço foram para `max-w-2xl`. Modais com tamanho próprio (ex.: o menu de comandos) continuam como estão.
- No serviço novo, o modal se chama **Confirmar e distribuir** (ou **Confirmar e dividir**), e o botão final diz o mesmo.

**Terceira rodada (14/10/2026, pedido do usuário: tabela mais fina e compacta):**
- **Serviço só com o nome** (caixa alta). O "o que será feito" saiu da linha e fica no detalhe do serviço (e no texto ao passar o mouse). Revoga, no Painel do setor e na Visão geral, o item 1 do §6.2.5.
- **Ações só com ícone**, com tooltip e `aria-label`: Confirmar o recebimento (envelope, discreto) e Confirmar e distribuir (pessoa com +, contornado) nos novos; Distribuir nos a distribuir; Estou ciente nos parados; e o menu ⋯. A coluna Ações tem largura fixa de 116px em todas as abas. No cartão do quadro, os botões continuam com texto.
- **Divisor na coluna Ações:** no `DataTable`, a coluna de ações ganhou a mesma linha de grade das outras (vale para todas as listagens).
- **Ajuste seguinte (mesmo dia):** a coluna Serviço ficou mais estreita (até 18rem; primeiro 15rem, que ficou curto demais) e a Cliente mais larga (até 28rem), com o nome do cliente em destaque (peso médio, cor do texto principal). Todas as ações da tabela ficaram iguais: só o ícone, **sem borda**, no padrão de "Confirmar o recebimento".

### 6.2.8 Aviso de sem andamento e "Explicar a pausa" (14/10/2026, proposta aprovada)

**Problema relatado pelo usuário:** não ficava claro quando, onde e por que dar o "Estou ciente" no "Parado há N dias".

**Diagnóstico:**
- a tela não dizia que o aviso aparece depois de 7 dias sem mudança nas tarefas, nem para que serve (separar "esperando algo" de "esquecido");
- "Parado" soava como acusação e contrariava o ADR 0008, seção 3 (o sistema não rotula o serviço como parado);
- "Estou ciente" não dizia com o que se estava concordando, e o motivo era opcional: o gestor muitas vezes não ficava sabendo nada;
- a ação só existia no painel e no detalhe; o técnico, que sabe o porquê, via o aviso amarelo em Meus serviços sem ter o que fazer;
- não aparecia até quando o aviso ficava em silêncio.

**Decidido e implementado:**
1. **Linguagem:** "Sem andamento há N dias" (no lugar de "Parado") e "**Explicar a pausa**" (no lugar de "Estou ciente"). No filtro "Precisa de atenção" do painel, "Parados" virou **Sem andamento**, e entrou **Aguardando algo** (pausa explicada).
2. **Coluna "Andamento"** (painel: Distribuídos e Em andamento; Meus serviços), em três estados, cada um com tooltip explicando:
   - normal: "Última mudança há 3 dias", discreto;
   - aviso: "Sem andamento há 9 dias", amarelo;
   - pausa explicada: "Aguardando o cliente · até 21/10" (o motivo e quando o aviso volta).
3. **Modal "Explicar a pausa"** (`components/CienciaModal.tsx`): título "X está sem andamento há N dias", com cliente, OS, responsáveis e prazo; a regra em uma frase; e **duas saídas lado a lado**:
   - **O trabalho andou** → "Atualizar a tarefa" (o aviso some na hora). No detalhe do serviço, rola até as tarefas; nas outras telas, abre o detalhe em `#tarefas`;
   - **Está esperando algo** → o motivo (Cliente, Documentação, Agendamento, Terceiro ou Outro) é **obrigatório**, e a observação é obrigatória em "Outro". Rodapé: "Volta a avisar em dd/mm se nada mudar. O prazo continua contando." Botão "Registrar motivo".
4. **Meus serviços:** aviso no topo ("N serviços seus estão sem andamento há 7 dias ou mais", com o que fazer) e o botão **Revisar**, que aplica o filtro novo **Andamento: Sem andamento**. Na linha, o ícone de ampulheta (Explicar a pausa) ao lado de Iniciar/Concluir.
5. **Painel do setor:** a ação da linha é o ícone de ampulheta, "Explicar a pausa"; no quadro, os cartões mostram a pausa com a data.
6. **Detalhe do serviço:** o aviso no topo, com "Atualizar a tarefa" e "Explicar a pausa" (o antigo botão "Estou ciente" do cabeçalho saiu); o campo "Movimentação" virou "Andamento" e mostra o motivo, até quando e quem explicou.

**Backend (ADR 0008, revisão de 14/10/2026):** motivo obrigatório (e observação em "outro"), `ciencia_ate` no detalhe e nos alertas, e a pausa do serviço nas linhas de tarefa (`servico_ciencia_*`).

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
- **Padrão de listagem (decidido em 13/10/2026, substitui os indicadores clicáveis de 11/10):**
  - **Por quê:** o filtro do indicador ficava fora da barra de filtros e dos chips (a tabela parecia mostrar tudo), o filtro ficava em dois lugares, os indicadores se sobrepunham sem um "Todas", e número de acompanhamento é papel dos painéis, não da listagem.
  - **Visões** (faixa com contagem acima da tabela, na URL `?view=`): Todas · Para distribuir · Em execução · Concluídas.
  - **Toolbar do `DataTable`:** busca por cliente ou nº da OS; filtros facetados com contagem: **Vendedor** ("Minhas vendas" no topo para quem tem `os.gerenciar`), **Cliente** (com busca na lista), **Status**, **Condição** e **Financeiro** (os dois últimos só com `financeiro.ver_valores`; "A faturar" é uma opção do Financeiro); **Data da venda** (esta semana, este mês, mês passado ou de/até). Menu Colunas e densidade.
  - **Colunas:** OS · Cliente · Venda · Vendedor (nome completo) · Andamento · Status · Condição 💲 · Valor 💲 · Valor mensal 💲 (oculta por padrão) · Financeiro 💲. Ordenação padrão: OS mais recente primeiro; todas as colunas ordenáveis.
  - Paginação de 50 linhas (25/50/100); busca, visão, filtros, ordem e página na URL; linha abre o resumo da venda (Ctrl+clique em nova aba).
  - **Pendentes, dependem do backend (proposta):** a visão **Com atraso** e o filtro **Setor** precisam que a lista de vendas (`OrdemServicoListSerializer`) traga os setores dos serviços e se algum serviço está atrasado.
  - **Dados a corrigir no cadastro (não é código):** alguns vendedores aparecem pelo login (ex.: "Samantha.ergo") porque o `nome_completo` deles está preenchido assim; e os nomes de clientes estão gravados em caixa alta.
- **Histórico, indicadores e filtros (decidido em 11/10/2026, substituído acima):** os da seção 6.2.3, item 4. Eles substituíam as visões rápidas da proposta original:
  - Minhas vendas → filtro Vendedor (`?minhas=true`);
  - Com serviço na fila → indicador Para distribuir (`?etapa=na_fila`);
  - Em execução e Concluídas → indicadores.

### 6.5 Nova venda — `/vendas/nova` (e edição em `/vendas/:id/editar`)
- **Permissão:** `os.gerenciar`.
- **Formato (até 13/10/2026, substituído pelo redesenho abaixo):** página em etapas. Uma página (e não um modal) porque a venda tem muitos campos e uma lista de serviços. A revisão do fim evita o vai e volta.
- **Etapas (substituídas):**
  1. **Cliente e venda:** cliente, data da venda, prioridade e observação.
  2. **Condição:**
     - tipo (à vista ou parcelado), com os campos de cada tipo (revisão de 13/10/2026, `backend/docs/faturamento/03-revisao-a-vista-e-parcelado.md`);
     - valor total;
     - vencimento: data combinada ou dias após a nota (no parcelado, a 1ª parcela; as outras mensais);
     - observações de pagamento e faturamento (a observação da OS, que saiu da etapa 1);
     - cada campo com o que significa, e avisos para vencimento em data fixa com liberação na conclusão;
     - forma de pagamento;
     - quando libera para o financeiro (na venda ou na conclusão);
     - contato para envio da NF.
  3. **Serviços:** um ou mais catálogos ativos, com descrição e prioridade. O setor de cada um aparece na linha ("vai para Segurança do Trabalho").
  4. **Revisão:** prévia da condição em texto, dos serviços por setor e dos e-mails que serão enviados.
- **Salvar:** `useCriarVenda`, um envio só. Erros 400 voltam para a etapa e o campo do erro. Ao terminar, abre o resumo da venda.
- **Edição:** etapas 1 e 2. Os serviços são acrescentados ou ajustados a partir do resumo da venda.
- **Sem `financeiro.ver_valores`:** cria com a condição normalmente. Na edição, a etapa 2 não aparece, porque o backend ignora esses campos.

**Redesenho decidido e implementado em 13/10/2026** (validado pelo usuário no wireframe `wireframes/lote4-nova-venda.html`; código em `features/vendas/pages/NovaVendaPage.tsx` e `features/vendas/components/AdicionarServicosModal.tsx`). Substitui as etapas acima:
- **Página única com três seções numeradas**, sempre visíveis, na ordem da conversa de venda: **1. Cliente e venda** (cliente com CNPJ e representante para conferir, data, prioridade) → **2. Serviços vendidos** → **3. Pagamento** (a condição revisada, com a explicação de cada campo e os avisos). O número da seção vira ✓ quando ela está completa.
- **Resumo fixo à direita** no lugar da etapa "Revisão": cliente, serviços por setor, valor e condição em texto, e a lista do que falta (cada item leva ao campo). O botão "Registrar venda" fica no resumo e só libera quando não falta nada. Abaixo de 1024px, vira uma barra fixa no rodapé com o valor, a primeira pendência e o botão.
- **Serviços (revisto em 14/10/2026, a pedido do usuário):** cada serviço da venda é um **card** comprido (nome em caixa alta, etiqueta do setor que executa, a prioridade quando difere da venda, "o que será feito" e os botões Editar e Remover), no lugar da tabela. O botão **"Adicionar serviços"** abre um **modal** em que se adiciona **um serviço por vez** e o modal continua aberto para o próximo: Serviço e Prioridade na mesma linha (alinhados), **"O que será feito"** (obrigatório, sem valores) e **"Adicionar à OS"**; o modal confirma o que entrou e lista os serviços já na venda; **"Concluir"** fecha (se houver algo preenchido e não adicionado, pergunta: adicionar e fechar, ou descartar). **Editar** abre o mesmo modal com um serviço só (Salvar/Cancelar). A lista de serviços é **o catálogo inteiro numa lista só**, em ordem alfabética, **com o setor na frente** e **em caixa alta** (só a exibição), sem separar por setor. Repetir um serviço é permitido, com aviso. Código: `features/vendas/components/ServicosDaVendaModal.tsx`; o formulário fixo e o modal em duas etapas anteriores foram removidos.
- **Edição:** mesma página, só com Cliente e venda e Pagamento; botão "Salvar alterações".

### 6.6 Resumo da venda — `/vendas/:id`
- **Permissão:** quem vê a OS.
- **Blocos:**
  - `useResumoDaVenda(id)`;
  - `useLinhaDoTempoDaOS(id)`.
- **Conteúdo:**
  - cabeçalho com cliente, OS, data, quem vendeu, status e andamento;
  - **serviços**: por serviço, setor, etapa, responsáveis com início e término, prazo e quem concluiu, com link para o detalhe do serviço;
  - **condições** (só com `financeiro.ver_valores`): resumo, valor, vencimento, contato da NF e observações de pagamento;
  - **financeiro** (só com `financeiro.ver_valores`): liberação e lançamento;
  - **linha do tempo da venda**.
- **Ações:**
  - Editar venda (`os.gerenciar`);
  - Acrescentar serviço (`os.gerenciar`);
  - PDF da OS;
  - Excluir (`os.excluir`).

### 6.7 Cobranças — `/cobrancas`

> **Revisto em 14/10/2026 (decidido pelo usuário, implementado):** Cobranças passou ao padrão de listagem
> (`DataTable`). As abas são **Para faturar** (padrão) · **Em execução** · **Faturadas** (por mês). Entraram o
> **Resumo para faturar** (`/cobrancas/:id`), o **Faturar** em duas etapas e a **Conferência do faturamento**
> (`/cobrancas/conferencia`). A descrição abaixo é a da R6 e fica como registro. O que vale está no backend, em
> `docs/faturamento/04-proposta-ux-financeiro.md` (seções 6 e 8), e no wireframe `wireframes/lote5-financeiro.html`
> (aprovado; a tabela segue o `DataTable`).

- **Permissão:** `financeiro.registrar_cobranca`.
- **Bloco:** `useCobrancas(filtros)`.
- **Abas:** A faturar, Previsão e Faturadas. Cada aba mostra o contador (quantidade e valor). A aba e os filtros ficam na URL.
- **Filtros:** cliente, período da venda, tipo de condição, forma de pagamento e "só em alerta".
- **Linha:**
  - OS;
  - cliente;
  - data da venda;
  - quem vendeu;
  - valor;
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
- Contatos. (Clientes passou ao padrão de listagem em 14/10/2026, §6.9.)
- Catálogo: mostrar os `avisos` ao salvar.
- Time e Setores: mostrar "sem organizador".
- Funções e permissões, Dados da empresa.

### 6.9 Clientes — `/clientes` no padrão de listagem (14/10/2026, wireframe aprovado)

**Decidido pelo usuário (14/10/2026):** a listagem de clientes passa ao `DataTable`, como Vendas, Painel do setor, Meus serviços e Catálogo, com a mudança no serializer de listagem do backend. Wireframe aprovado: [`wireframes/clientes.html`](./wireframes/clientes.html). O formulário (`/clientes/new` e `/clientes/:id/edit`) não mudou.

**Como ficou (implementado, `features/clientes/pages/ClientListPage.tsx`):**
- **Colunas** (uma informação por coluna, todas ordenáveis):
  - P1: Cliente (nome como foi cadastrado, sem caixa alta), Documento (`CNPJ 12.345.678/0001-90`, com `formatDocumento`), Tipo, Representante (nome completo), Situação.
  - P2: E-mail do representante (`mailto:`, não abre a linha), Cliente desde, Cobra revisão.
  - P3 (menu Colunas): Contato do representante (telefone), Setor do representante.
- **Visões:** Ativos (padrão) · Inativos · Todos, com contagem. A contagem do título é a de ativos.
- **Filtros:** Tipo, Documento (tipo de inscrição), Cobra revisão, Representante (com ou sem) e período de Cliente desde.
- **Busca:** nome, número do documento (com ou sem pontuação), nome e e-mail do representante.
- **Ordenação padrão:** nome A–Z. 50 linhas por página. Busca, visão, filtros, ordem e página ficam na URL.
- **Clique na linha:** com `clientes.gerenciar`, abre a edição (`/clientes/:id/edit`, Ctrl+clique em nova aba). Sem a permissão, a linha não abre nada (não há tela de detalhe do cliente).
- **Menu ⋯:**
  - Editar (`clientes.gerenciar`);
  - Ver vendas do cliente (quem acessa Vendas: `os.gerenciar` ou `os.ver_todas`): `/vendas?view=todas&f.cliente=<nome>`; nome com vírgula vai pela busca (`q`), porque o filtro da URL separa valores por vírgula;
  - Desativar / Reativar (`clientes.gerenciar`), direto, com aviso;
  - Excluir (`clientes.gerenciar`), com confirmação em modal (`components/ClienteExclusaoModal.tsx`). Se o cliente tem vendas, o backend responde 409 (a OS protege o cliente) e o mesmo modal passa à etapa "tem vendas", que oferece desativar.
- **Novo cliente** só aparece com `clientes.gerenciar`. Antes, a página mostrava Novo, Editar e Excluir para todos (o backend recusava sem a permissão).

**Backend:** o `ClienteListSerializer` (`GET /api/clientes/clientes/`) passou a trazer `tipo_inscricao`, `nome_representante`, `setor_representante`, `email_representante`, `contato_representante`, `cobranca_revisao_alteracao` e `data_criacao` (teste em `apps/clientes/tests.py`). A tela faz uma requisição só, em vez de buscar o detalhe de cada cliente da página. O contrato (`docs/api/api-schema.yaml`, `ClienteList`) e os tipos gerados foram atualizados; o serviço novo é `getClientesDaLista` / `useClientesDaLista` (tipo `ClienteDaLista`), e o antigo `getClientsPage` / `useClientsPage` saiu.

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
| `/visao-geral` | Visão geral (todos os setores; `?setor=` filtra) | — |
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

## 9. Perguntas para validar — respondidas em 11/10/2026

| # | Pergunta | Proposta | Decisão |
|---|---|---|---|
| 1 | Nome da lista de OS no menu | **Vendas** (é a visão comercial; "OS" continua no número e no PDF) | Aceita |
| 2 | Nome da área do financeiro | **Cobranças** (mantém o endereço atual; o nome do passo "lançado" segue provisório, ADR 0007) | Aceita |
| 3 | Nome da porta do organizador | **Painel do setor** | Aceita |
| 4 | Regra e ordem da tela inicial | Seção 5, com a escolha pessoal "Abrir sempre em…" | Aceita, com a regra nova da diretoria (seção 5) |
| 5 | Diretoria entra em Vendas ou no Painel do setor? | Vendas | **Nenhum dos dois: Visão geral**, consolidada de todos os setores com filtro por setor (6.2.3) |
| 6 | Cobranças só para quem registra cobrança (o Comercial deixa de ver a tela) | Sim; o Comercial vê condição e faturamento no resumo da venda | Aceita |
| 7 | Nova venda em página com etapas (e não em modal) | Página | Aceita |
| 8 | Painel do setor em uma página com seções (e não em páginas separadas) | Uma página com seções e aba na URL | Aceita, no formato da 6.2.2: indicadores no lugar das abas (`?foco=` na URL) |
| 9 | Validar o painel com a gestora técnica no wireframe (R2) | Sim | **Não haverá** essa validação |
| 10 | Quadro (colunas por etapa) como visualização padrão do Painel do setor e de Meus serviços, com a Lista como alternativa | Sim; ver 6.2.1 | **Não: a lista (tabela) é o padrão**, e o quadro é a opção |
| 11 | Endpoint `quadro/` no backend para o painel em quadro | Sim, se o quadro for aprovado | Continua proposta: o quadro ficou como opção, então o endpoint é útil mas não bloqueia a R4 |
| 12 | Agrupamento padrão da lista | — | O do primeiro wireframe (6.2.3, item 3) |
| 13 | Indicadores e filtros em dropdown também em Vendas e Cobranças | — | **Vendas: sim.** Cobranças: fica como está |

## 10. Lacunas encontradas para as próximas fases
- **Encontradas na R5 (11/10/2026), propostas para o backend:** `OrdemServicoList` (lista de vendas) não traz se algum serviço está atrasado, os setores dos serviços nem a data de conclusão da OS. Por isso o indicador "Com atraso" e o filtro Setor de Vendas (decididos em 6.2.3, item 4) ficaram de fora e "Concluídas no mês" virou "Concluídas". Proposta: acrescentar `com_atraso` (ou `atrasados`), `setores` (ids) e `data_conclusao` à lista, ou os filtros `setor`, `com_atraso`, `vendido_por`, `venda_de`/`venda_ate`. Os contadores dos indicadores são calculados no frontend sobre a lista inteira.
- **Encontradas na R4 (11/10/2026), propostas para o backend:**
  - `GET /api/execucao/setores/` poderia trazer `sem_organizador` (nenhum membro com `servicos.ver_setor` + `tarefas.distribuir`), para o aviso da Visão geral e do painel;
  - `LinhaDeTarefa` (andamento) poderia trazer a `etapa` do serviço; hoje o quadro deduz "Distribuído" ou "Em execução" pelas tarefas ativas, e um serviço com uma tarefa concluída e outra aberta aparece como "Distribuído". O bloco `quadro/` (pergunta 11) resolve isso de vez;
  - `ItemDaFila` não traz `setor_id` (a tela usa o setor da consulta); `LinhaDeTarefa` e `Alerta` não trazem a prioridade da venda, então o filtro Prioridade só vale para "Para distribuir".
- **Visão geral sem bloco no backend (proposta para o backend):** os blocos de `/api/execucao/` exigem `?setor=` (400 sem setor). Para a Visão geral, há dois caminhos: (a) o frontend chama os blocos de cada setor e soma, o que funciona hoje, mas faz uma chamada por setor e por bloco; (b) um bloco `GET /api/execucao/visao-geral/` (ou `setor` opcional para quem tem `setores.todos`) que devolva os contadores por setor e a lista consolidada. Recomendação: (a) na R4 para não bloquear, e (b) se ficar lento.
- **Filtros de Vendas que a lista ainda não tem (proposta para o backend):** `vendido_por`, `setor` (vendas com serviço no setor), período da venda (`venda_de`, `venda_ate`), "com atraso" e "a faturar". Hoje `/ordens/` aceita `q`, `cliente`, `minhas`, `etapa`, `concluida`, `liberada` e `cobranca_realizada`. Os contadores dos indicadores também precisam de um resumo (`/api/comercial/vendas/resumo/` ou um campo `contadores` na lista), senão o frontend teria de baixar todas as vendas para contar.
- **Mutações de tarefa e de serviço:** a camada da R0 não tem as funções de mudar status, reatribuir, mudar prazo e excluir tarefa (`/api/ordens-servico/tarefas/{id}/`), nem as de ajustar e excluir serviço (`/servicos/{id}/`). Entram em `features/execucao` na R4.
- **Permissões por tarefa no detalhe:** o detalhe do serviço traz `pode_distribuir` e `pode_dar_ciencia`, mas não traz por tarefa se a pessoa pode editá-la. O frontend deriva isso com `pode('tarefas.distribuir', setor_id)`, `pode('tarefas.editar_setor', setor_id)` e "a tarefa é minha". *Proposta para o backend, se ficar frágil:* um `pode_editar` por tarefa.
- **Briefs antigos:** `listagem-ordens-brief.md`, `ordem-detalhe-brief.md` e `gestor-operacional-brief.md` ficam superados por este documento depois da aprovação.
