import { useEffect, useRef, useState } from "react";

// --- Animasyonlu Sayı Bileşeni ---
const AnimatedStat = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease out
      setCount(Math.round(ease * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, value]);

  return <div ref={ref}>{count.toLocaleString("tr-TR")}{suffix}</div>;
};

const StatsSection = () => {
  return (
    <section className="py-16 sm:py-20 bg-gray-50 border-y border-gray-100 font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 sm:gap-y-12 gap-x-12 text-center max-w-2xl mx-auto">

          {/* Stat 1 - Aktif Kullanıcı */}
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3">
              <AnimatedStat value={62} suffix="" />
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Aktif Kullanıcı
            </div>
          </div>

          {/* Stat 2 - Tamamlanan Test */}
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3">
              <AnimatedStat value={86} suffix="" />
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tamamlanan Test
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default StatsSection;
