# 06. Clientes

O cadastro das **empresas e pessoas para quem a empresa vende**. Toda venda tem um cliente. Os dados dele também são usados pelo financeiro na hora de faturar.

---

## 1. Dados do cliente

| Campo | Obrigatório | Regra |
|---|---|---|
| Nome (razão social) | Sim | Até 100 caracteres. |
| Tipo de inscrição | Não (padrão: CNPJ) | CNPJ, CPF, CEI, CNO ou CAEPF. |
| Número de inscrição | Não | O documento. A busca também procura por ele. |
| Tipo de cliente | Não (padrão: Gestão) | Gestão, Avulso ou Fornecedor. |
| Representante: nome, setor, e-mail e telefone | Não | A **pessoa de contato** no cliente. O e-mail é sugerido como "e-mail da nota" na Nova venda. |
| Cobrança por revisão/alteração | Não (padrão: sim) | Indica se o cliente paga por revisões e alterações. É só informativo: nenhuma regra do sistema usa este campo hoje. |
| Observação | Não | Texto livre. |
| Ativo | Padrão: sim | Cliente inativo não aparece na escolha de cliente da Nova venda. As vendas antigas continuam com ele. |
| Cliente desde | Automático | Data do cadastro. |

**Contatos:** cada cliente tem **um** representante, guardado nos próprios campos do cliente. A tela "Contatos" lista e edita esses representantes; "editar um contato" é editar os campos de representante daquele cliente. Não existe cadastro de vários contatos por cliente.

---

## 2. Quem pode o quê

| Ação | Permissão |
|---|---|
| Ver clientes | Todos (quem executa precisa ver o cliente da OS) |
| Cadastrar, editar, desativar e excluir | `clientes.gerenciar` |
| "Ver vendas do cliente" (atalho para Vendas filtrada) | Quem vê Vendas (`os.gerenciar` ou `os.ver_todas`) |

---

## 3. Regras de negócio

| Regra | Comportamento |
|---|---|
| Excluir | **Bloqueado (409)** se o cliente tem vendas. A saída é desativar. |
| Desativar | Some da escolha de cliente na Nova venda, mas a API ainda aceita vendas para cliente inativo. Ao editar uma venda antiga, o cliente inativo dela continua aparecendo. |
| Uso no faturamento | O Resumo para faturar e o modal Faturar mostram todos os dados do cliente, com "copiar" (módulo 04). |
| Uso na Nova venda | A busca é por nome ou CNPJ, e o e-mail do representante é sugerido como e-mail da nota. |

---

## 4. Telas

| Tela | Rota | O que mostra e faz |
|---|---|---|
| **Clientes** | `/clientes` | Tabela com as visões Ativos, Inativos e Todos, busca e filtros de tipo, documento, "cobra revisão", representante (com ou sem) e "cliente desde". Ações: editar, ver vendas do cliente, desativar ou reativar e excluir. |
| **Novo / Editar cliente** | `/clientes/new`, `/clientes/:id/edit` | O formulário com todos os campos da seção 1. |
| **Contatos** | `/clientes/contacts` | Os representantes dos clientes (seção 1). |

---

## 5. Endpoints

| Ação | Endpoint | Observações |
|---|---|---|
| Listar | `GET /api/clientes/clientes/` | Filtros: `q` (nome ou documento), `tipo`, `ativo`. |
| Detalhar / criar / editar / excluir | `/api/clientes/clientes/<id>/` | Escrita com `clientes.gerenciar`. Exclusão com 409 se o cliente tiver vendas. |

---

## 6. Onde está no código

| Assunto | Arquivo |
|---|---|
| Modelo | `apps/clientes/models/cliente.py` |
| Endpoints | `apps/clientes/views/cliente_viewset.py`, `serializers/cliente_serializer.py` |
| Telas | Frontend: `src/features/clientes/` |
