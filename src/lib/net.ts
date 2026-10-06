/** Dotted-quad IPv4 check: four 0–255 parts, no leading junk. */
export function isIPv4(value: string): boolean {
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}
