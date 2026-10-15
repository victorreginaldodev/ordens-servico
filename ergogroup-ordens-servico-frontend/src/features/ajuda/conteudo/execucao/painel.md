---
titulo: Painel do setor e Visão geral
resumo: O Painel do setor mostra tudo o que chegou ao seu setor e em que pé está. A Visão geral é o mesmo painel com todos os setores, para a diretoria.
permissoes: servicos.ver_setor, setores.todos
rotas: /setor, /setor/:setorId, /visao-geral
ver: distribuir, alertas
atualizado: 15/10/2026
---

## Qual das duas você vê

- **Painel do setor:** para quem acompanha um setor. Se você acompanha mais de um, há um seletor de setor no topo.
- **Visão geral:** para quem atua em todos os setores. É o mesmo painel, com todos os setores e o filtro `Setor`.

## Abas

| Aba | O que mostra |
|---|---|
| **Novos** | Serviços que chegaram e ninguém confirmou o recebimento. |
| **A distribuir** | O setor confirmou que recebeu, mas ainda não escolheu quem faz. |
| **Distribuídos** | Já têm responsável, e ninguém começou. |
| **Em andamento** | Alguém começou, e ainda falta alguma tarefa. |
| **Concluídos** | O que o setor terminou, mês a mês. |

## Ações na fila

- `Confirmar o recebimento`: avisa que o setor viu o serviço. Ele passa para A distribuir.
- `Confirmar e distribuir`: confirma o recebimento e já escolhe o responsável. Veja [Distribuir um serviço](distribuir).
- `Explicar a pausa`: para um serviço parado que está esperando algo. Veja [Prazos, alertas e pausa](alertas).

> [!DICA] Ações em ícones
> Na lista, as ações aparecem como ícones. Passe o mouse sobre o ícone para ver o nome. No quadro, o botão aparece com o texto.

## Precisa de atenção

O filtro `Precisa de atenção` vale em qualquer aba e junta:

- **Atrasados:** o prazo já passou.
- **Sem andamento:** parado há 7 dias ou mais.
- **Aguardando algo:** alguém explicou a pausa.
- **Sem ciência do técnico:** o responsável ainda não confirmou o recebimento da tarefa.
- **Novos há 3 dias ou mais.**

Há também os filtros de pessoa, cliente, prazo e chegada ao setor.
