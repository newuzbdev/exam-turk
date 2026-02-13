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

  // Start animation when stat is in viewport
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
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Simple count-up animation
  useEffect(() => {
    if (!started) return;

    const duration = 2200;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.round(progress * value);
      setCount(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
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
  const [_loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosPrivate.get("/api/admin/stats");
        // Expecting: { activeUsers: number, completedTests: number }
        if (!mounted) return;
        setActiveUsers(Number(data?.activeUsers ?? 0));
        setCompletedTests(Number(data?.completedTests ?? 0));
      } catch (e) {
        // Fallback to previous static-like defaults if API fails
        if (!mounted) return;
        setActiveUsers(1500);
        setCompletedTests(5000);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <section className="py-14 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 text-center">
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
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatsSection;


