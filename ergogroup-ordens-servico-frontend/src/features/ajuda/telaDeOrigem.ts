/**
 * A Ajuda abre em tela cheia, fora do layout do sistema. O layout guarda a última tela aberta para o
 * "Voltar ao sistema" da Ajuda levar de volta a ela (vale só nesta aba do navegador).
 */
const CHAVE = 'ajuda:tela-de-origem';

export function guardarTelaDeOrigem(caminho: string) {
  try {
    sessionStorage.setItem(CHAVE, caminho);
  } catch {
    /* sem armazenamento: o Voltar leva à tela inicial */
  }
}

export function telaDeOrigem(): string {
  try {
    return sessionStorage.getItem(CHAVE) || '/inicio';
  } catch {
    return '/inicio';
  }
}
