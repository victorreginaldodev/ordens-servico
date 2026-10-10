/**
 * Tipos da API, gerados do schema OpenAPI do backend (`npm run api:tipos`).
 *
 * `schema.d.ts` é gerado: não edite à mão. Quando o backend mudar, baixe o schema de novo
 * (`/api/schema/` → `docs/api/api-schema.yaml`) e rode `npm run api:tipos`.
 * Os módulos de cada domínio reexportam daqui os tipos com nomes do domínio.
 */
import type { components, operations } from './schema';

export type Esquemas = components['schemas'];

/** Parâmetros de busca (`?a=b`) de uma operação do schema. */
export type FiltrosDe<Op extends keyof operations> = NonNullable<operations[Op]['parameters']['query']>;

/**
 * Campos que o backend remove da OS para quem não tem `financeiro.ver_valores`
 * (`CAMPOS_FINANCEIROS` em `apps/ordens_servico/serializers/ordem_servico_serializer.py`).
 * O schema os declara obrigatórios; na prática podem faltar.
 */
export const CAMPOS_FINANCEIROS = [
  'valor',
  'valor_mensal',
  'tipo_condicao',
  'tipo_condicao_display',
  'forma_pagamento',
  'forma_pagamento_display',
  'quantidade_parcelas',
  'data_acordada_cobranca',
  'intervalo_parcelas_dias',
  'dia_fechamento',
  'dia_vencimento',
  'liberar_em',
  'liberar_em_display',
  'condicao_resumo',
] as const;

export type CampoFinanceiro = (typeof CAMPOS_FINANCEIROS)[number];

/** O tipo com os campos financeiros opcionais: ausentes quando a pessoa não vê valores. */
export type ComValoresOcultaveis<T> = Omit<T, CampoFinanceiro> & Partial<Pick<T, Extract<keyof T, CampoFinanceiro>>>;

/** Listas sem paginação vêm como array; com paginação, em `results`. Aceita as duas formas. */
export const comoLista = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
};
