# 09 — Preservação de dados

## Premissa

Esta é uma análise estática. O esquema real, volume, distribuição e inconsistências dos dados de produção não foram consultados. Os riscos abaixo indicam onde uma evolução futura precisa preservar semântica e identidade; não são proposta de migração.

## Riscos críticos

### R1 — Adoção e renomeação de tabelas legadas

As migrações iniciais de `catalogo` e `ordens_servico` usam `SeparateDatabaseAndState`, introspecção de `information_schema` e SQL bruto para renomear tabelas existentes, colunas financeiras e content types. Exemplos: `ordem_servico_ordemservico → ordens_servico_ordemservico`, `servicos_servico → ordens_servico_servico`, `tarefas_minios → ordens_servico_ordemservicooperacional`; faturamento → cobrança (`apps/ordens_servico/migrations/0001_initial.py:7-397`).

**Causa:** o estado de migração Django e o banco físico foram reconciliados manualmente. Recriar, esmagar ou reordenar esse histórico pode criar tabelas paralelas, pular renomes ou romper FKs/IDs. **Classificação: crítico.**

### R2 — Exclusões em cascata de histórico operacional

OS → serviços → tarefas usa `CASCADE`; `Catalogo → Servico` também. Usuário responsável → tarefa/OSO usa `CASCADE`. Assim, excluir uma OS, item de catálogo principal ou usuário pode apagar execução histórica e afetar indicadores. Auditoria guarda snapshots, mas não recompõe as linhas relacionais. **Classificação: crítico.**

### R3 — Identidade compartilhada com auditoria sem FK

`RegistroAuditoria` correlaciona objetos por IDs escalares. Alterar IDs, dividir tabelas ou reutilizar IDs rompe timelines ou associa eventos ao objeto errado; o banco não consegue validar isso. Os snapshots incluem nomes de campos antigos/atuais conforme a data. **Classificação: crítico.**

### R4 — Semântica financeira incorporada na OS

Valor, liberação, NF, cobrança e responsáveis residem na mesma linha da OS. Separar esses conceitos futuramente sem preservar flags, datas, autores e estados perderia a distinção entre “não liberada”, “liberada pendente” e “cobrada”. **Classificação: crítico.**

## Riscos altos

### R5 — Estados e flags redundantes

`OrdemServico.status`, `concluida` e `liberada_para_cobranca` são derivados, mas persistidos. `Servico.status`, datas e finalizador também. Não há constraints de coerência e caminhos externos podem ter produzido combinações divergentes. Interpretar ou recalcular em massa pode mudar o significado histórico. **Alto.**

### R6 — Liberação financeira monotônica

Reabertura operacional não revoga liberação. Uma migração que derive apenas do status atual transformaria registros legitimamente liberados pelo comportamento vigente. Também é preciso distinguir liberação imediata de liberação por conclusão; não existe campo de motivo, apenas inferência por dados/auditoria. **Alto.**

### R7 — OS operacional independente e sem valor

OSO não tem FK para OS comercial nem valor. Tentar unificar cardinalidades sem uma chave comprovada pode criar associações falsas ou perder cobranças de revisão. **Alto.**

### R8 — Catálogo mutável usado como fallback

Horas e complexidade efetivas podem vir do valor atual do catálogo, não de um snapshot na data da execução. Alterar o catálogo muda retroativamente indicadores de registros sem override. **Alto.**

### R9 — Duas flags de atividade de usuário

Autenticação Django normalmente considera `is_active`, enquanto a API de ativação manipula `ativo`; e-mails exigem ambas. Colapsá-las sem analisar dados pode habilitar/desabilitar pessoas ou mudar destinatários. **Alto.**

## Riscos médios

- **R10 — Inscrições sem unicidade:** duplicidades de cliente são estruturalmente permitidas; deduplicação automática pode unir entidades distintas. **Médio.**
- **R11 — Contrato desnormalizado:** gestor e contrato são campos da OS; converter para entidades 1:N exige preservar valores por OS e registros incompletos possíveis. **Médio.**
- **R12 — NF heterogênea:** OS usa inteiro; OSO usa varchar(10). Conversão comum pode perder zeros, sufixos ou valores fora da faixa. **Médio.**
- **R13 — Datas com semântica sobreposta:** OS não tem data de conclusão própria; relatórios usam último serviço ou data de liberação, que divergem na cobrança imediata. **Médio.**
- **R14 — Campos sem regra ativa:** `quantidade_parcelas`, `data_acordada_cobranca` e `cobranca_revisao_alteracao` podem conter intenção comercial não executada pelo backend. Removê-los perderia informação. **Médio.**
- **R15 — Content types renomeados:** permissões Django e referências genéricas dependem dos renomes feitos nas migrações. **Médio.**

## Tabelas e relações mais sensíveis

1. `ordens_servico_ordemservico`: nó comercial, operacional e financeiro.
2. `ordens_servico_servico` e `ordens_servico_tarefa`: evidência de execução e origem das datas/atores derivados.
3. `ordens_servico_ordemservicooperacional`: fluxo paralelo e cobrança de revisão.
4. `auditoria_registroauditoria`: histórico sem integridade referencial.
5. `contas_usuario`: autores/responsáveis, com cascatas assimétricas.
6. Catálogos: identificadores legados e fallback para indicadores.

## Cuidados de interpretação

- Preservar IDs e mapeamentos de IDs é necessário para auditoria.
- Preservar valores antigos de enum, inclusive ações de auditoria `liberacao_faturamento` e `faturamento`, é necessário para leitura histórica.
- Não assumir que `concluida=true`, `status=concluida` e liberação sejam sempre coerentes.
- Não inferir parcelas ou cobranças individuais a partir de `quantidade_parcelas`.
- Não inferir relação OS–OSO por cliente/data sem evidência adicional.

## Limitação

Sem inspeção de dados reais, não foi possível quantificar nulos, órfãos lógicos, combinações incoerentes, duplicidades ou uso de valores legados. Essa validação deve ser uma etapa controlada futura, não foi executada aqui.
