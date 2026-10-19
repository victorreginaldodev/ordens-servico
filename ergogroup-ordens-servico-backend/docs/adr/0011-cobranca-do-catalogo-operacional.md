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
4. O resultado é fotografado na OS operacional. Mudar depois o catálogo ou suas exceções não altera OSOs
   existentes.
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
que foi aplicada quando o registro foi criado.
