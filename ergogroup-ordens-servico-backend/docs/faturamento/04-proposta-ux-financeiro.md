# 04 — UX/UI do financeiro: resumo para faturar, lista de Cobranças e conferência

> **Status: APROVADO E IMPLEMENTADO (14/10/2026).** O usuário aprovou o wireframe
> (`ergogroup-ordens-servico-frontend/docs/ui/wireframes/lote5-financeiro.html`) e decidiu as perguntas da seção 6.
> A implementação está na seção 8. As seções 2 a 5 ficam como registro da análise e da proposta. Onde a decisão
> mudou a proposta (sem campo novo, sem e-mail, sem selo na execução), vale a seção 6.
> Base: ADR 0007, ADR 0008 (seções 3, 4 e 9), `faturamento/03` e o código da `v3`.

## 1. As três queixas do financeiro

1. **Resumo completo da OS para faturar.** Ao faturar, o financeiro precisa ver num lugar só:
   - a informação financeira e a condição de pagamento;
   - os serviços realizados, quem os realizou, quando e quem finalizou cada um;
   - se a liberação foi imediata, já na venda.
2. **Lista de Cobranças padronizada e intuitiva**, no padrão `DataTable` das outras listagens. Ela precisa mostrar com clareza:
   - o que ainda vai ficar para faturar (previsão);
   - o que já está liberado;
   - o que já foi faturado.
3. **Medo de que algo concluído nunca chegue à cobrança.** Por exemplo:
   - alguém não finaliza o serviço no sistema;
   - ninguém libera a OS;
   - o financeiro não cobra.

## 2. Diagnóstico: como funciona hoje

### 2.1 Backend

**Liberação** (`models/ordem_servico.py`, `sincronizar_status_e_cobranca`):
- `liberar_em = venda`: a OS nasce liberada no `save()`. Ficam gravados `liberada_para_cobranca_em = agora` e `liberada_para_cobranca_por = criado_por`, e sai o e-mail para quem tem `financeiro.registrar_cobranca`.
- `liberar_em = conclusao`: a OS libera quando todos os serviços não cancelados estão concluídos. A data e a pessoa vêm do **último serviço concluído** (`data_termino` e `terminado_por`).
- **A liberação nunca é desfeita.** Se uma tarefa for reaberta, a OS volta a "em andamento", mas continua liberada.

**Cadeia que leva à liberação** (`models/tarefa.py` → `models/servico.py` → OS):
- tarefa salva → `servico.sincronizar_status_e_rastreio()` → `ordem.sincronizar_status_e_cobranca()`;
- o serviço só conclui quando **todas** as tarefas estão concluídas (`tarefas.exclude(status='concluida')`);
- serviço sem tarefa fica `aberto` para sempre.

**Pontos em que algo concluído pode não chegar à cobrança.** São a origem real do medo do financeiro:

| # | Situação | Por quê | Hoje alguém vê? |
|---|---|---|---|
| G1 | Trabalho feito, mas a tarefa não foi concluída no sistema | A liberação depende do clique de "Concluir" | Só como "sem movimentação" no painel do setor (ADR 0008, 3), não para o financeiro |
| G2 | Serviço vendido que ninguém distribuiu (sem tarefa) | Serviço sem tarefa nunca conclui | Só no painel do setor ("Novos" ou "A distribuir") |
| G3 | **Tarefa cancelada trava o serviço** | `todos_concluidos = not tarefas.exclude(status='concluida').exists()` conta a tarefa cancelada como pendente. Um serviço com uma tarefa cancelada e as demais concluídas nunca conclui, e a OS nunca libera | Ninguém. *Leitura do código; a confirmar com um teste.* O serviço **cancelado** já é ignorado na OS (decidido em 13/10/2026); a tarefa cancelada, não |
| G4 | Serviço acrescentado a uma OS já liberada ou já faturada | A liberação não volta atrás e o lançamento não é reaberto | Ninguém; nada avisa o financeiro |
| G5 | Valor ou condição alterados depois do lançamento | Não há trava nem aviso | Só na linha do tempo da OS |
| G6 | Atualizações em massa que pulam o `save()` (ex.: `migrar_dados_legado`, `QuerySet.update`) | A sincronização só roda no `save()` da tarefa ou do serviço | Ninguém |
| G7 | Vencimento combinado chegando ou vencido com a OS ainda em execução | A condição foi registrada, mas nada cruza o vencimento com a liberação | Ninguém |
| G8 | Liberada e não faturada | — | **Sim:** alerta de 3 dias (`DIAS_ALERTA_SEM_LANCAMENTO`) |

Ou seja: o sistema garante a passagem "concluído → liberado" **quando o dado está certo**. O que ele não mostra é quando o dado não reflete a realidade (G1, G2), as falhas de regra (G3), o que mudou depois (G4, G5) e o descompasso com o vencimento (G7). É por isso que o financeiro não confia.

**Endpoints atuais** (`views/financeiro_views.py`, `services/financeiro.py`):
- `GET /api/financeiro/cobrancas/?situacao=a_faturar|faturadas|previsao&cliente&de&ate&tipo_condicao&forma_pagamento&em_alerta`:
  - devolve **uma situação por chamada**, com os contadores das três e o número em alerta;
  - exige `financeiro.registrar_cobranca` + `financeiro.ver_valores`;
  - cada linha traz condição, vencimento, contato da NF, liberação, lançamento, dias aguardando, alerta e andamento.
- `GET /api/financeiro/ordens/{id}/` (situação financeira):
  - a linha acima, mais a observação;
  - `servicos` com **só** `id`, `descricao`, `etapa` e `data_termino`. Faltam o setor, quem executou, o início e quem finalizou;
  - `eventos`: só venda, liberação e lançamento, montados dos campos da OS.
- `PATCH /api/ordens-servico/ordens/{id}/cobranca/` (registrar o lançamento): referência e data.
- `GET /api/ordens-servico/ordens/{id}/linha-do-tempo/` existe, completa (fase 11), mas a tela financeira não a usa.
- O **resumo da venda** do comercial (`services/comercial.py`, `resumo_da_venda`) **já monta** por serviço tudo o que falta ao financeiro: `catalogo_nome`, `setor_nome`, `etapa`, `prazo`, `data_inicio`, `data_termino`, `terminado_por_nome` e `responsaveis` (nome, status, início e término de cada tarefa).

### 2.2 Frontend (`src/features/financeiro`)

**Cobranças** (`pages/CobrancasPage.tsx`):
- três **cards indicadores** (A faturar · Previsão · Faturadas) servem de abas;
- faixa amarela "N vendas liberadas há 3 dias ou mais", filtros em dropdown (`BarraDeFiltros`) e uma `TabelaAgrupada` herdada da execução;
- **destoa** de Vendas, Painel do setor e Meus serviços, que usam `DataTable`. Faltam busca, ordenação por coluna, paginação, escolha de colunas, estado da URL no padrão `?view=`/`f.` e o total da lista;
- células com duas informações, contra a regra "uma informação por coluna":
  - Condição = badge + resumo + forma;
  - Liberada = data + motivo + pessoa;
  - NF para = nome + e-mail;
  - Lançamento = referência + data + pessoa + origem;
- na **Previsão** só aparecem o andamento ("2 de 3") e "Libera: na conclusão". Não diz **o que falta** nem **com quem está**, que é justamente a pergunta do financeiro;
- o vencimento não aparece em coluna própria (vem no meio do `condicao_resumo`);
- `DIAS_ALERTA = 3` está fixo no frontend, duplicando a configuração do backend.

**Situação financeira** (`pages/SituacaoFinanceiraPage.tsx`, `/cobrancas/:id`):
- blocos "Para lançar no sistema financeiro", "Eventos financeiros", "Liberação", "Lançamento" e "Serviços";
- os serviços mostram só a descrição, a etapa e o término. Não aparecem o setor, quem executou nem quem finalizou;
- a liberação na venda aparece só como o texto "Motivo: Na venda", na coluna lateral. Não se destaca, e não avisa que os serviços podem ainda estar em execução;
- para ver quem fez o quê, o financeiro precisa abrir o "Resumo da venda" (e precisa de `os.gerenciar`/`os.ver_todas` para isso).

## 3. Proposta para a queixa 1: "Resumo para faturar" (`/cobrancas/:id`)

A página de situação financeira vira o **Resumo para faturar**. Na ordem de leitura do financeiro:

1. **Cabeçalho:**
   - cliente, OS, vendida em X por Fulano (nome completo);
   - badge da situação;
   - ação principal **Faturar** (só em "Para faturar");
   - menu ⋯: Resumo da venda, Copiar resumo e Imprimir.
2. **Faixa da liberação**, sempre visível, com o tom pela situação:
   - **liberação imediata** (na venda):
     - texto: "Liberada na venda em 10/10/2026 por Ana Martins. Liberação imediata: pode faturar antes de os serviços terminarem";
     - mais o andamento: "1 de 3 serviços concluídos";
     - é o caso que hoje passa despercebido;
   - **na conclusão**: "Liberada em 12/10/2026, quando o último serviço foi concluído (PCMSO, por Rafael Lima)";
   - **previsão**:
     - texto: "Ainda não liberada. Libera quando os 3 serviços terminarem: falta 1 (PGR, Segurança do Trabalho, com Carlos Paiva, sem andamento há 9 dias)";
     - se houver pendência da conferência (seção 5), ela aparece aqui.
3. **Para lançar no sistema financeiro** (o bloco de hoje, com mais estrutura):
   - valor total; parcelas (6 × R$ 1.583,33, mensais); vencimento (ou da 1ª parcela); demais parcelas; forma; enviar NF para (nome e e-mail separados);
   - **botão de copiar em cada valor**, porque o financeiro redigita tudo no outro sistema;
   - a observação de pagamento e faturamento logo abaixo, destacada.
4. **Serviços realizados**, uma tabela com uma informação por coluna:

   | Serviço | Setor | Executado por | Início | Término | Finalizado por | Etapa |
   |---|---|---|---|---|---|---|
   | PGR (o que será feito embaixo) | Segurança do Trabalho | Carlos Paiva (+1) | 02/10 | 09/10 | Carlos Paiva | Concluído |

   - "Executado por" lista os responsáveis das tarefas, com nome completo. Com mais de um: o primeiro e "+N", e ao clicar aparece cada tarefa com responsável, início e término;
   - "Finalizado por" é o `terminado_por` do serviço;
   - serviço cancelado fica riscado, com "não entra na liberação".
5. **Histórico**: a linha do tempo completa da OS (`linha-do-tempo/`), com o filtro **Financeiro | Tudo**. "Financeiro" mostra venda, liberação, lançamento e alterações de valor ou condição; "Tudo" mostra também a execução.
6. **Faturar** abre um **modal em duas etapas** (nunca empilhado):
   1. **Conferir:** valor, condição, vencimento, NF para e os avisos (ex.: "a OS mudou depois da liberação"), com "Está certo, continuar";
   2. **Registrar:** referência do lançamento e data (padrão: hoje).

**Backend (proposta):**
- `GET /api/financeiro/ordens/{id}/`: `servicos` passa a trazer o mesmo formato do resumo da venda (reaproveitar `_responsaveis` e a consulta de `resumo_da_venda`):
  - `catalogo_nome`, `setor_nome`, `prazo`, `data_inicio`, `data_termino`, `terminado_por_nome`;
  - `responsaveis[]` (nome, status, início e término da tarefa);
  - `ultima_movimentacao_em` e `em_alerta_sem_movimentacao`.
- Campo novo **`motivo_liberacao`** (`venda` | `conclusao`), gravado no momento da liberação:
  - hoje o motivo é deduzido de `liberar_em`, que pode ser editado depois da liberação;
  - uma alteração de schema, mais uma migração de dados separada que preenche os existentes a partir de `liberar_em`;
  - *alternativa sem schema:* deduzir da auditoria. É mais caro e mais frágil.
- Campo calculado **`liberacao_imediata`** (bool) = `motivo_liberacao == venda`, para a faixa e para a lista.
- `eventos` passa a vir da linha do tempo (`linha_do_tempo_da_os`), com `categoria` (`financeiro` | `execucao`) para o filtro. O `_eventos_financeiros` atual sai.
- `pendencias[]`: as pendências da conferência (seção 5) que valem para esta OS.

## 4. Proposta para a queixa 2: lista de Cobranças no padrão `DataTable`

### 4.1 Estrutura

- **Sai:** os cards indicadores, a `TabelaAgrupada` e a `BarraDeFiltros`.
- **Entra:** o `DataTable`, como em Vendas e no Painel do setor (§6.2.6 do frontend).
- **Abas = situações, sem sobreposição, na ordem do fluxo:**

  **Em execução (previsão)** → **Para faturar** (padrão) → **Faturadas**

  - Cada aba mostra a quantidade e a soma do valor (ex.: "Para faturar 12 · R$ 48.300,00").
  - Cada OS está em uma aba só; as três somam o total de vendas não canceladas.
  - A ordem segue o caminho da OS (vai faturar → liberada → faturada), e a aba padrão é a fila de trabalho.
  - **Nomes propostos:**
    - "Previsão" vira **"Em execução"**, que diz por que ainda não dá para faturar. O subtítulo da aba mantém "previsão";
    - "A faturar" vira **"Para faturar"**.

    Os nomes continuam provisórios (ADR 0007, 4).
- **Faixa da conferência** no topo, em uma linha:
  - "Conferência do faturamento: 3 pontos para olhar · verificado hoje às 07:00 · **Abrir conferência**";
  - verde quando está tudo certo: "Tudo conferido: todo serviço concluído está numa OS liberada ou em execução".

  Substitui a faixa amarela atual (seção 5).
- **Filtro "Precisa de atenção"** (dropdown, como no painel do setor), que cruza com qualquer aba:
  - Em execução:
    - **Trabalho concluído, OS parada** (G1);
    - **Serviço sem distribuir há 3+ dias** (G2);
    - **Travada por tarefa cancelada** (G3);
    - **Vencimento chegando** (G7: vencimento combinado em até 7 dias ou já passado);
  - Para faturar:
    - **Aguardando há 3+ dias** (G8);
    - **Mudou depois da liberação** (G4, G5);
  - Faturadas: **Mudou depois de faturada** (G4, G5).
- **Busca:** cliente, nº da OS e referência do lançamento.
- **Filtros facetados:** Cliente, Condição (à vista ou parcelado), Forma, Vendido por e Liberação (imediata ou na conclusão).
- **Data, por aba:**
  - Em execução: Venda ou Vencimento;
  - Para faturar: Liberação ou Vencimento;
  - Faturadas: **navegação por mês**, "‹ Outubro de 2026 › · Ver todo o período", pela data do faturamento, como os concluídos do painel.
- **Rodapé:** "12 OS · R$ 48.300,00 no filtro", a soma do que está na tela.
- Busca, aba, filtros, ordem, página e mês ficam na URL (`?view=`, `f.<filtro>=`, `?mes=`), como nas outras listagens.

### 4.2 Colunas por aba (uma informação por coluna)

| Aba | Colunas | Ordem padrão |
|---|---|---|
| Em execução | OS · Cliente · Valor · Condição · Vencimento · Andamento ("2 de 3") · **Falta** (o serviço que falta, com o setor; "+1" se houver mais) · **Com quem** (responsável, nome completo, ou "Sem distribuir") · **Sem andamento há** · Ações | Mais perto de liberar primeiro (como hoje); com "Precisa de atenção", a mais antiga primeiro |
| Para faturar | OS · Cliente · Valor · Condição · Vencimento · Liberada em · **Liberação** (badge "Imediata" ou "Serviços concluídos") · Aguardando (amarelo a partir de 3 dias) · Ações | Liberada há mais tempo primeiro (como hoje) |
| Faturadas | OS · Cliente · Valor · Condição · Referência · Faturada em · Faturada por · Ações | Mais recente primeiro (como hoje) |

- **Condição:** só o badge (À vista / Parcelado 6x). O texto completo vai no `title` e no resumo.
- **Vencimento:** coluna própria ("10/11/2026" ou "21 dias após a nota"), em amarelo quando está a 7 dias ou menos, ou já passou, e a OS não está faturada.
- **Opcionais (menu Colunas, P2):** Vendido por, Data da venda, Forma, NF para e Origem do lançamento.
- **Ações** (coluna com cabeçalho e largura fixa, como na execução):
  - Para faturar: **Faturar**, botão de contorno com ícone, que abre o modal em duas etapas;
  - todas as abas: menu **⋯** com Abrir resumo para faturar, Abrir a venda e Copiar dados para o lançamento;
  - clicar na linha abre o resumo.

### 4.3 Backend (proposta)

O `DataTable` filtra e pagina no cliente (como em Vendas). Por isso:
- `GET /api/financeiro/cobrancas/?situacao=todas` (ou um endpoint `.../cobrancas/lista/`) devolve as linhas das três situações numa chamada;
  - as faturadas são limitadas pelo mês (`faturada_de`/`faturada_ate`), para a lista não crescer sem fim;
  - os contadores continuam vindo do backend, porque os das faturadas valem para o período.
- Campos novos na linha:
  - `motivo_liberacao`, `liberacao_imediata`;
  - `vencimento` (data efetiva ou `null`) e `vencimento_resumo` (texto);
  - `pendentes[]`: os serviços que faltam, com `servico_id`, `catalogo_nome`, `setor_nome`, `etapa`, `responsavel_nome` e `dias_sem_movimentacao`;
  - `ultima_movimentacao_em` da OS (a mais recente dos serviços);
  - `pendencias[]`: os códigos da conferência (seção 5) que valem para a linha;
  - `alterada_apos_liberacao` / `alterada_apos_lancamento` (bool, da auditoria).
- `dias_alerta_sem_lancamento` vem na resposta, para o frontend parar de fixar o 3.
- Filtros novos: `busca`, `vendido_por`, `liberacao` (`imediata` | `conclusao`), `atencao=<código>`.

## 5. Proposta para a queixa 3: conferência do faturamento

### 5.1 Por que um relatório, e não só alertas

O financeiro não confia porque **não vê a garantia**. Alertas soltos só aparecem quando algo dá errado, e o silêncio pode ser "está tudo certo" ou "o sistema não percebeu". A confiança vem de três coisas:
1. **Ver a regra sendo checada**, com o resultado "0", de forma explícita e com data e hora. "Nenhum serviço concluído está fora de uma OS liberada ou em execução" é diferente de não dizer nada.
2. **Ver os pontos humanos** (G1, G2, G7) com nome e setor. O financeiro sabe com quem falar e para de depender de lembrar.
3. **Ver o que mudou depois** (G4, G5), que hoje é invisível e é o caso em que o financeiro realmente perde dinheiro.

### 5.2 A tela: `/cobrancas/conferencia`

Uma lista de verificações. Cada uma tem estado (✓ ok / ⚠ atenção), contagem, explicação curta do "por quê" e a lista das OS, com link para o resumo.

| Código | Verificação | Tipo | Regra |
|---|---|---|---|
| `sync_conclusao` | Toda OS com todos os serviços concluídos (ou cancelados) está liberada | Garantia (deve ser 0) | `status = concluida` e `liberada_para_cobranca = false` |
| `sync_venda` | Toda OS com liberação na venda está liberada | Garantia (deve ser 0) | `liberar_em = venda` e não liberada |
| `sync_servico` | Todo serviço com as tarefas concluídas está concluído | Garantia (deve ser 0) | Recalcula o status do serviço e compara (pega G6) |
| `tarefa_cancelada_trava` | Serviço travado por tarefa cancelada | Atenção | Tarefas só concluídas ou canceladas, com ao menos uma cancelada, e o serviço não concluído (G3) |
| `concluido_os_parada` | Trabalho concluído, OS sem liberar | Atenção | OS em execução com serviço concluído há 15+ dias e algum pendente sem andamento há 7+ dias (G1). *Os dois números são proposta.* |
| `sem_distribuir` | Serviço sem distribuir há 3+ dias | Atenção | Serviço `novo` ou `a_distribuir` há 3+ dias (G2) |
| `vencimento_chegando` | Vencimento chegando sem liberação | Atenção | `data_acordada_cobranca` ≤ hoje + 7 e OS não liberada (G7) |
| `aguardando_lancamento` | Liberada há 3+ dias sem faturar | Atenção | Já existe (G8) |
| `mudou_apos_liberacao` | Mudou depois da liberação | Atenção | Serviço acrescentado ou cancelado, valor ou condição alterados depois de `liberada_para_cobranca_em` (auditoria; G4, G5) |
| `mudou_apos_lancamento` | Mudou depois de faturada | Atenção | Igual, depois de `data_cobranca`; pede para ajustar no sistema externo |

- As **garantias** aparecem como ✓ verde com "0". Se uma delas ficar diferente de zero, é defeito do sistema: a tela mostra **"Corrigir agora"** (seção 5.3) e avisa o administrador.
- As **atenções** que dependem de outra área trazem **"Avisar o setor"**:
  - envia um e-mail aos organizadores do setor do serviço: "A venda X espera só o serviço Y para ser faturada";
  - pede confirmação antes de enviar;
  - fica na linha do tempo.
- Dar "ciente" numa atenção do financeiro: **fora desta proposta** por ora. As atenções somem quando o dado muda. Se fizer falta, segue o mesmo modelo da ciência do ADR 0008, 3.

### 5.3 Sincronização

- **Comando** `python manage.py conferir_faturamento`:
  - roda as verificações;
  - com `--corrigir`, chama `sincronizar_status_e_rastreio()` nos serviços e `sincronizar_status_e_cobranca()` nas OS não liberadas. É idempotente, só aplica o que a regra já manda e registra na auditoria com o motivo "conferência";
  - agendado **todo dia às 07:00**; daí o "verificado hoje às 07:00" da tela.
- **"Corrigir agora"** na tela: o mesmo `--corrigir`, para quem tem `financeiro.registrar_cobranca`.
- **E-mail semanal** (segunda, 08:00) para quem tem `financeiro.registrar_cobranca`, com o resumo da conferência ("3 pontos para olhar"). Só sai se houver algo.

### 5.4 Do lado da execução (proposta complementar)

O ponto fraco está na execução (G1, G2), então o aviso também deveria chegar lá:
- no detalhe do serviço e no Painel do setor, um selo **"Só falta este serviço para faturar a venda"** quando ele é o único pendente da OS;
- sem valores, então vale para quem não tem `financeiro.ver_valores`.

### 5.5 Backend (proposta)

- `GET /api/financeiro/conferencia/` → `{ verificado_em, verificacoes: [{ codigo, tipo: 'garantia'|'atencao', titulo, explicacao, quantidade, ordens: [{ ordem_servico_id, cliente_nome, servico_id?, setor_nome?, responsavel_nome?, detalhe }] }] }`. Exige `financeiro.registrar_cobranca` + `financeiro.ver_valores`.
- `POST /api/financeiro/conferencia/corrigir/`: roda a sincronização e devolve o resultado.
- `POST /api/financeiro/conferencia/avisar-setor/` (`servico_id`): e-mail aos organizadores.
- A lógica fica num `services/conferencia.py` novo dentro de `apps/ordens_servico` (sem app novo). As linhas de Cobranças e do resumo reaproveitam os mesmos códigos (`pendencias[]`).
- `verificado_em` é guardado na configuração do sistema ou num registro simples. *A definir na implementação.*

## 6. Decisões do usuário (14/10/2026)

1. **Tarefa cancelada (G3): deixa de contar** na conclusão do serviço, como o serviço cancelado na OS. O serviço
   conclui quando as tarefas não canceladas terminam. Só com tarefas canceladas, fica aberto e precisa ser
   distribuído de novo. **Decidido.**
2. **Nomes das abas: Em execução / Para faturar / Faturadas, começando por Para faturar**, que é a primeira e a
   padrão. **Decidido.** A situação financeira passou a se chamar assim em todo o app (Vendas também).
3. **Sem o campo `motivo_liberacao`.** A tela mostra o motivo pela regra: `liberar_em = venda` é a liberação na
   venda; senão, é a liberação na conclusão dos serviços. **Decidido.**
4. **Sem e-mails agora:** "Avisar o setor" e o e-mail semanal saem. As notificações serão tratadas depois, num
   sistema de notificações. **Também sem o selo** "Só falta este serviço para faturar" na execução. O foco é a tela
   de faturamento. **Decidido.**
5. **Wireframe aprovado**, com uma ressalva: a tabela segue o padrão atual do app (`DataTable` e o visual das
   tabelas das outras telas), e não o desenho do wireframe. **Decidido.**
6. Os limites (15, 3 e 7 dias) não foram discutidos. Ficaram como **configuração** (seção 8), com esses valores
   como padrão. *Continuam como proposta.*

## 7. Ordem de implementação sugerida (registro; implementada na seção 8)

1. Backend: `services/conferencia.py` + endpoint + comando (garantias e atenções). Teste do G3.
2. Backend: campos novos na linha de Cobranças e no resumo (`servicos` completos, `motivo_liberacao`, `pendentes`, `pendencias`).
3. Frontend: Cobranças no `DataTable`, com as abas, as colunas, "Precisa de atenção" e a faixa da conferência.
4. Frontend: Resumo para faturar e o modal "Faturar" em duas etapas.
5. Frontend: tela da conferência.
6. Atualizar `fluxos-e-navegacao.md` §6.7, `telas-blocos-e-endpoints.md` e o ADR 0008 (seção 9) com o que for aprovado.

## 8. Implementação (14/10/2026)

### 8.1 Backend
- **Regra da tarefa cancelada** (`models/servico.py`, `status_pelas_tarefas`):
  - a tarefa cancelada não conta: o serviço conclui quando as demais terminam;
  - só com tarefas canceladas, fica aberto; com uma em andamento, fica em andamento;
  - os serviços que já estavam travados só se corrigem quando algo mexe neles ou com "Corrigir agora". Até lá, a
    garantia `sync_servico` da conferência os mostra.
- **Linha do tempo:** a venda com liberação na venda ganhou o evento "OS liberada para o financeiro (na venda)".
- **Conferência** (`services/conferencia.py`, sem app novo):
  - `GET /api/financeiro/conferencia/` devolve as verificações da seção 5.2, calculadas na hora da consulta. Não
    há agendamento: `verificado_em` é o momento da consulta. Cada verificação traz:
    - `codigo`, `tipo` (`garantia` ou `atencao`) e `situacao`;
    - `titulo`, `explicacao` e `quantidade`;
    - `itens`: OS, cliente, serviço, setor, com quem e o detalhe;
  - as verificações:
    - garantias: `sync_conclusao`, `sync_venda` e `sync_servico`;
    - atenções: `concluido_os_parada`, `sem_distribuir`, `vencimento_chegando`, `aguardando_lancamento`,
      `mudou_apos_liberacao` e `mudou_apos_lancamento`;
    - a `tarefa_cancelada_trava` da proposta saiu: com a regra nova, o caso virou a garantia `sync_servico`;
  - "mudou depois" lê a auditoria dos últimos 90 dias. Conta serviço acrescentado, excluído ou cancelado, e valor
    ou condição alterados depois do registro da liberação (ou do lançamento). Há uma folga de 2 minutos para os
    serviços criados junto com a venda;
  - `POST /api/financeiro/conferencia/corrigir/` refaz a sincronização dos serviços e das OS ainda não liberadas.
    Devolve `servicos_corrigidos` e `ordens_liberadas`, e cada mudança fica na auditoria;
  - comando `python manage.py conferir_faturamento [--corrigir]`;
  - limites na configuração (`config/settings.py`; os valores são proposta):
    - `DIAS_CONFERENCIA_CONCLUIDO_OS_PARADA` (15);
    - `DIAS_CONFERENCIA_SEM_DISTRIBUIR` (3);
    - `DIAS_CONFERENCIA_VENCIMENTO` (7);
    - o "sem andamento" usa `DIAS_ALERTA_SEM_MOVIMENTACAO` (7), e a espera do lançamento usa
      `DIAS_ALERTA_SEM_LANCAMENTO` (3).
- **Cobranças** (`GET /api/financeiro/cobrancas/`):
  - `situacao=todas` devolve as três situações numa chamada, nesta ordem: para faturar, em execução e faturadas;
  - `faturada_de`/`faturada_ate` limitam as faturadas (e o contador delas) pela data do lançamento;
  - campos novos na linha:
    - `vencimento_resumo`;
    - `pendentes[]`, na previsão: serviço, setor, etapa, responsáveis e dias sem movimentação, o mais parado
      primeiro;
    - `ultima_movimentacao_em`;
    - `pendencias[]`: os códigos da conferência;
  - campo novo na resposta: `dias_alerta_sem_lancamento`.
- **Resumo para faturar** (`GET /api/financeiro/ordens/{id}/`):
  - `servicos[]` traz catálogo, setor, etapa, prazo, início, término, quem finalizou (`terminado_por_nome`) e
    `responsaveis[]` (uma linha por tarefa);
  - entra `detalhe_pendencias[]`;
  - `eventos[]` passa a ser a linha do tempo da OS, do mais recente ao mais antigo, com `categoria` (`financeiro`
    ou `execucao`).
- **Testes:** `apps/ordens_servico/tests_conferencia.py`, e um ajuste em `tests_financeiro.py` (eventos da linha do
  tempo).
- **Contrato da API** regenerado (`frontend/docs/api/api-schema.yaml`), com nomes fixos para os enums novos
  (`ENUM_NAME_OVERRIDES`).

### 8.2 Frontend
- **Cobranças** (`features/financeiro/pages/CobrancasPage.tsx`) no `DataTable`, como Vendas e o Painel do setor:
  - abas **Para faturar** (padrão) · **Em execução** · **Faturadas**:
    - Faturadas vai por mês, com a navegação de mês dos concluídos (`?mes=2026-10` ou `?mes=todo`);
    - ao lado das abas, a quantidade e o valor da aba;
  - colunas por aba (uma informação por coluna):
    - Para faturar: OS, Cliente, Valor, Condição, Vencimento, Liberada em, Liberação (Na venda / Serviços
      concluídos) e Aguardando;
    - Em execução: OS, Cliente, Valor, Condição, Vencimento, Andamento, Falta, Com quem e Sem andamento há;
    - Faturadas: OS, Cliente, Valor, Condição, Referência, Faturada em e Faturada por;
    - Vendido por e Forma ficam no menu Colunas;
  - filtros:
    - Precisa de atenção, com as verificações da aba;
    - Cliente, Condição e Vendido por;
    - Liberação, na aba Para faturar;
    - datas: Liberada em, Venda e Vencimento;
  - ação na linha: **Faturar** (ícone, como as ações das tabelas da execução) e o menu ⋯ (resumo e venda);
  - no topo, a faixa da conferência ("N pontos para olhar" ou "Tudo conferido"), com o link para a conferência.
- **Resumo para faturar** (`/cobrancas/:id`):
  - faixa da liberação: na venda, na conclusão ou o que falta;
  - as pendências da conferência;
  - "Para lançar no sistema financeiro", com copiar em cada dado e "Copiar tudo";
  - a observação de pagamento;
  - Lançamento e Histórico (Financeiro | Tudo);
  - Serviços realizados na largura toda (Serviço, Setor, Executado por, Início, Término, Finalizado por, Etapa),
    no visual das tabelas do Resumo da venda.
- **Faturar** em duas etapas (`components/FaturarModal.tsx`, substitui o `RegistrarLancamentoModal`):
  1. Conferir: valor, condição, forma, NF, observação e avisos;
  2. Registrar: referência e data.
- **Conferência do faturamento** (`/cobrancas/conferencia`, `pages/ConferenciaPage.tsx`):
  - três seções: garantias, atenções da execução e atenções de para faturar e faturadas;
  - cada verificação abre a sua lista;
  - ações: "Verificar de novo" e "Corrigir agora".
  - "Verificar de novo" roda uma **checagem animada** (pedido do usuário em 14/10/2026, para dar confiança):
    - um painel mostra cada etapa (buscar os dados, cada verificação e fechar o resultado), com barra de progresso,
      porcentagem e a contagem real de cada verificação ("ok" ou o número);
    - o ritmo é fixo (cerca de 0,4 s por etapa, uns 5 s no total), mesmo que o backend responda antes; se ele
      demorar, a animação espera a resposta;
    - no fim, aparece o resumo ("Checagem concluída às HH:MM:SS…") e os resultados voltam;
    - com o movimento reduzido do sistema operacional ligado, as etapas passam quase sem pausa.
- **Rótulos da situação financeira no kit:** Em execução · Para faturar · Faturada.

## 9. Faturar com todos os dados (aprovado e implementado em 14/10/2026)

> Wireframe aprovado pelo usuário: `ergogroup-ordens-servico-frontend/docs/ui/wireframes/lote6-faturar.html`.
> Implementado como descrito abaixo:
> - backend: bloco `cliente` em `GET /api/financeiro/ordens/{id}/`, com teste em `tests_conferencia.py`;
> - frontend: `features/financeiro/components/FaturarModal.tsx`, que recebe o id da OS e carrega o resumo para
>   faturar. Ele é aberto pela lista de Cobranças e pelo resumo.

**Pedido do usuário:** ao clicar em Faturar, o modal mostrava só um resumo simples (valor, condição, forma e NF)
antes de pedir a nota fiscal e a data. O financeiro precisa ver, **na hora de faturar, todos os dados disponíveis**:
- os dados do cliente;
- os dados dos serviços;
- quem executou e quem finalizou cada serviço.

**Proposta:** o modal Faturar continua com duas etapas (modais em etapas, nunca empilhados), mas a primeira etapa
traz tudo. O modal fica largo (cerca de 1040 px), com rolagem interna.

1. **Conferir todos os dados:**
   - **Faixa da liberação:** na venda (com o andamento dos serviços) ou na conclusão (com a data, quem finalizou o
     último serviço e há quantos dias está aguardando). Abaixo dela, os avisos da conferência (ex.: "Mudou depois da
     liberação");
   - **Cliente:**
     - razão social;
     - inscrição (CNPJ, CPF etc.) e tipo de cliente;
     - representante e setor dele;
     - e-mail e telefone;
     - situação (ativo ou inativo) e observação do cliente;
     - copiar em cada dado útil para o lançamento;
   - **Venda:** OS, data da venda, quem vendeu e quando foi liberada;
   - **Condição de pagamento:**
     - a condição combinada;
     - valor total, tipo, parcelas, vencimento (da 1ª) e demais;
     - forma de pagamento;
     - nome e e-mail para a NF;
     - a observação de pagamento;
     - copiar em cada dado e "Copiar tudo";
   - **Serviços realizados:** uma tabela no visual atual do app (cabeçalho em caixa alta e linhas verticais, como no
     Resumo da venda). As colunas:
     - Serviço (nome e o que será feito) e Setor;
     - **Executado por:** cada responsável com nome completo e as datas da tarefa ("12/10 → 14/10" ou "em
       andamento"), sem "+N";
     - Início e Término;
     - **Finalizado por**;
     - Etapa.

     O serviço cancelado aparece riscado;
   - botões: Cancelar · **Está tudo certo, continuar**.
2. **Registrar o lançamento:**
   - um resumo fixo no topo: cliente, inscrição, valor e condição;
   - número da nota fiscal ou referência (opcional) e data do lançamento (padrão: hoje);
   - botões: Voltar · **Registrar lançamento**.

**O que muda no backend (proposta):** o resumo para faturar (`GET /api/financeiro/ordens/{id}/`) ganha um bloco
`cliente` com:
- `nome`, `tipo_inscricao`, `numero_inscricao` e `tipo_cliente`;
- `nome_representante`, `setor_representante`, `email_representante` e `contato_representante`;
- `observacao` e `ativo`.

O modal, aberto pela lista de Cobranças ou pelo resumo, carrega esse endpoint (a linha da lista não traz tudo).
Os serviços já vêm com quem executou (`responsaveis[]`, com as datas de cada tarefa) e quem finalizou
(`terminado_por_nome`).
