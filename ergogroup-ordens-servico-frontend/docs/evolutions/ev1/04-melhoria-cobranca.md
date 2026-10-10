# Melhoria no Sistema de Cobranca

## Objetivo

Registrar na Ordem de Servico quando e por quem ela foi liberada para faturamento.

Esses dados sao marcos historicos de cobranca e devem ser gerenciados pelo sistema.

## Campos

Campos da Ordem de Servico:

- `liberada_para_faturamento`
- `liberada_para_faturamento_em`
- `liberada_para_faturamento_por`
- `faturada_por`

## Cobranca imediata

Quando a OS nasce com `cobranca_imediata = True`, a liberacao deve ser preenchida na criacao:

- `liberada_para_faturamento = True`
- `liberada_para_faturamento_em = data/hora da criacao`
- `liberada_para_faturamento_por = usuario criador`

Apos isso, esses campos nao devem ser alterados automaticamente.

## Cobranca nao imediata

Quando a OS nao tem cobranca imediata, ela deve ser liberada quando chegar ao status concluida por propagacao.

Regras:

- Todos os servicos da OS precisam estar concluidos.
- A data de liberacao vem da conclusao da ultima tarefa do ultimo servico concluido.
- O usuario da liberacao vem do responsavel pela ultima tarefa concluida do ultimo servico concluido.

## Servico terminado por

O Servico deve registrar `terminado_por`, porque agrega varias tarefas e varios responsaveis possiveis.

Regra:

- `terminado_por` recebe o responsavel da ultima tarefa concluida do servico.

## Imutabilidade do marco de liberacao

Depois que uma OS for liberada para faturamento, os campos de liberacao nao devem ser sobrescritos automaticamente.

Caso exista futuramente uma regra de reabertura ou estorno operacional, ela deve ser tratada como fluxo explicito.

## Faturamento

Quando uma OS for faturada pela API, o sistema deve registrar:

- `faturada = True`
- `numero_nf`
- `data_faturamento`
- `faturada_por = usuario da requisicao`

Na primeira migracao de dados, OS ja faturadas devem receber `faturada_por` com o usuario de id 3.

## MiniOS / OS Operacional

A MiniOS / OS Operacional tambem precisa registrar rastreabilidade de cobranca.

Campos:

- `gera_cobranca`
- `data_liberacao_cobranca`
- `liberada_cobranca_por`
- `faturada`
- `numero_nf`
- `faturada_por`

Regra:

- Se `revisao_cliente = True`, entao `gera_cobranca = True`.
- Se `revisao_cliente = False`, entao `gera_cobranca = False`.
- `gera_cobranca` e gerenciado pelo sistema a partir de `revisao_cliente`.

Quando a MiniOS gera cobranca e e finalizada:

- `data_liberacao_cobranca` recebe a data/hora de liberacao.
- `liberada_cobranca_por` recebe o responsavel da MiniOS.

Como a MiniOS possui um unico responsavel, nao ha necessidade de um campo separado `concluida_por`.

Quando uma MiniOS for faturada pela API:

- `faturada = True`
- `numero_nf`
- `faturada_por = usuario da requisicao`

Na primeira migracao de dados, MiniOS ja faturadas devem receber `faturada_por` com o usuario de id 3.
