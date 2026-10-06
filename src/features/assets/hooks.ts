import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import type { ProductSuggestionDto, SoftwareAliasDto, SoftwareCheckDto, AssetDetailDto, AssetListResponse, UpdateAssetBody, AssetTab, CriticalityLevel, ImportRecordDto, ImportResult, ImportRowBody, NewAssetBody } from '@/lib/types';
import type { SortKey } from '@/lib/assets';

export interface AssetQuery {
  q: string;
  tab: AssetTab;
  exposed: boolean;
  criticalVulns: boolean;
  stale: boolean;
  env: string;
  criticality: CriticalityLevel | '';
  sort: SortKey;
}

const PAGE_SIZE = 50;

export const useAssets = (query: AssetQuery) =>
  useInfiniteQuery({
    queryKey: ['assets', query],
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam, signal }) =>
      api<AssetListResponse>('/assets', {
        query: {
          q: query.q.trim() || undefined, tab: query.tab, exposed: query.exposed || undefined, criticalVulns: query.criticalVulns || undefined,
          stale: query.stale || undefined, env: query.env || undefined, criticality: query.criticality || undefined, sort: query.sort,
          page: pageParam, pageSize: PAGE_SIZE,
        },
        signal,
      }),
    getNextPageParam: (last, pages) => (pages.length * PAGE_SIZE < last.total ? pages.length + 1 : undefined),
  });

export const useAsset = (id: string) =>
  useQuery({
    queryKey: ['asset', id],
    queryFn: () => api<AssetDetailDto>(`/assets/${encodeURIComponent(id)}`),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

function useRefreshInventory() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['assets'] });
    void qc.invalidateQueries({ queryKey: ['asset'] });
    void qc.invalidateQueries({ queryKey: ['vulns'] });
    void qc.invalidateQueries({ queryKey: ['cve-assets'] });
  };
}

export function useUpdateAsset(id: string) {
  const refresh = useRefreshInventory();
  return useMutation({ mutationFn: (body: UpdateAssetBody) => api<AssetDetailDto>(`/assets/${id}`, { method: 'PATCH', body }), onSuccess: refresh });
}

export function useDeleteAsset(id: string) {
  const refresh = useRefreshInventory();
  return useMutation({ mutationFn: () => api(`/assets/${id}`, { method: 'DELETE' }), onSuccess: refresh });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewAssetBody) => api('/assets', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['vulns'] });
    },
  });
}

export const useImportHistory = () => useQuery({ queryKey: ['asset-imports'], queryFn: () => api<{ items: ImportRecordDto[] }>('/assets/imports') });

export function useImportAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { source: string; kind: string; rows: ImportRowBody[]; dryRun: boolean; skipInvalid: boolean }) =>
      api<ImportResult>('/assets/import', { method: 'POST', body }),
    onSuccess: (res) => {
      if (!res.applied) return;
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['vulns'] });
      void qc.invalidateQueries({ queryKey: ['asset-imports'] });
    },
  });
}

export interface SoftwareEntry {
  product: string;
  version: string;
}

/** Asks the API how each software entry would be matched; disabled (and silent) when it cannot answer. */
export const useSoftwareCheck = (items: SoftwareEntry[]) =>
  useQuery({
    queryKey: ['software-check', items],
    enabled: items.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api<{ items: SoftwareCheckDto[] }>('/assets/software/check', { method: 'POST', body: { items }, signal }),
  });

/** Products matching what was typed, for the software name picker. */
export const useProductSearch = (q: string, enabled = true) =>
  useQuery({
    queryKey: ['product-search', q],
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api<{ items: ProductSuggestionDto[] }>('/assets/software/products', { query: { q }, signal }),
  });

export const useSoftwareAliases = () => useQuery({ queryKey: ['software-aliases'], queryFn: () => api<{ items: SoftwareAliasDto[] }>('/assets/software/aliases') });

export function useAliasMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    for (const key of ['software-aliases', 'product-search', 'software-check', 'vulns', 'assets']) void qc.invalidateQueries({ queryKey: [key] });
  };
  return {
    create: useMutation({ mutationFn: (body: { name: string; pair: string }) => api<SoftwareAliasDto>('/assets/software/aliases', { method: 'POST', body }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api(`/assets/software/aliases/${id}`, { method: 'DELETE' }), onSuccess: refresh }),
  };
}
