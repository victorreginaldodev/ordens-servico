# Plano — melhorias da nova venda (backend e frontend)

> **Status (14/10/2026):** etapa 0 concluída (regras das demais parcelas decididas; análise da observação na seção 9 do `faturamento/03`). Etapa 1 concluída (backend do dia das demais parcelas: migração `0044`, 290 testes passando). A etapa 1B (orientações para os setores) foi **rejeitada e revertida**: só existem a descrição de cada serviço e a observação financeira da OS. Etapa 2 concluída (o dia das demais parcelas no formulário, no resumo da venda e na situação financeira; o PDF usa o resumo do backend). Etapa 3 concluída (`features/vendas/components/CampoData.tsx`, na data da venda e na data do vencimento/1ª parcela, com os atalhos "Em 30 dias" e "Em 60 dias" e o X para apagar). Etapa 4 concluída (bloco "Vencimento das parcelas": uma linha por pergunta, seletor compacto, ajuda única por linha e parcelas numeradas; no celular, rótulo em cima e seletor na largura toda). Etapa 5 concluída e revista a pedido do usuário: serviços um por vez num modal que continua aberto (`ServicosDaVendaModal`), serviços da OS em cards, lista do catálogo única com o setor na frente e em caixa alta. A etapa 6 (verificação com login e documentação final) aguarda;
> Base: o pedido do usuário de 14/10/2026, a seção 8.3 de `backend/docs/faturamento/03-revisao-a-vista-e-parcelado.md` (dia das demais parcelas) e a tela atual (`features/vendas/pages/NovaVendaPage.tsx`).

## Pedidos

1. **Dia das demais parcelas** no backend e no frontend (`dia_vencimento_demais`, seção 8.3 do `faturamento/03`).
2. **Adicionar serviços um por vez**: escolher o serviço, descrever e "Adicionar à OS". Hoje é um modal em duas etapas, com vários de uma vez; o usuário achou estranho.
3. **Componente de data** elegante, com ícone, usado **só no formulário da OS** por enquanto.
4. **Reorganizar o bloco de vencimento das parcelas**, que está confuso e desalinhado.
5. **Confirmar se a observação da OS é toda de faturamento.**

## Ordem e dependências

```
Etapa 0  Confirmações e análise ── (sem código)
Etapa 1  Backend: dia das demais parcelas ──┐
Etapa 2  Frontend: tipos e regras da condição ◄┘
Etapa 3  Componente de data ──────────────────┐ (independente)
Etapa 4  Bloco de vencimento reorganizado ◄───┴── usa as etapas 2 e 3
Etapa 5  Serviços um por vez ──────────────── (independente)
Etapa 6  Verificação e documentação
```

As etapas 3 e 5 não dependem do backend e podem ir antes, se for preciso.

---

## Etapa 0 — Confirmações e análise (sem código)

**0.1 Regras do dia das demais parcelas** (`faturamento/03`, seção 8.3), para o usuário confirmar:
- a 2ª parcela vence no dia X do **mês seguinte ao da 1ª**;
- dia 29, 30 ou 31 em mês mais curto vence no **último dia do mês**.

**0.2 A observação da OS é toda de faturamento?** A leitura de 13/10 foi uma amostra de 30. Agora seria a base inteira (561 observações no dev):
1. Classificar cada observação por palavras-chave em: **faturamento** (parcela, boleto, vencimento, R$, nota, PIX, pago, pedido de compra…), **técnica** (local, funções, GHE, medição, escopo…), **administrativa** ("lançada com data retroativa"), **mista** e **resumo do que foi vendido** ("PGR e PCMSO").
2. Ler à mão uma amostra de cada grupo para conferir a classificação.
3. Comparar as técnicas com a descrição dos serviços da mesma venda, para ver se a informação já está lá.
4. **Resultado:** um quadro com quantas de cada tipo e exemplos, registrado no `faturamento/03`. Se houver uma parte técnica relevante que não está nos serviços, propor o que fazer. Por exemplo: um campo de orientação para os setores, ou copiar o texto para a descrição dos serviços. A decisão fica com o usuário.

---

## Etapa 1 — Backend: dia das demais parcelas

Depende da 0.1.

| # | O quê | Onde |
|---|---|---|
| 1.1 | Campo `dia_vencimento_demais` (inteiro pequeno, 1 a 31, opcional) | `models/ordem_servico.py` |
| 1.2 | Migração `0044` (só a coluna; as vendas atuais ficam vazias, ou seja, a regra de hoje). Conferir `showmigrations` antes | `migrations/` |
| 1.3 | Validação: de 1 a 31; vazio no à vista | `validar_condicao_pagamento` |
| 1.4 | Resumo: "…, 1ª parcela 21 dias após a nota, demais todo dia 10" | `condicao_resumo` |
| 1.5 | Oculto para quem não vê valores; aceito na criação e na edição | `CAMPOS_FINANCEIROS`, `CAMPOS_DA_CONDICAO`, serializers |
| 1.6 | Nos blocos do resumo da venda (`condicoes`) e da linha de cobrança | `services/comercial.py`, `services/financeiro.py` e serializers |
| 1.7 | Linha do tempo: mudança no campo conta como mudança de condição | `services/linha_do_tempo.py` |
| 1.8 | Testes: validação, resumo, ocultação, edição | `tests_faturamento.py`, `tests_comercial.py` |
| 1.9 | Contrato da API: `manage.py spectacular` → `frontend/docs/api/api-schema.yaml` e `npm run api:tipos` | |
| 1.10 | `python manage.py test` inteiro passando | |

---

## Etapa 2 — Frontend: tipos e regras da condição

Depende da etapa 1.

- `condicao.ts`:
  - `datasDasParcelas(primeira, quantidade, diaDemais?)` com as regras da 0.1;
  - a prévia do resumo com "demais todo dia X";
  - a validação de 1 a 31.
- O formulário guarda e envia o campo; na edição, ele vem preenchido.
- O resumo da venda, a situação financeira e o PDF mostram "Demais parcelas: todo dia 10" quando houver.

---

## Etapa 3 — Componente de data

Independente.

- **`CampoData`** em `features/vendas/components/` (por enquanto **só no formulário da OS**, a pedido):
  - um botão do tamanho dos outros campos, com ícone `CalendarDays`, a data por extenso curto ("13/10/2026") ou um texto de exemplo, e um X para limpar quando for opcional;
  - abre um popover com o `Calendar` do kit (`react-day-picker`, em português);
  - atalhos opcionais ("Hoje", "Em 30 dias");
  - guarda a data em `AAAA-MM-DD`, o mesmo formato de hoje;
  - acessibilidade: abre com Enter ou espaço, fecha com Esc, foco volta ao botão; o rótulo diz a data escolhida.
- **Onde entra:** data da venda e data da 1ª parcela.
- **Fica para depois:** levar o componente para o kit e usar nos outros formulários, se o usuário aprovar.

---

## Etapa 4 — Bloco de vencimento reorganizado

Depende das etapas 2 e 3.

**Problemas de hoje:**
- dois cartões grandes para escolher o modo;
- o campo e o texto de ajuda numa grade que desalinha;
- a lista de parcelas solta embaixo.

**Proposta de layout**, uma linha por pergunta, rótulos alinhados à esquerda e os controles na mesma coluna:

```
1ª parcela vence      [ Numa data | Dias após a nota ]   [📅 10/11/2026 ]
                      O dia exato em que o cliente paga a 1ª parcela.

Demais parcelas       [ No mesmo dia | Todo dia __ ]      (só no parcelado)
                      As outras vencem todo dia 10 de cada mês.

┌ Parcelas ──────────────────────────────────────────────────────────┐
│ 1ª 10/11/2026 · 2ª 10/12/2026 · 3ª 10/01/2027 … 6ª 10/04/2027      │
│ Só para conferir: quem controla as parcelas é o sistema financeiro.│
└────────────────────────────────────────────────────────────────────┘
```

- O modo vira um **controle segmentado compacto**, no lugar dos dois cartões grandes.
- O campo fica **na mesma linha** do modo: o `CampoData` ou "\_\_ dias após a nota".
- **Uma** frase de ajuda por linha, logo abaixo, que muda com a escolha.
- No à vista, a linha diz "Vence" e não há "Demais parcelas" nem lista.
- A lista de parcelas numera cada uma ("1ª, 2ª…"). Quando a 1ª é "dias após a nota", ela mostra "1ª: 21 dias após a nota · demais: todo dia 10".
- No celular, rótulo em cima e controles embaixo, sem rolagem lateral.

---

## Etapa 5 — Serviços um por vez

Independente.

**Fluxo proposto**, sem modal:
- No fim da seção "Serviços vendidos" fica um formulário fixo **"Adicionar serviço"**:
  - **Serviço**: busca no catálogo ativo, agrupado por setor, com o setor que executa à direita;
  - **O que será feito**: obrigatório, com exemplo e o aviso de não colocar valores;
  - **Prioridade**: padrão a da venda;
  - botão **"Adicionar à OS"**.
- Ao adicionar, o serviço entra na tabela acima, o formulário limpa e o foco volta para "Serviço", pronto para o próximo.
- **Editar** (menu ⋯ da linha): a linha vira o mesmo formulário, preenchido, com "Salvar" e "Cancelar". Uma linha em edição por vez.
- **Remover**: como hoje.
- Antes do primeiro serviço, a tabela não aparece: só o formulário, com a frase "Adicione os serviços vendidos, um por vez".
- Escolher um serviço que já está na venda é permitido (ex.: dois PGR em unidades diferentes), mas a tela avisa "já está na venda".
- O `AdicionarServicosModal.tsx` deixa de ser usado e é removido.

---

## Etapa 6 — Verificação e documentação

- **Backend:** `python manage.py test` inteiro.
- **Frontend:** `tsc` e `eslint` sem erros.
- **No navegador** (precisa do login do usuário no painel):
  - registrar uma venda à vista e uma parcelada com "demais todo dia X";
  - editar uma venda;
  - testar tema escuro e celular.
- **Documentos:**
  - `faturamento/03`: a seção 8.3 passa de proposta para implementada, e entra o resultado da 0.2;
  - `fluxos-e-navegacao.md` §6.5: o novo fluxo de serviços e o bloco de vencimento;
  - `contrato-por-dominio.md`: o campo novo;
  - o wireframe `lote4-nova-venda.html` acompanha, se o usuário quiser validar antes.
