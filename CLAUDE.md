# CLAUDE

* Use sempre o sistema de codificação UTF-8
* Esta pasta contém exatamente dois projetos. Trabalhe SOMENTE neles, diretamente nas pastas originais:
  * `ergogroup-ordens-servico-backend` — Django + DRF (MySQL)
  * `ergogroup-ordens-servico-frontend` — React + Vite + TypeScript
* NÃO crie projetos novos, cópias de projeto, pastas paralelas nem git worktrees nesta pasta ou ao lado dela
* NÃO crie apps Django novos sem pedido explícito do usuário; implemente dentro dos apps existentes do backend
* Para trocar de tarefa, use branches no próprio repositório (`git switch`), nunca uma segunda cópia de trabalho
* Commits somente quando o usuário pedir
* NÃO envie nada para a `main`, no backend nem no frontend: nada de merge, push, rebase ou pull request com destino à `main`. O trabalho fica na branch de trabalho deste monorepo, a `v3` (que reúne o estado de desenvolvimento antes chamado `epic/v3`) e só vai para a `main` quando estiver tudo terminado e o usuário aprovar explicitamente
* A OS operacional (`OrdemServicoOperacional`, OSO, "mini OS") e o catálogo operacional estão FORA de escopo: não incluir em análises, propostas, perguntas nem implementações, a menos que o usuário peça explicitamente
* Contexto da sprint atual: `ergogroup-ordens-servico-backend/docs/briefing-sprint-setores.md` e `ergogroup-ordens-servico-backend/docs/as-is/`
