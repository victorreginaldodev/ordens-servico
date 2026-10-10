# Faturamento — condições de pagamento (como está hoje)

Levantamento de 10/10/2026, ponto de partida da frente de faturamento. Fontes: código do backend (`apps/ordens_servico`, `apps/analise`, `apps/clientes`), código do frontend (`OrdemServicoFormPage.tsx`, `FaturamentoPage.tsx`, `OrdemComercialPanel.tsx`) e dados do banco de dev.

## Resumo

- **O sistema registra poucas condições de pagamento e usa quase nenhuma.** A única regra que realmente funciona é a liberação da cobrança: de uma vez só, na criação da OS ou quando todos os serviços terminam.
- **As condições reais do negócio estão sendo escritas em texto livre, na observação da OS:** parcelamento em 24 meses, data da primeira parcela, fechamento mensal, vencimento após a entrega do relatório, preço por vida.
- **O que o sistema mostra como "a cobrar" é o valor total da OS de uma vez,** mesmo quando a venda é parcelada ou recorrente. Daí vem a confusão.

## 1. O que o sistema registra

| Campo (OS) | O que é | Efeito real no sistema |
|---|---|---|
| `valor` | Valor total da venda | Usado nos indicadores financeiros como um valor único |
| `forma_pagamento` | PIX, crédito, débito, boleto (padrão), transferência, dinheiro, cheque, outro | Nenhum: só é exibido |
| `quantidade_parcelas` | Número de parcelas | Nenhum: não gera parcelas nem datas |
| `cobranca_imediata` | Se a cobrança é liberada já na criação | **É a única condição com efeito:** libera a OS inteira na criação |
| `data_acordada_cobranca` | Data combinada para cobrar | Nenhum. Não existe no formulário de criação, só na exibição |
| `nome_contato_envio_nf`, `contato_envio_nf` | Para quem enviar a NF | Nenhum: só é exibido |
| `observacao` | Texto livre | É onde as condições reais estão sendo escritas |
| `contrato` + objeto, início, fim, gestor | Se a venda é um contrato | Exige objeto e vigência; dispara e-mail de novo contrato. Não gera recorrência |
| `liberada_para_cobranca`, `liberada_para_cobranca_em`, `liberada_para_cobranca_por` | Liberação | Calculados pelo sistema (seção 2) |
| `cobranca_realizada`, `numero_nf`, `data_cobranca`, `cobranca_realizada_por` | Registro da cobrança | Gravados pelo endpoint de cobrança. NF e data são opcionais |

Fora da OS:
- `Cliente.cobranca_revisao_alteracao` (padrão: sim) diz se o cliente paga por revisões, mas **nenhuma regra usa esse campo**.
- A OS operacional não tem valor, forma de pagamento nem parcelas. Tem só `revisao_cliente` → `gera_cobranca`, a liberação e o registro da cobrança com NF.

## 2. Regras que o sistema aplica

### OS (venda)
1. **Liberação na criação:** se `cobranca_imediata=true`, a OS inteira fica liberada para cobrança ao ser criada.
2. **Liberação na conclusão:** senão, a OS é liberada quando **todos** os serviços estão concluídos. A data e o autor da liberação vêm do último serviço concluído.
3. **A liberação é definitiva:** reabrir uma tarefa depois disso não desfaz a liberação.
4. **Registro da cobrança:** só pelo endpoint de cobrança, e só se a OS estiver liberada. Desde 09/10/2026 exige a permissão `financeiro.registrar_cobranca` (antes, a edição comum da OS também permitia marcar como cobrada).
5. **Um registro de cobrança por OS:** uma única NF e uma única data, mesmo em vendas parceladas.
6. **E-mails:** liberação (para quem registra cobrança) e cobrança realizada. Estão desligados por configuração.

### OS operacional
1. `gera_cobranca` = `revisao_cliente`, sempre, sem consultar o cliente.
2. É liberada quando gera cobrança e está finalizada.
3. Se deixa de ser revisão, a liberação é limpa, mas uma cobrança já registrada não é desfeita.

### Indicadores financeiros
- **Cobrado:** soma do `valor` das OS marcadas como cobradas.
- **A cobrar:** soma do `valor` das liberadas e não cobradas.
- **Sem liberação:** o restante.

Sempre o valor total da OS, independentemente de parcelas ou recorrência.

## 3. O que o frontend oferece

- **Formulário da OS:**
  - forma de pagamento;
  - quantidade de parcelas, **limitada a 12**;
  - "cobrança imediata" (sim/não);
  - contato da NF;
  - observação.
  - **Não tem a data acordada de cobrança.**
- **Detalhe da OS (aba comercial):** mostra as condições, inclusive "data acordada de cobrança", sempre vazia.
- **Tela de cobranças:** lista só as OS **liberadas**, com filtro pendente/realizada (padrão: pendente) e filtro pelo status da OS. Mostra também as OS operacionais que geram cobrança. O registro da cobrança (NF e data) é uma ação dessa tela.

## 4. Como está sendo usado (banco de dev, 10/10/2026)

| Medida | Valor |
|---|---|
| OS | 634 |
| Forma de pagamento | boleto 569, PIX 45, outro 10, transferência 4, débito 3, crédito 2, dinheiro 1 |
| Parcelas | 1: 272 · 12: **236** · 2 a 10: 56 · vazio: 70 |
| Cobrança imediata | 88 sim, 546 não |
| Data acordada de cobrança preenchida | **0** |
| Marcadas como contrato | **1** |
| Observação preenchida | 561, das quais 135 falam em parcela, 128 em contrato e 58 em mensal |
| Liberadas / cobradas | 494 / 502 |
| **Cobradas sem nunca terem sido liberadas** | 13 (marcadas pela edição comum antes da correção de 09/10/2026) |
| Liberadas e ainda não cobradas | 5 (R$ 4.820,00) |
| Parceladas (mais de 1 parcela) com cobrança imediata | 47 |
| Liberadas com a OS ainda não concluída | 13 |
| OS com valor zero | 23 |
| OS operacionais | 3.226, com 133 revisões, 130 liberadas e 116 cobradas |
| Revisões de clientes que **não** pagam revisão | 23, nenhuma cobrada (o financeiro aplica a regra do cliente à mão, mas elas aparecem como cobráveis) |
| Clientes que não pagam revisão | 119 de 613 |

## 5. Condições reais encontradas nas observações

Padrões que aparecem no texto livre (sem identificar clientes):

1. **Parcelamento com data da primeira parcela:** "Parcelado em 06 vezes. Primeira parcela para o dia 10/08." É o padrão mais comum; as datas se concentram nos dias 10 e 15.
2. **Contrato de gestão em 24 meses:** "Contrato de gestão parcelado em 24 meses", "Gestão mensal — parcelado em 24x". Como o formulário vai até 12 parcelas, essas vendas ficam registradas com **12 parcelas e a informação real no texto**.
3. **Ciclo de faturamento mensal:** "O fechamento do faturamento mensal ocorrerá todo dia 25 de cada mês, com vencimento do boleto no dia 15 do mês subsequente." É uma cláusula de contrato colada na observação.
4. **Cobrança após a entrega:** "Emitir NF após a entrega do relatório e, a partir desse dia, contar 21 dias para o vencimento do boleto."
5. **Parcelas com intervalo:** "Pagamento parcelado em 2x — 30 e 60 dias."
6. **Preço por vida (valor variável):** "R$ 11,80 por vida, total de 6 colaboradores; vidas excedentes R$ 11,80." O valor mensal muda conforme o número de vidas.
7. **Cobrança por quantidade executada:** treinamento cobrado por colaborador, com turmas em datas diferentes e cobrança numa data definida.
8. **Composição de preço por item:** exames listados com preço unitário dentro da observação.

## 6. Fontes de confusão

1. **"A cobrar" mostra o valor total** de vendas parceladas ou recorrentes. Um contrato de 24 meses aparece como um valor único liberado de uma vez.
2. **A liberação não segue a condição combinada.** Uma venda parcelada com primeira parcela em data futura fica liberada na criação (47 casos) ou só no fim da execução, nunca na data da parcela.
3. **Parcelas, vencimentos e datas não existem no sistema.** O financeiro precisa ler a observação de cada OS para saber o que cobrar e quando.
4. **Um único registro de cobrança por OS:** não há como registrar a parcela 3 de 24, nem uma NF por mês.
5. **"Contrato" quase não é marcado** (1 de 634), apesar de 128 observações citarem contrato. O campo não traz benefício a quem preenche: não gera recorrência nem parcelas.
6. **Limite de 12 parcelas no formulário,** contra contratos de 24.
7. **Revisões de clientes que não pagam revisão aparecem como cobráveis,** e o financeiro precisa lembrar de não cobrar.
8. **Inconsistências herdadas:** 13 OS cobradas sem liberação, 23 com valor zero, cobranças sem NF ou sem data.
9. **Data acordada de cobrança** existe no modelo e na exibição, mas não no formulário.

## 7. Perguntas para a próxima etapa

1. Que tipos de venda existem? Pelo levantamento: avulsa à vista, avulsa parcelada, contrato recorrente (gestão mensal) e cobrança por quantidade (vidas, colaboradores, turmas).
2. O que dispara cada cobrança: a data combinada, a conclusão do serviço, a entrega do relatório ou o ciclo mensal (fechamento no dia 25)?
3. O financeiro precisa registrar cada parcela (NF e data), ou só acompanhar?
4. Em contratos por vida, quem informa a quantidade de vidas a cada mês, e quando?
5. Uma revisão de cliente que não paga revisão deveria simplesmente não gerar cobrança?
6. O que fazer com as inconsistências herdadas (cobradas sem liberação, valor zero)?
