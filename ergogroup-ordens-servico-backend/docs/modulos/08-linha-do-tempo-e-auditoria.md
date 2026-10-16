# 08. Linha do tempo e auditoria

Tudo o que muda numa venda, nos serviços e nas tarefas fica registrado na **auditoria**: quem mudou, quando, de onde e o que mudou, com os valores antes e depois. A **linha do tempo** é essa auditoria traduzida em frases legíveis, como "Distribuído para Ana, prazo 30/10" ou "OS liberada para o financeiro (na venda)".

Decisões de origem: ADR 0008, seção 4 (linha do tempo), e ADR 0009 (ciência de recebimento).

---

## 1. A auditoria

### 1.1 O que é registrado

| Entidade | Ações registradas |
|---|---|
| **Venda (OS)** | Criação, alteração, exclusão, mudança de status, liberação para cobrança e lançamento. |
| **Serviço** | Criação, alteração (inclusive a troca de setor), exclusão, mudança de status calculada, ciência de recebimento do setor e ciência de alerta (pausa explicada). |
| **Tarefa** | Criação, alteração (responsável, prazo, status), exclusão e ciência de recebimento do responsável. |

Cada registro guarda:
- a entidade e o ID;
- a **ação** e o **motivo**, quando é o sistema que age (ex.: "Serviço sincronizado automaticamente a partir das tarefas");
- **quem** fez;
- **quando**;
- **as alterações**, campo a campo, com o valor antes e depois;
- uma **foto** do registro;
- os IDs da OS, do serviço e da tarefa relacionados, para montar as linhas do tempo;
- a **origem** (API, admin, sistema ou migração), o ID da requisição, o IP e o navegador.

### 1.2 Regras

- O registro é **automático**: qualquer gravação (pela API, pelo admin ou por uma regra do sistema) gera o registro. Ninguém precisa lembrar de registrar.
- "Quem fez" é o usuário da requisição. Nas mudanças automáticas, como a propagação de status ou a liberação, o registro sai com o usuário da requisição que as provocou, e o motivo explica o que aconteceu.
- Os registros **não são editados nem apagados** pela aplicação.
- Excluir uma venda **não** apaga os registros dela.

### 1.3 Quem vê

| O quê | Acesso |
|---|---|
| Os registros brutos de auditoria (`/api/auditoria/registros/`) | `auditoria.ver` |
| A linha do tempo da venda e a do serviço | Quem vê a venda ou o serviço (regras de visibilidade do módulo 03) |

---

## 2. A linha do tempo

### 2.1 Duas linhas do tempo

| Linha do tempo | Onde aparece | O que traz |
|---|---|---|
| **Da venda (OS)** | Resumo da venda, Resumo para faturar | Os eventos da OS **e de todos os serviços e tarefas dela, de todos os setores**. |
| **Do serviço** | Detalhe do serviço | Só aquele serviço e as tarefas dele. |

### 2.2 Eventos

| Grupo | Eventos |
|---|---|
| Venda | Venda registrada; venda alterada (lista os campos); condições de pagamento alteradas*; OS liberada para o financeiro (na venda ou na conclusão)*; lançamento registrado*; OS concluída, cancelada ou reaberta. |
| Serviço | Chegada ao setor; ciência de recebimento do setor; mudança de setor ("passou de Segurança do Trabalho para Ergonomia"); serviço concluído (por quem), cancelado, reaberto ou excluído da venda; pausa explicada (motivo e observação). |
| Tarefa | Distribuído para Fulano, com prazo; responsável confirmou o recebimento; passou de Fulano para Beltrano; prazo definido ou alterado; iniciou; concluiu; tarefa cancelada, reaberta ou excluída. |

\* Só para quem tem `financeiro.ver_valores`. Para os demais, esses eventos não aparecem, e "venda alterada" não cita a observação.

### 2.3 Regras da tradução

- **Repetições são omitidas.** A propagação automática de status não vira evento quando repete algo que já está na linha. Por exemplo, o "em execução" do serviço repete o "iniciou" da tarefa.
- **A ciência automática não vira evento.** Distribuir direto ou iniciar uma tarefa registra a ciência por baixo, mas na linha aparece só "distribuído" ou "iniciou". Só a ciência dada pela pessoa vira evento próprio.
- **Vendas antigas:** os registros criados na migração dos dados antigos ficam de fora, porque a data deles é a da migração. No lugar, a venda ganha um evento inicial: "Venda de dd/mm/aaaa, registrada antes do histórico detalhado".
- **Categorias no financeiro:** no Resumo para faturar, cada evento é marcado como *financeiro* ou *execução*. O filtro "Financeiro | Tudo" usa essa marca. São financeiros: venda, venda e condição alteradas, liberação, lançamento, OS concluída, cancelada ou reaberta, e serviço cancelado ou excluído.

### 2.4 Outros usos da auditoria

- A **Conferência do faturamento** (módulo 04) lê a auditoria para descobrir o que **mudou depois da liberação ou do faturamento** (alterações dos últimos 90 dias).
- Os **registros de auditoria** podem ser filtrados por entidade, objeto, ação, OS, serviço e tarefa, para investigação.

---

## 3. Endpoints

| Ação | Endpoint | Acesso |
|---|---|---|
| Linha do tempo da venda | `GET /api/ordens-servico/ordens/<id>/linha-do-tempo/` | Quem vê a venda |
| Linha do tempo do serviço | `GET /api/ordens-servico/servicos/<id>/linha-do-tempo/` | Quem vê o serviço |
| Registros de auditoria | `GET /api/auditoria/registros/` (e `<id>/`) | `auditoria.ver` |
| Registros de uma OS | `GET /api/auditoria/registros/ordens/<id>/timeline/` | `auditoria.ver` |

---

## 4. Onde está no código

| Assunto | Arquivo |
|---|---|
| Modelo e ações | `apps/auditoria/models.py` |
| Registro automático (sinais) e quem fez (contexto da requisição) | `apps/auditoria/signals.py`, `context.py`, `middleware.py`, `utils.py` |
| Tradução em eventos | `apps/ordens_servico/services/linha_do_tempo.py` |
| Tela | Frontend: `src/features/linha-do-tempo/` |
