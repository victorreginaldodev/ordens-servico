# Status da Ordem de Servico

## Objetivo

O status da Ordem de Servico deve representar automaticamente a situacao real da execucao operacional.

A atualizacao segue o fluxo documentado em `documentation/flows/propagacao-de-status.md`:

```txt
Tarefa -> Servico -> Ordem de Servico
```

## Regra da Ordem de Servico

O status da Ordem de Servico e gerenciado pelo sistema e calculado a partir dos status dos servicos relacionados.

Estados previstos:

```txt
Aberta
Em Andamento
Concluida
Cancelada
```

Regras:

- Se a OS estiver cancelada, o status nao deve ser alterado automaticamente pela propagacao.
- Se todos os servicos estiverem concluidos, a OS deve ficar concluida.
- Se houver ao menos um servico em andamento ou concluido, mas nem todos estiverem concluidos, a OS deve ficar em andamento.
- Se nao houver execucao iniciada, a OS deve ficar aberta.

## Cancelamento

O cancelamento nao e propagado automaticamente.

Cancelar tarefa nao cancela servico.
Cancelar servico nao cancela OS.
Cancelar OS deve ser acao explicita de usuario autorizado.

## Campo legado de conclusao

O campo `concluida` continua existindo como compatibilidade operacional e deve ser sincronizado com o status:

- `concluida = True` quando `status = concluida`
- `concluida = False` nos demais status

## Campos gerenciados pelo sistema

Os seguintes campos nao devem ser editados manualmente pelo usuario:

- `status`
- `concluida`
