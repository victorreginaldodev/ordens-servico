# Plano — execução, comercial, financeiro e linha do tempo

Plano de 10/10/2026 para implementar o ADR 0008, junto com o que ainda falta dos ADRs 0005, 0006 e 0007. Continua a numeração de fases de `docs/plano-setores-e-permissoes.md` (fases 0 a 4c).

Base: `docs/telas-blocos-e-endpoints.md` (blocos mapeados) e ADR 0008 (decisões desta rodada).

## Regras de trabalho
- Tudo na branch `epic/v3`; nada vai para a `main` sem aprovação.
- Nenhum app novo: execução, comercial e linha do tempo ficam em `apps/ordens_servico`; indicadores em `apps/analise`.
- Lógica em `models` e `services/`. Os endpoints só orquestram e conferem permissão.
- Uma alteração de schema por migração, separada da migração de dados (MySQL).
- Cada endpoint declara a permissão que exige. **Nenhuma regra cita nome de setor ou de função.**
- Testes para cada regra; `python manage.py test` antes de cada commit.
- **Prefixo dos endpoints novos:** `/api/execucao/`, `/api/comercial/` e `/api/financeiro/`, montados a partir de `apps/ordens_servico` (`urls_execucao.py`, `urls_comercial.py`, `urls_financeiro.py`). As listagens atuais continuam em `/api/ordens-servico/`.

## Visão geral

| Fase | Entrega | Situação |
|---|---|---|
| 6 | Camada de dados da execução e do recorrente | ✅ concluída em 10/10/2026 |
| 7 | Regras da execução: responsável do setor, serviços na criação da OS, aviso por setor, setor sem organizador | ✅ concluída em 10/10/2026 |
| 8 | Blocos da execução (fila, distribuir, andamento, alertas, concluídos, carga, meus serviços, detalhe) | ✅ concluída em 10/10/2026 |
| 9 | Blocos do comercial (resumo da condição, lista de vendas com andamento, resumo da venda) | ✅ concluída em 10/10/2026 |
| 10 | Blocos do financeiro (cobranças, situação financeira, alerta, indicadores) | ✅ concluída em 10/10/2026 |
| 11 | Linha do tempo da OS e do serviço | ✅ concluída em 10/10/2026 |
| 12 | Frontend (projeto `ergogroup-ordens-servico-frontend`) | a fazer, fase a fase |

Ordem sugerida: 7 → 8 → 9 → 10 → 11. A fase 11 pode andar em paralelo com a 9 e a 10. O frontend acompanha cada fase do backend.

---

## Fase 6 — Camada de dados ✅

| Item | O que muda | Origem |
|---|---|---|
| 6.1 | Saem `horas_estimadas` e `complexidade` de `Servico` e `Tarefa`, com as propriedades `*_efetiva(s)`, os campos dos serializers e do admin. Em `apps/analise`, saem `complexidade_media_concluidas` e `horas_estimadas_entregues` da produtividade. A migração registra quantos registros tinham valor. | ADR 0005 |
| 6.2 | `Servico.prazo` passa a ser calculado: a maior data entre as tarefas não canceladas (vazio sem tarefas). Somente leitura na API. | ADR 0006, 5.1 |
| 6.3 | `Servico.ultima_movimentacao_em`, atualizado pelo sistema, e ciência do alerta: `alerta_ciente_em`, `alerta_ciente_por`, `alerta_ciente_motivo`, `alerta_ciente_observacao`. Propriedades `dias_sem_movimentacao` e `em_alerta_sem_movimentacao`; método `registrar_ciencia()`. Configuração `DIAS_ALERTA_SEM_MOVIMENTACAO` (7). | ADR 0008, 3 |
| 6.4 | `OrdemServico.valor_mensal`, obrigatório no recorrente e oculto para quem não tem `financeiro.ver_valores`. | ADR 0008, 7 |

**Mudanças na API para o frontend:**
- serviço e tarefa não têm mais `horas_estimadas`, `complexidade` nem os campos `*_efetiva(s)` e `complexidade_servico`;
- `prazo` do serviço não é mais editável;
- serviço ganha `ultima_movimentacao_em`, `dias_sem_movimentacao`, `em_alerta_sem_movimentacao` e os campos de ciência (somente leitura);
- OS ganha `valor_mensal`;
- a produtividade perde `complexidade_media_concluidas` e `horas_estimadas_entregues`.

## Fase 7 — Regras da execução ✅

Concluída em 10/10/2026 (217 testes passando).

**Quem organiza um setor:** os **membros do setor** cuja função tem `servicos.ver_setor` e `tarefas.distribuir` (`Setor.organizadores()`). A diretoria pode agir em qualquer setor por `setores.todos`, mas não conta como organizadora: não recebe o aviso de chegada de todos os setores, e um setor organizado só pela diretoria aparece como `sem_organizador`.

**Mudanças na API para o frontend:**
- `POST /ordens/` aceita `servicos: [{catalogo, descricao, prioridade}]`; o catálogo é obrigatório e precisa estar ativo. A resposta (e o detalhe da OS) traz `servicos` com setor e status. Na edição, `servicos` é somente leitura.
- Criar, reatribuir ou mover tarefa para quem não é do setor do serviço responde 400 em `responsavel`. A lista de responsáveis da distribuição deve vir dos membros do setor (`/api/organizacoes/membros/?setor=`).
- Setores trazem `organizadores` (`id`, `nome`) e `sem_organizador`.
- Criar e editar catálogo devolvem `avisos` (lista de textos).
- Novo e-mail: "N serviços para <setor>", para os organizadores do setor.


| Item | O que muda | Testes |
|---|---|---|
| 7.1 | **Responsável do setor** (ADR 0008, 2): validação na tarefa (criar, reatribuir, mover de serviço). Mensagem: "Fulano não pertence ao setor X". | membro aceito; não membro recusado; diretoria distribui só para membros; serviço sem setor livre |
| 7.2 | **Serviços na criação da OS** (ADR 0008, 5): `POST /api/ordens-servico/ordens/` aceita `servicos: [{catalogo, descricao, prioridade}]`, numa transação. | OS com 3 serviços de 2 setores; catálogo inativo recusa tudo; nada é gravado se um serviço falhar |
| 7.3 | **Aviso de chegada por setor:** ao fim da transação, um e-mail por setor para quem tem `tarefas.distribuir` nele, listando os serviços. Serviço acrescentado depois avisa só o setor dele. Respeita `EMAIL_NOTIFICATIONS_ENABLED`. | 2 setores → 2 e-mails; destinatários pela permissão no setor |
| 7.4 | **Setor sem organizador** (ADR 0008, 1): `GET /api/organizacoes/setores/` devolve `organizadores` (nomes completos) e `sem_organizador`; atribuir catálogo a setor sem organizador devolve `avisos` na resposta. | setor novo sem função → `sem_organizador` |
| 7.5 | **Teste de setor novo de ponta a ponta:** cria setor, função com permissões de organização, membro, catálogo e venda; percorre fila → distribuição → execução → conclusão → liberação. | o próprio teste |

## Fase 8 — Blocos da execução ✅

Concluída em 10/10/2026 (247 testes passando). Código: `apps/ordens_servico/services/execucao.py` (lógica), `views/execucao_views.py`, `serializers/execucao_serializer.py` e `urls_execucao.py`, montado em `/api/execucao/`. Documentação de cada endpoint no Swagger, na tag **execução**.

**Ajustes em relação à tabela abaixo:**
- 8.1: quem não acompanha nenhum setor recebe 403.
- 8.4 e 8.9: a idade da tarefa vem em `idade_dias`, contada da criação. Não há data de reatribuição (`atribuida_em` continua proposta), então a idade não reinicia quando a tarefa troca de mão.
- 8.6: só serviços abertos ou em andamento recebem ciência (400 nos demais).
- Erros comuns aos blocos por setor: 400 sem `?setor=`, 404 para setor inexistente e 403 para quem não acompanha o setor. Serviço que a pessoa não vê responde 404.


Todos recebem `?setor=<id>`. A permissão vale **no setor informado**; com `setores.todos`, vale em qualquer setor.

**Etapa do serviço** (calculada, sem campo novo):

| Etapa | Regra |
|---|---|
| `na_fila` | aberto e sem tarefas |
| `distribuido` | aberto e com tarefas |
| `em_execucao` | em andamento |
| `concluido` | concluído |
| `cancelado` | cancelado |

**Situação de prazo:** `atrasado`, `vence_7_dias`, `depois` e `sem_prazo`.

| # | Bloco | Endpoint | Permissão | Resposta (principais campos) |
|---|---|---|---|---|
| 8.1 | Setores que acompanho | `GET /api/execucao/setores/` | `servicos.ver_setor` em algum setor | por setor: `id`, `nome`, `organiza`, contadores `na_fila`, `em_andamento`, `atrasados`, `em_alerta`, `sem_prazo` |
| 8.2 | Fila de triagem | `GET /api/execucao/fila/?setor=` | `servicos.ver_setor` no setor | serviço, catálogo, cliente, OS, data da venda, quem vendeu, prioridade, `na_fila_ha_dias`, `outros_servicos_da_os` (catálogo, setor, etapa) |
| 8.3 | Distribuir | `POST /api/execucao/servicos/{id}/distribuir/` `{tarefas: [{responsavel, prazo, descricao}]}` | `tarefas.distribuir` no setor do serviço | o serviço atualizado; uma tarefa = distribuição; várias = dividir; responsáveis só do setor (7.1) |
| 8.4 | Em andamento | `GET /api/execucao/andamento/?setor=&responsavel=` | `servicos.ver_setor` no setor | tarefas ativas: responsável, serviço, cliente, OS, prazo, situação de prazo, `com_a_pessoa_ha_dias`, alerta do serviço |
| 8.5 | Alertas | `GET /api/execucao/alertas/?setor=` | `servicos.ver_setor` no setor | serviços atrasados ou em alerta de movimentação, com `motivos: ["atrasado", "sem_movimentacao"]` e a ciência vigente |
| 8.6 | Dar ciência do alerta | `POST /api/execucao/servicos/{id}/ciencia/` `{motivo, observacao}` | responsável por tarefa do serviço ou `servicos.ver_setor` no setor | o serviço atualizado |
| 8.7 | Concluídos no período | `GET /api/execucao/concluidos/?setor=&de=&ate=` | `servicos.ver_setor` no setor | serviço, cliente, OS, quem concluiu, prazo, término, `no_prazo` |
| 8.8 | Carga da equipe | `GET /api/execucao/equipe/?setor=` | `servicos.ver_setor` no setor | por membro: nome completo, função, `ativos`, `atrasados`, `vence_7_dias`, `sem_prazo`, `em_alerta`, `mais_antigo_dias`; também serve de lista de responsáveis na distribuição |
| 8.9 | Meus serviços | `GET /api/execucao/meus-servicos/` | nenhuma (só o próprio) | como 8.4, filtrado pelo usuário, atrasados primeiro; `?status=concluida&de=&ate=` para o histórico |
| 8.10 | Detalhe do serviço | `GET /api/execucao/servicos/{id}/` | regras de visibilidade atuais | serviço, etapa, prazo, tarefas, alerta e ciência, contexto da OS **sem valores**, outros serviços da OS com setor, etapa e responsáveis, `pode_distribuir`, `pode_dar_ciencia` |

## Fase 9 — Blocos do comercial ✅

Concluída em 10/10/2026 (257 testes passando). Código: `OrdemServico.condicao_resumo` (modelo), `services/comercial.py`, `views/comercial_views.py` e `urls_comercial.py`, montado em `/api/comercial/` (tag **comercial** no Swagger).

**Ajustes em relação à tabela abaixo:**
- `condicao_resumo` está na lista e no detalhe da OS (`/api/ordens-servico/ordens/`), oculto sem `financeiro.ver_valores`.
- 9.2: `andamento` e `vendido_por_nome` aparecem para todos os que veem a OS, inclusive sem `financeiro.ver_valores`; só a condição fica oculta. `?etapa=` traz as OS com **ao menos um** serviço na etapa (ex.: `na_fila` = vendas com algo ainda não distribuído).
- 9.3: sem `financeiro.ver_valores`, `condicoes` e `financeiro` vêm vazios (`null`); o resto do resumo aparece. Os responsáveis de cada serviço vêm com status, prazo, início e término da tarefa.


| # | Bloco | Endpoint | Permissão | Conteúdo |
|---|---|---|---|---|
| 9.1 | Resumo da condição | campo `condicao_resumo` na OS (lista, detalhe e financeiro) | `financeiro.ver_valores` | texto pronto (ADR 0008, 6) |
| 9.2 | Lista de vendas com andamento | `GET /api/ordens-servico/ordens/` (ajuste) | regras atuais | `andamento: {total, na_fila, distribuido, em_execucao, concluido, cancelado}`, `vendido_por_nome`; filtros `?minhas=true` e `?etapa=` |
| 9.3 | Resumo da venda | `GET /api/comercial/vendas/{id}/` | quem vê a OS; valores só com `financeiro.ver_valores` | quem vendeu e quando; condições e `condicao_resumo`; por serviço: catálogo, setor, etapa, responsáveis, início, término, quem concluiu, prazo; liberação e lançamento (só com `financeiro.ver_valores`) |

## Fase 10 — Blocos do financeiro ✅

Concluída em 10/10/2026 (269 testes passando). Código: `services/financeiro.py`, `views/financeiro_views.py`, `serializers/financeiro_serializer.py` e `urls_financeiro.py`, montado em `/api/financeiro/` (tag **financeiro** no Swagger); indicadores em `apps/analise/services/financeiro.py`.

**Definições tomadas na implementação (proposta, a confirmar):**
- **OS cancelada fica fora da previsão**, porque nunca vai ser liberada. Uma OS cancelada depois de liberada continua em "a faturar", para o financeiro decidir.
- **Previsão ordenada pelo progresso:** a maior fração de serviços concluídos primeiro, depois a data da venda.
- **Faturadas sem data de lançamento** (dados antigos) vão para o fim da lista.
- **Alerta:** `DIAS_ALERTA_SEM_LANCAMENTO` = 3 dias, configurável. Os contadores e `em_alerta` respeitam os mesmos filtros da consulta.
- **10.4:** os eventos (venda, liberação, lançamento) saem dos próprios campos da OS. A linha do tempo completa, a partir da auditoria, é a fase 11. Acessa quem tem `financeiro.ver_valores`, sem a regra de visibilidade da OS.
- **10.5:** os nomes atuais dos indicadores (`total_cobrado`, `total_para_cobrar`, `total_sem_liberacao`) continuam, para não quebrar o frontend. Entraram `total_previsao`, `por_tipo_condicao` (a faturar, faturado e previsão por tipo), `receita_recorrente_mensal` e `recorrentes_ativos`. "Recorrente ativo" = recorrente não cancelado.


| # | Bloco | Endpoint | Permissão | Conteúdo |
|---|---|---|---|---|
| 10.1 | Cobranças | `GET /api/financeiro/cobrancas/?situacao=a_faturar\|faturadas\|previsao` | `financeiro.registrar_cobranca` | contadores por situação e linhas conforme o ADR 0008, 9; filtros: cliente, período da venda, tipo de condição, forma de pagamento, `?em_alerta=true` |
| 10.2 | Alerta "liberada sem lançamento" | campo `dias_aguardando_lancamento` e `em_alerta` nas linhas de 10.1 | — | configuração `DIAS_ALERTA_SEM_LANCAMENTO` (proposta: 3) |
| 10.3 | Faturar | `PATCH /api/ordens-servico/ordens/{id}/cobranca/` (existe) | `financeiro.registrar_cobranca` | sem mudança |
| 10.4 | Situação financeira de uma OS | `GET /api/financeiro/ordens/{id}/` | `financeiro.ver_valores` | tudo da linha de 10.1 + os eventos financeiros da linha do tempo |
| 10.5 | Indicadores | `GET /api/analise/financeiro/` (ajuste) | `financeiro.ver_valores` | a faturar, faturado e previsão; por tipo de condição; receita recorrente mensal |

## Fase 11 — Linha do tempo ✅

Concluída em 10/10/2026 (274 testes passando). Código: `services/linha_do_tempo.py` (tradutor), `serializers/linha_do_tempo_serializer.py` e as ações `linha-do-tempo` nos viewsets de OS e de serviço:
- `GET /api/ordens-servico/ordens/{id}/linha-do-tempo/`: a venda inteira (OS, serviços e tarefas);
- `GET /api/ordens-servico/servicos/{id}/linha-do-tempo/`: só o serviço e suas tarefas.

Cada evento: `quando`, `quem` (nome completo; vazio quando foi o sistema), `tipo`, `texto`, `ordem_servico_id`, `servico_id`, `tarefa_id`. Os tipos estão no Swagger.

**Definições tomadas na implementação (proposta, a confirmar):**
- **Registros do preenchimento inicial da auditoria ficam de fora** (origem `migracao`), porque a data deles é a da migração. No lugar, a OS antiga ganha um evento `historico_anterior`: "Venda de dd/mm/aaaa, registrada antes do histórico detalhado".
- **Sem eventos repetidos:** o "em execução" do serviço e da OS não aparece, porque repete o "iniciou" da tarefa. Aparecem a conclusão, o cancelamento e a reabertura.
- **Liberação e faturamento aparecem para todos**; a condição de pagamento (no evento da venda e nas alterações) e a referência do lançamento só com `financeiro.ver_valores`.
- **Replanejamento:** cada alteração de prazo de tarefa vira um evento "Prazo de X (Fulano) alterado de A para B". Isso cobre o histórico de replanejamento (ADR 0006, 5.3) sem campo novo; a contagem e as faixas continuam como proposta.

**Correção encontrada:** a auditoria gravava `usuario` vazio em todas as ações feitas pela API com JWT, porque o middleware lia o usuário antes de o DRF autenticar o token. Agora o usuário é resolvido na hora de gravar o registro (`apps/auditoria/context.py`). Os registros já gravados sem usuário não são recuperáveis; a linha do tempo mostra "quem" vazio neles.


| # | Item | Detalhe |
|---|---|---|
| 11.1 | Tradutor de eventos | `apps/ordens_servico/services/linha_do_tempo.py` lê a auditoria e devolve eventos `{quando, quem, tipo, texto, ordem_servico, servico, tarefa}` |
| 11.2 | Eventos | venda registrada; serviço chegou ao setor; distribuído (responsável e prazo); reatribuído; prazo alterado; iniciado; concluído; reaberto; ciência do alerta; OS concluída; liberada para o financeiro; faturada (lançada) |
| 11.3 | Endpoints | `GET /api/ordens-servico/ordens/{id}/linha-do-tempo/` e `GET /api/ordens-servico/servicos/{id}/linha-do-tempo/` |
| 11.4 | Visibilidade | quem vê a OS ou o serviço; eventos com valores ou condições só com `financeiro.ver_valores` |
| 11.5 | Testes | sequência completa de uma venda; ocultação de valores; técnico vê só o que vê hoje |

## Fase 12 — Frontend
Acompanha cada fase, no repositório do frontend:
- **fase 6:** tirar horas e complexidade; prazo do serviço somente leitura; valor mensal no formulário do recorrente;
- **fase 7:** formulário da OS envia os serviços junto; lista de responsáveis = equipe do setor;
- **fases 8 a 11:** páginas montadas a partir dos blocos, com o menu pelas permissões (`docs/telas-blocos-e-endpoints.md`, seção 3).

## Pontos ainda abertos (não bloqueiam as fases 7 a 9)
- Nome do domínio e do passo "lançado" (ADR 0007).
- Qual é o sistema financeiro externo e a integração (ADR 0007).
- Preço por vida (`faturamento/02`, seção 6).
- Faixas de prazo mais finas e histórico de replanejamento (ADR 0006, seção 5).
- Permissões do Administrativo (o usuário vai rever na configuração das funções).
