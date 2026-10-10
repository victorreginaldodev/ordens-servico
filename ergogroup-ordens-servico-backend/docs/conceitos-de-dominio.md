# Conceitos de domínio

Definições usadas no código e nas conversas sobre o sistema. Quando uma regra depender de um destes conceitos, ela deve seguir a definição daqui.

## Organização e pessoas

| Conceito | Definição | Onde está |
|---|---|---|
| **Organização** | A empresa que usa o sistema (hoje, a Ergogroup). Setores e funções pertencem a ela. | `organizacoes.Organizacao` |
| **Setor** | Área da empresa: Diretoria, Comercial, Segurança do Trabalho, Financeiro, Administrativo. Pode ser uma área de execução de serviços ou não. | `organizacoes.Setor` |
| **Função** | O papel que uma pessoa exerce num setor (ex.: "Gestor Técnico"). Tem nome livre, as permissões que concede e os setores em que pode ser usada. | `organizacoes.Funcao` |
| **Vínculo** | Uma pessoa no seu setor, exercendo uma função. **Cada pessoa pertence a um único setor.** | `organizacoes.MembroSetor` |
| **Permissão** | O que o sistema permite fazer (ex.: `tarefas.distribuir`). A lista é fixa no código; quem recebe cada permissão é configurado pelas funções. Algumas valem na organização toda; outras, só no setor do vínculo. | `organizacoes.permissoes.Permissao` |

## Venda e execução

| Conceito | Definição | Onde está |
|---|---|---|
| **Catálogo** | Tipo de serviço que a empresa vende (ex.: PGR, LTCAT, AET). | `catalogo.Catalogo` |
| **Setor do catálogo** | **O setor responsável por executar aquele serviço.** É obrigatório. É ele que define em qual fila o serviço cai quando uma OS é vendida. | `Catalogo.setor` |
| **Catálogo inativo** | Catálogo aposentado: continua nos serviços já vendidos, mas não pode ser usado em serviços novos. | `Catalogo.ativo` |
| **Ordem de Serviço (OS)** | A venda: cliente, valor e condições de pagamento. Agrega os serviços vendidos. | `ordens_servico.OrdemServico` |
| **Serviço** | Um item vendido na OS, de um tipo do catálogo. | `ordens_servico.Servico` |
| **Setor do serviço** | Cópia do setor do catálogo no momento em que o serviço recebe o catálogo. Não pode ser editado diretamente. Se o catálogo mudar de setor depois, os serviços já vendidos continuam no setor original, preservando o histórico. | `Servico.setor` |
| **Tarefa** | Uma parte do trabalho de um serviço, atribuída a uma pessoa responsável. | `ordens_servico.Tarefa` |

## Execução nos setores

Ver o ADR 0006 para o contexto completo.

| Conceito | Definição |
|---|---|
| **Setor de execução** | Setor responsável por algum catálogo. É um conceito derivado, sem campo próprio. |
| **Fila do setor** | Os serviços do setor que chegaram e ainda não foram distribuídos (sem tarefas). |
| **Triagem / distribuição** | Escolher o responsável e o prazo de um serviço da fila. No caso comum é um passo só; "dividir entre técnicos" cria mais de uma tarefa. |
| **Organizador do setor** | Membro do setor cuja função tem `tarefas.distribuir` e `servicos.ver_setor`. "Gestor do setor" não é um campo: é derivado das permissões, e vale igual para qualquer setor novo. A diretoria age em todos os setores, mas não é organizadora deles (ADR 0008). |
| **Prazo** | Data limite, definida por quem distribui. É o único parâmetro de planejamento (ADR 0005). Não há prazo no catálogo nem estimativa automática. |
| **Faixa de prazo** | *(proposta, a confirmar)* Atrasado, vence hoje, vence nesta semana, depois, sem prazo. |
| **Replanejamento** | *(proposta, a confirmar)* Alteração de um prazo já definido. O histórico mostra o prazo original e quantas vezes mudou. |
| **Movimentação** | Criação do serviço, criação ou exclusão de tarefa, ou mudança de status, responsável ou prazo de uma tarefa. Fica em `Servico.ultima_movimentacao_em`. Corrigir texto não conta. |
| **Alerta sem movimentação** | Serviço aberto ou em andamento sem movimentação há 7 dias ou mais. O sistema **não** marca o serviço como parado: só avisa (ADR 0008). |
| **Ciência ("estou ciente")** | Resposta ao alerta: quem acompanha o serviço confirma que está tudo bem, com motivo opcional (cliente, documentação, agendamento, terceiro, outro). Silencia o alerta por mais 7 dias; deixa de valer quando o serviço se move. Substitui a antiga ideia de "aguardando" na tarefa. |
| **Carga** | Itens ativos de uma pessoa por faixa de prazo, mais a idade desses itens. Não usa horas. |
| **Linha do tempo** | O que aconteceu com uma OS ou um serviço, contado em eventos legíveis a partir da auditoria (ADR 0008). Vendas anteriores à auditoria começam com um aviso de que o histórico detalhado começa depois. |
| **Visão de trabalho** | *(proposta, a definir)* O que cada pessoa vê, montado pelas permissões dela. As visões serão definidas na frente de definição de telas. |

## Faturamento

Ver o ADR 0007.

| Conceito | Definição |
|---|---|
| **Cobrança por OS** | A OS é vendida como um pacote: preço e condições valem para o conjunto dos serviços. Não se fatura serviço por serviço. |
| **Condição de pagamento** | O que foi combinado na venda: forma, parcelas, vencimentos. É registrada pelo sistema, mas não controlada por ele. Tipos: à vista, parcelado (parcelas, primeiro vencimento, intervalo) e recorrente (meses, dia de fechamento e de vencimento). Campo `OrdemServico.tipo_condicao`. |
| **Recorrente** | Venda com mensalidade por um número de meses. Tem `valor_mensal` (obrigatório) e o número de meses em `quantidade_parcelas`; o `valor` continua sendo o total. Substitui o antigo recurso de contrato da OS. |
| **Faturar** | No vocabulário da empresa: dar o OK no sistema (o lançamento) e lançar no sistema financeiro externo. |
| **Liberação** | O aviso de que a OS pode ser lançada pelo financeiro. Acontece uma vez: na venda ou quando todos os serviços terminam. |
| **Lançamento ("check")** | O registro de que o financeiro lançou a OS no outro sistema (o que gera a NF e controla as parcelas), com a referência do lançamento (`referencia_lancamento`) e a origem (manual ou integração). *Nome provisório.* |
| **Outro sistema** | Sistema financeiro externo onde a cobrança é de fato feita: Asaas, Conta Azul ou SOC, a confirmar. |

## Decisões registradas

- **10/10/2026:** setor novo funciona sem mudar código; só membros do setor recebem tarefas dele; alerta de serviço sem movimentação com "estou ciente" no lugar de "parado"; linha do tempo por OS e por serviço; serviços enviados junto na criação da OS com um aviso por setor; resumo completo para o comercial; valor mensal no recorrente; controle total para o financeiro (ADR 0008).
- **10/10/2026:** cada usuário pertence a um único setor (um vínculo por pessoa).
- **10/10/2026:** cobrança por OS; o sistema registra as condições, avisa a liberação e guarda o check do lançamento, sem gerenciar parcelas; contrato substituído pelo recorrente (ADR 0007).
- **10/10/2026:** o único parâmetro de planejamento é o prazo; horas e complexidade saem do serviço e da tarefa (ADR 0005).
- **10/10/2026:** todos os catálogos existentes foram vinculados a Segurança do Trabalho, e os serviços já vendidos receberam o setor do seu catálogo. A classificação fina dos catálogos por setor fica para depois.
