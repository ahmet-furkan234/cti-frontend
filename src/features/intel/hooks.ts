import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IntelFindingsResponse, IocAssetDto, IocDto, IocListResponse, NewKevDto, WatchlistDto } from '@/lib/types';

export const useWatchlists = () => useQuery({ queryKey: ['watchlists'], queryFn: () => api<{ items: WatchlistDto[] }>('/intel/watchlists') });
export const useIocs = () => useQuery({ queryKey: ['iocs'], queryFn: () => api<IocListResponse>('/intel/iocs', { query: { limit: 200 } }) });

export const useFindings = (days: number, watchlistId: string | null) =>
  useQuery({ queryKey: ['intel-findings', days, watchlistId], queryFn: () => api<IntelFindingsResponse>('/intel/findings', { query: { days, watchlistId, limit: 100 } }) });
export const useNewKev = (days: number) =>
  useQuery({ queryKey: ['intel-new-kev', days], queryFn: () => api<{ items: NewKevDto[] }>('/intel/new-kev', { query: { days } }) });
export const useIocAssets = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ['ioc-assets', id], enabled, queryFn: () => api<{ items: IocAssetDto[] }>(`/intel/iocs/${id}/assets`) });

export type WatchlistBody = Omit<WatchlistDto, 'id' | 'count' | 'hits'>;

export function useIntelMutations() {
  const qc = useQueryClient();
  const refresh = (key: string) => () => void qc.invalidateQueries({ queryKey: [key] });
  return {
    createWatchlist: useMutation({ mutationFn: (body: WatchlistBody) => api<WatchlistDto>('/intel/watchlists', { method: 'POST', body }), onSuccess: refresh('watchlists') }),
    updateWatchlist: useMutation({
      mutationFn: ({ id, ...body }: Partial<WatchlistBody> & { id: string }) => api<WatchlistDto>(`/intel/watchlists/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh('watchlists'),
    }),
    deleteWatchlist: useMutation({ mutationFn: (id: string) => api(`/intel/watchlists/${id}`, { method: 'DELETE' }), onSuccess: refresh('watchlists') }),
    deleteIoc: useMutation({ mutationFn: (id: string) => api(`/intel/iocs/${id}`, { method: 'DELETE' }), onSuccess: refresh('iocs') }),
    addIocs: useMutation({
      mutationFn: (items: { type: IocDto['type']; value: string }[]) => api<{ added: number; duplicates: number }>('/intel/iocs', { method: 'POST', body: { items } }),
      onSuccess: refresh('iocs'),
    }),
  };
}
