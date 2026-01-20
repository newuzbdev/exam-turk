import { useEffect, useRef, useState } from "react";

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
  return (
    <div>
      <section className="py-12 sm:py-16 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 text-center card-hover group shadow-sm">
              <AnimatedStat
                value={1500}
                suffix="+"
                className="text-5xl sm:text-6xl font-bold text-gray-900 mb-3 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="text-base sm:text-lg text-gray-600 font-medium">
                Aktif Kullanıcı
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 text-center card-hover group shadow-sm">
              <AnimatedStat
                value={5000}
                suffix="+"
                className="text-5xl sm:text-6xl font-bold text-gray-900 mb-3 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="text-base sm:text-lg text-gray-600 font-medium">
                Tamamlanan Test
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatsSection;
