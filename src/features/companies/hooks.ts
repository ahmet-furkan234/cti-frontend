import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyDto, CompanyListItem, CreateCompanyResult } from '@/lib/types';

export const useCompanies = (enabled = true) =>
  useQuery({ queryKey: ['companies'], queryFn: () => api<{ items: CompanyListItem[] }>('/companies'), enabled, staleTime: 30_000 });

export function useCompanyMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['companies'] });
  return {
    create: useMutation({
      mutationFn: (body: { name: string; adminEmail?: string }) => api<CreateCompanyResult>('/companies', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; name?: string; status?: 'active' | 'suspended' }) => api<CompanyDto>(`/companies/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
  };
}
