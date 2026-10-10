# UI/UX Brief — Hub da Ordem de Serviço

> Documento para geração de UI com ferramenta de design assistida por IA.
> Contexto: sistema web interno de gestão de Ordens de Serviço — Ergogroup OS.
> Este brief herda tipografia, cor, componentes e personas de [`identidade-visual-brief.md`](./identidade-visual-brief.md) — leia-o primeiro.
> Escopo: **o hub de uma Ordem de Serviço específica** — a tela para onde toda OS aberta a partir da [listagem](./listagem-ordens-brief.md) leva. É o coração operacional, comercial e de auditoria do produto.
>
> **Revisão 2** — a primeira geração deste brief resultou em uma tela com três problemas concretos, corrigidos nesta versão: (1) o card de Serviço não evidenciava dados essenciais do próprio serviço (descrição, prioridade, horas, complexidade — só mostrava nome/status/prazo/conclusão); (2) o controle de status da tarefa (bom como interação de um clique) tinha posição inadequada e só avançava, sem permitir reverter; (3) o conteúdo das abas ficava limitado a uma largura fixa (`max-width` de 1000px/820px) em vez de ocupar a largura real do container. As seções 6, 7, 8 e 9 abaixo tratam isso explicitamente — leia com atenção antes de gerar a tela novamente.

---

## 1. Contexto do produto

Esta é a tela mais importante do sistema: o lugar onde uma Ordem de Serviço existe por inteiro. Nenhum outro lugar do produto reúne execução técnica, dados comerciais, ciclo de cobrança e histórico de auditoria de uma mesma OS — tudo isso vive aqui.

Públicos completamente diferentes abrem esta mesma tela com objetivos diferentes:
- O **Técnico** abre para saber o que precisa fazer hoje e atualizar o status do que já fez.
- O **Líder/Sub-Líder Técnico** abre para distribuir e reorganizar trabalho entre Serviços e Tarefas.
- **Comercial/Diretor** abrem para conferir ou editar os termos da venda e do contrato.
- **Financeiro** abre para acompanhar ou registrar a cobrança.
- **Administrativo** abre para gerenciar dados de contrato.
- Qualquer perfil pode abrir para consultar o **histórico de auditoria** de uma mudança específica.

O maior risco de design desta tela é a poluição visual: se tudo aparecer ao mesmo tempo, o Técnico perde a clareza operacional que precisa ter em segundos, e o Comercial se perde em ruído técnico que não lhe interessa. A solução não é esconder dado — é **organizar por zona de assunto**, com uma zona sempre priorizada por perfil. Isso não significa reduzir a densidade de informação dentro de cada zona: dentro da aba Execução, por exemplo, **todos** os dados do Serviço e da Tarefa devem estar visíveis (ver seção 6).

---

## 2. Modelo de dados da tela

```
Ordem de Serviço (OS)
 ├── Identificação        — cliente, status, prioridade, prazo, dias em aberto
 ├── Execução              — Serviços → Tarefas (hierarquia operacional)
 ├── Comercial / Contrato  — valor, forma de pagamento, parcelas, contrato
 │                           (objeto, vigência, gestor de contrato)
 ├── Cobrança / Faturamento— liberação para cobrança, cobrança realizada,
 │                           número de NF, data, responsáveis por cada etapa
 └── Auditoria             — linha do tempo de tudo que mudou na OS,
                              em qualquer um dos Serviços, Tarefas ou
                              (se existir) OS Operacionais vinculadas
```

Cada Serviço, no schema real da API (`Servico`), carrega bem mais do que nome e prazo — e a tela precisa mostrar isso, não só armazenar:

```
Serviço
 ├── catalogo_detail.nome      — nome do item de catálogo (ex: "Laudo Ergonômico")
 ├── descricao                 — texto próprio do serviço (obrigatório, diferente
 │                                da descrição do catálogo) — SEMPRE visível
 ├── status                    — calculado a partir das tarefas (leitura)
 ├── prioridade                — editável, mesma paleta baixa/média/alta da OS
 ├── prazo                     — data, nullable
 ├── horas_estimadas            — editável, decimal
 ├── horas_estimadas_efetivas  — calculado (soma real das tarefas), leitura
 ├── complexidade               — editável, baixa/média/alta (1/2/3)
 ├── complexidade_efetiva      — calculado, leitura
 ├── data_inicio / data_termino — calculados a partir das tarefas, leitura
 ├── data_conclusao             — calculado, leitura
 └── terminado_por_nome         — quem concluiu a última tarefa, leitura
```

```
Tarefa
 ├── responsavel_nome   — técnico responsável
 ├── descricao           — nullable
 ├── status               — aberta / em_andamento / concluida / cancelada
 ├── prioridade
 ├── prazo                — data, nullable
 ├── horas_estimadas      — editável, decimal
 └── horas_estimadas_efetivas — calculado, leitura
```

Fatos do domínio que moldam a tela:

- **Status de Serviço e o próprio "andamento" da OS são calculados**, não editados diretamente: o status do Serviço deriva do status das suas Tarefas; a OS reflete o que acontece nos Serviços. A UI deve deixar isso claro (esses campos aparecem como leitura, não como controle editável) — **exceto o status da Tarefa em si**, que é o único status editável diretamente na tela (ver seção 6 e 8).
- **Ciclo de cobrança é independente do ciclo operacional.** Uma OS pode estar com todo o trabalho técnico concluído e ainda não estar liberada para cobrança, ou liberada e ainda não faturada. São três estados possíveis a comunicar com clareza: *não liberada* → *liberada, aguardando faturamento* → *cobrança realizada* (com nº de NF e data).
- **Contrato é opcional por OS** — nem toda venda tem contrato. Quando existe, carrega objeto do contrato, vigência (início/fim) e dados do gestor de contrato (nome, e-mail, telefone) do lado do cliente.
- **Toda mudança relevante gera um registro de auditoria**, categorizado por ação (criação, atualização, exclusão, mudança de status, liberação de faturamento, cobrança realizada, alterações de contrato, etc.) e por entidade (a própria OS, um Serviço, uma Tarefa ou uma OS Operacional vinculada). A auditoria de uma OS deve poder mostrar tanto os eventos da própria OS quanto, filtrados, os de seus Serviços/Tarefas.
- **Valores monetários são condicionais por perfil** — mesma regra do restante do produto: indisponíveis para Técnico, Sub-Líder Técnico, Gestor Administrativo e Administrativo.

---

## 3. Perfis de usuário e permissões dentro do hub

A estrutura da tela é idêntica para todos — o que muda é **quais zonas aparecem, quais campos são editáveis e qual zona vem em primeiro plano por padrão**.

### Técnico
- Zona padrão: **Execução**. Vê apenas suas próprias tarefas com destaque; as demais tarefas do serviço aparecem, mas sem foco.
- Única ação permitida: mudar o status da própria tarefa — avançar (aberta → em andamento → concluída) ou reverter um passo (ver seção 6).
- Sem acesso a comercial, contrato, cobrança ou valores. Auditoria, se visível, é somente leitura.

### Líder Técnico (`gestor_tecnico`) / Sub-Líder Técnico (`sub_gestor_tecnico`)
- Zona padrão: **Execução**, com controle total: criar/editar/excluir Serviços e Tarefas, reatribuir responsáveis.
- Líder Técnico vê o valor da OS na zona de identificação; Sub-Líder não.
- Nenhum dos dois edita dados comerciais/contrato — apenas consulta, se visível para o perfil.

### Diretor / Gestor Comercial / Comercial
- Zona padrão: **Comercial**. Podem editar cliente, valor, forma de pagamento, parcelas, contrato.
- Diretor e Gestor Comercial têm acesso total, incluindo cobrança.
- Acompanham a Execução em modo consulta (útil para entender andamento sem interferir).

### Gestor Financeiro / Financeiro
- Zona padrão: **Cobrança**. Ação principal: registrar cobrança realizada (número de NF, data) quando a OS está liberada para faturamento.
- Consulta o valor e a forma de pagamento; não edita dados de contrato nem de execução.

### Gestor Administrativo / Administrativo
- Zona padrão: **Comercial/Contrato**, mas **sem visão de valores monetários** — editam objeto do contrato, vigência e dados do gestor de contrato do cliente.
- Administrativo, adicionalmente, não gerencia Serviços/Tarefas (somente consulta operacional básica, se necessário).

> Regra geral: a diferença entre perfis é **zona padrão + campo editável/oculto**, nunca uma tela redesenhada. Ver seção 2 de [`identidade-visual-brief.md`](./identidade-visual-brief.md).

---

## 4. Papel desta tela no produto

É o único lugar do sistema onde o ciclo completo de uma OS — venda, execução, cobrança e histórico — pode ser acompanhado e operado. A listagem geral leva o usuário até aqui; o painel do gestor técnico e o Analytics olham para *muitas* OS ao mesmo tempo de forma agregada, mas é aqui que **uma** OS é de fato trabalhada, editada e fechada.

---

## 5. Objetivos de design

1. **Zonas de assunto claramente separadas** — Execução, Comercial/Contrato, Cobrança e Auditoria não competem visualmente entre si; cada uma tem seu espaço, e o usuário sempre sabe em qual está
2. **Clareza operacional impecável na zona de Execução** — para o Técnico, esta é a tela mais usada do dia; hierarquia OS → Serviço → Tarefa, prazos e responsáveis precisam ser lidos sem esforço, e **nenhum campo do Serviço fica de fora** (descrição, prioridade, horas, complexidade — não só status e prazo)
3. **"Onde estou" sempre visível** — identificação da OS (cliente, status, prioridade, prazo) fixa ou facilmente acessível, independente de qual zona está em foco
4. **Ação no lugar certo, para o perfil certo** — mudar status de tarefa é uma ação de um clique, sempre no mesmo lugar da linha, com uma forma clara de reverter; registrar cobrança e editar contrato são ações deliberadas, com mais contexto e confirmação
5. **Auditoria como registro de confiança, não como ruído** — sempre acessível, nunca em primeiro plano por padrão (exceto quando o próprio objetivo do usuário é investigar histórico)
6. **A tela usa o espaço real da janela** — nenhuma aba tem uma largura máxima artificial que sobra em branco nas laterais em telas de desktop (ver seção 6)

---

## 6. Estrutura de informação da página

### Regra de layout que vale para a tela inteira: sem `max-width` artificial

O container de conteúdo (a área à direita da sidebar, abaixo do header) deve ocupar **100% da largura disponível**, em qualquer aba. Nenhuma aba usa `max-width` fixo (ex: 1000px, 820px) para "centralizar" o conteúdo — isso deixa faixas vazias enormes nas laterais em monitores de desktop (1440px+), que é o ambiente de uso primário do produto.

- **Aba Execução**: os cards de Serviço se esticam para ocupar a largura total da área de conteúdo. Se houver espaço sobrando dentro do card (ex: a lista de tarefas é estreita por natureza), use esse espaço para uma segunda coluna de metadados ou para respiro horizontal — nunca deixe o card mais estreito que o container só porque o conteúdo "caberia" em menos espaço.
- **Abas Comercial & Contrato / Cobrança**: mesmo sendo mais parecidas com formulário (ver seção 8), a grade de campos (`grid-template-columns`) deve se adaptar à largura total — por exemplo, 3–4 colunas de campo em vez de 2, ou cards lado a lado (Dados da venda | Contrato) em telas largas, em vez de empilhados com metade da tela vazia ao lado.
- **Aba Auditoria**: a timeline pode ter uma largura de leitura confortável (não precisa esticar o texto de cada evento até a borda), mas o container em volta dela — filtros, cabeçalho — ocupa a largura cheia.
- Só a **legibilidade de texto corrido** (parágrafos longos, como observação ou objeto do contrato) pode ter um `max-width` de leitura (~65–80 caracteres) — isso é diferente de limitar o layout inteiro da página.

### Nível 0 — Identificação da OS (persistente)
Faixa compacta, sempre visível independente da zona ativa, ocupando a largura total do container:
- Cliente, número/identificador da OS, status, prioridade, prazo, dias em aberto
- Valor (condicional por perfil)

### Navegação por zonas (abas)
A tela se organiza em **abas**, não em rolagem única — é o que permite às zonas conviverem sem poluição cruzada. Zona padrão pré-selecionada conforme o perfil (seção 3).

### Aba "Execução" — o coração operacional

**Card de Serviço — todos os campos abaixo são obrigatórios na UI, não apenas nome/status/prazo:**

| Campo | Como mostrar |
|-------|--------------|
| Nome (catálogo) | Título do card, peso forte |
| Status (derivado) | Badge dot + label, ao lado do título — somente leitura |
| **Descrição** | Texto logo abaixo do título, **sempre visível** (não escondida atrás de "ver mais" por padrão; se for muito longa, trunca com `line-clamp` e um "ver mais" que expande, mas o início do texto sempre aparece sem clique) |
| **Prioridade** | Badge dot + label, mesma paleta da OS (alta = vermelho, média = âmbar, baixa = neutro) |
| **Prazo** | Data, com destaque visual quando próxima/vencida (mesma linguagem de urgência da faixa de identificação) |
| **Horas estimadas vs. realizadas** | Par lado a lado, ex: `Estimado 8h · Realizado 6,5h` — se não houver horas estimadas, mostrar apenas o realizado |
| **Complexidade vs. efetiva** | Badge (Baixa/Média/Alta); se a complexidade efetiva (calculada pelas tarefas) divergir da estimada, sinalizar sutilmente (não é erro, é informação) |
| Datas de início/término/conclusão | Quando o serviço já começou/terminou — bloco secundário, menor destaque que os campos acima |
| Concluído por | Nome de quem finalizou, só quando `status = concluída` |
| Contagem de tarefas | Badge pequeno, ex: `4 tarefas` |

Isso forma uma "faixa de metadados" no cabeçalho do card — mesmo padrão visual (label pequeno uppercase + valor) já usado na faixa de identificação da OS (nível 0), reaproveitado aqui em escala menor. **Não** comprimir tudo em uma única linha de texto separada por "·" — use uma grade de 2–4 colunas que se adapta à largura do card.

**Linha de Tarefa — dentro do card do Serviço:**
- Controle de status (ver especificação completa abaixo)
- Descrição da tarefa
- Responsável (avatar + nome)
- Prazo, com indicador de atraso quando vencido
- Badge "Sua tarefa" quando `responsavel = usuário logado` (relevante para Líder/Sub-Líder olhando a lista toda)
- Horas estimadas/realizadas, se preenchidas (secundário, não compete com descrição/prazo)
- Ações de editar/excluir no hover (Líder/Sub-Líder Técnico)

**Controle de status da tarefa — clique único para avançar, com reversão sempre acessível:**

Este é o elemento mais usado da tela pelo Técnico — a especificação abaixo é deliberadamente detalhada porque a primeira geração acertou a interação, mas errou o posicionamento e não tinha reversão.

- **Posição fixa**: é o primeiro elemento da linha da tarefa, sempre no mesmo lugar em toda tarefa de toda aba de Execução — nunca desloca por causa de badges opcionais ("Sua tarefa", "Atrasada") que aparecem depois dele.
- **Não fica colado a nenhuma barra de acento/urgência.** Se a linha tiver uma faixa de cor lateral indicando prioridade/atraso, essa faixa é uma borda fina do próprio contêiner da linha (`border-left`), não um elemento separado disputando espaço ao lado do controle de status — o controle precisa de um respiro visual próprio (padding lateral consistente, nunca < 12px até a borda do card).
- **Avançar = um clique**, sempre. Clicar no controle avança para o próximo status: aberta → em andamento → em andamento → concluída. Sem menu, sem dropdown, sem confirmação — exatamente como já validado na primeira versão.
- **Reverter é a peça que faltava**: ao lado do controle principal (mesmo grupo visual, mas claramente secundário — menor, cor neutra, não compete pela atenção), um ícone pequeno de "voltar um status" (seta para trás / undo) permite desfazer: concluída → em andamento → aberta. Fica **sempre visível** (não só no hover) — é uma ação de correção que precisa ser confiável de encontrar, mesmo sendo secundária em peso visual.
  - Reverter fica desabilitado/oculto quando a tarefa já está em `aberta` (não há para onde voltar).
  - O ciclo de avançar/reverter só transita entre `aberta ↔ em_andamento ↔ concluída`. **Cancelar não faz parte deste controle** — é uma ação deliberada e destrutiva, feita pelo menu de edição da tarefa (Líder/Sub-Líder Técnico), com confirmação, não por clique único.
- Quem só pode ver (não mudar) o status enxerga o mesmo badge visual, sem os elementos clicáveis — o status nunca muda de aparência entre modo leitura e modo interativo, só a interatividade some.

---

### Aba "Comercial & Contrato"
- Dados da venda: valor, forma de pagamento, parcelas, data da venda, observação
- Bloco de contrato (só aparece se `contrato = true`): objeto do contrato, vigência (início/fim), dados do gestor de contrato do cliente
- Editável para Comercial/Diretor/Gestor Comercial/Administrativo (conforme campo); valores ocultos para quem não tem permissão financeira
- Em telas largas, os dois blocos (Dados da venda / Contrato) podem ficar lado a lado em vez de empilhados — ver regra de largura no início da seção 6

### Aba "Cobrança"
- Estado atual do ciclo: não liberada / liberada para cobrança (com data e responsável) / cobrança realizada (com nº de NF, data e responsável)
- Ação de registrar cobrança, disponível só quando liberada e ainda não faturada
- Oculta por completo para perfis sem acesso financeiro (Técnico, Sub-Líder Técnico, Administrativo, Gestor Administrativo)

### Aba "Auditoria"
- Linha do tempo cronológica (mais recente primeiro) dos eventos da OS e, filtrável, dos seus Serviços/Tarefas
- Cada evento: ação (criação, atualização, status, liberação de faturamento, cobrança realizada, contrato, exclusão...), quem fez, quando, e o que mudou
- Somente leitura para todos os perfis

---

## 7. Comportamentos esperados

| Ação | Quem | Como |
|------|------|------|
| Ver identificação da OS | Todos | Sempre visível, independente da aba |
| Avançar status da própria tarefa | Técnico | Um clique no controle de status, sempre na mesma posição da linha |
| Reverter status da própria tarefa | Técnico | Ícone secundário de "voltar" ao lado do controle de status, sempre visível (não só hover) |
| Avançar/reverter status de qualquer tarefa | Líder + Sub-Líder Técnico | Mesmo controle, sem restrição de "própria tarefa" |
| Cancelar uma tarefa | Líder + Sub-Líder Técnico | Ação separada no menu de edição da tarefa, com confirmação — não pelo controle de status |
| Criar/editar/excluir Serviço e Tarefa | Líder + Sub-Líder Técnico | Ações inline e modal, aba Execução |
| Editar dados comerciais e contrato | Comercial, Diretor, Gestor Comercial, (contrato) Administrativo/Gestor Administrativo | Formulário na aba Comercial & Contrato |
| Ver valor da OS | Diretor, Gestor Comercial, Comercial, Gestor Financeiro, Financeiro, Líder Técnico | Campo condicional; oculto para os demais |
| Registrar cobrança realizada | Gestor Financeiro, Financeiro, Diretor | Ação na aba Cobrança, exige OS liberada |
| Consultar auditoria | Todos | Aba Auditoria, somente leitura |
| Excluir a OS | Perfis com permissão total (Diretor) | Ação de risco, fora do fluxo cotidiano — confirmação explícita |

---

## 8. Diretrizes de UX

### Largura total, sempre
- Nenhum container de aba tem `max-width` fixo menor que a área de conteúdo disponível — ver regra detalhada no início da seção 6. Esse foi um erro concreto da primeira versão (Execução limitada a 1000px, Comercial/Cobrança a 820px) e não deve se repetir.

### Abas como resposta a "onde está o quê"
- Cada aba é um assunto fechado: Execução, Comercial & Contrato, Cobrança, Auditoria
- A aba ativa deve estar claramente marcada; badges nas abas podem sinalizar contagem relevante (ex: nº de tarefas atrasadas na aba Execução)

### Hierarquia visual em Execução, com todos os campos do Serviço presentes
- **Serviço**: card com peso visual médio — nome em destaque, fundo sutil (`bg-muted/40`) no cabeçalho, e uma faixa de metadados (descrição, prioridade, prazo, horas, complexidade) sempre visível — não só status e prazo
- **Tarefa**: linha densa dentro do card do Serviço, sem card próprio — separador (`divide-y`), não caixa
- Status é o elemento mais importante da linha de tarefa: ícone + cor + label, nunca cor isolada

### Controle de status: um clique para avançar, reversão sempre acessível e nunca espremida
- Ver especificação completa na seção 6. Resumo das regras de UX: posição fixa e consistente, respiro próprio (não colado em barra de acento), avançar em um clique, reverter com ícone secundário sempre visível (não escondido em hover), cancelar fora deste controle

### Prazos e datas nunca são secundários
- Prazo de tarefa, prazo de serviço e prazo da OS precisam de contraste visual suficiente para serem lidos em varredura — não enterrados em texto cinza pequeno junto de metadados triviais
- Atraso é tratado como estado, não como nota de rodapé (cor de alerta consistente com o resto do produto)

### Comercial/Contrato/Cobrança como registro, não como painel
- Essas abas têm tom mais "documento/formulário" — mais parecidas com um cadastro do que com um cockpit operacional; menos densidade de ação, mais espaço em branco *entre campos* — o que não significa desperdiçar a largura da página (ver regra de largura)
- Nenhum dado financeiro deve vazar visualmente para a aba Execução, mesmo para quem tem permissão de vê-lo em outro lugar da tela

### Auditoria é histórico, não alerta
- Timeline cronológica compacta, ícone por tipo de ação, sem cor de urgência — é registro de fato, não indicador de problema

### Ações por perfil, nunca layout por perfil
- A mesma estrutura de abas existe para todos; o que muda é aba padrão, campos editáveis e abas ocultas (ex: Técnico não vê a aba Cobrança)

### Responsividade
- Desktop-first (1280px+), mas a tela deve tirar proveito de telas maiores (1440px, 1920px) — mais colunas de metadados, cards lado a lado, nunca conteúdo "flutuando" no centro com bordas vazias
- Funcional em tablet (768px) — abas colapsam para um seletor compacto (dropdown) se necessário
- Mobile não é prioridade, mas não pode quebrar

---

## 9. Componentes-chave a projetar

1. **OS Identity Bar** — faixa persistente com cliente, status, prioridade, prazo, dias em aberto, valor condicional; largura total
2. **Tabs de Zona** — Execução / Comercial & Contrato / Cobrança / Auditoria, com aba padrão por perfil
3. **Serviço Card** — cabeçalho com título + status, faixa de metadados completa (descrição sempre visível, prioridade, prazo, horas estimadas/realizadas, complexidade/efetiva, datas, concluído por), lista de tarefas; largura total do container
4. **Tarefa Row** — controle de status (posição fixa, ver item 5), descrição, responsável, prazo com indicador de atraso, badge "Sua tarefa", ações de edição/exclusão no hover
5. **Controle de Status com Reversão** — componente dedicado: pill clicável (avançar, 1 clique) + ícone secundário sempre visível (reverter 1 passo); estados aberta/em andamento/concluída; nunca inclui cancelar
6. **Status Badge** — dot + label, versão somente-leitura do item 5, reutilizado em OS/Serviço (que não são editáveis diretamente)
7. **Painel Comercial & Contrato** — formulário de revisão com bloco de contrato condicional, em grade que aproveita a largura total
8. **Painel de Cobrança** — três estados visuais (não liberada / liberada / cobrança realizada) + ação de registrar
9. **Timeline de Auditoria** — item de linha do tempo com ícone por ação, autor, timestamp e resumo da mudança
10. **Modal de criação de Serviço/Tarefa** — formulário mínimo (responsável + descrição para tarefa; catálogo + descrição para serviço)
11. **Empty states** — OS sem serviços, serviço sem tarefas, OS sem contrato, sem eventos de auditoria

---

## 10. Referências de estilo

- Ver seção 8 de [`identidade-visual-brief.md`](./identidade-visual-brief.md)
- Aba Execução: **Linear.app**, **Height** — cockpit operacional denso, mas sem sobrar espaço em branco nas laterais em telas largas
- Abas Comercial/Contrato/Cobrança: tom mais próximo de um formulário de revisão/cadastro (ex: painéis de faturamento de ferramentas de gestão B2B) — calmo, tabular, sem urgência visual, mas ainda usando a largura real da tela (grades de 3–4 colunas, cards lado a lado)
- Aba Auditoria: inspiração em changelogs/timelines de auditoria (ex: histórico de atividade do Linear/GitHub) — compacto, cronológico, neutro

---

## 11. Entregáveis esperados da ferramenta de design

- [ ] Layout completo em light mode e dark mode, **ocupando 100% da largura do container de conteúdo** (sem `max-width` artificial nas abas)
- [ ] Aba Execução com OS de 2–3 serviços, cada um com 3–5 tarefas — **cada card de Serviço mostrando descrição, prioridade, prazo, horas estimadas/realizadas e complexidade**, não só status e prazo
- [ ] Detalhe do Controle de Status com Reversão nos três estados (aberta/em andamento/concluída), mostrando claramente o clique de avançar e o ícone de reverter lado a lado
- [ ] Variante da aba Execução para o Técnico (foco nas próprias tarefas)
- [ ] Aba Comercial & Contrato, com e sem contrato vinculado, em layout de largura total (blocos lado a lado, não empilhados com espaço vazio)
- [ ] Aba Cobrança nos três estados (não liberada / liberada / cobrança realizada)
- [ ] Aba Auditoria com uma linha do tempo de eventos variados
- [ ] Estado vazio de cada aba e estado de loading (skeleton)
- [ ] Modal de criação de tarefa e de serviço
