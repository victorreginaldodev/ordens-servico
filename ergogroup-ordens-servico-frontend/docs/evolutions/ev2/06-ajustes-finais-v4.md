# Ajustes finais da v4

## Objetivo

Registrar duas mudancas pontuais do commit de fechamento da v4 que alteram
comportamento existente, e nao apenas adicionam algo novo.

## OrdemServicoOperacional perdeu a auto-gestao de datas

Antes, `OrdemServicoOperacional.save()` preenchia `data_inicio` e
`data_termino` automaticamente com base na transicao de `status` (igual
`Servico` e `Tarefa` fazem ate hoje):

- `data_inicio` era setada quando o status ia para `em_andamento` ou
  `finalizada`.
- `data_termino` era setada quando o status ia para `finalizada`, e
  zerada quando saia de `finalizada`.

Essa logica foi removida do `save()`. O serializer tambem parou de marcar
esses dois campos como `read_only` — ou seja, `data_inicio`/`data_termino`
da OSO viraram campos manuais e editaveis pelo usuario, diferente de
`Servico`/`Tarefa`, que continuam com esse rastreio automatico.

**Isso e uma divergencia de comportamento entre OSO e as demais entidades**,
nao uma simplificacao neutra. Nao ha registro de motivo no commit. Vale
confirmar com quem pediu a mudanca se foi intencional (ex: usuarios
reclamando de nao poder corrigir uma data errada na OSO) ou um efeito
colateral de outra limpeza.

## ServicoSerializer passou a persistir herança do catalogo na criacao

Antes, `horas_estimadas` e `complexidade` de um `Servico` vinculado a
catalogo so apareciam herdados via property calculada em runtime
(`horas_estimadas_efetivas`, `complexidade_efetiva`), sem nunca serem
gravados no banco quando o usuario nao informava valor.

Agora, `ServicoSerializer.create()` grava esses valores diretamente no
registro no momento da criacao, se o catalogo tiver valor e o usuario nao
tiver informado um:

```python
if catalogo is not None:
    if 'horas_estimadas' not in validated_data:
        validated_data['horas_estimadas'] = catalogo.horas_estimadas
    if 'complexidade' not in validated_data:
        validated_data['complexidade'] = catalogo.complexidade
```

Isso significa que, se o catalogo mudar de `horas_estimadas`/`complexidade`
depois, servicos ja criados **nao** refletem a mudanca (valor gravado, nao
mais calculado on-the-fly) — o oposto do que a property `_efetiva` fazia.
Isso so vale para `Servico`; `OrdemServicoOperacional` e `Tarefa` continuam
usando a property em runtime, sem gravar o valor herdado.
