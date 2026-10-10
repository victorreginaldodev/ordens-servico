# Subitens do Catalogo Comum

## Escopo

Os subitens pertencem ao catalogo comum de servicos, representado por `apps.servicos.models.Repositorio`.

A demanda nao altera o repositorio da Mini OS (`RepositorioMiniOS`), porque o documento de EV1 limita a regra ao item comum do catalogo.

## Modelo

Cada item do catalogo pode ter varios subitens relacionados. Exemplos:

- LTCAT
  - Medicao de ruido
  - Medicao de calor
  - Outros subitens relacionados

Os subitens sao cadastrados como metadados do catalogo. Nesta etapa, eles nao sao gravados diretamente no `Servico` criado dentro da ordem de servico.

## API

O cadastro e manutencao dos subitens acontece em endpoint proprio, com filtro por repositorio.

O serializer de `Repositorio` tambem retorna os subitens em leitura aninhada para facilitar o consumo pelo frontend.

## Migracao inicial

Nao ha carga inicial automatica de subitens, pois o sistema legado nao possui uma fonte estruturada para esses dados.

Os repositorios existentes permanecem validos e podem receber subitens por cadastro posterior.
