---
titulo: Cobranças
resumo: Cobranças é a tela do dia a dia do financeiro: vendas e OS operacionais para faturar, o que ainda está em execução e o que já foi faturado.
permissoes: financeiro.registrar_cobranca
tela: Cobranças
url: /cobrancas
rotas: /cobrancas, /cobrancas/operacionais/:id
ver: faturar, conferencia
atualizado: 19/10/2026
---

## Abas

| Aba | O que mostra |
|---|---|
| **Para faturar** | A fila do financeiro: vendas liberadas e ainda sem lançamento. As liberadas há mais tempo vêm primeiro. |
| **Em execução** | Vendas ainda não liberadas, as mais perto de liberar primeiro, com **o que falta** para liberar. |
| **Faturadas** | O que já foi lançado, mês a mês. |

Cada linha mostra como foi liberada: **na venda**, **serviços concluídos** ou **OS operacional finalizada**.

## Vendas e OS operacionais

As OS operacionais que geram cobrança aparecem nas mesmas abas, junto das vendas. A coluna **Origem** mostra se a linha é uma **Venda** (azul) ou uma **OS operacional** (roxo), e o seletor `Todas · Vendas · OS operacionais` filtra.

- A OS operacional entra em **Em execução** enquanto não é finalizada e em **Para faturar** quando é finalizada.
- Ela não tem valor, condição nem vencimento no sistema: o valor é **definido no lançamento**. Essas colunas aparecem com "—".
- "O que cobrar" mostra o serviço do catálogo operacional e a quantidade.
- O total da aba separa as vendas (quantidade e valor) das OS operacionais (quantidade).

## Saber o que falta (Em execução)

Para cada venda em execução, a tela mostra o que falta: o serviço, o setor, a etapa, com quem está e há quantos dias está parado. Assim você sabe a quem perguntar sem abrir a execução.

## Precisa de atenção

No canto do cabeçalho fica um item pequeno com o resumo da [Conferência do faturamento](conferencia): verde quando está tudo conferido, amarelo com pontos para olhar e vermelho quando algo está fora de sincronia. Clique nele para ver o que precisa de atenção, verificar de novo ou abrir a conferência. O filtro `Precisa de atenção` mostra só as linhas com alguma pendência dela.

> [!ATENCAO] Venda esperando há 3 dias ou mais
> Uma venda liberada há 3 dias ou mais sem lançamento fica destacada e entra no contador de alertas.

## Filtros

Cliente, condição de pagamento, vendedor, liberação (na venda, serviços concluídos ou OS operacional finalizada), data da venda ou do recebimento e vencimento.

## Ações em cada linha

- `Faturar`: abre o modal de faturamento. Veja [Faturar uma venda](faturar). Na OS operacional, abre "Faturar a OS operacional": confira o cliente, o que cobrar e a regra de cobrança, lance no sistema financeiro e registre aqui a referência (opcional) e a data do lançamento.
- `Abrir o resumo para faturar`: veja [Resumo para faturar](resumo-para-faturar).
- `Abrir a venda`: o Resumo da venda (só nas vendas).
- Na OS operacional, o resumo mostra a regra de cobrança, os dados para lançar, o que cobrar, o lançamento e o histórico.
