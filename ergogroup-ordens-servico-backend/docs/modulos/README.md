# Documentação funcional dos módulos

Cada arquivo descreve um módulo do sistema do jeito que ele funciona **hoje** (código atual):

- **para que serve** e os conceitos;
- as **regras de negócio**: o que o sistema permite, bloqueia ou só avisa;
- o **fluxo básico**: a ordem em que as coisas acontecem;
- as **telas** e os **endpoints** envolvidos.

Tecnicamente, é uma **especificação funcional** (ou documentação de regras de negócio). Ela não substitui:

- os **ADRs** (`docs/adr/`), que registram *por que* cada decisão foi tomada e as alternativas descartadas;
- o **glossário** (`docs/conceitos-de-dominio.md`).

Quando uma regra mudar, atualize o módulo junto com o código.

A **Ajuda** do sistema (frontend, `src/features/ajuda/conteudo/`, rota `/ajuda`) é a versão destes módulos escrita para quem usa o sistema. Quando uma regra mudar, atualize também a página correspondente da Ajuda.

## Ordem de leitura

Os módulos 01 a 04 seguem o ciclo da venda: **quem faz** → **vende** → **executa** → **fatura**. Os demais são apoio e regras que valem para todos.

```
01 Organização ──▶ 02 Vendas ──▶ 03 Execução nos setores ──▶ 04 Financeiro
       │                │                  │                        │
       └── 05 Catálogo (diz o setor de cada serviço)                │
           06 Clientes (para quem se vende)                         │
           07 Indicadores (os números de tudo) ◀────────────────────┘
           08 Linha do tempo e auditoria (o histórico de tudo)
           09 Notificações por e-mail (quem é avisado de quê)
           10 Acesso, conta e navegação (entrar, menu, tela inicial, regras gerais)
```

| # | Módulo | Arquivo |
|---|---|---|
| 01 | Organização: setores, funções, permissões e time | [01-organizacao-setores-funcoes-permissoes-e-time.md](01-organizacao-setores-funcoes-permissoes-e-time.md) |
| 02 | Vendas: venda (OS), serviços vendidos e condição de pagamento | [02-vendas.md](02-vendas.md) |
| 03 | Execução nos setores: como a venda se divide entre setores, ciência, distribuição, tarefas e alertas | [03-execucao-nos-setores.md](03-execucao-nos-setores.md) |
| 04 | Financeiro: liberação, cobranças, faturamento, conferência e indicadores | [04-financeiro.md](04-financeiro.md) |
| 05 | Catálogo de serviços: o setor de cada serviço, mudança de setor, desativar e excluir | [05-catalogo.md](05-catalogo.md) |
| 06 | Clientes: cadastro, representante e uso na venda e no faturamento | [06-clientes.md](06-clientes.md) |
| 07 | Indicadores: painel operacional e painel financeiro | [07-indicadores.md](07-indicadores.md) |
| 08 | Linha do tempo e auditoria | [08-linha-do-tempo-e-auditoria.md](08-linha-do-tempo-e-auditoria.md) |
| 09 | Notificações por e-mail | [09-notificacoes-por-email.md](09-notificacoes-por-email.md) |
| 10 | Acesso, conta e navegação, e as regras que valem em todo o sistema | [10-acesso-conta-e-navegacao.md](10-acesso-conta-e-navegacao.md) |

## Fora do escopo

A **OS operacional** ("mini OS") e o **catálogo operacional** não estão documentados aqui: estão fora do escopo da sprint.

## Pontos em aberto encontrados ao documentar

Comportamentos do código atual que podem pedir ajuste. Estão descritos nos módulos, mas **nenhum foi decidido**:

| Ponto | Módulo |
|---|---|
| Não há como cancelar um serviço (o status existe, mas nenhuma tela, endpoint ou o admin o altera). | 02, 03 |
| Trocar "liberar em" para "na venda" numa venda já salva não libera na hora; a liberação só acontece na próxima vez que os serviços forem atualizados. | 02 |
| Não há como desfazer um lançamento registrado por engano. | 04 |
| Os subitens do catálogo existem na API, mas nenhuma tela usa. | 05 |
| O campo "cobrança por revisão/alteração" do cliente é só informativo; nenhuma regra usa. | 06 |
| A API aceita vendas para cliente inativo (só a tela esconde). | 06 |
| No Painel operacional, sem `indicadores.ver_geral` o bloco por técnico mostra só a própria pessoa, mesmo para quem acompanha um setor. | 07 |
| O agendamento do resumo diário de pendências no servidor ainda não foi feito. | 09 |
