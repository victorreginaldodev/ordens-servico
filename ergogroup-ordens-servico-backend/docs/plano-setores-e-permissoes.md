# Plano — setores, funções e permissões

Plano de 09/10/2026 para implementar no backend a modelagem discutida (organização → setores → funções → vínculos) e corrigir as falhas A1–A8 de [mapa-de-permissoes.md](mapa-de-permissoes.md).

## Princípios

1. **O backend é a barreira de segurança.** O frontend já esconde as ações proibidas, mas qualquer usuário logado pode chamar a API direto com o próprio token. As regras precisam valer no servidor.
2. **Regras por código de permissão desde o primeiro passo.** As views passam a perguntar "o usuário tem `financeiro.registrar_cobranca`?" e nunca "o usuário é `gestor_financeiro`?". No começo, a resposta vem do `tipo_usuario`; depois, dos vínculos com setores. A troca acontece num lugar só.
3. **Nenhuma mudança de comportamento para quem usa a tela.** As regras novas reproduzem o que o frontend já trava. Restringir mais é decisão da gestora, feita depois, na configuração das funções.
4. **Migrações pequenas.** Uma alteração de schema por migração, separada da migração de dados, porque o MySQL não desfaz DDL em transação.
5. **Lógica em `services`**, não em serializers ou views.

## Fora de escopo

- **OS operacional** (`OrdemServicoOperacional`, OSO, "mini OS") e catálogo operacional: fora de escopo. Não entram em análises, propostas nem implementações sem pedido explícito.

## Situação dos problemas originais (10/10/2026)

| Problema | Situação |
|---|---|
| Exclusão em cascata ao excluir catálogo | Resolvido (ADR 0002) |
| Dependências da gestão de setores: criar setores e revisar usuários e permissões | Resolvido no backend (ADRs 0003 e 0004); frontend pendente |
| Falta de gestão nos setores de execução: o que chegou, o que está em andamento e com quem | Analisado e parcialmente decidido (ADR 0006); visões e telas a definir; implementação pendente (fase 5) |
| Controle de faturamento: condições definidas na venda | Papel do sistema decidido e camada de dados implementada (ADR 0007, `docs/faturamento/`): condições em campos, `liberar_em`, referência e origem do lançamento, contrato substituído pelo recorrente. Telas pendentes |

## Pendências no frontend (já conhecidas)
- Esconder o campo de valor no formulário de OS para quem não tem `financeiro.ver_valores`. Hoje ele aparece zerado; nada é gravado, porque o backend ignora o campo, mas confunde.
- Exibir a mensagem do 409 ao tentar excluir algo em uso (ADR 0002).

## Antes de levar a `epic/v3` para produção (checklist)
1. **Backend e frontend juntos:** o frontend antigo depende de `tipo_usuario`, que não existe mais. As duas `epic/v3` precisam subir juntas.
2. **Tipos de usuário em produção:** a migração `organizacoes/0013` vincula cada usuário pelo tipo. Conferir se todos os tipos existentes estão no mapeamento; usuários com tipo desconhecido ficariam sem vínculo e sem acesso.
3. **`ativo` × `is_active`:** quem está desativado em qualquer das duas flags fica inativo. No dev foi 1 usuário (id 28). Conferir em produção quem será afetado.
4. **Catálogos:** todos vão para Segurança do Trabalho (`catalogo/0007`); os serviços recebem esse setor (`ordens_servico/0007`, sem registro de auditoria, porque é atualização direta).
5. **Faturamento (ADR 0007):** conferir quantas OS têm contrato antes de migrar (no dev há 1); a migração `ordens_servico/0015` copia os dados para a observação e lista as OS afetadas. Conferir também que nenhum usuário tem vínculo em mais de um setor: a `organizacoes/0016` para se tiver.
6. **Logs:** verificar se os logs de produção têm senhas ou tokens gravados pelo login (ADR 0003, achado de segurança).
7. **Primeiro acesso de diretoria:** se algum diretor ficar sem vínculo, o primeiro vínculo de diretoria precisa ser criado por superusuário ou pelo admin.
8. **E-mails:** as notificações continuam desligadas por `EMAIL_NOTIFICATIONS_ENABLED`; ligá-las é uma decisão à parte.

## Código legado sem uso
- `apps/contas/management/commands/migrar_dados_legado.py` importa apps que não existem mais (`apps.ordem_servico`, `apps.servicos`, `apps.tarefas`) e não funciona desde antes desta sprint. Pode ser removido.

## Visão geral

| Fase | Entrega | Muda comportamento? | Depende de |
|---|---|---|---|
| 0 | Fechar o trabalho em aberto | não | — |
| 1 | Catálogo de permissões + correção de A1–A8 | só para chamadas diretas à API que o front já bloqueia | regras do front (passo 1.1) |
| 2 | Estrutura: funções, permissões das funções, vínculos | não | fase 1 |
| 3 | Permissões passam a vir dos vínculos | não (com a migração dos usuários) | fase 2 + setores e funções iniciais |
| 4 | Remover `tipo_usuario` e a flag `ativo` duplicada | não | fase 3 + front adaptado |
| 5 | Painel do setor | nova funcionalidade | fase 3 + catálogos classificados |

Cada fase vira uma branch a partir de `main`, com um commit por item e testes para cada regra.

---

## Fase 0 — Fechar o que está aberto ✅

- [x] Separar da branch `feat/organizacao-catalogo` os modelos ainda sem migração (`Funcao`, `MembroSetor`, `Setor.organizacao`). Eles voltam na fase 2.
- [x] Commit da branch: remoção de horas e complexidade do catálogo e entidade `Organizacao` (migrações já aplicadas no dev).
- [x] Commit da documentação (`docs/as-is/`, briefing, mapa e este plano).
- [ ] Em paralelo: levar as 8 perguntas da seção 4 do mapa para a gestora. Elas não bloqueiam as fases 1 e 2.

## Fase 1 — Catálogo de permissões e correção das falhas ✅

Concluída em 09/10/2026, na branch `feat/permissoes-fase1`, com um commit por item.

**1.1 Levantar as regras do frontend.** Ler as travas de tela no projeto React: quais tipos veem cada menu, botão e campo. Isso fecha a tabela de equivalência *tipo de usuário → permissões* e garante que o backend bloqueie exatamente o que a tela já bloqueia. Divergências entre o front e o mapa voltam para você decidir.

**1.2 Catálogo de permissões no código.** Em `apps/organizacoes/permissoes.py`:
- enum `Permissao` com os códigos da seção 3 do mapa e o escopo de cada um (global ou por setor);
- `permissoes_do_usuario(usuario)`: por enquanto calculada a partir do `tipo_usuario` pela tabela de equivalência; superusuário tem todas;
- `tem_permissao(usuario, codigo, setor=None)`;
- uma permissão DRF reutilizável, por exemplo `TemPermissao('clientes.gerenciar')`, para as views.

**1.3 Aplicar e corrigir.** Uma regra por commit, cada uma com teste:

| Falha | Correção |
|---|---|
| A1 | Sem `usuarios.gerenciar`, `tipo_usuario`, `ativo`, `is_staff` e `is_superuser` ficam somente leitura, inclusive no próprio cadastro |
| A8 | Só quem é diretor (ou superusuário) cria, edita, desativa ou exclui diretores |
| A3 | Campos de cobrança somente leitura na edição genérica de OS e OSO; os endpoints de cobrança exigem `financeiro.registrar_cobranca` |
| A2 | Sem `financeiro.ver_valores`, valor e condições de pagamento saem da resposta das OS (lista, detalhe e liberação para cobrança) |
| A4 | Auditoria exige `auditoria.ver` |
| A5 | Serviços passam a ter o mesmo filtro de visibilidade de OS e tarefas |
| A6 | Criar, reatribuir e excluir tarefa exige `tarefas.distribuir`; o responsável continua atualizando a própria tarefa |
| A7 | Escrita em clientes, catálogos, OS e serviços exige `clientes.gerenciar`, `catalogo.gerenciar`, `os.gerenciar` e `os.excluir` |

As permissões atuais (`IsGestor`, `PodeModificarTarefa`, `PodeVerValoresFinanceiros`, `TIPOS_*`) passam a usar `tem_permissao` e depois são removidas.

**Saída:** todas as regras da API em códigos de permissão, as falhas A1–A8 fechadas e nenhuma diferença para quem usa a tela.

## Fase 2 — Estrutura de setores, funções e vínculos ✅

Concluída em 09/10/2026, na branch `feat/estrutura-setores-funcoes`. Endpoints: `/api/organizacoes/funcoes/` (com `permissoes-disponiveis`) e `/api/organizacoes/membros/`.

Só schema e API de cadastro; nenhuma regra ainda lê isso.

| Item | Detalhe |
|---|---|
| `Setor.organizacao` | Três migrações: coluna opcional → preencher com a organização existente → obrigatória. Nome único por organização. |
| `Funcao` | `organizacao`, `nome` (livre, único por organização), `descricao`, `ativo` |
| `FuncaoPermissao` | `funcao`, `permissao` (código do enum), único por par |
| `MembroSetor` | `usuario`, `setor`, `funcao`, único por usuário + setor; função e setor da mesma organização |
| API | CRUD de funções (com lista de permissões) e de vínculos; `GET` do catálogo de permissões com descrição e escopo, para a tela de configurações; tudo exige `organizacao.configurar` ou `usuarios.gerenciar` |
| Proteções | Excluir setor ou função em uso responde 409 (handler já existente) |

## Fase 3 — Permissões vindas dos vínculos ✅

Parte técnica concluída em 09/10/2026, na branch `feat/permissoes-por-setor` (itens 1 a 3 abaixo, mais a regra "ninguém concede o que não tem" em funções e vínculos). Item 4 concluído em 10/10/2026, na branch `epic/v3` (migração `organizacoes/0013`):
- **Setores criados:**
  - Diretoria: Diretor;
  - Comercial: Gestor Comercial e Comercial;
  - Segurança do Trabalho: Gestor Técnico, Sub-Gestor Técnico e Técnico;
  - Financeiro: Gestor Financeiro e Financeiro;
  - Administrativo: Gestor Administrativo e Administrativo.
- **Funções e vínculos:** cada tipo virou uma função com as mesmas permissões do tipo, e os 43 usuários do dev foram vinculados. Conferido usuário a usuário: o acesso de ninguém mudou.
- **Permissão nova `setores.todos`**, dada a Diretor e Gestor Comercial: as permissões por setor deles valem em todos os setores, como antes.

Item 5 (fim do fallback) concluído em 10/10/2026, junto com a fase 4: sem vínculo, o usuário só acessa o que é dele.

Regras adotadas:
- **Vínculo substitui o tipo.** Quem tem ao menos um vínculo passa a ter só as permissões das suas funções; o `tipo_usuario` deixa de valer para essa pessoa.
- **Setor ou função inativos** não concedem nada.
- **Serviços sem setor** (catálogo ainda não classificado) seguem as permissões por setor de quem as tem em algum setor.

1. **`permissoes_do_usuario` passa a ler os vínculos.** Junta as permissões das funções em todos os setores do usuário; as de escopo por setor valem só naquele setor.
2. **Período de transição:** usuário sem nenhum vínculo continua com as permissões do `tipo_usuario`. Nada quebra enquanto os vínculos são cadastrados.
3. **Regras por setor de fato:** `tarefas.distribuir`, `tarefas.editar_setor`, `servicos.ver_setor` e `servicos.gerenciar` passam a considerar `Servico.setor`. Os filtros de visibilidade passam a ser "próprio + setores com permissão + tudo, se tiver `os.ver_todas`".
4. **Migração dos usuários atuais**, no momento que vocês escolherem. É preciso definir os setores e funções iniciais; a tabela de equivalência do mapa é o ponto de partida. A migração é um comando que cria funções equivalentes aos tipos e os vínculos. Testado primeiro no dev com os dados reais, e você confere a lista antes de rodar.
5. **Fim do fallback:** depois de todos os usuários vinculados, o `tipo_usuario` deixa de ser consultado.

## Fase 4 — Limpeza (backend ✅)

Backend concluído em 10/10/2026, na branch `epic/v3`:
- **Tipo de usuário removido:** saíram `tipo_usuario`, `/usuarios/tipos/` e a tabela de permissões por tipo.
- **Cadastro de usuário com vínculos:** criar e editar usuário aceita `vinculos` (setor + função), com as proteções de "não conceder o que não tem".
- **Login, refresh, `/auth/me/` e detalhe de usuário** devolvem `vinculos` e `permissoes` (globais, por setor e `todos_os_setores`).
- **`ativo` unificado em `is_active`.** O campo da API continua `ativo`. No dev, 1 usuário desativado só pela flag antiga passou a inativo.
- **E-mails** escolhem destinatários por permissão, e os testes de e-mail voltaram a passar.

Pendente: frontend (último item abaixo).

- Remover `tipo_usuario`, o endpoint `/usuarios/tipos/` e as permissões antigas. O diretor vira uma função com todas as permissões no setor "Diretoria".
- Unificar `ativo` e `is_active` (INC-06), com levantamento prévio de onde divergem no banco.
- Frontend: trocar as travas por tipo pelas permissões que o backend devolve no `/auth/me/`, com a lista de permissões do usuário e por setor.

## Fase 4b — Funções liberadas por setor ✅

Concluída em 10/10/2026, na branch `epic/v3` (migrações `organizacoes/0014` e `0015`). No dev, os 43 vínculos existentes continuam válidos.

Decisão de 10/10/2026: uma função só pode ser usada nos setores em que foi liberada. Exemplo: não pode existir um vínculo "Técnico" no setor Comercial. Optou-se por uma lista de setores por função, em vez de uma função por setor, para permitir funções reaproveitáveis (ex.: um "Gestor de Área" liberado em vários setores).

1. **Modelo:** `Funcao.setores`, muitos-para-muitos com `Setor`.
2. **Migrações:**
   - uma cria a tabela de ligação;
   - outra, de dados, libera cada função nos setores onde ela já tem vínculos e aplica a tabela inicial:
     - Diretor → Diretoria;
     - Gestor Comercial e Comercial → Comercial;
     - Gestor Técnico, Sub-Gestor Técnico e Técnico → Segurança do Trabalho;
     - Gestor Financeiro e Financeiro → Financeiro;
     - Gestor Administrativo e Administrativo → Administrativo.
3. **Regra no vínculo:** `MembroSetor.clean()` recusa função não liberada no setor. Vale em todos os caminhos: API de vínculos, cadastro e edição de usuário, e admin.
4. **API de funções:**
   - `setores` obrigatório, não vazio e só com setores da mesma organização;
   - não é possível retirar um setor que ainda tem pessoas vinculadas à função;
   - filtro `?setor=` para a tela listar só as funções liberadas no setor escolhido.
5. **Validação:** testes de cada regra; aplicação no dev, conferindo que todos os vínculos existentes continuam válidos.

## Fase 4c — Um setor por usuário ✅

Decisão de 10/10/2026: cada usuário pertence a um único setor. Concluída na branch `epic/v3`:
- restrição única por usuário em `MembroSetor` (migrações `organizacoes/0016` a `0018`; a `0016` para e lista os usuários com mais de um vínculo, sem apagar nada);
- API de vínculos recusa um segundo vínculo; para mudar de setor, edita-se o vínculo existente;
- cadastro e edição de usuário aceitam `vinculos` com no máximo um item (formato de lista mantido para o frontend).

## Fase 5 — Fluxo de execução nos setores

Substitui o "painel do setor" pensado de início. O contexto completo, os dados e as decisões estão nos ADRs 0005, 0006 e 0008.

> **Detalhada e substituída em 10/10/2026 por `docs/plano-execucao-comercial-financeiro.md`** (fases 6 a 12). A lista abaixo fica como histórico.

1. **Remover horas e complexidade de serviço e tarefa,** com os indicadores que dependem delas (ADR 0005).
2. **Visões de trabalho:** a definir na frente de definição de telas (`docs/telas-blocos-e-endpoints.md`). Só depois disso entram os endpoints dedicados.
3. **Distribuição em um passo:** um endpoint que recebe responsável e prazo e cria a tarefa; "dividir" acrescenta tarefas.
4. **Aguardando e parado:** marcação opcional com motivo na tarefa e cálculo de "parado há N dias".
5. **Prazos:** faixas, alerta de "sem prazo" e histórico de replanejamento (proposta, a confirmar).
6. **Aviso de chegada por e-mail** para quem organiza o setor.
7. **Frontend:** telas montadas a partir das visões que as permissões de cada pessoa liberam.

## Decisões pendentes

| Quando | Decisão |
|---|---|
| Antes da fase 1 | Divergências entre as travas do front e a tabela de equivalência (resultado do passo 1.1) |
| Antes da fase 3 | As 8 perguntas da seção 4 do mapa |
| Antes da fase 3, passo 4 | Setores e funções iniciais e o vínculo de cada usuário atual |
| Antes da fase 5 | Classificação fina dos catálogos por setor. Por padrão, desde 10/10/2026 todos estão em Segurança do Trabalho e os serviços já têm setor (ver `docs/conceitos-de-dominio.md`) |
