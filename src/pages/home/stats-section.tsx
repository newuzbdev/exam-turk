import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosPrivate from "@/config/api";

interface PublicStats {
  activeUsers: number | null;
  completedTests: number | null;
  evaluatedWriting: number | null;
  evaluatedSpeaking: number | null;
  averageResultSeconds: number | null;
}

const validNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const formatCount = (value: number | null | undefined) =>
  value == null ? "—" : value.toLocaleString("tr-TR");

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sn`;
  if (seconds < 3600) return `${(seconds / 60).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dk`;
  return `${(seconds / 3600).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa`;
};

const RollingDigit = ({ value }: { value: string }) => {
  const current = useRef<HTMLSpanElement>(null);
  const outgoing = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const old = previous.current;
    previous.current = value;
    if (old === value || !/\d/.test(old) || !/\d/.test(value) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!current.current || !outgoing.current) return;
    outgoing.current.textContent = old;
    const options = { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
    const exit = outgoing.current.animate([
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(100%)", opacity: 0 },
    ], options);
    const enter = current.current.animate([
      { transform: "translateY(-100%)", opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ], options);
    return () => { exit.cancel(); enter.cancel(); };
  }, [value]);

  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <span ref={current} className="block">{value}</span>
      <span ref={outgoing} className="pointer-events-none absolute inset-0 block opacity-0" />
    </span>
  );
};

const RollingCount = ({ value, className }: { value: number | null | undefined; className: string }) => {
  const text = formatCount(value);
  return (
    <div className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((digit, index) => (
          <RollingDigit key={text.length - index} value={digit} />
        ))}
      </span>
    </div>
  );
};

const StatsSection = () => {
  const [showSpeaking, setShowSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const { data } = useQuery<PublicStats>({
    queryKey: ["public-home-stats"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/overal-test-result/stats");
      const payload = response.data?.data ?? response.data;
      return {
        activeUsers: validNumber(payload?.activeUsers),
        completedTests: validNumber(payload?.completedTests),
        evaluatedWriting: validNumber(payload?.evaluatedWriting),
        evaluatedSpeaking: validNumber(payload?.evaluatedSpeaking),
        averageResultSeconds: validNumber(payload?.averageResultSeconds),
      };
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setShowSpeaking((value) => !value), 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const valueClass = "mb-1 text-3xl font-semibold text-red-600 sm:text-4xl tabular-nums";
  const labelClass = "text-sm text-[#787774] sm:text-base";

  return (
    <section className="bg-white py-8 sm:py-10" aria-label="Platform istatistikleri">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-white text-center lg:grid-cols-4">
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]">
            <RollingCount className={valueClass} value={data?.activeUsers} />
            <div className={labelClass}>Aktif Kullanıcı</div>
          </div>
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]">
            <RollingCount className={valueClass} value={data?.completedTests} />
            <div className={labelClass}>Tamamlanan Test</div>
          </div>
          <button
            type="button"
            onClick={() => { setPaused(true); setShowSpeaking((value) => !value); }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="relative grid rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF] focus-visible:outline-2 focus-visible:outline-red-600"
            aria-label={`${showSpeaking ? "Değerlendirilen Konuşma" : "Değerlendirilen Yazı"}: ${formatCount(showSpeaking ? data?.evaluatedSpeaking : data?.evaluatedWriting)}. Diğer istatistiği göster`}
          >
            {[false, true].map((speaking) => (
              <span key={String(speaking)} aria-hidden="true" className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${showSpeaking === speaking ? "opacity-100" : "opacity-0"}`}>
                <span className={`block ${valueClass}`}>{formatCount(speaking ? data?.evaluatedSpeaking : data?.evaluatedWriting)}</span>
                <span className={`block ${labelClass}`}>{speaking ? "Değerlendirilen Konuşma" : "Değerlendirilen Yazı"}</span>
              </span>
            ))}
          </button>
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]">
            <div className={valueClass}>{data?.averageResultSeconds != null ? "≈ " : ""}{formatDuration(data?.averageResultSeconds)}</div>
            <div className={labelClass}>Sonuç Süresi</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
