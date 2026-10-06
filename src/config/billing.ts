export type BillingAccessMode = "coin" | "subscription";

// Production is subscription-only. The preserved coin UI can be opened explicitly in development.
export const billingAccessMode: BillingAccessMode =
  import.meta.env.DEV && import.meta.env.VITE_BILLING_ACCESS_MODE === "coin"
    ? "coin" : "subscription";

export const isSubscriptionBillingEnabled = billingAccessMode === "subscription";
