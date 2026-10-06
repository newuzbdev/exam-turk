import { Quote, Star } from "lucide-react";
import { SectionHeader, Surface, tm } from "@/components/tm";

const testimonials = [
  {
    name: "Aziza Karimova",
    role: "Öğrenci",
    level: "B2",
    text: "Deneme sonucunda okuma ve dinleme puanlarımı ayrı görmek işime yaradı. Sonraki çalışmamı buna göre planladım.",
  },
  {
    name: "Dilnoza Abdullayeva",
    role: "Öğretmen",
    level: "C1",
    text: "Deneme sonuçlarında becerilerin ayrı gösterilmesi faydalı. Öğrencilerle hangi bölüme ağırlık vereceklerini konuşmak kolaylaşıyor.",
  },
  {
    name: "Javohir Tursunov",
    role: "Aday",
    level: "B1",
    text: "Okuma pratikleri sayesinde hangi tür sorularda zorlandığımı daha net gördüm.",
  },
  {
    name: "Madina Sobirova",
    role: "Öğrenci",
    level: "A2",
    text: "Boş vaktimde okuma pratiği yapıyorum. Her seferinde tam bir deneme çözmek zorunda olmamak hoşuma gidiyor.",
  },
  {
    name: "Sardor Raximov",
    role: "Çalışan",
    level: "B2",
    text: "Mock test süresiyle çalışmak gerçek sınav öncesi iyi bir prova oldu.",
  },
  {
    name: "Nilufar Xudoyberdiyeva",
    role: "Öğrenci",
    level: "B1",
    text: "Pratik ve denemeler ayrı duruyor, aradığımı kolay buluyorum. Önceki sonuçlarıma yeniden bakabilmek de iyi.",
  },
  {
    name: "Shahnoza Ergasheva",
    role: "Aday",
    level: "C1",
    text: "Sonuç ekranı hangi bölümde eksik olduğumu hızlıca anlamama yardımcı oldu.",
  },
  {
    name: "Bekzod Aliyev",
    role: "Öğrenci",
    level: "B2",
    text: "Süreli denemede bazı sorulara fazla zaman ayırdığımı fark ettim. Şimdi okuma pratiğinde buna dikkat ediyorum.",
  },
];

const marqueeRows = [
  testimonials.slice(0, 4),
  testimonials.slice(4),
];

const TestimonialCard = ({ item }: { item: (typeof testimonials)[number] }) => (
  <Surface className="mx-2 w-[310px] shrink-0 p-4 transition-colors hover:bg-[var(--tm-bg-hover)] sm:w-[340px]">
    <div className="mb-3 flex items-center justify-between gap-3">
      <Quote className="h-[18px] w-[18px] text-[var(--tm-text-tertiary)]" />
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--tm-bg-app)] px-2 py-0.5 text-[11px] font-medium text-[var(--tm-text-secondary)]">
        <Star className="h-3.5 w-3.5 fill-[#f5a623] text-[#f5a623]" />
        {item.level}
      </span>
    </div>
    <blockquote className="min-h-[78px] text-[13.5px] leading-6 text-[var(--tm-text-primary)]">
      "{item.text}"
    </blockquote>
    <div className="mt-4 border-t border-[var(--tm-border-subtle)] pt-3">
      <h4 className="text-sm font-semibold text-[var(--tm-text-primary)]">
        {item.name}
      </h4>
      <p className="mt-0.5 text-xs font-medium text-[var(--tm-text-tertiary)]">
        {item.role}
      </p>
    </div>
  </Surface>
);

const HomeTestimonials = () => {
  return (
    <section id="kullanici-deneyimleri" className={`${tm.section} scroll-mt-20`}>
      <div className={tm.container}>
        <SectionHeader
          title="Kullanıcı deneyimleri"
          description="Deneme ve pratik deneyimlerini anlatan örnek yorumlar."
          align="center"
        />
      </div>

      <div className="overflow-hidden">
        {marqueeRows.map((row, rowIndex) => {
          const repeated = [...row, ...row, ...row];
          return (
            <div
              key={rowIndex}
              className="tm-testimonial-marquee py-2"
              data-direction={rowIndex === 0 ? "left" : "right"}
            >
              <div className="tm-testimonial-track">
                {repeated.map((item, index) => (
                  <TestimonialCard key={`${item.name}-${index}`} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomeTestimonials;
