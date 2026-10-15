# 03. Execução nos setores

Este módulo cobre o que acontece **depois da venda**:
- como cada serviço chega ao setor certo;
- como o setor recebe, distribui e executa;
- como o trabalho de **setores diferentes** se junta de novo na mesma venda.

Pré-requisitos:
- [01. Organização](01-organizacao-setores-funcoes-permissoes-e-time.md): setores, funções e permissões.
- [02. Vendas](02-vendas.md): a OS e os serviços vendidos.

Decisões de origem:
- ADR 0004: setor responsável pela execução.
- ADR 0005: o prazo como único parâmetro de planejamento.
- ADR 0006: fluxo de execução nos setores.
- ADR 0008: acompanhamento.
- ADR 0009: ciência de recebimento.
- ADR 0010: notificações por e-mail.

---

## 1. A ideia central: a venda é uma, o trabalho é de cada setor

A **OS é o pacote comercial**. A **unidade de trabalho é o serviço**, e cada serviço pertence a **um único setor**. Uma venda com serviços de setores diferentes se divide sozinha: cada setor só vê e só trabalha a sua parte, no seu ritmo. A OS só termina quando **todas as partes** terminam.

```
                         OS #120 · Metalúrgica Silva (vendida pelo Comercial)
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          ▼                               ▼                               ▼
  Serviço "PGR"                   Serviço "LTCAT"                 Serviço "Auditoria contábil"
  setor: Segurança do Trabalho    setor: Segurança do Trabalho    setor: Financeiro
          │                               │                               │
  organizador da Segurança        (mesmo setor: mesmo e-mail,     organizador do Financeiro
  recebe, distribui               mesma fila)                     recebe, distribui
          │                               │                               │
  tarefas de Ana e Bruno          tarefa de Ana                   tarefa de Carla
          │                               │                               │
          └──────────────── cada serviço conclui quando as tarefas dele terminam ──┘
                                          │
                     OS concluída quando todos os serviços ativos terminam
                     → liberada para faturar (se "liberar na conclusão")
```

Consequências práticas:
- **Cada setor tem a sua fila.** A Segurança não vê a Auditoria contábil na fila dela, e vice-versa.
- **Cada setor recebe o seu aviso.** Um e-mail por setor, com só os serviços daquele setor (ADR 0010).
- **Cada setor decide quem executa e o prazo** da sua parte. Não há prazo da OS para planejar; o prazo é de cada tarefa.
- **Quem trabalha num serviço vê o resto da venda sem poder mexer.** O detalhe do serviço mostra "Outros serviços da OS": em que setor está cada um, a etapa e com quem está. Isso responde "falta o quê para essa venda fechar?" sem dar acesso ao outro setor.
- **A OS anda no ritmo do setor mais lento.** Se a Segurança termina em 5 dias e o Financeiro em 30, a OS conclui (e libera para faturar, se for o caso) no dia 30.

---

## 2. Como o serviço chega ao setor certo

### 2.1 O catálogo decide o setor

Cada item do catálogo tem um **setor responsável pela execução** (obrigatório). Ao vender, o serviço **copia** o setor do catálogo. O vendedor não escolhe o setor; ele escolhe o serviço, e o setor vem junto.

Um setor só é **setor de execução** se tiver catálogos ativos. Setores como Comercial e Diretoria não recebem serviços, porque nenhum catálogo aponta para eles.

### 2.2 Por que é uma cópia

Se o catálogo mudar de setor depois, os serviços já vendidos **ficam onde estavam**: o histórico não se move sozinho. Há duas formas de levar serviços para o setor novo:

| Situação | Como | Regra |
|---|---|---|
| O catálogo inteiro mudou de setor (reorganização) | No Catálogo, ao mudar o setor, marcar **"levar os serviços em aberto"**. Também dá para mudar vários catálogos de uma vez. | Só vão os serviços **em aberto e sem tarefas**. Os que já têm tarefa ficam no setor antigo até terminar, porque as tarefas têm responsáveis de lá. |
| Um serviço específico foi vendido no item errado | Trocar o catálogo do serviço por um de outro setor. | Só com o serviço **em aberto e sem tarefas**. Quem troca precisa de `os.gerenciar`, ou de `servicos.gerenciar` no setor de destino. |

Nos dois casos, o serviço movido **volta para "Novo"** (a ciência de recebimento é apagada), e o organizador do setor novo recebe o **e-mail de chegada**. A mudança fica na linha do tempo.

### 2.3 Proteções nos dois lados

- **Na venda:** catálogo inativo ou de setor inativo não pode ser vendido. Se o setor não tiver ninguém que receba tarefas, a venda **passa com aviso**, porque o comercial não tem como corrigir isso.
- **No catálogo:** um catálogo ativo só pode ficar num setor que tenha quem receba tarefas.
- **Nos setores:** um setor com catálogos ativos não pode ser desativado.
- **No time:** mudar pessoas nunca é barrado. Se um setor de execução ficar sem quem receba tarefas, aparece um **aviso** (ver módulo 01).

---

## 3. Quem faz o quê em cada setor

As permissões de execução são **por setor**: valem só no setor do vínculo da pessoa. Por isso, a mesma pessoa pode organizar um setor e não ter acesso nenhum a outro.

| Papel no setor | O que define | O que faz |
|---|---|---|
| **Organizador** | Lotado no setor, com `servicos.ver_setor` **e** `tarefas.distribuir`. | Recebe o e-mail de chegada e o resumo diário do setor, dá a ciência de recebimento e distribui. A tela inicial dele é o Painel do setor. |
| **Acompanha o setor** | `servicos.ver_setor` no setor. | Vê o Painel do setor (fila, andamento, alertas, equipe e concluídos) e pode explicar pausas. Sem `tarefas.distribuir`, não distribui. |
| **Distribui** | `tarefas.distribuir` no setor. | Cria, reatribui e exclui tarefas e confirma o recebimento dos serviços. |
| **Ajusta serviços** | `servicos.gerenciar` no setor. | Ajusta prioridade, troca o catálogo e exclui serviços do setor. |
| **Edita tarefas dos outros** | `tarefas.editar_setor` no setor. | Muda status, prazo e dados de tarefas de qualquer pessoa do setor. |
| **Recebe tarefas (lotado)** | Lotado no setor, com `tarefas.receber`. | Pode ser escolhido como responsável. |
| **Também executa aqui** | O setor está no "também executa em" da pessoa, que é lotada em outro setor. | **Só** pode ser escolhido como responsável. Não vê o painel nem distribui. Na equipe do setor, aparece com o setor de origem. |
| **Responsável por tarefa** | Tem tarefa no serviço, de qualquer setor. | Vê o serviço, a venda (sem valores) e os outros serviços da OS. Dá ciência da tarefa, inicia, conclui e reabre a **própria** tarefa, e pode explicar a pausa. |
| **Diretoria** | `setores.todos`. | As permissões de execução da função valem em **todos** os setores. A tela é a Visão geral, com o filtro de setor. **Não** conta como organizador e **não** recebe tarefas por causa disso; só onde é lotada com `tarefas.receber` ou onde também executa. |

### 3.1 Trabalhar em mais de um setor

Cada pessoa é **lotada em um único setor**. Para que alguém execute em outros, há o **"também executa em"**, configurado na pessoa (Time). Exemplos:

- Um técnico da Segurança que também faz serviços de Higiene Ocupacional: lotado na Segurança, "também executa em" Higiene. Ele aparece como responsável possível nos dois setores, mas só a Higiene distribui o trabalho de Higiene para ele.
- Quem coloca ou tira um setor do "também executa em" de alguém precisa distribuir naquele setor. O dono do setor decide quem de fora trabalha nele.

**Não existe** "organizar dois setores" com um vínculo só. Para acompanhar todos, a pessoa precisa de `setores.todos` (perfil de diretoria).

---

## 4. O ciclo dentro de um setor

### 4.1 Etapas do serviço

```
Novo ──ciência do setor──▶ A distribuir ──distribuir──▶ Distribuído ──alguém inicia──▶ Em andamento ──todas as tarefas terminam──▶ Concluído
  └──────────────── distribuir direto (registra a ciência junto) ───────────▲
```

| Etapa | Quando | Quem age |
|---|---|---|
| **Novo** | Chegou ao setor e ninguém confirmou o recebimento. | O organizador confirma ("recebi") ou já distribui. |
| **A distribuir** | O setor confirmou que recebeu, mas ainda não tem tarefa. | O organizador distribui. |
| **Distribuído** | Tem tarefas, e nenhuma começou. | Os responsáveis. |
| **Em andamento** | Alguma tarefa começou ou já terminou, e falta alguma. | Os responsáveis. |
| **Concluído** | Todas as tarefas ativas terminaram (as canceladas não contam). | — |
| **Cancelado** | Status de dados antigos. Hoje não há ação para cancelar um serviço (ver módulo 02). | — |

A etapa é **calculada**; ninguém a escolhe. Um serviço cujas tarefas foram todas excluídas, ou estão todas canceladas, volta para "a distribuir".

### 4.2 Ciência de recebimento do setor

- Quem confirma: quem tem `tarefas.distribuir` no setor do serviço. Dá para confirmar vários de uma vez; se faltar permissão em algum, nada é gravado.
- Serviços concluídos ou cancelados não aceitam ciência. Confirmar de novo não muda nada.
- **Distribuir direto** um serviço novo registra a ciência automaticamente, em nome de quem distribuiu. Na linha do tempo aparece só "distribuído".

### 4.3 Distribuir

- Num passo só, cria uma ou mais tarefas para o serviço. Cada tarefa tem responsável e, opcionalmente, prazo e descrição.
- **Uma tarefa** é a distribuição comum. **Várias** dividem o serviço entre pessoas ("Dividir entre pessoas").
- Também serve para **acrescentar** tarefas a um serviço já distribuído.
- O responsável precisa **receber tarefas daquele setor** (lotado com `tarefas.receber`, ou com o setor no "também executa em"). Se algum não puder, a distribuição inteira é recusada.
- A prioridade da tarefa vem do serviço, que por sua vez herdou a da venda.
- Cada responsável recebe **um e-mail** com todas as tarefas que ganhou nessa distribuição. Quem distribui para si mesmo não recebe.

### 4.4 Etapas da tarefa

```
Nova ──ciência do responsável──▶ A iniciar ──iniciar──▶ Em andamento ──concluir──▶ Concluída
  └────────────────── iniciar direto (registra a ciência junto) ──▲
```

| Regra | Comportamento |
|---|---|
| Ciência da tarefa | Só o **responsável** confirma, uma ou várias tarefas suas. |
| Iniciar | Registra a data de início e, se faltava, a ciência. |
| Concluir | Registra a data de término. Reabrir apaga o término. |
| Trocar o responsável | Exige `tarefas.distribuir` no setor. A ciência volta a zero, a "data de atribuição" recomeça e só o novo responsável recebe o e-mail. |
| Mudar o prazo | Não mexe na ciência. |
| O responsável altera | Só o **status** da própria tarefa. Prazo, descrição e outros campos exigem `tarefas.editar_setor`. |
| Excluir tarefa | Exige `tarefas.distribuir` no setor. |
| Cancelar tarefa | Pelo status. A tarefa cancelada não conta para concluir o serviço. |

### 4.5 O que o sistema calcula no serviço

| Campo | Regra |
|---|---|
| Prazo do serviço | O **maior** prazo entre as tarefas não canceladas. Sem prazo nas tarefas, o serviço fica sem prazo. |
| Início | A data de início da primeira tarefa. |
| Término e "terminado por" | Quando todas as tarefas ativas terminam: a data e o responsável da **última** tarefa concluída. |
| Status | Pelas tarefas (seção 4.1). Reabrir uma tarefa reabre o serviço e, com ele, a OS. |

---

## 5. Como as partes se juntam na venda

| O quê | Regra |
|---|---|
| Status da OS | Aberta → Em andamento (algum serviço ativo andou) → Concluída (todos os ativos concluídos). Fica Cancelada só se todos os serviços estiverem cancelados. |
| Andamento | Contagem dos serviços da OS por etapa, de todos os setores (ex.: "2 de 4 concluídos"). Aparece em Vendas e no Resumo da venda. |
| Liberação para faturar "na conclusão" | Acontece quando o **último serviço ativo** de qualquer setor termina. A data é a do término desse serviço e "liberada por" é quem o terminou. O financeiro recebe o e-mail com o resumo da execução: quem trabalhou, em que serviço, recebeu, início, término, dias parada e dias em execução. |
| Venda que volta a andar | Reabrir uma tarefa de uma OS concluída reabre a OS. A liberação, se já aconteceu, **não** é desfeita; a Conferência do faturamento aponta a mudança. |
| Serviço acrescentado depois | Entra como Novo no setor dele, só aquele setor é avisado, e a OS deixa de estar concluída até ele terminar. |
| Linha do tempo | A da OS junta os eventos de todos os serviços e tarefas, de todos os setores. A do serviço traz só ele e as tarefas dele. |

---

## 6. Acompanhamento e alertas

| Sinal | Regra |
|---|---|
| **Atrasado** | Serviço ativo com prazo anterior a hoje. |
| **Sem movimentação** | Serviço ativo sem nenhuma mudança há `DIAS_ALERTA_SEM_MOVIMENTACAO` dias (7). Contam como movimentação: criar a tarefa, mudar status, responsável ou prazo, mover a tarefa de serviço, excluir tarefa, ciência de recebimento (do setor ou da tarefa), mudar o serviço de setor. Corrigir a descrição **não** conta. |
| **Pausa explicada** | Para um serviço parado que espera algo, quem tem tarefa no serviço ou acompanha o setor informa o motivo: aguardando o cliente, documentação, agendamento, terceiro, ou outro (este exige observação). O aviso fica **silenciado por 7 dias**, e o setor vê o motivo e até quando vale. Qualquer movimentação encerra a pausa. O prazo continua contando. |
| **Sem ciência do técnico** | Tarefa ainda "nova": o responsável não confirmou o recebimento. Conta a partir da atribuição. |
| **Novo há muito tempo** | Serviço "novo" há 3 dias ou mais (sinal na tela). |
| **Resumo diário por e-mail** | Para o organizador: serviços sem ciência ou sem distribuição há 3 dias ou mais, e sem movimentação há 7 ou mais, **por setor** (ADR 0010). |

No Painel do setor, esses sinais formam o filtro **"Precisa de atenção"**: Atrasados, Sem andamento, Aguardando algo, Sem ciência do técnico e Novos há 3 dias ou mais. O filtro vale em qualquer aba.

---

## 7. Exemplo completo com dois setores

1. **Comercial** registra a OS #120 com dois serviços: "PGR" (Segurança do Trabalho) e "Auditoria contábil" (Financeiro), com liberação na conclusão.
2. A **organizadora da Segurança** recebe o e-mail "1 serviço para Segurança do Trabalho". O **organizador do Financeiro** recebe o dele. Cada um vê só o seu serviço em "Novos".
3. A Segurança **distribui direto** o PGR: uma tarefa para Ana (campo) e outra para Bruno (relatório), cada uma com prazo. A ciência do setor fica registrada, Ana e Bruno recebem um e-mail cada, e o prazo do PGR passa a ser o maior dos dois.
4. O Financeiro **confirma o recebimento** da Auditoria, que passa para "A distribuir". Depois distribui para Carla. Carla é da Segurança, mas tem o Financeiro em "também executa em".
5. Ana e Bruno **iniciam** e **concluem** as tarefas deles. O PGR fica **Concluído**. A OS fica **Em andamento**, porque falta a Auditoria. No detalhe do PGR, a Segurança vê em "Outros serviços da OS" que a Auditoria está "Distribuída, com Carla".
6. A Auditoria fica 7 dias parada esperando documentos do cliente. Ela aparece como "Sem andamento" no painel do Financeiro e no resumo diário. Carla **explica a pausa** ("aguardando documentação"), e o alerta fica silenciado por 7 dias.
7. Carla **conclui** a tarefa. A Auditoria fica **Concluída** → a OS fica **Concluída** → é **liberada para faturar**, com a data do término e "liberada por Carla". O financeiro recebe o e-mail com o resumo de quem trabalhou: Ana, Bruno e Carla.

---

## 8. Telas

| Tela | Rota | Para quem | O que mostra |
|---|---|---|---|
| **Meus serviços** | `/meus-servicos` | Todos (tela inicial de quem só executa) | As tarefas da pessoa, de qualquer setor. Abas pelas etapas da tarefa: Novas, A iniciar, Em andamento, Concluídas (por mês). Filtro "Precisa de atenção": Atrasadas, Vencem em 7 dias, Sem andamento, Aguardando algo, Novas há 3 dias ou mais. Há visão de quadro, em que arrastar uma tarefa confirma o recebimento ou inicia. |
| **Painel do setor** | `/setor/:setorId` | `servicos.ver_setor` (sem `setores.todos`) | O setor que a pessoa acompanha, com seletor se acompanhar mais de um. Abas pelas etapas do serviço: Novos, A distribuir, Distribuídos, Em andamento, Concluídos (por mês). Tem o filtro "Precisa de atenção" e filtros de pessoa, cliente, prazo e chegada. Na fila, o botão de distribuir também confirma o recebimento. |
| **Visão geral** | `/visao-geral` | `setores.todos` | A mesma página do Painel, com todos os setores de execução e o filtro de **Setor**. |
| **Detalhe do serviço** | `/servicos/:id` | Quem vê o serviço | O serviço com as tarefas e as ações de cada uma (confirmar recebimento, iniciar, concluir, reabrir, editar). Também: a ação de confirmar recebimento do serviço e distribuir, a explicação de pausa, a venda (sem valores), os outros serviços da OS e a linha do tempo do serviço. As ações aparecem conforme `pode_distribuir`, `pode_dar_ciencia` e `pode_confirmar_recebimento`. |

A tela inicial depende das permissões (`lib/telaInicial.ts`):
1. `setores.todos` → Visão geral.
2. Distribui e acompanha um setor → Painel do setor.
3. Quem só executa → Meus serviços.

Os modais seguem a convenção do projeto: um de cada vez, em etapas. São eles Distribuir, Explicar a pausa e Editar tarefa (a exclusão aparece no lugar do formulário).

---

## 9. Endpoints

Prefixo `/api/execucao/`. Os endpoints de setor recebem `?setor=<id>` e exigem que a pessoa **acompanhe** o setor (`servicos.ver_setor` nele).

| Bloco | Endpoint | Regra de acesso |
|---|---|---|
| Setores que acompanho, com contadores | `GET setores/` | `servicos.ver_setor` em algum setor. Traz `organiza` por setor. |
| Fila (novos e a distribuir) | `GET fila/?setor=` | Acompanha o setor. Filtros: `etapa`, `cliente`, `ordem_servico`, `prioridade`. |
| Em andamento (tarefas ativas) | `GET andamento/?setor=` | Acompanha o setor. Filtros: `responsavel`, `etapa`. |
| Alertas (atrasados e parados) | `GET alertas/?setor=` | Acompanha o setor. |
| Concluídos no período | `GET concluidos/?setor=&de=&ate=` | Acompanha o setor. O padrão é o mês atual. |
| Equipe e carga | `GET equipe/?setor=` | Acompanha o setor. É também a lista de responsáveis da distribuição. |
| Meus serviços e contadores | `GET meus-servicos/`, `GET meus-servicos/contadores/` | A própria pessoa. |
| Detalhe do serviço | `GET servicos/<id>/` | Quem vê o serviço. |
| Distribuir | `POST servicos/<id>/distribuir/` | `tarefas.distribuir` no setor do serviço. |
| Explicar a pausa | `POST servicos/<id>/ciencia/` | Quem tem tarefa no serviço ou acompanha o setor. |
| Confirmar recebimento de serviços | `POST servicos/recebimento/` | `tarefas.distribuir` no setor de cada serviço. |
| Confirmar recebimento de tarefas | `POST tarefas/recebimento/` | Só o responsável. |

As tarefas também têm o CRUD em `/api/ordens-servico/tarefas/`, com as regras da seção 4.4. A linha do tempo do serviço fica em `/api/ordens-servico/servicos/<id>/linha-do-tempo/`.

**Quem vê quais serviços e tarefas:**
- `os.ver_todas`: tudo.
- `servicos.ver_setor`: os serviços dos seus setores, mais os que ainda estão sem setor.
- Sempre: o que tem tarefa da própria pessoa.

---

## 10. Onde está no código

| Assunto | Arquivo |
|---|---|
| Blocos da execução, distribuição e ciência | `apps/ordens_servico/services/execucao.py` |
| Quem pode distribuir num setor | `apps/ordens_servico/services/distribuicao.py` |
| Serviço: status, prazo, rastreio, alerta e ciência | `apps/ordens_servico/models/servico.py` |
| Tarefa: datas, ciência e movimentação; quem pode ser responsável | `apps/ordens_servico/models/tarefa.py` |
| Quem vê o quê | `apps/ordens_servico/services/visibilidade.py` |
| Organizadores e quem recebe tarefas | `apps/organizacoes/models/setor.py` |
| Catálogo → setor e mover serviços em aberto | `apps/catalogo/services.py` |
| Endpoints | `apps/ordens_servico/views/execucao_views.py`, `views/tarefa_viewset.py` |
| Telas | Frontend: `src/features/execucao/` (páginas e modais), `src/lib/telaInicial.ts` |
