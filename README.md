# cti-frontend

Next.js 16 (App Router) web app for the CTI backend. UI implements the design mockups from `../design/` and
their `ctiui` design system (tokens + components, ported to TypeScript).

```bash
npm install
cp .env.example .env.local     # API_URL=http://localhost:4000
npm run dev                    # http://localhost:3100
npm test                       # unit tests (i18n parity, CVSS parsing, highlighting …)
npm run build
```

The backend must be running (`../cti-backend`: `npm run dev`) and, for CVE data, the sync service (`../cti-sync-worker`: `npm run dev`).
The browser only talks to this origin; `/api/v1/*` is proxied to `API_URL` (see `next.config.ts`), which keeps the
httpOnly refresh cookie first-party and removes CORS from the picture.

## What is real and what is demo

| Area | Data |
|---|---|
| Login, invite registration, password reset | real (JWT access token in memory + rotating httpOnly refresh cookie) |
| Dashboard, CVE Explorer, CVE detail (overview / references / timeline) | real (NVD + KEV + EPSS from the backend) |
| Users (list, invite, detail), roles, permission matrix (RBAC + PBAC), audit log, sync status | real |
| Assets, import wizard, vulnerabilities, threat intel, alerts, reports, CVE › affected assets | **sample data** (marked "Örnek veri / Demo data") until the backend phases exist |

## Structure

```
src/app/(auth)/…     login · register (invite) · reset-password
src/app/(app)/…      authenticated shell + pages (guarded by <RequirePermission>)
src/features/*       React Query hooks per domain (cves, admin)
src/components/ui/*  design-system components (Button, DataTable, TriStateToggle, …)
src/components/*     shell, dashboard charts, CVE/admin building blocks
src/i18n/            typed tr/en messages — each key holds both translations
src/lib/             api client (silent refresh), permissions, formatting, CVSS parser
src/mocks/           demo data
src/styles/globals.css   Tailwind v4 entry: color/radius/font tokens (@theme), light + dark palettes, a few pseudo-element rules
```

Conventions: user-visible strings live in `src/i18n/messages/*` (typed keys, tr+en side by side; a test checks
placeholder parity). Language and theme are cookies (`cti_lang`, `cti_theme`) so SSR renders the right ones.
Constants that server components need (e.g. `LANG_COOKIE`) must not live in `'use client'` modules.
Permission keys mirror the backend catalog (`src/lib/permissions.ts`); the backend is always the authority.
