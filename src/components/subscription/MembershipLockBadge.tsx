import { LockKeyhole } from "lucide-react";

export default function MembershipLockBadge() {
  return (
    <span
      role="img"
      aria-label="Abonelik gerekli"
      className="pointer-events-none absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-[var(--tm-text-primary)] shadow-sm"
    >
      <LockKeyhole className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
