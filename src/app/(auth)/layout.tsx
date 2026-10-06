import type { ReactNode } from 'react';
import { BrandMark } from '@/components/shell/brand';
import { AuthFooter } from '@/components/auth/auth-footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-4 py-10">
      <div className="flex items-center gap-3">
        <BrandMark large />
        <span className="text-xl font-semibold tracking-tight">CTI Web</span>
      </div>
      {children}
      <AuthFooter />
    </div>
  );
}
