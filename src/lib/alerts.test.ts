import { describe, expect, it } from 'vitest';
import { CHANNELS, RULES } from '../mocks/alerts';
import { channelTarget, dayOfMinutesAgo, rulesAtRisk, TRIGGER_THROTTLES, TRIGGERS } from './alerts';

describe('alerts', () => {
  it('flags enabled rules that send to a failing channel', () => {
    const ids = rulesAtRisk(RULES, CHANNELS).map((r) => r.id);
    expect(ids).toContain('r-sync');
    expect(ids).not.toContain('r-digest'); // disabled
  });

  it('shows a short target per channel kind', () => {
    const slack = CHANNELS.find((c) => c.kind === 'slack')!;
    expect(channelTarget(slack)).toBe('#soc-alerts');
    expect(channelTarget(CHANNELS.find((c) => c.kind === 'smtp')!)).toBe('smtp.example.com:587');
  });

  it('labels today and yesterday and offers at least one throttle per trigger', () => {
    const now = new Date(2026, 9, 5, 12, 0);
    expect(dayOfMinutesAgo(30, now)).toBe('today');
    expect(dayOfMinutesAgo(13 * 60, now)).toBe('yesterday');
    expect(dayOfMinutesAgo(5 * 1440, now)).toBe('2026-09-30');
    for (const t of TRIGGERS) expect(TRIGGER_THROTTLES[t].length).toBeGreaterThan(0);
  });
});
