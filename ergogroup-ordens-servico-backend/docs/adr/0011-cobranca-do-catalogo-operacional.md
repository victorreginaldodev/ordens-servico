# ADR 0011 — Cobrança definida pelo catálogo operacional

**Status:** aceito; backend e frontend implementados em 19/10/2026.

## Contexto

A cobrança de uma OS operacional dependia de o técnico marcar `revisao_cliente`. Como essa marcação nem sempre
era feita, serviços cobráveis podiam ser finalizados sem chegar ao financeiro. A decisão é comercial e não deve
ficar com quem executa o trabalho.

Na maioria dos casos, um serviço cobrável segue a mesma regra para todos os clientes. Os clientes que não pagam
por aquele serviço formam uma lista menor de exceções.

## Decisão

1. Cada `CatalogoOperacional` tem `gera_cobranca`, falso por padrão.
2. Um item cobrável pode indicar `clientes_isentos_cobranca`.
3. Na criação da OS operacional, `gera_cobranca` é calculado assim: o catálogo cobra e o cliente não está na
   lista de exceções.
4. ~~O resultado é fotografado na OS operacional. Mudar depois o catálogo ou suas exceções não altera OSOs
   existentes.~~ **Revisto em 19/10/2026 (decisão do usuário):** a OSO segue a regra **atual** do catálogo e dos
   clientes isentos enquanto não for faturada. Ao mudar `gera_cobranca` ou `clientes_isentos_cobranca`, o sistema
   recalcula todas as OSOs desse serviço ainda não faturadas (`CatalogoOperacional.reaplicar_regra_de_cobranca`,
   chamado na edição pela API e pelo admin):
   - passou a cobrar: a OSO gera cobrança; se já foi finalizada, é liberada na hora e entra em "Para faturar"
     (inclusive as finalizadas antigas);
   - deixou de cobrar, ou o cliente ficou isento: a OSO não gera cobrança e sai da fila (a liberação é desfeita);
   - as já faturadas nunca mudam.

   O recálculo grava direto no banco, sem um e-mail de liberação por OSO. Qualquer gravação de uma OSO não
   faturada também aplica a regra atual. O fluxo não usa `revisao_cliente` em nenhum ponto.

   **Revisto de novo em 20/10/2026 (decisão do usuário):** o recálculo vale **só para as OSOs criadas pela regra
   do catálogo**. Cada OSO guarda `regra_de_cobranca`:
   - `legado` (anterior à regra do catálogo): todas as OSOs que existiam quando a regra entrou (migração
     `ordens_servico/0057`). A cobrança gravada (no sistema anterior, decidida pela "Revisão do cliente") fica
     congelada: mudar o catálogo, salvar a OSO ou rodar o comando não a altera. Se ela já gerava cobrança e for
     finalizada depois, continua sendo liberada para o financeiro;
   - `catalogo` (padrão das novas): segue sempre a regra do catálogo e dos clientes isentos até ser faturada,
     inclusive quando o catálogo muda.

   A página **Auditoria das OS operacionais** (`/cobrancas/auditoria-operacionais`, com exportação para Excel) lista
   todas as OSOs **criadas antes de 20/10/2026** (corte determinístico pela data, `DATA_DE_CORTE`), sem filtro, com a
   decisão gravada, o que chegou ao financeiro e o que a regra do catálogo diria hoje (proposta aprovada
   pelo usuário em 20/10/2026, sem o tipo de cliente; revista no mesmo dia). O foco é o que **deveria ter sido
   cobrado e não foi** (`deveria_ser_cobrada`), sempre OSO finalizada e não cobrada:
   - `catalogo_sem_revisao`: o catálogo marca o serviço como cobrável, o cliente não é isento e a "Revisão do
     cliente" não foi marcada (a cobrança nunca chegou ao financeiro);
   - `revisao_sem_cobranca`: a revisão foi marcada e a cobrança não foi registrada.

   A tela tem filtro por cliente (vale para o resumo, os gráficos, os alertas, a tabela e o Excel), o resumo (OSOs e
   unidades de cada motivo, clientes afetados e período) e os gráficos de `catalogo_sem_revisao` por mês (mês do
   término; sem término, do recebimento) e por cliente (com um cliente escolhido, por serviço). O Excel ganhou as
   abas "Não cobradas por cliente" e "Não cobradas por mês". Os alertas de qualidade de dados (cobrada sem gerar, sem NF, datas, duplicidade) saíram da tela e do Excel a pedido do usuário; o campo `alertas` continua na API. A OSO não tem valor no sistema: a medida é a quantidade
   de OSOs e de unidades (soma de `quantidade`).

   `revisao_cliente` não é editável (API somente leitura, admin somente leitura, fora do formulário) e não dispara
   nada. Os dados do banco de dev recalculados em 19/10/2026 (468 passaram a cobrar e 27 deixaram) foram
   restaurados ao estado anterior em 20/10/2026.

   Quando a regra mudar sem passar pela API ou pelo admin (ex.: catálogo configurado com uma versão anterior do
   sistema), rode `python manage.py reaplicar_regra_de_cobranca` (`--simular` mostra o que mudaria); ele só alcança as OSOs
   `catalogo`.
5. `revisao_cliente` deixa de controlar a cobrança e é somente leitura na API, preservado por compatibilidade e
   pelo histórico existente.
6. Quando uma OSO cobrada é finalizada, a liberação para cobrança continua automática. O registro posterior da
   cobrança continua no endpoint dedicado do financeiro.
7. A permissão global `catalogo_operacional.configurar_cobranca` controla os dois campos financeiros do catálogo.
   Inicialmente ela é atribuída somente à função `Diretor`, mas pode ser concedida a outras funções pela
   configuração normal de permissões.
8. Desde 19/10/2026, o cadastro do catálogo operacional tem permissão própria, `catalogo_operacional.gerenciar`
   (criar, editar e excluir itens). `os_operacional.gerenciar` passou a valer só para as OSOs. A migração
   `organizacoes/0025` concedeu a permissão nova às funções que tinham `os_operacional.gerenciar`, para ninguém
   perder o acesso. Nenhuma das duas permite mudar a política de cobrança.

## Migração e compatibilidade

- Todos os itens existentes do catálogo começam com `gera_cobranca=false`. A Diretoria deve classificá-los antes
  de o novo fluxo ser usado em produção; não há inferência automática a partir do histórico.
- Nenhuma OSO existente é recalculada.
- O formulário do catálogo operacional (`CatalogoOperacionalFormPage`) tem a seção “Cobrança”: o interruptor
  “Este serviço gera cobrança” e a tabela “Clientes isentos”. Sem `catalogo_operacional.configurar_cobranca`, a seção
  aparece somente para leitura e o formulário não envia esses campos.

## Faturamento das OS operacionais no financeiro (19/10/2026, wireframe aprovado)

- As OS operacionais que geram cobrança entram em Cobranças (`/cobrancas`), nas mesmas situações das vendas:
  Em execução (não finalizada), Para faturar (liberada) e Faturadas (lançada). Detalhes em `modulos/04-financeiro.md`.
- O lançamento da OSO passa a guardar, como o da venda, a **referência** (`referencia_lancamento`, até 100
  caracteres) e a **data do lançamento** (`data_cobranca`, padrão: hoje). Migrações `ordens_servico/0054` e `0055`,
  uma alteração por migração. `numero_nf` continua no modelo e no histórico; nas cobranças antigas, ele aparece como
  a referência.
- A conferência do faturamento ganhou três verificações das OSOs: finalizada sem liberação (garantia; "Corrigir
  agora" libera), liberada há dias sem lançamento e faturada sem referência.
- A OSO continua sem valor no sistema: o financeiro define o valor no lançamento.

## Contrato da API

`GET/POST/PATCH /api/catalogo/catalogos-operacionais/` passa a expor:

- `gera_cobranca: boolean`;
- `clientes_isentos_cobranca: number[]`.

Enviar qualquer um desses campos em criação ou edição exige
`catalogo_operacional.configurar_cobranca`, além da permissão operacional exigida pela ação.

Na API de OS operacional, `revisao_cliente` e `gera_cobranca` são somente leitura. `gera_cobranca` devolve a regra
atual (ou, se a OSO já foi faturada, a que valia no faturamento). `revisao_cliente` existe só como histórico e não
aparece no formulário; o card de revisões do Painel operacional ainda conta por ele (revisão futura, fora deste
fluxo).
