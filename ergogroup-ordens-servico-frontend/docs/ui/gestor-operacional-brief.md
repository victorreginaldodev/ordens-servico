# UI/UX Brief — Painel Operacional do Gestor Técnico

> Documento para geração de UI com ferramenta de design assistida por IA.
> Contexto: sistema web interno de gestão de Ordens de Serviço — Ergogroup OS.
> Escopo deste brief: **apenas a página operacional do Gestor/Sub-líder Técnico.** Não cobre a listagem geral de OS, o dashboard de Analytics nem a página operacional do Técnico — essas telas têm briefs próprios.

---

## 1. Contexto do produto

**Ergogroup OS** é um sistema interno de gestão de ordens de serviço para uma empresa de saúde e segurança do trabalho, usado no navegador, exclusivamente em desktop.

Hoje o setor técnico/operacional tem duas telas para entender o que está acontecendo:

- Uma **listagem genérica de OS** (tabela de busca/filtro, pensada para localizar uma OS específica)
- Um **dashboard analítico** (KPIs e gráficos retrospectivos: tempo médio de conclusão, produtividade histórica por técnico, volume mensal)

Nenhuma das duas responde à pergunta que o Líder Técnico e o Sub-Líder Técnico fazem todo dia: **"o que está acontecendo agora no setor e o que precisa da minha decisão?"**

Este brief descreve uma **nova tela, orientada a ação e ao presente** — não mais um relatório, e sim um painel de controle operacional.

---

## 2. Hierarquia de entidades e dados disponíveis

```
Ordem de Serviço (OS)          — status, prioridade, dias em aberto, cliente
  └── Serviço                  — item de catálogo, status (calculado pelas tarefas)
        └── Tarefa             — responsável (técnico), status, datas de início/término

OS Operacional / Mini-OS       — unidade de trabalho avulsa e mais rápida,
                                  fora da estrutura de Serviço/Tarefa,
                                  também atribuída a um responsável (técnico)
```

- **Status de OS/Serviço/Tarefa**: `aberta/aberto` → `em_andamento` → `concluída` (ou `cancelada`)
- **Status calculado**: o status do Serviço é derivado automaticamente do status das suas Tarefas (o gestor não define manualmente — é reflexo do trabalho do técnico)
- **Prioridade da OS**: `baixa` / `média` / `alta`
- **Indicadores de tempo já existentes no backend**: `dias_em_aberto` (por OS) e métricas agregadas por técnico — tarefas concluídas, tarefas em aberto, mini-OS em aberto, tempo médio por tarefa
- Um técnico pode ter carga de trabalho em **dois lugares ao mesmo tempo**: tarefas dentro de OS/Serviço e Mini-OS avulsas — o painel do gestor precisa somar as duas para representar a carga real

---

## 3. Perfis de usuário

### Líder Técnico (`gestor_tecnico`)

- Gestor principal do setor técnico
- Cria e reatribui tarefas e mini-OS, monitora todos os serviços e técnicos
- **Tem acesso a valores financeiros** da OS (diferença chave em relação ao Sub-Líder)

### Sub-Líder Técnico (`sub_gestor_tecnico`)

- Braço operacional do Líder Técnico — mesmo tipo de monitoramento e ação sobre tarefas/mini-OS
- **Não vê valores financeiros nem dados comerciais de cliente** — foco estritamente na execução técnica
- Na prática, usa a mesma tela que o Líder Técnico, apenas com os campos monetários ocultos

> Os dois perfis compartilham esta mesma tela. A diferença é apenas visibilidade de dado financeiro, não estrutura de UI.

---

## 4. Problema atual

- O gestor não tem uma visão única do **estado presente** do setor — precisa cruzar a listagem de OS com o dashboard analítico mentalmente
- Não existe destaque para **o que está travado** (OS aberta há muito tempo, serviço parado, técnico sem tarefa ativa) — tudo tem o mesmo peso visual
- A produtividade por técnico hoje é **histórica** (dashboard), não **carga atual** — o gestor não vê de forma rápida quem está sobrecarregado agora
- Redistribuir uma tarefa exige navegar até o detalhe da OS/Serviço — não há atalho a partir de uma visão geral
- Como o status do Serviço é automático (baseado nas tarefas), o gestor pode não perceber quando **todas as tarefas de um serviço foram concluídas mas a OS ainda está aberta aguardando outro serviço** — um gargalo silencioso

---

## 5. Objetivos de design

1. **Presente sobre histórico**: a tela responde "o que é hoje", não "como foi nos últimos 12 meses" (isso é papel do Analytics)
2. **Atenção priorizada**: o que precisa de decisão do gestor aparece primeiro, sem exigir garimpo
3. **Carga de trabalho visível por pessoa**: qualquer técnico sobrecarregado ou ocioso deve ser óbvio à primeira vista
4. **Ação a um clique de distância**: reatribuir uma tarefa não pode exigir sair do painel e navegar por 3 telas
5. **Densidade de painel de controle**: mais parecido com um cockpit operacional do que com um relatório — mas sem virar uma tabela ilegível

---

## 6. Estrutura de informação da página

### Nível 1 — Faixa de status operacional (topo, sempre visível)

Números do **agora**, não do mês:

- OS abertas no momento
- Tarefas em aberto / em andamento no momento
- Técnicos sem nenhuma tarefa ativa (ociosos)
- OS/serviços parados há mais de X dias (limite configurável — ver seção 9)

### Nível 2 — "Precisa de atenção"

Lista priorizada (não é uma tabela genérica), ordenada por urgência:

- OS de prioridade alta com muitos dias em aberto
- Serviço com todas as tarefas concluídas, mas OS ainda aberta (aguardando próxima etapa)
- Técnico com tarefa parada há muito tempo sem mudança de status
- Cada item tem uma ação direta: abrir OS, reatribuir, cobrar

### Nível 3 — Carga por técnico

Visão em cards ou linhas, uma por técnico, mostrando **carga atual**:

- Tarefas em aberto + em andamento (soma de Serviço/Tarefa e Mini-OS)
- Indicador visual de sobrecarga (ex: barra ou contagem destacada acima de um limiar)
- Tempo médio recente por tarefa (contexto, não é o foco principal)
- Clique leva ao detalhamento das tarefas daquele técnico, com ação de reatribuir

### Nível 4 — Mapa de OS e serviços em andamento

Visão agrupada por status (aberta / em andamento), com prioridade e dias em aberto visíveis — mais enxuta que a listagem geral de OS, focada em quem está fazendo o quê agora, não em dados comerciais/faturamento.

---

## 7. Comportamentos esperados

| Ação | Quem | Como |
|------|------|------|
| Ver painel operacional completo | Líder + Sub-Líder Técnico | Tela principal, sem cliques |
| Ver valores financeiros da OS | Apenas Líder Técnico | Campo visível apenas para esse perfil; oculto para Sub-Líder |
| Reatribuir tarefa/mini-OS | Líder + Sub-Líder Técnico | Ação inline a partir do card do técnico ou do item "Precisa de atenção" |
| Abrir detalhe da OS | Líder + Sub-Líder Técnico | Clique no item da lista, navega para o hub da OS |
| Ajustar o que conta como "atrasado" | Líder Técnico | Configuração simples (ex: threshold de dias), não é foco do MVP |

---

## 8. Design tokens do projeto

*(mesmo design system usado nas demais telas do produto)*

### Tipografia

- **Família**: Plus Jakarta Sans (Google Fonts)
- **Pesos em uso**: 400 (body), 500 (label), 600 (semibold), 700 (bold), 800 (display)
- **Escala de tamanhos**: 10px (label uppercase), 12px (meta), 14px (body), 16px (título de card), 24px (título de página)
- **Tracking**: headings com `tracking-tight`, labels com `tracking-wider uppercase`

### Paleta de cores — Light mode

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `0 0% 100%` | Fundo da página |
| `--card` | `0 0% 100%` | Fundo de cards |
| `--foreground` | `222 47% 11%` | Texto principal |
| `--muted` | `210 40% 96%` | Fundo cinza-claro |
| `--muted-foreground` | `215 20% 47%` | Texto secundário |
| `--border` | `214 32% 91%` | Bordas e divisores |
| `--primary` | `173 50% 38%` | Teal escuro — ação principal |
| `--ring` | `173 50% 38%` | Focus ring |
| `--destructive` | `0 84% 60%` | Vermelho — alerta/urgência |

### Paleta de cores — Dark mode

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `222 47% 6%` | Azul-marinho muito escuro |
| `--card` | `222 47% 8%` | Cards levemente mais claros |
| `--foreground` | `210 40% 98%` | Texto quase branco |
| `--muted` | `222 30% 18%` | Fundo muted em dark |
| `--border` | `222 30% 18%` | Bordas sutis |

### Status (OS / Serviço / Tarefa)

| Status | Cor |
|--------|-----|
| Aberta/Aberto | Vermelho |
| Em andamento | Amarelo |
| Concluída | Verde |
| Cancelada | Cinza |

### Prioridade da OS

| Prioridade | Cor |
|------------|-----|
| Alta | Vermelho forte |
| Média | Amarelo |
| Baixa | Neutro (muted-foreground) |

### Border radius
- Cards grandes: `0.75rem` (12px)
- Badges/pills: `9999px` (full)

### Sombras
- Card padrão: `0 4px 20px rgba(0,0,0,0.08)`

---

## 9. Diretrizes de UX

### Presente, não retrospectiva
- Nenhum gráfico de tendência mensal nesta tela — isso pertence ao Analytics
- Números representam o estado agora (contagens, não médias históricas)

### Hierarquia de urgência como linguagem visual
- A seção "Precisa de atenção" usa cor de alerta (vermelho/âmbar) de forma consciente — não abusar, ou perde força
- Itens sem urgência não competem visualmente com os urgentes

### Carga de trabalho é comparativa
- A visão por técnico deve deixar óbvio, por comparação visual (barra, contagem em destaque), quem está com mais tarefas do que os outros — não apenas listar números soltos

### Ação embutida, não modal profundo
- Reatribuir uma tarefa deve ser possível com um dropdown/select inline a partir do próprio card de "atenção" ou do card do técnico — evitar abrir uma tela nova para uma ação simples

### Diferença de perfil é só visibilidade de dado
- Não desenhar dois layouts diferentes para Líder e Sub-Líder Técnico — a estrutura é idêntica, só o dado financeiro (se algum aparecer nesta tela) é condicional

### Responsividade
- Layout primário: desktop (1280px+)
- Deve funcionar em tablet (768px); mobile não é prioridade mas não pode quebrar

### Ponto em aberto para validar com o negócio
- **Definição de "atrasado"/"travado"**: qual o limiar de dias em aberto (por prioridade) que classifica uma OS como precisando de atenção? Este brief assume que existe um limiar configurável, mas o valor exato (ex: 7 dias para prioridade alta, 15 para média) precisa ser confirmado antes da implementação final.

---

## 10. Componentes-chave a projetar

1. **Faixa de Status Operacional** — 4 métricas do momento presente, lado a lado
2. **Lista "Precisa de Atenção"** — item de lista com ícone de urgência, contexto (OS/serviço/técnico envolvido) e ação direta
3. **Card de Carga por Técnico** — nome, contagem de tarefas + mini-OS ativas, indicador visual de sobrecarga, ação de ver detalhe/reatribuir
4. **Badge de Urgência** — selo compacto (ex: "12 dias em aberto") com cor de alerta escalonada
5. **Seletor de Reatribuição** — dropdown inline de técnico, sem modal
6. **Mapa de OS/Serviços em Andamento** — lista agrupada por status, mais enxuta que a listagem geral (sem colunas financeiras)
7. **Empty State** — quando não há itens precisando de atenção ("tudo em dia")

---

## 11. Referências de estilo

- Estética: **Linear.app**, **Notion**, **Height** — denso mas limpo, dark mode polido
- Inspiração funcional adicional: paineis de **on-call/incident dashboards** (ex: PagerDuty, Datadog) — pela lógica de "o que precisa de mim agora" priorizado visualmente
- Não usar: gráficos de tendência, cores vibrantes fora do sistema de status/urgência

---

## 12. Entregáveis esperados da ferramenta de design

- [ ] Layout completo da página em light mode
- [ ] Layout completo em dark mode
- [ ] Estado com múltiplos itens em "Precisa de atenção" (variando urgência)
- [ ] Estado vazio ("tudo em dia", sem itens de atenção)
- [ ] Card de técnico em estado normal e em estado de sobrecarga
- [ ] Variante da tela para Sub-Líder Técnico (sem dado financeiro, se aplicável)
- [ ] Estado de loading (skeleton)
