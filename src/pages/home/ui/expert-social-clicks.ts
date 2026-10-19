import { toApiUrl } from "@/config/runtime";

const recentClicks = new Map<string, number>();

export function trackExpertSocialClick(expertId: string, platform: "TELEGRAM" | "INSTAGRAM") {
  // Local previews must not add test clicks to the live counters.
  if (import.meta.env.DEV || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return;
  const key = `${expertId}:${platform}`;
  const now = Date.now();
  if (now - (recentClicks.get(key) ?? -Infinity) < 2000) return;
  recentClicks.set(key, now);
  try {
    // Best effort only: a blocked telemetry request must never block the external link.
    void fetch(toApiUrl("/api/expert-social/clicks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: crypto.randomUUID(), expertId, platform }),
      credentials: "omit",
      keepalive: true,
      referrerPolicy: "no-referrer",
    }).catch(() => {});
  } catch {
    // The normal anchor remains usable without Web Crypto or network access.
  }
}
