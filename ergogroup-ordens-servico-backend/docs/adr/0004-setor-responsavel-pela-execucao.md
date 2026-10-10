# ADR 0004: Setor responsável pela execução e catálogo

## Status
Aceito e implementado (09–10/10/2026).

## Contexto
Com os setores criados, era preciso saber em qual setor cada serviço vendido deve ser executado. Duas opções foram discutidas: definir o setor no catálogo ou na venda. O usuário pediu **um padrão só**, pela facilidade no dia a dia e pelo entendimento do sistema.

Em 10/10/2026 o usuário definiu o conceito: **a relação entre catálogo e setor é qual setor é responsável por executar aquele serviço.**

Na mesma época, a gestora da área técnica decidiu que horas estimadas e complexidade não pertencem ao catálogo.

## Decisão
1. **`Catalogo.setor` é o setor responsável pela execução.** É obrigatório (inclusive no banco) e precisa ser um setor ativo ao ser escolhido ou trocado.
2. **`Servico.setor` é uma cópia** do setor do catálogo, feita quando o serviço recebe o catálogo (na criação ou na troca de catálogo). Não pode ser editado pela API. Se o catálogo mudar de setor depois, os serviços já vendidos continuam no setor original, preservando o histórico e os indicadores.
3. **Setor de execução é um conceito derivado:** é um setor que é responsável por algum catálogo. Não existe um campo para isso. O Comercial não é de execução porque nenhum catálogo aponta para ele. Um setor novo (ex.: Ergonomia) passa a executar serviços assim que algum catálogo for atribuído a ele.
4. **Classificação inicial:** todos os 123 catálogos foram vinculados a **Segurança do Trabalho**, e os 1.526 serviços com catálogo receberam esse setor (migrações `catalogo/0007` e `ordens_servico/0007`). A classificação fina fica para depois.
5. **`Catalogo.ativo`:** catálogo aposentado continua nos serviços já vendidos, mas não pode ser usado em serviços novos (validação em `ServicoSerializer`). Filtro `?ativo=true` para a criação de OS. Excluir catálogo em uso responde 409 sugerindo desativar.
6. **API do catálogo:** os campos são listados explicitamente (sem `fields = '__all__'`) e a resposta inclui `setor_nome`.
7. **Horas estimadas e complexidade saíram do catálogo** (migrações `catalogo/0004` e `0005`). Antes de remover as colunas, os valores foram copiados para os serviços que ainda os herdavam. O catálogo operacional manteve esses campos porque a OS operacional está fora desta sprint. Para serviço e tarefa, ver ADR 0005.

## Alternativas consideradas
- **Setor definido na venda:** rejeitado, porque quem vende não precisaria conhecer a estrutura técnica e haveria divergência entre vendedores.
- **Setor do serviço sempre lido do catálogo, sem cópia:** rejeitado, porque mudar o catálogo de setor reescreveria o histórico.
- **Um serviço com vários setores:** rejeitado. Se uma venda envolve dois setores, viram dois serviços na mesma OS.

## Consequências
- A fila de cada setor é definida pelos catálogos sob sua responsabilidade.
- Exceções ("este serviço será feito por outro setor") são resolvidas criando outro item de catálogo, e não ajustando a venda.
- Pendente decidir: juntar os nomes duplicados ("ERGONOMIA - ELABORAÇÃO DE AEP" e "TREINAMENTO PCA" aparecem duas vezes cada), manter ou remover os subitens de catálogo (sem uso) e o futuro das horas e complexidade no catálogo operacional.
- Substitui o ADR 0001 no que diz respeito ao catálogo.
