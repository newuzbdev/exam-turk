import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface, tm } from "@/components/tm";
import { useStudentAction } from "@/hooks/use-student-action";

const modules = [
  {
    to: "/dersler",
    title: "Derslere başla",
    desc: "Konuları kısa anlatım ve alıştırmalarla pekiştir.",
    icon: "/icons/turkishmock/lessons.svg",
    iconClassName: "h-12 w-12",
  },
  {
    to: "/pratik",
    title: "Pratik yap",
    desc: "Dinleme, okuma, yazma ve konuşma becerilerini geliştir.",
    icon: "/icons/turkishmock/practice.svg",
    iconClassName: "h-12 w-12",
  },
  {
    to: "/test",
    title: "Deneme çöz",
    desc: "Süreli denemelerle sınavın provasını yap.",
    icon: "/icons/turkishmock/mock-test-bank.svg",
    iconClassName: "h-12 w-12",
  },
  {
    to: "/profile",
    title: "Sonucunu gör",
    desc: "Puanını incele, güçlü ve eksik yönlerini gör.",
    icon: "/icons/turkishmock/results.svg",
    iconClassName: "h-12 w-12",
  },
];

const HeroSection = () => {
  const openStudentAction = useStudentAction();

  return (
    <section className="overflow-hidden bg-[var(--tm-bg-page)]">
      <div className={tm.container}>
        <div className="relative mx-auto max-w-7xl overflow-hidden pb-10 pt-12 text-center sm:pb-12 sm:pt-14">
          <div className="relative z-10 mx-auto max-w-5xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--tm-border-default)] px-3.5 py-1.5 text-xs font-medium tracking-wide text-[var(--tm-text-secondary)] sm:text-sm">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[var(--tm-accent)]" />
              Millî Sertifika · CEFR Hazırlık Platformu
            </p>
            <h1 className="relative mx-auto max-w-4xl text-[clamp(1.875rem,8.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--tm-text-primary)] sm:text-[clamp(3.25rem,6vw,4.5rem)]">
              <span className="block">TÜRKÇE SEVİYENİ</span>
              <span className="block text-[var(--tm-accent)]">
                HEMEN ÖĞREN
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--tm-text-secondary)]">
              Gerçek sınav deneyimi, yapay zekâ destekli değerlendirme.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => openStudentAction("/app/test")}
                className="theme-important group rounded-full bg-[var(--tm-accent)] px-5 py-5 text-sm font-medium text-white shadow-none transition-colors hover:bg-[var(--tm-accent-hover)] sm:text-base"
              >
                Denemeye Başla
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>

        </div>

        <div className="relative z-20 pb-14 pt-0 sm:pb-16">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() =>
                  openStudentAction(
                    item.to === "/profile"
                      ? "/app/sonuclar"
                      : `/app${item.to}`,
                  )
                }
                className="group block h-full w-full text-left"
              >
                <Surface className="flex h-full min-h-[180px] flex-col p-5 transition-colors hover:bg-[var(--tm-bg-hover)] sm:p-6">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="inline-flex h-[52px] w-[52px] items-center justify-center text-[var(--tm-text-primary)]">
                      <img
                        src={item.icon}
                        alt=""
                        aria-hidden="true"
                        className={`${item.iconClassName} object-contain`}
                      />
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold leading-tight tracking-tight text-[var(--tm-text-primary)]">
                    {item.title}{" "}
                    <ArrowRight className="inline h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
                    {item.desc}
                  </p>
                </Surface>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
