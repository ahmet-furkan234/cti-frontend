/** Whole minutes since an ISO timestamp (0 when it is in the future), the unit the age labels work in. */
export const minutesSince = (iso: string | null | undefined, now = Date.now()): number =>
  iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000)) : 0;
