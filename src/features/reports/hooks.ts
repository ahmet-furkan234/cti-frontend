import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReportRunDto, ReportScheduleDto } from '@/lib/types';

export const useReportRuns = () =>
  useQuery({
    queryKey: ['report-runs'],
    queryFn: () => api<{ items: ReportRunDto[] }>('/reports/runs'),
    refetchInterval: (q) => (q.state.data?.items.some((r) => r.status === 'generating') ? 2_000 : false),
  });
export const useReportSchedules = () => useQuery({ queryKey: ['report-schedules'], queryFn: () => api<{ items: ReportScheduleDto[] }>('/reports/schedules') });

export type ScheduleBody = Omit<ReportScheduleDto, 'id'>;
export interface GenerateBody {
  template: ReportRunDto['template'];
  scope: string | null;
  formats: 'csv'[];
  periodDays: number;
  recipients: string[];
}

export function useReportMutations() {
  const qc = useQueryClient();
  const refresh = (key: string) => () => void qc.invalidateQueries({ queryKey: [key] });
  return {
    generate: useMutation({ mutationFn: (body: GenerateBody) => api<ReportRunDto>('/reports/runs', { method: 'POST', body }), onSuccess: refresh('report-runs') }),
    retry: useMutation({ mutationFn: (id: string) => api<ReportRunDto>(`/reports/runs/${id}/retry`, { method: 'POST' }), onSuccess: refresh('report-runs') }),
    createSchedule: useMutation({ mutationFn: (body: ScheduleBody) => api<ReportScheduleDto>('/reports/schedules', { method: 'POST', body }), onSuccess: refresh('report-schedules') }),
    updateSchedule: useMutation({
      mutationFn: ({ id, ...body }: Partial<ScheduleBody> & { id: string }) => api<ReportScheduleDto>(`/reports/schedules/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh('report-schedules'),
    }),
    deleteSchedule: useMutation({ mutationFn: (id: string) => api(`/reports/schedules/${id}`, { method: 'DELETE' }), onSuccess: refresh('report-schedules') }),
  };
}

/** Downloads a ready report; the token travels in a header, so the file is fetched and saved from memory. */
export async function downloadReport(id: string): Promise<void> {
  const { getAccessToken } = await import('@/lib/api');
  const res = await fetch(`/api/v1/reports/runs/${id}/download`, { headers: { authorization: `Bearer ${getAccessToken() ?? ''}` } });
  if (!res.ok) throw new Error(String(res.status));
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'report.csv';
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
