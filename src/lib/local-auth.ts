const KEY = 'cti_local_auth';
let active = false;

export function canSkipLogin(): boolean {
  const previewHosts = (process.env.NEXT_PUBLIC_PREVIEW_HOSTS ?? '').split(',').map((host) => host.trim()).filter(Boolean);
  return process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '[::1]', ...previewHosts].includes(window.location.hostname);
}

export function isLocalSession(): boolean {
  if (!canSkipLogin()) return false;
  try { return active || sessionStorage.getItem(KEY) === '1'; }
  catch { return active; }
}

export function setLocalSession(enabled: boolean): void {
  active = enabled && canSkipLogin();
  try {
    if (active) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch { /* In-memory mode when storage is unavailable. */ }
}
