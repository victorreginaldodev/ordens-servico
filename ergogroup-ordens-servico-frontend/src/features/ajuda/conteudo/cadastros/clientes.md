---
titulo: Clientes
resumo: O cadastro das empresas e pessoas para quem a empresa vende. Toda venda tem um cliente, e o financeiro usa os dados dele para faturar.
tela: Clientes
url: /clientes
rotas: /clientes, /clientes/new, /clientes/:id/edit
ver: contatos, vendas/registrar
atualizado: 15/10/2026
---

## A lista

- Visões **Ativos** (padrão), **Inativos** e **Todos**.
- Busca por nome, documento ou representante.
- Filtros de tipo, documento, cobra revisão, representante (com ou sem) e cliente desde.

## Cadastrar um cliente

1. Clique em `Novo cliente`.
2. Preencha o **nome** (razão social). É o único campo obrigatório.
3. Informe o documento: tipo (CNPJ, CPF, CEI, CNO ou CAEPF) e número.
4. Escolha o **tipo de cliente**: Gestão, Avulso ou Fornecedor.
5. Preencha o **representante**: nome, setor, e-mail e telefone da pessoa de contato no cliente.
6. Salve.

> [!DICA] O e-mail do representante vai para a nota
> Na Nova venda, o e-mail do representante é sugerido como o e-mail para enviar a nota fiscal.

## Ações em cada cliente

No menu `⋯` de cada cliente:

- `Editar`.
- `Ver vendas do cliente`: abre Vendas já filtrada por ele.
- `Desativar` ou `Reativar`.
- `Excluir`.

## Desativar ou excluir

- **Desativar:** o cliente some da escolha de cliente na Nova venda. As vendas antigas continuam com ele.
- **Excluir:** só funciona se o cliente nunca teve vendas. Se tiver, o sistema oferece desativar.

## Quem pode

Todos veem os clientes. Cadastrar, editar, desativar e excluir precisa da permissão "Cadastrar, editar e excluir clientes".
