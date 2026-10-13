import { useState } from "react";
import { cn } from "@/lib/utils";

// Render the authorized photo directly: preload + img downloads no-store
// avatars twice and flashes the initials on every component remount.
export function AccountAvatar({ src, alt, initials, className, fallbackClassName, onImageError }: {
  src?: string;
  alt: string;
  initials: string;
  className?: string;
  fallbackClassName?: string;
  onImageError?: () => void;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return <span className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}>
    <span aria-hidden="true" className={cn("flex size-full items-center justify-center bg-gray-100", fallbackClassName)}>{initials}</span>
    {src && src !== failedSource && <img src={src} alt={alt} decoding="async"
      className="absolute inset-0 size-full object-cover" draggable={false} referrerPolicy="no-referrer"
      onError={() => { setFailedSource(src); onImageError?.(); }} />}
  </span>;
}
