import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AlertLogDto, ChannelDto, ChannelKindValue, RuleDto } from '@/lib/types';

export const useChannels = () => useQuery({ queryKey: ['alert-channels'], queryFn: () => api<{ items: ChannelDto[] }>('/alerts/channels') });
export const useRules = () => useQuery({ queryKey: ['alert-rules'], queryFn: () => api<{ items: RuleDto[] }>('/alerts/rules') });
export const useAlertLog = () => useQuery({ queryKey: ['alert-log'], queryFn: () => api<{ items: AlertLogDto[] }>('/alerts/log') });

export type RuleBody = Omit<RuleDto, 'id' | 'lastFiredAt' | 'fired30'>;

export function useAlertMutations() {
  const qc = useQueryClient();
  const refresh = (keys: string[]) => () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
  return {
    createChannel: useMutation({
      mutationFn: (body: { kind: ChannelKindValue; name: string; values: Record<string, string> }) => api<ChannelDto>('/alerts/channels', { method: 'POST', body }),
      onSuccess: refresh(['alert-channels']),
    }),
    updateChannel: useMutation({
      mutationFn: ({ id, ...body }: { id: string; name: string; values: Record<string, string> }) => api<ChannelDto>(`/alerts/channels/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh(['alert-channels']),
    }),
    deleteChannel: useMutation({ mutationFn: (id: string) => api(`/alerts/channels/${id}`, { method: 'DELETE' }), onSuccess: refresh(['alert-channels', 'alert-rules']) }),
    testChannel: useMutation({
      mutationFn: (id: string) => api<{ ok: boolean; why: string | null; channel: ChannelDto }>(`/alerts/channels/${id}/test`, { method: 'POST' }),
      onSuccess: refresh(['alert-channels']),
    }),
    createRule: useMutation({ mutationFn: (body: RuleBody) => api<RuleDto>('/alerts/rules', { method: 'POST', body }), onSuccess: refresh(['alert-rules']) }),
    updateRule: useMutation({
      mutationFn: ({ id, ...body }: Partial<RuleBody> & { id: string }) => api<RuleDto>(`/alerts/rules/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh(['alert-rules']),
    }),
    deleteRule: useMutation({ mutationFn: (id: string) => api(`/alerts/rules/${id}`, { method: 'DELETE' }), onSuccess: refresh(['alert-rules']) }),
  };
}
