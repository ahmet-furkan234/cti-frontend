import type { IocDto } from '@/lib/types';
import type { Ioc } from '@/mocks/intel';

export const toIoc = (d: IocDto): Ioc => ({
  id: d.id, type: d.type, value: d.value, source: d.source, confidence: d.confidence, expires: d.expiresAt ? d.expiresAt.slice(0, 10) : null, matches: d.matches,
});
