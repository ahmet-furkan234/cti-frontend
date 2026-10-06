import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CveAssetsResponse, VulnDto, VulnStatusValue } from '@/lib/types';

export const useVulns = () => useQuery({ queryKey: ['vulns'], queryFn: () => api<{ items: VulnDto[] }>('/vulns', { query: { limit: 2000 } }) });

export const useCveAssets = (cveId: string, enabled = true) =>
  useQuery({ queryKey: ['cve-assets', cveId], queryFn: () => api<CveAssetsResponse>(`/cves/${encodeURIComponent(cveId)}/assets`), enabled });

export function useSetVulnStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; status: VulnStatusValue }) => api<{ changed: number }>('/vulns/status', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vulns'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['cve-assets'] });
    },
  });
}
