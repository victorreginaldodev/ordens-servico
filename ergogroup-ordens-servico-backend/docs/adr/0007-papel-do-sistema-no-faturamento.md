# ADR 0007: Papel do sistema no faturamento

## Status
Aceito (10/10/2026). As mudanças no modelo da OS foram aprovadas e **implementadas na camada de dados** (modelo, migrações `ordens_servico/0008` a `0024`, validações, liberação, endpoint de lançamento, auditoria e e-mails). Telas e o bloco de cobranças (ADR 0006, seção 10) ficam para a etapa de visões e endpoints. Detalhes, dados e levantamentos em aberto estão em `docs/faturamento/`.

## Contexto
A demanda: "o faturamento está confuso para o pessoal". O levantamento de 10/10/2026 (`docs/faturamento/01-condicoes-de-pagamento-as-is.md`) mostrou:
- **as condições reais de pagamento estão em texto livre** na observação da OS: parcelamento com a data da 1ª parcela, contratos de 24 meses, fechamento mensal no dia 25 com vencimento no dia 15, "NF após a entrega + 21 dias", preço por vida;
- **o formulário limita as parcelas a 12** e não tem a data acordada de cobrança;
- **o indicador "a cobrar" soma o valor total** de vendas parceladas.

Uma primeira proposta, de gerenciar parcelas e planos de cobrança dentro do sistema, foi **rejeitada** depois que o usuário explicou como o financeiro trabalha.

## Decisão
1. **A cobrança é por OS, não por serviço.** A OS é vendida como um pacote de serviços: o preço final e as condições comerciais valem para o conjunto. Faturar serviço por serviço mudaria uma regra de negócio da empresa, e isso foi descartado.
2. **O sistema não gerencia parcelas nem cobranças.** O financeiro vê o que está liberado e lança essas informações em **outro sistema** (possivelmente Asaas, Conta Azul ou SOC, a confirmar), que gera a nota fiscal e controla parcelas e mensalidades.
3. **O papel do sistema no faturamento é:**
   1. **registrar** com clareza as condições de pagamento combinadas na venda;
   2. **avisar** quando a OS pode ser lançada (liberação: uma vez, na venda ou quando todos os serviços terminarem, como hoje);
   3. **guardar o "check"** do financeiro de que a OS foi lançada no outro sistema, com a referência do lançamento.
4. **Os nomes são provisórios.** O usuário levantou que talvez nem "faturamento" nem "cobrança" sejam o nome certo do domínio, já que o sistema não fatura nem cobra; ele registra, avisa e confere. Também não se sabe como o financeiro chama o passo "lançado". Os nomes podem mudar quando isso for levantado.
5. **Contrato substituído pelo recorrente.** O recurso de contrato da OS não está de fato em uso. Os campos de contrato saem e o tipo de condição "recorrente" ocupa esse lugar. Os dados existentes são preservados: a migração copia as informações para a observação da OS antes de remover os campos.
6. **Integração por API:** é desejável lançar automaticamente no outro sistema, **se não der muito trabalho**. O modelo deve ser preparado para isso sem implementar a integração agora.
7. **A OS operacional está fora deste fluxo** e fora de escopo.

## Mudanças no modelo da OS (implementadas em 10/10/2026)
Detalhada na seção 4b de `docs/faturamento/02-proposta-condicoes-de-pagamento.md`. Em resumo:
- **5 campos novos:** `tipo_condicao` (à vista, parcelado, recorrente), `intervalo_parcelas_dias`, `dia_fechamento`, `dia_vencimento` e `origem_lancamento` (manual ou integração).
- **2 campos alterados:**
  - `cobranca_imediata` vira `liberar_em` (venda ou conclusão);
  - `numero_nf` vira `referencia_lancamento`, em texto.
- **2 campos que passam a ser usados de verdade:**
  - `data_acordada_cobranca` como primeiro vencimento, incluída no formulário;
  - `quantidade_parcelas` sem o limite de 12 e, no recorrente, como número de meses.
- **Saem o contrato e seus campos** (decisão 5).
- **Ajustes junto:** validações por tipo de condição, liberação pelo campo novo, campos escondidos de quem não vê valores, auditoria e e-mails.
- **Dados existentes, com padrão conservador:**
  - até 1 parcela vira à vista; mais de 1 vira parcelado;
  - as inconsistências herdadas não são alteradas pela migração.

## Alternativas consideradas
- **Gerenciar parcelas e planos de cobrança dentro do sistema** (modelo de condição → plano → parcelas, inspirado no SAP, no Odoo e no Stripe): rejeitada. O controle financeiro é feito no outro sistema, e o papel deste é registrar, avisar e conferir.
- **Faturar por serviço concluído:** rejeitada (decisão 1).

## Levantamentos em aberto
1. Qual é o outro sistema: Asaas, Conta Azul ou SOC. O número que hoje vai em "NF" vem dele?
2. Confirmar que cada OS, inclusive um recorrente de 24 meses, é lançada uma vez só.
3. Preço por vida: pode ser atributo do tipo de serviço. Falta saber quem informa o número de vidas, se ele muda todo mês e onde isso é controlado. É um levantamento iniciado e não concluído, como o "aguardando" da execução.
4. O nome do passo "lançado".
5. Liberar na entrega do relatório (depende de a entrega existir no sistema; ver o backlog do ADR 0006).

## Consequências
- O financeiro deixa de depender da leitura da observação para saber o que foi combinado.
- **Contrato da API que mudou** (o frontend precisa acompanhar):
  - saem `cobranca_imediata`, `numero_nf`, `contrato`, `objeto_contrato`, `contrato_data_inicio`, `contrato_data_fim` e `gestor_contrato_*`;
  - entram `tipo_condicao`, `valor_mensal` (recorrente, ADR 0008), `intervalo_parcelas_dias`, `dia_fechamento`, `dia_vencimento`, `liberar_em`, `referencia_lancamento` e `origem_lancamento` (com os `*_display`);
  - `PATCH /ordens/{id}/cobranca/` recebe `referencia_lancamento` (texto) e `data_cobranca`, e grava a origem `manual`;
  - os campos de condição ficam ocultos para quem não tem `financeiro.ver_valores`;
  - o e-mail de "novo contrato" deixou de existir.
- Os nomes `cobranca_realizada`, `data_cobranca` e `cobranca_realizada_por` foram mantidos, porque o nome do passo "lançado" ainda é provisório.
- O check manual de hoje e um lançamento automático no futuro usam o mesmo registro.
