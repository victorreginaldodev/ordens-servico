# ADR 0010: Notificações por e-mail

## Status
Aceito em 15/10/2026. O usuário mapeou os pontos de notificação do fluxo e aprovou a proposta do agente "como está". **Implementado no backend em 15/10/2026.**

| # | Tema | Situação |
|---|---|---|
| 1 | Só e-mail; nada de notificação dentro do sistema | **Decidido** |
| 2 | Regras para não encher ninguém de e-mail | **Decidido** |
| 3 | Os quatro e-mails de ação | **Decidido** |
| 4 | O que não vira e-mail (fica como registro e indicador) | **Decidido** |
| 5 | Resumo diário de pendências | **Decidido** |
| 6 | Conteúdo do e-mail de liberação | **Decidido** |

Completa o ADR 0008, seção 5 (aviso de chegada ao setor), e o ADR 0007 (o sistema avisa a liberação).

## Contexto
O usuário listou os pontos do fluxo em que alguém deveria saber de algo, para os dois tipos de venda:

- **Faturar na conclusão:** venda registrada, confirmação de que chegou ao setor de execução, ciência do responsável pelo setor, distribuição, início e fim da execução, quantos dias em média ficou na execução, quando e por quem foi liberada para faturamento (quem executou o último serviço), quem trabalhou na OS contando todos os serviços (com início, término e dias parados de cada um) e por quem foi faturada.
- **Faturar na venda:** venda registrada, o financeiro é notificado, o financeiro registra o faturamento.

Pediu para notificar só o necessário e usar somente e-mail.

## Decisões

### 1. Canal
Só e-mail. Não há notificação dentro do sistema. O interruptor `EMAIL_NOTIFICATIONS_ENABLED` liga e desliga todos os e-mails deste ADR.

### 2. Regras
1. Só manda e-mail quando a pessoa **tem algo a fazer**. Nada de e-mail "só para ficar sabendo".
2. Nunca manda e-mail para **quem fez a ação**. A pessoa é lida do contexto da requisição (auditoria) na hora em que o envio é agendado.
3. **Um e-mail por pessoa por ação.** Uma venda com vários serviços no mesmo setor gera um e-mail para o setor; uma distribuição com várias tarefas para a mesma pessoa gera um e-mail para ela.
4. Atrasos e pendências chegam no **resumo diário**, não um e-mail por item.

### 3. Os quatro e-mails de ação

| Evento | Para quem | Template |
|---|---|---|
| Venda registrada ou serviço acrescentado (chegou ao setor) | Quem organiza o setor do serviço (`Setor.organizadores()`) | `servicos_chegaram.html` |
| Distribuição ou troca de responsável | O responsável da tarefa | `tarefa_atribuida.html` |
| OS liberada para faturamento (na venda ou na conclusão) | Quem tem `financeiro.registrar_cobranca` | `liberacao_cobranca.html` |
| OS faturada (lançamento registrado) | Só o vendedor (`OrdemServico.criado_por`) | `cobranca_realizada.html` |

Antes de 15/10/2026, o e-mail de faturada ia para todos que veem valores e gerenciam vendas ou registram cobranças; agora vai só para o vendedor.

No fluxo "faturar na venda", o setor recebe o aviso de chegada e o financeiro recebe a liberação no mesmo momento. No fim da execução não sai um segundo aviso de liberação.

### 4. O que não vira e-mail
O sistema já registra estes pontos (data e autor) e eles aparecem na linha do tempo, nos painéis e no Resumo da venda:

- confirmação de chegada ao setor: é o próprio aviso de chegada;
- ciência do responsável pelo setor (`Servico.recebido_em/recebido_por`);
- início da execução (`data_inicio`);
- fim de cada serviço (`data_termino`, `terminado_por`);
- dias na execução, quem trabalhou, início, término e dias parados de cada pessoa: são indicadores, que também vão no e-mail de liberação (seção 6).

### 5. Resumo diário de pendências
Um e-mail por pessoa, só quando ela tem pendência. O comando `python manage.py enviar_resumo_diario` precisa ser agendado no servidor (cron) para rodar uma vez por dia útil, de manhã.

- **Para quem organiza um setor:** serviços sem ciência ou sem distribuição há `DIAS_CONFERENCIA_SEM_DISTRIBUIR` dias (3) ou mais, contados da chegada; e serviços sem movimentação há `DIAS_ALERTA_SEM_MOVIMENTACAO` dias (7) ou mais. A ciência do alerta ("estou ciente, deixar assim") tira o serviço da lista. Um serviço que está nas duas listas aparece só na primeira.
- **Para quem tem `financeiro.registrar_cobranca`:** OS liberadas há `DIAS_ALERTA_SEM_LANCAMENTO` dias (3) ou mais sem faturar.

### 6. Conteúdo do e-mail de liberação
Além do cliente, do valor e de quando e por quem a OS foi liberada (na conclusão, quem terminou o último serviço), o e-mail traz o resumo da execução quando houve trabalho:

- dias da venda à liberação;
- média de dias em execução por serviço (início ao término de cada serviço);
- quem trabalhou na OS, contando todos os serviços;
- por tarefa: pessoa, serviço, quando recebeu, início, término, dias parada (da atribuição ao início) e dias em execução.

A OS liberada na venda não tem execução e sai sem esse bloco.

## Implementação
- `apps/ordens_servico/emails.py`: envio, regras de destinatário (`excluir` para quem fez a ação), `notificar_distribuicao`, `resumo_da_execucao`, `notificar_venda_faturada` e `notificar_resumo_diario`.
- `apps/ordens_servico/services/execucao.py` (`distribuir`): marca as tarefas criadas para que o sinal por tarefa não envie e manda um e-mail por pessoa.
- `apps/ordens_servico/services/resumo_diario.py` e o comando `enviar_resumo_diario`.
- Template novo: `emails/resumo_diario.html`.
- Testes: `apps/ordens_servico/tests_notificacoes.py`.
