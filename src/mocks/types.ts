/** Bilingual text for demo data. */
export interface Bi {
  tr: string;
  en: string;
}
export const bi = (tr: string, en: string = tr): Bi => ({ tr, en });
