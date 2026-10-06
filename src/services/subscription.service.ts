import axiosPrivate from "@/config/api";

export type SubscriptionStatus = {
  billingMode: "coin" | "subscription";
  isActive: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  writingMockRemaining: number;
  speakingMockRemaining: number;
  practiceRemaining: number;
  includedAssessmentRemaining: number;
  addOnAssessmentRemaining: number;
  frozenAddOnAssessmentRemaining: number;
  totalAssessmentRemaining: number;
};

export type SubscriptionConfig = {
  billingMode: "coin" | "subscription";
  paymentConnected: boolean;
  plan: {
    periodDays: number;
    quotas: {
      MOCK_WRITING: number;
      MOCK_SPEAKING: number;
      PRACTICE_AI: number;
    };
    renewalPolicy: "RESET_IMMEDIATELY";
    baseMonthlyPriceUzs: number;
    includedAssessmentUnits: number;
    extraAssessmentUnitPriceUzs: number;
    addOnAssessmentUnitPriceUzs: number;
    maxMonthlyAssessmentUnits: number;
    maxAddOnAssessmentUnits: number;
  };
};

export const subscriptionStatusQueryKey = ["subscription", "status"] as const;

const unwrap = <T>(payload: any): T =>
  (payload?.data?.data ?? payload?.data ?? payload) as T;

export const subscriptionService = {
  async getPaymentIntent(intentId: string) {
    const response = await axiosPrivate.get(
      `/api/subscription/payment-intents/${encodeURIComponent(intentId)}`,
    );
    return unwrap<{
      intentId: string;
      status: "PENDING" | "PAID" | "CANCELLED";
      amountUzs: number;
    }>(response);
  },
  async prepareCheckout() {
    const response = await axiosPrivate.post(
      "/api/subscription/payment-intents",
    );
    return unwrap<{ intentId: string; checkoutUrl: string }>(response);
  },
  async getConfig() {
    const response = await axiosPrivate.get("/api/subscription/config");
    const config = unwrap<SubscriptionConfig>(response);
    if (!config.plan?.quotas)
      throw new Error("Membership configuration is not ready");
    return config;
  },

  async getStatus() {
    const response = await axiosPrivate.get("/api/subscription/status");
    const status = unwrap<SubscriptionStatus>(response);
    if (
      ![
        status.writingMockRemaining,
        status.speakingMockRemaining,
        status.practiceRemaining,
      ].every((value) => typeof value === "number")
    )
      throw new Error("Membership counters are not ready");
    return status;
  },
};
