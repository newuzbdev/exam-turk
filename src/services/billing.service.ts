import axiosPrivate from "@/config/api";
import type { AccessTarget } from "./access.service";
export type PackageTerms = {
  kind: "MEMBERSHIP" | "MOCK_PASS" | "PRACTICE_PASS" | "LESSON_PACKAGE";
  saleMode: "STANDALONE" | "MEMBERSHIP_ADD_ON" | "BOTH";
  name: string;
  description: string;
  basePriceUzs: number;
  periodDays: number | null;
  quotas: { MOCK_WRITING: number; MOCK_SPEAKING: number; PRACTICE_AI: number };
  lessonIds: string[];
  mockSelections: { packageId?: string; sections: AccessTarget[] }[];
  standardMockAccess: boolean;
  practiceScopes: AccessTarget["scope"][];
  attemptLimit: number;
  validityDays: number | null;
  discount: null | {
    kind: "PERCENT" | "AMOUNT_UZS";
    value: number;
    startsAt: string;
    endsAt: string;
  };
};
export type PackageOffer = {
  packageId: string;
  versionId: string;
  sortOrder: number;
  terms: PackageTerms;
  amountUzs: number;
  discountUzs: number;
};
export type OwnedPackage = {
  purchaseId: string;
  startsAt: string;
  endsAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  snapshot: PackageOffer;
  remainingAttempts: number;
  remainingPractice: number;
  lessons?: { id: string; title: string; slug: string; courseSlug: string; workbook: boolean }[];
};
const unwrap = <T>(response: { data: T | { data: T } }): T => {
  const p = response.data;
  return p && typeof p === "object" && "data" in p ? p.data : (p as T);
};
export async function preparePackageCheckout(packageId: string) {
  return unwrap<{ intentId: string; checkoutUrl: string }>(
    await axiosPrivate.post("/api/billing/checkout", { packageId }),
  );
}
export const billingService = {
  async getCatalog() {
    return unwrap<PackageOffer[]>(
      await axiosPrivate.get("/api/billing/catalog"),
    );
  },
  async getOwnPurchases() {
    return unwrap<OwnedPackage[]>(await axiosPrivate.get("/api/billing/me"));
  },
  async getFeatures() {
    return unwrap<{ lessonsVisible: boolean }>(
      await axiosPrivate.get("/api/billing/features"),
    );
  },
  prepareCheckout: preparePackageCheckout,
};
