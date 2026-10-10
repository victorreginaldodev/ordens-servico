# Auditoria

## Objetivo

Registrar os eventos criticos das principais entidades operacionais:

- Ordem de Servico
- Servico
- Tarefa
- MiniOS / OS Operacional

A auditoria deve permitir rastrear acoes humanas, efeitos automaticos do sistema e uma linha base inicial criada a partir dos dados existentes.

## Entidades auditadas

### Ordem de Servico

Eventos criticos:

- Criacao
- Atualizacao de dados comerciais
- Alteracao de prioridade
- Mudanca e propagacao de status
- Liberacao para faturamento
- Faturamento
- Dados de contrato
- Exclusao

### Servico

Eventos criticos:

- Criacao
- Atualizacao de descricao/repositorio
- Mudanca e propagacao de status a partir das tarefas
- Inicio e termino inferidos pelas tarefas
- Usuario que terminou o servico
- Exclusao

### Tarefa

Eventos criticos:

- Criacao
- Alteracao de responsavel, descricao ou servico
- Mudanca de status
- Inicio e termino automaticos
- Exclusao

### MiniOS / OS Operacional

Eventos criticos:

- Criacao
- Alteracao de cliente, servico, responsavel, quantidade ou descricao
- Mudanca de status
- Inicio e termino automaticos
- Revisao do cliente e geracao de cobranca
- Liberacao de cobranca
- Faturamento
- Exclusao

## Modelo

A auditoria usa uma model generica `RegistroAuditoria`, com:

- Entidade auditada
- ID do objeto
- Representacao textual do objeto
- Acao
- Origem
- Motivo
- Usuario
- Alteracoes antes/depois em JSON
- Snapshot do objeto em JSON
- IDs auxiliares para timeline de OS, Servico, Tarefa e MiniOS
- Dados da requisicao, quando disponiveis

## Backfill inicial

Como o sistema nao possuia auditoria completa, a populacao inicial e parcial e inferida.

Os registros criados pela migration de backfill usam:

```txt
origem = migracao
acao = backfill ou acao inferida
motivo = Evento inferido a partir do estado atual do sistema. Historico detalhado anterior indisponivel.
```

Esse backfill cria:

- Um snapshot inicial de cada OS, Servico, Tarefa e MiniOS.
- Eventos inferidos de conclusao/status quando ha status ou datas compativeis.
- Eventos inferidos de liberacao de faturamento.
- Eventos inferidos de faturamento.
- Eventos inferidos de contrato.
- Eventos inferidos de liberacao de cobranca da MiniOS.

## Limitacao conhecida

O backfill nao reconstroi o historico real anterior.

Ele cria uma linha base util para consulta e BI, e a partir da implantacao da auditoria os novos eventos passam a ser registrados com antes/depois real.
