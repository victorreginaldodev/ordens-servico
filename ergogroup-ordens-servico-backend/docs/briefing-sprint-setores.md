# Briefing — Sprint de Setores (09/10/2026)

Documento de passagem de contexto para um novo chat/agente que vai trabalhar na raiz `C:\Users\victo\Trabalho\ordens-servico`, contendo os dois projetos:

- `ergogroup-ordens-servico-backend` — Django + DRF, MySQL, JWT (SimpleJWT). Produção em `api-os.sstsuite.com.br`.
- `ergogroup-ordens-servico-frontend` — React + Vite + TypeScript + shadcn/ui + TanStack Query + axios (template `vite_react_shadcn_ts`, padrão Lovable). Produção em `os.sstsuite.com.br`. ~150 arquivos / ~21 mil linhas.

**Leitura obrigatória antes de começar:** `ergogroup-ordens-servico-backend/docs/as-is/` (levantamento completo do sistema atual). Em especial `03-modelo-de-dados.md`, `05-regras-de-negocio.md`, `07-operacao-tecnica.md` e `10-lacunas-e-inconsistencias.md`. Os IDs citados aqui (INC-xx, OPE-xx, PER-xx) vêm desses arquivos.

---

## 1. Problemas levantados pelo usuário (texto original, 09/10/2026)

> * Falta de gerenciamento nos setores de execução técnicos, as OS são criadas, mas ninguém sabe o que foi criado de novo, o que está em andamento, com quem está em andamento, etc.
>    * Dependências desse módulo: Criação de setores como ergonomia, segurança do trabalho etc
>    * Revisão de tipos de usuários e permissões
> * Falta de controle de faturamento, as condições de pagamento precisam ser especificadas na criação da ordem de serviços, e não com regras prontas do software a todo o momento
> * Bloquear delação em cascata de serviços quando excluir um catálogo

---

## 2. Escopo desta sprint

**Dentro:**
1. Bloquear exclusão em cascata de serviços ao excluir catálogo.
2. Criação de setores (Ergonomia, Segurança do Trabalho, etc.).
3. Revisão de tipos de usuário e permissões (orientada a setor).
4. Painel de gerenciamento do setor para o gestor (fila de novos, em andamento e com quem, atrasados).

**Fora (explicitamente):**
- **Faturamento** — será discutido depois. Não implementar nada de parcelas/condições de pagamento agora. (Há uma proposta preliminar na seção 6, só para registro.)
- **OS Operacional (`OrdemServicoOperacional` / OSO / "mini OS")** — não entra em setores nesta sprint.

---

## 3. Decisões do usuário

| Tema | Decisão |
|---|---|
| Técnico em vários setores | **Sim**, pode pertencer a mais de um setor (possível, mas não comum) → relação **M2M** usuário↔setor. |
| Quem faz a triagem | **O gestor do setor** cria as tarefas e atribui os técnicos. Não é o técnico que "puxa" da fila. |
| OSO | Fora desta sprint. |
| Faturamento | Adiado. |
| UI: manter React ou migrar para Django tradicional + Tabler | **Ainda não decidido.** Ver seção 5. |

---

## 4. Desenho proposto (backend)

### 4.1 Cascata do catálogo (fazer primeiro — quick win)
- Situação: `Servico.catalogo` usa `on_delete=CASCADE` → excluir catálogo apaga serviços e tarefas (INC-04). `CatalogoOperacional` já usa `PROTECT`.
- Trocar para `PROTECT`. No Django isso é só estado (on_delete é emulado em Python), sem DDL relevante no MySQL.
- **Tratar `ProtectedError`** na view de exclusão do catálogo → responder 409/400 com mensagem clara (ex.: "catálogo usado em N serviços"). Hoje o DRF devolveria 500.
- Adicionar `Catalogo.ativo` para "aposentar" catálogo sem excluir (some da criação de OS). Ajustar o front para filtrar inativos na criação e tratar o erro de exclusão.
- **Mesma classe de problema (INC-03):** `Tarefa.responsavel` e `OrdemServicoOperacional.responsavel` usam `CASCADE` → excluir usuário apaga tarefas/OSOs. Recomendado corrigir junto (`PROTECT`, e incentivar desativação de usuário em vez de exclusão).

### 4.2 Setores
- Novo model `Setor`: `nome`, `ativo`, timestamps. Gestor(es) do setor via vínculo usuário↔setor com papel (ver 4.3).
- `Catalogo.setor` (FK): cada tipo de serviço pertence a um setor → ao criar a OS, cada `Servico` cai na fila do setor certo.
- `Servico.setor` **persistido** (preenchido a partir do catálogo na criação, ajustável manualmente) — não derivar sempre do catálogo, para que mudar o catálogo de setor não reescreva histórico.
- Backfill: migração de dados preenchendo `Servico.setor` a partir do catálogo dos serviços existentes (serviços sem catálogo ficam sem setor → tratar no painel como "sem setor").

### 4.3 Usuários e permissões
- Hoje: `Usuario.tipo_usuario` com 10 papéis num enum que mistura função e área (ex.: `GESTOR_TECNICO`, `SUB_GESTOR_TECNICO`). Ver `apps/contas/models/choices.py` e `apps/contas/permissions.py`.
- Proposta: separar em dois eixos:
  - **Papel**: diretor, gestor, subgestor, técnico, comercial, financeiro, administrativo.
  - **Escopo**: setores de que o usuário participa (M2M, com papel no setor — ex.: gestor do setor X, técnico no setor Y).
- "Gestor técnico" passa a ser "gestor do setor X". Ajustar:
  - `PodeModificarTarefa` (PER-02) → gestor/subgestor **do setor do serviço** pode modificar.
  - Filtro de visibilidade do técnico (PER-01) → considerar setor.
- Aproveitar para eliminar a duplicidade `ativo` (custom) vs `is_active` (Django) (INC-06).
- Migrar papéis existentes com migração de dados (mapear `GESTOR_TECNICO`/`SUB_GESTOR_TECNICO`/`TECNICO` para papéis + setor(es); vai exigir decisão do usuário sobre o setor inicial de cada um).

### 4.4 Painel do setor
- **Fila do setor = serviços do setor sem tarefas/sem responsável** ("aguardando triagem"). Hoje o serviço sem tarefas já fica `aberto` (OPE-05); considerar expor isso como estado/filtro explícito.
- Visões: novos (aguardando triagem), em andamento agrupado por responsável, atrasados (`prazo < hoje`), concluídos no período.
- Ação principal do gestor: a partir do serviço, criar tarefas e atribuir técnicos do setor.
- O app `apps/analise` já tem indicadores; reaproveitar com filtro por setor.
- Lembrete: notificações por e-mail foram removidas (commit `3b13afe`). O painel é o mecanismo de "saber o que é novo".

### 4.5 Ordem sugerida
1. Cascata do catálogo (+ `Catalogo.ativo`, + INC-03).
2. `Setor` + vínculo M2M usuário↔setor com papel + migração dos papéis.
3. `Catalogo.setor` + `Servico.setor` + backfill.
4. Endpoints/serviços da fila e do painel.
5. Permissões por setor.
6. Telas no front.

**Princípio:** colocar a lógica nova (fila, triagem, permissões por setor) em **models/services**, não em serializers/views, para servir tanto a API/React quanto uma eventual UI em templates Django.

---

## 5. Decisão pendente: React vs Django tradicional + Tabler

O usuário considera migrar de API + React para Django tradicional com Tabler, começando pelo painel do setor e migrando o resto aos poucos.

**Recomendação dada:** manter React nesta sprint e fazer o painel de setores nele, porque:
1. O painel de setores é o "hub" da navegação (gestor vai do painel para OS → serviço → tarefas), então é o pior piloto: o usuário ficaria alternando entre duas UIs com visuais diferentes.
2. Migração gradual exige resolver domínios diferentes (`os.` vs `api-os.`) e autenticação diferente (JWT vs sessão/cookie) para não ter dois logins, além de manter dois menus/padrões em paralelo.
3. Os problemas da sprint são de domínio, não de UI; a migração não os acelera.

**Quando a migração faz sentido:** se o real motivo for produtividade de manutenção (front gerado via Lovable e difícil de manter, enquanto Django é dominado). Nesse caso: decisão separada, piloto num módulo **isolado** (cadastro de setores/catálogo ou gestão de usuários), Tabler + **HTMX** para interatividade, um único domínio, e prazo definido para a migração completa.

**Pergunta em aberto ao usuário:** quem mantém o front hoje e quão difícil é mexer nele? Se for "só eu e travo no React", a recomendação muda para começar o piloto já pelo cadastro de setores. **Confirmar com o usuário antes de iniciar as telas.** O backend (seção 4, passos 1–5) independe dessa decisão e pode começar.

---

## 6. Faturamento — proposta preliminar (NÃO implementar nesta sprint)

Só para registro, a discutir depois:
- Hoje a liberação é regra fixa no código: `cobranca_imediata` na criação ou conclusão de todos os serviços. `forma_pagamento`, `quantidade_parcelas` e `data_acordada_cobranca` existem mas nenhuma regra os usa. Cobrança são flags na OS e pode ser marcada pelo CRUD genérico sem validação (INC-01/02).
- Ideia: entidade `ParcelaCobranca` por OS (valor/percentual, gatilho definido na criação — imediato, data fixa, conclusão de serviço X, conclusão da OS —, vencimento, status pendente→liberada→cobrada→cancelada). Modelos de condição como atalhos de preenchimento, não regras embutidas. Migrar OS existentes como uma parcela de 100%.
- Perguntas ainda abertas: tarefa reaberta após liberação revoga a parcela? Contratos recorrentes entram no escopo?

---

## 7. Cuidados operacionais (lições anteriores do projeto)

- **MySQL não tem DDL transacional:** uma migração com vários passos que falhe no meio pode deixar `ALTER TABLE`s anteriores já aplicados. Preferir migrações pequenas e separar schema de dados.
- **Banco de dev MySQL é compartilhado** e já ficou à frente das migrações do git por causa de branch abandonada. Conferir `django_migrations` e o schema real antes de escrever migrações novas.
- Para drift de migração, o usuário prefere **reset real** a `--fake`.
- Validar migrações de dados contra o schema antigo **com dados reais** antes de confiar nelas.
- O histórico recente consolidou apps (`ordem_servico`/`servicos`/`tarefas` foram removidos; tudo vive em `apps/ordens_servico` e `apps/catalogo`) e renomeou "faturamento" → "cobrança" no código. Valores antigos na auditoria foram mantidos de propósito.
- Commits: só quando o usuário pedir; branch a partir de `main`.
