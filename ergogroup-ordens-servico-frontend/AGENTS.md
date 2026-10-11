# AGENTS

* Use sempre o sistema de codificação UTF-8
* Sempre que lhe for pedido para consultar a documentação procure em ../documention um diretório antes
* Sempre que lhe for pedido para criar uma nova funcionalidade CRUD baixe o contrato da API em [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)
* O contrato fica em `docs/api/api-schema.yaml`. Depois de atualizá-lo, rode `npm run api:tipos` para gerar `src/api/schema.d.ts` (nunca edite esse arquivo à mão). Código novo usa os tipos gerados (`src/api/tipos.ts`); a leitura do contrato por domínio está em `docs/api/contrato-por-dominio.md`

## Briefing para agentes (atualizado em 10/10/2026)

Leia antes de qualquer ação. O projeto tem dois projetos, reunidos num monorepo: `ergogroup-ordens-servico-backend` (Django + DRF, MySQL, JWT) e `ergogroup-ordens-servico-frontend` (React + Vite + TypeScript). A branch de trabalho é a `v3` do monorepo, que contém o estado de desenvolvimento antes chamado `epic/v3`.

### Regras obrigatórias
1. NUNCA envie nada para a `main` (merge, push, rebase ou PR com destino à main). Tudo fica na `v3` até o usuário aprovar explicitamente.
2. Commits e push só quando o usuário pedir. Commits organizados por assunto, mensagens em português.
3. Não crie projetos novos, cópias de projeto nem git worktrees. Não crie apps Django novos sem pedido explícito.
4. A OS operacional (`OrdemServicoOperacional`, OSO, "mini OS") e o catálogo operacional estão FORA DE ESCOPO: não os inclua em análises, propostas, perguntas nem implementações.
5. Não use documentação antiga como base (`docs/as-is/`, `docs/briefing-sprint-setores.md`, códigos INC-xx). Parta dos ADRs, do glossário e do código atual.
6. Só registre como "decidido" o que o usuário aprovou explicitamente. Sugestões suas ficam marcadas como "proposta".
7. Quando o usuário pedir análise, documentação ou discussão, NÃO implemente. Implemente só quando ele mandar.
8. Responda em português, de forma direta e concreta (campos, endpoints, telas), sem abstrações.
9. Tudo o que for discutido e decidido deve ser documentado no repositório (ADRs e `docs/`), sem omitir nada.

### Onde está o conhecimento (no backend, pasta `docs/`)
1. `adr/README.md`: índice das decisões. ADRs:
   - 0002: exclusão em cascata;
   - 0003: setores, funções, vínculos e permissões;
   - 0004: setor responsável pela execução e catálogo;
   - 0005: prazo como único parâmetro de planejamento;
   - 0006: fluxo de execução nos setores;
   - 0007: papel do sistema no faturamento;
   - 0008: acompanhamento da execução, linha do tempo, visão comercial e controle financeiro.

   Cada ADR diz o que está aceito e o que é proposta.
2. `telas-blocos-e-endpoints.md`: telas, blocos de informação, quem vê o quê (permissões) e endpoints candidatos. Também há uma cópia no frontend.
3. `conceitos-de-dominio.md`: glossário. Use estes termos.
4. `mapa-de-permissoes.md`: o que cada permissão libera.
5. `plano-setores-e-permissoes.md`: fases, fora de escopo e situação dos problemas originais.
6. `faturamento/01-condicoes-de-pagamento-as-is.md` (estado anterior) e `faturamento/02-proposta-condicoes-de-pagamento.md` (implementada).
7. `plano-execucao-comercial-financeiro.md`: fases 6 a 12 do backend (6 a 11 concluídas; a 12 é este frontend).

No frontend:
- `docs/ui/plano-redesenho-fluxos-e-telas.md`: **plano atual** do frontend (fases R0 a R8; R0 a R7 concluídas);
- `docs/api/contrato-por-dominio.md`: leitura do contrato da API por domínio;
- `docs/ui/`: design system, UI kit, plano de setores e time, wireframes. Os briefs `listagem-ordens-brief.md`, `ordem-detalhe-brief.md` e `gestor-operacional-brief.md` usam o modelo antigo (líder, contrato, horas) e serão superados pela R1.

### Modelo atual (resumo)
- **Organização → Setor → Função → Vínculo.**
  - A função tem nome livre, as permissões marcadas e os setores em que pode ser usada.
  - O vínculo é usuário + setor + função; **cada pessoa pertence a um único setor** (um vínculo por pessoa).
- **Não existe mais `tipo_usuario`.** O código verifica CÓDIGOS DE PERMISSÃO (`apps/organizacoes/permissoes.py`), nunca nomes de função ou setor.
  - Há permissões globais e por setor.
  - `setores.todos` faz as permissões por setor valerem em todos os setores.
  - Regra: ninguém concede o que não tem.
- **Login e `/auth/me/`** devolvem `vinculos` e `permissoes`. O campo `ativo` da API corresponde ao `is_active`.
- **Catálogo:** `Catalogo.setor` é o setor responsável pela execução, obrigatório. `Servico.setor` é uma cópia no momento da venda. O catálogo tem `ativo`.
- **Execução:** a OS é o pacote comercial; a unidade de trabalho de cada setor é o serviço. O backend entrega API por caso de uso (blocos); as páginas são decisão do frontend.
- **Faturamento:**
  - a cobrança é por OS;
  - o sistema NÃO gerencia parcelas;
  - ele registra as condições, avisa a liberação e guarda o check de lançamento no outro sistema (Asaas, Conta Azul ou SOC, a confirmar);
  - condição por tipo (`tipo_condicao`: à vista, parcelado, recorrente com `valor_mensal`), `liberar_em` e `referencia_lancamento`; o contrato saiu e virou o recorrente (ADR 0007).
- **Execução (backend pronto):** blocos em `/api/execucao/`, `/api/comercial/` e `/api/financeiro/`, e linha do tempo da OS e do serviço. Horas e complexidade saíram; o prazo do serviço é calculado (ADRs 0005, 0006 e 0008).

### Situação do frontend
- Decidido: redesenhar fluxos, navegação e telas principais em vez de adaptar campo a campo (`docs/ui/plano-redesenho-fluxos-e-telas.md`).
- R0 concluída: tipos gerados, serviços e hooks em `features/execucao`, `features/vendas`, `features/financeiro` e `features/linha-do-tempo`, e componentes de domínio no kit. Nenhuma tela usa ainda.
- As telas antigas de OS e de faturamento foram removidas na R7. Em `features/ordens` ficou só a OS operacional (fora de escopo), que ainda usa `useUserRole`; o resto do app usa `usePermissoes().pode()`.
- R1 (fluxos e navegação, `docs/ui/fluxos-e-navegacao.md`) e R2 (wireframes em `docs/ui/wireframes/lote*.html`) validadas em 11/10/2026: lista como padrão (quadro opcional), Visão geral para quem tem `setores.todos`, Vendas com indicadores clicáveis e filtros em dropdown.
- R3 concluída em 11/10/2026: menu novo (`components/layout/navigation.ts`), tela inicial por permissão (`lib/telaInicial.ts`, rota `/inicio`), guarda de rota (`components/common/RequerPermissao.tsx`) e redirecionamento de `/ordens` para `/vendas`. O visual do header, da sidebar e do main NÃO muda (pedido do usuário): só o conteúdo. Meus serviços, Visão geral, Painel do setor e `/servicos/:id` estão como "em construção" até a R4.
- R4 entregue em 11/10/2026 (falta o teste contra o backend local): `features/execucao/pages/` (Meus serviços, Painel do setor e Visão geral na mesma página, Detalhe do serviço), modais de distribuir, ciência e tarefa, e no kit `Indicadores`, `BarraDeFiltros` e `Chip`. Novas telas de lista seguem esse padrão (indicadores clicáveis + filtros em dropdown).
- R5 entregue em 11/10/2026 (falta o teste contra o backend local): `features/vendas/pages/` (Vendas, Nova venda/edição em etapas, Resumo da venda com PDF, acrescentar serviço e exclusão). As telas antigas de OS saíram das rotas e são removidas na R7.
- R6 entregue em 11/10/2026 (falta o teste contra o backend local): `features/financeiro/pages/` (Cobranças com as três situações, aviso de alerta, filtros e registrar lançamento; situação financeira da OS em `/cobrancas/:id`) e os indicadores novos na Análise financeira. A tela antiga de faturamento saiu das rotas e é removida na R7.
- R7 concluída em 11/10/2026: setores com "sem quem organize" e organizadores, avisos do catálogo ao salvar, remoção do legado (telas antigas de OS e faturamento, código morto), Análise operacional sem horas e complexidade, tipos gerados na organização e no time.
- Próxima fase: R8 (revisão final e testes contra o backend local), conduzida pelo usuário. Falta testar R4 a R6 contra o backend local.

### Cuidados técnicos (backend)
- MySQL não desfaz DDL em transação: uma alteração de schema por migração, separada da migração de dados.
- O banco de dev é compartilhado: confira `showmigrations` antes de criar migrações.
- Rode `python manage.py test` antes de qualquer commit.
- A lógica de negócio fica em models e `services/`.

### Convenções de UI (frontend)
- Modais em etapas: nunca empilhados e sem drawers.
- Mostrar o nome completo das pessoas.
- Uma informação por coluna nas tabelas.

### Ao começar uma sessão
Leia os documentos acima, responda com um resumo curto do que entendeu e do que está pendente, e espere a instrução.
