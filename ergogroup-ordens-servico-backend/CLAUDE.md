# CLAUDE

* Use sempre o sistema de codificação UTF-8

## Briefing para agentes (atualizado em 10/10/2026)

Leia antes de qualquer ação. O projeto tem dois repositórios: `ergogroup-ordens-servico-backend` (Django + DRF, MySQL, JWT) e `ergogroup-ordens-servico-frontend` (React + Vite + TypeScript). A branch de trabalho nos dois é `epic/v3`.

### Regras obrigatórias
1. NUNCA envie nada para a `main` (merge, push, rebase ou PR com destino à main). Tudo fica na `epic/v3` até o usuário aprovar explicitamente.
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
6. `faturamento/01-condicoes-de-pagamento-as-is.md` (estado anterior) e `faturamento/02-proposta-condicoes-de-pagamento.md` (implementada na camada de dados).
7. `docs/adr/0008-acompanhamento-linha-do-tempo-comercial-e-financeiro.md` e `docs/plano-execucao-comercial-financeiro.md` — decisões e plano das próximas fases.

No frontend: `docs/ui/` (design system, UI kit, plano de setores e time, wireframes).

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
  - camada de dados implementada: `tipo_condicao`, `liberar_em`, `referencia_lancamento`, `origem_lancamento` etc.; o contrato saiu e virou o tipo recorrente (ADR 0007).

### Próximos passos
- Plano em `docs/plano-execucao-comercial-financeiro.md` (fases 6 a 12; as fases 6 a 11 estão concluídas, falta o frontend). Decisões no ADR 0008.
- Implementar cada fase só quando o usuário pedir. O agrupamento dos blocos em páginas é decisão do frontend.

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
