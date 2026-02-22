import { useEffect, useRef, useState } from "react";
import axiosPrivate from "@/config/api";

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  className?: string;
}

const AnimatedStat = ({ value, suffix = "", className }: AnimatedStatProps) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const duration = 2200;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.round(progress * value);
      setCount(current);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [started, value]);

  return (
    <div ref={ref} className={className}>
      {count.toLocaleString("tr-TR")}
      {suffix}
    </div>
  );
};

const StatsSection = () => {
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [completedTests, setCompletedTests] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await axiosPrivate.get("/api/overal-test-result/stats");
        const payload = data?.data && typeof data.data === "object" ? data.data : data;
        if (!mounted) return;
        setActiveUsers(Number(payload?.activeUsers ?? 0));
        setCompletedTests(Number(payload?.completedTests ?? 0));
      } catch {
        try {
          const { data } = await axiosPrivate.get("/api/admin/stats");
          const payload = data?.data && typeof data.data === "object" ? data.data : data;
          if (!mounted) return;
          setActiveUsers(Number(payload?.activeUsers ?? 0));
          setCompletedTests(Number(payload?.completedTests ?? 0));
        } catch {
          if (!mounted) return;
          setActiveUsers(0);
          setCompletedTests(0);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-14 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <AnimatedStat
              value={activeUsers ?? 0}
              suffix={"+"}
              className="text-4xl font-bold text-red-600 mb-2"
            />
            <div className="text-gray-600 text-sm sm:text-base">Aktif Kullanıcı</div>
          </div>

          <div>
            <AnimatedStat
              value={completedTests ?? 0}
              suffix={"+"}
              className="text-4xl font-bold text-red-600 mb-2"
            />
            <div className="text-gray-600 text-sm sm:text-base">Tamamlanan Test</div>
          </div>

          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">100%</div>
            <div className="text-gray-600 text-sm sm:text-base">Gerçek Sınav Arayüzü</div>
          </div>

          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">&lt;30 sn</div>
            <div className="text-gray-600 text-sm sm:text-base">Yapay Zeka Sonuç Süresi</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
