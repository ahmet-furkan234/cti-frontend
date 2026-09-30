export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none';
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'none'];

/** Backend `cvssSeverity` level: 0 none · 1 low · 2 medium · 3 high · 4 critical */
export const SEVERITY_BY_LEVEL: Severity[] = ['none', 'low', 'medium', 'high', 'critical'];
export const LEVEL_BY_SEVERITY: Record<Severity, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

export function severityFromScore(score: number | null | undefined): Severity {
  if (score == null || Number.isNaN(score) || score <= 0) return 'none';
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export function epssTone(v: number): Severity {
  return v >= 0.5 ? 'critical' : v >= 0.1 ? 'high' : v >= 0.01 ? 'medium' : 'low';
}

export function riskTone(score: number): Severity {
  return score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : score > 0 ? 'low' : 'none';
}

export function scorePassword(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  if (p.length < 8) s = Math.min(s, 1);
  return s;
}
