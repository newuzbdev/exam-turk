import axiosPrivate from "@/config/api";
import type { AccessTarget } from "./access.service";
export type BillingCampaign = {
  id: string;
  enabled: boolean;
  label: string;
  userLimit: number | null;
};
export type BillingCampaignState = {
  id: string;
  label: string;
  userLimit: number | null;
  claimedUsers: number;
  reservedUsers: number;
  remainingUsers: number | null;
  availableUsers: number | null;
  status: "ACTIVE" | "PAUSED" | "SCHEDULED" | "ENDED" | "SOLD_OUT" | "RESERVED" | "ALREADY_USED";
};
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
  mockUsage?: 'PER_SECTION';
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
  campaign?: BillingCampaign | null;
};
export type PackageOffer = {
  packageId: string;
  versionId: string;
  sortOrder: number;
  terms: PackageTerms;
  amountUzs: number;
  discountUzs: number;
  campaign?: BillingCampaignState | null;
};
export type OwnedPackage = {
  purchaseId: string;
  startsAt: string;
  endsAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  snapshot: PackageOffer;
  remainingAttempts: number;
  remainingPractice: number;
  singleMockProgress?: {
    selectedPackageId: string | null;
    remainingSections: AccessTarget[];
    usedSections: AccessTarget[];
  };
  lessons?: { id: string; title: string; slug: string; courseSlug: string; workbook: boolean }[];
};
const unwrap = <T>(response: { data: T | { data: T } }): T => {
  const p = response.data;
  return p && typeof p === "object" && "data" in p ? p.data : (p as T);
};
export async function preparePackageCheckout(
  packageId: string,
  expected?: { expectedAmountUzs: number; expectedVersionId: string },
) {
  return unwrap<{ intentId: string; checkoutUrl: string }>(
    await axiosPrivate.post("/api/billing/checkout", { packageId, ...expected }),
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
  async getOwnCatalog() {
    return unwrap<PackageOffer[]>(
      await axiosPrivate.get("/api/billing/catalog/me"),
    );
  },
  async getFeatures() {
    return unwrap<{ lessonsVisible: boolean }>(
      await axiosPrivate.get("/api/billing/features"),
    );
  },
  prepareCheckout: preparePackageCheckout,
};
