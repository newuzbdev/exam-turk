import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function PracticeAllowance({ remaining }: { remaining: number }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <div ref={container} className="relative flex shrink-0 items-center">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={descriptionId}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#e5e5e2] bg-white px-3 text-xs text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
      >
        <span className="[text-box:trim-both_cap_alphabetic]"><strong className="font-semibold tabular-nums text-[#37352f]">{remaining}</strong> değerlendirme hakkı</span>
        <Info className="h-4 w-4 shrink-0 text-[#777570]" aria-hidden="true" />
      </button>
      <div
        id={descriptionId}
        hidden={!open}
        className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-32px)] rounded-lg border border-[#e5e5e2] bg-white p-3 text-[13px] leading-5 text-[#5f5e5a] shadow-[0_6px_24px_rgba(55,53,47,0.1)]"
      >
        Yazma ve konuşma pratiklerinde ortak kullanılır. Her değerlendirme 1 hak kullanır.
      </div>
    </div>
  );
}
