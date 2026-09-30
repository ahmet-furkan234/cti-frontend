import type { ReactNode } from 'react';
import { BrandMark } from '@/components/shell/brand';
import { AuthFooter } from '@/components/auth/auth-footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg">
      <div className="row gap-8" style={{ gap: 10 }}>
        <BrandMark large />
        <span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>CTI Web</span>
      </div>
      {children}
      <AuthFooter />
    </div>
  );
}
