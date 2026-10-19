# Plano de manutenção do módulo de OS Operacional

Data do plano: 18/10/2026.

**Status:** implementado no frontend em 18/10/2026.

## 1. Objetivo

Colocar temporariamente todo o módulo de **OS Operacional** em manutenção até terça-feira, 20/10/2026. Nenhuma pessoa poderá abrir listagens, cadastros, edições ou ações do módulo pela interface, independentemente das permissões que possua.

O item **OS operacionais** continuará visível no menu. Ao clicar nele, a pessoa verá o aviso de manutenção. O **Catálogo operacional** também ficará bloqueado, pois é um cadastro interno do mesmo módulo e ainda permite criar ou alterar dados usados pelas OS operacionais.

O **Painel operacional** (`/analise/operacional`) permanece disponível. Ele é uma página de análise geral da execução e não é o módulo de OS Operacional.

## 2. Mensagem exibida

> ### Módulo temporariamente indisponível
>
> O módulo de **OS Operacional** está passando por uma reestruturação para adequação aos processos operacionais e comerciais da empresa.
>
> Durante esse período, o acesso permanecerá temporariamente indisponível.
>
> **Previsão de retorno: terça-feira, 20/10/2026.**
>
> Agradecemos a compreensão.

## 3. Comportamento proposto

1. Manter **OS operacionais** na seção **Execução** do menu lateral.
2. Manter **Catálogo operacional** na seção **Cadastros**, para que o clique também explique por que o recurso não abre.
3. Exibir o aviso em uma página de manutenção dentro do layout normal do sistema, com título, texto completo e botão para voltar.
4. Fazer todos os endereços do módulo renderizarem a mesma página de manutenção:
   - `/ordens/operacionais`;
   - qualquer endereço abaixo de `/ordens/operacionais/`;
   - `/catalogo/operacional`;
   - `/catalogo/operacional/new`;
   - `/catalogo/operacional/:id/edit`;
   - qualquer outro endereço abaixo de `/catalogo/operacional/`.
5. Manter os itens na busca global. Selecioná-los terá o mesmo resultado do clique no menu.
6. Não montar as páginas antigas enquanto a manutenção estiver ativa. Com isso, nenhum hook de consulta ou mutação do módulo será executado e nenhuma requisição de OS Operacional ou Catálogo Operacional será iniciada por essas rotas.
7. Não aplicar liberação por função, permissão, usuário ou ambiente. A indisponibilidade será igual para todas as pessoas.

## 4. Alterações previstas

### 4.1 Componente dedicado de manutenção

Componente criado em `src/features/ordens/pages/OperationalOrderMaintenancePage.tsx`, usando os componentes visuais já existentes (`Card`, ícone e `BackButton`). O texto fica centralizado nesse componente para evitar diferenças entre menu, busca e acesso direto.

O componente deve usar semântica acessível: título associado ao conteúdo, foco visível no botão e leitura correta da data por leitor de tela. Não deve fechar automaticamente nem depender de relógio local para liberar o módulo.

### 4.2 Bloqueio das rotas

Em `src/app/routes.tsx`:

- substituir `OperationalOrderListPage`, `CatalogoOperacionalListPage` e `CatalogoOperacionalFormPage` pela página de manutenção nas rotas operacionais;
- declarar rotas com curinga para cobrir URLs internas ou favoritas antigas;
- remover os imports das páginas operacionais que deixarem de ser montadas.

O bloqueio ficará na camada de rotas, antes da renderização das páginas e de seus hooks. Esta é a garantia central de que a interface não exporá o módulo por acesso direto.

### 4.3 Navegação e busca global

Manter os itens atuais de `src/components/layout/navigation.ts`. Como sidebar, breadcrumb e busca global consomem essa configuração única, ambos continuarão encontráveis e conduzirão à página de manutenção.

Revisar o breadcrumb para mostrar **Execução › OS operacionais** ou **Cadastros › Catálogo operacional** sem sugerir ações de cadastro/edição enquanto o bloqueio estiver ativo.

### 4.4 Remoção da manutenção

A data de retorno será apenas informativa. A reabertura exigirá uma alteração deliberada no código depois da validação das novas regras de negócio; não haverá desbloqueio automático em 20/10/2026.

Para reabrir, restaurar os componentes originais nas rotas e remover o componente de manutenção. O trabalho deve incluir validação funcional do fluxo revisado antes da liberação.

## 5. Verificação

Validar em desktop e tela estreita:

1. clicar em **OS operacionais** no menu;
2. selecionar **OS operacionais** pela busca global;
3. clicar em **Catálogo operacional** no menu;
4. selecionar **Catálogo operacional** pela busca global;
5. abrir diretamente cada URL listada na seção 3, incluindo URLs com ID e caminhos inexistentes abaixo dos dois prefixos;
6. confirmar que a mensagem exibida é exatamente a aprovada e que a data aparece como terça-feira, 20/10/2026;
7. confirmar que nenhuma página, tabela, formulário ou ação antiga aparece por trás do aviso;
8. confirmar no painel de rede do navegador que não são feitas requisições para `/api/ordens-servico/operacionais/` nem `/api/catalogo/catalogos-operacionais/` ao abrir essas rotas;
9. confirmar que `/analise/operacional` continua funcionando normalmente;
10. executar `npm run build` e `npm run lint`.

## 6. Critérios de aceite

- Nenhuma pessoa acessa conteúdo ou ações de OS Operacional e Catálogo Operacional pela interface.
- Todo clique nos itens do módulo e todo acesso direto às suas URLs mostra o aviso aprovado.
- O aviso possui uma saída clara para a tela anterior.
- As páginas bloqueadas não disparam consultas nem mutações das APIs operacionais.
- Painel operacional e os demais módulos permanecem inalterados.

## 7. Limite desta entrega

Este plano cobre exclusivamente o frontend. Ele impede acesso pela interface, mas não desativa os endpoints do backend para clientes externos ou chamadas manuais. Um bloqueio também na API exigiria uma mudança separada no backend.
