# Produtividade — Tempos Médios

## O que este indicador mede

Três métricas de velocidade operacional calculadas sobre todo o histórico:

| Métrica | O que mede | Campos |
|---|---|---|
| Tempo médio de OS | Dias entre criação e encerramento | `OrdemServico.data_criacao` → `Max(Servico.data_termino)` |
| Tempo médio de serviço | Dias entre início e término de um serviço | `Servico.data_inicio` → `Servico.data_termino` |
| Lead time de tarefa | Dias entre criação e início de uma tarefa | `Tarefa.criada_em` → `Tarefa.data_inicio` |

## Fonte de dados

### OS
```
OrdemServico.filter(concluida=True)
.annotate(data_fim_real=Max(servicos__data_termino, filter=status='concluida'))
.filter(data_fim_real__isnull=False)
```

### Serviço
```
Servico.filter(status=CONCLUIDA, data_inicio__isnull=False, data_termino__isnull=False)
```

### Lead time de tarefa
```
Tarefa.filter(data_inicio__isnull=False)
# criada_em é DateTimeField: convertido via timezone.localtime() em Python
```

Todos calculados sobre **histórico completo**, sem restrição de período.

## Como ler cada métrica

### Tempo médio de OS
É o **SLA total percebido pelo cliente** — do momento em que a OS foi aberta até a entrega final. Ver também `os_tempo_medio_encerramento.md` para detalhamento.

### Tempo médio de serviço
É a **eficiência de execução técnica** — quanto tempo um técnico leva para executar um serviço após iniciá-lo. Exclui o tempo de espera antes do início. Um serviço com tempo médio longo pode indicar complexidade técnica ou dependências externas.

### Lead time de tarefa
É o **tempo de ativação** — quanto tempo uma tarefa fica parada esperando ser iniciada após ser criada. Alto lead time não indica execução lenta, mas **fila de alocação** ou ausência de priorização.

A relação entre os três valores é reveladora:
- `tempo_OS >> tempo_servico` → a OS passa muito tempo com serviços em espera, não em execução
- `lead_time_tarefa alto` → técnicos sobrecarregados ou ausência de processo de triagem
- `tempo_servico ≈ tempo_OS` → OS têm poucos serviços e são concluídas quase que linearmente

## O que este indicador diz sobre a saúde da operação

Os três tempos formam uma **anatomia do ciclo de entrega**:

```
[Abertura da OS] → (espera) → [Início do serviço] → (lead time) → [Início da tarefa] → (execução) → [Entrega]
```

Identificar em qual etapa o tempo é perdido direciona onde investir em melhoria de processo.

## Perguntas que este indicador responde

- O SLA médio ao cliente está dentro do acordado?
- O tempo de execução técnica está melhorando?
- Tarefas criadas ficam muito tempo sem ser iniciadas?

## Alertas e ações recomendadas

| Situação | Ação |
|---|---|
| Lead time de tarefa > 7 dias | Revisar processo de alocação: técnicos estão sendo designados mas não iniciando as tarefas |
| Tempo de serviço > 30% do tempo de OS | OS passam muito tempo com serviços não iniciados — verificar processo de ativação |
| Tempo médio de OS alto mas tempo de serviço baixo | O problema não é execução, é a espera entre criação da OS e início dos serviços |
