---
titulo: Registrar uma venda
resumo: A Nova venda tem três partes na mesma página. Ao lado, um resumo mostra o que ainda falta preencher. Tudo é salvo de uma vez, ao clicar em Registrar venda.
permissoes: os.gerenciar
tela: Nova venda
url: /vendas/nova
rotas: /vendas/nova
ver: condicao, servicos
atualizado: 15/10/2026
---

## 1. Cliente e venda

1. Escolha o **cliente**. Dá para buscar pelo nome ou pelo CNPJ.
2. Informe a **data da venda**. Ela pode ser diferente de hoje.
3. Escolha a **prioridade**: baixa, média ou alta. Se você não escolher, fica baixa.

> [!DICA] Prioridade dos serviços
> Os serviços herdam a prioridade da venda. Se um serviço for mais urgente, dá para escolher outra prioridade só para ele.

## 2. Serviços vendidos

1. Clique em `Adicionar serviço`.
2. Escolha o serviço do catálogo e escreva **o que será feito**: local, escopo, quantidade.
3. Clique em `Adicionar à OS`. O modal continua aberto para o próximo serviço e mostra os que já entraram.

Cada serviço mostra o setor que vai executá-lo. A venda precisa de pelo menos um serviço.

> [!ATENCAO] Não achou o serviço?
> Só aparecem os serviços ativos de setores ativos. Se faltar algum, fale com quem cuida do catálogo.

## 3. Pagamento

Informe o valor, se é à vista ou parcelado, a forma de pagamento, o vencimento e quando o financeiro pode faturar. A tela mostra a prévia das datas e do valor de cada parcela.

Cada campo está explicado em [Condição de pagamento](condicao) e em [Liberar para faturamento](liberar).

## Depois de registrar

Ao clicar em `Registrar venda`:

- a venda é criada com os serviços;
- cada setor recebe um e-mail com os serviços que chegaram;
- se a venda foi liberada para faturar na venda, o financeiro também recebe um e-mail;
- a tela abre o [Resumo da venda](resumo).

## Se aparecer um aviso

A mensagem **"Venda registrada, com um aviso"** quer dizer que algum setor da venda ainda não tem ninguém para receber tarefas.

A venda foi salva normalmente. Avise quem configura setores e funções para que o setor consiga executar o serviço.
