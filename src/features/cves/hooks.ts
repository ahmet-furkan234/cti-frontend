import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { CveDetail, CveSearchResponse, CveStats } from '@/lib/types';

export interface CveQueryParams {
  q?: string;
  severity?: string[];
  cvssMin?: number;
  cvssMax?: number;
  kev?: boolean;
  epssMin?: number;
  publishedFrom?: string;
  vendor?: string;
  product?: string;
  sort: 'published' | 'modified' | 'cvss' | 'epss';
  order: 'asc' | 'desc';
}

export function useCveSearch(params: CveQueryParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['cves', params],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<CveSearchResponse>('/cves', {
        query: {
          ...params,
          cursor: pageParam,
          limit: 50,
          // Counting is the expensive part, so it only rides along with the first page.
          includeTotal: pageParam ? undefined : true,
        },
        signal,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCve(id: string) {
  return useQuery({
    queryKey: ['cve', id],
    queryFn: () => api<CveDetail>(`/cves/${encodeURIComponent(id)}`),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
}

export function useCveStats(enabled = true) {
  return useQuery({ queryKey: ['cve-stats'], queryFn: () => api<CveStats>('/cves/stats'), enabled, staleTime: 5 * 60_000 });
}
