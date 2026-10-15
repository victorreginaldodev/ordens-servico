# Mercado e validação: financeiro e fiscal para empresas de serviços

## Quais recursos aparecem em Omie, Conta Azul, Bling, ERP da Olist (antigo Tiny) e sistemas verticais de serviços?

### Takeaway
Os concorrentes generalistas já oferecem quase todo o “back office” esperado — contas a pagar/receber, fluxo de caixa, conciliação, cobranças e NFS-e — e vários já ligam OS, faturamento e recebíveis. O padrão mais forte não é uma coleção de telas, mas uma cadeia transacional sem redigitação: proposta/contrato ou OS → faturamento/NFS-e → cobrança → baixa/conciliação → relatórios e contador.

### Cited Findings
- O Omie posiciona seis módulos integrados: CRM, vendas/NF-e, finanças, estoque/produção, painel do contador e serviços/NFS; no financeiro inclui conta corrente, fluxo de caixa, relatório diário e conciliação automática. — [Omie](https://www.omie.com.br/solicite-proposta/)
- No Omie, o módulo de serviços admite de três a seis etapas comerciais em kanban, permite marcar OS como proposta/orçamento, mantém contratos mensais e relatórios de faturamento/previsão; proposta não gera previsão de contas a receber até virar operação faturável. — [Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/499118-checklist-do-modulo-servicos-e-nfs-e)
- O Omie fatura uma ou várias OS em lote, gerando NFS-e por webservice ou por arquivo TXT conforme a infraestrutura da prefeitura; isso evidencia que a heterogeneidade municipal ainda faz parte do produto em outubro de 2026. — [Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/498994-faturando-ordens-de-servico-individualmente-ou-em-lote)
- A conciliação do Omie integra automaticamente extratos de alguns bancos (Itaú, Bradesco, Santander e Caixa, segundo a página) e oferece importação OFX para os demais; o mesmo módulo traz múltiplas contas, fluxo de caixa e controles de acesso. — [Omie](https://www.omie.com.br/funcionalidades/conciliacao-bancaria/)
- O Omie trata uma nuance operacional importante: despesas reembolsáveis podem gerar recibo separado da NFS-e e contas a receber agrupadas ou separadas. — [Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/5885992-faturando-despesas-reembolsaveis-na-ordem-de-servico)
- A Conta Azul Pro cobre vendas/orçamentos, NFS-e, financeiro da venda, parcelas a receber, contratos, OS, boletos e relatórios financeiros; análises incluem pagamentos, recebimentos, inadimplência, categorias, centro de custo e situação por vendedor. — [Ajuda Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/45877860915981-Plano-Exclusivo-o-que-est%C3%A1-dispon%C3%ADvel-e-o-que-fica-bloqueado-no-plano-Conta-Azul-Pro-Concilia%C3%A7%C3%A3o-Cont%C3%A1bil)
- Para serviços recorrentes, a Conta Azul automatiza contrato → venda → cobrança por boleto/Pix/cartão → emissão e envio da NFS-e; exige cadastro fiscal de serviços e certificado A1 quando aplicável. — [Ajuda Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/46049472036621-Configura%C3%A7%C3%B5es-iniciais-como-configurar-contratos-e-cobran%C3%A7as-recorrentes-desde-o-in%C3%ADcio)
- A Conta Azul orienta prestadores que cobram por projeto ou hora a configurar empresa, cliente, serviço, certificado, NFS-e, venda e cobrança, evitando redigitação a cada negócio. — [Ajuda Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/46049097538445-Configura%C3%A7%C3%B5es-iniciais-como-configurar-o-sistema-para-cobrar-por-projeto-ou-hora-trabalhada)
- O Bling reúne propostas com versões/anexos, contratos recorrentes, OS, cadastro de técnicos/peças/serviços, controle financeiro e emissão de NFS-e/NF-e/NFC-e; a finalização da OS pode lançar estoque e contas. — [Bling](https://www.bling.com.br/servico)
- O Bling gera NFS-e a partir de uma OS e também agrupa várias OS do mesmo cliente em uma única nota, reduzindo trabalho no fechamento de período. — [Ajuda Bling](https://ajuda.bling.com.br/hc/pt-br/articles/360038736594-Gerar-uma-nota-de-servi%C3%A7o-a-partir-da-ordem-de-servi%C3%A7o)
- No ERP da Olist, uma OS ou uma nota de serviço pode lançar contas manual ou automaticamente; há envio em lote de notas pendentes e suporte a RPS/DPS e local de prestação conforme o provedor municipal. — [Ajuda Olist](https://ajuda.olist.com/pt_BR/notas-fiscais-de-servico-eletronicas/como-utilizar-as-nfs-e-no-erp)
- A Olist anuncia NFS-e/RPS, cadastro fiscal com cálculo de ISS e retenções, OS → NFS-e sem redigitação, cobranças e pagamentos vinculados à nota, enquanto o posicionamento geral do ERP continua muito orientado a marketplace, estoque, logística e múltiplos CNPJs. — [Olist NFS-e](https://olist.com/sistema-erp/emissao-nota-fiscal/emissor-nfs-e/); [ERP da Olist](https://olist.com/sistema-erp/)
- A Auvo é um exemplo vertical para assistência técnica/manutenção: combina OS digital, agenda/geolocalização/roteirização, evidências e pesquisa de satisfação com faturamento, Pix/boleto/cartão, contas a pagar/receber, contratos recorrentes e NFS-e. — [Auvo Financeiro](https://www.auvo.com/auvo-software-financeiro); [Auvo](https://www.auvo.com/)

### Inferences
- “Financeiro básico” no mercado significa, no mínimo: títulos a pagar/receber, parcelamento, baixas, categorias/plano de contas, centros de custo, fluxo de caixa realizado e previsto, inadimplência, múltiplas contas, cobrança (Pix/boleto/cartão), conciliação automática/OFX, DRE gerencial e exportação/acesso do contador.
- “Fiscal mínimo vendável” não é apenas um botão de emitir NFS-e: cadastro tributário do serviço, retenções, ISS/local da prestação, certificado/credenciais, RPS/DPS, lote, cancelamento/substituição, tratamento de rejeições, PDF/XML, envio ao cliente, notas tomadas e integração contábil aparecem como expectativas adjacentes.
- Contratos/recorrência, despesas reembolsáveis e faturamento agrupado são casos de uso menos visíveis que provavelmente separam um demo atraente de uma operação realmente utilizável.

### Gaps
- Não foi possível obter comparação pública, estável e homogênea de preços por módulo/usuário/volume; vários fornecedores personalizam oferta, mudam planos ou exibem valores dinamicamente.
- As páginas dos fornecedores demonstram disponibilidade, não qualidade, taxa de sucesso de emissão, facilidade de implantação nem satisfação real. Esses pontos precisam de entrevistas e testes próprios.

## Onde um produto integrado à execução pode ter vantagem e onde enfrenta forte comoditização?

### Takeaway
Há espaço quando o financeiro nasce dos fatos da execução — aceite, horas, materiais, deslocamento, reembolso, SLA, recorrência e faturamento parcial — e não exige reconstruir a prestação em outro ERP. Emissão isolada de NFS-e, contas a pagar/receber genéricas, fluxo de caixa e CRM-kanban são categorias muito concorridas; competir nelas por amplitude desde o início elevaria bastante o risco e o custo de manutenção.

### Cited Findings
- O principal resultado esperado de uma ferramenta digital “tudo em um” é aumentar vendas para 57% dos MEIs e 50% das MPEs; marketing e vendas são a prioridade de investimento digital para 40% dos MEIs e 35% das MPEs. — [Sebrae/FGV/Google, 2026](https://agenciasebrae.com.br/dados/pequenos-negocios-focam-em-vendas-com-ferramentas-digitais-e-contrastam-com-medias-e-grandes-empresas/)
- O uso de aplicativos integrativos, que gerem todas ou boa parte das atividades, chegou a 47% dos pequenos negócios em 2025, contra 27% em 2018; entre EPPs chegou a 78%. — [Sebrae, 2025](https://ce.agenciasebrae.com.br/inovacao-e-tecnologia/digitalizacao-recorde-pequenos-negocios-no-brasil-atingem-nivel-historico-em-2025/)
- O Sebrae descreve fluxo de caixa como necessário para diferenciar lucro de movimentação, prever capital de giro e cumprir compromissos, e recomenda controle de entradas, saídas, contas a pagar/receber e projeções. — [Sebrae](https://meuatendimento.sebrae.com.br/sites/PortalSebrae/mei/jornadamei/controle-seu-caixa-em-15-minutos-por-dia%2C216f3256199e6910VgnVCM1000001b00320aRCRD)
- A Receita Federal determinou que ME e EPP do Simples Nacional usem o Emissor Nacional de NFS-e a partir de 1º de novembro de 2026, por web ou API; as regras de CBS/IBS aplicáveis ao Simples passam a produzir efeitos em 1º de janeiro de 2027. — [Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026)
- Ainda em maio de 2026 havia municípios sem adesão ou parametrização concluída no padrão nacional, mostrando que a transição não elimina imediatamente contingências e diferenças operacionais. — [Portal Nacional da NFS-e](https://www.gov.br/nfse/pt-br/noticias/municipios-sem-adesao-ou-parametrizacao-da-nfs-e-ja-estao-sujeitos-a-bloqueio-de-transferencias)
- Concorrentes verticais já usam integração operacional-financeira como promessa central: a Auvo conecta OS, equipe externa, reembolsos, faturas, meios de pagamento, contas e notas fiscais. — [Auvo](https://www.auvo.com/auvo-software-financeiro)

### Inferences
- **Vantagem possível:** produzir automaticamente uma “pré-fatura explicável” a partir do que foi executado, com rastreabilidade até aceite, evidência, hora, material e responsável; permitir revisão humana e só então criar cobrança, título e NFS-e.
- **Vantagem possível:** visão de margem por OS/cliente/contrato que una receita faturada/recebida a custos efetivos da execução. ERPs generalistas têm centros de custo, mas um produto operacional possui dados mais granulares para apropriar custo e explicar desvios.
- **Vantagem possível:** exceções típicas de serviços — faturamento parcial ou por marco, várias OS em uma fatura, recorrência com visitas, reembolso, retenções, glosa, aceite pendente e refaturamento — tratadas no mesmo fluxo e com trilha de auditoria.
- **Vantagem possível:** implantação progressiva. Primeiro “contas a receber originadas da execução + exportação para contador/ERP”; depois cobrança e conciliação; fiscal embutido apenas quando o fluxo estiver validado.
- **Comoditização forte:** cadastro genérico de leads, pipeline simples, contas a pagar/receber, dashboard de caixa, boleto/Pix e emissão avulsa de NFS-e. Omie, Conta Azul, Bling, Olist e players de cobrança já cobrem essas funções.
- **Risco estrutural:** fiscal brasileiro traz responsabilidade contínua por regras, layouts, certificados, rejeições e transição tributária. A padronização nacional reduz integrações municipais no médio prazo, mas também torna o emissor básico mais fácil de replicar e, portanto, menos diferenciador.
- **Posicionamento recomendado para teste:** “da execução aceita ao dinheiro conciliado, sem redigitar e sabendo a margem de cada serviço”, não “mais um ERP completo”. A mensagem conecta receita (prioridade declarada das PMEs) e controle operacional.

### Gaps
- Não há evidência pública comparável sobre quanto tempo e dinheiro as PMEs perdem entre conclusão, faturamento e recebimento, nem qual parcela aceitaria trocar seu ERP. Medir esse atraso é prioridade no discovery.
- A futura experiência e estabilidade da API nacional após novembro de 2026 ainda não podem ser inferidas de documentação; integração fiscal exige prova técnica e monitoramento regulatório.

## Que segmentos iniciais parecem mais promissores e por quê?

### Takeaway
Como hipótese de entrada, priorizar prestadores B2B com equipe técnica, várias OS por mês, materiais/deslocamentos/reembolsos e faturamento posterior ao aceite. Eles sentem a fricção entre campo, administrativo, financeiro e fiscal e têm mais dados operacionais que podem gerar valor exclusivo. Evitar inicialmente autônomos de uma nota mensal e empresas cuja dor dominante seja estoque/e-commerce.

### Cited Findings
- A Auvo declara atender empresas de manutenção e assistência técnica e recomenda sua solução a operações com dois ou mais colaboradores externos; os casos de uso incluem agenda, localização, roteiro, evidências e relatório da visita. — [Auvo](https://www.auvo.com/); [Auvo Enterprise](https://www.auvo.com/enterprise)
- A Conta Azul explicita dois modelos de serviços: recorrência/manutenção, com contrato e cobrança/nota automáticas, e cobrança por projeto ou hora, citando consultoria, engenharia, arquitetura, advocacia e TI. — [Conta Azul — contratos](https://ajuda.contaazul.com/hc/pt-br/articles/46049472036621-Configura%C3%A7%C3%B5es-iniciais-como-configurar-contratos-e-cobran%C3%A7as-recorrentes-desde-o-in%C3%ADcio); [Conta Azul — projeto/hora](https://ajuda.contaazul.com/hc/pt-br/articles/46049097538445-Configura%C3%A7%C3%B5es-iniciais-como-configurar-o-sistema-para-cobrar-por-projeto-ou-hora-trabalhada)
- O Bling dá destaque a empresas que misturam serviços e venda de peças/produtos e permite que a conclusão da OS movimente contas e estoque. — [Bling](https://www.bling.com.br/servico)
- A operação digital de pequenos negócios costuma estar concentrada em uma única pessoa: 76,2% nos MEIs, 42,2% nas MEs e 28,9% nas EPPs, segundo pesquisa focada em pequenos negócios que vendem online. — [Sebrae/E-Commerce Brasil, 2026](https://agenciasebrae.com.br/dados/operacao-digital-esta-concentrada-em-apenas-uma-pessoa-nos-pequenos-negocios-aponta-pesquisa-inedita/)

### Inferences
- **Prioridade 1 — manutenção/instalação B2B:** segurança eletrônica, climatização/refrigeração, energia/solar, equipamentos, facilities e assistência técnica empresarial. Hipótese: alto volume de OS, aceite/evidência, peças, deslocamento, contratos preventivos e corretivos, faturamento agrupado e múltiplos responsáveis criam dor frequente e integração valiosa.
- **Prioridade 2 — serviços técnicos por projeto e medição:** engenharia, inspeção, laudos e serviços industriais. Hipótese: marcos, medições, despesas reembolsáveis, retenções e aprovação do cliente tornam o caminho execução → faturamento mais complexo e com maior disposição a pagar.
- **Prioridade 3 — serviços recorrentes com visitas:** manutenção contratual e facilities. Hipótese: competência, calendário de visitas, reajustes, recorrência, inadimplência e emissão mensal permitem automação mensurável.
- **Segmentos secundários:** consultorias/TI/agências têm projeto/hora e NFS-e, mas frequentemente não precisam de uma OS operacional rica; podem ser bons para contratos e faturamento, porém oferecem menor vantagem derivada da execução.
- **Evitar no começo:** autônomos/MEIs com poucos clientes e uma emissão mensal, pois o Emissor Nacional gratuito atende a obrigação básica; varejo/e-commerce, porque Olist/Bling têm vantagem madura em estoque/canais/logística; saúde, jurídico e construção pesada, pois exigem domínios e compliance verticais adicionais.
- Critério de ICP inicial sugerido: 5–50 pessoas, 2–20 técnicos/colaboradores executores, pelo menos 30 OS/mês, faturamento B2B após execução/aceite, duas ou mais pessoas participando do ciclo, e uso atual de planilha/WhatsApp + ERP/portal fiscal separados.

### Gaps
- Os segmentos acima são hipóteses qualitativas, não ranking de mercado nem TAM. Faltam dados primários sobre frequência da dor, ticket, ferramentas atuais, poder de compra e ciclo de venda em cada vertical.
- Não foi encontrada fonte oficial que desagregue adoção de ERP financeiro por subsegmento brasileiro de serviços técnicos; não usar números genéricos de MPE como estimativa de demanda pagante.

## Quais entrevistas, perguntas, testes de protótipo e critérios go/no-go validariam o problema?

### Takeaway
O discovery deve validar o fluxo real e a gravidade econômica antes de validar telas. Entrevistar separadamente dono/gestor, administrativo-financeiro, executor e contador; reconstruir as últimas transações reais; medir atraso, retrabalho, erros e inadimplência; depois testar um concierge e protótipos dos momentos críticos.

### Cited Findings
- Pequenos negócios dizem priorizar faturamento ao adotar tecnologia, portanto o teste deve medir impacto em velocidade de faturar/receber, e não apenas interesse em organização. — [Sebrae/FGV/Google](https://agenciasebrae.com.br/dados/pequenos-negocios-focam-em-vendas-com-ferramentas-digitais-e-contrastam-com-medias-e-grandes-empresas/)
- O mercado já automatiza contrato → cobrança → NFS-e e OS → NFS-e, logo um teste de conceito que apenas mostre essa sequência provavelmente mede paridade, não diferenciação. — [Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/46049472036621-Configura%C3%A7%C3%B5es-iniciais-como-configurar-contratos-e-cobran%C3%A7as-recorrentes-desde-o-in%C3%ADcio); [Bling](https://ajuda.bling.com.br/hc/pt-br/articles/360038736594-Gerar-uma-nota-de-servi%C3%A7o-a-partir-da-ordem-de-servi%C3%A7o)
- A mudança obrigatória para o Emissor Nacional em novembro de 2026 cria uma janela concreta para observar migração, adaptação e dúvidas de ME/EPP, mas a emissão também continuará disponível gratuitamente via web. — [Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026)

### Inferences
- **Amostra exploratória (4–6 semanas):** 24–30 empresas, distribuídas entre três verticais candidatas e três níveis de maturidade (planilha/WhatsApp; software vertical + ERP; ERP integrado). Em cada empresa, falar com o dono e quem realiza o fechamento; incluir 6–8 contadores/BPOs que atendam esses segmentos. Evitar entrevistar apenas conhecidos entusiastas de software.
- **Recrutamento por comportamento:** exigir OS recentes, faturamento B2B e emissão de NFS-e; pedir que tragam uma OS concluída, a nota correspondente, a cobrança, o extrato/baixa e a planilha usada. Não revelar a solução antes da reconstrução.
- **Perguntas de entrevista baseadas no último caso real:**
  - “Mostre a última OS que terminou e conte tudo que aconteceu até o dinheiro aparecer como recebido.”
  - “Quem digitou quais dados, em quais sistemas? Onde precisou copiar ou conferir?”
  - “Quanto tempo passou entre execução, aceite, emissão, envio, vencimento e baixa?”
  - “Na última divergência, rejeição, glosa ou atraso, o que aconteceu e quanto custou?”
  - “Como vocês juntam várias OS, medem etapas, cobram recorrência, peças, deslocamento e reembolso?”
  - “Como sabem o que já pode ser faturado, o que falta aprovar e a margem por OS/contrato?”
  - “Quem configura código do serviço, ISS, retenções e local da prestação? O que o contador faz?”
  - “Como conciliam Pix, boleto, cartão e transferências? Que casos não conciliam sozinhos?”
  - “Qual ferramenta é a fonte de verdade? O que impediria substituí-la?”
  - “Que erro você paga para evitar? Quanto pagou no último mês e qual seria o custo de trocar?”
- **Métricas colhidas por empresa:** OS/mês; notas/mês; contratos recorrentes; usuários do fluxo; sistemas tocados; minutos administrativos por OS/fatura; dias entre conclusão e emissão; dias de contas a receber; percentual de notas rejeitadas/corrigidas; divergências na conciliação; perdas/glosas; custo mensal das ferramentas; horas do contador/BPO; e receita que fica “pronta para faturar” sem faturar.
- **Teste 1 — concierge sem fiscal próprio:** receber exportação/OS e devolver pré-faturas agrupadas, contas a receber e arquivo/integração para o sistema atual. Sucesso valida a dor de fechamento sem assumir risco fiscal.
- **Teste 2 — protótipo clicável com dados reais anonimizados:** quatro tarefas: revisar pré-fatura gerada da execução; resolver exceção (reembolso/retenção/faturamento parcial); emitir/cancelar NFS-e; conciliar recebimento dividido/com taxa. Medir conclusão sem ajuda, erros, confiança e informação faltante.
- **Teste 3 — fake door em clientes atuais:** botões separados “Preparar faturamento”, “Emitir NFS-e” e “Conciliar recebimentos”, com explicação e lista de espera. Comparar intenção por evento e perfil, sem prometer disponibilidade imediata.
- **Teste 4 — piloto pago e assistido (6–10 empresas, dois fechamentos):** integrar primeiro com emissor/ERP existente ou usar o Emissor Nacional sob revisão humana. Cobrar mesmo que pouco; registrar tempo economizado, dias antecipados e exceções. Não usar elogio ou cadastro gratuito como evidência de disposição a pagar.
- **Go para MVP financeiro integrado:** pelo menos 60% das empresas do ICP apresentam a dor mensal; mediana de pelo menos 2 horas/semana de retrabalho ou 2 dias entre conclusão e emissão; 5 de 8 pilotos usam em dois ciclos seguidos; ao menos 4 aceitam pagar preço-alvo; e o fluxo automático acerta pelo menos 90% das pré-faturas, deixando exceções claras para revisão.
- **Go para NFS-e embutida:** pelo menos 70% dos pilotos pedem emissão dentro do produto (não apenas exportação), volume e economia justificam manutenção fiscal; 95%+ das emissões de teste passam sem intervenção após configuração; cancelamento/rejeição/contingência têm caminho operacional; contador valida dados; e há parceiro/API ou capacidade interna com SLA e monitoramento.
- **No-go/pivô:** usuários querem apenas dashboard/contas básicas; menos de 30% têm dor recorrente; valor percebido fica abaixo do custo de suporte; dados de execução não bastam para formar a fatura; maioria prefere manter ERP e aceita somente integração; ou regras por cliente/município tornam mais de 20% dos casos manuais. Nesse caso, posicionar como camada de faturamento/margem integrada ao ERP, não substituto.
- **Decisão de sequência sugerida:** (1) visibilidade de “executado e ainda não faturado”; (2) pré-fatura/contas a receber e margem por OS; (3) exportações e integrações contábeis; (4) cobrança e conciliação; (5) NFS-e via parceiro/API; (6) contas a pagar/DRE mais amplo somente se os pilotos demonstrarem desejo real de substituir o ERP.

### Gaps
- Os limiares go/no-go são propostas de decisão, não benchmarks publicados; devem ser ajustados ao preço-alvo, custo de suporte fiscal e base atual de clientes.
- Falta definir o preço-alvo e a estratégia de integração/parceria fiscal; sem isso não se valida disposição a pagar nem margem do produto.
