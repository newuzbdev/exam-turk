// Published document version must match the backend acceptance receipt.
export const LEGAL_DOCUMENTS_PUBLISHED = true;
export const LEGAL_DOCUMENTS_AVAILABLE = import.meta.env.DEV || LEGAL_DOCUMENTS_PUBLISHED || import.meta.env.VITE_LEGAL_DRAFT_PREVIEW === "true";
export const LEGAL_VERSION = "2026-10-10";
export const PRIVACY_DOCUMENT_VERSION = "2026-10-13";
export type LegalLanguage = "tr" | "uz";

export function getLegalLanguage(search: string): LegalLanguage {
  return new URLSearchParams(search).get("lang") === "uz" ? "uz" : "tr";
}
export const LEGAL_OPERATOR = {
  name: '“EDU WAY” MChJ',
  taxId: "312273904",
  registeredAt: "11.07.2025",
  registrationNumber: "2877257",
  email: "turkishmockdestek@gmail.com",
  phone: "+998990438172",
};
export const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Gizlilik Politikası", labelUz: "Maxfiylik siyosati" },
  { href: "/terms-of-service", label: "Kullanım Şartları", labelUz: "Foydalanish shartlari" },
] as const;

export function isPublicLegalPath(pathname: string) {
  return LEGAL_DOCUMENTS_AVAILABLE && LEGAL_LINKS.some(({ href }) => pathname === href || pathname === `${href}/`);
}
