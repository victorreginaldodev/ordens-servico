---
titulo: Catálogo de serviços
resumo: O catálogo é a lista dos serviços que a empresa vende. Cada serviço diz qual setor o executa, e é isso que leva cada venda à fila certa.
tela: Catálogo
url: /catalogo
rotas: /catalogo, /catalogo/new, /catalogo/:id/edit
ver: mudar-setor-do-catalogo, execucao/como-funciona
atualizado: 15/10/2026
---

## A lista

Os serviços aparecem **agrupados por setor**, com as visões **Ativos**, **Inativos** e **Todos**, busca e filtro de setor.

## Cadastrar um serviço

1. Clique em `Novo serviço`.
2. Preencha o `Nome do serviço`.
3. Escolha o `Setor responsável`: o setor que executa o serviço. O setor precisa estar ativo.
4. Se quiser, escreva a `Descrição`: o que está incluído, entregáveis, normas de referência. Ajuda o comercial a escolher o serviço certo.
5. Deixe marcado `Disponível para novas OS` para que ele possa ser vendido.
6. Salve.

> [!ATENCAO] O setor precisa ter quem receba tarefas
> Um serviço ativo só pode ficar num setor que tenha alguém para receber tarefas. Se não tiver, o sistema não deixa salvar e explica o que fazer: dar a alguém uma função que recebe tarefas no setor, ou marcar o setor no "também executa em" de alguém.

Se o setor tiver quem receba tarefas, mas ninguém que organize o trabalho, o serviço é salvo com um aviso: as vendas vão chegar a uma fila sem ninguém para distribuir.

## Desativar ou excluir

- **Desativar:** o serviço deixa de aparecer na Nova venda. As vendas antigas continuam com ele.
- **Excluir:** só funciona se o serviço nunca foi vendido. Se já foi, desative.

## Quem pode

Todos veem o catálogo. Cadastrar, editar, mudar o setor, desativar e excluir precisa da permissão "Cadastrar o catálogo de serviços e o setor de cada um".
