# ADR 0005: Prazo como único parâmetro de planejamento

## Status
Aceito e implementado (10/10/2026): migrações `ordens_servico/0025` a `0028` e `0035` (prazo do serviço calculado a partir das tarefas). Ver a fase 6 de `docs/plano-execucao-comercial-financeiro.md`.

## Contexto
O sistema tinha horas estimadas e complexidade no catálogo, no serviço, na tarefa e na OS operacional, com regras de cópia e herança entre eles (`docs/flows/horas-estimadas-prazos-e-indicadores.md` e ADR 0001).

Na análise do fluxo de execução (ADR 0006), o usuário definiu em 10/10/2026:
- **O único parâmetro de planejamento é o prazo, que é uma data.** Horas e complexidade devem ser removidas também do serviço e da tarefa.
- A duração de um serviço depende de fatores externos do dia a dia, como o tipo de serviço, o cliente e a tarefa a executar. Um mesmo serviço pode levar X dias ou 2X dias. **O sistema não deve tentar estimar nem verificar isso de forma determinística**, nem guardar no catálogo quanto um serviço demora em média.

Os dados do dev confirmam que as horas não são usadas: em 10/10/2026, só 2 das 1.538 tarefas tinham horas estimadas.

## Decisão
1. Remover `horas_estimadas` e `complexidade` de `Servico` e `Tarefa`, com as propriedades `*_efetiva(s)`, os campos dos serializers e do admin, e os indicadores que dependem deles em `apps/analise` (horas entregues e complexidade média em produtividade; horas e complexidade no tempo por catálogo).
2. O **prazo** (data) é o único parâmetro de planejamento da execução. É definido por quem distribui o trabalho, no momento da distribuição (ADR 0006).
3. Os indicadores de carga e de controle passam a se basear só em prazo, status e datas de movimentação (ADR 0006).
4. Nenhum prazo padrão é calculado pelo sistema nem guardado no catálogo.

## Pontos de atenção para a implementação
- Antes de remover as colunas, verificar no banco quantos registros têm valor. Em 10/10/2026 no dev: 2 tarefas com horas. O que existir se perde; registrar a contagem na migração.
- A OS operacional e o catálogo operacional também têm horas e complexidade. A OS operacional está fora desta sprint; decidir junto com ela se seguem a mesma regra.
- Indicadores e telas do frontend que mostram horas ou complexidade precisam ser ajustados.

## Consequências
- Substitui o ADR 0001 e torna obsoleto `docs/flows/horas-estimadas-prazos-e-indicadores.md` no que diz respeito a horas e complexidade.
- O planejamento fica mais simples e alinhado ao que a gestão técnica realmente usa.
