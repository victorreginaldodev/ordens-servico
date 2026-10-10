import { isAxiosError } from 'axios';

/** Primeira mensagem legível dentro do corpo de erro do DRF (string, lista ou objeto aninhado). */
const primeiraMensagem = (valor: unknown): string | null => {
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const msg = primeiraMensagem(item);
      if (msg) return msg;
    }
    return null;
  }
  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    for (const item of Object.values(obj)) {
      const msg = primeiraMensagem(item);
      if (msg) return msg;
    }
  }
  return null;
};

/**
 * Mensagem para o usuário a partir de um erro da API. O DRF devolve `{ detail: "..." }` em 403/404/409
 * e `{ campo: ["..."] }` (às vezes aninhado, como em `vinculos`) em 400.
 */
export const mensagemDeErro = (error: unknown, fallback: string): string => {
  const data = isAxiosError(error) ? error.response?.data : (error as { response?: { data?: unknown } })?.response?.data;
  return primeiraMensagem(data) ?? fallback;
};

export const statusDoErro = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;
