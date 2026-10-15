---
titulo: Etapas do serviço e da tarefa
resumo: As etapas mostram em que pé está o trabalho. O sistema calcula a etapa sozinho, a partir do que as pessoas fazem.
ver: receber, vendas/status
atualizado: 15/10/2026
---

## Etapas do serviço

```fluxo
Novo
A distribuir
Distribuído
Em andamento
Concluído
```

| Etapa | Quando | O que fazer |
|---|---|---|
| **Novo** | Chegou ao setor e ninguém confirmou o recebimento. | Quem distribui confirma ou já distribui. |
| **A distribuir** | O setor confirmou, mas ainda não escolheu quem faz. | Quem distribui escolhe o responsável. |
| **Distribuído** | Tem tarefas, e nenhuma começou. | Os responsáveis começam. |
| **Em andamento** | Alguma tarefa começou ou terminou, e ainda falta alguma. | Os responsáveis terminam. |
| **Concluído** | Todas as tarefas ativas terminaram. | Nada. |

Se todas as tarefas de um serviço forem excluídas ou canceladas, ele volta para **A distribuir**.

## Etapas da tarefa

```fluxo
Nova
A iniciar
Em andamento
Concluída
```

| Etapa | Quando |
|---|---|
| **Nova** | O responsável ainda não confirmou o recebimento. |
| **A iniciar** | O responsável confirmou, mas não começou. |
| **Em andamento** | O responsável clicou em Iniciar. |
| **Concluída** | O responsável clicou em Concluir. |

## O que o sistema calcula no serviço

- **Prazo:** o maior prazo entre as tarefas. Sem prazo nas tarefas, o serviço fica sem prazo.
- **Início:** quando a primeira tarefa começou.
- **Término e quem finalizou:** a data e o responsável da última tarefa concluída.
