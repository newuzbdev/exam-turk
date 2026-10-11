import { LEGAL_DOCUMENTS_AVAILABLE, LEGAL_LINKS, type LegalLanguage } from "@/config/legal";

export function LegalLinks({ className = "", language = "tr" }: { className?: string; language?: LegalLanguage }) {
  if (!LEGAL_DOCUMENTS_AVAILABLE) return null;
  return (
    <nav aria-label={language === "tr" ? "Hukuki bilgiler" : "Huquqiy ma’lumotlar"} className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {LEGAL_LINKS.map(({ href, label, labelUz }) => (
        <a key={href} href={language === "uz" ? `${href}?lang=uz` : href} className="rounded-sm hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tm-focus)]">
          {language === "tr" ? label : labelUz}
        </a>
      ))}
    </nav>
  );
}
