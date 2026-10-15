/**
 * Avisos que o backend devolve sem impedir a ação: a venda é registrada, a pessoa é desativada, mas algum setor
 * que executa catálogos ativos ficou (ou já estava) sem quem receba as tarefas.
 */
export type ComAvisos<T> = T & { avisos?: string[] };

/** Junta os avisos no texto do toast; com aviso, o toast fica mais tempo na tela. */
export function toastComAvisos(avisos: string[] | undefined, descricao?: string) {
  if (!avisos?.length) return { description: descricao };
  return { description: avisos.join(' '), duration: 12_000 };
}
