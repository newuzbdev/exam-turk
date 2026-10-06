import type { AccessTarget } from "./access.service";
import type { OwnedPackage, PackageOffer } from "./billing.service";
const practiceLabels: Record<string, string> = {
  PRACTICE_READING: "Okuma Pratiği",
  PRACTICE_LISTENING: "Dinleme Pratiği",
  PRACTICE_WRITING: "Yazma Pratiği",
  PRACTICE_SPEAKING: "Konuşma Pratiği",
};
export function visibleOffers(
  offers: PackageOffer[],
  activeMembership: boolean,
) {
  return offers
    .filter((o) => o.terms.saleMode !== "MEMBERSHIP_ADD_ON" || activeMembership)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.packageId.localeCompare(b.packageId),
    );
}
export function renewalConfirmation(
  offer: PackageOffer,
  activeMembership: boolean,
) {
  return offer.terms.kind === "MEMBERSHIP" && activeMembership
    ? `Yeni ödeme ${offer.terms.periodDays} günlük dönemi hemen başlatır ve mevcut üyelik haklarını bu paketle değiştirir. Kalan günler ve haklar eklenmez. Devam etmek istiyor musunuz?`
    : null;
}
export function offerBenefits(offer: PackageOffer) {
  const t = offer.terms;
  return [
    t.standardMockAccess
      ? "Standart Okuma ve Dinleme Mock Testleri sınırsız"
      : null,
    ...t.practiceScopes.map((s) => practiceLabels[s]),
    t.quotas.PRACTICE_AI
      ? `${t.quotas.PRACTICE_AI} ortak Pratik değerlendirmesi`
      : null,
    t.quotas.MOCK_WRITING
      ? `${t.quotas.MOCK_WRITING} Yazma Mock değerlendirmesi`
      : null,
    t.quotas.MOCK_SPEAKING
      ? `${t.quotas.MOCK_SPEAKING} Konuşma Mock değerlendirmesi`
      : null,
    t.attemptLimit ? `${t.attemptLimit} Mock çözme hakkı` : null,
    t.lessonIds.length ? `${t.lessonIds.length} ders` : null,
  ].filter((s): s is string => !!s);
}
export function lessonsAvailable(visible: boolean, purchases: OwnedPackage[]) {
  return (
    visible ||
    purchases.some(
      (p) => p.status === "ACTIVE" && p.snapshot.terms.lessonIds.length > 0,
    )
  );
}
export function remainingPurchaseLabel(p: OwnedPackage) {
  return p.snapshot.terms.kind === "PRACTICE_PASS"
    ? `${p.remainingPractice} Pratik değerlendirmesi`
    : `${p.remainingAttempts} Mock çözme hakkı`;
}
export function eligibleMockPurchases(
  purchases: OwnedPackage[],
  targets: AccessTarget[],
) {
  return targets.length
    ? purchases.filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.remainingAttempts > 0 &&
          p.snapshot.terms.mockSelections.some((s) =>
            targets.every((t) =>
              s.sections.some(
                (v) => v.scope === t.scope && v.targetId === t.targetId,
              ),
            ),
          ),
      )
    : [];
}
