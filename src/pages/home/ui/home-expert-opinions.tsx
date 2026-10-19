import { useEffect, useState } from "react";
import { Instagram, Quote, Send } from "lucide-react";
import { tm } from "@/components/tm";
import { trackExpertSocialClick } from "./expert-social-clicks";
import hakanPortrait from "@/assets/experts/hakan-birdal.webp";
import muattarPortrait from "@/assets/experts/muattar-mamatkarimova.webp";
import timurPortrait from "@/assets/experts/timur-makarov.webp";

type ExpertOpinion = {
  name: string;
  role: string;
  mediaKey: string;
  imageSrc: string;
  durationMs: number;
  text: string;
  imageClassName?: string;
  socialLinks?: { platform: "Telegram" | "Instagram"; url: string; channel?: boolean }[];
};

const experts: ExpertOpinion[] = [
  {
    name: "Hakan Birdal",
    role: "Türkiyeli Türkçe öğretmeni",
    mediaKey: "expert/hakan-birdal",
    imageSrc: hakanPortrait,
    durationMs: 10000,
    imageClassName: "scale-[1.32] -translate-x-[3%] translate-y-[1%]",
    socialLinks: [
      { platform: "Telegram", url: "https://t.me/hakanhocaturk", channel: true },
      { platform: "Instagram", url: "https://www.instagram.com/hakanhocatr/" },
    ],
    text: "İyi bir hazırlık, yalnızca soru çözmekle bitmez. Öğrenci hatasının nedenini de anlamalı. Açıklamalı pratikler ve beceri bazında sonuçlar, çalışmaya yön vermeyi kolaylaştırıyor.",
  },
  {
    name: "Muattar Mamatkarimova",
    role: "Türkçe öğretmeni",
    mediaKey: "expert/muattar-mamatkarimova",
    imageSrc: muattarPortrait,
    durationMs: 3000,
    socialLinks: [
      { platform: "Telegram", url: "https://t.me/+wb_l3Fd6bIdiMWJi", channel: true },
    ],
    text: "Sınav öncesi öğrencilere gerçek seviyelerini gösterecek böyle bir platforma uzun zamandır ihtiyaç vardı.",
  },
  {
    name: "Timur Makarov",
    role: "Platform Kurucusu ve Geliştiricisi",
    mediaKey: "expert/timur-makarov",
    imageSrc: timurPortrait,
    durationMs: 3000,
    socialLinks: [
      { platform: "Telegram", url: "https://t.me/zargana_deus_ex_machina" },
      { platform: "Instagram", url: "https://www.instagram.com/deusexmachina.11/" },
    ],
    text: "Bu platform, gerçek sınav deneyimini yaşamanız, seviyenizi ve gelişime açık yönlerinizi net şekilde görmeniz amacıyla hazırlanmıştır.",
  },
];

// Approved public showcase copies use content-hashed URLs, independently of exam media.
const HomeExpertOpinions = () => {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(document.hidden);
  const isPaused = prefersReducedMotion || isHovered || isFocused;

  useEffect(() => {
    const updateVisibility = () => setIsPageHidden(document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);
  const expert = experts[activeIndex];

  useEffect(() => {
    if (isPaused || isPageHidden) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        setActiveIndex((current) => (current + 1) % experts.length);
      }
    }, expert.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isPaused, isPageHidden, expert.durationMs]);

  return (
    <section
      id="ogretmen-gorusleri"
      className="scroll-mt-20 bg-white py-10 sm:py-14"
      aria-labelledby="expert-opinions-title"
      aria-roledescription="yorum slaytları"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
      }}
    >
      <div className={tm.container}>
        <div className="mx-auto max-w-5xl">
          <h2 id="expert-opinions-title" className="mb-7 text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-3xl">
            Uzmanlar ne diyor?
          </h2>
          <div className="rounded-2xl bg-[#eef1f3] p-6 shadow-sm sm:p-10 md:px-12 md:py-11">
            <div aria-live={isPaused ? "polite" : "off"} aria-atomic="true">
              <figure className="grid min-h-[544px] grid-cols-1 grid-rows-[144px_minmax(0,1fr)_auto] gap-y-6 md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_208px] md:grid-rows-[minmax(0,1fr)_auto] md:gap-x-12 md:gap-y-0 lg:min-h-[288px]">
                <blockquote key={expert.mediaKey} className="row-start-2 animate-in fade-in duration-300 motion-reduce:animate-none text-lg italic leading-7 text-[var(--tm-text-primary)] sm:text-xl sm:leading-8 md:col-start-1 md:row-start-1">
                  <Quote className="mb-4 h-7 w-7 fill-current stroke-0" aria-hidden="true" />
                  <p>“{expert.text}”</p>
                </blockquote>
                <div className="relative row-start-1 mx-auto h-36 w-36 self-center overflow-hidden rounded-full bg-[var(--tm-bg-hover)] md:col-start-2 md:row-span-2 md:row-start-1 md:h-52 md:w-52" data-protected-media="expert-photo" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
                  {experts.map((item) => (
                    <img
                      key={item.mediaKey}
                      src={item.imageSrc}
                      alt=""
                      width={208}
                      height={208}
                      hidden={item.mediaKey !== expert.mediaKey || failedImages.includes(item.mediaKey)}
                      className={`pointer-events-none h-full w-full object-cover ${item.imageClassName || ""}`}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((current) => current.includes(item.mediaKey) ? current : [...current, item.mediaKey])}
                    />
                  ))}
                  {failedImages.includes(expert.mediaKey) && (
                    <span className="flex h-full items-center justify-center text-3xl font-medium text-[var(--tm-text-secondary)]" aria-hidden="true">
                      {expert.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
                    </span>
                  )}
                </div>
                <figcaption className="row-start-3 min-h-[100px] md:col-start-1 md:row-start-2 md:mt-6">
                  <p className="text-base font-semibold text-[var(--tm-text-primary)]">{expert.name}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">{expert.role}</p>
                  {expert.socialLinks && (
                    <nav className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1" aria-label={`${expert.name} sosyal medya hesapları`}>
                      {expert.socialLinks.map((link) => (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${expert.name} ${link.platform} ${link.channel ? "kanalı" : "hesabı"}`}
                          title="Yeni sekmede açılır"
                          onClick={() => trackExpertSocialClick(expert.mediaKey, link.platform === "Telegram" ? "TELEGRAM" : "INSTAGRAM")}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-medium text-[var(--tm-text-secondary)] underline decoration-[var(--tm-border-default)] underline-offset-4 hover:text-[var(--tm-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-accent)]"
                        >
                          {link.platform === "Telegram" ? <Send className="h-4 w-4" aria-hidden="true" /> : <Instagram className="h-4 w-4" aria-hidden="true" />}
                          {link.platform}
                        </a>
                      ))}
                    </nav>
                  )}
                </figcaption>
              </figure>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            {experts.map((item, index) => (
              <button
                key={item.mediaKey}
                type="button"
                aria-label={`${item.name} yorumunu göster`}
                aria-pressed={index === activeIndex}
                className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-accent)]"
                onClick={() => setActiveIndex(index)}
              >
                <span className={`h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none ${index === activeIndex ? "w-6 bg-[var(--tm-text-primary)]" : "w-2 bg-[var(--tm-border-default)]"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeExpertOpinions;
