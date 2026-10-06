import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee } from "lucide-react";

const REQUIRED_CLICKS = 5;
const CLICK_WINDOW_MS = 2_200;
const VISIBLE_MS = 3_600;

export function useLogoEasterEgg() {
  const [visible, setVisible] = useState(false);
  const clickCountRef = useRef(0);
  const lastClickAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    },
    [],
  );

  const registerLogoClick = useCallback(() => {
    const now = window.performance.now();
    if (now - lastClickAtRef.current > CLICK_WINDOW_MS) {
      clickCountRef.current = 0;
    }

    lastClickAtRef.current = now;
    clickCountRef.current += 1;
    if (clickCountRef.current < REQUIRED_CLICKS) return;

    clickCountRef.current = 0;
    setVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, VISIBLE_MS);
  }, []);

  return {
    registerLogoClick,
    isEasterEggVisible: visible,
  };
}

export function LogoCoffeeSurprise({ className = "" }: { className?: string }) {
  return (
    <span
      className={`tm-coffee-easter-egg pointer-events-none flex h-10 min-w-[148px] items-center justify-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
        <span aria-hidden="true" className="tm-coffee-steam tm-coffee-steam-one" />
        <span aria-hidden="true" className="tm-coffee-steam tm-coffee-steam-two" />
        <Coffee aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="text-left text-xs font-semibold leading-4 text-neutral-800">
        Kahve
        <br />
        molası
      </span>
    </span>
  );
}
