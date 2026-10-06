import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PracticeResumeDialog({
  open,
  onOpenChange,
  onContinue,
  onRestart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onRestart: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] gap-5 rounded-[8px] border border-[var(--tm-border-subtle)] p-7 sm:max-w-[400px] sm:rounded-[8px] sm:p-8">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="pr-6 text-[18px] leading-6 text-[var(--tm-text-primary)]">
            Çalışmaya nasıl devam edilsin?
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-6 text-[var(--tm-text-secondary)]">
            Bu testte yarım kalan cevapların var. Kaldığın yerden devam edebilir
            veya baştan başlayabilirsin.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2.5 sm:flex-col sm:space-x-0">
          <Button
            className="h-11 w-full rounded-[8px] bg-red-600 text-[14px] font-semibold text-white hover:bg-red-700"
            onClick={onContinue}
          >
            <Play className="mr-2 h-4 w-4" />
            Devam et
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full rounded-[8px] border-[#d9d9d5] text-[14px] font-semibold text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)]"
            onClick={onRestart}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Baştan başla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
