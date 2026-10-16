# 05. Catálogo de serviços

O catálogo é a lista dos **serviços que a empresa vende**. Cada item diz **qual setor executa** aquele serviço. É essa ligação que faz cada serviço vendido cair na fila do setor certo.

Decisões de origem:
- ADR 0004: setor responsável pela execução.
- ADR 0002: bloqueio de exclusão.
- `docs/revisao-catalogo-de-servicos.md` e `docs/revisao-permissoes-e-setores.md` (P5).

O **catálogo operacional** (das OS operacionais) está fora do escopo desta documentação.

---

## 1. Conceitos

| Conceito | O que é | Onde fica no código |
|---|---|---|
| **Item do catálogo** | Um tipo de serviço vendido (ex.: "PGR", "LTCAT", "Auditoria contábil"), com nome, descrição, setor responsável e situação (ativo ou inativo). | `Catalogo` |
| **Setor responsável pela execução** | O setor que executa o serviço. **Obrigatório.** É para a fila dele que vai o serviço vendido. | `Catalogo.setor` |
| **Setor de execução** | Não é um campo: é o setor que tem catálogos ativos (módulo 01). | — |
| **Subitem** | Partes de um item (nome, descrição, ordem e situação). Existem na API, mas **nenhuma tela usa hoje**. | `SubitemCatalogo` |

O serviço vendido **copia** o setor do catálogo no momento da venda. Mudar o catálogo de setor depois não move o que já foi vendido, a menos que se peça (seção 3.3).

---

## 2. Quem pode o quê

| Ação | Permissão |
|---|---|
| Ver o catálogo | Todos |
| Criar, editar, desativar, excluir e mudar o setor (também em lote) | `catalogo.gerenciar` |
| Criar e editar subitens | `catalogo.gerenciar` |

---

## 3. Regras de negócio

### 3.1 Cadastro

| Campo | Regra |
|---|---|
| Nome | Obrigatório. |
| Descrição | Opcional. |
| Setor responsável | Obrigatório. Ao criar ou mudar, o setor precisa estar **ativo**. |
| Disponível para novas OS (ativo) | O padrão é sim. |

### 3.2 O setor precisa ter quem receba tarefas

Um item **ativo** só pode ficar num setor que tenha **quem receba tarefas**: alguém lotado lá com `tarefas.receber`, ou com o setor no "também executa em". Sem isso, o serviço vendido não teria a quem ir.

A regra é checada ao **criar**, ao **mudar de setor** e ao **reativar**. Se o setor não tiver ninguém, a API recusa (400) e explica o que fazer: dar a alguém uma função com "Recebe tarefas" no setor, ou marcar "Também executa em" na pessoa.

Se o setor tiver quem receba tarefas, mas **ninguém que o organize**, o cadastro passa **com aviso**: os serviços vão chegar a uma fila sem ninguém responsável por distribuí-los.

### 3.3 Mudar o setor

O serviço vendido guarda o setor da época. Ao mudar o setor, duas caixas (que começam desmarcadas) dizem o que vai junto (revisão de 16/10/2026, ADR 0004):

| Opção | O que acontece |
|---|---|
| Nenhuma caixa | Só as vendas **novas** vão para o setor novo. Os serviços já vendidos ficam onde estão. |
| **"Mover os serviços ainda não distribuídos"** | Vão os serviços ativos **sem tarefas** daquele item (novos ou a distribuir). Eles voltam a **Novo** no setor de destino (a ciência de recebimento é apagada), e quem organiza o setor recebe o e-mail de chegada. |
| **"Mover os serviços já distribuídos ou em andamento"** | Vão os serviços ativos **com tarefas**, com as tarefas e os responsáveis como estão. Continuam na mesma etapa no painel do setor novo, que passa a vê-los e pode redistribuir (só para quem recebe tarefas lá); o setor antigo deixa de vê-los. O responsável segue atualizando a própria tarefa. O recebimento e a última movimentação não mudam, e não há e-mail de chegada. |

Os **concluídos e cancelados nunca mudam**: ficam no setor que fez o trabalho. Cada serviço movido fica na auditoria e na linha do tempo ("passou de Segurança do Trabalho para Ergonomia").

Na tela, cada caixa mostra quantos serviços iriam junto (`servicos_em_aberto` e `servicos_com_tarefas`), e a resposta diz quantos foram movidos.

**Serviços que ficaram para trás:** se o item já está no setor certo, mas ainda tem serviços ativos em outro setor (de uma mudança feita antes das caixas, ou sem marcá-las), o formulário avisa quantos são (`servicos_em_aberto_fora_do_setor` e `servicos_com_tarefas_fora_do_setor`) e mostra as mesmas duas caixas para trazê-los, sem mudar o setor.

**Mudar o setor de vários itens de uma vez:** a tela permite escolher o setor de origem, marcar os itens (a busca ajuda a pegar, por exemplo, todos os "ERGONOMIA - …"), escolher o destino e marcar as mesmas duas caixas. Valem as mesmas regras: o destino precisa ser ativo e, se algum item for ativo, ter quem receba tarefas.

**Correção única de 16/10/2026:** a migração `ordens_servico/0051` leva para Ergonomia os serviços ativos dos itens que já estão em Ergonomia mas ficaram em outro setor, com as regras acima. Não envia e-mails.

### 3.4 Desativar e excluir

| Ação | Regra |
|---|---|
| **Desativar** | O item deixa de aparecer na Nova venda e não pode ser usado em serviços novos (a venda com ele é recusada). Os serviços já vendidos continuam com ele. |
| **Excluir** | **Bloqueado (409)** se algum serviço usa o item. A saída é desativar. Se passar, os subitens são excluídos junto. |

### 3.5 Efeitos em outros módulos

- **Vendas:** só itens ativos, de setor ativo, podem ser vendidos.
- **Setores:** um setor com itens ativos não pode ser desativado. Primeiro passe os itens a outro setor ou desative-os.
- **Serviço já vendido:** trocar o item de um serviço é permitido no mesmo setor. Para outro setor, só com o serviço em aberto e sem tarefas (módulo 02).

---

## 4. Fluxo básico

1. **Catálogo → Novo serviço:** informe o nome, o setor responsável, a descrição e se está disponível para novas OS.
2. Se o setor não tiver quem receba tarefas, ajuste primeiro o Time ou as Funções (módulo 01).
3. **Reorganização** (um serviço passou a ser feito por outro setor): edite o item, troque o setor e decida se os serviços em aberto vão junto. Para vários itens, use "Mudar setor" em lote.
4. **Serviço que deixou de ser vendido:** desative em vez de excluir.

---

## 5. Tela

| Tela | Rota | O que mostra e faz |
|---|---|---|
| **Catálogo** | `/catalogo` | Os itens **agrupados por setor**, com as visões Ativos, Inativos e Todos, busca e filtro de setor. O modal tem as etapas formulário, desativar e excluir. Também tem a ação "Mudar setor" em lote. |

---

## 6. Endpoints

| Ação | Endpoint | Observações |
|---|---|---|
| Listar / detalhar | `GET /api/catalogo/catalogos/` | Filtros: `q`, `setor`, `ativo`. Para a Nova venda, use `ativo=true`. Cada item traz os subitens e os contadores `servicos_em_aberto`, `servicos_com_tarefas`, `servicos_em_aberto_fora_do_setor` e `servicos_com_tarefas_fora_do_setor`. |
| Criar / editar | `POST` / `PATCH /api/catalogo/catalogos/` | `mover_servicos_em_aberto` e `mover_servicos_com_tarefas` na edição: levam para o setor do item os serviços ativos que estão em outro setor, mudando o setor ou não. A resposta traz `avisos` e `servicos_movidos`. |
| Excluir | `DELETE /api/catalogo/catalogos/<id>/` | 409 se estiver em uso. |
| Mudar o setor em lote | `POST /api/catalogo/catalogos/mudar-setor/` | `catalogos`, `setor`, `mover_servicos_em_aberto`, `mover_servicos_com_tarefas`. Devolve `catalogos_alterados`, `servicos_movidos` e `avisos`. |
| Subitens | `/api/catalogo/subitens/` | CRUD com `catalogo.gerenciar`. |

---

## 7. Onde está no código

| Assunto | Arquivo |
|---|---|
| Modelo | `apps/catalogo/models/catalogo.py`, `subitem_catalogo.py` |
| Regras de setor, mover serviços e avisos | `apps/catalogo/services.py` |
| Validação do cadastro | `apps/catalogo/serializers/catalogo_serializer.py` |
| Endpoints | `apps/catalogo/views/catalogo_viewset.py` |
| Tela | Frontend: `src/features/catalogo/` (`CatalogListPage`, `CatalogoModal`, `MudarSetorEmLoteModal`) |
