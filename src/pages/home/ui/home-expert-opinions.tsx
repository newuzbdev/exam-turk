import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Instagram, Quote, Send } from "lucide-react";

const experts = [
  {
    name: "Muattar Mamatkarimova",
    role: "Türkçe Eğitmeni",
    image: "/mattuqiz.jpg",
    text: "Sınav öncesi öğrencilere gerçek seviyelerini gösterecek böyle bir platforma uzun zamandır ihtiyaç vardı. Artık sınava katılmak isteyenler bu yapıda rahatça çalışabilirler.",
    telegram: "https://t.me/+HWz8P0XvqHNkMDUy",
    instagram: "https://www.instagram.com/mattu_turkish/",
  },
  {
    name: "Mehmet Arslan",
    role: "Sınav Hazırlık Uzmanı",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=320&q=80",
    text: "Konuşma ve yazma geri bildirimleri pratik ve uygulanabilir. Öğrencinin eksik yönlerini bir çalışma planına dönüştürmek için güçlü bir temel sunuyor.",
    telegram: "",
    instagram: "",
  },
  {
    name: "Timur Makarov",
    role: "Platform Kurucusu ve Geliştiricisi",
    image: "/tim%202.png",
    text: "Bu platform, gerçek sınav deneyimini yaşamanız, seviyenizi ve gelişime açık yönlerinizi net şekilde görmeniz amacıyla hazırlanmıştır. Böylece sınava daha bilinçli ve etkili bir şekilde hazırlanabilirsiniz.",
    telegram: "https://t.me/timur_makarov",
    instagram: "https://www.instagram.com/bigby.wolf/",
  },
];

const AUTO_SLIDE_MS = 8000;
const SWIPE_THRESHOLD = 50;

const HomeExpertOpinions = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % experts.length);
    }, AUTO_SLIDE_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [activeIndex]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    const startX = touchStartXRef.current;
    const endX = touchEndXRef.current;
    if (startX === null || endX === null) return;

    const delta = startX - endX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta > 0) {
      setActiveIndex((prev) => (prev + 1) % experts.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + experts.length) % experts.length);
    }
  };

  const stopLinkTouchPropagation = (event: TouchEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleExternalLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    url: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      // Fallback for mobile webviews/pop-up blockers.
      window.location.assign(url);
    }
  };

  return (
    <section className="py-6 sm:py-8 lg:py-10 bg-white font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-4 sm:mb-5 text-center md:text-left">
          <h2 className="text-xl sm:text-3xl font-medium text-gray-900 tracking-tight">
            Uzmanlar Hakkımızda Ne Diyor?
          </h2>
        </div>

        <article
          className="relative overflow-hidden rounded-xl md:rounded-2xl border border-gray-200 bg-gray-50 shadow-sm"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {experts.map((expert) => (
                <div key={expert.name} className="min-w-full p-3.5 sm:p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_148px] gap-3 sm:gap-4 md:gap-6 items-center md:items-stretch">
                    <div className="min-w-0 relative flex flex-col justify-between h-full pt-1 sm:pt-3 text-center md:text-left order-2 md:order-1">
                      <Quote className="hidden md:block w-14 h-14 sm:w-16 sm:h-16 text-gray-300/30 absolute -top-8 -left-2 pointer-events-none z-0" />
                      <Quote className="md:hidden w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm sm:text-base md:text-lg leading-relaxed text-gray-700 italic font-medium relative z-10 max-w-[62ch] mx-auto md:mx-0">
                        {expert.text}
                      </p>

                      <div className="mt-4 flex flex-col items-center md:items-start gap-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                          {expert.name}
                        </h3>
                        <p className="text-xs sm:text-sm tracking-[0.08em] text-gray-500 leading-tight">
                          {expert.role.toLocaleUpperCase("tr-TR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center md:justify-between gap-2.5 md:gap-3 h-full order-1 md:order-2">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full object-cover border-2 border-white shadow-md pointer-events-none select-none"
                        draggable={false}
                        onContextMenu={(event) => event.preventDefault()}
                        onDragStart={(event) => event.preventDefault()}
                      />
                      <div className="flex items-center gap-2">
                        {expert.instagram ? (
                          <a
                            href={expert.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full border border-gray-400/50 text-gray-700 hover:bg-gray-200 transition-colors duration-300 inline-flex items-center justify-center"
                            aria-label={`${expert.name} Instagram`}
                            onClick={(event) => handleExternalLinkClick(event, expert.instagram)}
                            onTouchStart={stopLinkTouchPropagation}
                            onTouchEnd={stopLinkTouchPropagation}
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        ) : (
                          <span
                            className="w-8 h-8 rounded-full border border-gray-300/70 text-gray-400 inline-flex items-center justify-center"
                            aria-label="Instagram yakında"
                          >
                            <Instagram className="w-4 h-4" />
                          </span>
                        )}

                        {expert.telegram ? (
                          <a
                            href={expert.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full border border-gray-400/50 text-gray-700 hover:bg-gray-200 transition-colors duration-300 inline-flex items-center justify-center"
                            aria-label={`${expert.name} Telegram`}
                            onClick={(event) => handleExternalLinkClick(event, expert.telegram)}
                            onTouchStart={stopLinkTouchPropagation}
                            onTouchEnd={stopLinkTouchPropagation}
                          >
                            <Send className="w-4 h-4" />
                          </a>
                        ) : (
                          <span
                            className="w-8 h-8 rounded-full border border-gray-300/70 text-gray-400 inline-flex items-center justify-center"
                            aria-label="Telegram yakında"
                          >
                            <Send className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4 pt-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5 sm:hidden">
              {experts.map((_, index) => (
                <span
                  key={`mobile-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex ? "w-6 bg-gray-500" : "w-3 bg-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              {experts.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex ? "w-6 bg-gray-500" : "w-3 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Uzman ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default HomeExpertOpinions;