import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { LEGAL_DOCUMENTS_AVAILABLE, LEGAL_VERSION } from "@/config/legal";
import { SUPPORT_TELEGRAM_URL } from "@/config/support";
import { AGE_DECLARATION_VERSION } from "@/utils/studentAgeEligibility";
import { PUBLIC_RESULT_SHARING_VERSION } from "@/utils/publicResultSharing";

export default function StudentAgeDeclaration() {
  const { user, refreshUser, logout } = useAuth();
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shareResults, setShareResults] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const ineligible = user?.ageStatus === "INELIGIBLE";
  const canSubmit = adultConfirmed && acceptedTerms && LEGAL_DOCUMENTS_AVAILABLE;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      await authService.declareAge("ADULT", AGE_DECLARATION_VERSION, {
        publicResultSharing: shareResults,
        publicResultSharingVersion: PUBLIC_RESULT_SHARING_VERSION,
        legalAccepted: acceptedTerms,
        legalVersion: LEGAL_VERSION,
      });
      await refreshUser();
    } catch {
      setError("Beyanın kaydedilemedi. Lütfen yeniden dene.");
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-page)] px-5 py-10">
      <section aria-labelledby="student-age-title" className="w-full max-w-lg rounded-2xl border border-[var(--tm-border-default)] bg-white p-6 shadow-sm sm:p-7">
        <img src="/logo11-aligned.svg" alt="TurkishMock" className="mb-6 h-9 w-auto" />
        <h1 id="student-age-title" className="text-xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
          {ineligible ? "Bu hizmet 18 yaş ve üzeri içindir" : "Devam etmek için onaylayın"}
        </h1>
        {ineligible ? (
          <div className="mt-5 text-sm leading-6 text-[var(--tm-text-secondary)]">
            <p>18 yaşından küçük olduğunu belirttiğin için test erişimin kapalı. Beyanında bir hata varsa destekle iletişime geçebilirsin.</p>
            <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noreferrer" className="mt-4 inline-block font-medium underline underline-offset-4">Destekle iletişime geç</a>
          </div>
        ) : (
          <form id="student-age-consent" onSubmit={submit} className="mt-5">
            <fieldset disabled={saving} className="space-y-3">
              <legend className="sr-only">Devam etmek için onaylar</legend>
              <label className="flex cursor-pointer items-start gap-3 py-1 text-sm leading-6 text-[var(--tm-text-primary)]">
                <input type="checkbox" name="age-declaration" value="ADULT" checked={adultConfirmed}
                  onChange={event => { setAdultConfirmed(event.target.checked); if (!event.target.checked) setShareResults(false); }} className="mt-1 h-4 w-4 shrink-0 accent-[var(--tm-accent)]" />
                <span>18 yaş ve üzerindeyim.</span>
              </label>
              <div className="flex items-start gap-3 py-1 text-sm leading-6 text-[var(--tm-text-primary)]">
                <input id="share-results" type="checkbox" checked={shareResults} onChange={event => setShareResults(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--tm-accent)]" aria-describedby="public-result-sharing-optional" />
                <div>
                  <label htmlFor="share-results" className="cursor-pointer">Sonuçlarım herkese açık paylaşılabilir.</label>{" "}
                  <span id="public-result-sharing-optional" className="text-xs text-[var(--tm-text-secondary)]">
                    (İsteğe bağlı) · <a href="/privacy-policy?lang=tr#public-results" target="_blank" rel="noreferrer" className="underline underline-offset-3">Detaylar</a>
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 py-1 text-sm leading-6 text-[var(--tm-text-primary)]">
                <input id="accept-terms" type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--tm-accent)]" disabled={!LEGAL_DOCUMENTS_AVAILABLE} />
                <label htmlFor="accept-terms" className="cursor-pointer">
                  <a href="/privacy-policy?lang=tr" target="_blank" rel="noreferrer" className="underline underline-offset-3">Gizlilik Politikası</a>’nı okudum ve <a href="/terms-of-service?lang=tr" target="_blank" rel="noreferrer" className="underline underline-offset-3">Kullanım Şartları</a>’nı kabul ediyorum.
                </label>
              </div>
            </fieldset>
            {!LEGAL_DOCUMENTS_AVAILABLE && <p className="mt-3 text-xs leading-5 text-[var(--tm-text-secondary)]">Hizmet koşulları hazırlanıyor. Şu anda kayıt işlemini tamamlayamazsınız.</p>}
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          </form>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={logout} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-lg border border-[#b8b7b3] bg-[#efefed] px-3 text-sm font-medium text-[var(--tm-text-primary)] transition-colors hover:bg-[#e4e4e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)] disabled:cursor-not-allowed disabled:opacity-40">Çıkış yap</button>
          {!ineligible && <button type="submit" form="student-age-consent" disabled={!canSubmit || saving} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--tm-accent)] px-4 text-sm font-medium text-white transition-colors enabled:hover:bg-[var(--tm-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)] disabled:cursor-not-allowed disabled:bg-[#aeaeac]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Kaydediliyor…" : "Onayla ve devam et"}
          </button>}
        </div>
      </section>
    </main>
  );
}
