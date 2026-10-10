# Contratos e Notificacoes

## Objetivo

Permitir que uma Ordem de Servico represente um contrato e notifique o time quando um novo contrato for criado.

## Campos da Ordem de Servico

- `contrato`
- `objeto_contrato`
- `contrato_data_inicio`
- `contrato_data_fim`
- `gestor_contrato_nome`
- `gestor_contrato_email`
- `gestor_contrato_telefone`

## Validacao

Quando `contrato = True`, o usuario deve preencher:

- Objeto do contrato
- Data de inicio
- Data de fim

Os dados do gestor do contrato sao opcionais.

## Notificacao

Ao criar uma OS com `contrato = True`, todos os usuarios ativos do sistema devem receber um e-mail informando a criacao do contrato.

Em ambiente de desenvolvimento, o backend de e-mail do Django deve usar console para evitar disparos reais.
