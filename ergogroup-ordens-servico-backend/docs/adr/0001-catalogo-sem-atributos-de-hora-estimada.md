# ADR 0001: Catálogo sem atributos de horas estimadas/complexidade

## Status
Substituído pelos ADRs 0004 e 0005 (10/10/2026): horas e complexidade saíram do catálogo e sairão também do serviço e da tarefa. O prazo é o único parâmetro de planejamento.

## Contexto
Catálogo e catálogo operacional precisam expor indicadores de horas e complexidade.

## Decisão
Esses atributos não serão armazenados diretamente nas models de catálogo. 
Serão derivados a partir de atributos já existentes nas próprias models.

## Consequências
- Reduz custo de implementação e manutenção (menos campos para manter sincronizados)
- Indicadores dependem da lógica de cálculo se manter correta conforme o sistema evolui
