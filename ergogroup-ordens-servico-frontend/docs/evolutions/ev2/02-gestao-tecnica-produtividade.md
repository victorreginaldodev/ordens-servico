# Gestao tecnica e produtividade

## Objetivo

Dar a gestao tecnica visao geral do setor (prioridade, urgencia, carga de
trabalho por tecnico) e uma forma objetiva de medir produtividade, sem exigir
apontamento de horas (timesheet).

## Campos novos

- `Catalogo` e `CatalogoOperacional`: `horas_estimadas` (decimal) e
  `complexidade` (choices) — a raiz da estimativa, pra nao ter que
  recadastrar em cada servico/tarefa.
- `OrdemServico`: `prazo` (ja tinha `prioridade`).
- `Servico` e `OrdemServicoOperacional`: `prioridade`, `prazo`,
  `horas_estimadas`, `complexidade` — todos opcionais. Quando vazios, caem
  no catalogo vinculado via properties `horas_estimadas_efetivas` e
  `complexidade_efetiva`.
- `Tarefa`: `prioridade`, `prazo`, `horas_estimadas` — com fallback pro
  servico (mesma logica de propriedade efetiva).

`prioridade` herda do pai apenas no momento da criacao (via `create()` do
serializer — um `TextChoices` com default nao permite distinguir "valor
explicito" de "default" dentro do `save()` do model). Depois de criado, o
campo e independente; nao ha cascata viva se o pai mudar de prioridade
depois.

## Filtros de API

Adicionados em `TarefaViewSet`, `ServicoViewSet` e
`OrdemServicoOperacionalViewSet`:

- `prioridade` — filtra por nivel.
- `atrasada=true` — retorna apenas itens com prazo vencido e nao
  concluidos/cancelados.
- `ordering=prazo` / `ordering=-prazo` — ordena por prazo.

## Decisao consciente: nao restringir cardinalidade de Tarefa

Foi avaliado exigir no maximo uma Tarefa por (`servico`, `responsavel`), mas
os dados reais mostraram que so 62 de 1484 servicos (4.2%) tem mais de uma
tarefa, e dos 17 casos de mesmo tecnico repetido, 16 pareciam duplicidade de
entrada (mesma data, mesma descricao ou vazia) e so 1 parecia genuinamente
duas etapas distintas. A decisao foi nao mexer na cardinalidade e medir
produtividade diretamente na tarefa, que e onde o tecnico de fato executa.

## Impacto em analytics

`apps/analise` (endpoint operacional) ganhou, por tecnico:

- `tarefas_atrasadas`
- `tarefas_alta_prioridade_abertas` (+ equivalentes para OSO)
- `complexidade_media_concluidas`
- `horas_estimadas_entregues` (soma das horas efetivas das tarefas
  concluidas)

`tempo_por_catalogo` passou a expor `horas_estimadas`/`complexidade` lado a
lado com o tempo real observado, sem forcar uma razao unica de
horas-esperadas-por-dia (nao existe essa constante no sistema — seria um
numero inventado).

## Migracao inicial

`prioridade` (CharField com default nao-nulo) populou `'baixa'` em todos os
registros existentes via default do Django. `prazo`, `horas_estimadas` e
`complexidade` (nullable, sem default) ficaram vazios — nao ha dado
historico do qual derivar isso de forma confiavel (o tempo decorrido ate
concluir mistura tempo de fila com trabalho real; a media bruta de um item
de catalogo chegou a 4796 dias). Preencher esses valores e trabalho humano
da gestao tecnica, nao um script de backfill.
