# 09. Notificações por e-mail

O sistema avisa por **e-mail**. Não há notificação dentro do sistema. O objetivo é avisar **só quem tem algo a fazer**, no momento em que isso acontece, e juntar os atrasos num **resumo diário**.

Decisão de origem: ADR 0010 (aprovado em 15/10/2026).

---

## 1. Regras gerais

1. Só manda e-mail quando a pessoa **tem algo a fazer**. Nada de e-mail "só para ficar sabendo".
2. Nunca manda e-mail para **quem fez a ação**.
3. **Um e-mail por pessoa por ação.** Exemplos: uma venda com três serviços no mesmo setor gera um e-mail para o setor; uma distribuição com duas tarefas para a mesma pessoa gera um e-mail para ela.
4. Atrasos e pendências chegam no **resumo diário**, não um e-mail por item.
5. Só recebe quem está **ativo** e tem e-mail.
6. Uma falha no envio **nunca** impede a ação que o disparou: a venda, a distribuição ou o lançamento são gravados mesmo assim, e a falha vai para o log.
7. O e-mail sai **depois** que a ação é gravada. Se a ação falhar, nada é enviado.

---

## 2. Os e-mails

| E-mail | Quando sai | Para quem | O que traz |
|---|---|---|---|
| **Chegaram serviços para o setor** | Venda registrada, serviço acrescentado a uma venda, ou serviço movido para outro setor (troca de catálogo ou "levar os serviços em aberto"). | Quem **organiza** o setor do serviço (módulo 01), um e-mail por setor. | OS, cliente, serviço e prioridade de cada serviço que chegou; link para o Painel do setor. |
| **Nova tarefa para você** | Distribuição, nova tarefa ou troca de responsável. | O **responsável**. Numa troca, só o novo responsável. | As tarefas que a pessoa ganhou nessa ação: OS, cliente, serviço, descrição, prazo e prioridade; link para Meus serviços. |
| **OS liberada para cobrança** | A OS foi liberada, na venda ou na conclusão do último serviço. | Quem tem `financeiro.registrar_cobranca`. | Cliente, valor, quando e por quem foi liberada; link para o Resumo para faturar. Quando houve execução, traz também o **resumo da execução** (seção 2.1). |
| **OS faturada** | O financeiro registrou o lançamento. | Só o **vendedor** (quem registrou a venda). | Cliente, valor, referência do lançamento, data e quem registrou; link para o Resumo da venda. |
| **Resumo do dia** | Uma vez por dia útil, pelo comando agendado (seção 3). | Cada pessoa **com pendência**. | Ver seção 3. |
| **Redefinição de senha** | A pessoa pediu na tela de login. | A própria pessoa. | O link para criar a senha nova. Não depende do interruptor geral (seção 4). |

### 2.1 Resumo da execução (no e-mail de liberação)

- Dias da venda até a liberação.
- Média de dias em execução por serviço.
- Quem trabalhou na OS, contando todos os serviços.
- Por tarefa: pessoa, serviço, quando recebeu, início, término, **dias parada** (da atribuição ao início) e dias em execução.

A OS liberada na venda não tem execução e sai sem esse bloco.

### 2.2 O que não vira e-mail

A ciência do setor, o início e o fim de cada serviço, as mudanças de prazo e as pausas explicadas ficam **registradas** (linha do tempo, painéis), mas não geram e-mail.

---

## 3. Resumo diário de pendências

| Para quem | O que entra |
|---|---|
| Quem **organiza** um setor | Serviços **sem ciência ou sem distribuição** há `DIAS_CONFERENCIA_SEM_DISTRIBUIR` dias (3) ou mais, contados da chegada. Serviços **sem movimentação** há `DIAS_ALERTA_SEM_MOVIMENTACAO` dias (7) ou mais, com quem está e há quanto tempo. A pausa explicada tira o serviço da lista, e um serviço que está nas duas listas aparece só na primeira. Tudo separado por setor. |
| Quem tem `financeiro.registrar_cobranca` | OS **liberadas há `DIAS_ALERTA_SEM_LANCAMENTO` dias (3) ou mais sem faturar**, com valor e há quanto tempo. |

- Quem não tem pendência **não recebe** nada.
- O resumo sai pelo comando `python manage.py enviar_resumo_diario`, que precisa ser **agendado no servidor** (cron) para rodar de segunda a sexta, de manhã. **Pendente: o agendamento ainda não foi feito.**

---

## 4. Configuração

| Variável (`.env`) | O que faz |
|---|---|
| `EMAIL_NOTIFICATIONS_ENABLED` | Liga ou desliga **todos** os e-mails deste módulo, menos o de senha. |
| `EMAIL_BACKEND` | O envio real é `smtp.EmailBackend`. Para testar sem enviar, use `console.EmailBackend`: os e-mails saem no terminal. |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` | O servidor de envio. Hoje é o Hostinger, enviando como nao-responder. |
| `FRONTEND_URL` | A base dos links dos e-mails. |
| `DIAS_CONFERENCIA_SEM_DISTRIBUIR`, `DIAS_ALERTA_SEM_MOVIMENTACAO`, `DIAS_ALERTA_SEM_LANCAMENTO` | Os limites do resumo diário (padrões 3, 7 e 3). |

**Cuidado no ambiente de desenvolvimento:** o banco de dev tem os e-mails reais da equipe. Com SMTP ligado, qualquer teste chega às caixas de verdade. No dev, use o envio pelo console.

---

## 5. Onde está no código

| Assunto | Arquivo |
|---|---|
| Envio, destinatários e conteúdo | `apps/ordens_servico/emails.py` |
| Disparos | `services/venda.py` (chegada), `services/execucao.py` (distribuição), `signals.py` (tarefa e faturada), `models/ordem_servico.py` (liberação), `apps/catalogo/services.py` (serviços movidos) |
| Resumo diário | `services/resumo_diario.py`, comando `enviar_resumo_diario` |
| Modelos dos e-mails | `apps/ordens_servico/templates/emails/` |
| Recuperação de senha | `apps/contas/emails.py` |
