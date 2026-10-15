---
titulo: Condição de pagamento
resumo: É o que foi combinado com o cliente. O sistema registra a condição para o financeiro; ele não gera boletos nem controla as parcelas.
permissoes: financeiro.ver_valores
ver: liberar, quem-pode
atualizado: 15/10/2026
---

## À vista ou parcelado

| Tipo | Quando usar |
|---|---|
| **À vista** | O cliente paga tudo de uma vez. |
| **Parcelado** | O cliente paga em parcelas mensais, no mínimo 2. Contratos mensais, como gestão em 24x, também entram aqui. |

## Forma de pagamento

Boleto (já vem marcado), PIX, transferência, crédito, débito, dinheiro, cheque ou outro. A forma vale para a venda toda.

## Vencimento

Escolha **uma** das duas formas:

- **Numa data:** a data combinada com o cliente.
- **Dias após a nota:** de 1 a 365 dias depois da emissão da nota.

No parcelado, o vencimento é o da 1ª parcela.

## Demais parcelas

No parcelado, você pode dizer o dia do mês (1 a 31) em que vencem as parcelas da 2ª em diante. Se deixar vazio, elas vencem no mesmo dia do mês da 1ª.

> [!DICA] Dia que não existe no mês
> Se o dia for 31 e o mês tiver 30 dias, a parcela vence no último dia do mês.

## Contato da nota e observações

- **Para quem enviar a nota:** nome e e-mail do contato no cliente. A tela sugere o representante do cliente.
- **Observações de pagamento e faturamento:** o que o financeiro precisa saber. Por exemplo: sinal já pago, número do pedido de compra, outro e-mail para a nota. Só quem vê valores enxerga.

## Como a condição aparece

O sistema monta uma frase com a condição. Ela aparece igual nas vendas, no financeiro e nos e-mails:

```exemplo
À vista, vence 10/08/2026
Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 21 dias após a nota, demais todo dia 10
```
