import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosPrivate from "@/config/api";

interface PublicStats {
  activeUsers: number | null;
  completedTests: number | null;
  averageResultSeconds: number | null;
}

// Approximate historical totals reported by the platform owner; no legacy users
// or results were imported into the new database.
const LEGACY_TOTALS = { users: 4_200, completedTests: 4_200 };

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

const RollingCount = ({ value, className, approximate = false }: {
  value: number | null | undefined;
  className: string;
  approximate?: boolean;
}) => {
  const text = `${formatCount(value)}${approximate && value != null ? "+" : ""}`;
  return (
    <div className={className}>
      <span className="sr-only">{approximate ? "Yaklaşık " : ""}{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((digit, index) => (
          <RollingDigit key={text.length - index} value={digit} />
        ))}
      </span>
    </div>
  );
};

const StatsSection = () => {
  const { data } = useQuery<PublicStats>({
    queryKey: ["public-home-stats"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/overal-test-result/stats");
      const payload = response.data?.data ?? response.data;
      return {
        activeUsers: validNumber(payload?.activeUsers),
        completedTests: validNumber(payload?.completedTests),
        averageResultSeconds: validNumber(payload?.averageResultSeconds),
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: practiceCount } = useQuery<number>({
    queryKey: ["public-home-practice-count"],
    queryFn: async () => {
      const [reading, ...otherPractices] = await Promise.all([
        axiosPrivate.get("/api/reading-practice", { params: { page: 1, limit: 1 } }),
        axiosPrivate.get("/api/listening-practice"),
        axiosPrivate.get("/api/writing-practice"),
        axiosPrivate.get("/api/speaking-practice"),
      ]);
      const readingTotal = validNumber(reading.data?.total ?? reading.data?.data?.total);
      if (readingTotal == null || !Number.isSafeInteger(readingTotal)) {
        throw new Error("Okuma pratiklerinin toplamı alınamadı.");
      }
      return otherPractices.reduce((total, response) => {
        const practices = response.data?.data ?? response.data;
        if (!Array.isArray(practices)) {
          throw new Error("Yayındaki pratiklerin toplamı alınamadı.");
        }
        return total + practices.length;
      }, readingTotal);
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const valueClass = "mb-1 text-3xl font-semibold text-red-600 sm:text-4xl tabular-nums";
  const labelClass = "text-sm text-[#787774] sm:text-base";

  return (
    <section className="bg-white py-8 sm:py-10" aria-label="Platform istatistikleri">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-white text-center lg:grid-cols-4">
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]">
            <RollingCount className={valueClass} value={LEGACY_TOTALS.users + (data?.activeUsers ?? 0)} approximate />
            <div className={labelClass}>Toplam Kullanıcı</div>
          </div>
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]">
            <RollingCount className={valueClass} value={LEGACY_TOTALS.completedTests + (data?.completedTests ?? 0)} approximate />
            <div className={labelClass}>Tamamlanan Test</div>
          </div>
          <div className="rounded-md px-5 py-5 transition-colors hover:bg-[#F1F1EF]" title="Yayındaki okuma, dinleme, yazma ve konuşma pratikleri">
            <RollingCount className={valueClass} value={practiceCount} />
            <div className={labelClass}>Pratik Sayısı</div>
          </div>
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
