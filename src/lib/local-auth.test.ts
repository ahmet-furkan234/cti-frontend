import { afterEach, expect, it, vi } from 'vitest';
import { canSkipLogin, isLocalSession, setLocalSession } from './local-auth';

afterEach(() => {
  setLocalSession(false);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('allows local development and clears the preview on logout', () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  expect(canSkipLogin()).toBe(true);
  setLocalSession(true);
  expect(isLocalSession()).toBe(true);
  setLocalSession(false);
  expect(isLocalSession()).toBe(false);
});

it('rejects production even on localhost with a stored preview flag', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  vi.stubGlobal('sessionStorage', { getItem: () => '1', removeItem: () => {} });
  setLocalSession(true);
  expect(canSkipLogin()).toBe(false);
  expect(isLocalSession()).toBe(false);
});

it('rejects nonlocal hosts during development', () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubGlobal('window', { location: { hostname: 'cti.example.com' } });
  setLocalSession(true);
  expect(isLocalSession()).toBe(false);
});

it('allows explicitly configured network hosts only in development', () => {
  vi.stubEnv('NEXT_PUBLIC_PREVIEW_HOSTS', '192.168.212.55, 100.101.20.124');
  vi.stubEnv('NODE_ENV', 'development');
  for (const hostname of ['192.168.212.55', '100.101.20.124']) {
    vi.stubGlobal('window', { location: { hostname } });
    expect(canSkipLogin()).toBe(true);
  }
  vi.stubGlobal('window', { location: { hostname: '192.168.212.56' } });
  expect(canSkipLogin()).toBe(false);
  vi.stubGlobal('window', { location: { hostname: '100.101.20.124' } });
  vi.stubEnv('NODE_ENV', 'production');
  expect(canSkipLogin()).toBe(false);
});
