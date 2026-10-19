---
titulo: Conferência do faturamento
resumo: A conferência verifica, na hora em que você abre, se alguma venda ficou para trás: concluída sem liberar, liberada sem faturar ou alterada depois da liberação.
permissoes: financeiro.registrar_cobranca
tela: Conferência do faturamento
url: /cobrancas/conferencia
rotas: /cobrancas/conferencia
ver: cobrancas, resumo-para-faturar
atualizado: 19/10/2026
---

## Garantias do sistema

São as regras da liberação. Elas **devem dar sempre 0**:

- toda venda com os serviços concluídos está liberada;
- toda venda com liberação na venda está liberada;
- todo serviço está na etapa que as tarefas dele indicam;
- toda OS operacional finalizada que gera cobrança está liberada.

Se alguma der mais que 0, algum dado ficou fora de sincronia. O botão `Corrigir agora` refaz a sincronização, só com o que a regra já manda. Cada correção fica registrada.

## Atenções

São pontos em que a liberação depende de alguém, ou em que algo mudou depois:

| Atenção | Quando aparece |
|---|---|
| **Trabalho concluído, OS parada** | Há serviço concluído há 15 dias ou mais, e o que falta está parado há 7 dias ou mais. Talvez alguém não tenha concluído no sistema. |
| **Serviço sem distribuir** | Chegou ao setor há 3 dias ou mais e ninguém distribuiu. |
| **Vencimento chegando** | O vencimento combinado é em até 7 dias, ou já passou, e a venda ainda não foi liberada. |
| **Aguardando lançamento** | Liberada há 3 dias ou mais sem faturar. |
| **Mudou depois da liberação** | Serviço acrescentado, cancelado ou excluído, ou valor e condição alterados, depois da liberação. Confira antes de faturar. |
| **Mudou depois de faturada** | Algo mudou depois do lançamento (nos últimos 90 dias). Ajuste no sistema financeiro. |
| **OSO aguardando lançamento** | OS operacional liberada há 3 dias ou mais sem faturar. |
| **OSO faturada sem referência** | OS operacional marcada como cobrada sem a NF ou o código do lançamento (ou com a NF "0"). Confira no sistema financeiro. |

## O que cada item mostra

A venda (ou a OS operacional) e o cliente, o serviço e o setor (quando o problema é de um serviço), **com quem está** e o detalhe. Por exemplo: "Chegou ao setor há 5 dias".

As mesmas pendências aparecem no resumo da conferência no cabeçalho de Cobranças e no resumo para faturar de cada venda e de cada OS operacional.
