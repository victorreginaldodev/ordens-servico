---
titulo: Cobranças
resumo: Cobranças é a tela do dia a dia do financeiro: o que está para faturar, o que ainda está em execução e o que já foi faturado.
permissoes: financeiro.registrar_cobranca
tela: Cobranças
url: /cobrancas
rotas: /cobrancas
ver: faturar, conferencia
atualizado: 15/10/2026
---

## Abas

| Aba | O que mostra |
|---|---|
| **Para faturar** | A fila do financeiro: vendas liberadas e ainda sem lançamento. As liberadas há mais tempo vêm primeiro. |
| **Em execução** | Vendas ainda não liberadas, as mais perto de liberar primeiro, com **o que falta** para liberar. |
| **Faturadas** | O que já foi lançado, mês a mês. |

Cada linha mostra como a venda foi liberada: **na venda** ou **serviços concluídos**.

## Saber o que falta (Em execução)

Para cada venda em execução, a tela mostra o que falta: o serviço, o setor, a etapa, com quem está e há quantos dias está parado. Assim você sabe a quem perguntar sem abrir a execução.

## Precisa de atenção

No topo fica o resumo da [Conferência do faturamento](conferencia). O filtro `Precisa de atenção` mostra só as vendas com alguma pendência dela.

> [!ATENCAO] Venda esperando há 3 dias ou mais
> Uma venda liberada há 3 dias ou mais sem lançamento fica destacada e entra no contador de alertas.

## Filtros

Cliente, condição de pagamento, vendedor, liberação (na venda ou serviços concluídos), forma de pagamento, data da venda e vencimento.

## Ações em cada venda

- `Faturar`: abre o modal de faturamento. Veja [Faturar uma venda](faturar).
- `Abrir o resumo para faturar`: veja [Resumo para faturar](resumo-para-faturar).
- `Abrir a venda`: o Resumo da venda.
