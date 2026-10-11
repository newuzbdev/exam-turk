import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Instagram, Send, Youtube } from "lucide-react";
import { tm } from "@/components/tm";
import { footerExamHeading } from "@/components/footer-exam-status";
import axiosPrivate from "@/config/api";
import { EXAM_SOURCES } from "@/data/exam-information";
import { LegalLinks } from "@/components/legal-links";
import { LEGAL_DOCUMENTS_AVAILABLE, LEGAL_OPERATOR } from "@/config/legal";
import { SUPPORT_TELEGRAM_URL } from "@/config/support";

const footerLinks = [
  { href: "/#fiyatlandirma", label: "Fiyatlandırma" },
  { href: "/#sss", label: "Sıkça sorulan sorular" },
  { href: SUPPORT_TELEGRAM_URL, label: "Destek", external: true },
];

const platformLinks = [
  { href: "/#seviye-analizi", label: "Seviye analizi" },
  { href: "/#kullanici-deneyimleri", label: "Kullanıcı deneyimleri" },
  { href: "/#son-sinav-sonuclari", label: "Son sınav sonuçları" },
];

const socialLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--tm-text-secondary)] transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)] motion-reduce:hover:translate-y-0";

type PublicExamSession = {
  id: string;
  examStart: string;
  examEnd: string;
  sourceUrl: string;
};

const publishedExamFallback: PublicExamSession[] = [
  { id: "2026-09-13", examStart: "2026-09-13", examEnd: "2026-09-15", sourceUrl: EXAM_SOURCES.calendar },
  { id: "2026-10-10", examStart: "2026-10-10", examEnd: "2026-10-12", sourceUrl: EXAM_SOURCES.calendar },
  { id: "2026-11-08", examStart: "2026-11-08", examEnd: "2026-11-10", sourceUrl: EXAM_SOURCES.calendar },
  { id: "2026-12-12", examStart: "2026-12-12", examEnd: "2026-12-14", sourceUrl: EXAM_SOURCES.calendar },
];

const uzbekistanToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const examDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Tashkent",
});

const formatExamDate = (value: string) =>
  examDateFormatter.format(new Date(`${value}T12:00:00+05:00`));

const UpcomingExam = () => {
  const today = uzbekistanToday();
  const exams = useQuery({
    queryKey: ["public", "official-exams", "upcoming"],
    queryFn: async (): Promise<PublicExamSession[]> => {
      try {
        const response = await axiosPrivate.get("/api/official-exams/upcoming");
        const payload = response.data?.success !== undefined ? response.data.data : response.data;
        return Array.isArray(payload) ? payload : [];
      } catch {
        return publishedExamFallback.filter((exam) => exam.examEnd >= today);
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const nextExam = exams.data?.[0];
  const heading = footerExamHeading(nextExam, today);

  return (
    <div className="max-w-[17rem]">
      <div className="flex items-center gap-2 text-[var(--tm-text-tertiary)]">
        <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-[0.12em]">{heading}</p>
      </div>
      {exams.isPending ? (
        <div className="mt-4 space-y-2" aria-label="Sınav takvimi yükleniyor">
          <div className="h-4 w-36 animate-pulse rounded bg-[var(--tm-bg-hover)]" />
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--tm-bg-hover)]" />
        </div>
      ) : exams.isError ? (
        <p className="mt-3 text-sm leading-6 text-[var(--tm-text-secondary)]">
          Sınav takvimi şu anda görüntülenemiyor.
        </p>
      ) : nextExam ? (
        <>
          <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--tm-text-primary)]">
            {formatExamDate(nextExam.examStart)}
            {nextExam.examEnd !== nextExam.examStart && (
              <> – {formatExamDate(nextExam.examEnd)}</>
            )}
          </p>
          <a
            href={nextExam.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--tm-text-secondary)] transition-colors hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tm-focus)]"
          >
            Resmî takvimi aç
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </a>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--tm-text-secondary)]">
          Yeni sınav dönemi henüz açıklanmadı.
        </p>
      )}
    </div>
  );
};

export const Footer = () => {
  return (
    <footer className="border-t border-[var(--tm-border-subtle)] bg-white">
      <div className={`${tm.container} py-10 sm:py-12`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,2fr)] lg:items-start lg:gap-16 xl:gap-20">
          <div className="max-w-md">
            <a
              href="/"
              className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tm-focus)]"
              aria-label="TURKISHMOCK ana sayfa"
            >
              <img
                src="/logo11.svg"
                alt="TURKISHMOCK"
                className="-mt-1 h-10 w-auto object-contain"
                draggable={false}
              />
            </a>
            <blockquote className="mt-6 max-w-[20rem]">
              <p className="font-serif text-[17px] leading-7 text-[var(--tm-text-primary)]">
                “Dilimin sınırları, dünyamın sınırlarıdır.”
              </p>
              <cite className="mt-2 block text-sm not-italic text-[var(--tm-text-tertiary)]">
                Ludwig Wittgenstein
              </cite>
            </blockquote>

            <div className="mt-6 flex items-center gap-1" aria-label="Sosyal medya hesapları">
              <a
                href="https://t.me/turkishmock"
                target="_blank"
                rel="noopener noreferrer"
                className={socialLinkClass}
                aria-label="TURKISHMOCK Telegram hesabı"
              >
                <Send className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              </a>
              <a
                href="https://www.instagram.com/turkishmock.uz?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className={socialLinkClass}
                aria-label="TURKISHMOCK Instagram hesabı"
              >
                <Instagram className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              </a>
              <span
                className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-[var(--tm-text-tertiary)] opacity-55"
                aria-label="TURKISHMOCK YouTube hesabı yakında"
                title="YouTube yakında"
              >
                <Youtube className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-8 xl:gap-12">
            <nav aria-label="Platform bağlantıları">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">
                Platform
              </p>
              <ul className="mt-4 space-y-3">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-[var(--tm-text-secondary)] transition-colors hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tm-focus)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Footer menüsü">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">
                Keşfet
              </p>
              <ul className="mt-4 space-y-3">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-sm font-medium text-[var(--tm-text-secondary)] transition-colors hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tm-focus)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <UpcomingExam />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--tm-border-subtle)] pt-5 text-xs leading-5 text-[var(--tm-text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {LEGAL_OPERATOR.name}. Tüm hakları saklıdır.</p>
          <LegalLinks className="justify-end sm:ml-auto" />
          {!LEGAL_DOCUMENTS_AVAILABLE && <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="https://t.me/timur_makarov"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--tm-text-primary)]"
            >
              Kurucu: Timur Makarov
            </a>
          </div>}
        </div>
      </div>
    </footer>
  );
};
