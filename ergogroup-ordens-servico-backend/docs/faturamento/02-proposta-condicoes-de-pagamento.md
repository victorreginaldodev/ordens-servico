# Faturamento — condições de pagamento e lançamento no sistema financeiro

> **Status (10/10/2026):** a lista da seção 4b foi aprovada e implementada na camada de dados (ver ADR 0007). Os levantamentos da seção 6 continuam em aberto.
>
> **Base:** o modelo atual (organização, setores, funções, permissões configuráveis, fluxo de execução), o código atual, os dados atuais do banco de dev (`01-condicoes-de-pagamento-as-is.md`) e a discussão de 10/10/2026.

## 1. O papel do sistema (decidido)

O que o usuário esclareceu em 10/10/2026:

- **A cobrança é por OS, não por serviço.** A OS é vendida como um pacote: o preço final e as condições comerciais valem para o conjunto dos serviços contratados. Cobrar serviço por serviço mudaria uma regra de negócio da empresa, e isso não será feito.
- **O financeiro não cobra pelo nosso sistema.** Ele vê o que está liberado e lança essas informações em **outro sistema**, que gera a nota fiscal e faz o controle financeiro (inclusive das parcelas).
- **O nosso sistema não gerencia parcelas.** O papel dele é:
  1. **registrar** com clareza as condições de pagamento combinadas na venda;
  2. **avisar** o financeiro quando a OS pode ser lançada (a liberação);
  3. **guardar o "check"** do financeiro de que a OS foi lançada no outro sistema.
- **Lançamento único:** a percepção atual é que o financeiro lança cada OS de uma vez no outro sistema, e esse sistema cuida das parcelas e mensalidades. Ainda precisa ser confirmado (seção 6).

## 2. Registro das condições na venda (proposta)

Hoje as condições reais estão no texto da observação, e o formulário tem limite de 12 parcelas e não tem a data acordada. A proposta é registrá-las em campos:

| Campo | Para quê | Situação hoje |
|---|---|---|
| Tipo de condição | à vista, parcelado ou contrato mensal (recorrente) | não existe |
| Valor total | — | já existe |
| Forma de pagamento | boleto, PIX etc. | já existe |
| Número de parcelas | para o parcelado, **sem limite de 12** | existe, limitado a 12 no formulário |
| Data do primeiro vencimento | quando o cliente paga a primeira vez | existe no banco, **não aparece no formulário** |
| Intervalo | mensal, ou a cada N dias ("30 e 60 dias") | não existe |
| Valor mensal e número de meses | para o contrato mensal (ex.: 24 meses) | não existe; hoje fica no texto |
| Dia de fechamento e dia de vencimento | para o contrato mensal (ex.: fecha dia 25, vence dia 15) | não existe; hoje fica no texto |
| Quando liberar para o financeiro | na venda, ou quando todos os serviços terminarem | existe como "cobrança imediata" (sim/não) |
| Observação | o que for realmente livre | já existe |

Como os padrões encontrados ficariam registrados:
- "Parcelado em 6x, 1ª parcela dia 10/08" → parcelado, 6 parcelas, primeiro vencimento 10/08, mensal.
- "Contrato de gestão em 24 meses, fecha dia 25, vence dia 15" → contrato mensal, 24 meses, valor mensal, fechamento 25, vencimento 15.
- "2x — 30 e 60 dias" → parcelado, 2 parcelas, a cada 30 dias.
- "NF após a entrega do relatório, vencimento em 21 dias" → liberar quando os serviços terminarem; vencimento 21 dias após a liberação. A entrega ao cliente ainda não existe no sistema.
- Preço por vida → **em aberto** (seção 6).

## 3. Liberação (decidido: continua como hoje)

- A OS é liberada para o financeiro **uma vez**: na venda ou quando todos os serviços terminarem.
- A diferença proposta é só deixar essa escolha explícita no formulário, em vez de um "cobrança imediata sim/não".

## 4. O "check" do financeiro (proposta)

- **A tela do financeiro** lista:
  - o que está liberado e ainda não foi lançado;
  - o que já foi lançado;
  - o que ainda não foi liberado.

  Mostra a condição já organizada (seção 2), sem precisar ler a observação.
- **A ação "marcar como lançado"** guarda:
  - a referência no outro sistema (número da NF ou código do lançamento);
  - a data;
  - quem marcou.

  Substitui o "cobrança realizada" de hoje e continua exigindo a permissão `financeiro.registrar_cobranca`.
- **O nome é provisório.** Não se sabe como o financeiro chama esse passo. Pode virar "lançado", "faturado" ou outro termo quando for levantado.
- **Indicador "a cobrar":** passa a significar "liberado e ainda não lançado".

## 4b. Mudanças no modelo da OS (implementadas em 10/10/2026)

**Campos novos**
| Campo | Tipo | Uso |
|---|---|---|
| `tipo_condicao` | escolha | `a_vista`, `parcelado`, `recorrente` |
| `intervalo_parcelas_dias` | inteiro, opcional | parcelado: 30 = mensal (padrão) |
| `dia_fechamento` | inteiro 1–31, opcional | recorrente: ex. 25 |
| `dia_vencimento` | inteiro 1–31, opcional | recorrente: ex. 15 |
| `origem_lancamento` | escolha, opcional | `manual` ou `integracao` |

**Campos que mudam**
| Hoje | Passa a ser |
|---|---|
| `cobranca_imediata` (sim/não) | `liberar_em`: `venda` ou `conclusao` (a migração converte) |
| `numero_nf` (inteiro) | `referencia_lancamento` (texto; a migração copia os números) |
| `data_acordada_cobranca` | mesmo campo, usado como "primeiro vencimento" e incluído no formulário |
| `quantidade_parcelas` | mesmo campo; no recorrente vale como número de meses; sem o limite de 12 no formulário |

**Contrato substituído pelo recorrente** (decidido em 10/10/2026: o contrato não está de fato em uso):
- Saem a flag `contrato` e os campos de objeto, vigência e gestor do contrato. Saem também a validação de contrato e o e-mail de "novo contrato".
- Os valores antigos de auditoria continuam legíveis.
- **Sem perder dados:** a única OS com contrato no dev (a 669) tem objeto e dados do gestor preenchidos. A migração copia essas informações para a observação da OS antes de remover os campos. Em produção, conferir a quantidade antes de rodar.

**Junto com os campos**
- Validações por tipo:
  - parcelado exige pelo menos 2 parcelas e o primeiro vencimento;
  - recorrente exige o número de meses e o dia de vencimento;
  - dias de fechamento e de vencimento ficam entre 1 e 31.
- A liberação passa a usar `liberar_em`.
- O endpoint de cobrança grava `referencia_lancamento` e a origem `manual`.
- Os campos de condição ficam escondidos para quem não tem `financeiro.ver_valores`.
- A auditoria e os modelos de e-mail acompanham os nomes novos.

**Dados existentes (padrão conservador):**
- `tipo_condicao` vira `a_vista` quando há até 1 parcela e `parcelado` quando há mais.
- Contratos registrados como "12 parcelas" ficam como parcelado até o financeiro reclassificar; o sistema não interpreta a observação.
- As inconsistências herdadas (13 cobradas sem liberação, 23 com valor zero) não são alteradas pela migração.

**Frontend (depois):**
- formulário com os campos conforme o tipo, sem o limite de 12 e com o primeiro vencimento;
- tela do financeiro com "referência" no lugar de "NF";
- detalhe comercial e PDF da OS;
- retirada do bloco de contrato.

## 5. Preparado para integração, sem implementá-la agora (proposta)

O pedido: se não der muito trabalho, já modelar pensando em lançar automaticamente no sistema deles por API.

Os três sistemas possíveis trabalham com os mesmos tipos de condição:

| Nosso registro | Asaas | Conta Azul | SOC |
|---|---|---|---|
| À vista | cobrança avulsa | venda | a levantar |
| Parcelado (parcelas, 1º vencimento, intervalo) | cobrança parcelada | venda com parcelas | a levantar |
| Contrato mensal (valor, meses, vencimento) | assinatura com ciclo mensal | contrato | a levantar |
| Cliente (CNPJ/CPF) | cliente | pessoa | a levantar |

Para ficar preparado, o custo é baixo:
- **Condições em campos** (seção 2): já é o formato que essas APIs recebem.
- **O registro do lançamento** (seção 4) com dois dados a mais: a **origem** (manual ou automática) e o **identificador no outro sistema**. Assim o check manual de hoje e um lançamento automático no futuro usam o mesmo lugar.

Fica para depois, quando o sistema for confirmado: a integração em si (credenciais, envio, tratamento de erro), o cadastro do cliente no outro sistema e a homologação. A API do SOC não é pública: a documentação teria que ser pedida ao fornecedor (AGE Technology).

## 6. Levantamentos em aberto (registrados, não fechados)

1. **Qual é o outro sistema:** Asaas, Conta Azul ou SOC. O número que hoje vai no campo "NF" vem dele?
2. **Lançamento único:** confirmar se cada OS, inclusive um contrato de 24 meses, é lançada uma vez só, com o outro sistema gerando as mensalidades.
3. **Preço por vida:** alguns tipos de serviço são cobrados por vida (valor por vida × número de vidas). Não se sabe:
   - se o valor por vida deveria ser um atributo do tipo de serviço;
   - quem informa o número de vidas;
   - se ele muda mês a mês;
   - se isso é controlado no nosso sistema ou no outro.

   Levantado durante o desenvolvimento, sem conclusão, como o "aguardando" da execução.
4. **Nome do passo "lançado":** como o financeiro chama.
5. **Entrega do relatório como momento de liberar:** depende da entrega ao cliente existir no sistema (backlog do ADR 0006).

## Fontes
- [Asaas — SDK com cobranças avulsa, parcelada e assinatura](https://packagist.org/packages/cobranca/asaas)
- [Asaas — SDK com ciclos de assinatura](https://packagist.org/packages/diogodg/asaas-sdk)
- [Conta Azul — servidor MCP sobre a API v2 (vendas, contratos, parcelas, OAuth)](https://mcpservers.org/pt-BR/servers/douglac/contaazul-mcp)
- [Senior — integração com prestadores SST (cita o SOC)](https://documentacao.senior.com.br/en/seniorxplatform/manual-do-usuario/hcm/integrador-sst/integracao-prestadores-sst.htm)
- [Workana — vaga citando a API do SOC](https://www.workana.com/pt/job/desenvolvimento-de-sistema-de-agendamento-online-integrado-ao-soc)
