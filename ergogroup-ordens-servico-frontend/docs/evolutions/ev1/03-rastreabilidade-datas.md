# Rastreabilidade de Datas

## Objetivo

As models principais precisam registrar datas operacionais criadas pelo sistema, sem depender de preenchimento manual pelo usuario.

Models cobertas:

- Ordem de Servico
- Servico
- Tarefa
- MiniOS / OS Operacional

## Ordem de Servico

Campos:

- `data_criacao`: data comercial/operacional da OS, mantida por compatibilidade.
- `criada_em`: data e hora real de criacao no sistema.
- `data_atualizacao`: data e hora da ultima atualizacao.

Migracao inicial:

- `criada_em` deve ser populada com `data_criacao`.
- Quando nao houver referencia confiavel, usar a data/hora da migracao como fallback.

## Servico

Campos:

- `data_inicio`: primeira data de inicio entre as tarefas relacionadas.
- `data_termino`: data de conclusao da ultima tarefa concluida quando todas as tarefas estiverem concluidas.
- `data_conclusao`: mantida por compatibilidade, sincronizada com `data_termino`.
- `criado_em`: data e hora estimada da criacao do servico.
- `atualizado_em`: data e hora da ultima atualizacao.

Migracao inicial:

- `data_inicio` vem da menor `data_inicio` das tarefas.
- `data_termino` vem da `data_conclusao` existente ou da ultima `data_termino` das tarefas concluidas.
- `criado_em` vem da primeira data conhecida do servico, com fallback para a data da OS.

## Tarefa

Campos:

- `data_inicio`: preenchida automaticamente quando a tarefa entra em andamento.
- `data_termino`: preenchida automaticamente quando a tarefa e concluida.
- `criada_em`: data e hora estimada da criacao da tarefa.
- `atualizado_em`: data e hora da ultima atualizacao.

Nao ha campo `concluida_por`, porque a tarefa pertence a um unico responsavel e somente ele deve concluir a tarefa.

Migracao inicial:

- `criada_em` vem de `data_inicio`, depois `data_termino`, depois `data_criacao` da OS relacionada.
- Quando nao houver referencia confiavel, usar a data/hora da migracao como fallback.

## MiniOS / OS Operacional

Campos:

- `data_recebimento`: data operacional recebida do processo atual.
- `data_inicio`: preenchida automaticamente quando a OS Operacional entra em andamento.
- `data_termino`: preenchida automaticamente quando a OS Operacional e finalizada.
- `criada_em`: data e hora estimada da criacao no sistema.
- `atualizado_em`: data e hora da ultima atualizacao.

Nao ha campo `concluida_por`, porque a MiniOS / OS Operacional possui um unico responsavel.

Migracao inicial:

- `criada_em` vem de `data_recebimento`, depois `data_inicio`, depois `data_termino`.
- Quando nao houver referencia confiavel, usar a data/hora da migracao como fallback.
