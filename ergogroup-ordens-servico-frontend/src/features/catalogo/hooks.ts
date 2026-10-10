import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CatalogoItem,
  CatalogoOperacionalItem,
  CatalogoOperacionalPayload,
  CatalogoPayload,
  RepositoryItem,
  createCatalogo,
  createCatalogoOperacional,
  deleteCatalogo,
  deleteCatalogoOperacional,
  getCatalogo,
  getCatalogoOperacional,
  getCatalogos,
  getCatalogosOperacionais,
  getRepositories,
  updateCatalogo,
  updateCatalogoOperacional,
} from './services';

// ── Catálogo ──────────────────────────────────────────────────────────────────

export const useCatalogos = (params: { q?: string } = {}) =>
  useQuery<CatalogoItem[]>({
    queryKey: ['catalogos', params],
    queryFn: () => getCatalogos(params),
  });

export const useCatalogo = (id?: number) =>
  useQuery<CatalogoItem>({
    queryKey: ['catalogo', id],
    enabled: id !== undefined,
    queryFn: () => getCatalogo(id as number),
  });

export const useUpsertCatalogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Partial<CatalogoPayload> }) =>
      id === undefined ? createCatalogo(payload as CatalogoPayload) : updateCatalogo(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['catalogos'] });
      if (id !== undefined) qc.invalidateQueries({ queryKey: ['catalogo', id] });
    },
  });
};

export const useDeleteCatalogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCatalogo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos'] }),
  });
};

// ── Catálogo Operacional ──────────────────────────────────────────────────────

export const useCatalogosOperacionais = (params: { q?: string } = {}) =>
  useQuery<CatalogoOperacionalItem[]>({
    queryKey: ['catalogos-operacionais', params],
    queryFn: () => getCatalogosOperacionais(params),
    staleTime: 1000 * 60 * 5,
  });

export const useCatalogoOperacional = (id?: number) =>
  useQuery<CatalogoOperacionalItem>({
    queryKey: ['catalogo-operacional', id],
    enabled: id !== undefined,
    queryFn: () => getCatalogoOperacional(id as number),
  });

export const useUpsertCatalogoOperacional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Partial<CatalogoOperacionalPayload> }) =>
      id === undefined
        ? createCatalogoOperacional(payload as CatalogoOperacionalPayload)
        : updateCatalogoOperacional(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['catalogos-operacionais'] });
      if (id !== undefined) qc.invalidateQueries({ queryKey: ['catalogo-operacional', id] });
    },
  });
};

export const useDeleteCatalogoOperacional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCatalogoOperacional(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos-operacionais'] }),
  });
};

// ── Compat: visão simplificada usada pelo módulo de Ordens de Serviço ─────────

export const useRepositories = () =>
  useQuery<RepositoryItem[]>({
    queryKey: ['catalogo-lista-simplificada'],
    queryFn: getRepositories,
  });
