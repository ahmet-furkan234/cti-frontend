import type { MessageKey } from '@/i18n';

/** Metric → value → i18n key + severity tone, for the CVSS vector breakdown tiles. */
export interface VectorMetric {
  metric: string;
  labelKey: MessageKey;
  valueKey: MessageKey;
  tone: 'hi' | 'mid' | 'ok';
}

const V3: Record<string, { label: MessageKey; values: Record<string, [MessageKey, 'hi' | 'mid' | 'ok']> }> = {
  AV: { label: 'cvss.av', values: { N: ['cvss.v.network', 'hi'], A: ['cvss.v.adjacent', 'mid'], L: ['cvss.v.local', 'ok'], P: ['cvss.v.physical', 'ok'] } },
  AC: { label: 'cvss.ac', values: { L: ['cvss.v.low', 'hi'], H: ['cvss.v.high', 'ok'] } },
  PR: { label: 'cvss.pr', values: { N: ['cvss.v.none', 'hi'], L: ['cvss.v.low', 'mid'], H: ['cvss.v.high', 'ok'] } },
  UI: { label: 'cvss.ui', values: { N: ['cvss.v.none', 'hi'], R: ['cvss.v.required', 'ok'] } },
  S: { label: 'cvss.s', values: { U: ['cvss.v.unchanged', 'ok'], C: ['cvss.v.changed', 'mid'] } },
  C: { label: 'cvss.c', values: { N: ['cvss.v.none', 'ok'], L: ['cvss.v.low', 'ok'], H: ['cvss.v.high', 'mid'] } },
  I: { label: 'cvss.i', values: { N: ['cvss.v.none', 'ok'], L: ['cvss.v.low', 'ok'], H: ['cvss.v.high', 'mid'] } },
  A: { label: 'cvss.a', values: { N: ['cvss.v.none', 'ok'], L: ['cvss.v.low', 'ok'], H: ['cvss.v.high', 'mid'] } },
};

/** Parses a CVSS 3.x vector string; returns [] for other versions/unknown input. */
export function parseCvss3(vector: string | null | undefined): VectorMetric[] {
  if (!vector || !/^CVSS:3\.[01]\//.test(vector)) return [];
  const out: VectorMetric[] = [];
  for (const part of vector.split('/').slice(1)) {
    const [metric, value] = part.split(':');
    const def = metric ? V3[metric] : undefined;
    const val = def && value ? def.values[value] : undefined;
    if (metric && def && val) out.push({ metric, labelKey: def.label, valueKey: val[0], tone: val[1] });
  }
  // Keep the canonical display order regardless of the vector's order.
  const order = Object.keys(V3);
  return out.sort((a, b) => order.indexOf(a.metric) - order.indexOf(b.metric));
}
