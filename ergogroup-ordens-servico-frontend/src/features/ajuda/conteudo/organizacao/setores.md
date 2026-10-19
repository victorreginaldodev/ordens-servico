---
titulo: Setores
resumo: Os setores são as áreas da empresa. A tela mostra cada setor com quem organiza o trabalho e quantas pessoas recebem tarefas.
permissoes: organizacao.configurar, usuarios.gerenciar
tela: Setores
url: /organizacao/setores
rotas: /organizacao/setores
ver: funcoes, cadastros/mudar-setor-do-catalogo
atualizado: 15/10/2026
---

## Os cards

Cada setor aparece num card com quem **organiza** o trabalho e quantas pessoas recebem tarefas. Num setor de execução, dois alertas podem aparecer:

| Alerta | O que quer dizer |
|---|---|
| **Sem quem organize** | Ninguém do setor acompanha e distribui o trabalho. Os serviços vão chegar a uma fila sem dono. |
| **Sem quem receba tarefas** | Ninguém pode ser escolhido como responsável no setor. |

## O detalhe do setor

Clique no setor para abrir o detalhe, com três abas:

- **Pessoas:** quem está no setor, agrupado por função.
- **Funções:** as funções liberadas no setor. Use `Liberar funções` para liberar mais.
- **Catálogos:** os serviços do catálogo que o setor executa.

## Criar um setor

Clique em `Novo setor`, informe o nome e, se quiser, uma descrição do que o setor faz. O nome não pode repetir.

## Desativar ou excluir

- **Desativar:** quem está no setor perde as permissões do vínculo, e ninguém recebe tarefas nele. Não é possível desativar um setor que ainda tem serviços ativos no catálogo: passe esses serviços para outro setor antes.
- **Excluir:** só funciona se o setor nunca foi usado (sem pessoas, serviços do catálogo nem vendas). Se já foi, desative.

> [!DICA] Encerrar um setor
> 1) Passe os serviços do catálogo para outro setor. 2) Mude as pessoas de setor no Time. 3) Desative o setor.

## Quem pode

A tela fica no menu do usuário de quem gerencia o time ou configura setores e funções. Criar, editar, desativar e excluir: quem tem "Configurar a empresa e os setores". Liberar ou retirar funções de um setor altera a função, então é só para superusuários.
