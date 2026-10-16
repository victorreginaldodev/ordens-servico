# Auditoria da migração para produção (15/10/2026)

Conferência das migrações da `v3` contra o dump de produção restaurado no MySQL local, antes do deploy. Duas
perguntas: (1) as migrações rodam no banco de produção e deixam o schema igual ao do dev? (2) algum script de
migração calculou dado errado (data, valor, vínculo)?

Itens marcados como **proposta** são sugestões, não decisões.

## Bancos usados

| Banco | O que é |
|---|---|
| `ordem_servico_v3` | Dump de produção restaurado em 15/10/2026. **Não foi alterado.** |
| `ordem_servico_v3_migrado` | Clone do dump (tabelas, índices, FKs e dados), onde as migrações rodaram. |
| `ordens_servico_dev_v2` | Banco de desenvolvimento, referência de schema. |

Para subir o backend local apontando para o clone migrado, basta sobrescrever o nome do banco (o `load_dotenv`
não sobrescreve variável já definida; usuário e senha continuam vindo do `.env.dev`):

```
set DB_NAME=ordem_servico_v3_migrado
set EMAIL_NOTIFICATIONS_ENABLED=False
.venv\Scripts\python.exe manage.py runserver 8000
```

## 1. Compatibilidade: resultado OK

Estado do dump: `contas 0001`, `clientes 0001`, `catalogo 0002`, `auditoria 0003`, `ordens_servico 0003` (julho
de 2026) e nenhuma migração de `organizacoes`. Ficam também registradas 13 migrações dos apps antigos
(`ordemServico`, `ordem_servico`, `servicos`, `tarefas`), que não existem mais no código e são ignoradas.

| Verificação | Resultado |
|---|---|
| Schema real do dump × estado esperado pelas migrações já aplicadas | Igual: nenhuma tabela ou coluna faltando ou sobrando. |
| `makemigrations --check` | Sem mudanças: models e migrações batem. |
| `migrate` no clone | 80 migrações, sem erro, 25 s. Ordem correta nos pontos sensíveis (`organizacoes.0013` lê `tipo_usuario` antes de `contas.0004` removê-lo; o setor do catálogo é preenchido antes de ser copiado para os serviços). |
| Schema final × dev | Idêntico: 28 tabelas, 239 colunas (tipo, nulo, default), 82 índices, 42 FKs (com a regra de exclusão), 12 checks. |
| `migrate --check` e `check` | Nada pendente, nenhum problema. |
| Smoke test da API no clone | Ver abaixo. |

### Smoke test da API (só GET, e-mail em memória)

- Um usuário real de cada uma das 8 funções com vínculo em todas as listagens e telas: execução por setor (5
  setores), cobranças nas 4 situações, conferência, análises, auditoria, organização, catálogo, clientes.
- Com um Diretor: detalhe, linha do tempo, resumo da venda, situação financeira e liberação de **todas** as 717
  OS; detalhe, linha do tempo e detalhe da execução dos 1.695 serviços; detalhe das 1.657 tarefas.
- "Meus serviços" (lista, contadores e concluídas) de cada uma das 22 pessoas ativas com tarefas.

Resultado: cerca de 11.900 requisições em duas rodadas, **nenhum erro 5xx e nenhuma exceção**. Todas as 11.044 de detalhe
voltaram 200. Os 403 batem com as permissões de cada função (ex.: o Gestor Técnico só vê o próprio setor e não
vê o financeiro); os 400 foram chamadas sem o parâmetro obrigatório (`setor`), refeitas com ele.

Único ponto lento: `GET /api/auditoria/registros/` sem filtro leva de 13 a 17 s (devolve os 18.650 registros sem
paginação). Nenhuma tela do frontend usa essa rota; a linha do tempo usa as rotas por OS e por serviço, que
passaram em todas as OS e serviços.

## 2. Integridade dos dados existentes: resultado OK

Comparação célula a célula de todas as colunas que existem nos dois bancos (original × migrado):

- nenhuma linha sumiu, em nenhuma tabela;
- nenhum valor existente mudou, fora as três mudanças previstas:
  - `contas_usuario.is_active`: 14 usuários (os que tinham `ativo = 0`, migração `contas.0002`);
  - `ordemservico.observacao`: 1 OS (669, contrato copiado, `ordens_servico.0015`);
  - `servico.prazo`: 129 serviços, todos **ganharam** prazo pelas tarefas; nenhum perdeu ou teve prazo trocado
    (`ordens_servico.0035`).
- Valores, datas de venda, de cobrança e de conclusão: inalterados.
- As linhas a mais em `auth_permission` (+24) e `django_content_type` (+6) são das 6 tabelas novas de
  `organizacoes`.

Removidos por decisão (ADR 0005), com contagem da própria migração `0025`: horas em 3 serviços, complexidade em
5 serviços e horas em 4 tarefas.

## 3. Colunas novas: conferidas contra recálculo independente

Cada regra foi recalculada em SQL a partir do dump original e comparada com o resultado do clone. **Nenhuma
divergência** em nenhuma regra.

| Coluna | Regra | Resultado no clone |
|---|---|---|
| `tipo_condicao` | parcelado quando há mais de 1 parcela | 392 à vista, 325 parceladas (263 com 12 parcelas) |
| `liberar_em` | "na venda" onde havia cobrança imediata | 95 na venda, 622 na conclusão |
| `origem_lancamento` | manual nas OS já cobradas | 553 manual, 164 vazias |
| `referencia_lancamento` | cópia do `numero_nf`; NF 0 fica vazia | 479 com o número; 73 de NF 0 sem referência (ver ponto 2 de atenção) |
| condição anterior (`0037`) | recorrente, intervalo ≠ 30, dias de fechamento/vencimento | nenhuma OS se enquadrou |
| `servico.setor` | setor do catálogo | 1.694 em Segurança do Trabalho; 1 sem setor (serviço 813, sem catálogo, concluído) |
| `servico.prazo` | maior prazo das tarefas não canceladas | 129 preenchidos |
| `servico.ultima_movimentacao_em` | mais recente entre criação do serviço e criação/alteração das tarefas | 1.695 corretos, nenhum no futuro |
| `servico.recebido_em` | criação da primeira tarefa | 1.576 (todos os serviços com tarefa); os 119 abertos sem tarefa ficam "Novo" |
| `tarefa.recebida_em` | meia-noite local do início, ou a criação | 1.530 (em andamento + concluídas); abertas e cancelada sem ciência |
| `tarefa.atribuida_em` | criação da tarefa | 1.657 |
| Vínculos (`organizacoes.0013`) | tipo antigo → setor e função | 47 de 47 usuários, um vínculo cada, nenhum tipo sem mapeamento |
| Permissões das funções | as do tipo antigo; "recebe tarefas" (`0021`); Gestor Técnico sem "ver valores" (`0022`) | conforme o mapeamento; "recebe tarefas" em Gestor Técnico, Sub-Gestor Técnico e Técnico |
| `catalogo.setor` | Segurança do Trabalho (`catalogo.0007`) | 131 de 131 |

Os dois avisos que pareciam erro na conferência não eram das migrações: a tarefa 1652 tem data no ano 26 (ver
ponto 1) e os casos de "ciência antes da criação" vêm das datas do legado (ver ponto 7).

## 4. Pontos de atenção (dados de produção)

Nenhum destes é erro das migrações novas; são dados que já estão em produção e que as telas novas passam a
mostrar ou usar.

### 1. Datas impossíveis já gravadas em produção

| Registro | Problema |
|---|---|
| Serviço 1436 e tarefa 1652 (OS 579) | Início e criação em **18/02/0026** (ano 26). A ciência retroativa e a data de atribuição copiaram essa data. |
| Tarefa 578 | Término em 25/03/**0025** |
| Tarefa 1132 | Término em 30/09/**0205** |
| Tarefa 1441 | Término em 27/03/**2023**, início em 27/03/2026 |
| Tarefas 193, 926, 1014, 1037, 1070 | Término antes do início |

**Proposta:** corrigir esses registros (provável digitação do ano) antes ou logo depois do deploy.

### 2. Número da NF igual a 0 (resolvido na `0015`)

73 OS faturadas têm `numero_nf = 0` (20 de 2024, 35 de 2025, 18 de 2026). A `0015` copiava para
`referencia_lancamento = "0"`, que aparecia como "ref. 0".

Decidido em 15/10/2026: a `0015` trata NF 0 como vazia (função `_referencia`, com teste em
`tests_faturamento.py`). Conferido de novo num clone recriado do dump: 479 OS com o número da NF, as 73 de NF 0
sem referência, nenhuma referência "0", e o restante da auditoria igual. As telas de OS e do financeiro foram
exercitadas de novo nas 717 OS (2.871 requisições, todas 200).

No dev, a `0015` já tinha rodado com a regra anterior: há 67 OS com referência "0". Alterar a migração não muda o
que já foi gravado.

### 3. Volume de alertas e e-mails no primeiro dia

| Onde | Primeiro dia |
|---|---|
| Serviços ativos em alerta de sem movimentação | 319 de 320 (38 de 7 a 30 dias, 69 de 31 a 90, 190 de 91 a 365, 22 há mais de 1 ano) |
| Conferência: sem distribuir | 110 |
| Conferência: trabalho concluído, OS sem liberar | 45 |
| Conferência: liberada sem faturar | 8 |
| Resumo diário | 13 e-mails: 6 organizadores com 119 serviços sem distribuir e 200 parados cada; 8 pessoas com as 8 OS a faturar |

111 serviços ativos foram criados há mais de 180 dias (o mais antigo em 05/09/2024).

**Proposta:** limpar o backlog antigo (concluir ou cancelar o que já terminou fora do sistema) ou subir com
`EMAIL_NOTIFICATIONS_ENABLED=False` até a limpeza.

### 4. Um serviço fora de sincronia

Serviço 1805 (OS 741): uma tarefa concluída e uma cancelada, mas o serviço está "em andamento" (já era assim em
produção). Pela regra atual (tarefa cancelada não conta), ele deveria estar concluído. Aparece nas garantias da
conferência; o "Corrigir agora" conclui o serviço e pode liberar a OS 741 para faturar.

### 5. Usuários que deixam de conseguir entrar

14 usuários tinham `ativo = 0` (desativados na tela) e `is_active = 1`. A `contas.0002` desativa de fato. O
último login entre eles foi em 27/01/2026. Eles têm 28 tarefas abertas: Helaine.ergo (9), Lécio Jam (7),
Carla.ergo (4), Marilene.ergo (2), Keli.ergo (2), Donimar.ergo.gestor, Vinicius.ergo, CarlosHenrique.ergo e
higor.ergo (1 cada).

### 6. Tarefas abertas com quem não recebe tarefas

33 tarefas abertas estão com pessoas cuja função não tem "recebe tarefas": Donimar.ergo, Gestor Comercial (16),
Amanda.ergo, Diretor (12), Thiago.ergo, Diretor (3), mateus antonio, Administrativo (1), e Donimar.ergo.gestor,
Administrativo (1). Elas continuam válidas e editáveis (a validação só vale quando o responsável muda); só não dá
para atribuí-las de novo a essas pessoas.

### 7. Dados gravados pelo script legado (`migrar_dados_legado`)

O comando que importou o banco antigo (ele não roda mais: importa apps que não existem no código atual) deixou
estes rastros:

- `faturada_por_id = 3` fixo: 452 OS faturadas antes de 28/04/2026 aparecem como faturadas por Lauriane.ergo
  (usuário 3), sem ser necessariamente quem faturou;
- datas sem hora (meia-noite local): a criação das tarefas veio do início digitado, e a dos serviços, de outra
  data. Por isso 47 tarefas foram "criadas" antes do próprio serviço, e 47 serviços têm ciência anterior à criação
  (até 396 dias).

### 8. Outros

- OS 669 é um teste em produção ("Isto é apenas um teste", R$ 1,00); a `0015` copiou para a observação o bloco de
  contrato de teste, com nome, e-mail e telefone.
- 263 OS com 12 parcelas viram "parcelado" (regra conservadora do ADR 0007): o financeiro reclassifica as que
  forem mensalidade.
- 13 OS estão cobradas sem liberação (inconsistência herdada, não alterada): ficam em "Faturadas".
- 33 registros de auditoria antigos de origem API/sistema (`faturamento`, `liberacao_faturamento`) usam os nomes
  de campo antigos e não aparecem na linha do tempo nova; não quebram nada.
- Os tipos de conteúdo dos apps antigos (`ordemServico`) continuam em `django_content_type`; não atrapalham.

## 5. O que esta conferência não cobre

- A versão do MySQL do servidor de produção: o teste rodou no MySQL 8.0.41 local.
- Operações de escrita (POST/PATCH) e o frontend: só a API foi exercitada, com GET.
- O MySQL não desfaz DDL em transação: se o `migrate` falhar no meio em produção, o banco fica no meio do
  caminho. Fazer backup imediatamente antes.
