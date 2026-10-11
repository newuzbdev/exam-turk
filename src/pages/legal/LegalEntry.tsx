import { Suspense, lazy } from "react";
import { MemoryRouter } from "react-router";
import { getLegalLanguage } from "@/config/legal";

const LegalPage = lazy(() => import("./LegalPage"));

// Enter legal pages without starting account recovery or loading private data.
// Links on these pages are normal anchors: entering the app starts its usual
// providers and route guards in a fresh navigation.
export function LegalEntry({ pathname }: { pathname: string }) {
  const language = getLegalLanguage(window.location.search);
  return (
    <MemoryRouter>
      <Suspense fallback={<main role="status" className="p-8">{language === "tr" ? "Sayfa açılıyor…" : "Sahifa ochilmoqda…"}</main>}>
        <LegalPage language={language} document={pathname.replace(/\/$/, "") === "/privacy-policy" ? "privacy" : "terms"} />
      </Suspense>
    </MemoryRouter>
  );
}
