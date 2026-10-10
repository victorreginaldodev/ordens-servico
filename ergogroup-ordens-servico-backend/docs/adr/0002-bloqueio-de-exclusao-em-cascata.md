# ADR 0002: Bloqueio de exclusão em cascata

## Status
Aceito e implementado (09/10/2026).

## Contexto
Problema relatado pelo usuário em 09/10/2026: excluir um item do catálogo apagava em cascata todos os serviços que o usavam e, com eles, as tarefas desses serviços (INC-04 em `docs/as-is/10-lacunas-e-inconsistencias.md`). O catálogo operacional já usava `PROTECT`, então as duas regras eram incoerentes.

O levantamento encontrou a mesma classe de problema na exclusão de usuário (INC-03): `Tarefa.responsavel` e `OrdemServicoOperacional.responsavel` usavam `CASCADE`, e excluir um usuário apagava o histórico de execução dele.

Além disso, quando uma exclusão era barrada por integridade, a API respondia 500, sem explicar o motivo.

## Decisão
1. `Servico.catalogo`, `Tarefa.responsavel` e `OrdemServicoOperacional.responsavel` passam a usar `PROTECT`. No MySQL isso é só estado do Django, sem DDL.
2. Toda exclusão barrada por `ProtectedError` responde **409** com uma mensagem legível e a lista de vínculos, por exemplo: `{"detail": "Não é possível excluir este registro porque ele está vinculado a: 2 tarefas.", "vinculos": [...]}`. O tratamento é global (`config/exceptions.py`), então vale também para cliente, catálogo operacional, setor, função e vínculos.
3. Cada viewset pode acrescentar uma dica à mensagem (`dica_exclusao_bloqueada`), por exemplo "Desative o usuário em vez de excluí-lo." ou "Desative o catálogo em vez de excluí-lo.".
4. A saída para registros em uso é **desativar em vez de excluir**: usuário (`ativo`), catálogo (`ativo`, ver ADR 0004), setor e função (`ativo`).

## Alternativas consideradas
- **`SET_NULL` em `Servico.catalogo`:** preservaria o serviço, mas apagaria a informação de qual tipo de serviço foi vendido. Rejeitada.
- **Tratar o erro em cada view:** rejeitada em favor do tratamento global, que cobre automaticamente qualquer `PROTECT` novo.

## Consequências
- Histórico de execução não é mais apagado por exclusão de catálogo ou de usuário.
- O frontend precisa exibir a mensagem do 409 (pendente).
- Excluir uma OS continua apagando serviços e tarefas em cascata: isso é intencional, e a exclusão de OS ficou restrita à diretoria (ADR 0003).
