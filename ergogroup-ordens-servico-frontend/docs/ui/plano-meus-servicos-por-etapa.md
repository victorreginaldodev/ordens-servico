# Plano — Meus serviços por etapa (visão de quem executa)

Plano de 14/10/2026. **Aprovado pelo usuário em 14/10/2026** com as recomendações da seção 5 (Novas como aba padrão; B1 e B2 entram; Iniciar já confirma, sem botão extra; o número de novas no menu fica para depois). **Implementado no mesmo dia** (ver "Como ficou", no fim).

Pedido do usuário: aplicar em Meus serviços (`/meus-servicos`, a tela do técnico) os mesmos princípios usados no Painel do setor e na Visão geral (`fluxos-e-navegacao.md` §6.2.6 a §6.2.8).

## 1. Os princípios do painel, traduzidos para o técnico

| Princípio do painel | Como fica em Meus serviços |
|---|---|
| Abas = etapas, sem sobreposição (ADR 0009) | Abas = **etapas da tarefa**: Novas · A iniciar · Em andamento · Concluídas |
| A primeira aba (e a padrão) é a do que acabou de chegar | **Novas** é a primeira e a padrão |
| Atrasados e parados são situações, não abas | Filtro **Precisa de atenção**: Atrasadas · Vencem em 7 dias · Sem andamento · Aguardando algo · Novas há 3 dias ou mais |
| No quadro, as abas somem e as colunas são as etapas | Quadro sempre com 4 colunas: Novas → A iniciar → Em andamento → Concluídas |
| Concluídos paginados por mês, com "Ver todo o período" | Igual, na aba e na coluna Concluídas |
| Ciência num clique, e uma ação que já faz o passo seguinte | **Confirmar recebimento** e **Iniciar** (iniciar já confirma o recebimento, regra do backend); **Confirmar todas (N)** na linha das abas |
| Serviço só com o nome; cliente mais largo e em destaque | Igual |
| Ações só com ícone, sem borda, coluna fixa com divisor | Igual: Confirmar recebimento, Iniciar, Concluir, Explicar a pausa e o menu ⋯ |
| Aviso de sem andamento com as duas saídas (§6.2.8) | Já implementado; fica como está |

## 2. Como é hoje e o que muda

**Hoje** (`features/execucao/pages/MeusServicosPage.tsx`):
- abas Todos · **Com você** (padrão) · Atrasados · Vencem em 7 dias · Concluídos no mês: misturam etapas (com você, concluídos) e situações (atrasados, vencem);
- não existe a etapa **Nova**: a ciência do técnico (ADR 0009, fase 13) está no backend, mas a tela não mostra nem deixa confirmar;
- o quadro tem A fazer → Em andamento → Concluídas e é filtrado pela aba (em "Atrasados", sobra parte das colunas);
- concluídas pelo filtro de data de conclusão;
- ações Iniciar e Concluir com texto e borda; serviço com a descrição embaixo.

**Depois:** os itens da tabela da seção 1.

### Colunas por aba

| Aba | Colunas |
|---|---|
| Novas | Serviço · Cliente · OS · Recebida há (amarelo a partir de 3 dias) · Prazo · Parte · Ações |
| A iniciar | Serviço · Cliente · OS · Prazo · Andamento · Ações |
| Em andamento | Serviço · Cliente · OS · Prazo · Iniciada em · Andamento · Ações |
| Concluídas | Serviço · Cliente · OS · Concluída em · No prazo? · Ações (só o ⋯) |

- **Parte:** a descrição da tarefa, quando o serviço foi dividido entre pessoas ("medições", "relatório"); vazia no caso comum. Só na aba Novas, para a pessoa saber o que é dela ao receber.
- **Andamento:** a coluna de três estados do §6.2.8.
- **No prazo?:** calculado na tela, a partir do prazo e da data de término da tarefa.

### Ações

| Etapa | Na linha (só ícone) | No cartão do quadro |
|---|---|---|
| Nova | Confirmar recebimento · Iniciar | "Iniciar" com texto; só confirmar = arrastar para A iniciar |
| A iniciar | Iniciar | "Iniciar" |
| Em andamento | Concluir | "Concluir" |
| Sem andamento (qualquer etapa ativa) | + Explicar a pausa (ampulheta) | chip da situação |

Arrastar no quadro: Novas → A iniciar confirma o recebimento; → Em andamento inicia; → Concluídas conclui; voltar uma coluna reabre (como hoje; voltar para Novas não existe, porque a ciência não se desfaz).

## 3. Backend

A API já atende quase tudo (fase 13): `GET /api/execucao/meus-servicos/` traz `etapa` e `recebida_em` em cada linha e aceita `?etapa=`; `?status=concluida&de=&ate=` traz o histórico; `POST /api/execucao/tarefas/recebimento/` confirma em lote; iniciar a tarefa registra a ciência.

| # | Item | Situação |
|---|---|---|
| B1 | **Data da atribuição** (`Tarefa.atribuida_em`): preenchida ao criar a tarefa e ao trocar o responsável. Hoje a idade conta da criação, então uma tarefa reatribuída aparece como "Nova há 20 dias" para quem acabou de recebê-la (limitação registrada na fase 13). Migração do campo + migração de dados (`atribuida_em = criada_em`); a linha ganha `atribuida_ha_dias`; a carga da equipe e "Aguardando ciência há N dias" (painel) passam a usá-la. | **Proposta, recomendada** |
| B2 | **Prioridade da tarefa na linha** (`prioridade`), para o filtro Prioridade e o destaque de prioridade alta no cartão. | Proposta |
| B3 | "Ver todo o período": usar o mesmo início fixo do painel (01/01/2000) em `?status=concluida&de=`. Sem mudança no backend. | — |

Testes: atribuição na criação e na troca de responsável (e não na mudança de prazo), migração de dados, `prioridade` na linha. `python manage.py test` antes do commit.

## 4. Frontend

| # | Item | Arquivos |
|---|---|---|
| F1 | Contrato e tipos (`docs/api/api-schema.yaml`, `npm run api:tipos`), se B1/B2 entrarem | `src/api/schema.d.ts` |
| F2 | Abas por etapa (Novas padrão), colunas por aba, filtro "Precisa de atenção", Cliente e Prioridade; endereços antigos (`?view=ativos` etc.) abrem em Novas | `features/execucao/pages/MeusServicosPage.tsx` |
| F3 | Quadro com `boardReplacesViews`: 4 colunas fixas, arrastes da seção 2, navegação do mês na coluna Concluídas | idem; `components/Quadro.tsx` (sem mudança) |
| F4 | Concluídas por mês: reaproveitar a `NavegacaoDoMes` e o cálculo do intervalo do painel, movendo-os para `features/execucao/components/` (hoje estão dentro de `PainelDoSetorPage.tsx`) | `components/NavegacaoDoMes.tsx` (novo), `PainelDoSetorPage.tsx` |
| F5 | Ações só com ícone; o `acaoComIcone` do painel também vai para um componente compartilhado | `components/AcaoComIcone.tsx` (novo) |
| F6 | Confirmar recebimento na linha e "Confirmar todas (N)" na linha das abas (`viewsActions`), com `useConfirmarRecebimentoDeTarefas` | `MeusServicosPage.tsx` |
| F7 | Serviço só com o nome; Cliente mais largo e em destaque | `MeusServicosPage.tsx` |
| F8 | Detalhe do serviço: "Confirmar recebimento" na tarefa do próprio técnico (`pode_confirmar_recebimento`) e, para quem organiza, no serviço novo, com "Confirmar e distribuir" (pendência da fase 14) | `pages/DetalheDoServicoPage.tsx` |
| F9 | Tela inicial: para quem só executa, o destino continua Meus serviços; o menu pode mostrar o número de novas (`/meus-servicos/contadores/`) | `components/layout/navigation.ts` *(opcional)* |
| F10 | Documentação: `fluxos-e-navegacao.md` (nova §6.1.1 e revisão do §6.2.4 na parte de Meus serviços), plano de execução (fase 14) | `docs/` |

Verificação: typecheck, lint e a tela no navegador logado (abas, quadro, arrastes, confirmar em lote, mês anterior e período todo).

## 5. Perguntas para o usuário (respondidas em 14/10/2026)

1. Aba padrão: **Novas** (como o painel) ou **A iniciar** quando não houver novas?
2. B1 (data da atribuição) entra agora? Recomendo que sim: sem ela, a idade da tarefa reatribuída fica errada.
3. Na aba Novas, a ação principal é **Iniciar** (que já confirma) ou também um "Confirmar e iniciar" explícito, como o "Confirmar e distribuir" do painel?
4. O número de novas no menu (F9) entra agora ou fica para depois?

**Respostas:** 1. Novas. 2. Sim, B1 entra agora (e B2 também). 3. Iniciar já confirma; sem "Confirmar e iniciar". 4. Fica para depois.

## 6. Como ficou (implementado em 14/10/2026)

**Backend**
- `Tarefa.atribuida_em` (migração `0049`; dados em `0050`, com a data de criação). Preenchida na criação e a cada troca de responsável; mudar o prazo não mexe.
- As linhas de tarefa (`andamento/` e `meus-servicos/`) ganharam `atribuida_ha_dias` e `prioridade`. A carga da equipe (`sem_ciencia_mais_antiga_dias`) e o "Aguardando ciência há N dias" do painel passaram a contar da atribuição.
- Testes em `apps/ordens_servico/tests_recebimento.py` (`AtribuicaoDaTarefaTestCase`).

**Frontend**
- `features/execucao/pages/MeusServicosPage.tsx` reescrita conforme as seções 1 e 2: abas Novas (padrão) · A iniciar · Em andamento · Concluídas · mês; filtros Precisa de atenção, Cliente e Prioridade; quadro com `boardReplacesViews` e 4 colunas; ações só com ícone (Explicar a pausa, Confirmar o recebimento, Iniciar, Concluir) e, no menu ⋯, "Voltar para A iniciar" e "Reabrir"; "Confirmar todas (N)" na linha das abas; o aviso de sem andamento continua no topo, e "Revisar" abre a aba que tem os serviços sem andamento já filtrada.
- Endereços antigos (`?view=ativos`, `todos` etc.) abrem em Novas; o antigo filtro `f.andamento` foi trocado por `f.atencao`.
- Componentes compartilhados com o painel: `components/NavegacaoDoMes.tsx` + `mesDosConcluidos.ts` (o mês na URL e o intervalo) e `components/AcaoComIcone.tsx`.
- Detalhe do serviço: "Confirmar recebimento" no cabeçalho (serviço novo, para quem organiza) e na tarefa do próprio responsável; o botão de distribuir vira "Confirmar e distribuir" no serviço novo; a tarefa nova mostra "Aguardando a ciência de quem recebeu".
- Contrato e tipos regenerados.

