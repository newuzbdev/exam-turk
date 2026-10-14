import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { writingPracticeStorage } from "@/pages/writing-practice/writing-practice-storage";

const clampMinutes = (value: number) =>
  Math.min(180, Math.max(5, Math.round(value || 20)));
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function PracticeDurationControl({
  minutes,
  contextKey,
  paused = false,
  className = "",
}: {
  minutes: number;
  contextKey: string;
  paused?: boolean;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(true);
  const [selectedMinutes, setSelectedMinutes] = useState(clampMinutes(minutes));
  const [draftMinutes, setDraftMinutes] = useState(clampMinutes(minutes));
  const [seconds, setSeconds] = useState(clampMinutes(minutes) * 60);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const [loadedConfig, setLoadedConfig] = useState<{
    contextKey: string;
    minutes: number;
  } | null>(null);
  const hydrated =
    loadedConfig?.contextKey === contextKey && loadedConfig.minutes === minutes;

  useEffect(() => {
    let next = {
      enabled: true,
      minutes: clampMinutes(minutes),
      seconds: clampMinutes(minutes) * 60,
    };
    try {
      const saved = JSON.parse(
        writingPracticeStorage.getItem(`practice_duration_${contextKey}`) ||
          "null",
      );
      if (
        saved &&
        typeof saved.enabled === "boolean" &&
        Number.isFinite(saved.minutes) &&
        Number.isFinite(saved.seconds)
      ) {
        next = {
          enabled: saved.enabled,
          minutes: clampMinutes(saved.minutes),
          seconds: Math.max(
            0,
            Math.min(saved.seconds, clampMinutes(saved.minutes) * 60),
          ),
        };
      }
    } catch {
      // Use the default duration if the session cache is unavailable.
    }
    deadlineRef.current = null;
    expiredRef.current = next.seconds === 0;
    setEnabled(next.enabled);
    setSelectedMinutes(next.minutes);
    setDraftMinutes(next.minutes);
    setSeconds(next.seconds);
    setOpen(false);
    setLoadedConfig({ contextKey, minutes });
  }, [contextKey, minutes]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      writingPracticeStorage.setItem(
        `practice_duration_${contextKey}`,
        JSON.stringify({ enabled, minutes: selectedMinutes, seconds }),
      );
    } catch {
      // Timing continues even when session storage is blocked.
    }
  }, [contextKey, enabled, selectedMinutes, seconds, hydrated]);

  useEffect(() => {
    if (!hydrated || !enabled || paused || seconds <= 0) {
      deadlineRef.current = null;
      return;
    }
    deadlineRef.current ??= Date.now() + seconds * 1000;
    const interval = window.setInterval(
      () =>
        setSeconds(
          Math.max(
            0,
            Math.ceil(
              ((deadlineRef.current ?? Date.now()) - Date.now()) / 1000,
            ),
          ),
        ),
      250,
    );
    return () => window.clearInterval(interval);
  }, [enabled, paused, seconds, hydrated]);

  useEffect(() => {
    if (!hydrated || seconds !== 0 || !enabled || expiredRef.current) return;
    expiredRef.current = true;
    toast.info(
      "Süre bitti. Yazmaya devam edebilir, hazır olduğunuzda değerlendirebilirsiniz.",
    );
  }, [enabled, seconds, hydrated]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative flex items-center gap-2 ${className}`}>
      {enabled ? (
        <span
          aria-label="Kalan süre"
          className={`rounded-md border border-[#e5e5e2] bg-[#f7f7f5] px-3 py-1.5 text-sm font-semibold tabular-nums ${seconds === 0 ? "text-red-700" : "text-[#242424]"}`}
        >
          {formatTime(seconds)}
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Süre"
        aria-expanded={open}
        disabled={paused}
        onClick={() => {
          setDraftMinutes(selectedMinutes);
          setOpen((value) => !value);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e5e2] bg-[#f7f7f5] text-[#5f5e5a] hover:bg-[#eeeee9] disabled:opacity-40"
      >
        <Clock3 className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Çalışma süresi"
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-[228px] rounded-xl border border-[#d8d8d4] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)]"
        >
          <p className="text-sm font-semibold text-[#242424]">Süre</p>
          <p className="mt-0.5 text-xs leading-5 text-[#777570]">
            Çalışma sürenizi ayarlayın.
          </p>
          <div className="mt-3 flex h-11 items-center justify-between rounded-lg border border-[#dededb] bg-[#f7f7f5] p-1">
            <button
              type="button"
              aria-label="Süreyi 5 dakika azalt"
              disabled={draftMinutes <= 5}
              onClick={() =>
                setDraftMinutes((value) => clampMinutes(value - 5))
              }
              className="h-8 w-8 rounded-md bg-white text-xl shadow-sm disabled:opacity-35"
            >
              −
            </button>
            <span className="text-sm font-semibold tabular-nums">
              {draftMinutes} dakika
            </span>
            <button
              type="button"
              aria-label="Süreyi 5 dakika artır"
              disabled={draftMinutes >= 180}
              onClick={() =>
                setDraftMinutes((value) => clampMinutes(value + 5))
              }
              className="h-8 w-8 rounded-md bg-white text-xl shadow-sm disabled:opacity-35"
            >
              +
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEnabled(false);
                setOpen(false);
              }}
              className="h-9 rounded-md border border-[#dededb] bg-white text-xs font-semibold text-[#5f5e5a]"
            >
              Süresiz
            </button>
            <button
              type="button"
              onClick={() => {
                deadlineRef.current = null;
                expiredRef.current = false;
                setSelectedMinutes(draftMinutes);
                setSeconds(draftMinutes * 60);
                setEnabled(true);
                setOpen(false);
              }}
              className="h-9 rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
            >
              Uygula
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
