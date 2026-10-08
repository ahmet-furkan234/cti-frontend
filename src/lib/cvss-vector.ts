import type { MessageKey } from '@/i18n';

export type Tone = 'hi' | 'mid' | 'ok';
type Values = Record<string, Tone>;
type GroupId = 'exploit' | 'scope' | 'impact' | 'vuln' | 'sub' | 'threat';

/** Tones read from the defender's side: `hi` makes the attacker's life easy or the damage large. */
const CIA: Values = { H: 'hi', L: 'mid', N: 'ok' };
const CIA2: Values = { C: 'hi', P: 'mid', N: 'ok' };
const NONE_LOW_HIGH: Values = { N: 'hi', L: 'mid', H: 'ok' };

const LAYOUT: Record<'2' | '3' | '4', [GroupId, Record<string, Values>][]> = {
  '2': [
    ['exploit', { AV: { N: 'hi', A: 'mid', L: 'ok' }, AC: { L: 'hi', M: 'mid', H: 'ok' }, Au: { N: 'hi', S: 'mid', M: 'ok' } }],
    ['impact', { C: CIA2, I: CIA2, A: CIA2 }],
  ],
  '3': [
    ['exploit', { AV: { N: 'hi', A: 'mid', L: 'ok', P: 'ok' }, AC: { L: 'hi', H: 'ok' }, PR: NONE_LOW_HIGH, UI: { N: 'hi', R: 'ok' } }],
    ['scope', { S: { U: 'ok', C: 'mid' } }],
    ['impact', { C: CIA, I: CIA, A: CIA }],
  ],
  '4': [
    ['exploit', { AV: { N: 'hi', A: 'mid', L: 'ok', P: 'ok' }, AC: { L: 'hi', H: 'ok' }, AT: { N: 'hi', P: 'ok' }, PR: NONE_LOW_HIGH, UI: { N: 'hi', P: 'mid', A: 'ok' } }],
    ['vuln', { VC: CIA, VI: CIA, VA: CIA }],
    ['sub', { SC: CIA, SI: CIA, SA: CIA }],
    ['threat', { E: { X: 'ok', A: 'hi', P: 'mid', U: 'ok' } }],
  ],
};

export interface DecodedMetric {
  code: string;
  value: string;
  nameKey: MessageKey;
  valueKey: MessageKey;
  /** what this value means */
  textKey: MessageKey;
  tone: Tone;
}

export interface DecodedGroup {
  id: GroupId;
  titleKey: MessageKey;
  metrics: DecodedMetric[];
}

export interface DecodedVector {
  /** "2.0", "3.0", "3.1" or "4.0" */
  version: string;
  groups: DecodedGroup[];
  /** parts we could not explain, in vector order */
  unknown: { code: string; value: string }[];
  /** every part in vector order, for the coloured one-line view */
  parts: { code: string; value: string; tone: Tone | null }[];
}

const key = (k: string) => k as MessageKey;

function detect(vector: string): { family: '2' | '3' | '4'; version: string; body: string } | null {
  const v = /^CVSS:(3\.[01]|4\.0)\/(.+)$/.exec(vector);
  if (v) return { family: v[1]!.startsWith('4') ? '4' : '3', version: v[1]!, body: v[2]! };
  // CVSS 2.0 has no prefix; AV/AC/Au open the vector.
  if (/^(\(?)AV:[LAN]\/AC:[HML]\/Au:[MSN]\//.test(vector)) return { family: '2', version: '2.0', body: vector.replace(/^\(|\)$/g, '') };
  return null;
}

/** Decodes a CVSS 2.0 / 3.x / 4.0 vector string into explained metrics; null when it is not a CVSS vector. */
export function decodeCvss(vector: string | null | undefined): DecodedVector | null {
  const found = vector ? detect(vector.trim()) : null;
  if (!found) return null;

  const layout = LAYOUT[found.family];
  const pairs = found.body.split('/').map((p) => {
    const [code = '', value = ''] = p.split(':');
    return { code, value };
  }).filter((p) => p.code && p.value);
  const toneOf = (code: string, value: string): Tone | null => {
    for (const [, metrics] of layout) if (metrics[code]?.[value]) return metrics[code][value]!;
    return null;
  };

  const groups: DecodedGroup[] = [];
  for (const [id, metrics] of layout) {
    const list: DecodedMetric[] = [];
    // Canonical order of the specification, whatever order the vector came in.
    for (const [code, values] of Object.entries(metrics)) {
      const pair = pairs.find((p) => p.code === code);
      const tone = pair ? values[pair.value] : undefined;
      if (!pair || !tone) continue;
      list.push({
        code, value: pair.value, tone,
        nameKey: key(`cvx.m.${code}`), valueKey: key(`cvx.v.${code}.${pair.value}`), textKey: key(`cvx.vd.${code}.${pair.value}`),
      });
    }
    if (list.length > 0) groups.push({ id, titleKey: key(`cvx.g.${id}`), metrics: list });
  }

  return {
    version: found.version,
    groups,
    unknown: pairs.filter((p) => toneOf(p.code, p.value) === null),
    parts: pairs.map((p) => ({ ...p, tone: toneOf(p.code, p.value) })),
  };
}
