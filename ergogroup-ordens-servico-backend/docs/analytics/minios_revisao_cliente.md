# Mini-OS — Taxa de Revisão do Cliente

## O que este indicador mede

Proporção de Mini-OS que geraram revisão do cliente (`revisao_cliente=True`) em relação ao total de Mini-OS criadas. Exibido como percentual global.

## Fonte de dados

| Campo | Modelo | Uso |
|---|---|---|
| `revisao_cliente` | `MiniOS` | Flag de retrabalho |
| `count(id)` total | `MiniOS` | Denominador |
| `count(id)` com `revisao_cliente=True` | `MiniOS` | Numerador |

Sem filtro de período — reflete o histórico completo.

## Como ler o indicador

O percentual exibido é: `(Mini-OS com revisão / total de Mini-OS) × 100`.

- **Percentual baixo (< 10%)** → entregas sendo aceitas pelo cliente na primeira vez — alta qualidade de execução
- **Percentual médio (10–25%)** → nível de retrabalho que merece atenção, especialmente se crescente
- **Percentual alto (> 25%)** → problema sistêmico de qualidade: escopo mal alinhado, comunicação deficiente ou execução técnica inconsistente

## O que este indicador diz sobre a saúde da operação

É o **proxy de qualidade mais direto** disponível no sistema. Diferente de métricas de prazo (que medem velocidade), a taxa de revisão mede **acerto na primeira tentativa** — a capacidade da equipe de entregar o que o cliente esperava, sem retrabalho.

Alto retrabalho tem custo duplo: o técnico gasta tempo refazendo o que já fez, e o cliente perde confiança na capacidade de entrega da empresa.

## Perguntas que este indicador responde

- Com que frequência a equipe entrega algo que o cliente rejeita?
- A taxa de revisão está melhorando ou piorando ao longo do tempo?
- Existe concentração de revisões em determinados clientes (ver `minios_clientes_mais_revisoes.md`)?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Taxa > 20% | Revisar processo de alinhamento de escopo antes da execução das Mini-OS |
| Taxa crescente mês a mês | Investigar se houve mudança de técnico, mudança de cliente ou degradação de processo |
| Taxa alta em clientes específicos | Ver ranking de clientes com mais revisões — pode ser problema de comunicação com aquele cliente |
