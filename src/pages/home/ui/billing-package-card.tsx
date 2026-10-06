import { Infinity as InfinityIcon } from "lucide-react";
import { tm } from "@/components/tm";
import type { PackageOffer } from "@/services/billing.service";
import { offerBenefits } from "@/services/billing-view";
export default function BillingPackageCard({
  offer,
  activeMembership,
  busy,
  connected,
  onBuy,
}: {
  offer: PackageOffer;
  activeMembership: boolean;
  busy: boolean;
  connected: boolean;
  onBuy: () => void;
}) {
  const t = offer.terms,
    membership = t.kind === "MEMBERSHIP";
  const days = membership
    ? t.periodDays
    : t.kind === "MOCK_PASS"
      ? t.validityDays
      : t.periodDays;
  const basic = membership && t.standardMockAccess;
  const practiceHeading = [
    ...(t.practiceScopes.includes("PRACTICE_WRITING") ? ["Yazma"] : []),
    ...(t.practiceScopes.includes("PRACTICE_SPEAKING") ? ["Konuşma"] : []),
  ].join(" ve ") || "Pratik";
  return (
    <article className={`${tm.card} overflow-hidden`} aria-label={t.name}>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3 lg:gap-5">
        <div className="flex min-w-0 flex-col rounded-lg border border-[var(--tm-border-subtle)] bg-white p-5">
          <h3 className="text-base font-semibold">
            {basic ? "Okuma ve Dinleme" : t.name}
          </h3>
          {basic ? (
            <>
              <p className="mt-4 text-3xl font-semibold">Sınırsız</p>
              <dl className="mt-6 space-y-3 border-t border-[var(--tm-border-subtle)] pt-4">
                {[
                  "Mock Test",
                  ...(t.practiceScopes.includes("PRACTICE_READING") &&
                  t.practiceScopes.includes("PRACTICE_LISTENING")
                    ? ["Pratik"]
                    : []),
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <dt>{label}</dt>
                    <dd>
                      <InfinityIcon className="h-5 w-5" aria-label="Sınırsız" />
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <ul className="mt-4 space-y-2 text-sm leading-6">
              {offerBenefits(offer).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {t.description && (
            <p className="mt-4 text-sm leading-6">{t.description}</p>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-lg bg-[#f2f8fd] p-5">
          <h3 className="text-base font-semibold">
            {membership ? "Yazma ve Konuşma" : t.kind === "PRACTICE_PASS" ? practiceHeading : "Pakete Dahil"}
          </h3>
          {t.quotas.PRACTICE_AI > 0 && (
            <>
              <p className="mt-4 text-3xl font-semibold">
                {t.quotas.PRACTICE_AI}
              </p>
              <p className="mt-2 text-sm font-medium">Ortak Pratik Hakkı</p>
            </>
          )}
          <dl className="mt-6 space-y-3 border-t border-[var(--tm-border-subtle)] pt-4">
            {[
              ["Yazma Mock", t.quotas.MOCK_WRITING],
              ["Konuşma Mock", t.quotas.MOCK_SPEAKING],
              ["Mock Çözme Hakkı", t.attemptLimit],
              ["Ders", t.lessonIds.length],
            ]
              .filter(([, n]) => Number(n) > 0)
              .map(([label, count]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-sm font-medium">{label}</dt>
                  <dd className="font-semibold tabular-nums">{count}</dd>
                </div>
              ))}
          </dl>
          {t.mockSelections.length > 0 && (
            <p className="mt-4 text-sm leading-6">
              Seçilen sınavlar için. Yazma ve Konuşma bölümlerinin her çözümüne
              birer değerlendirme dahildir.
            </p>
          )}
          {t.kind === "LESSON_PACKAGE" && (
            <p className="mt-4 text-sm leading-6">
              Seçilen derslere ve alıştırmalarına erişim.
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-lg bg-[var(--tm-bg-sidebar)] p-5">
          <h3 className="text-base font-semibold">
            {t.name}
          </h3>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-3xl font-semibold">
            {offer.amountUzs.toLocaleString("tr-TR")}
            <span className="text-base font-medium">so‘m</span>
          </p>
          {offer.discountUzs > 0 && (
            <p className="mt-2 text-sm">
              <del>{t.basePriceUzs.toLocaleString("tr-TR")} so‘m</del>
            </p>
          )}
          {days && (
            <p className="mt-2 text-sm">{days} gün geçerli</p>
          )}
          <button
            type="button"
            disabled={busy || !connected}
            onClick={onBuy}
            className="mt-auto flex min-h-12 w-full items-center justify-center rounded-lg bg-[#dc2626] px-3 py-3 text-base font-semibold text-white transition-colors hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] disabled:cursor-not-allowed"
          >
            {membership
              ? activeMembership
                ? "Yenile"
                : "Abone Ol"
              : "Satın Al"}
          </button>
        </div>
        {membership && (
          <div className="border-t border-[var(--tm-border-subtle)] pt-4 lg:col-span-3">
            <p className="text-sm leading-6">
              Yeni ödeme {days} günlük dönemi hemen başlatır. Kalan üyelik
              günleri ve hakları yeni döneme eklenmez. Bağımsız paketleriniz
              korunur.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
