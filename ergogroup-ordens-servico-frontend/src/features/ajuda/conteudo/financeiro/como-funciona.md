---
titulo: Como funciona o faturamento
resumo: O sistema não emite nota nem boleto. Ele avisa quando uma venda pode ser faturada, junta os dados para o lançamento e guarda o registro de que ela foi faturada.
ver: cobrancas, vendas/liberar
atualizado: 15/10/2026
---

## O que o sistema faz

A nota fiscal, o boleto e o controle das parcelas ficam no sistema financeiro da empresa. Aqui, o sistema:

1. **Registra** a condição combinada na venda: valor, à vista ou parcelado, vencimento, forma, contato da nota e observações.
2. **Libera** a venda para faturar no momento certo e **avisa** o financeiro por e-mail.
3. **Junta** num lugar só tudo o que o financeiro precisa para lançar no sistema financeiro.
4. **Guarda** o registro do lançamento: a referência (nota ou código), a data e quem lançou.

A cobrança é **por venda**: uma venda gera um lançamento, mesmo com vários serviços de vários setores. No parcelado, o sistema só informa a quantidade, o valor e os vencimentos das parcelas.

## As três situações de uma venda

```fluxo
Em execução
Para faturar
Faturada
```

| Situação | Quando |
|---|---|
| **Em execução** | A venda ainda não foi liberada. É a previsão do que vem. |
| **Para faturar** | A venda foi liberada e ainda não foi lançada. É a fila do financeiro. |
| **Faturada** | O lançamento foi registrado. |

Toda venda está em uma, e só uma, dessas situações.

## Quando a venda é liberada

Depende do que foi escolhido na venda: **na venda** (libera ao registrar) ou **quando todos os serviços terminarem** (libera quando o último serviço termina). A liberação é automática e não volta atrás. Veja [Liberar para faturamento](vendas/liberar).

## Os avisos por e-mail

- **OS liberada para cobrança:** chega para quem registra cobrança, com o cliente, o valor e, quando houve execução, o resumo de quem trabalhou e quanto tempo levou.
- **OS faturada:** chega para quem vendeu, quando o financeiro registra o lançamento.
