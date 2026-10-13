export type SignupAttribution = {
  source: "INSTAGRAM" | "TELEGRAM" | "GOOGLE" | "YOUTUBE" | "OTHER" | "UNKNOWN";
  medium?: "PAID" | "SOCIAL" | "ORGANIC" | "REFERRAL" | "UNKNOWN";
  campaign?: string;
};
const key = "signup-attribution:v1",
  day = 86400000;
const sources: Record<string, SignupAttribution["source"]> = {
  instagram: "INSTAGRAM",
  ig: "INSTAGRAM",
  telegram: "TELEGRAM",
  tg: "TELEGRAM",
  google: "GOOGLE",
  youtube: "YOUTUBE",
};
function fromReferrer(referrer: string) {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const matches = (domain: string) =>
      host === domain || host.endsWith("." + domain);
    if (
      matches("turkishmock.uz") ||
      host === "accounts.google.com" ||
      host === "oauth2.googleapis.com"
    )
      return "UNKNOWN";
    if (matches("instagram.com")) return "INSTAGRAM";
    if (matches("t.me") || matches("telegram.org")) return "TELEGRAM";
    if (
      ["google.com", "google.uz", "google.co.uz", "google.com.tr"].some(
        (domain) => host === domain || host === "www." + domain,
      )
    )
      return "GOOGLE";
    if (matches("youtube.com") || matches("youtu.be")) return "YOUTUBE";
    return "OTHER";
  } catch {
    return "UNKNOWN";
  }
}
export function readSignupAttribution(now = new Date()): SignupAttribution {
  try {
    const row = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      !row ||
      typeof row.expiresAt !== "number" ||
      row.expiresAt <= +now ||
      row.expiresAt > +now + day ||
      ![
        "INSTAGRAM",
        "TELEGRAM",
        "GOOGLE",
        "YOUTUBE",
        "OTHER",
        "UNKNOWN",
      ].includes(row.source)
    )
      return { source: "UNKNOWN", medium: "UNKNOWN" };
    return {
      source: row.source,
      ...(["PAID", "SOCIAL", "ORGANIC", "REFERRAL", "UNKNOWN"].includes(
        row.medium,
      )
        ? { medium: row.medium }
        : {}),
      ...(typeof row.campaign === "string" &&
      /^[a-zA-Z0-9._-]{1,80}$/.test(row.campaign)
        ? { campaign: row.campaign }
        : {}),
    };
  } catch {
    return { source: "UNKNOWN", medium: "UNKNOWN" };
  }
}
export function captureSignupAttribution(
  href: string,
  referrer: string,
  now = new Date(),
) {
  try {
    const url = new URL(href);
    if (
      sessionStorage.getItem("userId") ||
      !["/", "/login", "/signup"].includes(url.pathname)
    )
      return;
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    if (stored && stored.expiresAt > +now && stored.expiresAt <= +now + day)
      return;
    const tagged = url.searchParams.get("utm_source")?.trim().toLowerCase(),
      source = tagged ? (sources[tagged] ?? "OTHER") : fromReferrer(referrer);
    const rawMedium = url.searchParams.get("utm_medium")?.trim().toLowerCase();
    const medium =
      rawMedium &&
      ["paid", "paid_social", "cpc", "ppc", "ads"].includes(rawMedium)
        ? "PAID"
        : rawMedium === "organic"
          ? "ORGANIC"
          : rawMedium === "referral"
            ? "REFERRAL"
            : ["TELEGRAM", "INSTAGRAM", "YOUTUBE"].includes(source)
              ? "SOCIAL"
              : source === "GOOGLE"
                ? "ORGANIC"
                : "UNKNOWN";
    const rawCampaign = url.searchParams.get("utm_campaign"),
      campaign =
        rawCampaign && /^[a-zA-Z0-9._-]{1,80}$/.test(rawCampaign)
          ? rawCampaign
          : undefined;
    // Store only coarse labels. Full referrer, URL, query, fragments and auth fields never persist.
    localStorage.setItem(
      key,
      JSON.stringify({
        source,
        medium,
        ...(campaign ? { campaign } : {}),
        expiresAt: +now + day,
      }),
    );
  } catch {
    /* Blocked storage does not affect login. */
  }
}
export function clearSignupAttribution() {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Optional metadata only. */
  }
}
