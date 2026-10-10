# Proposta, wireframe e verificação

## Entrega para aprovação

Apresente, de forma compacta:

1. fatos encontrados e respectivas fontes;
2. objetivo, usuário principal e tarefa;
3. fluxo resumido e ponto de entrada/saída;
4. mapa de conteúdo e hierarquia das ações;
5. wireframe visual, preferencialmente protótipo navegável simples quando os recursos disponíveis justificarem;
6. estados de carregamento, vazio, erro, sucesso, validação, conflito e acesso restrito que forem pertinentes;
7. comportamento em celular quando a tarefa puder ocorrer nele;
8. hipóteses, decisões necessárias e dependências de backend;
9. pedido explícito de aprovação antes da implementação final.

O wireframe avalia tarefa e comportamento, não acabamento. Use dados fictícios coerentes, como OS, clientes, setores, responsáveis, prazos e status, sem copiar dados reais do ambiente.

Ao criticar um fluxo, use a forma: **evidência → impacto na tarefa → melhoria proporcional → responsabilidade** (frontend, backend ou decisão de produto). Não apresente preferências visuais como problemas objetivos.

## Verificação após implementação aprovada

- Rode `npm run build` e lint/testes pertinentes, distinguindo falhas preexistentes.
- Confira o fluxo principal e ações autorizadas com os estados reais da API.
- Teste carregamento, vazio, erro/403, sucesso e validações relevantes.
- Confira paginação, filtros, ordenação, preferências e sincronização com URL quando aplicáveis.
- Inspecione desktop e celular; teste navegação por teclado, ordem de foco, foco visível, nomes acessíveis, contraste e uso sem depender apenas de cor.
- Confira light/dark, textos longos, ausência condicional de campos financeiros e dados nulos/opcionais.
- Quando houver interface executável e recurso de navegador disponível, faça inspeção visual. Não declare verificação visual se apenas compilou.
- Relate arquivos alterados, comandos executados, resultado e limitações restantes.
