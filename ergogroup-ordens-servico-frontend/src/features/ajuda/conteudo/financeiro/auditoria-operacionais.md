---
titulo: Auditoria das OS operacionais
resumo: Todas as OS operacionais criadas antes de 20/10/2026, com foco no que deveria ter sido cobrado e não foi, por cliente e por mês. Exporta para Excel.
permissoes: auditoria.ver
tela: Auditoria das OS operacionais
url: /cobrancas/auditoria-operacionais
rotas: /cobrancas/auditoria-operacionais
ver: cobrancas, conferencia
atualizado: 20/10/2026
---

## O que entra

**Todas** as OS operacionais criadas antes de 20/10/2026, quando a cobrança passou a vir do catálogo operacional, sem nenhum filtro. As criadas depois não entram: elas seguem a regra do catálogo.

Nessas OS antigas, a cobrança é a que ficou gravada (no sistema anterior, decidida pela **Revisão do cliente** marcada pelo técnico) e não muda quando o catálogo muda.

## O que deveria ter sido cobrado

Uma OS operacional **deveria ter sido cobrada** quando está finalizada, não foi cobrada e:

- **Catálogo cobrável, sem revisão do cliente:** o catálogo marca o serviço como cobrável, o cliente não é isento e o técnico não marcou "Revisão do cliente". A cobrança nunca chegou ao financeiro. É o foco da auditoria;
- **Revisão marcada, não cobrada:** o técnico marcou a revisão e mesmo assim a cobrança não foi registrada.

No topo ficam o resumo (quantas OS e quantas unidades em cada caso, quantos clientes e o período) e dois gráficos do primeiro caso: **por mês** (mês do término) e **por cliente**. Clique numa barra do gráfico por cliente para ver só aquele cliente; com um cliente escolhido, o segundo gráfico passa a mostrar os serviços dele.

A OS operacional não tem valor no sistema: a medida é a quantidade de OS e de unidades.

## Filtrar por cliente

Escolha um cliente no campo `Cliente`: o resumo, os gráficos, a tabela e o Excel passam a mostrar só ele. `Ver todos os clientes` volta ao total.

## As colunas

| Grupo | O que mostra |
|---|---|
| **Identificação** | Nº, cliente e CNPJ/CPF |
| **Serviço** | Item do catálogo, quantidade e descrição |
| **Execução** | Responsável, status, recebimento, início, término e dias até terminar |
| **Decisão gravada** | Revisão do cliente, liberada em e por quem |
| **Regra de hoje** | Catálogo cobra hoje, cliente isento hoje e **cobraria pela regra de hoje** |
| **Lançamento** | Situação de cobrança, cobrada, referência ou NF, data do lançamento e quem faturou |
| **Histórico** | As alterações registradas e a última alteração |

Na tela, as principais aparecem logo; as outras estão no menu `Colunas`.

## Na tabela

As abas `Deveriam ter sido cobradas`, `Catálogo cobrável, sem revisão` e `Revisão marcada, não cobrada` mostram cada caso. A coluna Cobrança marca "Deveria ter sido cobrada".

## Exportar para Excel

`Exportar Excel` baixa todas as OS (ou só as do cliente escolhido; a busca e a aba da tabela não contam) com cinco abas:

1. **OS operacionais**: todas as colunas, "Deveria ter sido cobrada" e o mês de referência;
2. **Não cobradas por cliente**: OS e unidades de cada caso, por cliente;
3. **Não cobradas por mês**: OS e unidades de cada caso, por mês do término;
4. **Resumo por serviço**: total, finalizadas, cobradas, revisão sem cobrança e se o catálogo cobra hoje;
5. **Sobre**: quando e por quem foi gerado e o que significa cada coluna.

> [!ATENCAO] Datas antigas
> "Data do lançamento" fica vazia nas cobranças antigas: o sistema anterior guardava só a NF. "Alterações registradas" conta o histórico desde 30/06/2026.

## Quem pode

Quem tem **Ver o histórico de alterações** (`auditoria.ver`) e **Ver valores** (`financeiro.ver_valores`).
