# Financeiro — KPIs de Faturamento

## O que este indicador mede

Três valores monetários que representam o pipeline financeiro completo da operação:

| KPI | Definição |
|---|---|
| `total_faturado` | Soma do `valor` de OS com `faturada=True` |
| `total_para_faturar` | Soma do `valor` de OS com `liberada_para_faturamento=True` e `faturada=False` |
| `total_sem_liberacao` | Soma do `valor` de OS concluídas operacionalmente mas sem `liberada_para_faturamento` |

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `valor` | `OrdemServico` | Valor financeiro da OS |
| `faturada` | `OrdemServico` | Flag de nota fiscal emitida |
| `liberada_para_faturamento` | `OrdemServico` | Flag de aprovação pelo gestor |
| `concluida` | `OrdemServico` | Flag de encerramento operacional |

Sem filtro de período — reflete o histórico completo.

## Como ler os KPIs

### Total Faturado
Receita já realizada — OS com nota fiscal emitida. É o número de referência de receita da empresa.

### Total para Faturar
**Receita aprovada aguardando emissão de nota fiscal.** Este valor está "na fila" do financeiro. Representa caixa futuro imediato — OS que o gestor já aprovou mas o financeiro ainda não processou.

### Total sem Liberação
**Receita represada operacionalmente.** OS que já foram concluídas tecnicamente mas o gestor não liberou para faturamento. Pode indicar:
- Pendência administrativa (documentação, aprovação de cliente)
- Problema de processo no fluxo gestor → financeiro
- OS aguardando revisão antes da liberação

## O que este indicador diz sobre a saúde da operação

Os três valores formam o **funil financeiro**:

```
[Concluída sem liberação] → [Aprovada para faturar] → [Faturada]
```

O valor represado em "sem liberação" é o mais crítico: representa trabalho entregue que não está gerando receita. Quanto maior esse valor em relação ao "para faturar", maior o gargalo no processo de aprovação do gestor.

## Perguntas que este indicador responde

- Quanto da receita aprovada ainda está aguardando emissão de NF?
- Há valor significativo de trabalho entregue que não foi liberado para faturamento?
- Qual é o pipeline financeiro total da empresa?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| `total_sem_liberacao` > `total_para_faturar` | Processo de liberação pelo gestor está represando mais receita do que o financeiro consegue processar — revisar frequência de aprovações |
| `total_para_faturar` alto com `total_faturado` baixo | Fila do financeiro acumulada — verificar capacidade de emissão de notas |
| `total_sem_liberacao` crescendo | Gestores não estão liberando OS em tempo hábil — criar SLA interno de liberação |

## Restrição de acesso

Este endpoint é restrito a perfis com permissão financeira (`usuario_pode_ver_valores`). Técnicos, Sub-Líderes Técnicos, Gestores Administrativos e Administrativos não têm acesso a estes valores.
