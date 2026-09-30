import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  reactStrictMode: true,
  // Dev only: lets Cloudflare quick tunnels (random *.trycloudflare.com hosts) reach /_next/* dev resources such as HMR.
  allowedDevOrigins: ['*.trycloudflare.com', ...(process.env.NEXT_PUBLIC_PREVIEW_HOSTS ?? '').split(',').map((host) => host.trim()).filter(Boolean)],
  output: 'standalone',
  // The browser only talks to this origin; the API (and its httpOnly refresh cookie,
  // scoped to /api/v1/auth) is reached through this proxy, so no CORS is involved.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default config;
