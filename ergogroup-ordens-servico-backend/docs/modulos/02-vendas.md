# 02. Vendas

Este módulo cobre o registro da **venda** (a ordem de serviço, OS), os **serviços vendidos** e a **condição de pagamento** combinada com o cliente. Também cobre o **acompanhamento** da venda pelo comercial: andamento, resumo da venda, PDF e linha do tempo.

A execução dos serviços nos setores e o faturamento têm módulos próprios. Aqui aparecem só os pontos em que eles tocam a venda.

Decisões de origem:
- ADR 0007: papel do sistema no faturamento.
- ADR 0008: seções 5 (serviços na criação da OS) e 6 (visão comercial).
- `docs/faturamento/03-revisao-a-vista-e-parcelado.md`: condição à vista ou parcelado.

---

## 1. Conceitos

```
Venda (OS) ── cliente, data, prioridade, vendedor
 ├── Serviços vendidos ── cada um de um item do catálogo → vai para o setor que executa o catálogo
 └── Condição de pagamento ── valor, à vista ou parcelado, vencimento, quando liberar para faturar
```

| Conceito | O que é | Onde fica no código |
|---|---|---|
| **Venda / OS** | O pacote comercial: o cliente, a data, quem vendeu, a prioridade e a condição de pagamento. A cobrança é sempre **por OS**. | `OrdemServico` |
| **Serviço vendido** | Um item da venda, escolhido do catálogo, com a descrição do que será feito. É a **unidade de trabalho** de um setor. | `Servico` |
| **Setor do serviço** | Cópia do setor do catálogo **no momento da venda**. Mudar o catálogo de setor depois não move o histórico. | `Servico.setor` |
| **Vendedor** | Quem registrou a venda. É preenchido automaticamente. | `OrdemServico.criado_por` |
| **Condição de pagamento** | O que foi combinado: valor, forma, à vista ou parcelado, vencimento, quando liberar, contato da nota e observações. O sistema **registra**; não gera nem controla parcelas. | campos da `OrdemServico` |
| **Liberar para faturamento** | O momento em que o financeiro pode faturar: **na venda** ou **quando todos os serviços terminarem**. | `liberar_em`, `liberada_para_cobranca*` |
| **Andamento** | Quantos serviços da venda estão em cada etapa da execução (novo, a distribuir, distribuído, em execução, concluído, cancelado). | `services/comercial.py` |

---

## 2. Dados da venda

### 2.1 Cliente e venda

| Campo | Obrigatório | Regra |
|---|---|---|
| Cliente | Sim | Um cliente cadastrado. A busca na tela é por nome ou CNPJ. |
| Data da venda | Sim | Data informada pelo vendedor (pode ser diferente do dia do registro). |
| Prioridade | Não (padrão: baixa) | Baixa, média ou alta. Os serviços **herdam** a prioridade da venda, a menos que se informe outra no serviço. |
| Vendedor | Automático | Quem registrou. |

### 2.2 Serviços vendidos

| Campo | Obrigatório | Regra |
|---|---|---|
| Serviço do catálogo | Sim | Precisa estar **ativo** e ser de um **setor ativo**. Caso contrário, a venda inteira é recusada (400). |
| O que será feito (descrição) | Sim | Texto livre. |
| Prioridade | Não | Se vazia, herda a da venda. |

O setor é preenchido pelo sistema a partir do catálogo. O status, o prazo e as datas de início e término do serviço são **calculados** a partir das tarefas, na execução. Ninguém os edita na venda.

### 2.3 Condição de pagamento

Ver `docs/faturamento/03-revisao-a-vista-e-parcelado.md` para o dicionário completo.

| Campo | Obrigatório | Regra |
|---|---|---|
| Valor total | Sim, na tela | Maior que zero. |
| Tipo | Sim | **À vista** (paga tudo de uma vez) ou **parcelado** (parcelas mensais). Contratos mensais, como gestão em 24x, são registrados como parcelado. |
| Forma de pagamento | Sim (padrão: boleto) | Boleto, PIX, transferência, crédito, débito, dinheiro, cheque ou outro. Uma só para a venda inteira. |
| Quantidade de parcelas | Só no parcelado | Pelo menos 2. As parcelas são mensais. |
| Vencimento | Sim | Uma **data combinada** ou um número de **dias após a nota** (1 a 365), **nunca os dois**. No parcelado, é o vencimento da 1ª parcela. |
| Dia das demais parcelas | Não, só no parcelado | Dia do mês (1 a 31) das parcelas da 2ª em diante. Vazio = no mesmo dia do mês da 1ª. Dia que não existe no mês (ex.: 31) vira o último dia. |
| Liberar para faturamento | Sim (padrão: na conclusão) | **Na venda** ou **quando todos os serviços terminarem**. Ver seção 3.3. |
| Para quem enviar a nota / e-mail da nota | Não | Nome e e-mail do contato no cliente. A tela sugere o representante do cliente. |
| Observações de pagamento e faturamento | Não | Ex.: sinal já pago, pedido de compra, outro e-mail para a nota. É informação **financeira**: só quem vê valores enxerga. |

A condição vira um texto pronto, o **resumo da condição**, usado igual no comercial, no financeiro e nos e-mails. Exemplos:
- "À vista, vence 10/08/2026"
- "Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 21 dias após a nota, demais todo dia 10"

---

## 3. Regras de negócio

### 3.1 Quem pode o quê

| Ação | Permissão |
|---|---|
| Registrar uma venda | `os.gerenciar` |
| Editar a venda | `os.gerenciar` |
| Acrescentar um serviço a uma venda já registrada | `os.gerenciar` |
| Editar ou excluir um serviço | `os.gerenciar`, ou `servicos.gerenciar` no setor do serviço |
| Excluir a venda | `os.excluir` (apaga os serviços e as tarefas; não há como desfazer) |
| Ver valor e condição de pagamento | `financeiro.ver_valores` |
| Ver a tela de Vendas e o Resumo da venda | `os.gerenciar` ou `os.ver_todas` |

### 3.2 Quem vê quais vendas

| A pessoa tem | Vê |
|---|---|
| `os.ver_todas` | Todas as vendas. |
| `servicos.ver_setor` em algum setor | As vendas com algum serviço dos seus setores, as vendas com serviço ainda sem setor e as vendas em que tem tarefa. |
| Nenhuma das duas | Só as vendas em que tem tarefa. |

**Valores ocultos:** sem `financeiro.ver_valores`, a API não devolve valor, condição de pagamento nem observação. Ela também ignora esses campos na edição. Na **criação**, eles são aceitos, porque quem lança a venda informa o valor; depois de salva, a pessoa deixa de vê-los. A busca na lista inclui a observação só para quem vê valores.

### 3.3 Liberação para faturamento

| Opção | O que acontece |
|---|---|
| **Na venda** | A OS nasce liberada, com data e "liberada por" igual ao vendedor. O financeiro recebe o e-mail na hora, e a venda aparece em Cobranças → "A faturar". Use quando a nota sai antes ou durante o serviço: pagamento antecipado, entrada, contrato mensal. |
| **Quando todos os serviços terminarem** | A OS é liberada sozinha quando o **último serviço ativo** é concluído, de qualquer setor. A data da liberação é a do término desse serviço, e "liberada por" é quem o terminou. Serviços cancelados não contam. Use quando a nota sai depois da entrega. |

A liberação é **calculada pelo sistema**; não há botão para liberar. Uma vez liberada, a OS não volta atrás. Se algo mudar depois (serviço acrescentado ou excluído, valor ou condição alterados), a Conferência do faturamento aponta "Mudou depois da liberação" ou "Mudou depois de faturada".

### 3.4 Status da venda

O status é **calculado** a partir dos serviços; ninguém o edita.

| Status | Quando |
|---|---|
| Aberta | Nenhum serviço começou, ou a venda não tem serviços. |
| Em andamento | Algum serviço ativo está em execução ou concluído, e ainda falta algum. |
| Concluída | Todos os serviços ativos estão concluídos (os cancelados não contam). |
| Cancelada | Todos os serviços foram cancelados. |

Os campos `status`, `concluida`, a liberação e o faturamento são somente leitura na API de vendas. O faturamento só é registrado pelo endpoint do financeiro.

### 3.5 Registro e edição

| Regra | Comportamento |
|---|---|
| Uma transação só | A venda e os serviços são gravados juntos. Se um serviço for inválido, nada é gravado. |
| Venda sem serviços | A API aceita; a tela exige pelo menos um serviço. |
| Setor sem quem receba tarefas | **Não impede** a venda (o comercial não tem como corrigir o setor). A resposta traz `avisos` e a tela mostra "Venda registrada, com um aviso". |
| Aviso aos setores | Ao salvar, **um e-mail por setor** vai para quem organiza o setor, com os serviços que chegaram (ADR 0010). Quem registrou a venda não recebe. |
| Editar a venda | Altera cliente, data, prioridade e condição de pagamento. Os serviços **não** são alterados por aqui (seção 3.6). |
| Vencimento na edição | Mandar a data limpa os dias após a nota, e vice-versa. Passar para à vista limpa o dia das demais parcelas. Vendas antigas sem vencimento continuam editáveis fora da condição; mexeu na condição, o vencimento passa a ser exigido. |
| Trocar "liberar em" depois de salva | A liberação já registrada não é desfeita. Passar para "na venda" não libera na hora: a OS é liberada na próxima vez que os serviços dela forem sincronizados. |

### 3.6 Serviços depois da venda

| Ação | Regra |
|---|---|
| Acrescentar serviço | Mesmo cadastro da venda (catálogo ativo de setor ativo, descrição, prioridade). **Só o setor do novo serviço** recebe o e-mail de chegada. Se a OS já estava liberada, a Conferência aponta a mudança. |
| Trocar o catálogo do serviço | Para um catálogo **do mesmo setor**: sempre pode. Para **outro setor**: só com o serviço em aberto e **sem tarefas**, e quem troca precisa de `os.gerenciar` ou `servicos.gerenciar` no setor de destino. O serviço passa ao setor novo, a ciência de recebimento volta a zero e o setor novo recebe o e-mail de chegada. |
| Excluir serviço | Apaga o serviço e as tarefas dele. |
| Cancelar serviço | O status "cancelado" existe e é respeitado em todas as regras (andamento, conclusão, liberação). **Hoje não há como cancelar um serviço pela API, pelas telas nem pelo admin.** Os cancelados que existem vêm de dados antigos. |

---

## 4. Fluxo básico

### 4.1 Registrar uma venda (Vendas → Nova venda)

A página tem três seções sempre visíveis e um resumo fixo ao lado, que mostra o que falta preencher. O envio é um só.

1. **Cliente e venda:** cliente, data da venda e prioridade.
2. **Serviços vendidos:** o modal de serviços permite escolher o serviço do catálogo, dizer o que será feito e "Adicionar à OS". O modal continua aberto para o próximo serviço e mostra os que já entraram. Cada serviço mostra o setor que vai executá-lo.
3. **Pagamento:** valor, tipo (à vista ou parcelado), forma, parcelas, vencimento (numa data ou dias após a nota), dia das demais parcelas, quando liberar para faturar, contato da nota e observações. A tela mostra a prévia das datas e do valor de cada parcela.
4. **Registrar.** Em seguida:
   - a OS é criada com os serviços;
   - cada setor recebe o aviso de chegada;
   - se a venda for "liberar na venda", o financeiro recebe o aviso de liberação;
   - a tela abre o Resumo da venda.

### 4.2 Acompanhar

```
Venda registrada → serviços chegam aos setores (novo → a distribuir → distribuído → em execução → concluído)
                → último serviço concluído → OS concluída → liberada para faturar (se "na conclusão")
                → financeiro registra o faturamento → vendedor recebe o e-mail "OS faturada"
```

- **Vendas** (`/vendas`): cada venda com o andamento (ex.: "2 de 4 concluídos"). As visões são Todas, Para distribuir (algum serviço novo ou a distribuir), Em execução e Concluídas. Há filtros de vendedor ("Minhas vendas" no topo), cliente, status, data da venda e, para quem vê valores, condição e situação financeira.
- **Resumo da venda** (`/vendas/:id`): responde ao cliente "como está meu serviço?". Mostra quem vendeu e quando, e por serviço o setor, a etapa, os responsáveis com prazo, início e término, e quem finalizou. Para quem vê valores, mostra também a condição de pagamento e a situação financeira (liberação e faturamento). Embaixo fica a linha do tempo da venda.

### 4.3 Ajustar depois

No Resumo da venda:
- **Editar venda:** mesma página da Nova venda, sem a seção de serviços. O pagamento só aparece para quem vê valores.
- **Acrescentar serviço:** abre um modal com um serviço.
- **PDF:** gera o resumo da venda em PDF para enviar ao cliente.
- **Excluir venda:** só com `os.excluir`, com confirmação.

---

## 5. Telas

| Tela | Rota | Quem acessa |
|---|---|---|
| Vendas | `/vendas` | `os.gerenciar` ou `os.ver_todas` |
| Nova venda | `/vendas/nova` | `os.gerenciar` |
| Editar venda | `/vendas/:id/editar` | `os.gerenciar` |
| Resumo da venda | `/vendas/:id` | `os.gerenciar` ou `os.ver_todas` |

As rotas antigas `/ordens`, `/ordens/:id` e `/ordens/:id/edit` redirecionam para as de Vendas. Colunas e campos financeiros somem para quem não tem `financeiro.ver_valores`.

---

## 6. Endpoints

| Ação | Endpoint | Observações |
|---|---|---|
| Listar vendas | `GET /api/ordens-servico/ordens/` | Filtros: `q` (cliente; observação para quem vê valores), `cliente`, `concluida`, `liberada`, `cobranca_realizada`, `minhas=true` e `etapa` (vendas com algum serviço na etapa). Cada linha traz o `andamento`. |
| Registrar venda | `POST /api/ordens-servico/ordens/` | Aceita `servicos` na mesma requisição. A resposta traz `avisos`. |
| Detalhar / editar | `GET` / `PATCH /api/ordens-servico/ordens/<id>/` | Na edição, `servicos` é somente leitura. |
| Excluir venda | `DELETE /api/ordens-servico/ordens/<id>/` | `os.excluir`. |
| Resumo da venda | `GET /api/comercial/vendas/<id>/` | Condição e financeiro vêm nulos para quem não vê valores. |
| Linha do tempo | `GET /api/ordens-servico/ordens/<id>/linha-do-tempo/` | Eventos da OS, dos serviços e das tarefas. |
| Acrescentar serviço | `POST /api/ordens-servico/servicos/` | Com `ordem_servico`. A resposta traz `avisos`. |
| Editar / excluir serviço | `PATCH` / `DELETE /api/ordens-servico/servicos/<id>/` | Regras de troca de catálogo na seção 3.6. |

---

## 7. Onde está no código

| Assunto | Arquivo |
|---|---|
| Modelo da venda, condição, status e liberação | `apps/ordens_servico/models/ordem_servico.py` |
| Serviço e o setor copiado do catálogo | `apps/ordens_servico/models/servico.py` |
| Registro da venda com os serviços e o aviso de chegada | `apps/ordens_servico/services/venda.py` |
| Validação da condição e campos ocultos | `apps/ordens_servico/serializers/ordem_servico_serializer.py` |
| Serviços (catálogo vendável, troca de setor) | `apps/ordens_servico/serializers/servico_serializer.py`, `apps/catalogo/services.py` |
| Andamento e Resumo da venda | `apps/ordens_servico/services/comercial.py` |
| Quem vê quais vendas | `apps/ordens_servico/services/visibilidade.py` |
| Telas | Frontend: `src/features/vendas/` (páginas, modal de serviços, condição e PDF) |
