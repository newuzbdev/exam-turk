import { useAuth } from "@/contexts/AuthContext";

// Only protected routes block on an unverified stored session.
export default function AuthConnectionError() {
  const { initialIssueVisible, checking, retryFailed, refreshUser } = useAuth();
  return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-page)] px-6">
          <div role={initialIssueVisible ? "alert" : "status"} className="max-w-sm text-center">
            {initialIssueVisible ? <>
            <h1 className="text-lg font-semibold text-[var(--tm-text-primary)]">Hesabınıza şu anda ulaşılamıyor.</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
              Oturumunuz silinmedi. Bağlantı kurulunca kaldığınız yerden devam edebilirsiniz.
            </p>
            <button type="button" disabled={checking} onClick={() => void refreshUser(true)}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {checking ? "Kontrol ediliyor…" : "Tekrar dene"}
            </button>
            <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-[var(--tm-text-secondary)]">
              {retryFailed ? "Bağlantı hâlâ kurulamadı. Otomatik olarak yeniden deneyeceğiz." : "Bağlantı otomatik olarak yeniden denenecek."}
            </p>
            </> : <div className="flex items-center gap-2 text-sm text-[var(--tm-text-secondary)]">
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Hesabınıza bağlanılıyor…
            </div>}
          </div>
        </main>
  );
}
