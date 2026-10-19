# 04. Financeiro

Este módulo cobre o que acontece do lado do financeiro:
- **quando** uma venda pode ser faturada;
- como o financeiro **encontra, confere e registra** o faturamento;
- como o sistema **garante** que nada concluído fique sem cobrança.

Ele também cobre os indicadores financeiros.

Pré-requisitos:
- [02. Vendas](02-vendas.md): a condição de pagamento.
- [03. Execução nos setores](03-execucao-nos-setores.md): a conclusão dos serviços.

Decisões de origem:
- ADR 0007: papel do sistema no faturamento.
- ADR 0008: controle financeiro.
- ADR 0010: notificações.
- `docs/faturamento/03-revisao-a-vista-e-parcelado.md` e `docs/faturamento/04-proposta-ux-financeiro.md`.

---

## 1. O papel do sistema no faturamento

O sistema **não é o sistema financeiro**. A nota fiscal, o boleto e o controle das parcelas ficam num sistema externo (Asaas, Conta Azul ou SOC; a confirmar). Aqui, o sistema faz quatro coisas:

1. **Registra** a condição combinada na venda: valor, à vista ou parcelado, vencimento, forma, contato da nota e observações.
2. **Libera** a venda para faturar no momento certo, na venda ou na conclusão dos serviços, e **avisa** o financeiro.
3. **Entrega** ao financeiro tudo o que ele precisa para lançar no sistema externo, num lugar só.
4. **Guarda o "check"**: a OS foi lançada, com a referência (nota fiscal ou código), a data e quem lançou.

A cobrança é **por OS**: uma venda gera um lançamento, mesmo com vários serviços de vários setores. O sistema **não gerencia parcelas**; no parcelado, ele só informa a quantidade, o valor de cada parcela e os vencimentos combinados.

---

## 2. As três situações de uma venda

Toda venda está em uma, e só uma, destas situações:

```
              liberar na venda ───────────────┐
                                              ▼
 Venda ──▶ PREVISÃO (Em execução) ──último serviço concluído──▶ A FATURAR (Para faturar) ──lançamento──▶ FATURADA
          ainda não liberada                                    liberada, sem lançamento               lançada no sistema externo
```

| Situação | Regra | Nome na tela |
|---|---|---|
| **Previsão** | Ainda não liberada e não faturada. Vendas canceladas ficam de fora. | Em execução |
| **A faturar** | Liberada e ainda sem lançamento. É a **fila do financeiro**. | Para faturar |
| **Faturada** | O lançamento foi registrado. | Faturadas |

### 2.1 Liberação

| "Liberar em" (escolhido na venda) | Quando libera | Data e "liberada por" |
|---|---|---|
| **Na venda** | Ao registrar a venda. | O momento do registro e o vendedor. |
| **Quando todos os serviços terminarem** | Quando o **último serviço ativo** termina, de qualquer setor. Os cancelados não contam. | A data de término desse serviço e quem o terminou. |

- A liberação é **automática**: não existe botão de liberar.
- Uma OS liberada **não volta** a ser não liberada, mesmo se um serviço for reaberto ou acrescentado. A Conferência aponta essas mudanças (seção 5).
- Ao liberar, quem tem `financeiro.registrar_cobranca` recebe o **e-mail de liberação**. Quando houve execução, o e-mail traz o resumo: dias da venda à liberação, média de dias por serviço, quem trabalhou e, por tarefa, recebeu, início, término, dias parada e dias em execução (ADR 0010).

### 2.2 Lançamento (o "check")

| Regra | Comportamento |
|---|---|
| Quem registra | `financeiro.registrar_cobranca`. Essa permissão exige `financeiro.ver_valores` na mesma função. |
| Pré-condição | A OS precisa estar **liberada**. Se não estiver, a API recusa com 400. |
| Dados | **Referência do lançamento** (número da NF ou código no sistema externo, opcional) e **data** (na tela, o padrão é hoje). O sistema grava também quem registrou e a origem: **manual**, ou **integração** quando houver. |
| Onde | Só pelo endpoint de cobrança. A edição da venda não mexe nesses campos. |
| Desfazer | **Não há** como desfazer o lançamento pela API ou pelas telas. |
| Aviso | O **vendedor** (quem registrou a venda) recebe o e-mail "OS faturada". Se o próprio vendedor registrar, não recebe (ADR 0010). |

### 2.3 Alerta de espera

Uma OS **a faturar** há `DIAS_ALERTA_SEM_LANCAMENTO` dias (3) ou mais fica **em alerta**. Ela aparece:
- destacada em Cobranças;
- no contador de alertas da tela;
- na Conferência ("Liberada há 3 dias ou mais sem faturar");
- no **resumo diário** por e-mail de quem tem `financeiro.registrar_cobranca`.

---

## 3. Quem pode o quê

| Ação | Permissão |
|---|---|
| Ver Cobranças e a Conferência do faturamento | `financeiro.registrar_cobranca` **e** `financeiro.ver_valores` |
| Registrar o lançamento (Faturar) | `financeiro.registrar_cobranca` |
| Rodar "Corrigir agora" na Conferência | `financeiro.registrar_cobranca` **e** `financeiro.ver_valores` |
| Ver o Resumo para faturar de uma OS | `financeiro.ver_valores` |
| Ver valores e condição em qualquer tela (Vendas, Resumo da venda) | `financeiro.ver_valores`; sem ela, esses campos não vêm na API |
| Ver o Painel financeiro (indicadores) | `financeiro.ver_valores` |

Sem `financeiro.ver_valores`, o valor, a condição de pagamento e a observação da venda **somem de todas as telas**. A observação da venda é de pagamento e faturamento, por isso fica com os valores.

---

## 4. Fluxo básico

### 4.1 O dia a dia

1. O financeiro recebe o **e-mail de liberação**, ou vê o **resumo diário** com as OS em espera.
2. Abre **Cobranças → Para faturar**. A fila vem com as liberadas há mais tempo primeiro.
3. Escolhe a OS e clica em **Faturar**. O modal tem duas etapas:
   1. **Conferir todos os dados:**
      - por que está liberada, mais os avisos da conferência;
      - o cliente: razão social, CNPJ ou CPF, representante, e-mail e telefone;
      - a venda: OS, data, vendedor e liberação;
      - a condição: valor, tipo, parcelas, vencimento, demais parcelas, forma, e para quem e para qual e-mail enviar a nota;
      - os serviços realizados, com quem executou e quem finalizou.

      Cada dado que entra no lançamento tem o botão **copiar**, e há "copiar tudo".
   2. **Registrar o lançamento:** referência ou NF (opcional) e data (padrão: hoje).
4. Faz o lançamento no **sistema externo** com os dados copiados.
5. A OS passa para **Faturadas**, e o vendedor recebe o aviso.

### 4.2 Antecipar o que vem (Em execução)

A aba **Em execução** mostra as vendas ainda não liberadas, **as mais perto de liberar primeiro** (maior parte dos serviços concluída). Para cada uma, mostra **o que falta**: o serviço, o setor, a etapa, com quem está e há quantos dias está parado. Assim o financeiro sabe a quem perguntar sem abrir a execução.

### 4.3 Conferir que nada ficou para trás

A **Conferência do faturamento** (seção 5) roda na hora em que é aberta. O resumo dela aparece como um item pequeno no cabeçalho de Cobranças (um ponto colorido e a contagem; ao abrir, as verificações com problema, "Verificar de novo" e o atalho para a conferência), e as OS com pendência ganham o filtro **"Precisa de atenção"**.

### 4.4 OS operacionais (19/10/2026)

As **OS operacionais que geram cobrança** (regra do catálogo operacional, ADR 0011) entram nas mesmas abas de Cobranças, junto das vendas:

- **Em execução:** gera cobrança e ainda não foi finalizada;
- **Para faturar:** finalizada e liberada (a liberação é automática ao finalizar);
- **Faturadas:** com o lançamento registrado.

A OS operacional **não tem valor, condição nem vencimento** no sistema: o valor é definido no lançamento. Para faturar, o financeiro abre "Faturar a OS operacional", confere o cliente, o que cobrar (item do catálogo, quantidade e descrição), a execução e a regra de cobrança aplicada, lança no sistema financeiro e registra aqui a **referência** (opcional) e a **data do lançamento** (padrão: hoje). As cobranças anteriores a 19/10/2026 guardavam só a NF (`numero_nf`); ela aparece como referência ("NF 123"), e a NF "0" conta como não informada.

---

## 5. Conferência do faturamento

São verificações calculadas na hora da consulta, sem agendamento. Há dois tipos:

- **Garantias:** as regras da liberação. **Devem dar sempre 0.** Se derem mais, é dado fora de sincronia (ex.: uma atualização em massa que pulou a regra). O botão **"Corrigir agora"** refaz a sincronização das vendas não liberadas, só com o que a regra já manda, e cada mudança fica na auditoria.
- **Atenções:** pontos em que a liberação depende de alguém, ou em que algo mudou depois.

| Tipo | Verificação | Quando aparece | Situação |
|---|---|---|---|
| Garantia | Toda OS com os serviços concluídos está liberada | "Liberar na conclusão", todos os serviços ativos concluídos e a OS não liberada. | Em execução |
| Garantia | Toda OS com liberação na venda está liberada | "Liberar na venda" e a OS não liberada. | Em execução |
| Garantia | Todo serviço está no status que as tarefas indicam | O status gravado é diferente do que as tarefas mandam. | Em execução |
| Atenção | Trabalho concluído, OS sem liberar | Há serviço concluído há `DIAS_CONFERENCIA_CONCLUIDO_OS_PARADA` dias (15) ou mais, e o que falta está sem andamento há 7 ou mais. Talvez alguém não tenha concluído no sistema. | Em execução |
| Atenção | Serviço sem distribuir há 3 dias ou mais | Chegou ao setor e ninguém distribuiu (`DIAS_CONFERENCIA_SEM_DISTRIBUIR`). | Em execução |
| Atenção | Vencimento chegando sem liberação | O vencimento combinado é em até `DIAS_CONFERENCIA_VENCIMENTO` dias (7) ou já passou, e a OS ainda está em execução. | Em execução |
| Atenção | Liberada há 3 dias ou mais sem faturar | Está na fila do financeiro há tempo demais. | Para faturar |
| Atenção | Mudou depois da liberação | Serviço acrescentado, cancelado ou excluído, ou valor e condição alterados, depois da liberação. Confira antes de faturar. | Para faturar |
| Atenção | Mudou depois de faturada | Algo mudou depois do lançamento (alterações dos últimos 90 dias): ajuste no sistema financeiro. | Faturadas |
| Garantia | Toda OS operacional finalizada que gera cobrança está liberada | Finalizada, gera cobrança e sem liberação. "Corrigir agora" libera. | Em execução |
| Atenção | OS operacional liberada há 3 dias ou mais sem faturar | Está na fila do financeiro há tempo demais. | Para faturar |
| Atenção | OS operacional faturada sem referência do lançamento | Marcada como cobrada sem NF nem código do lançamento (ou com a NF "0"). | Faturadas |

Cada item traz:
- a OS (ou a OS operacional) e o cliente;
- o serviço e o setor, quando o problema é de um serviço;
- **com quem está**: os responsáveis das tarefas que faltam;
- o detalhe (ex.: "Chegou ao setor há 5 dias", "Valor ou condição de pagamento alterados por Fulano em 10/10/2026").

As mesmas verificações aparecem no **Resumo para faturar** de cada OS. O comando `python manage.py conferir_faturamento` (com `--corrigir` para refazer a sincronização) faz a mesma conferência pelo terminal.

---

## 6. Telas

O menu mostra **Cobranças** para quem tem `financeiro.registrar_cobranca` e **Painel financeiro** para quem tem `financeiro.ver_valores`. Quem tem `financeiro.registrar_cobranca` cai em Cobranças ao entrar, a menos que tenha uma tela inicial de prioridade maior (`lib/telaInicial.ts`).

| Tela | Rota | O que mostra e faz |
|---|---|---|
| **Cobranças** | `/cobrancas` | Vendas e OS operacionais juntas. Abas pelas situações, sem sobreposição: **Para faturar** (padrão, a fila), **Em execução** (com o que falta) e **Faturadas** (por mês). A coluna **Origem** diz se é venda ou OS operacional, e o seletor **Todas · Vendas · OS operacionais** filtra. "O que cobrar" mostra quantos serviços tem a venda ou o item do catálogo da OS operacional (com a quantidade); o que não se aplica à OS operacional (valor, condição, vencimento, vendedor) aparece como "—" ou "Definido no lançamento". O total da aba separa as vendas (quantidade e valor) das OS operacionais (quantidade). No cabeçalho fica o item pequeno da Conferência. Filtros: "Precisa de atenção", cliente, condição, vendedor, liberação (na venda, serviços concluídos ou OS operacional finalizada), data e vencimento. Ações: Faturar, abrir o resumo para faturar e abrir a venda. |
| **Faturar** (modal) | dentro de Cobranças e do Resumo | As duas etapas da seção 4.1. |
| **Faturar a OS operacional** (modal) | dentro de Cobranças, do resumo da OS operacional e da lista de OS operacionais | Um modal só: a regra de cobrança e a liberação, o cliente e o que cobrar (com copiar) e o lançamento (referência e data). |
| **Resumo da OS operacional** | `/cobrancas/operacionais/:id` | A regra de cobrança, as pendências da conferência, "Para lançar no sistema financeiro" (com copiar), o que cobrar, o lançamento e o histórico (criada, iniciada, finalizada, liberada e faturada). |
| **Resumo para faturar** | `/cobrancas/:id` | Tudo da OS num lugar só: uma faixa explicando por que está (ou não) liberada; as pendências da conferência; o bloco "Para lançar no sistema financeiro" com copiar; o lançamento; os serviços realizados (setor, quem executou, início, término e quem finalizou); e o histórico, com o filtro "Financeiro \| Tudo" que separa os eventos financeiros dos de execução. |
| **Conferência do faturamento** | `/cobrancas/conferencia` | Cada verificação com o estado (ok, atenção ou falha de garantia), a contagem e, aberta, as vendas com o detalhe e com quem está. Tem o botão "Corrigir agora". |
| **Painel financeiro** | `/analise/financeiro` | Indicadores: Faturado, A faturar (liberadas sem lançamento), Previsão (ainda não liberadas) e Ticket médio. Também mostra os mesmos totais por tipo de condição (à vista e parcelado), vendas por mês e clientes. |

---

## 7. Endpoints

| Ação | Endpoint | Acesso |
|---|---|---|
| Cobranças | `GET /api/financeiro/cobrancas/?situacao=` (`a_faturar`, que é o padrão, `previsao`, `faturadas` ou `todas`) | `registrar_cobranca` + `ver_valores` |
| Resumo para faturar | `GET /api/financeiro/ordens/<id>/` | `ver_valores` |
| Resumo da OS operacional | `GET /api/financeiro/operacionais/<id>/` | `registrar_cobranca` + `ver_valores` |
| Registrar o lançamento da OS operacional | `PATCH /api/ordens-servico/operacionais/<id>/cobranca/` (`referencia_lancamento`, `data_cobranca`; `numero_nf` só por compatibilidade) | `registrar_cobranca`. 400 se não gerar cobrança ou não estiver liberada. |
| Conferência | `GET /api/financeiro/conferencia/` | `registrar_cobranca` + `ver_valores` |
| Corrigir a sincronização | `POST /api/financeiro/conferencia/corrigir/` | `registrar_cobranca` + `ver_valores` |
| Registrar o lançamento | `PATCH /api/ordens-servico/ordens/<id>/cobranca/` (`referencia_lancamento`, `data_cobranca`) | `registrar_cobranca`. 400 se a OS não estiver liberada. |
| Situação de liberação | `GET /api/ordens-servico/ordens/<id>/liberada-cobranca/` | Quem vê a OS |
| Indicadores financeiros | `GET /api/analise/financeiro/` | `ver_valores` |

Filtros de Cobranças:
- `cliente`, `de` e `ate` (data da venda), `tipo_condicao`, `forma_pagamento`;
- `em_alerta=true`;
- `faturada_de` e `faturada_ate` (data do lançamento; limita só as faturadas).

A resposta traz os **contadores das três situações** (quantidade e valor) sob os mesmos filtros, o número de OS em alerta, o que falta em cada OS da previsão (`pendentes`) e os códigos da conferência de cada OS (`pendencias`). Em `operacionais` vêm as OS operacionais que geram cobrança, com `contadores_operacionais` (só quantidade) e `operacionais_em_alerta`. Para elas, `de` e `ate` valem sobre a data de recebimento, e `tipo_condicao` ou `forma_pagamento` deixam a lista vazia (são da venda).

---

## 8. Onde está no código

| Assunto | Arquivo |
|---|---|
| Liberação, lançamento e resumo da condição | `apps/ordens_servico/models/ordem_servico.py` |
| Situações, fila, alerta e resumo para faturar | `apps/ordens_servico/services/financeiro.py` |
| OS operacionais nas Cobranças | `apps/ordens_servico/services/cobranca_operacional.py` |
| Conferência do faturamento e correção | `apps/ordens_servico/services/conferencia.py`, comando `conferir_faturamento` |
| E-mails de liberação, faturada e resumo diário | `apps/ordens_servico/emails.py`, `services/resumo_diario.py` |
| Endpoints | `apps/ordens_servico/views/financeiro_views.py`; lançamento em `views/ordem_servico_viewset.py` |
| Indicadores | `apps/analise/services/financeiro.py` |
| Telas | Frontend: `src/features/financeiro/` (Cobranças, Faturar, Resumo para faturar, Conferência), `src/features/analytics/pages/FinanceiroPage.tsx` |
