import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AuditResponse, EffectivePermission, PermissionDef, PermissionOverride, Role, SyncSource, SyncState, UserDetail, UserListResponse,
} from '@/lib/types';

export interface UserFilters {
  q?: string;
  status?: 'active' | 'disabled';
  roleId?: string;
  page: number;
  pageSize: number;
}

export const useUsers = (filters: UserFilters, enabled = true) =>
  useQuery({ queryKey: ['users', filters], queryFn: () => api<UserListResponse>('/users', { query: { ...filters } }), enabled, placeholderData: (prev) => prev });

export const useUser = (id: string, enabled = true) =>
  useQuery({ queryKey: ['user', id], queryFn: () => api<UserDetail>(`/users/${id}`), enabled });

export const useEffectivePermissions = (id: string, enabled = true) =>
  useQuery({ queryKey: ['user', id, 'effective'], queryFn: () => api<{ permissions: EffectivePermission[] }>(`/users/${id}/effective-permissions`), enabled });

export const useRoles = (enabled = true) => useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('/roles'), enabled });

export const usePermissionCatalog = (enabled = true) =>
  useQuery({ queryKey: ['permission-catalog'], queryFn: () => api<PermissionDef[]>('/permissions'), enabled, staleTime: 5 * 60_000 });

export function useUserMutations(id?: string) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['users'] });
    if (id) void qc.invalidateQueries({ queryKey: ['user', id] });
  };
  return {
    update: useMutation({
      mutationFn: (body: { name?: string; status?: 'active' | 'disabled'; roleIds?: string[] }) => api(`/users/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
    setOverrides: useMutation({
      mutationFn: (overrides: PermissionOverride[]) => api(`/users/${id}/permissions`, { method: 'PUT', body: { overrides } }),
      onSuccess: refresh,
    }),
    revokeSessions: useMutation({ mutationFn: () => api(`/users/${id}/revoke-sessions`, { method: 'POST' }) }),
    issueReset: useMutation({ mutationFn: () => api<{ expiresAt: string; resetUrl: string }>(`/users/${id}/reset-password`, { method: 'POST' }) }),
  };
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; roleIds: string[] }) => api<{ email: string; expiresAt: string; inviteUrl: string }>('/users/invite', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useRoleMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['roles'] });
    void qc.invalidateQueries({ queryKey: ['users'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: { name: string; description: string; permissionKeys: string[] }) => api<Role>('/roles', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string; permissionKeys?: string[] }) => api<Role>(`/roles/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/roles/${id}`, { method: 'DELETE' }), onSuccess: refresh }),
  };
}

export interface AuditFilters {
  action?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

export const useAudit = (filters: AuditFilters, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['audit', filters],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<AuditResponse>('/audit', { query: { ...filters, limit: 50, cursor: pageParam } }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useSyncStates = (enabled = true) =>
  useQuery({
    queryKey: ['sync'],
    queryFn: () => api<SyncState[]>('/sync'),
    enabled,
    // Poll faster while something is running or queued.
    refetchInterval: (q) => (q.state.data?.some((s) => s.status === 'running' || s.runRequestedAt) ? 3_000 : 30_000),
  });

export function useRunSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (source: SyncSource) => api(`/sync/${source}/run`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sync'] }),
  });
}
