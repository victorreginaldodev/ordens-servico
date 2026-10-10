# Notificacoes por e-mail

## Objetivo

Avisar por e-mail os usuarios certos quando eventos relevantes de negocio
acontecem, em vez de depender de checagem manual no sistema.

## Eventos notificados

- **Contrato criado** (`notificar_criacao_contrato`): dispara ao criar uma
  `OrdemServico` com `contrato=True`. Segmentado em dois templates — quem
  tem permissao de ver valores financeiros (`usuario_pode_ver_valores`)
  recebe o e-mail com valores, quem nao tem recebe a versao sem valores.
- **Tarefa atribuida** (`notificar_atribuicao_tarefa`): dispara para o
  `responsavel` quando uma tarefa e criada ou tem o responsavel trocado
  (comparando o `responsavel_id` anterior via signal `pre_save`).
- **Liberacao de cobranca** (`notificar_liberacao_cobranca`): dispara para
  Gestor Financeiro e Financeiro quando uma OS ou OSO fica liberada para
  cobranca (seja na criacao com `cobranca_imediata`/`revisao_cliente`, seja
  na sincronizacao automatica de status).
- **Cobranca realizada** (`notificar_cobranca_realizada`): dispara para
  Gestor Financeiro, Financeiro, Gestor Comercial e Comercial quando a
  cobranca de uma OS ou OSO e marcada como realizada.

## Como e disparado

Os models (`OrdemServico.save()`, `OrdemServico.sincronizar_status_e_cobranca()`)
e os signals (`apps/ordens_servico/signals.py`, via `post_save` em
`OrdemServico`, `OrdemServicoOperacional` e `Tarefa`) chamam as funcoes de
`apps/ordens_servico/emails.py` dentro de `transaction.on_commit(...)`, para
so enviar o e-mail se a transacao de banco realmente for confirmada.

Os signals cacheiam o estado anterior relevante em `pre_save`
(`_responsavel_anterior_id`, `_cobranca_realizada_anterior`,
`_liberacao_anterior`) para so notificar em transicoes reais, nao em todo
`save()`.

## Templates

Novos templates em `apps/ordens_servico/templates/emails/`:
`base_email.html`, `liberacao_cobranca.html`, `cobranca_realizada.html`,
`tarefa_atribuida.html`. O template `novo_contrato_os.html` existente foi
adaptado para os dois modos (com/sem valores).

## Impacto

Nenhum campo ou endpoint novo. O impacto e efeito colateral: acoes que
antes eram silenciosas (criar OS com contrato, atribuir tarefa, liberar ou
realizar cobranca) agora disparam e-mail de verdade em producao. Vale
confirmar a lista de destinatarios por tipo de usuario
(`TipoUsuario.GESTOR_FINANCEIRO`, `FINANCEIRO`, `GESTOR_COMERCIAL`,
`COMERCIAL`) antes de repassar isso para o time.
