# Sistema de Gestão de SST — documentação AS-IS

Levantamento por engenharia reversa do backend em 8 de outubro de 2026. A fonte de verdade adotada foi o código e o estado declarado pelas migrações. Nenhum banco, dado de produção, frontend ou ambiente externo foi acessado.

## Leitura recomendada

1. [03 — Modelo de dados](03-modelo-de-dados.md): estrutura persistida e cardinalidades.
2. [05 — Regras de negócio](05-regras-de-negocio.md): catálogo rastreável das regras.
3. [06 — Comercial e faturamento](06-comercial-e-faturamento.md): entrada comercial, contratos e cobrança.
4. [09 — Preservação de dados](09-preservacao-de-dados.md): riscos para evoluções futuras.
5. [04 — Fluxos de dados](04-fluxos-de-dados.md) e [07 — Operação técnica](07-operacao-tecnica.md): comportamento operacional.

## Principais descobertas

- **Confirmado:** `OrdemServico` é simultaneamente o registro de entrada comercial, o agregado operacional de alto nível e o registro financeiro. Não existem entidades separadas de proposta, pedido, contrato, parcela, cobrança ou nota fiscal.
- **Confirmado:** o fluxo principal é `Cliente 1:N OrdemServico 1:N Servico 1:N Tarefa`; o responsável é atribuído na tarefa, não na OS ou no serviço.
- **Confirmado:** `OrdemServicoOperacional` (também chamada `mini_os`) é um fluxo paralelo, diretamente ligado a cliente, item de catálogo operacional e um responsável. Não há FK para `OrdemServico`.
- **Confirmado:** a OS comercial é liberada para cobrança na criação quando `cobranca_imediata=true`; caso contrário, quando todos os seus serviços estão concluídos. A liberação é irreversível pelo sincronizador atual.
- **Confirmado:** a OS operacional gera cobrança exatamente quando `revisao_cliente=true`, e é liberada quando também está `finalizada`.
- **Confirmado:** as mudanças `Tarefa → Servico → OrdemServico → liberação de cobrança` são fortemente acopladas a strings de status e a sobrescritas de `save()`.
- **Confirmado:** as migrações iniciais atuais adotam e renomeiam tabelas legadas por SQL condicional, preservando IDs e dados. Esse histórico é sensível.
- **Confirmado:** auditoria de OS, serviço, tarefa e mini OS persiste snapshots JSON e IDs de correlação sem FKs; clientes, catálogos e usuários não são auditados por esse mecanismo.
- **Não confirmado:** parcelamento efetivo, recorrência, baixa financeira, cancelamento/reabertura formal, setores/equipes e integração com emissor fiscal não estão implementados no repositório examinado.

## Índice

- [01 — Visão geral](01-visao-geral.md)
- [02 — Inventário funcional](02-inventario-funcional.md)
- [03 — Modelo de dados](03-modelo-de-dados.md)
- [04 — Fluxos de dados](04-fluxos-de-dados.md)
- [05 — Regras de negócio](05-regras-de-negocio.md)
- [06 — Comercial e faturamento](06-comercial-e-faturamento.md)
- [07 — Operação técnica](07-operacao-tecnica.md)
- [08 — Dependências e integrações](08-dependencias-e-integracoes.md)
- [09 — Preservação de dados](09-preservacao-de-dados.md)
- [10 — Lacunas e inconsistências](10-lacunas-e-inconsistencias.md)

## Convenções de confiabilidade

- **Confirmado:** demonstrado por código executável, esquema ou migração.
- **Inferido:** interpretação apoiada por nomes, consultas ou conjunto parcial de evidências.
- **Não confirmado:** não determinável pelo repositório.

Referências usam `arquivo:linha` e refletem o estado examinado.
