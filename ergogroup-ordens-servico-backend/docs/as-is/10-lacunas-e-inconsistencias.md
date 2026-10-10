# 10 — Lacunas e inconsistências

## Inconsistências confirmadas

| ID | Achado | Consequência observável | Evidência |
|---|---|---|---|
| INC-01 | Cobrança de OS pode ser alterada pelo CRUD genérico, além do endpoint dedicado | Endpoint dedicado valida liberação; serializer genérico deixa `cobranca_realizada`, `numero_nf` e `data_cobranca` graváveis | `ordem_servico_serializer.py:63-76,149-155`; viewset `:122-137` |
| INC-02 | O mesmo ocorre com OSO | Atualização genérica pode marcar cobrança sem passar pelas duas guardas do endpoint | serializer OSO `:78-97,119-124`; viewset OSO `:135-154` |
| INC-03 | Exclusão de usuário responsável usa `CASCADE` | Pode apagar tarefas e OSOs, enquanto outros papéis do usuário usam `SET_NULL` | modelos `tarefa.py:21-25`; OSO `:26-30` |
| INC-04 | Exclusão de catálogo principal usa `CASCADE`, operacional usa `PROTECT` | Histórico de serviços pode ser apagado por catálogo, mas OSOs são protegidas | `servico.py:22-27`; OSO `:21-25` |
| INC-05 | `Cliente.cobranca_revisao_alteracao` não participa da regra de OSO | `revisao_cliente` sempre determina cobrança | cliente `:28`; OSO `:83-96`; busca de usos sem consumidor |
| INC-06 | Duas flags de atividade de usuário | API altera `ativo`; autenticação Django e e-mail tratam flags de forma diferente | `Usuario`/`AbstractUser`; `emails.py:21-25`; viewset usuário `:155-184` |
| INC-07 | Número de NF tem tipos distintos | OS aceita inteiro; OSO aceita string de até 10 caracteres | dois modelos/serializers |
| INC-08 | OSO cobrada pode deixar de gerar cobrança | Ao desmarcar revisão, liberação é limpa, mas `cobranca_realizada`, NF e autor não | `ordem_servico_operacional.py:87-97` |
| INC-09 | OS reaberta continua liberada/cobrada | Sincronização não revoga flags financeiras | `ordem_servico.py:157-176` |
| INC-10 | Validação contratual não é invariante de banco | `clean()` não é chamado automaticamente por `save()` | modelo `:98-123`; serializer repete regra |
| INC-11 | Atualizações derivadas não são atomicamente agrupadas de forma explícita | Falha intermediária pode deixar cadeia parcialmente sincronizada | `Tarefa.save` → `Servico` → `OrdemServico`; sem `transaction.atomic` abrangente |
| INC-12 | Campo `concluida` duplica `status` da OS | Estados divergentes são permitidos pelo esquema | modelo OS `:31-32`; sem constraint |

## Divergências terminológicas e históricas

- “Faturamento” foi renomeado para “cobrança” nas tabelas e no código, mas valores antigos de auditoria permanecem deliberadamente (`auditoria/models.py:18-24`; migração inicial de OS).
- `OrdemServicoOperacional` continua denominada `mini_os` na auditoria e “minios” em análises.
- A documentação existente do endpoint de serviço diz que sincronização ocorre “por signals”, mas a implementação efetiva ocorre nos métodos `save/delete` de `Tarefa` e `save` de `Servico` (`servico_viewset.py:100-105`; modelos).
- O comentário `# Aditoria` no modelo da OS é apenas erro textual; os campos são de rastreio de autoria.

## Lacunas não confirmadas

| Tema | Estado |
|---|---|
| Proposta, pedido e aprovação comercial | Não encontrados |
| Recorrência contratual | Não encontrada |
| Parcelas reais | Apenas quantidade; geração/vencimentos não encontrados |
| Setores e equipes | Não modelados |
| Dependência entre tarefas/serviços | Não modelada |
| Cancelamento/estorno financeiro | Não encontrado |
| Valor da OSO | Não modelado |
| Emissão de nota fiscal | Não encontrada |
| Recebimento/pagamento | Não modelado |
| Motivo da liberação da OS | Não persistido explicitamente |
| Vínculo entre OS e OSO | Inexistente no esquema |
| Validação de documentos de cliente | Não encontrada |
| Uso de subitens em uma contratação | Não encontrado |

## Limitações desta investigação

O banco real e o frontend não foram acessados por restrição do levantamento. Logo não se confirmou quais rotas o frontend usa, se há integrações fora deste repositório, nem a incidência das inconsistências permitidas pelo esquema. Testes não foram executados porque o runner Django cria banco temporário; eles foram tratados apenas como evidência auxiliar de intenção.
