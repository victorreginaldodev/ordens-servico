---
titulo: Editar uma venda
resumo: A edição usa a mesma página da Nova venda, sem a parte de serviços.
permissoes: os.gerenciar
tela: Resumo da venda → Editar venda
rotas: /vendas/:id/editar
ver: condicao, servicos
atualizado: 15/10/2026
---

## O que dá para mudar

O cliente, a data da venda, a prioridade e o pagamento. O pagamento só aparece para quem vê valores. Ao terminar, clique em `Salvar alterações`.

## O que não muda por aqui

- **Serviços:** acrescente, troque ou exclua pelo Resumo da venda. Veja [Serviços depois da venda](servicos).
- **Status, liberação e faturamento:** o sistema calcula sozinho.

## Vencimento ao editar

Se você trocar o vencimento de "numa data" para "dias após a nota" (ou o contrário), o que estava antes é apagado. Se passar de parcelado para à vista, o dia das demais parcelas também é apagado.

> [!DICA] Venda antiga sem vencimento
> Dá para editar o resto normalmente. Se mexer no pagamento, o vencimento passa a ser obrigatório.
