import { useEffect } from "react";
import { Navigate } from "react-router";
import { getLegalLanguage, LEGAL_DOCUMENTS_AVAILABLE, LEGAL_DOCUMENTS_PUBLISHED, LEGAL_OPERATOR, LEGAL_VERSION, PRIVACY_DOCUMENT_VERSION, type LegalLanguage } from "@/config/legal";
import { SUPPORT_TELEGRAM_USERNAME, SUPPORT_TELEGRAM_URL } from "@/config/support";
import { LegalLinks } from "@/components/legal-links";
import { privacyDocument, privacyDocumentUz, termsDocument, termsDocumentUz } from "./legal-content";

const documents = {
  tr: { privacy: privacyDocument, terms: termsDocument },
  uz: { privacy: privacyDocumentUz, terms: termsDocumentUz },
};
const pageCopy = {
  tr: {
    home: "TurkishMock ana sayfası",
    language: "Belge dili",
    draftTitle: "İnceleme için taslak — henüz yürürlükte değil.",
    draftBody: "Bu sayfa yalnızca inceleme amacıyla gösterilir. Henüz hizmette yürürlükte olan bir metin değildir.",
    updatedDate: "Son güncelleme: 10 Ekim 2026",
    sections: "Sayfa bölümleri",
    contents: "İçindekiler",
    contact: "Şirket bilgileri ve iletişim",
    provider: "Hizmet sağlayıcı",
    taxId: "Vergi kimlik no (STIR)",
    email: "E-posta",
    phone: "Telefon",
    login: "Giriş yap",
  },
  uz: {
    home: "TurkishMock bosh sahifasi",
    language: "Hujjat tili",
    draftTitle: "Ko‘rib chiqish uchun loyiha — hali kuchga kirmagan.",
    draftBody: "Ushbu sahifa faqat ko‘rib chiqish uchun ko‘rsatilgan. Bu matn xizmatda hali kuchga kirmagan.",
    updatedDate: "Yangilangan sana: 10-oktabr 2026",
    sections: "Sahifa bo‘limlari",
    contents: "Mundarija",
    contact: "Rekvizitlar va aloqa",
    provider: "Xizmat ko‘rsatuvchi",
    taxId: "STIR",
    email: "E-pochta",
    phone: "Telefon",
    login: "Hisobga kirish",
  },
};

export default function LegalPage({ document, language = getLegalLanguage(typeof window === "undefined" ? "" : window.location.search) }: { document: "privacy" | "terms"; language?: LegalLanguage }) {
  const content = documents[language][document];
  const copy = pageCopy[language];
  const path = document === "privacy" ? "/privacy-policy" : "/terms-of-service";
  useEffect(() => {
    const previous = window.document.title;
    const previousLanguage = window.document.documentElement.lang;
    window.document.title = `${content.title} · TurkishMock`;
    window.document.documentElement.lang = language;
    window.scrollTo(0, 0);
    return () => {
      window.document.title = previous;
      window.document.documentElement.lang = previousLanguage;
    };
  }, [content.title, language]);
  if (!LEGAL_DOCUMENTS_AVAILABLE) return <Navigate to="/" replace />;
  return (
    <div lang={language} className="min-h-screen bg-white text-[#262626]">
      <header className="border-b border-[var(--tm-border-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/" aria-label={copy.home}><img src="/logo11.svg" alt="TurkishMock" className="h-9 w-auto" /></a>
          <LegalLinks language={language} className="text-sm text-[#262626]" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label={copy.language} className="mb-6 ml-auto flex w-fit items-center gap-1 rounded-lg border border-[var(--tm-border-subtle)] p-1 text-sm">
          {([{ code: "tr", label: "Türkçe" }, { code: "uz", label: "O‘zbekcha" }] as const).map(({ code, label }) => (
            <a key={code} href={`${path}?lang=${code}`} hrefLang={code} lang={code} aria-current={language === code ? "page" : undefined}
              className={`rounded-md border px-4 py-2 font-medium text-[#262626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)] ${language === code ? "border-[#c9c8c4] bg-[#efefed]" : "border-transparent hover:bg-[#f7f7f5]"}`}>
              {label}
            </a>
          ))}
        </nav>
        {!LEGAL_DOCUMENTS_PUBLISHED && (
          <aside role="note" className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-[#262626]">
            <strong>{copy.draftTitle}</strong>
            <p>{copy.draftBody}</p>
          </aside>
        )}
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-[#262626]">TurkishMock · {LEGAL_OPERATOR.name}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mt-4 text-base leading-7 text-[#262626]">{content.introduction}</p>
          <p className="mt-3 text-sm text-[#262626]">{document === "privacy" ? (language === "uz" ? "Yangilangan sana: 13-oktabr 2026" : "Son güncelleme: 13 Ekim 2026") : copy.updatedDate} · {document === "privacy" ? PRIVACY_DOCUMENT_VERSION : LEGAL_VERSION}</p>
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={copy.sections} className="rounded-lg border border-[var(--tm-border-subtle)] p-4 lg:sticky lg:top-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#262626]">{copy.contents}</p>
            <ol className="space-y-2.5 text-sm leading-5 text-[#262626]">
              {content.sections.map(section => <li key={section.id}><a className="rounded-sm hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2" href={`#${section.id}`}>{section.title}</a></li>)}
            </ol>
          </nav>
          <article className="max-w-3xl">
            {content.sections.map(section => (
              <section key={section.id} id={section.id} className="mb-9 scroll-mt-6">
                <h2 className="mb-3 text-xl font-semibold tracking-tight">{section.title}</h2>
                {section.paragraphs.map(paragraph => <p key={paragraph} className="mb-3 text-[15px] leading-7 text-[#262626]">{paragraph}</p>)}
                {section.items && <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-[#262626]">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
                {section.details && (
                  <details className="mt-4 rounded-lg border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-page)] text-[15px] leading-7">
                    <summary className="cursor-pointer rounded-lg px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)]">{section.details.title}</summary>
                    <div className="px-4 pb-4 text-[#262626]">
                      <ul className="mb-4 list-disc space-y-2 pl-5">{section.details.items.map(item => <li key={item}>{item}</li>)}</ul>
                      {section.details.paragraphs.map(paragraph => <p key={paragraph} className="mt-3">{paragraph}</p>)}
                    </div>
                  </details>
                )}
              </section>
            ))}
            <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-page)] p-5" aria-labelledby="operator-details">
              <h2 id="operator-details" className="text-lg font-semibold">{copy.contact}</h2>
              <dl className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt className="text-[#262626]">{copy.provider}</dt><dd>{LEGAL_OPERATOR.name}</dd>
                <dt className="text-[#262626]">{copy.taxId}</dt><dd>{LEGAL_OPERATOR.taxId}</dd>
                <dt className="text-[#262626]">{copy.email}</dt><dd><a className="break-all underline underline-offset-4" href={`mailto:${LEGAL_OPERATOR.email}`}>{LEGAL_OPERATOR.email}</a></dd>
                <dt className="text-[#262626]">{copy.phone}</dt><dd><a className="underline underline-offset-4" href={`tel:${LEGAL_OPERATOR.phone}`}>{LEGAL_OPERATOR.phone}</a></dd>
                <dt className="text-[#262626]">Telegram</dt><dd><a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">@{SUPPORT_TELEGRAM_USERNAME}</a></dd>
              </dl>
            </section>
          </article>
        </div>
      </main>
      <footer className="border-t border-[var(--tm-border-subtle)] px-5 py-6 text-sm text-[#262626]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4"><span>© {new Date().getFullYear()} TurkishMock · {LEGAL_OPERATOR.name}</span><a href="/login" className="hover:text-[#262626]">{copy.login}</a></div>
      </footer>
    </div>
  );
}
