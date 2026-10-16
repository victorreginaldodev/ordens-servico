import type { Esquemas } from '@/api/tipos';
import api from '@/services/api';

export type Complexidade = 1 | 2 | 3;

export const COMPLEXIDADE_LABEL: Record<Complexidade, string> = {
  1: 'Baixa',
  2: 'Média',
  3: 'Alta',
};

export const COMPLEXIDADE_DOT: Record<Complexidade, string> = {
  1: 'bg-muted-foreground',
  2: 'bg-yellow-500',
  3: 'bg-red-600',
};

// ── Catálogo (serviços de Ordem de Serviço) ───────────────────────────────────

export interface CatalogoItem {
  id: number;
  nome: string;
  descricao: string | null;
  /** Setor responsável por executar os serviços deste catálogo: é a fila em que eles caem. */
  setor: number | null;
  setorNome: string | null;
  /** Inativo: continua nos serviços já vendidos, mas não pode ser usado em serviços novos. */
  ativo: boolean;
  /** Serviços ativos ainda sem tarefas (novos ou a distribuir), em qualquer setor: a primeira caixa ao mudar o setor. */
  servicosEmAberto: number;
  /** Serviços já distribuídos ou em andamento, em qualquer setor: a segunda caixa (vão com as tarefas). */
  servicosComTarefas: number;
  /** Dos em aberto, os que ficaram em outro setor que não o do catálogo (numa mudança anterior). */
  servicosEmAbertoForaDoSetor: number;
  /** Dos com tarefas, os que ficaram em outro setor que não o do catálogo. */
  servicosComTarefasForaDoSetor: number;
  /** Só na resposta de editar: quantos serviços foram junto para o setor novo. */
  servicosMovidos?: number;
  /**
   * Só na resposta de criar e editar: avisos do backend que não impedem salvar
   * (ex.: o setor ainda não tem quem organize; os serviços cairiam numa fila sem responsável).
   */
  avisos?: string[];
}

export interface CatalogoPayload {
  nome: string;
  descricao?: string | null;
  setor: number;
  ativo?: boolean;
  /** Leva para o setor do catálogo os serviços em aberto e sem tarefas que estão em outro setor. */
  moverServicosEmAberto?: boolean;
  /** Leva para o setor do catálogo os distribuídos ou em andamento que estão em outro setor, com as tarefas. */
  moverServicosComTarefas?: boolean;
}

type CatalogoDTO = {
  id: number;
  nome: string;
  descricao: string | null;
  setor: number | null;
  setor_nome?: string | null;
  ativo?: boolean;
  servicos_em_aberto?: number;
  servicos_com_tarefas?: number;
  servicos_em_aberto_fora_do_setor?: number;
  servicos_com_tarefas_fora_do_setor?: number;
  servicos_movidos?: number;
  avisos?: string[];
};

const CATALOGO_ENDPOINT = '/api/catalogo/catalogos/';

const catalogoToFrontend = (dto: CatalogoDTO): CatalogoItem => ({
  id: dto.id,
  nome: dto.nome,
  descricao: dto.descricao ?? null,
  setor: dto.setor ?? null,
  setorNome: dto.setor_nome ?? null,
  ativo: dto.ativo ?? true,
  servicosEmAberto: dto.servicos_em_aberto ?? 0,
  servicosComTarefas: dto.servicos_com_tarefas ?? 0,
  servicosEmAbertoForaDoSetor: dto.servicos_em_aberto_fora_do_setor ?? 0,
  servicosComTarefasForaDoSetor: dto.servicos_com_tarefas_fora_do_setor ?? 0,
  ...(dto.servicos_movidos ? { servicosMovidos: dto.servicos_movidos } : {}),
  ...(dto.avisos?.length ? { avisos: dto.avisos } : {}),
});

const catalogoToBackend = (payload: Partial<CatalogoPayload>) => ({
  ...(payload.nome !== undefined ? { nome: payload.nome } : {}),
  ...(payload.descricao !== undefined ? { descricao: payload.descricao } : {}),
  ...(payload.setor !== undefined ? { setor: payload.setor } : {}),
  ...(payload.ativo !== undefined ? { ativo: payload.ativo } : {}),
  ...(payload.moverServicosEmAberto ? { mover_servicos_em_aberto: true } : {}),
  ...(payload.moverServicosComTarefas ? { mover_servicos_com_tarefas: true } : {}),
});

export const getCatalogos = async (params: { q?: string } = {}): Promise<CatalogoItem[]> => {
  const queryParams: Record<string, string> = {};
  if (params.q) queryParams.q = params.q;
  const { data } = await api.get<CatalogoDTO[] | { results: CatalogoDTO[] }>(CATALOGO_ENDPOINT, { params: queryParams });
  const lista = Array.isArray(data) ? data : data?.results ?? [];
  return lista.map(catalogoToFrontend);
};

export const getCatalogo = async (id: number): Promise<CatalogoItem> => {
  const { data } = await api.get<CatalogoDTO>(`${CATALOGO_ENDPOINT}${id}/`);
  return catalogoToFrontend(data);
};

export const createCatalogo = async (payload: CatalogoPayload): Promise<CatalogoItem> => {
  const { data } = await api.post<CatalogoDTO>(CATALOGO_ENDPOINT, catalogoToBackend(payload));
  return catalogoToFrontend(data);
};

export const updateCatalogo = async (id: number, payload: Partial<CatalogoPayload>): Promise<CatalogoItem> => {
  const { data } = await api.patch<CatalogoDTO>(`${CATALOGO_ENDPOINT}${id}/`, catalogoToBackend(payload));
  return catalogoToFrontend(data);
};

export const deleteCatalogo = async (id: number): Promise<void> => {
  await api.delete(`${CATALOGO_ENDPOINT}${id}/`);
};

export type ResultadoMudarSetor = Esquemas['ResultadoMudarSetor'];

/** Passa vários catálogos para um setor (revisão de permissões, P5). */
export const mudarSetorDosCatalogos = async (payload: Esquemas['MudarSetorDosCatalogosRequest']): Promise<ResultadoMudarSetor> => {
  const { data } = await api.post<ResultadoMudarSetor>(`${CATALOGO_ENDPOINT}mudar-setor/`, payload);
  return data;
};

// ── Catálogo Operacional (serviços de OS Operacional) ─────────────────────────

export interface CatalogoOperacionalItem {
  id: number;
  nome: string;
  descricao: string | null;
  horasEstimadas: string | null;
  complexidade: Complexidade | null;
}

export interface CatalogoOperacionalPayload {
  nome: string;
  descricao?: string | null;
  horasEstimadas?: string | null;
  complexidade?: Complexidade | null;
}

type CatalogoOperacionalDTO = {
  id: number;
  nome: string;
  descricao: string | null;
  horas_estimadas: string | null;
  complexidade: Complexidade | null;
};

const CATALOGO_OPERACIONAL_ENDPOINT = '/api/catalogo/catalogos-operacionais/';

const catalogoOperacionalToFrontend = (dto: CatalogoOperacionalDTO): CatalogoOperacionalItem => ({
  id: dto.id,
  nome: dto.nome,
  descricao: dto.descricao ?? null,
  horasEstimadas: dto.horas_estimadas ?? null,
  complexidade: dto.complexidade ?? null,
});

const catalogoOperacionalToBackend = (payload: Partial<CatalogoOperacionalPayload>) => ({
  ...(payload.nome !== undefined ? { nome: payload.nome } : {}),
  ...(payload.descricao !== undefined ? { descricao: payload.descricao } : {}),
  ...(payload.horasEstimadas !== undefined ? { horas_estimadas: payload.horasEstimadas } : {}),
  ...(payload.complexidade !== undefined ? { complexidade: payload.complexidade } : {}),
});

export const getCatalogosOperacionais = async (params: { q?: string } = {}): Promise<CatalogoOperacionalItem[]> => {
  const queryParams: Record<string, string> = {};
  if (params.q) queryParams.q = params.q;
  const { data } = await api.get<CatalogoOperacionalDTO[]>(CATALOGO_OPERACIONAL_ENDPOINT, { params: queryParams });
  return (data || []).map(catalogoOperacionalToFrontend);
};

export const getCatalogoOperacional = async (id: number): Promise<CatalogoOperacionalItem> => {
  const { data } = await api.get<CatalogoOperacionalDTO>(`${CATALOGO_OPERACIONAL_ENDPOINT}${id}/`);
  return catalogoOperacionalToFrontend(data);
};

export const createCatalogoOperacional = async (
  payload: CatalogoOperacionalPayload,
): Promise<CatalogoOperacionalItem> => {
  const { data } = await api.post<CatalogoOperacionalDTO>(
    CATALOGO_OPERACIONAL_ENDPOINT,
    catalogoOperacionalToBackend(payload),
  );
  return catalogoOperacionalToFrontend(data);
};

export const updateCatalogoOperacional = async (
  id: number,
  payload: Partial<CatalogoOperacionalPayload>,
): Promise<CatalogoOperacionalItem> => {
  const { data } = await api.patch<CatalogoOperacionalDTO>(
    `${CATALOGO_OPERACIONAL_ENDPOINT}${id}/`,
    catalogoOperacionalToBackend(payload),
  );
  return catalogoOperacionalToFrontend(data);
};

export const deleteCatalogoOperacional = async (id: number): Promise<void> => {
  await api.delete(`${CATALOGO_OPERACIONAL_ENDPOINT}${id}/`);
};

// ── Compat: visão simplificada usada pelo módulo de Ordens de Serviço ─────────

export interface RepositoryItem {
  id: string;
  name: string;
  description: string;
}

export const getRepositories = async (): Promise<RepositoryItem[]> => {
  const items = await getCatalogos({});
  return items.map((c) => ({ id: String(c.id), name: c.nome, description: c.descricao ?? '' }));
};
