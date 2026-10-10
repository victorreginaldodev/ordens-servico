# Consolidacao dos apps de OS e catalogo

## Objetivo

Unificar tres apps legados fortemente acoplados (`ordem_servico`, `servicos`,
`tarefas`) em uma estrutura por dominio, e substituir o app `repositorio` de
catalogo pelo dominio `catalogo`.

## O que mudou

- `apps/ordem_servico` + `apps/servicos` + `apps/tarefas` viraram
  `apps/ordens_servico`, com os models `OrdemServico`, `Servico`, `Tarefa` e
  `OrdemServicoOperacional`.
- `Repositorio` e `RepositorioMiniOS` viraram `apps/catalogo`, com os models
  `Catalogo`, `CatalogoOperacional` e `SubitemCatalogo`.
- `MiniOS` foi renomeado para `OrdemServicoOperacional` (OSO) em todo o
  sistema — model, endpoints, auditoria.
- Dominio `faturamento` foi renomeado para `cobranca` em todos os campos,
  actions de API e rotulos de auditoria (`liberada_para_faturamento` ->
  `liberada_para_cobranca`, `faturada` -> `cobranca_realizada`,
  `data_faturamento` -> `data_cobranca`, `faturada_por` ->
  `cobranca_realizada_por`). Os valores antigos do enum de auditoria foram
  mantidos para nao quebrar o rotulo de registros historicos.
- `OrdemServico.data_criacao` foi renomeado para `data_venda`.
- Novo campo opcional em `OrdemServico`: `data_acordada_cobranca` (data
  combinada com o cliente para a cobranca).
- Rotas novas: `/api/catalogo/` e `/api/ordens-servico/`, substituindo
  `/api/ordem-servico/`, `/api/servicos/` e `/api/tarefas/`.

## Como a transicao de schema foi feita

Toda a mudanca de tabelas/colunas foi feita via
`SeparateDatabaseAndState` + `RunSQL`/`RunPython` que renomeiam objetos
in-place no banco, sem copiar linha nenhuma para tabela nova — a maior fonte
de risco em tentativas anteriores de refatoracao (abandonadas antes desta)
era justamente essa copia.

### Por que houve dois commits extras de correcao (`95831ea`, `d1d1477`)

A primeira tentativa consolidou o historico das migrations antigas via
squash (`Migration.replaces`), permitindo apagar os tres apps antigos por
completo. Passava limpo em `showmigrations` e na suite de testes (banco
criado do zero) — mas quebrava o cenario real de producao: um banco que
ainda tinha o schema antigo (`data_criacao`, `faturada`, `repositorio_id`) e
nunca tinha rodado as migrations novas. A logica de "soft-apply" do squash
so verifica se as migrations substituidas ja foram marcadas como aplicadas;
se sim, pula a execucao das operacoes assumindo que o resultado fisico ja e
equivalente — suposicao falsa nesse caso, porque a cadeia antiga nunca tinha
de fato renomeado nada. O `migrate` reportava sucesso, mas o banco ficava
incompativel com o codigo.

A correcao final abandonou o squash e o bookkeeping do Django: as migrations
de `catalogo` e `ordens_servico` agora checam o `information_schema` do
banco de verdade antes de decidir o que fazer —

- tabela nova ja existe -> no-op (banco ja migrado);
- tabela antiga existe -> renomeia de verdade;
- nenhuma existe -> cria a tabela do zero via SQL bruto (banco vazio / CI).

Isso permitiu apagar os tres apps antigos por completo sem depender de
mante-los como cascas vazias so por causa de dependencies de outras
migrations (a `auditoria/0002_popular_auditoria_inicial` foi ajustada da
mesma forma — aponta para os models novos, mas so os usa se a tabela ja
existir).

Nenhuma dessas duas correcoes muda API, model ou comportamento visivel — sao
puramente sobre a seguranca da migracao de um banco de producao real.

## Impacto na API

Nenhum campo novo de negocio alem de `data_acordada_cobranca`. O impacto
principal e de rota e nomenclatura — qualquer integracao que ainda apontava
para `/api/ordem-servico/`, `/api/servicos/`, `/api/tarefas/` ou para os
nomes de campo do dominio `faturamento` precisa ser atualizada.
