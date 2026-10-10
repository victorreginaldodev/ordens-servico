# 02 — Inventário funcional

## Funcionalidades confirmadas

| Área | Funcionalidade efetiva | Persistência/efeito | Evidência |
|---|---|---|---|
| Clientes | CRUD, busca por nome/inscrição, filtro por tipo/ativo | `clientes_cliente` | `apps/clientes/views/cliente_viewset.py:56-80` |
| Usuários | CRUD, ativação, desativação, senha, tipos | `contas_usuario` | `apps/contas/views/usuario_viewset.py:75-193` |
| Autenticação | login, refresh, logout/blacklist, identidade e redefinição de senha | tokens e senha de usuário | `apps/contas/urls.py:17-22` |
| Catálogo | CRUD de catálogos principal, operacional e subitens | três tabelas `catalogo_*` | `apps/catalogo/urls.py:5-7` |
| OS comercial | CRUD, filtros, busca e campos comerciais/contratuais | `ordens_servico_ordemservico` | `apps/ordens_servico/views/ordem_servico_viewset.py:67-108` |
| Serviços | CRUD, filtros e sincronização derivada | `ordens_servico_servico` | `apps/ordens_servico/views/servico_viewset.py:60-114` |
| Tarefas | CRUD, atribuição, filtros e datas automáticas | `ordens_servico_tarefa` | `apps/ordens_servico/views/tarefa_viewset.py:62-104` |
| OS operacional | CRUD, responsável direto, revisão e cobrança | `ordens_servico_ordemservicooperacional` | `apps/ordens_servico/views/ordem_servico_operacional_viewset.py:68-154` |
| Cobrança | liberação automática e registro manual de realização | flags, data, NF e usuário | viewsets de OS; modelos de OS |
| Auditoria | criação, alteração, exclusão, status, contrato e cobrança | `auditoria_registroauditoria` | `apps/auditoria/signals.py:15-65` |
| Notificações | contrato, atribuição, liberação e cobrança | e-mail pós-commit; sem fila | `apps/ordens_servico/signals.py:14-84` |
| Indicadores | financeiro, volume, tempo, prazo, cancelamento e produtividade | consultas; não persistem agregados | `apps/analise/urls.py:4-7` |

## Permissões relevantes ao domínio

- Autenticação é global. CRUD de clientes, catálogos, OS e serviços não adiciona restrição por papel além de autenticação.
- Técnicos veem somente OS que tenham tarefa atribuída a eles e somente suas tarefas; para OS operacional, somente as sob sua responsabilidade (`ordem_servico_viewset.py:84-87`; `tarefa_viewset.py:75-80`; `ordem_servico_operacional_viewset.py:85-89`).
- Apenas responsável da tarefa, diretor, líder técnico, sub-líder ou superusuário pode modificar uma tarefa existente. A permissão não restringe criação porque é apenas object-level (`apps/contas/permissions.py:49-69`).
- Indicadores financeiros omitem valores para técnico, subgestor técnico, administrativo e gestor administrativo (`apps/contas/permissions.py:36-46`; `apps/analise/views/financeiro_view.py:20-44`).

## Não encontrado

Propostas, aprovação comercial, versões de preço, itens com preço individual, cronograma de parcelas, recorrência, recebimento/pagamento, integração fiscal, anexos, setores/equipes e dependências entre tarefas não possuem modelo ou fluxo implementado identificável.
