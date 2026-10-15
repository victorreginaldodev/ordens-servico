---
titulo: Resumo para faturar
resumo: O Resumo para faturar junta numa página tudo o que o financeiro precisa saber sobre uma venda.
permissoes: financeiro.ver_valores
tela: Cobranças → abrir o resumo para faturar
rotas: /cobrancas/:id
ver: faturar, conferencia
atualizado: 15/10/2026
---

## O que a página mostra

- **A situação:** uma faixa explica por que a venda está liberada, ou por que ainda não está.
- **As pendências** da conferência do faturamento, se houver.
- **Para lançar no sistema financeiro:** os dados do cliente, da venda e da condição de pagamento, com os botões de copiar e o `Copiar tudo`.
- **Lançamento:** a referência, a data e quem lançou, depois de faturada.
- **Serviços realizados:** setor, quem executou, início, término e quem finalizou.
- **Histórico:** a linha do tempo da venda.

## Filtrar o histórico

O histórico tem o filtro `Financeiro` / `Tudo`:

- **Financeiro:** só os eventos que importam para a cobrança, como venda registrada, valor ou condição alterados, liberação, lançamento e serviços cancelados ou excluídos.
- **Tudo:** também os eventos da execução (distribuições, inícios, conclusões).

## Faturar daqui

Se a venda estiver liberada, o botão `Faturar` abre o mesmo modal de Cobranças. Veja [Faturar uma venda](faturar).
