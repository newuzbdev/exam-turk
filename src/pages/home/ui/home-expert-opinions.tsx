import { useEffect, useState } from "react";
import { tm } from "@/components/tm";
import { toApiUrl } from "@/config/runtime";

const experts = [
  {
    name: "Muattar Mamatkarimova",
    role: "Türkçe Eğitmeni",
    mediaKey: "expert/muattar-mamatkarimova",
    text: "Sınav öncesi öğrencilere gerçek seviyelerini gösterecek böyle bir platforma uzun zamandır ihtiyaç vardı.",
  },
  {
    name: "Timur Makarov",
    role: "Platform Kurucusu ve Geliştiricisi",
    mediaKey: "expert/timur-makarov",
    text: "Bu platform, gerçek sınav deneyimini yaşamanız, seviyenizi ve gelişime açık yönlerinizi net şekilde görmeniz amacıyla hazırlanmıştır.",
  },
];

const HomeExpertOpinions = () => {
  const [expertImages, setExpertImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    const loadExpertImages = async () => {
      try {
        const response = await fetch(
          toApiUrl("/api/file/public/expert-media"),
          {
            cache: "no-store",
            referrerPolicy: "no-referrer",
          },
        );
        if (!response.ok) return;
        const media = (await response.json()) as Record<string, string>;
        if (active) setExpertImages(media);
      } catch {
        // The text remains usable when a media request is temporarily unavailable.
      }
    };

    void loadExpertImages();
    const refreshTimer = window.setInterval(loadExpertImages, 45 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  return (
    <section className="bg-white py-8 sm:py-10" aria-labelledby="expert-opinions-title">
      <div className={tm.container}>
        <div className="mx-auto max-w-5xl border-t border-[var(--tm-border-default)] pt-8 sm:pt-10">
          <h2 id="expert-opinions-title" className="mb-6 text-center text-lg font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-xl">
            Platform üzerine görüşler
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {experts.map((expert) => (
              <figure key={expert.name} className="flex h-full flex-col rounded-xl border border-[var(--tm-border-default)] bg-[var(--tm-bg-page)] p-6 sm:p-7">
                <blockquote className="flex-1 text-base leading-7 text-[var(--tm-text-primary)]">
                  “{expert.text}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--tm-bg-hover)]" data-protected-media="expert-photo" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
                    {expertImages[expert.mediaKey] ? (
                      <img src={expertImages[expert.mediaKey]} alt="" className="pointer-events-none h-full w-full object-cover" crossOrigin="anonymous" decoding="async" draggable={false} referrerPolicy="no-referrer" onError={() => setExpertImages((current) => {
                        const next = { ...current };
                        delete next[expert.mediaKey];
                        return next;
                      })} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs font-medium text-[var(--tm-text-secondary)]" aria-hidden="true">
                        {expert.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--tm-text-primary)]">{expert.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--tm-text-secondary)]">{expert.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeExpertOpinions;
