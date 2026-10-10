---
name: servix-product-ui
description: Analisa, desenha e implementa interfaces do Servix como PO, UX e UI, usando o design system do frontend e as regras, permissões e APIs reais do backend. Use ao criar ou melhorar telas e fluxos deste produto; não use para revisão geral de arquitetura.
---

# Servix Product UI

Trabalhe nos projetos originais `ergogroup-ordens-servico-frontend` e `../ergogroup-ordens-servico-backend`. Preserve UTF-8, alterações locais e as instruções `AGENTS.md`. Não crie projetos, cópias, worktrees ou apps Django. Não modifique o backend como consequência automática de uma proposta de UX.

## Fontes e escopo

Comece pelos arquivos diretamente relacionados à solicitação, sem reler os repositórios inteiros. Consulte [references/project-map.md](references/project-map.md) para localizar as fontes de UI, domínio, permissões e APIs. Trate documentação marcada como proposta ou plano como intenção, não como comportamento vigente. Confirme decisões no código atual e diferencie padrões repetidos de exceções ou inconsistências pontuais.

## Fluxo obrigatório

1. **Entender a tarefa.** Identifique o objetivo da funcionalidade e o resultado observável que a pessoa precisa alcançar. Examine telas, componentes, serviços e endpoints relacionados.
2. **Mapear usuários e tarefas.** Registre quem usa a interface, tarefa, informações, decisões, ações, restrições, estados e permissões. Separe fatos com fonte de hipóteses. Pergunte apenas quando uma lacuna mudar materialmente o fluxo ou o escopo.
3. **Avaliar o fluxo.** Não converta modelos em CRUD por padrão. Para cada limitação relevante, apresente evidência, impacto, melhoria proporcional e a divisão entre frontend, backend e regra de negócio. Não amplie o escopo silenciosamente.
4. **Propor antes de implementar.** Entregue objetivo e usuário principal, fluxo e navegação, organização de conteúdo e ações, wireframe visual, estados relevantes, adaptação móvel quando pertinente, hipóteses e dependências. Use dados fictícios coerentes e não sensíveis. Leia [references/proposal-and-verification.md](references/proposal-and-verification.md).
5. **Aguardar aprovação explícita.** Não implemente a tela final antes da aprovação do fluxo e wireframe. Se o mesmo fluxo já tiver sido aprovado na conversa, incorpore os ajustes sem pedir nova aprovação.
6. **Implementar o aprovado.** Reuse o design system, o UI Kit e os componentes existentes antes de criar novos. Integre somente APIs reais; não invente endpoints nem apresente simulação como funcional. Se faltar suporte, explique e proponha a mudança, mas não altere o backend sem pedido.
7. **Verificar.** Execute verificações proporcionais ao risco e reporte o que foi confirmado e as limitações restantes, seguindo a referência de proposta e verificação.

## Decisões de produto e UI

- Use shadcn/ui e Radix como base, Tailwind como motor e tokens semânticos de `src/index.css`/`tailwind.config.ts` como vocabulário. Evite cores cruas, valores arbitrários e novos primitivos quando houver equivalente.
- Prefira componentes de domínio em `src/components/kit`, infraestrutura de listagem em `src/components/data-table` e layout/navegação em `src/components/layout`.
- Preserve Plus Jakarta Sans, corpo denso de 14 px, escala de espaçamento de 4 px, foco visível, contraste, rótulos acessíveis e teclado. Valide light/dark e responsividade.
- Para listagens, preserve estado relevante na URL, paginação da API, preferências de colunas e padrões de filtros/tabelas documentados.
- Modele acesso por códigos de permissão e escopo por setor do backend. `tipo_usuario` ainda existe como fallback e no frontend, mas está em transição; não o transforme em nova regra sem confirmar a fonte atual.
- Respeite visibilidade: acesso global por `os.ver_todas`, acesso por setor via `servicos.ver_setor` e acesso próprio por atribuição. Valores financeiros podem ser omitidos pela API sem `financeiro.ver_valores`.
- Estados derivados de OS e serviço não são ações livres da interface. Tarefas e OS operacionais têm regras diferentes; cobrança usa ação dedicada e depende de permissão/liberação.

Skills complementares de wireframe, visualização ou acessibilidade podem apoiar as etapas adequadas, mas não substituem a proposta aprovada, as fontes atuais nem o design system do produto.
