import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

export default function ManualPracticeTimer({
  minutes,
  className = "",
}: {
  minutes: number;
  className?: string;
}) {
  const initialSeconds = useMemo(
    () => Math.max(60, Math.round(Number(minutes || 20) * 60)),
    [minutes],
  );
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSeconds(initialSeconds);
    setRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const interval = window.setInterval(
      () => setSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  return (
    <div
      className={`inline-flex h-9 items-center gap-1 rounded-md border border-[#dededb] bg-[#f7f7f5] px-1.5 text-[#37352f] ${className}`}
      aria-label="Elle denetlenen pratik süresi"
    >
      <span className={`min-w-[58px] px-1 text-center text-sm font-semibold tabular-nums ${seconds === 0 ? "text-red-700" : ""}`}>
        {formatTime(seconds)}
      </span>
      <button
        type="button"
        onClick={() => setRunning((value) => !value)}
        disabled={seconds === 0}
        className="flex h-7 w-7 items-center justify-center rounded border border-[#d5d5d1] bg-white text-[#565550] hover:bg-[#eeeeec] disabled:opacity-40"
        aria-label={running ? "Süreyi duraklat" : "Süreyi başlat"}
        title={running ? "Duraklat" : "Başlat"}
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setRunning(false);
          setSeconds(initialSeconds);
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-[#6f6d67] hover:bg-[#e7e7e3]"
        aria-label="Süreyi sıfırla"
        title="Sıfırla"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
