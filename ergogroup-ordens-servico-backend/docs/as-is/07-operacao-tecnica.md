# 07 — Operação técnica

## Estrutura principal

`OrdemServico` agrega vários `Servico`; cada serviço agrega várias `Tarefa`; cada tarefa tem exatamente um `Usuario` responsável. Logo uma contratação pode envolver vários profissionais por tarefas distintas. Não existe entidade setor/equipe nem campo que classifique o setor: participação de diferentes setores é **não confirmada** e não pode ser reconstruída de forma confiável apenas pelos dados.

`Catalogo` classifica opcionalmente um serviço. `SubitemCatalogo` não participa da OS, serviço ou tarefa, portanto funciona apenas como estrutura do catálogo.

## Atribuição

- Serviços não têm responsável direto; `terminado_por` é derivado da tarefa concluída mais recente.
- Tarefa exige responsável, sem validação de `tipo_usuario`, `ativo` ou disponibilidade.
- OSO exige um responsável, também sem validação de papel/atividade.
- Atribuição ou reatribuição de tarefa notifica o novo responsável.

## Estados

| Entidade | Estados | Origem real |
|---|---|---|
| Tarefa | aberta, em andamento, concluída, cancelada | editável pela API; datas derivadas no `save()` |
| Serviço | aberto, em andamento, concluído, cancelado | somente leitura na API; derivado das tarefas, exceto cancelado preservado |
| OS | aberta, em andamento, concluída, cancelada | somente leitura na API; derivado dos serviços, exceto cancelada preservada |
| OSO | não iniciado, em andamento, finalizada | editável diretamente; datas não são derivadas |

Não há tabela ou grafo de transições permitidas. Para tarefa e OSO, qualquer valor válido do enum pode substituir o atual. Reabrir uma tarefa concluída limpa término e propaga reabertura; não revoga eventual liberação financeira da OS.

## Conclusão e rastreio

O serviço conclui somente quando possui tarefas e todas estão concluídas. Usa o término da tarefa concluída mais recente, ou hoje se esse campo faltar, e seu responsável como finalizador. A OS conclui somente quando possui serviços e todos estão concluídos. Cancelamentos não equivalem a conclusão.

Datas são `DateField`, portanto granularidade de execução é de dia; auditoria/timestamps têm data e hora. `data_conclusao` e `data_termino` do serviço são preenchidas com o mesmo valor pelo fluxo atual.

## Prazo, prioridade e esforço

OS, serviço, tarefa e OSO têm prioridade; todos exceto catálogo têm prazo opcional. Atraso é calculado em consultas (`prazo < hoje`) e não persiste estado. Cumprimento considera `data_termino <= prazo`. Horas e complexidade seguem fallback catálogo → serviço → tarefa conforme aplicável, sem congelar automaticamente o valor do catálogo no registro operacional.

## OS operacional

OSO é atômica: cliente, serviço de catálogo operacional, quantidade e responsável. Não possui subtarefas nem relação com a venda. `revisao_cliente` também é o critério financeiro. O código analítico e de auditoria ainda a chama “mini OS”, evidenciando continuidade do conceito legado.

## Exclusão

Excluir OS remove serviços e tarefas. Excluir serviço remove tarefas. Excluir usuário remove tarefas e OSOs sob sua responsabilidade, mas apenas nulifica autoria/finalização/cobrança em outros registros. Excluir catálogo principal remove serviços (e tarefas); catálogo operacional e cliente são protegidos. Essas regras decorrem dos `on_delete` dos modelos.
