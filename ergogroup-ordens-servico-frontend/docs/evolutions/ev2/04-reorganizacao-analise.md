# Reorganizacao de apps/analise

## Objetivo

Separar dados financeiros de dados operacionais em `apps/analise`, que antes
misturava os dois em views que acumulavam permissao, orquestracao e query
no mesmo lugar.

## O que mudou

- As 3 views antigas (`AnaliseDadosView`, `FinanceiroKPIsView`,
  `ProdutividadeView`) foram substituidas por dois endpoints por dominio:
  - `GET /api/analise/financeiro/` — KPIs de cobranca, ticket medio, vendas
    mensais e ranking de clientes. Retorna 403 duro para os perfis Sub-Lider
    Tecnico, Tecnico, Gestor Administrativo e Administrativo.
  - `GET /api/analise/operacional/` — metricas agregadas de OS, servicos,
    tarefas, OSO, tempos medios, cancelamento, cumprimento de prazo e
    produtividade por tecnico. Disponivel para qualquer perfil autenticado
    (nao contem valor monetario nem cliente ranqueado por valor). Tecnicos
    veem apenas a propria linha em `por_tecnico`.
- Toda a logica de calculo foi movida para `apps/analise/services/`, um
  arquivo por responsabilidade, sem dependencia de DRF — as views ficaram
  so com orquestracao e permissao.

## Indicadores corrigidos

3 indicadores expunham so contagem, sem o percentual esperado (servicos por
catalogo, revisoes por cliente).

## Indicadores novos

- Tempo medio de OSO por catalogo operacional (nao existia antes).
- Taxa de cumprimento de prazo historico.
- Taxa de cancelamento por catalogo.
- Ticket medio por OS.

## Impacto na API

Qualquer integracao que consumia os endpoints antigos de analise (rotas da
`AnaliseDadosView`/`FinanceiroKPIsView`/`ProdutividadeView`) precisa migrar
para `/api/analise/financeiro/` ou `/api/analise/operacional/`, dependendo
do dado que consumia.
