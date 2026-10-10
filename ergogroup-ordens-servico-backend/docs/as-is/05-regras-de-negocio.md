# 05 — Regras de negócio

## Catálogo rastreável

| ID | Domínio | Tipo | Descrição; gatilho e condições | Efeito | Implementação / dependências |
|---|---|---|---|---|---|
| CLI-01 | Cadastro | Explícita | Cliente referenciado por OS/OSO não pode ser excluído | Banco bloqueia exclusão | FKs `PROTECT` em `ordem_servico.py:29` e `ordem_servico_operacional.py:16-20` |
| COM-01 | Comercial | Explícita duplicada | Ao salvar/validar OS com `contrato=true`, objeto, início e fim são obrigatórios; fim ≥ início | Rejeita operação validada | `OrdemServico.clean`, `OrdemServicoSerializer.validate` |
| COM-02 | Comercial | Explícita | Criação via API usa usuário autenticado como autor | Preenche `criado_por` | serializer `create`, linhas 143-147 |
| COM-03 | Comercial | Explícita | Criação de OS contratual dispara notificação a todos os usuários ativos com e-mail | E-mail pós-commit, valores ocultos por papel | `signals.py:14-19`; `emails.py:55-77` |
| OPE-01 | Operacional | Explícita | Tarefa em andamento/concluída sem início recebe data local atual | Define `data_inicio` | `Tarefa.save`, `tarefa.py:50-55` |
| OPE-02 | Operacional | Explícita | Tarefa concluída sem término recebe hoje; fora de concluída perde término | Define/limpa `data_termino` | `Tarefa.save`, linhas 56-59 |
| OPE-03 | Operacional | Explícita | Salvar/reatribuir tarefa notifica o responsável; salvar/excluir sincroniza serviço | E-mail e propagação | `Tarefa.save/delete`; `signals.py:22-36` |
| OPE-04 | Operacional | Explícita | Serviço com todas as tarefas concluídas vira concluído; com alguma iniciada/concluída vira em andamento; senão aberto | Atualiza status/rastreio | `Servico.sincronizar_status_e_rastreio`, linhas 78-163 |
| OPE-05 | Operacional | Explícita | Serviço sem tarefas fica aberto e sem datas/finalizador | Limpa derivados | `servico.py:136-146` |
| OPE-06 | Operacional | Explícita | Serviço cancelado preserva estado e apenas manda sincronizar a OS | Sem recálculo local | `servico.py:82-84` |
| OPE-07 | Operacional | Explícita | OS não cancelada: todos serviços concluídos → concluída; algum executado → em andamento; demais → aberta | Atualiza `status` e `concluida` | `OrdemServico.sincronizar_status_e_cobranca`, linhas 134-155 |
| OPE-08 | Operacional | Implícita | OS sem serviços não é concluída; serviço/tarefa cancelado impede conclusão dos pais | Mantém agregado não concluído | uso de `exists()` e `exclude(status='concluida')` nas sincronizações |
| FIN-01 | Financeiro | Explícita | Na criação com cobrança imediata, OS é liberada | Flag/data/autor; e-mail financeiro | `OrdemServico.save`, linhas 115-126 |
| FIN-02 | Financeiro | Explícita | OS ainda não liberada é liberada quando fica concluída | Flag/data/autor do último serviço; auditoria/e-mail | `ordem_servico.py:157-192` |
| FIN-03 | Financeiro | Implícita | Sincronização não revoga liberação já concedida | Liberação monotônica | guarda `if not self.liberada_para_cobranca`, linha 157 |
| FIN-04 | Financeiro | Explícita | Cobrança de OS só pode ser registrada quando liberada | 400 ou flag/NF/data/usuário | `OrdemServicoViewSet.registrar_cobranca`, linhas 122-137 |
| FIN-05 | Financeiro | Implícita | NF e data da cobrança são opcionais; não há regra de unicidade | Cobrança pode ficar marcada sem ambos | request serializer, linhas 158-160; modelo |
| OSO-01 | Operacional/financeiro | Explícita duplicada | Em toda validação/salvamento de OSO, `gera_cobranca = revisao_cliente` | Sobrescreve entrada | `OrdemServicoOperacional.clean/save`, linhas 83-89 |
| OSO-02 | Financeiro | Explícita | Revisão finalizada recebe liberação se ainda ausente | Data atual e responsável da OSO | `ordem_servico_operacional.py:89-93` |
| OSO-03 | Financeiro | Explícita | Se deixa de ser revisão, limpa liberação | Data/autor viram nulos | `ordem_servico_operacional.py:94-96` |
| OSO-04 | Financeiro | Explícita | Cobrança da OSO exige geração e liberação | 400 ou flag/NF/usuário | `ordem_servico_operacional_viewset.py:135-154` |
| CAT-01 | Capacidade | Explícita | Horas/complexidade efetivas usam override do registro ou fallback do catálogo | Valor calculado, não persistido | propriedades de `Servico`, `Tarefa` e OSO |
| PER-01 | Autorização | Explícita | Técnico enxerga somente registros ligados a si em tarefas/OS/OSO | Filtra querysets | três viewsets operacionais |
| PER-02 | Autorização | Explícita | Responsável, diretor, gestor/subgestor técnico ou superusuário modifica tarefa | Permite/nega objeto | `PodeModificarTarefa`, linhas 49-69 |
| PER-03 | Financeiro | Explícita | Quatro papéis não veem endpoint de indicadores financeiros | HTTP 403 | `permissions.py:36-46,72-77` |
| AUD-01 | Auditoria | Explícita | Save/delete de OS, serviço, tarefa e OSO gera snapshot/diff | Cria `RegistroAuditoria` | `auditoria/signals.py:15-65` |
| AUD-02 | Auditoria | Explícita | Mudanças são classificadas por precedência contrato → liberação → cobrança → status → atualização | Define uma ação por evento | `auditoria/utils.py:130-142` |
| ANA-01 | Financeiro | Explícita | Cobrado = soma de OS marcadas; para cobrar = liberadas não cobradas; sem liberação = restante não cobrado | KPIs calculados | `analise/services/financeiro.py:7-23` |

## Regras distribuídas ou duplicadas

- Validação contratual existe no modelo e serializer; `Model.save()` não chama `full_clean()`, portanto caminhos fora do serializer podem persistir contrato incompleto.
- `gera_cobranca` é derivado tanto em `clean()` quanto `save()`.
- Propagação de status está em três modelos e usa `QuerySet.update` mais auditoria manual.
- Registro de cobrança pode ocorrer pelo endpoint dedicado e, como os campos não são todos read-only, por atualização genérica do serializer. O endpoint dedicado valida liberação; a atualização genérica não repete essa validação. **Confirmado pelo código;** alcance prático depende do cliente da API.

## Comportamentos não confirmados

Não há máquina formal de transição que restrinja saltos de status. Não foi encontrado mecanismo que aplique `data_acordada_cobranca`, `quantidade_parcelas` ou `Cliente.cobranca_revisao_alteracao` à liberação ou criação de cobranças.
