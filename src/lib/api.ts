import { getActingCompany, setActingCompany } from './active-company';
import { isLocalSession } from './local-auth';

/**
 * Thin fetch wrapper for the CTI API (proxied through Next.js at /api/v1).
 * The access token lives in memory only; the refresh token is an httpOnly cookie
 * that the browser sends to /api/v1/auth/refresh automatically.
 */
const BASE = '/api/v1';

const HINT_KEY = 'cti_session';
let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onSessionLost: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Non-sensitive flag telling us a refresh cookie probably exists (the cookie itself is httpOnly). */
export const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true; // storage blocked: fall back to always trying
  }
};
const setSessionHint = (on: boolean) => {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* ignore */
  }
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  setSessionHint(token !== null);
};
export const getAccessToken = () => accessToken;
export const setSessionLostHandler = (fn: (() => void) | null) => {
  onSessionLost = fn;
};

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> | undefined;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = undefined;
  }
  return new ApiError(res.status, String(body?.['error'] ?? 'HTTP_ERROR'), String(body?.['message'] ?? res.statusText), body);
}

export interface SessionResponse {
  accessToken: string;
  expiresIn: number;
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        // A concurrent tab may have just rotated the cookie (server grace window) — retry once.
        if (res.status === 401 && hasSessionHint()) {
          await new Promise((r) => setTimeout(r, 250));
          const again = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
          if (again.ok) {
            const data = (await again.json()) as SessionResponse;
            accessToken = data.accessToken;
            return accessToken;
          }
        }
        accessToken = null;
        setSessionHint(false);
        return null;
      }
      const data = (await res.json()) as SessionResponse;
      accessToken = data.accessToken;
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type Query = Record<string, string | number | boolean | string[] | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry on 401 (used by login/refresh themselves). */
  noRefresh?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (isLocalSession()) {
    if (!opts.method || opts.method === 'GET') {
      const { mockRead } = await import('../mocks/cves');
      const data = mockRead(path, opts.query);
      if (data !== undefined) return data as T;
      const { mockDemoRead } = await import('../mocks/demo-api');
      const demoData = mockDemoRead(path, opts.query);
      if (demoData !== undefined) return demoData as T;
      const { mockAdminRead } = await import('../mocks/admin');
      const adminData = mockAdminRead(path, opts.query);
      if (adminData !== undefined) return adminData as T;
      if (path.startsWith('/users/')) throw new ApiError(404, 'NOT_FOUND', 'Demo kullanıcı bulunamadı.');
      if (path.startsWith('/cves/')) throw new ApiError(404, 'NOT_FOUND', 'Demo CVE bulunamadı.');
    }
    throw new ApiError(503, 'LOCAL_PREVIEW', 'Bu işlem için gerçek giriş gereklidir.');
  }
  const send = () =>
    fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(getActingCompany() ? { 'x-company-id': getActingCompany()! } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal ?? null,
    });

  let res = await send();
  if (res.status === 401 && !opts.noRefresh) {
    const fresh = await refreshSession();
    if (!fresh) {
      onSessionLost?.();
      throw await parseError(res);
    }
    res = await send();
  }
  // The company this browser last worked in no longer exists: fall back to the user's own and try again.
  if (res.status === 404 && getActingCompany() && (await res.clone().json().catch(() => null))?.error === 'INVALID_COMPANY') {
    setActingCompany(null);
    res = await send();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
