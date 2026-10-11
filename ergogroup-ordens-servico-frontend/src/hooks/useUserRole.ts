import { usePermissoes } from './usePermissoes';

/**
 * Usado só pelas telas da OS operacional e do catálogo operacional, que estão fora do escopo do
 * redesenho (R7, 11/10/2026). Todo o resto usa `usePermissoes().pode()`.
 *
 * Adaptador de transição: mantém as flags que as telas já usam, agora calculadas a partir
 * das permissões da pessoa (ver `usePermissoes`). Código novo deve usar `usePermissoes().pode()`
 * direto, passando o setor do serviço quando a regra é por setor.
 *
 * As flags `is*` não são mais papéis fixos: descrevem o "jeito de trabalhar" que a tela adapta
 * (quem só vê o que é seu, quem distribui o trabalho de um setor, quem cuida da cobrança...).
 * Com as funções iniciais (migração `organizacoes/0013`), cada uma corresponde ao tipo antigo
 * citado no comentário.
 */
export const useUserRole = () => {
  const { pode, podeAlguma, todosOsSetores } = usePermissoes();

  const veValores = pode('financeiro.ver_valores');
  const registraCobranca = pode('financeiro.registrar_cobranca');
  const gerenciaOs = pode('os.gerenciar');

  // Diretoria (antes: diretor e gestor comercial): permissões por setor valem em todos.
  const isDirector = todosOsSetores;
  const isGestorComercial = isDirector;
  // Só vê o que é seu (antes: técnico).
  const isTechnician = !podeAlguma(['os.ver_todas', 'servicos.ver_setor']);
  // Distribui o trabalho de um setor específico (antes: líder e sub-líder técnico).
  const isTecnicoGestor = !isDirector && pode('tarefas.distribuir');
  const isLeadTechnician = isTecnicoGestor && gerenciaOs;
  const isSubLeadTechnician = isTecnicoGestor && !gerenciaOs;
  // Cuida da cobrança sem ser diretoria (antes: financeiro e gestor financeiro).
  const isFinance = !isDirector && registraCobranca;
  // Mantém as OS sem ver valores (antes: administrativo e gestor administrativo).
  const isAdministrativeSector = gerenciaOs && !veValores;
  // Não cria nem edita OS (antes: técnico e sub-líder técnico).
  const isRestricted = !gerenciaOs;

  return {
    isDirector,
    isGestorComercial,
    isTechnician,
    isSubLeadTechnician,
    isLeadTechnician,
    isAdministrativeSector,
    isFinance,
    isRestricted,
    // Área de cobrança e indicadores financeiros.
    canAccessFinancials: veValores || registraCobranca,
    canManageOrders: gerenciaOs,
    canViewOrderValues: veValores,
    canManageQuickTasks: pode('os_operacional.gerenciar'),
    canManageCatalogoComum: pode('catalogo.gerenciar'),
  };
};
