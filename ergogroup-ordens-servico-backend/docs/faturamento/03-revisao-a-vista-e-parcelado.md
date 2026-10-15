# Faturamento — revisão: só à vista e parcelado, e a observação como observação de pagamento

> **Status (13/10/2026): proposta, implementada a pedido do usuário** ("pode registrar como proposta e já implementar"). As decisões do usuário estão marcadas como **decidido**; o resto é **proposta** e pode mudar com o retorno do financeiro.
>
> **Dicionário dos campos:** seção 8 (o que cada campo representa, como é preenchido e quem vê).
>
> **Base:** a discussão de 13/10/2026 sobre o formulário de nova venda, o código atual e os dados do banco de dev em 13/10/2026 (634 OS). Revisa a seção 4b de `02-proposta-condicoes-de-pagamento.md` e as decisões 5 do ADR 0007 e 7 do ADR 0008.

## 1. O pedido

- Quem vende não entendia os campos da condição de pagamento, principalmente os do recorrente (dia de fechamento, dia de vencimento, data do 1º vencimento) e o "quando libera para o financeiro".
- **Decidido:** o tipo recorrente sai. Ficam **à vista** e **parcelado**.
- **Decidido:** a observação da OS **é** a observação da condição de pagamento e do faturamento; é assim que ela é usada. Não se cria um campo novo para isso.
- Pedido: listar os campos que dão ao financeiro uma descrição eficiente da venda, com essas duas opções, e explicar cada um para quem vende.

## 2. O que os dados mostram (banco de dev, 13/10/2026)

| Dado | Resultado |
|---|---|
| Tipos de condição | 342 à vista, 292 parceladas, **0 recorrentes** |
| Parcelas das parceladas | 236 em 12x (antigos contratos de gestão), as demais de 2x a 10x |
| Intervalo entre parcelas | **30 dias em todas** as 292 parceladas |
| `valor_mensal`, `dia_fechamento`, `dia_vencimento` | vazios em todas |
| 1º vencimento (`data_acordada_cobranca`) | vazio em todas (o campo entrou no formulário novo) |
| Liberação | 546 na conclusão, 88 na venda |
| Observação preenchida | 561 de 634 |

**A observação é de pagamento e faturamento.** Lendo uma amostra aleatória ao lado da descrição dos serviços:
- condição combinada: "LTCAT parcelado em 6x no boleto", "parcelas 30/60/90, primeira para 10/07", "pagamento negociado para 30 dias";
- situação do pagamento: "pagamento já foi realizado via PIX", "não será preciso nenhuma cobrança", "valores inclusos no contrato guarda-chuva";
- regra da nota e do boleto: "boleto para os dois e-mails…", "envio das notas fiscais no endereço nf_servicos@…", "emitir NF após a entrega do relatório e contar 21 dias";
- preço: "R$ 6,50 por colaborador, 60 colaboradores, 12 meses", "valor por vida R$ 8,15 para até 23 vidas";
- dados do cliente para a nota: "O.C - 240650";
- recado administrativo: "O.S lançada com data retroativa".

O escopo técnico (local, funções, GHEs, medições) está na **descrição de cada serviço**.

**Vazamento encontrado:** a tela do serviço (`/servicos/:id`), que os setores veem, mostrava a observação da OS. Ou seja, valores e condições de pagamento chegavam a quem não tem `financeiro.ver_valores`. Corrigido nesta revisão (seção 5).

Também foi visto que algumas **descrições de serviço** trazem valores (ex.: "Acuidade Visual R$ 45,64"). Essas continuam visíveis para os setores; o formulário passa a orientar (seção 6), mas os registros antigos não mudam.

## 3. Os campos da condição (proposta implementada)

**Comuns aos dois tipos**

| Campo | Obrigatório | Para que o financeiro usa | Campo no modelo |
|---|---|---|---|
| Tipo: à vista ou parcelado | sim | Como lançar no sistema financeiro | `tipo_condicao` |
| Valor total | sim | O valor da nota | `valor` |
| Forma de pagamento | sim | Boleto, PIX… | `forma_pagamento` |
| **Vencimento**: data combinada **ou** dias após a nota | sim (vendas novas) | Quando o cliente paga; no parcelado, a 1ª parcela | `data_acordada_cobranca` **ou** `vencimento_dias_apos_nota` (novo) |
| Quando libera para o financeiro: na venda ou quando todos os serviços terminarem | sim | Quando a venda entra em "A faturar" e o financeiro é avisado | `liberar_em` |
| Para quem enviar a nota (nome e e-mail) | não (sugerido do cliente) | Destinatário da nota | `nome_contato_envio_nf`, `contato_envio_nf` |
| Observações de pagamento e faturamento | não | As exceções: já pago, outro e-mail, pedido de compra, preço por vida… | `observacao` (o campo de sempre) |

**Só no parcelado**

| Campo | Obrigatório | Observação |
|---|---|---|
| Número de parcelas | sim, mínimo 2 | A tela mostra o valor de cada parcela (total ÷ parcelas) |

**Regras**
- **As parcelas são sempre mensais, no mesmo dia do mês da 1ª** (era assim em 100% das vendas). Uma exceção vai na observação. *Proposta de 14/10/2026: permitir que as demais vençam num dia fixo do mês (seção 8.3).*
- **O vencimento é uma data ou um número de dias após a emissão da nota, nunca os dois.** Os dias valem de 1 a 365.
- **O vencimento é obrigatório** nas vendas novas e quando a condição de uma venda é editada. As vendas antigas sem vencimento continuam válidas e podem ser editadas em outros campos (ex.: prioridade) sem exigir o vencimento.
- O contrato mensal (ex.: gestão em 24 meses) é registrado como **parcelado em 24x**.

**Como a venda chega ao financeiro (`condicao_resumo`):**
- "À vista, vence 15/11/2026"
- "À vista, vence 21 dias após a nota"
- "Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 10/08/2026"

## 4. O que saiu

- O tipo **recorrente** e os campos `valor_mensal`, `dia_fechamento`, `dia_vencimento` e `intervalo_parcelas_dias`.
- Na análise financeira: o indicador "receita recorrente mensal" e a quebra "recorrente" por tipo de condição.
- No frontend: a opção no formulário, a etiqueta "Recorrente", a coluna "Valor mensal" da tabela de Vendas e o valor mensal no resumo, no PDF e nas Cobranças.

**Migrações** (uma alteração de schema por migração, como manda a regra do MySQL):
- `0037_converte_recorrente_e_intervalo`: **dados.** Antes de as colunas saírem, um recorrente vira parcelado (meses = parcelas) e o que não cabe nos campos que ficam (valor mensal, dias de fechamento e vencimento, intervalo diferente de 30) é acrescentado à observação como "[Condição anterior: …]". No dev não há nenhuma OS afetada; **em produção, conferir antes de rodar**.
- `0038` a `0041`: removem `valor_mensal`, `dia_fechamento`, `dia_vencimento` e `intervalo_parcelas_dias`.
- `0042`: acrescenta `vencimento_dias_apos_nota`.
- `0043`: tira o recorrente das opções de `tipo_condicao`.

Os registros antigos da auditoria com os campos que saíram continuam legíveis na linha do tempo ("Recorrente (condição antiga)").

## 5. A observação como observação de pagamento (decidido)

- No formulário, ela sai da etapa "Cliente e venda" e vai para a etapa da condição, com o nome **"Observações de pagamento e faturamento"**.
- Fica com os valores: só quem tem `financeiro.ver_valores` a recebe (OS, resumo da venda, situação financeira, Cobranças, PDF). Quem não tem não consegue editá-la.
- **Sai da tela do serviço** (`/api/execucao/servicos/{id}/`), que os setores veem.
- A busca de vendas pelo texto da observação vale só para quem vê valores.
- Na linha do tempo, "Venda alterada: observação de pagamento" aparece só para quem vê valores.

## 6. O que cada campo diz para quem vende (implementado no formulário)

- **Como o cliente vai pagar:** "À vista: o cliente paga tudo de uma vez." / "Parcelado: o cliente paga em parcelas mensais, sempre no mesmo dia do mês. Serve também para contratos mensais (ex.: gestão em 24x)."
- **Valor total:** "Quanto o cliente paga pela venda." / no parcelado, "A soma de todas as parcelas." O número de parcelas mostra "6 parcelas de R$ 1.583,33, uma por mês."
- **Quando vence (a 1ª parcela):**
  - "Numa data combinada": "O dia exato em que o cliente paga (a 1ª parcela; as outras vencem no mesmo dia dos meses seguintes)." No parcelado, a tela lista as datas das parcelas, só para conferir.
  - "Dias após a nota": "Para quando a data depende da entrega: o prazo conta a partir da emissão da nota fiscal."
- **Quando o financeiro pode faturar** (acontece uma vez só; ao liberar, a venda vai para "A faturar" e o financeiro recebe um e-mail):
  - "Na venda": o financeiro é avisado assim que a venda é registrada. Para nota antes ou durante o serviço: pagamento antecipado, entrada, contrato mensal.
  - "Quando todos os serviços terminarem": o financeiro só é avisado quando o último serviço da venda for concluído, de qualquer setor. Para nota depois da entrega.
- **Avisos (não bloqueiam):**
  - vencimento em data fixa com liberação na conclusão: se o serviço não terminar antes, a cobrança atrasa;
  - dias após a nota com liberação na venda: o prazo começa a contar já na venda.
- **Observações de pagamento e faturamento:** "O que não cabe nos campos acima: pagamento já recebido, outro e-mail para a nota, nº do pedido de compra do cliente, preço por vida… Só o financeiro e quem vê valores enxergam."
- Um quadro "Como o financeiro vai ver" mostra o resumo pronto.

## 7. Em aberto (proposta, a confirmar)

1. **"Já foi pago"** apareceu muitas vezes na observação. Pode virar uma marcação própria ("pagamento já recebido") ou continuar como texto.
2. **Mais de um e-mail para a nota:** hoje o campo aceita um só; o segundo vai para a observação.
3. **Pedido/ordem de compra do cliente (O.C):** muitas empresas exigem o número na nota. Pode virar campo.
4. **Regra de faturamento do cliente** ("fecha dia 25, vence dia 15 do mês seguinte", Grupo Way): é do cliente, não da venda. Fica na observação; se aparecer em vários clientes, pode virar dado do cadastro do cliente.
5. **Serviço cancelado e a liberação na conclusão — defeito confirmado e corrigido em 13/10/2026.** `OrdemServico.sincronizar_status_e_cobranca` só concluía a OS com *todos* os serviços concluídos, e o cancelado contava como pendente: a venda ficava "em andamento" e nunca era liberada. Não havia impacto ainda (não existe caminho no sistema para cancelar um serviço; o dev não tem nenhum cancelado).
   - **Decidido pelo usuário:** serviço cancelado não conta; a OS conclui, e libera quando for na conclusão, quando os demais terminam. **Todos os serviços cancelados: a OS fica cancelada.**
   - Mantido o ADR 0007: a liberação acontece uma vez só e não é desfeita; uma OS liberada na venda continua liberada se depois todos os serviços forem cancelados (*proposta*, a confirmar).
   - Testes: `LiberacaoComServicoCanceladoTestCase` em `tests_faturamento.py`.
6. **Descrições de serviço com valores:** os registros antigos continuam visíveis para os setores.

## 8. Dicionário dos campos da condição de pagamento

Referência de cada campo da venda (`OrdemServico`) ligado ao pagamento: o que ele representa, como é preenchido e quem o vê. **Vale para todas as telas, a API, os e-mails e o resumo da condição (`condicao_resumo`).**

**Quem vê:** todos os campos desta seção ficam **ocultos para quem não tem `financeiro.ver_valores`**. Eles não vêm na API, não aparecem nas telas e não podem ser editados por essa pessoa. Ela informa a condição ao **criar** a venda, mas não a vê depois.

### 8.1 Campos que quem vende preenche

| Campo (banco) | Tipo e valores | Obrigatório | O que representa |
|---|---|---|---|
| `tipo_condicao` | escolha: `a_vista` ou `parcelado`. Padrão: `a_vista` | sim | **Como o cliente paga.** À vista: uma cobrança só. Parcelado: o total dividido em parcelas **mensais**. Um contrato mensal (ex.: gestão em 24 meses) é um parcelado em 24x. |
| `valor` | decimal, R$ (10 dígitos, 2 casas) | sim (vendas novas) | **Valor total da venda**, o valor da nota. No parcelado, é a **soma de todas as parcelas**, não o valor de cada uma. |
| `quantidade_parcelas` | inteiro, mínimo 2 | só no parcelado | **Em quantas parcelas o total foi dividido.** O valor de cada parcela não é guardado: a tela e o resumo calculam `valor ÷ quantidade_parcelas`. No à vista fica vazio. |
| `forma_pagamento` | escolha: boleto, PIX, transferência, crédito, débito, dinheiro, cheque, outro. Padrão: boleto | sim | **Como o cliente paga cada cobrança.** É uma só para a venda inteira. |
| `data_acordada_cobranca` | data | um dos dois (ver abaixo) | **Data combinada do vencimento.** No à vista, o dia em que o cliente paga. No parcelado, o dia da **1ª parcela**. O nome no banco é antigo; na tela e nos documentos ele é "data do vencimento" ou "data da 1ª parcela". |
| `vencimento_dias_apos_nota` | inteiro, 1 a 365 | um dos dois (ver abaixo) | **Vencimento contado a partir da emissão da nota fiscal**, em dias corridos. Usado quando a data depende da entrega (ex.: "nota após o relatório, vence em 21 dias"). No parcelado, vale para a 1ª parcela. A data real só existe quando a nota for emitida, no sistema financeiro. |
| `dia_vencimento_demais` *(desde 14/10/2026)* | inteiro, 1 a 31, ou vazio | não; só no parcelado | **Dia do mês em que vencem as parcelas da 2ª em diante.** Vazio = no mesmo dia do mês da 1ª parcela. Ex.: 1ª 21 dias após a nota, demais todo dia 10. |
| `liberar_em` | escolha: `venda` ou `conclusao`. Padrão: `conclusao` | sim | **Quando o financeiro pode faturar.** `venda`: assim que a venda é registrada. `conclusao`: quando o último serviço não cancelado da venda termina. Acontece **uma vez só** (ver 8.2). |
| `nome_contato_envio_nf` | texto, até 50 caracteres | não | **Nome de quem recebe a nota fiscal** no cliente. A tela sugere o representante do cliente. |
| `contato_envio_nf` | e-mail | não | **E-mail para onde a nota vai.** A tela sugere o e-mail do representante (ou do cliente). Aceita um só; um segundo e-mail vai na observação (seção 7, item 2). |
| `observacao` | texto livre | não | **Observações de pagamento e faturamento**: o que não cabe nos campos acima (pagamento já recebido, outro e-mail para a nota, pedido de compra do cliente, preço por vida, entrada com valor diferente). Não é para orientação técnica: isso vai na descrição de cada serviço. |

**O vencimento é `data_acordada_cobranca` ou `vencimento_dias_apos_nota`, nunca os dois.**
- É obrigatório nas vendas novas e quando a condição de uma venda é editada. Vendas antigas sem vencimento continuam válidas.
- Na edição, informar um apaga o outro.
- Na tela, a pessoa escolhe primeiro **"Numa data combinada"** ou **"Dias após a nota"** e depois preenche o valor. Essa escolha não é guardada à parte: ela é deduzida de qual dos dois campos está preenchido.

### 8.2 Campos que o sistema preenche (liberação e lançamento)

| Campo (banco) | O que representa | Quem preenche |
|---|---|---|
| `liberada_para_cobranca` | A venda já foi liberada para o financeiro (aparece em Cobranças › "A faturar"). Não volta a falso. | O sistema: ao criar, se `liberar_em = venda`; ou quando o último serviço não cancelado termina, se `conclusao`. |
| `liberada_para_cobranca_em` | Quando foi liberada. Na conclusão, é a data de término do último serviço. | O sistema |
| `liberada_para_cobranca_por` | Quem causou a liberação: quem registrou a venda, ou quem concluiu o último serviço. | O sistema |
| `cobranca_realizada` | O financeiro marcou que lançou a venda no sistema financeiro externo (o "check"). *Nome provisório*, ver ADR 0007. | O financeiro (`financeiro.registrar_cobranca`) |
| `referencia_lancamento` | O número ou código do lançamento no sistema externo (ex.: nº da NF, id do Asaas). | O financeiro |
| `data_cobranca` | Data do lançamento. | O financeiro |
| `cobranca_realizada_por` | Quem marcou o lançamento. | O sistema, com o usuário logado |
| `origem_lancamento` | `manual` (marcado na tela) ou `integracao` (futuro lançamento automático). | O sistema |

Ao liberar, o financeiro recebe um e-mail. A venda só pode ser marcada como lançada depois de liberada.

### 8.3 Dia das demais parcelas (decidido em 14/10/2026; implementado no backend, migração `0044`, e na tela: formulário, resumo da venda e situação financeira)

**Por quê.** Hoje as parcelas da 2ª em diante vencem no mesmo dia do mês da 1ª. Isso não cobre casos reais da observação:
- "nota após o relatório, 1ª em 21 dias, depois todo dia 10";
- regras de faturamento do cliente como "vence todo dia 15";
- 1ª parcela em dias após a nota: sem um dia fixo, as demais ficam sem data até a nota sair.

**O campo.** `dia_vencimento_demais` (inteiro de 1 a 31, opcional), só no parcelado:
- **vazio** = as demais no **mesmo dia do mês da 1ª** (a regra de hoje);
- **preenchido** = as demais **todo dia X do mês**.

Na tela, a pergunta é **"Quando vencem as demais parcelas"**, com as opções **"No mesmo dia do mês da 1ª"** (padrão) e **"Todo dia \_\_ do mês"**.

**Regras (decididas pelo usuário em 14/10/2026):**
1. A 2ª parcela vence no dia X do **mês seguinte ao da 1ª**, mesmo que o dia X do próprio mês da 1ª ainda não tenha passado. Assim não há duas parcelas no mesmo mês. Ex.: 1ª em 05/11, demais todo dia 10 → 10/12, 10/01…
2. Dia 29, 30 ou 31 num mês mais curto vence no **último dia do mês**. Ex.: todo dia 31 → 30/11, 31/12, 28/02… *(A tela já faz isso com o "mesmo dia da 1ª".)*

**Como o financeiro lê (`condicao_resumo`):**
- "Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 10/11/2026" (vazio: mesmo dia)
- "Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 21 dias após a nota, demais todo dia 10"

**O que muda no sistema:**
- uma migração que acrescenta a coluna (todas as vendas atuais ficam vazias, ou seja, a regra de hoje);
- validação de 1 a 31 e de que o campo fica vazio no à vista;
- o campo fica oculto para quem não vê valores;
- a linha do tempo passa a registrar a mudança como mudança de condição;
- o texto do resumo e a prévia das datas na tela acompanham.

**Fora de propósito (continuam na observação):**
- "30/60/90 dias" exatos, ou seja, a cada 30 dias corridos em vez de "todo mês no mesmo dia";
- entrada com valor diferente das demais parcelas.

## 9. A observação é toda de faturamento? (análise de 14/10/2026, etapa 0.2 do plano)

**Resposta: não.** A leitura de 13/10 foi uma amostra de 30. Com a base inteira, cerca de **um terço das observações não tem nada de pagamento**, e um quarto mistura pagamento com informação para o setor.

**Método.**
1. Todas as 561 observações do dev (de 634 vendas) classificadas por palavras-chave.
2. Leitura manual de cada grupo, para conferir a classificação.
3. Comparação de cada observação com a descrição dos serviços da mesma venda: quantas palavras dela já estão na descrição.

| Grupo | Total | Vendas ativas (aberta ou em andamento) | O que é (lido à mão) |
|---|---|---|---|
| Faturamento | 215 | 78 | Parcelas, boleto, vencimento, NF, "já pago", e-mail da nota, valores |
| Misto (pagamento + setor) | 153 | 46 | Ex.: "treinamentos presenciais, data a definir; boleto para 10/08"; "boleto em 1 parcela, NF em 30 dias, enviar para tst@…; treinamentos na empresa Fertigran" |
| Técnica / escopo | 90 | 7 | Datas e horários de treinamento, local e unidade, funções e GHEs a incluir, pontos de medição |
| Outro (escopo, padrão, contato) | 79 | 10 | "Padrão Mosaic", "igual documento matriz", contato no cliente ("Bruna, 34 9…"), "documento já foi feito", alguns "NA" |
| Resumo do que foi vendido | 13 | 1 | "Elaboração de PGR e PCMSO", "Gestão comercial, LTCAT e AEP" |
| Administrativa | 11 | 7 | 6 "O.S lançada com data retroativa"; o resto, ao ler, é técnico (agendamento de treinamento, avaliações) |

*A classificação por palavras-chave é aproximada; a leitura manual confirmou os grupos, com o desvio indicado na linha "Administrativa".*

**A informação para o setor já está na descrição dos serviços?** Em parte:
- técnicas: 48 de 90 estão quase inteiras na descrição; 32 quase nada;
- "outro": 53 de 79 estão na descrição; 22 quase nada;
- mistas: em 93 de 153, a parte de setor **não** está na descrição;
- 91 vendas (as mais antigas) nem têm descrição nos serviços.

**Consequência da decisão de 13/10.** Desde que a observação ficou só com quem vê valores, os setores **deixaram de ver** essa informação: datas de treinamento, local, funções a incluir, contato no cliente. Nas vendas **ativas** isso afeta cerca de **18** observações só de setor (técnica, "outro" e resumo) e **46 mistas**.

**Opções (proposta; a decisão é do usuário):**
- **A. Copiar para os serviços** (nas vendas ativas): as 18 observações só de setor são acrescentadas à descrição de cada serviço da venda ("Observação da venda: …") por migração de dados. As 46 mistas não podem ser separadas sem risco de levar valores para o setor: o sistema lista essas vendas para o comercial revisar à mão. As vendas encerradas ficam como estão. Daqui para a frente vale a regra que já está no formulário: orientação para o setor vai na descrição do serviço.
- **B. Campo próprio "Orientações para os setores"** na venda, visível para todos. As observações só de setor passam para ele, e as mistas vão para revisão manual, como na A. O formulário ganha esse campo na seção de serviços. Serve para o que vale para a venda inteira (contato no cliente, padrão do documento, acesso ao local), sem repetir em cada serviço. Custa um campo, uma migração e o ajuste das telas.
- **C. Voltar a mostrar a observação para os setores**, desfazendo parte da decisão de 13/10. Vaza valores e condições de pagamento (215 + 153 observações).

**Decidido pelo usuário em 14/10/2026: nenhuma observação para os setores.** Existem só duas observações:
- a **descrição (observação) de cada serviço**, que é o que o setor lê;
- a **observação financeira da OS** (`observacao`), só para quem vê valores.

A opção B (campo "Orientações para os setores" na venda) chegou a ser escolhida e começou a ser implementada, mas o usuário a **rejeitou e mandou reverter** no mesmo dia. A reversão foi completa: as migrações `0045` e `0046` nunca foram aplicadas e foram apagadas, assim como o campo, a API, o comando de revisão e os testes. O banco não foi alterado.

**Recomendação que tinha sido apresentada (descartada):** **B**. A informação para o setor que vale para a venda inteira (contato, padrão, local) é frequente nos dados e fica repetida ou perdida se for só por serviço. A revisão manual das 46 mistas ativas é inevitável em qualquer opção que não vaze valores.
