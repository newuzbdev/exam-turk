import { useEffect, useState } from "react";
import { Instagram, Quote, Send } from "lucide-react";

const experts = [
  {
    name: "Dr. Elif Kaya",
    role: "Türkçe Eğitmeni",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=320&q=80",
    text: "Bu yapı, öğrencilerin seviyesini net şekilde gösteriyor. Özellikle sınav öncesi hangi beceriye odaklanması gerektiğini hızlıca anlamasını sağlıyor.",
    telegram: "",
    instagram: "",
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
    image: "/tim.jpg",
    text: "Bu platform, gerçek sınav deneyimini yaşamanız, seviyenizi ve gelişime açık yönlerinizi net şekilde görmeniz amacıyla hazırlanmıştır. Böylece sınava daha bilinçli ve etkili bir şekilde hazırlanabilirsiniz.",
    telegram: "https://t.me/timur_makarov",
    instagram: "",
  },
];

const AUTO_SLIDE_MS = 8000;

const HomeExpertOpinions = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % experts.length);
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="py-6 sm:py-8 lg:py-10 bg-white font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-4 sm:mb-5 text-center md:text-left">
          <h2 className="text-xl sm:text-3xl font-medium text-gray-900 tracking-tight">Uzmanlar Hakkımızda Ne Diyor?</h2>
        </div>

        <article className="relative overflow-hidden rounded-xl md:rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
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
                      <div className="mt-3 md:mt-4 flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start flex-wrap gap-1.5 md:gap-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">{expert.name}</h3>
                        <span className="hidden md:inline-block w-1 h-1 rounded-full bg-gray-400" />
                        <p className="text-base sm:text-lg text-gray-600">{expert.role}</p>
                      </div>

                    </div>

                    <div className="flex flex-col items-center justify-center md:justify-between gap-2.5 md:gap-3 h-full order-1 md:order-2">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full object-cover border-2 border-white shadow-md"
                      />
                      <div className="flex items-center gap-2">
                        {expert.instagram ? (
                          <a
                            href={expert.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-full border border-gray-400/50 text-gray-700 hover:text-gray-900 hover:border-gray-600/40 transition-colors duration-300 inline-flex items-center justify-center"
                            aria-label={`${expert.name} Instagram`}
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
                            rel="noreferrer"
                            className="w-8 h-8 rounded-full border border-gray-400/50 text-gray-700 hover:bg-gray-200 transition-colors duration-300 inline-flex items-center justify-center"
                            aria-label={`${expert.name} Telegram`}
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
            <div className="flex items-center gap-1.5">
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
