import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { hasAdultDeclaration } from "@/utils/studentAgeEligibility";
import { hasPublicResultSharingConsent, PUBLIC_RESULT_SHARING_VERSION, PUBLIC_RESULT_SHARING_LABEL } from "@/utils/publicResultSharing";

export default function PublicResultSharingSetting() {
  const { user, refreshUser } = useAuth();
  const [savedChoice, setSavedChoice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const enabled = savedChoice ?? hasPublicResultSharingConsent(user);

  const changeSharing = async (next: boolean) => {
    if (saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await authService.setPublicResultSharing(next, PUBLIC_RESULT_SHARING_VERSION);
      setSavedChoice(next);
      setMessage(next ? "Paylaşım izniniz kaydedildi." : "Paylaşım izniniz kaldırıldı. Sonuçlarınız artık açık listede gösterilmez.");
      await refreshUser();
    } catch {
      setError("Değişiklik kaydedilemedi. Lütfen yeniden deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="public-sharing-title" className="rounded-xl border border-[var(--tm-border-subtle)] bg-white p-6">
      <h2 id="public-sharing-title" className="text-lg font-semibold text-[var(--tm-text-primary)]">Sonuç paylaşımı</h2>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium leading-6 text-[var(--tm-text-primary)]">
        <input type="checkbox" checked={enabled} disabled={saving || (!enabled && !hasAdultDeclaration(user))} onChange={event => void changeSharing(event.target.checked)} aria-describedby="profile-sharing-description" className="mt-1 h-4 w-4 shrink-0 accent-[var(--tm-accent)]" />
        {PUBLIC_RESULT_SHARING_LABEL}
      </label>
      <p id="profile-sharing-description" className="mt-2 max-w-3xl text-sm leading-6 text-[var(--tm-text-secondary)]">
        İzin verdiğinizde adınız, fotoğrafınız, test türünüz, puanınız ve tarihiniz açık listede görünür. Ses ve cevaplarınız paylaşılmaz. İsteğe bağlıdır; izni kaldırınca listeden çıkarsınız, raporlarınız hesabınızda kalır.
      </p>
      <p role="status" className={`${saving || message ? "mt-3" : ""} text-sm leading-6 text-[var(--tm-text-secondary)]`}>{saving ? "Kaydediliyor…" : message}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
