/**
 * The company a platform user is working inside (null = their own). Kept in the browser so a reload stays in the same company;
 * the API only honours it for users who may manage companies.
 */
const KEY = 'cti_company';
let current: string | null = null;

try {
  current = localStorage.getItem(KEY);
} catch {
  /* storage blocked: stay in the user's own company */
}

export const getActingCompany = (): string | null => current;

export function setActingCompany(id: string | null): void {
  current = id;
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
