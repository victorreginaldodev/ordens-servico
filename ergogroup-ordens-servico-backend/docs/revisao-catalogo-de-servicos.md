# Revisão do catálogo de serviços (`Catalogo`)

Análise de 14–15/10/2026, pedida pelo usuário. Em 15/10/2026 o usuário pediu para aplicar as travas dos itens **A2 e A3** no backend e no frontend: elas estão em **P-A2 e P-A3 (implementado)**, na seção 3. O A1 (catálogo 125) fica para depois, por decisão do usuário. O resto continua só análise. As seções 1 e 2 descrevem o código (branch `v3`, incluindo as mudanças ainda não commitadas da revisão de permissões, P5/P6) e o banco de dev (consultado só para leitura). **Tudo na seção 3 é proposta**, a decidir. O catálogo operacional está fora de escopo e não foi analisado.

Fontes: `apps/catalogo` (models, serializers, views, `services.py`, testes), `Servico.catalogo` e `Servico.setor` em `apps/ordens_servico`, `src/features/catalogo` e `src/features/vendas` no frontend, ADRs 0001 e 0004, `conceitos-de-dominio.md` e `revisao-permissoes-e-setores.md` (P5/P6).

---

## 1. O que está bom

- **Modelo enxuto e coerente com o ADR 0004:** `Catalogo.setor` é obrigatório no banco (`PROTECT`), `Servico.setor` é uma cópia feita ao receber o catálogo (`Servico.definir_setor_pelo_catalogo`) e `Catalogo.ativo` aposenta sem perder histórico.
- **Validações principais nos dois lados da venda:** catálogo inativo é recusado em `ServicoSerializer` e em `ServicoDaVendaSerializer`; o frontend só oferece os ativos.
- **Exclusão segura:** catálogo em uso responde 409 com a dica "Desative o catálogo em vez de excluí-lo".
- **API explícita:** campos listados (sem `__all__`), `setor_nome`, filtros `q`, `setor` e `ativo`, documentação OpenAPI.
- **P5 bem amarrada no momento da gravação:** catálogo ativo só em setor com quem receba tarefas (criar, mudar de setor, reativar), lote em transação (`mudar_setor_dos_catalogos`), serviços movidos auditados, com recebimento zerado e aviso de chegada.
- **Testes do essencial:** 8 em `tests.py` e 14 de catálogo em `tests_setor_do_catalogo.py` (setor obrigatório, inativo, 409, regra de quem recebe, mover ou não mover, lote, permissão do lote).
- **Tela:** modal em etapas (formulário → desativar → excluir, nunca empilhado), formulário no endereço (`/catalogo/:id/edit`), `DataTable` com visões Ativos/Inativos/Todos, faceta por setor, cards agrupados por setor e a pergunta "Mover também os N serviços em aberto".

---

## 2. Diagnóstico (por gravidade)

### Alta

**A1. Um catálogo ativo já está num setor sem ninguém.**
- `125 · ERGONOMIA - AET MODELO MOSAIC` está **ativo em Ergonomia**, e Ergonomia tem **0 pessoas que recebem tarefas e 0 que organizam** (banco de dev, 14/10/2026).
- A regra da P5 só é verificada quando o catálogo é gravado; esse dado é anterior a ela.
- Consequência: a próxima venda desse catálogo cai numa fila sem ninguém para receber, distribuir ou ser avisado.
- O único serviço já vendido dele (serviço 1540, aberto e sem tarefas) ficou em Segurança do Trabalho, porque foi vendido antes da troca. É o único serviço do banco com setor diferente do setor do catálogo.

**A2. A regra "catálogo ativo só em setor com quem receba tarefas" pode ser quebrada por outros caminhos.**
A regra só é verificada em `CatalogoSerializer` e em `mudar_setor_dos_catalogos`. Nada impede que o setor fique sem ninguém depois:
- **desativar o setor** que tem catálogos ativos é aceito (`SetorSerializer` não valida isso). Os catálogos continuam ativos apontando para um setor desativado, e a venda continua mandando serviços para lá;
- **tirar a última pessoa que recebe:**
  - mudar o vínculo ou a função;
  - desativar o usuário;
  - desmarcar "Recebe tarefas" na função;
  - tirar "Também executa em";
- **admin do Django:** `CatalogoAdmin` edita o setor sem nenhuma dessas validações;
- **a venda não verifica:** `registrar_venda` e `ServicoSerializer.create` aceitam o catálogo sem olhar se o setor tem quem receba.

A tela de Setores mostra o aviso "Sem quem receba tarefas", mas quem vende não o vê.

**A3. Trocar o catálogo de um serviço que já tem tarefas troca o setor do serviço.**
- `PATCH /api/ordens-servico/servicos/{id}/` aceita `catalogo` (permissão `os.gerenciar` ou `servicos.gerenciar`).
- `Servico.definir_setor_pelo_catalogo` copia o setor do novo catálogo **mesmo com tarefas**: o serviço vai para outro setor e as tarefas ficam com responsáveis de um setor que não é mais o dele.
- Isso contradiz a regra da P5 ("os serviços com tarefas ficam no setor antigo") e não é auditado como mudança de setor.
- Também em `ServicoSerializer`: `catalogo` aceita `null`, e um serviço sem catálogo fica **sem setor**, fora de todas as filas. Na venda (`ServicoDaVendaSerializer`), o catálogo é obrigatório. Existe 1 serviço assim no banco (813, concluído, legado).

### Média

**M1. A mudança de setor (e de situação) do catálogo não deixa rastro.**
- A auditoria não cobre o catálogo: `EntidadeAuditada` só tem OS, Serviço, Tarefa e OS operacional.
- O lote grava com `QuerySet.update()`, e o `PATCH` grava sem registro.
- Hoje só ficam registrados os serviços movidos. Não se sabe quem passou o catálogo X para o setor Y, nem quando, e essa decisão define filas.

**M2. Os subitens não são usados, mas continuam no sistema.**
- O banco tem **0 subitens**, e o frontend não usa nada deles.
- Mesmo assim continuam:
  - o modelo `SubitemCatalogo`;
  - o CRUD `/api/catalogo/subitens/`;
  - o inline no admin;
  - o campo `subitens` embutido em toda resposta de catálogo (com `prefetch_related` em toda listagem), inclusive dentro de `catalogo_detail` do serviço.
- A remoção está pendente desde o ADR 0004 ("manter ou remover os subitens de catálogo (sem uso)").

**M3. Qualidade do cadastro.**
- **Nomes duplicados**, sem regra de unicidade:
  - `24` e `115` "ERGONOMIA - ELABORAÇÃO DE AEP" (14 e 6 serviços);
  - `76` "Treinamento PCA" (0 serviços) e `77` "TREINAMENTO PCA" (1 serviço).
- **Grafia:**
  - "GINÁSTICA ELABORAL" (laboral);
  - "AVALIAÇÃO CINSESIOLÓGICA" (cinesiológica);
  - espaço duplo em "Elaboração de Laudo Técnico de Áreas  Classificadas";
  - mistura de caixa alta e baixa (a venda mostra tudo em caixa alta).
- **Nomes que são só código, sem nenhuma venda:** `PC005`, `PCA004`. Há também `TREINAMENTO - PC004` e `TREINAMENTO - PC005`, com 1 venda cada.
- **Sem descrição:** 102 dos 123. O formulário diz que a descrição "ajuda o comercial a escolher", mas a venda não a mostra (M5).
- **Sem nenhuma venda:** 9 catálogos.

**M4. Classificação por setor ainda não feita.** Hoje são 122 em Segurança do Trabalho e 1 em Ergonomia (A1).
- Os 9 "ERGONOMIA - …" em Segurança têm **24 serviços em aberto e sem tarefas**, que iriam junto se "mover" for marcado:

  | Catálogo | Serviços em aberto e sem tarefas |
  |---|---|
  | `24` | 4 |
  | `115` | 4 |
  | `116` | 2 |
  | `118` | 14 |

- Mover esses catálogos continua bloqueado até Ergonomia ter quem receba tarefas.
- **Candidatos a conferir com a gestora técnica** (proposta minha, só pelo nome):
  - `14 TREINAMENTO NR-17` (a NR-17 é a norma de ergonomia; há também `120 ERGONOMIA - TREINAMENTO - NR17`);
  - `99 GINÁSTICA ELABORAL` (ginástica laboral);
  - `128 INCLUSÃO DOS FATORES DE RISCOS PSICOSSOCIAIS NO PGR`;
  - `130 AVALIAÇÃO PSICOLOGICA EMOCIONAL - PSICOGATTI`;
  - `97 LAUDOS PSICOLOGICOS`.
- Os de medicina (`31–33 PCMSO`, `59 EXECUÇÃO DE EXAMES`, `57 ASSISTÊNCIA MÉDICA PERICIAL`, `121 RELATÓRIO ANALITICO PCMSO`) não têm setor próprio hoje. Ficam em Segurança, a menos que a empresa crie um.

**M5. Na venda, o catálogo aparece sem descrição e de dois jeitos diferentes.**
- **Nova venda** (`ServicosDaVendaModal`): lista única em ordem alfabética, com o setor como prefixo (pedido do usuário em 14/10/2026).
- **Acrescentar serviço** (`AcrescentarServicoModal`): agrupa as opções por setor e repete o setor ao lado.
- Nenhum dos dois mostra a **descrição** do catálogo. Ela não chega nem ao tipo: `ServicoDoCatalogo` só tem `id`, `nome` e `setorNome`.

**M6. "Excluir" aparece em todo catálogo, mas 114 dos 123 já foram vendidos.**
- A pessoa só descobre isso depois de confirmar (409, toast e desvio para "Desativar").
- A API não informa se o catálogo está em uso: não há `servicos_vendidos` nem `em_uso`.

### Baixa

**B1. Padrões diferentes para a mesma pergunta.** "Mover também os serviços em aberto" vem **desmarcado** no formulário de um catálogo e **marcado** no lote.

**B2. Setores que vão ser recusados aparecem como escolhíveis.**
- No formulário e no lote, o setor sem quem receba aparece como "(ninguém recebe tarefas)", mas pode ser escolhido. O backend recusa só depois de salvar.
- Para catálogo ativo, a opção poderia vir desabilitada, com a explicação.

**B3. Regras pequenas inconsistentes no backend.**
- `PUT` sem `ativo` reativa o catálogo (`extra_kwargs ativo default True`). O frontend usa `PATCH`, então hoje isso não acontece.
- `validate_setor` só recusa setor inativo quando o setor muda. Já `validate` exige "quem receba" ao reativar, mas não exige setor ativo ao reativar: dá para reativar um catálogo cujo setor foi desativado.

**B4. Custo desnecessário em toda chamada.**
- `GET /catalogos/` sempre calcula a subconsulta de `servicos_em_aberto` e carrega os subitens, inclusive na venda e em Setores, que não usam nenhum dos dois.
- A venda busca todos os catálogos e filtra os ativos no navegador, sem usar `?ativo=true`.
- `catalogo_detail` no serviço embute o catálogo inteiro e faz um `COUNT` extra, porque ali `servicos_em_aberto` não vem anotado.
- Com 123 itens, o impacto é pequeno.

**B5. Código morto ou que sobrou.**
- Frontend, `features/catalogo`:
  - `getRepositories`, `useRepositories` e `RepositoryItem` ("Compat … Ordens de Serviço"): sem uso;
  - `getCatalogo` e `useCatalogo`: sem uso;
  - `getCatalogos` aceita só `q` (não repassa `setor` nem `ativo`).
- Frontend, setor como opcional:
  - `CatalogoItem.setor: number | null`, `SEM_SETOR`/"Sem setor" (lista, venda) e `catalogosSemSetor` (`useResumoSetores`) tratam o setor como opcional, mas ele é obrigatório no banco.
- Frontend, cache:
  - `useDeleteCatalogo` não invalida `['organizacao', 'setores']` (a contagem `catalogos_ativos` do setor fica velha até recarregar).
- Backend:
  - todo o conjunto de subitens (M2);
  - a descrição do `destroy` diz "e todos os seus subitens".

**B6. Testes que faltam.**
- Lote:
  - aviso de chegada e auditoria dos serviços movidos;
  - serviço com tarefas fica no setor antigo;
  - lote só com catálogos inativos para setor sem quem receba (deveria passar).
- Serviço:
  - trocar o catálogo de um serviço com tarefas (A3);
  - serviço sem catálogo via API.
- Permissões e reativação:
  - criar e excluir sem `catalogo.gerenciar` (hoje só há o teste do `PATCH`, em `organizacoes/tests_permissoes.py`);
  - reativar em setor desativado (B3).
- Organização dos arquivos: os 4 testes de função e cobrança (P7) estão em `apps/catalogo/tests_setor_do_catalogo.py`; o lugar deles é `organizacoes` ou `financeiro`.
- O frontend não tem nenhum teste automatizado (geral, não só o catálogo).

**B7. Permissão para mudar o setor com serviços junto.**
- Mudar o setor do catálogo e levar os serviços em aberto mexe na fila de dois setores e zera o recebimento.
- Hoje basta `catalogo.gerenciar`, que o comercial também tem. Não segue o princípio "ninguém concede o que não tem" usado em "Também executa em".

---

## 3. Propostas (a decidir)

> Tudo é **proposta**, menos P-A2 e P-A3, implementados a pedido do usuário em 15/10/2026 (forma mais segura, combinada na conversa: bloquear onde quem age pode resolver, avisar onde bloquear atrapalharia outro trabalho).

### P-A1. Resolver o catálogo 125 agora (dados)

> Adiado pelo usuário em 15/10/2026 ("não é para resolver agora").
- **Opção 1 (recomendada):** voltar `125` para Segurança do Trabalho e incluí-lo no lote dos "ERGONOMIA - …" quando Ergonomia tiver quem receba.
- **Opção 2:** desativá-lo até lá. Isso esconde o serviço da venda.

Pela tela, a opção 1 é "Editar → Setor responsável → Segurança do Trabalho". É uma alteração no banco compartilhado, feita só com o seu ok.

### P-A2. Manter a regra válida depois da gravação (implementado em 15/10/2026)
| Onde | Tratamento | Backend | Frontend |
|---|---|---|---|
| Desativar um setor com catálogos ativos | **Bloqueia (400)**: "O setor X executa N catálogos ativos. Passe-os a outro setor (ou desative-os) no Catálogo antes de desativar o setor." | `SetorSerializer.validate_ativo` e `SetorAdminForm`, com `catalogo.services.motivo_para_nao_desativar_o_setor` | Setores → Desativar: com catálogos ativos, a etapa explica o bloqueio e oferece "Ir para o Catálogo" (já filtrado pelo setor), em vez do botão de desativar. O texto antigo "catálogos já ligados continuam no setor" saiu. |
| Tirar a última pessoa que recebe (vínculo, função, desativar a pessoa, "Também executa em") | **Só avisa**, nunca bloqueia: a resposta traz `avisos` com cada setor que executa catálogos ativos e ficou sem quem receba **por causa desta mudança** (setor que já estava assim não repete o aviso). | `organizacoes/views/avisos.py` (`AvisaSetorSemQuemRecebeMixin` em usuários, funções e vínculos; `com_avisos_de_quem_recebe` em `usuarios/{id}/desativar/`), com `setores_sem_quem_receba` e `avisos_de_setores_que_ficaram_sem_quem_receba` | Time (salvar e desativar pessoa) e Funções (salvar e desativar função): toast "…, com um aviso" com o texto do backend, 12 s na tela (`lib/avisos.ts`). |
| Venda de catálogo cujo setor está sem ninguém | **Registra e avisa**: a venda passa; a resposta traz `avisos` ("O setor X não tem quem receba tarefas agora: o serviço foi registrado, mas fica parado…"). | `OrdemServicoViewSet.create` e `ServicoViewSet.create`, com `catalogo.services.avisos_da_venda` | Nova venda e Acrescentar serviço: toast "…, com um aviso". |
| Venda de catálogo cujo setor está **inativo** | **Bloqueia (400)** (só acontece com dado antigo, porque o setor já não pode ser desativado com catálogos ativos). | `validar_catalogo_vendavel` em `ServicoDaVendaSerializer` e `ServicoSerializer` | Erro do backend no formulário. |
| Admin do Django | Catálogo ativo só em setor ativo e com quem receba (mesma regra da API); setor **só leitura** num catálogo existente (mudar de setor é pelo sistema, que pergunta pelos serviços em aberto). | `CatalogoAdminForm` e `CatalogoAdmin.get_readonly_fields` | — |

Continua **proposta** (não implementado): indicador dos catálogos em risco na tela do Catálogo (`?setor_sem_quem_receba=true` ou campo `setor_recebe_tarefas`). Hoje o aviso aparece em Setores ("sem quem receba") e nos toasts acima.

### P-A3. Trocar o catálogo de um serviço (implementado em 15/10/2026)
- **Mesmo setor:** sempre aceita, com ou sem tarefas.
- **Outro setor, com tarefas:** 400 em `catalogo`: "Este serviço já tem tarefas no setor X, então só pode trocar por um catálogo do mesmo setor. Para levá-lo ao setor Y, acrescente à venda um serviço novo com este catálogo."
- **Outro setor, sem tarefas:** só serviço **em aberto** (os demais: 400). O serviço passa ao setor novo, o recebimento volta a zero, a movimentação é registrada, o setor novo recebe o aviso de chegada, e a troca fica na auditoria do serviço (o `save` é auditado).
- **Permissão:** passar o serviço para outro setor exige `os.gerenciar` ou `servicos.gerenciar` **no setor de destino** (403 sem isso).
- **Catálogo obrigatório:** na criação (`POST /servicos/`) e sem `null` na edição. O serviço 813 (legado, concluído) fica como está.
- **Admin:** catálogo e setor do serviço ficam só leitura num serviço existente.
- Código: `catalogo.services.motivo_para_nao_trocar_o_catalogo`, `ServicoSerializer.validate` e `update`, `ServicoAdmin.get_readonly_fields`.
- Frontend: nenhuma tela troca o catálogo de um serviço hoje, então não houve mudança.

Testes: `apps/catalogo/tests_seguranca_do_setor.py` (19 casos). Sem migração: as regras valem daqui para frente e não mexem em dado existente.

### P-M1. Auditoria do catálogo
- `EntidadeAuditada.CATALOGO`. Registrar criação, mudança de `nome`, `setor` e `ativo`, e exclusão, com o motivo "Mudança de setor em lote (N catálogos)" no lote.
- Endpoint de leitura: `GET /api/catalogo/catalogos/{id}/historico/` (quem, quando, de → para). Exige `auditoria.ver`.

### P-M2. Remover os subitens
1. Tirar `subitens` de `CatalogoSerializer` e do `prefetch`.
2. Remover a rota `/api/catalogo/subitens/`, o `SubitemCatalogoViewSet`, o serializer e o admin.
3. Migração que remove `SubitemCatalogo`. O banco tem 0 registros; é uma migração só de schema.
4. Regenerar o contrato e os tipos do frontend. Atualizar o ADR 0004 (pendência resolvida) e `mapa-de-permissoes.md`.

### P-M3. Unicidade e limpeza do cadastro
- **Validação:** entre os catálogos **ativos**, nome único sem diferenciar caixa e acento, com espaços normalizados (`strip` e espaço único). O 400 diz: "Já existe o serviço 'X' no catálogo."
- **Juntar duplicados:** desativar o menos usado (`115` e `76`). Mover os serviços do duplicado para o outro reescreveria o histórico, então não é recomendado.
- **Limpeza com a área:** a lista do apêndice B (grafia, códigos sem contexto, sem vendas), para decidir caso a caso: corrigir, desativar ou excluir (só quem não tem vendas).

### P-M4. Classificação
1. Ergonomia ganha quem receba tarefas (vínculo lotado com "Recebe tarefas" ou "Também executa em").
2. "Mudar setor em lote": De Segurança do Trabalho → Para Ergonomia, filtro "ERGONOMIA", marcar os 9, decidir sobre os 24 serviços em aberto.
3. Os candidatos da M4 são conferidos com a gestora técnica antes de entrar no lote.

### P-M5. Descrição e um padrão só na escolha do serviço (muda tela; wireframe W1)
- `ServicoDoCatalogo` ganha `descricao`.
- Ao escolher o serviço, a descrição aparece logo abaixo do campo.
- O "Acrescentar serviço" passa a usar o mesmo seletor da Nova venda (lista alfabética com o setor como prefixo), em vez do agrupado por setor.
- Na lista de opções, a descrição aparece em uma linha, truncada, abaixo do nome.

### P-M6. Saber se o catálogo está em uso (muda tela; wireframes W2 e W3)
- A API devolve `servicos_vendidos` (total de serviços com este catálogo), anotado na lista.
- **Formulário:** com `servicos_vendidos > 0`, o rodapé mostra "Desativar" no lugar de "Excluir". Com 0, mostra "Excluir".
- **Ações da linha:** a mesma regra.
- **Lista (tabela):** colunas "Vendidos" e "Em aberto" (prioridade 2, uma informação por coluna) e a visão "Sem descrição", que ajuda a limpeza da M3.

### P-B. Ajustes menores
- **B1:** um padrão só para "Mover também os serviços em aberto". Proposta: **marcado** nos dois, porque serviço sem tarefas deixado no setor antigo costuma ser o erro que se quer corrigir.
- **B2:** com o catálogo ativo, a opção de setor sem quem receba vem **desabilitada**, com a linha "Ninguém recebe tarefas neste setor. Configure em Setores." e o link.
- **B3:** `ativo` sem default no `PUT`. Exigir setor ativo também ao reativar.
- **B4:**
  - Parâmetro `?campos=resumo` (ou um endpoint `GET /catalogos/opcoes/`) com `id`, `nome`, `descricao`, `setor` e `setor_nome`, sem a contagem, para a venda e a tela de Setores.
  - A venda passa `ativo=true`.
  - `catalogo_detail` no serviço passa a usar um serializer resumido.
- **B5:** remover o código morto listado, tornar `setor` obrigatório no tipo do frontend (sem "Sem setor") e invalidar `['organizacao', 'setores']` ao excluir.
- **B6:** escrever os testes listados e mover os testes de P7 para o app certo.
- **B7:** ao mudar o setor **com** `mover_servicos_em_aberto=true`, exigir também `tarefas.distribuir` no setor de origem e no de destino (ou `setores.todos`). Sem mover, `catalogo.gerenciar` basta. Alternativa: deixar como está e registrar na auditoria (P-M1).

### Ordem sugerida
| Etapa | O quê |
|---|---|
| 1 | Decidir P-A1 (dado do catálogo 125), adiado pelo usuário |
| 2 | Backend: ~~P-A2, P-A3~~ (feitos em 15/10/2026), P-M1, P-M3 (validação), P-B3, P-B6 |
| 3 | P-M2 (remover subitens), com o contrato regenerado |
| 4 | Telas, depois dos wireframes aprovados: W1, W2, W3, P-B1, P-B2, P-B5 |
| 5 | Dados com a área: limpeza (apêndice B) e classificação (P-M4) |

---

## 4. Wireframes (para aprovação)

### W1. Escolha do serviço na Nova venda e em "Acrescentar serviço" (P-M5)
```
┌ Adicionar serviço ─────────────────────────────────────────────┐
│ Serviço                                      Prioridade        │
│ [ SEGURANÇA DO TRABALHO · LTCAT          ▾ ] [ Da venda (Média)▾]│
│   Laudo técnico das condições ambientais do trabalho, com       │
│   medições quantitativas. Entrega em PDF assinado.  ← descrição │
│   Vai para a fila de Segurança do Trabalho.                     │
│                                                                 │
│ O que será feito                                                │
│ [ fábrica e depósito, contato: ...                           ]  │
│                                     [Cancelar] [Adicionar]      │
└─────────────────────────────────────────────────────────────────┘

Lista aberta (a mesma nos dois modais):
┌──────────────────────────────────────────────┐
│ 🔍 ltc                                        │
│ SEGURANÇA DO TRABALHO · LTCAT                 │
│   Laudo técnico das condições ambientais…     │  ← 1 linha, truncada
│ SEGURANÇA DO TRABALHO · LTCAT EXTEMPORANEO    │
│   (sem descrição: a linha não aparece)        │
└──────────────────────────────────────────────┘
```

### W2. Formulário do catálogo: rodapé conforme o uso e setor desabilitado (P-M6, P-B2)
```
┌ Editar serviço ────────────────────────────────────────────────┐
│ Nome do serviço  [ LTCAT                                    ]  │
│ Setor responsável                                               │
│ [ Segurança do Trabalho                                   ▾ ]  │
│    ├ Segurança do Trabalho                                      │
│    ├ Ergonomia            (desabilitado)                        │
│    │   Ninguém recebe tarefas neste setor. Configure em Setores │
│    └ ...                                                        │
│ Descrição  [ ...                                            ]  │
│ Disponível para novas OS                               [ on ]  │
│ Vendido em 56 serviços · 0 em aberto                            │
│─────────────────────────────────────────────────────────────────│
│ [Desativar]                         [Cancelar] [Salvar]         │
└─────────────────────────────────────────────────────────────────┘
Com 0 vendidos: "Excluir" (vermelho) no lugar de "Desativar".
```

### W3. Lista do catálogo, layout tabela (P-M6, P-M3)
```
Catálogo de serviços  123          [Mudar setor em lote] [+ Novo serviço]
[Ativos] [Inativos] [Todos] [Sem descrição]   🔍 Buscar…   Setor ▾

│ Serviço                     │ Descrição         │ Setor responsável      │ Vendidos │ Em aberto │ Situação │ ⋯ │
│ LTCAT                       │ —                 │ Segurança do Trabalho  │    56    │     0     │ Ativo    │ ⋯ │
│ ERGONOMIA - PSICOSSOCIAL…   │ —                 │ Segurança do Trabalho  │    33    │    14     │ Ativo    │ ⋯ │
│ PC005                       │ —                 │ Segurança do Trabalho  │     0    │     0     │ Ativo    │ ⋯ │
  ⋯ = Editar · Desativar/Reativar · Excluir (só quando Vendidos = 0)
```
"Vendidos" e "Em aberto" têm prioridade 2 (somem primeiro em telas estreitas). No layout de cards, nada muda.

---

## Apêndice A. Números do banco de dev (14/10/2026, só leitura)

| Item | Valor |
|---|---|
| Catálogos | 123, todos ativos |
| Por setor | Segurança do Trabalho 122 · Ergonomia 1 (`125`) |
| Setores que recebem tarefas | Segurança do Trabalho (28 pessoas, 7 organizam); Ergonomia 0 |
| Subitens | 0 |
| Sem descrição | 102 |
| Sem nenhuma venda | 9 (`117`, `82`, `89`, `88`, `38`, `37`, `19`, `65`, `76`) |
| Nomes duplicados | `24`/`115`, `76`/`77` |
| Serviços | 1.527: 1.526 em Segurança do Trabalho, 1 sem catálogo e sem setor (`813`, concluído) |
| Serviço com setor diferente do catálogo | 1 (`1540`, catálogo `125`, aberto, sem tarefas, em Segurança do Trabalho) |
| Serviços em aberto e sem tarefas nos "ERGONOMIA - …" de Segurança | 24 |

## Apêndice B. Lista para a limpeza com a área (P-M3)
| ID | Nome | Vendas | Observação |
|---|---|---|---|
| 115 | ERGONOMIA - ELABORAÇÃO DE AEP | 6 | duplicado do `24` (14 vendas) |
| 76 | Treinamento PCA | 0 | duplicado do `77` |
| 99 | GINÁSTICA ELABORAL | 2 | grafia ("laboral") |
| 119 | ERGONOMIA - AVALIAÇÃO CINSESIOLÓGICA FUNCIONAL (ACF) | 1 | grafia ("cinesiológica") |
| 96 | Elaboração de Laudo Técnico de Áreas  Classificadas | 1 | espaço duplo |
| 89 | PC005 | 0 | só código; há `91 TREINAMENTO - PC005` |
| 88 | PCA004 | 0 | só código; há `90 TREINAMENTO - PC004` |
| 82 | MOBILIZAÇÃO PORTAL | 0 | parecido com `79 ASSESSORIA EM PORTAIS DE MOBILIZAÇÃO` |
| 14 / 120 | TREINAMENTO NR-17 / ERGONOMIA - TREINAMENTO - NR17 | 5 / 2 | mesmo assunto em dois catálogos e dois setores possíveis |
| 117, 38, 37, 19, 65 | (sem vendas) | 0 | decidir se continuam |
