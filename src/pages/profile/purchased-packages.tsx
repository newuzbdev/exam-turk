import { Link } from "react-router-dom";
import { useBillingPurchases } from "@/hooks/use-billing-purchases";
import { remainingPurchaseLabel } from "@/services/billing-view";
import { tm } from "@/components/tm";
export default function PurchasedPackages() {
  const purchases = useBillingPurchases();
  return (
    <section className={`${tm.card} p-5`}>
      <h2 className="text-lg font-semibold">Satın Aldığım Paketler</h2>
      {purchases.isPending ? (
        <p role="status">Paketleriniz yükleniyor…</p>
      ) : purchases.isError ? (
        <p role="alert">
          Paketleriniz alınamadı.{" "}
          <button
            onClick={() => void purchases.refetch()}
            className="underline"
          >
            Tekrar dene
          </button>
        </p>
      ) : !purchases.data?.length ? (
        <p className="mt-3 text-sm">Henüz satın alınmış paketiniz yok.</p>
      ) : (
        <div className="mt-4 space-y-4" aria-live="polite">
          {purchases.data.map((p) => (
            <article key={p.purchaseId} className="rounded-lg bg-[#f5f5f4] p-4">
              <div className="flex justify-between gap-4">
                <h3 className="font-semibold">{p.snapshot.terms.name}</h3>
                <span className="text-sm">
                  {p.status === "ACTIVE"
                    ? "Aktif"
                    : p.status === "EXPIRED"
                      ? "Süresi doldu"
                      : "İptal edildi"}
                </span>
              </div>
              {p.endsAt && (
                <p className="mt-1 text-sm">
                  {new Date(p.endsAt).toLocaleString("tr-TR", {
                    timeZone: "Asia/Tashkent",
                  })}{" "}
                  tarihine kadar
                </p>
              )}
              {(p.snapshot.terms.attemptLimit > 0 ||
                p.snapshot.terms.kind === "PRACTICE_PASS") && (
                <p className="mt-3 font-medium">
                  Kalan: {remainingPurchaseLabel(p)}
                </p>
              )}
              {p.status === "ACTIVE" && (
                <div className="mt-3 flex gap-4 text-sm">
                  {p.snapshot.terms.attemptLimit > 0 && (
                    <Link to="/app/test" className="underline">
                      Mock Testlere Git
                    </Link>
                  )}
                  {p.snapshot.terms.kind === "PRACTICE_PASS" && (
                    <Link to="/app/pratik" className="underline">
                      Pratiğe Git
                    </Link>
                  )}
                  {p.lessons?.map(lesson => (
                    <Link key={lesson.id} to={lesson.workbook
                      ? `/app/dersler/video/${encodeURIComponent(lesson.slug)}`
                      : `/app/dersler/${encodeURIComponent(lesson.courseSlug)}/${encodeURIComponent(lesson.slug)}`} className="underline">
                      {lesson.title}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
