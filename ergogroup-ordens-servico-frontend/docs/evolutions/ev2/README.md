# EV2 - Evolucoes do sistema de OS (v4)

## Escopo global

A EV2 documenta, de forma retroativa, o que foi de fato entregue na branch
`refactor/catalogo-ordens-servico-cobranca` (commits `73a12d4` ate `cd49278`,
06/07 a 10/07/2026), que fechou a versao v4 do sistema.

Diferente da versao anterior deste documento — que descrevia campos e regras
planejados e nunca chegaram a ser implementados — esta versao registra apenas
mudancas que existem em codigo, migration ou endpoint hoje. Cada arquivo foi
escrito a partir do diff real dos commits, nao de intencao.

## Premissas

- So entra aqui o que tem commit correspondente na branch.
- Mudanca de nomenclatura/estrutura (rename de app, campo ou dominio) e
  documentada junto com o motivo, nao só o "de/para".
- Onde o comportamento mudou de um jeito que pode ser inesperado (ex: um
  campo que era automatico virou manual), isso e destacado explicitamente
  em vez de descrito como se fosse sempre tiver sido assim.

## Evolucoes detalhadas em arquivos

1. [Consolidacao dos apps de OS e catalogo](01-consolidacao-apps.md)
2. [Gestao tecnica e produtividade](02-gestao-tecnica-produtividade.md)
3. [Seguranca da documentacao da API](03-seguranca-documentacao-api.md)
4. [Reorganizacao de apps/analise](04-reorganizacao-analise.md)
5. [Notificacoes por e-mail](05-notificacoes-email.md)
6. [Ajustes finais da v4](06-ajustes-finais-v4.md)

## Commits de origem

```
73a12d4 Consolida ordem_servico/servicos/tarefas em ordens_servico e catalogo
95831ea Reverte squash de migrations: restaura ordem_servico/servicos/tarefas
d1d1477 Apaga ordem_servico/servicos/tarefas de vez com migrations auto-suficientes
4863ab0 Adiciona prioridade/prazo/estimativas pra gestao tecnica e produtividade
e92ab4e Exige autenticacao para acessar Swagger/Redoc/schema
0370ede Reorganiza apps/analise em financeiro/operacional e corrige indicadores
cd49278 finaliza a versao v4 do sistema
```
