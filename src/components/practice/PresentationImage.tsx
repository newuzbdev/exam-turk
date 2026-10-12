import { useState, type ImgHTMLAttributes } from "react";
import staticVariants from "@/data/practice-task-image-variants.json";

type StaticCopy = { src: string; width: number; height: number };
const registry: Record<string, { full: StaticCopy; "480": StaticCopy }> = staticVariants;

function selectedSource(src: string, thumbnail: boolean): StaticCopy {
  if (src.startsWith("/") && !src.startsWith("//") && registry[src]) {
    return registry[src][thumbnail ? "480" : "full"];
  }
  if (thumbnail) {
    try {
      const url = new URL(src, "http://localhost");
      if (/^https?:$/.test(url.protocol) && /^\/api\/file\/media\/pma\.v1\.[^/]+$/.test(url.pathname)) {
        url.searchParams.set("imageWidth", "480");
        return { src: src.startsWith("/") ? url.pathname + url.search + url.hash : url.href, width: 480, height: 0 };
      }
    } catch { /* Keep unknown/external media unchanged. */ }
  }
  return { src, width: 0, height: 0 };
}

export default function PresentationImage({ src = "", thumbnail = false, onError, ...props }:
  ImgHTMLAttributes<HTMLImageElement> & { thumbnail?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const selected = failedSource === src ? { src, width: 0, height: 0 } : selectedSource(src, thumbnail);
  return <img
    {...props}
    src={selected.src}
    width={props.width ?? (selected.width || undefined)}
    height={props.height ?? (selected.height || undefined)}
    decoding="async"
    onError={selected.src !== src ? () => setFailedSource(src) : onError}
  />;
}
