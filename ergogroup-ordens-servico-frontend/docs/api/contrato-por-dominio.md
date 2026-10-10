# Contrato da API por domínio

Leitura do contrato do backend (`epic/v3`, fases 6 a 11) feita em 10/10/2026, para a fase R0 de `docs/ui/plano-redesenho-fluxos-e-telas.md`. Diz o que cada endpoint entrega, a permissão que exige e onde está no frontend.

## Como os tipos são mantidos (decidido em 10/10/2026)

- **Fonte:** `docs/api/api-schema.yaml`, baixado do backend (`/api/schema/` ou `python manage.py spectacular --file`).
- **Tipos gerados** com `openapi-typescript`: `npm run api:tipos` grava `src/api/schema.d.ts`. **Não edite esse arquivo à mão.**
- `src/api/tipos.ts`:
  - `Esquemas`: os schemas;
  - `FiltrosDe<'operacao'>`: os parâmetros de busca de uma operação;
  - `ComValoresOcultaveis<T>`: deixa opcionais os campos financeiros que o backend remove;
  - `comoLista()`: aceita resposta em array ou paginada.
- **Cada domínio** reexporta os tipos com nomes do domínio em `features/<domínio>/services.ts`.
- **Quando o backend mudar:** baixe o schema de novo, rode `npm run api:tipos` e `npx tsc -p tsconfig.app.json --noEmit`. Os erros de compilação apontam o que mudou.

As telas antigas (`features/ordens`, `features/faturamento`) ainda usam os tipos escritos à mão e serão substituídas nas fases R4 a R6.

## Regras transversais

| Regra | Efeito no frontend |
|---|---|
| Sem `financeiro.ver_valores`, a OS **perde** `valor`, `valor_mensal`, `tipo_condicao`, `forma_pagamento`, `quantidade_parcelas`, `data_acordada_cobranca`, `intervalo_parcelas_dias`, `dia_fechamento`, `dia_vencimento`, `liberar_em`, `condicao_resumo` (e os `*_display`) | Os campos não vêm, nem como `null`. Use `ComValoresOcultaveis` e não mostre a seção. Na edição são ignorados; na criação são aceitos |
| Blocos por setor recebem `?setor=` | 400 sem setor, 404 setor inexistente, 403 quem não acompanha o setor |
| Serviço que a pessoa não vê | 404 |
| Responsável fora do setor do serviço | 400 em `responsavel` ("Fulano não pertence ao setor X") |
| Listas | Sem paginação no backend: vêm como array |
| Datas | `AAAA-MM-DD` (data) e ISO 8601 (data e hora). Use `parseDate` de `lib/format.ts` |
| Valores | Decimais chegam como texto (`"1500.00"`) |

## Execução — `features/execucao`

Etapa do serviço (calculada): `na_fila` (aberto sem tarefa), `distribuido` (aberto com tarefa), `em_execucao`, `concluido`, `cancelado`. Situação de prazo: `atrasado`, `vence_7_dias`, `depois`, `sem_prazo`.

| Endpoint | Função / hook | Permissão | Entrega |
|---|---|---|---|
| `GET /api/execucao/setores/` | `useSetoresAcompanhados` | `servicos.ver_setor` em algum setor (403 se nenhum) | Por setor: `organiza` e contadores `na_fila`, `em_andamento`, `atrasados`, `em_alerta`, `sem_prazo` |
| `GET /api/execucao/fila/?setor=&cliente=&ordem_servico=&prioridade=` | `useFila` | `servicos.ver_setor` no setor | Serviços sem tarefa, os mais antigos primeiro: contexto da venda, `na_fila_ha_dias`, `em_alerta`, `outros_servicos_da_os` |
| `POST /api/execucao/servicos/{id}/distribuir/` `{tarefas: [{responsavel, prazo?, descricao?, prioridade?}]}` | `useDistribuir` | `tarefas.distribuir` no setor do serviço | 201 com o detalhe do serviço. Uma tarefa = distribuir; várias = dividir; também acrescenta a serviço já distribuído |
| `GET /api/execucao/andamento/?setor=&responsavel=` | `useAndamento` | `servicos.ver_setor` no setor | Tarefas ativas (`LinhaDeTarefa`): `situacao_prazo`, `idade_dias` (desde a criação), alerta do serviço |
| `GET /api/execucao/alertas/?setor=` | `useAlertas` | `servicos.ver_setor` no setor | Serviços com `motivos: ['atrasado', 'sem_movimentacao']`, `dias_sem_movimentacao`, responsáveis e a ciência vigente |
| `POST /api/execucao/servicos/{id}/ciencia/` `{motivo?, observacao?}` | `useDarCiencia` | Tarefa no serviço ou `servicos.ver_setor` no setor | Detalhe do serviço. Só para serviço aberto ou em andamento (400 nos demais). Motivos: `cliente`, `documentacao`, `agendamento`, `terceiro`, `outro` |
| `GET /api/execucao/concluidos/?setor=&de=&ate=` | `useConcluidos` | `servicos.ver_setor` no setor | `{de, ate, servicos}` com `terminado_por_nome`, `data_termino` e `no_prazo` (nulo sem prazo). Padrão: do dia 1º do mês até hoje |
| `GET /api/execucao/equipe/?setor=` | `useEquipe` | `servicos.ver_setor` no setor | Por pessoa: `ativos`, `atrasados`, `vence_7_dias`, `sem_prazo`, `em_alerta`, `mais_antigo_dias`, `membro_do_setor`. Lista de responsáveis da distribuição = `membro_do_setor` |
| `GET /api/execucao/meus-servicos/?status=concluida&de=&ate=` | `useMeusServicos` | nenhuma (só o próprio) | `LinhaDeTarefa` da pessoa logada, os mais urgentes primeiro; `concluidas: true` = histórico |
| `GET /api/execucao/servicos/{id}/` | `useDetalheDoServico` | Visibilidade atual | Serviço, etapa, prazo, tarefas, alerta e ciência, contexto da OS **sem valores**, outros serviços da OS, `pode_distribuir`, `pode_dar_ciencia` |

Depois de distribuir ou dar ciência, os hooks invalidam a execução inteira, as vendas e as linhas do tempo.

## Venda — `features/vendas`

| Endpoint | Função / hook | Permissão | Entrega |
|---|---|---|---|
| `GET /api/ordens-servico/ordens/?q=&cliente=&concluida=&cobranca_realizada=&liberada=&minhas=true&etapa=` | `useVendas` | Visibilidade atual | `VendaDaLista`: `andamento {total, na_fila, distribuido, em_execucao, concluido, cancelado}`, `vendido_por_nome`, condição (se vê valores). `etapa` = ao menos um serviço na etapa |
| `GET /api/ordens-servico/ordens/{id}/` | `useVenda` | Visibilidade atual | A venda completa, com `servicos` (setor e status) |
| `POST /api/ordens-servico/ordens/` | `useCriarVenda` | `os.gerenciar` | Venda + `servicos: [{catalogo, descricao, prioridade?}]` numa transação; catálogo ativo; um e-mail por setor |
| `PATCH /api/ordens-servico/ordens/{id}/` | `useEditarVenda` | `os.gerenciar` | `servicos`, status, liberação e lançamento são somente leitura |
| `POST /api/ordens-servico/servicos/` | `useAcrescentarServico` | `os.gerenciar` | Serviço acrescentado depois; avisa só o setor dele |
| `GET /api/comercial/vendas/{id}/` | `useResumoDaVenda` | Quem vê a OS | Quem vendeu e quando, andamento, por serviço (setor, etapa, responsáveis com datas, quem concluiu, prazo); `condicoes` e `financeiro` nulos sem `financeiro.ver_valores` |

**Condição de pagamento** (validada no backend, 400 por campo):

| `tipo_condicao` | Obrigatórios |
|---|---|
| `a_vista` | — (`data_acordada_cobranca` opcional = vencimento) |
| `parcelado` | `quantidade_parcelas` ≥ 2, `data_acordada_cobranca` (1º vencimento); `intervalo_parcelas_dias` opcional |
| `recorrente` | `quantidade_parcelas` (meses), `dia_vencimento`, `valor_mensal`; `dia_fechamento` opcional. `valor` continua sendo o total |

`liberar_em`: `venda` (liberada ao criar) ou `conclusao` (quando todos os serviços terminam). `condicao_resumo` é o texto pronto, o mesmo em todas as telas e nos e-mails.

## Financeiro — `features/financeiro`

| Endpoint | Função / hook | Permissão | Entrega |
|---|---|---|---|
| `GET /api/financeiro/cobrancas/?situacao=&cliente=&de=&ate=&tipo_condicao=&forma_pagamento=&em_alerta=true` | `useCobrancas` | `financeiro.registrar_cobranca` | `{situacao, contadores {a_faturar, faturadas, previsao: {quantidade, valor}}, em_alerta, ordens}`. Por linha: venda, condição, contato da NF, liberação, lançamento, `dias_aguardando_lancamento`, `em_alerta`, `andamento` |
| `GET /api/financeiro/ordens/{id}/` | `useSituacaoFinanceira` | `financeiro.ver_valores` | Tudo da linha + `observacao`, `servicos` (etapa) e `eventos` (venda, liberação, lançamento) |
| `PATCH /api/ordens-servico/ordens/{id}/cobranca/` `{referencia_lancamento, data_cobranca}` | `useRegistrarLancamento` | `financeiro.registrar_cobranca` | Grava a origem `manual`; 400 se a OS não está liberada |
| `GET /api/analise/financeiro/` | `useIndicadoresFinanceiros` | `financeiro.ver_valores` | Nomes antigos (`total_cobrado`, `total_para_cobrar`, `total_sem_liberacao`) + `total_previsao`, `por_tipo_condicao`, `receita_recorrente_mensal`, `recorrentes_ativos` |

Situações: `a_faturar` (liberadas e não lançadas, as mais antigas primeiro), `faturadas` (as mais recentes primeiro), `previsao` (não liberadas, sem as canceladas, as mais perto de liberar primeiro). O alerta acende após `DIAS_ALERTA_SEM_LANCAMENTO` = 3 dias.

## Linha do tempo — `features/linha-do-tempo`

| Endpoint | Hook | Entrega |
|---|---|---|
| `GET /api/ordens-servico/ordens/{id}/linha-do-tempo/` | `useLinhaDoTempoDaOS` | A venda inteira: OS, serviços e tarefas |
| `GET /api/ordens-servico/servicos/{id}/linha-do-tempo/` | `useLinhaDoTempoDoServico` | Só o serviço e suas tarefas |

- **Cada evento:** `{quando, quem, tipo, texto, ordem_servico_id, servico_id, tarefa_id}`, em ordem cronológica. `quem` vazio = sistema.
- **Tipos:** 23, no `EventoDaLinhaDoTempoTipoEnum`.
- **Visibilidade:** acessa quem vê a OS ou o serviço. A condição de pagamento e a referência do lançamento só aparecem com `financeiro.ver_valores`.
- **Componente:** `LinhaDoTempo`.

## Organização e catálogo (já integrados; ajustes na R7)

- `GET /api/organizacoes/setores/` traz `organizadores [{id, nome}]` e `sem_organizador`.
- Criar e editar catálogo devolvem `avisos: string[]` (ex.: setor sem organizador).

## Componentes de domínio do kit (`components/kit`)

| Componente | Uso |
|---|---|
| `EtapaBadge` | Etapa do serviço |
| `SituacaoPrazoBadge` | Situação de prazo calculada pelo backend |
| `SituacaoFinanceiraBadge` | Previsão · A faturar · Faturada |
| `TipoCondicaoBadge`, `CondicaoPagamento` | Tipo e `condicao_resumo`; traço quando a pessoa não vê valores |
| `AndamentoServicos` | "2 de 4 concluídos" + barra por etapa |
| `AlertaMovimentacao` | "Sem movimentação há N dias" ou a ciência vigente com o motivo |
| `LinhaDoTempo` (`features/linha-do-tempo/components`) | Eventos com ícone e cor por tipo |

Cores e rótulos ficam em `components/kit/tones.ts` (`ETAPA_DEFS`, `SITUACAO_PRAZO_DEFS`, `SITUACAO_FINANCEIRA_DEFS`, `TIPO_CONDICAO_DEFS`, `MOTIVO_CIENCIA_LABEL`).

## Diferenças em relação aos tipos antigos (telas atuais)

As telas atuais, que serão substituídas, ainda usam:
- `cobranca_imediata`, `contrato`, `objeto_contrato`, `contrato_data_*` e `gestor_contrato_*` (saíram);
- `numero_nf` (virou `referencia_lancamento`, texto);
- `horas_estimadas`, `complexidade` e `*_efetiva(s)` em serviço e tarefa (saíram);
- `prazo` editável no serviço (agora é calculado);
- `complexidade_media_concluidas` e `horas_estimadas_entregues` na produtividade (saíram);
- a auditoria crua (`/api/auditoria/registros/ordens/{id}/timeline/`) no lugar da linha do tempo.
