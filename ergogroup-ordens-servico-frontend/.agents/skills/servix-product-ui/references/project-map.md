# Mapa de fontes do produto

Use este mapa para abrir somente o que a tarefa exigir. Os caminhos do frontend são relativos à raiz `ergogroup-ordens-servico-frontend`; os do backend começam em `../ergogroup-ordens-servico-backend`.

## Frontend: sistema e padrões vigentes

- Fundamentos e precedência: `docs/ui/design-system.md`; tabelas: `docs/ui/design-system-tabelas.md`; intenção e personas: `docs/ui/identidade-visual-brief.md`; plano não necessariamente concluído: `docs/ui/plano-ui-kit.md`.
- Tokens e escala: `src/index.css`, `tailwind.config.ts`; configuração shadcn: `components.json`; dependências e scripts: `package.json`.
- Primitivos: `src/components/ui/`; componentes de domínio: `src/components/kit/`; tabelas: `src/components/data-table/`.
- Shell e navegação: `src/components/layout/DashboardLayout.tsx`, `AppSidebar.tsx`, `AppHeader.tsx`, `navigation.ts`, `CommandMenu.tsx`; rotas: `src/app/routes.tsx`.
- Formulários e feedback: componentes `ui/form`, `input`, `select`, `dialog`, `alert-dialog`, `toast`/`sonner`; exemplos reais nas páginas e componentes da feature correspondente.
- Ordens de serviço: `src/features/ordens/pages/`, `components/`, `services.ts`, `hooks.ts`, `utils.ts`; briefs em `docs/ui/listagem-ordens-brief.md` e `ordem-detalhe-brief.md`.
- Contratos de rede: `src/services/api.ts`, `src/services/pagination.ts`, serviços de cada feature e `docs/api/api-schema.yaml`. Para novo CRUD, atualize/consulte o schema do backend conforme o `AGENTS.md` do frontend quando o servidor estiver disponível.
- Estado atual de acesso no cliente: `src/hooks/useUserRole.ts`, `src/hooks/useCurrentUser.ts`, `src/services/auth.ts`. Considere-o legado em migração quando divergir do backend; registre a divergência.
- Exemplos navegáveis de direção visual: `docs/ui/wireframes/`. Não os trate como componentes de produção.

Consolidado: shadcn/ui + Radix, React 18, Vite, TypeScript, Tailwind, React Query, React Hook Form + Zod, TanStack Table, Lucide e Sonner. A fonte é Plus Jakarta Sans. O shell usa sidebar responsiva, painel inset, breadcrumb e busca global. O design system atual prefere tokens semânticos e componentes compartilhados.

## Backend: regras e possibilidades reais

- Contexto vigente da sprint: `../ergogroup-ordens-servico-backend/docs/briefing-sprint-setores.md` e `../ergogroup-ordens-servico-backend/docs/plano-setores-e-permissoes.md`.
- Catálogo e decisões de acesso: `../ergogroup-ordens-servico-backend/docs/mapa-de-permissoes.md`, `../ergogroup-ordens-servico-backend/apps/organizacoes/permissoes.py`, modelos/serializers/views de `../ergogroup-ordens-servico-backend/apps/organizacoes/` e testes de permissões.
- Visão do produto: arquivos `01-visao-geral.md`, `02-inventario-funcional.md`, `03-modelo-de-dados.md`, `05-regras-de-negocio.md`, `07-operacao-tecnica.md` e `10-lacunas-e-inconsistencias.md` em `../ergogroup-ordens-servico-backend/docs/as-is/`.
- Domínio de OS: modelos, serializers e viewsets em `../ergogroup-ordens-servico-backend/apps/ordens_servico/`; visibilidade em `../ergogroup-ordens-servico-backend/apps/ordens_servico/services/visibilidade.py`; propagação em `../ergogroup-ordens-servico-backend/docs/flows/`.
- Usuários: `../ergogroup-ordens-servico-backend/apps/contas/models/choices.py`, autenticação e serializers em `../ergogroup-ordens-servico-backend/apps/contas/`.
- Clientes, catálogos, auditoria e indicadores: apps homônimos no backend; documentação analítica em `../ergogroup-ordens-servico-backend/docs/analytics/`.
- Rotas: `../ergogroup-ordens-servico-backend/config/urls.py` e `urls.py` de cada app. Valide payloads e ações nos serializers/viewsets e, quando atual, no schema OpenAPI.

## Invariantes que mudam a interface

- OS contém serviços; serviço contém tarefas; a tarefa tem responsável. A OS operacional é um agregado paralelo, atômico e sem vínculo com a OS comercial.
- Status de serviço e OS são derivados das tarefas/serviços; tarefa e OS operacional aceitam atualização direta dentro dos enums atuais. Não há grafo formal de transições.
- Contrato exige objeto, início e fim, com fim não anterior ao início.
- Cobrança de OS/OS operacional usa endpoints dedicados, autorização própria e liberação prévia. A API pode ocultar valor e condições financeiras.
- Permissões efetivas vêm de funções/setores quando há vínculos; `tipo_usuario` é fallback temporário. Permissões de serviço/tarefa podem ter escopo por setor.
- A pessoa sempre pode ter visibilidade do trabalho atribuído a ela; gestores podem ter visibilidade por setor; `os.ver_todas` amplia para tudo.
- Backend é a autoridade de autorização. A UI também deve esconder/desabilitar ações inadequadas e tratar 403, mas isso não substitui a API.

## Cuidado com lacunas

Não invente setores/equipes, dependências entre tarefas, recorrência contratual, parcelas reais, emissão/recebimento de NF, cancelamento financeiro ou vínculo entre OS e OS operacional. Confira `../ergogroup-ordens-servico-backend/docs/as-is/10-lacunas-e-inconsistencias.md` e sinalize qualquer dependência.
