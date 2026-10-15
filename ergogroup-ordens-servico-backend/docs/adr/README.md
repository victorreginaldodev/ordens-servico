# Decisões de arquitetura e de domínio (ADR)

Cada ADR registra uma decisão, o contexto em que foi tomada, as alternativas descartadas e as consequências. Decisões substituídas continuam aqui, marcadas como tal, para preservar o histórico.

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-catalogo-sem-atributos-de-hora-estimada.md) | Catálogo sem atributos de horas estimadas/complexidade | Substituído pelos ADRs 0004 e 0005 |
| [0002](0002-bloqueio-de-exclusao-em-cascata.md) | Bloqueio de exclusão em cascata | Aceito e implementado |
| [0003](0003-setores-funcoes-e-permissoes-configuraveis.md) | Setores, funções e permissões configuráveis | Aceito; implementado (revisão de 14/10/2026 incluída) |
| [0004](0004-setor-responsavel-pela-execucao.md) | Setor responsável pela execução e catálogo | Aceito e implementado (revisão de 14/10/2026 incluída) |
| [0005](0005-prazo-como-unico-parametro-de-planejamento.md) | Prazo como único parâmetro de planejamento | Aceito e implementado |
| [0006](0006-fluxo-de-execucao-nos-setores.md) | Fluxo de execução nos setores | Aceito; seção 6 substituída pelo ADR 0008; endpoints no plano de execução |
| [0007](0007-papel-do-sistema-no-faturamento.md) | Papel do sistema no faturamento | Aceito; camada de dados implementada, telas pendentes |
| [0008](0008-acompanhamento-linha-do-tempo-comercial-e-financeiro.md) | Acompanhamento da execução, linha do tempo, visão comercial e controle financeiro | Aceito; backend implementado (fases 6 a 11); frontend pendente |
| [0009](0009-ciencia-de-recebimento-no-servico-e-na-tarefa.md) | Ciência de recebimento no serviço e na tarefa (etapas Novo e A distribuir; Nova e A iniciar) | Aceito; backend implementado (fase 13); frontend pendente (fase 14) |
| [0010](0010-notificacoes-por-email.md) | Notificações por e-mail: quatro e-mails de ação e um resumo diário de pendências | Aceito e implementado (15/10/2026); falta agendar o resumo diário no servidor |

Documentos relacionados:
- `docs/conceitos-de-dominio.md` — glossário do domínio.
- `docs/telas-blocos-e-endpoints.md` — telas, blocos de informação, quem vê o quê (permissões) e endpoints candidatos.
- `docs/plano-execucao-comercial-financeiro.md` — plano de implementação das fases 6 a 14 (execução, comercial, financeiro, linha do tempo, ciência de recebimento).
- `docs/mapa-de-permissoes.md` — o que cada permissão libera e as regras do frontend.
- `docs/plano-setores-e-permissoes.md` — plano de implementação por fases.
- `docs/briefing-sprint-setores.md` e `docs/as-is/` — o problema original e o sistema antes da sprint.
- `docs/faturamento/01-condicoes-de-pagamento-as-is.md` — condições de pagamento: o que o sistema faz hoje e como o negócio realmente cobra.
- `docs/faturamento/03-revisao-a-vista-e-parcelado.md` — revisão de 13/10/2026: só à vista e parcelado, vencimento por data ou dias após a nota, a observação da OS como observação de pagamento.
