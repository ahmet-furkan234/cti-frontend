'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/auth-provider';
import { Icon, Kbd, cx, type IconName } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { api } from '@/lib/api';
import { isLocalSession } from '@/lib/local-auth';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useDebounced } from '@/lib/use-debounced';
import type { AssetListResponse, CveSearchResponse, RuleDto, Role, UserListResponse, WatchlistDto } from '@/lib/types';
import { ADMIN, MAIN } from './sidebar';

type Group = 'pages' | 'assets' | 'users' | 'cves' | 'rules' | 'watchlists' | 'roles';
interface Hit {
  key: string;
  group: Group;
  icon: IconName;
  title: string;
  sub?: string;
  href: string;
  /** what the row offers beyond opening it, e.g. "Edit" for people who may change it */
  action?: MessageKey;
}

const GROUP_LABEL: Record<Group, MessageKey> = {
  pages: 'search.g.pages', assets: 'search.g.assets', users: 'search.g.users', cves: 'search.g.cves',
  rules: 'search.g.rules', watchlists: 'search.g.watchlists', roles: 'search.g.roles',
};
const MIN_CHARS = 2;
const PER_GROUP = 5;
const has = (text: string | null | undefined, term: string) => !!text && text.toLowerCase().includes(term);

/** One search box for everything the signed-in user may open: pages, their company's assets and people, CVEs and settings. */
export function GlobalSearch() {
  const { t } = useI18n();
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const term = useDebounced(q.trim(), 250);
  const searching = open && term.length >= MIN_CHARS && !isLocalSession();
  const live = (allowed: boolean) => searching && allowed;
  const lower = term.toLowerCase();

  const assets = useQuery({
    queryKey: ['search', 'assets', term], enabled: live(can(P.ASSET_READ)), staleTime: 15_000,
    queryFn: () => api<AssetListResponse>('/assets', { query: { q: term, tab: 'all', sort: 'risk', page: 1, pageSize: PER_GROUP } }),
  });
  const users = useQuery({
    queryKey: ['search', 'users', term], enabled: live(can(P.USER_READ)), staleTime: 15_000,
    queryFn: () => api<UserListResponse>('/users', { query: { q: term, page: 1, pageSize: PER_GROUP } }),
  });
  const cves = useQuery({
    queryKey: ['search', 'cves', term], enabled: live(can(P.CVE_READ)), staleTime: 15_000,
    queryFn: () => api<CveSearchResponse>('/cves', { query: { q: term, limit: PER_GROUP, sort: 'published', order: 'desc' } }),
  });
  // Short lists that are filtered here; they share the cache with the pages that show them.
  const rules = useQuery({ queryKey: ['alert-rules'], enabled: live(can(P.ALERT_READ)), queryFn: () => api<{ items: RuleDto[] }>('/alerts/rules') });
  const watchlists = useQuery({ queryKey: ['watchlists'], enabled: live(can(P.INTEL_READ)), queryFn: () => api<{ items: WatchlistDto[] }>('/intel/watchlists') });
  const roles = useQuery({ queryKey: ['roles'], enabled: live(can(P.ROLE_READ)), queryFn: () => api<Role[]>('/roles') });

  const hits = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    const allowedPages = [...MAIN, ...ADMIN].filter((p) => !p.needs || can(...p.needs));
    const pages = term.length < MIN_CHARS ? allowedPages : allowedPages.filter((p) => has(t(p.label), lower));
    for (const p of pages.slice(0, term.length < MIN_CHARS ? 20 : PER_GROUP)) out.push({ key: `p-${p.id}`, group: 'pages', icon: p.icon, title: t(p.label), href: p.href });
    if (term.length < MIN_CHARS) return out;

    for (const a of assets.data?.items ?? []) {
      out.push({ key: `a-${a.id}`, group: 'assets', icon: 'assets', title: a.name, sub: [a.addr, a.env].filter(Boolean).join(' · '), href: `/assets/${a.id}`, ...(can(P.ASSET_WRITE) ? { action: 'search.edit' as const } : {}) });
    }
    for (const u of users.data?.items ?? []) {
      out.push({ key: `u-${u.id}`, group: 'users', icon: 'users', title: u.name, sub: u.email, href: `/admin/users/${u.id}`, ...(can(P.USER_UPDATE) ? { action: 'search.edit' as const } : {}) });
    }
    for (const c of cves.data?.items ?? []) {
      out.push({ key: `c-${c.id}`, group: 'cves', icon: 'search', title: c.id, sub: c.description.slice(0, 90), href: `/cves/${c.id}` });
    }
    for (const r of (rules.data?.items ?? []).filter((x) => has(x.name, lower)).slice(0, PER_GROUP)) {
      out.push({ key: `r-${r.id}`, group: 'rules', icon: 'bell', title: r.name, href: '/alerts' });
    }
    for (const w of (watchlists.data?.items ?? []).filter((x) => has(x.name, lower) || x.vendors.some((v) => has(v, lower)) || x.products.some((v) => has(v, lower))).slice(0, PER_GROUP)) {
      out.push({ key: `w-${w.id}`, group: 'watchlists', icon: 'intel', title: w.name, href: '/intel' });
    }
    for (const r of (roles.data ?? []).filter((x) => has(x.name, lower) || has(x.description, lower)).slice(0, PER_GROUP)) {
      out.push({ key: `ro-${r.id}`, group: 'roles', icon: 'shield', title: r.name, sub: r.description || undefined, href: '/admin/roles' });
    }
    return out;
  }, [term, lower, can, t, assets.data, users.data, cves.data, rules.data, watchlists.data, roles.data]);

  const loading = searching && [assets, users, cves].some((x) => x.isFetching);
  useEffect(() => setActive(0), [term]);
  useEffect(() => setMounted(true), []);
  // "/" (outside text fields; the CVE Explorer keeps it for its own box) and Ctrl/⌘+K open the search from anywhere.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable;
      const combo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing && pathname !== '/cves';
      if (!combo && !slash) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (hits.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) go(hit.href);
      else if (q.trim() && can(P.CVE_READ)) go(`/cves?q=${encodeURIComponent(q.trim())}`);
    }
  };

  let lastGroup: Group | null = null;
  const empty = term.length >= MIN_CHARS && hits.length === 0 && !loading;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[10vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label={t('search.title')} className="flex max-h-[76vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={18} className="text-ink-muted" />
          <input
            ref={input}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('shell.searchPlaceholder')}
            aria-label={t('search.title')}
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="global-search-results"
            className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
          />
          {loading ? <Icon name="loader" size={16} className="animate-spin text-ink-muted" /> : null}
          <button type="button" onClick={() => setOpen(false)} className="shrink-0 border-0 bg-transparent p-0" aria-label={t('common.close')}><Kbd>Esc</Kbd></button>
        </div>

        <div ref={list} id="global-search-results" role="listbox" className="min-h-0 grow overflow-y-auto py-2">
          {hits.map((h, i) => {
            const header = h.group !== lastGroup;
            lastGroup = h.group;
            return (
              <div key={h.key}>
                {header ? <div className="px-4 pt-3 pb-1 text-xs font-medium text-ink-subtle">{t(term.length < MIN_CHARS && h.group === 'pages' ? 'search.g.goto' : GROUP_LABEL[h.group])}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(h.href)}
                  className={cx('flex w-full items-center gap-3 border-0 px-4 py-2 text-left', i === active ? 'bg-surface-2' : 'bg-transparent')}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted"><Icon name={h.icon} size={16} /></span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className={cx('truncate text-[15px] font-medium text-ink', h.group === 'cves' && 'font-mono')}>{h.title}</span>
                    {h.sub ? <span className="truncate text-sm text-ink-muted">{h.sub}</span> : null}
                  </span>
                  {h.action ? <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{t(h.action)}</span> : null}
                </button>
              </div>
            );
          })}
          {empty ? <div className="px-4 py-10 text-center text-sm text-ink-muted">{t('search.empty', { q: term })}</div> : null}
          {term.length >= MIN_CHARS && can(P.CVE_READ) ? (
            <button type="button" onClick={() => go(`/cves?q=${encodeURIComponent(term)}`)} className="mt-1 flex w-full items-center gap-2 border-0 border-t border-line bg-transparent px-4 py-3 text-left text-sm text-accent hover:bg-surface-2">
              <Icon name="search" size={14} />
              {t('search.allCves', { q: term })}
            </button>
          ) : null}
        </div>

        <div className="hidden items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-xs text-ink-subtle sm:flex">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t('search.hint.move')}</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd>{t('search.hint.open')}</span>
          <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd>{t('search.hint.close')}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-w-0 flex-1 md:max-w-md md:flex-none md:basis-md">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-line-control bg-surface pr-2 pl-3 text-left text-[15px] text-ink-subtle hover:border-line-strong"
      >
        <Icon name="search" size={16} className="text-ink-muted" />
        <span className="min-w-0 grow truncate">{t('shell.searchPlaceholder')}</span>
        <span className="hidden items-center gap-1 sm:flex"><Kbd>/</Kbd></span>
      </button>
      {open && mounted ? createPortal(modal, document.body) : null}
    </div>
  );
}
