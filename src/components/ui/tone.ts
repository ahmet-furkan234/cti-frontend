import type { Severity } from '@/lib/severity';

/* Tailwind only sees complete class names, so every severity variant is spelled out here. */
export const TONE_BG: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
  none: 'bg-neutral',
};
export const TONE_STROKE: Record<Severity, string> = {
  critical: 'stroke-critical',
  high: 'stroke-high',
  medium: 'stroke-medium',
  low: 'stroke-low',
  none: 'stroke-neutral',
};
export const TONE_TEXT: Record<Severity, string> = {
  critical: 'text-critical-ink',
  high: 'text-high-ink',
  medium: 'text-medium-ink',
  low: 'text-low-ink',
  none: 'text-ink-muted',
};
/** Soft pill: tinted background + readable ink. */
export const TONE_SOFT: Record<Severity, string> = {
  critical: 'bg-critical-soft text-critical-ink',
  high: 'bg-high-soft text-high-ink',
  medium: 'bg-medium-soft text-medium-ink',
  low: 'bg-low-soft text-low-ink',
  none: 'bg-neutral-soft text-neutral-ink',
};
