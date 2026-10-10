# Prioridade da Ordem de Servico

## Objetivo

A prioridade e um atributo de negocio da Ordem de Servico usado para organizacao operacional.

## Estados

Estados previstos:

```txt
Baixa
Media
Alta
```

## Regra inicial

Como o sistema nao possuia esse atributo antes, todas as Ordens de Servico existentes devem ser migradas com prioridade baixa.

Novas Ordens de Servico tambem devem nascer com prioridade baixa quando nenhum valor for informado.

## Edicao

Diferente dos campos derivados de execucao, a prioridade pode ser alterada pelo usuario.

Ela representa uma decisao operacional humana, nao uma consequencia automatica das tarefas ou servicos.
