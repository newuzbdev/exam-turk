import { useState } from "react";
import coverVariants from "@/data/practice-cover-variants.json";

type CoverEntry = {
  scope: string;
  identities: string[];
  originalWidth: number;
  originalHeight: number;
  variants: { width: number; height: number; src?: string }[];
};

const registry: Record<string, CoverEntry> = coverVariants;

function descriptor(value: string, depth = 0): { key: string; scope: string } | null {
  if (depth > 2) return null;
  try {
    const parts = value.split(".");
    if (parts[1] !== "v1" || !parts[2]) return null;
    const data = JSON.parse(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")));
    if (parts[0] === "pma") return descriptor(data.reference, depth + 1);
    return parts[0] === "pmr" && typeof data.key === "string" && typeof data.scope === "string"
      ? { key: data.key, scope: data.scope } : null;
  } catch {
    return null;
  }
}

// A new/replaced cover must use its new image, not an old optimized copy.
export function practiceCoverSources(practiceId: string, src: string) {
  const entry = registry[practiceId];
  if (!entry) return null;
  let identity: string | undefined;
  let scope: string | undefined;
  let mediaUrl: URL | undefined;
  try {
    if (src.startsWith("/generated/")) {
      identity = src;
      scope = "PUBLIC";
    } else {
      const url = new URL(src, "http://localhost");
      const marker = "/api/file/media/";
      const reference = url.pathname.includes(marker)
        ? decodeURIComponent(url.pathname.split(marker)[1]) : src;
      const original = descriptor(reference);
      identity = original?.key;
      scope = original?.scope;
      if (url.pathname.includes(marker)) mediaUrl = url;
    }
  } catch {
    return null;
  }
  if (!identity || scope !== entry.scope || !entry.identities.includes(identity)) return null;
  if (entry.scope !== "PUBLIC" && !mediaUrl) return null;
  const variants = entry.variants.map((variant) => {
    if (entry.scope === "PUBLIC") return { width: variant.width, src: variant.src! };
    const url = new URL(mediaUrl!.href);
    url.searchParams.set("cardWidth", String(variant.width));
    return { width: variant.width, src: url.href };
  });
  // Keep the original for error recovery, not as a high-density card candidate.
  return {
    src: variants.find((variant) => variant.width >= 960)?.src ?? variants[variants.length - 1].src,
    srcSet: variants.map((variant) => `${variant.src} ${variant.width}w`).join(", "),
    width: entry.originalWidth,
    height: entry.originalHeight,
  };
}

export default function PracticeCoverImage({ practiceId, src, alt }: {
  practiceId: string; src: string; alt: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sources = failedSource === src ? null : practiceCoverSources(practiceId, src);
  return <img
    src={sources?.src ?? src}
    srcSet={sources?.srcSet}
    sizes={sources ? "auto, (min-width: 1024px) 340px, (min-width: 640px) calc((100vw - 68px) / 2), calc(100vw - 40px)" : undefined}
    width={sources?.width}
    height={sources?.height}
    alt={alt}
    loading="lazy"
    decoding="async"
    className="h-full w-full object-cover"
    onError={sources ? () => setFailedSource(src) : undefined}
  />;
}
