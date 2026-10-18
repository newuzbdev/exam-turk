import { LockKeyhole } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MembershipRequiredDialog({
  open,
  onOpenChange,
  title = "Abonelik gerekli",
  description = "Bu çalışmaya başlamak için önce abone olmanız gerekiyor.",
  actionLabel = "Abone Ol",
  catalogPath, onContinuePaid, continuePaidLabel = 'Üyeliğimle devam et', busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string; description?: string; actionLabel?: string; catalogPath?: string; onContinuePaid?: () => void; continuePaidLabel?: string; busy?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showCatalogLink = catalogPath && pathname !== catalogPath.split("?")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/40"
        className="w-[calc(100%-2rem)] max-w-[400px] gap-5 rounded-[8px] border border-[var(--tm-border-subtle)] bg-white p-7 sm:max-w-[400px] sm:rounded-[8px] sm:p-8"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tm-bg-muted)] text-[var(--tm-text-primary)]" aria-hidden="true">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="pr-6 text-[18px] leading-6 text-[var(--tm-text-primary)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-6 text-[var(--tm-text-secondary)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2.5 sm:flex-col sm:space-x-0">
          {onContinuePaid && <Button disabled={busy} onClick={onContinuePaid}>{continuePaidLabel}</Button>}
          {showCatalogLink && <Button variant="outline" disabled={busy} onClick={() => { onOpenChange(false); navigate(catalogPath); }}>Kataloğa dön</Button>}
          <Button
            disabled={busy}
            className="h-11 w-full rounded-[8px] bg-red-600 text-[14px] font-semibold text-white hover:bg-red-700"
            onClick={() => {
              onOpenChange(false);
              navigate("/app/fiyatlar#fiyatlandirma");
            }}
          >
            {actionLabel}
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full rounded-[8px] border-[#d9d9d5] text-[14px] font-semibold text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)]"
            onClick={() => onOpenChange(false)}
          >
            Vazgeç
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
