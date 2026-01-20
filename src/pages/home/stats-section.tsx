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

        {/* Optimized Grid - Daha dengeli */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-10 sm:gap-y-12 gap-x-8 text-center">

          {/* Stat 1 */}
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3">
              <AnimatedStat value={62} suffix="" />
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Aktif Kullanıcı
            </div>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3">
              <AnimatedStat value={86} suffix="" />
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tamamlanan Test
            </div>
          </div>

          {/* Stat 3 (Live) */}
          <div className="flex flex-col items-center relative">
            {/* Canlı Noktası */}
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3 flex items-center gap-1.5">
              8
              <span className="text-xl sm:text-2xl text-gray-400 font-semibold">dk</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Son Kayıt
            </div>
          </div>

          {/* Stat 4 */}
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter mb-3 flex items-center gap-1.5">
              5
              <span className="text-xl sm:text-2xl text-gray-400 font-semibold">dk</span>
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Son Tamamlanan
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default StatsSection;
