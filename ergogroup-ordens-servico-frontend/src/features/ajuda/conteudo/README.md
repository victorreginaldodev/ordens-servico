# Conteúdo da Ajuda

Cada página da Ajuda (`/ajuda/<modulo>/<pagina>`) é um arquivo `<modulo>/<pagina>.md` nesta pasta. A ordem do índice
e os módulos ficam em `../modulos.ts`: um arquivo novo só aparece depois de entrar lá.

A fonte técnica é a documentação funcional do backend (`ergogroup-ordens-servico-backend/docs/modulos/`). Quando uma
regra mudar, atualize o módulo do backend **e** a página daqui.

## Como escrever

- Para quem **usa** o sistema, não para quem o desenvolve: nada de código de permissão, endpoint, nome de arquivo,
  status HTTP ou ADR.
- Frases curtas, na segunda pessoa ("você"). Uma página por função ou tela.
- Os nomes de botões, abas e campos são **exatamente** os da tela.
- Só o comportamento de hoje. Pontos em aberto não entram.

## Cabeçalho

```
---
titulo: Registrar uma venda
resumo: Uma ou duas frases que dizem o que é. Aparece abaixo do título e na busca.
permissoes: os.gerenciar, os.ver_todas
tela: Nova venda
url: /vendas/nova
rotas: /vendas/nova
ver: condicao, financeiro/cobrancas
atualizado: 15/10/2026
---
```

| Campo | Para quê |
|---|---|
| `titulo` | Título da página e do índice. |
| `resumo` | A frase de abertura. |
| `permissoes` | Opcional. Códigos de permissão (basta uma). Quem não tem nenhuma não vê a página; o "Precisa de" mostra o nome delas na tela de Funções. |
| `tela` e `url` | Opcional. "Abrir a tela: …". Sem `url` (telas com id, como o Resumo da venda), aparece "Onde fica: …". |
| `rotas` | Opcional. Telas do sistema cujo "?" do cabeçalho abre esta página (padrões do React Router, ex.: `/vendas/:id`). Cada rota em uma página só. |
| `ver` | Opcional. "Ver também": `pagina` do mesmo módulo ou `modulo/pagina`. |
| `atualizado` | Data da última revisão do texto. |

## Marcação

| Escreva | Aparece como |
|---|---|
| `## Título` | Seção, com âncora e entrada no "Nesta página". |
| `1. passo` | Passos numerados. |
| `` `Registrar venda` `` | Nome de botão, aba ou campo da tela. |
| `> [!DICA] Título` + linhas com `>` | Caixa azul de dica. |
| `> [!ATENCAO] Título` + linhas com `>` | Caixa amarela de atenção. |
| ` ```fluxo ` com uma etapa por linha | Etapas ligadas por setas. |
| ` ```exemplo ` com um exemplo por linha | Exemplos em caixas. |
| `[texto](pagina)` ou `[texto](modulo/pagina#secao)` | Link para outra página da Ajuda. |
| `[texto](/vendas/nova)` | Link para uma tela do sistema. |
| Tabelas | Tabelas simples (Markdown com `\|`). |
