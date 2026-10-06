import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listeningPracticeSections } from "./listening-practice-sections";

const DEFAULT_COVER =
  "linear-gradient(135deg, rgba(17,24,39,0.86) 0%, rgba(55,65,81,0.58) 55%, rgba(185,28,28,0.24) 100%)";

export default function ListeningPracticeList() {
  const navigate = useNavigate();
  const [sectionFilter, setSectionFilter] = useState("all");
  const visibleSections = listeningPracticeSections.filter(
    (section) => sectionFilter === "all" || String(section.number) === sectionFilter,
  );

  return (
    <section aria-label="Dinleme pratiği bölümleri">
      <div className="mb-4 flex justify-end gap-1 md:absolute md:right-0 md:top-0 md:mb-0">
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger
            aria-label="Dinleme bölümüne göre filtrele"
            className="h-9 w-auto min-w-[128px] gap-2 border-0 bg-transparent px-3 text-[13px] font-medium shadow-none hover:bg-[var(--tm-bg-hover)] focus:ring-0 focus:ring-offset-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
            <SelectItem value="all">Tüm bölümler</SelectItem>
            {listeningPracticeSections.map((section) => (
              <SelectItem key={section.number} value={String(section.number)}>
                Bölüm {section.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSections.map((section) => (
          <article
            key={section.number}
            role="button"
            tabIndex={0}
            aria-label={`Bölüm ${section.number}: ${section.title} — sınav düzenini incele`}
            onClick={() => navigate(`/app/pratik/dinleme/bolum-${section.number}`)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              navigate(`/app/pratik/dinleme/bolum-${section.number}`);
            }}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--tm-border-subtle)] bg-white transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-[#a5a59d] hover:shadow-[0_3px_12px_rgba(55,53,47,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)] motion-reduce:hover:translate-y-0"
          >
            <div className="relative aspect-[2/1] overflow-hidden bg-[var(--tm-bg-muted)]">
              <div className="h-full w-full" style={{ background: DEFAULT_COVER }} />
              <div className="absolute left-2 top-2">
                <span className="inline-flex rounded-md bg-white px-2 py-0.5 text-xs font-medium text-black shadow-sm">
                  Bölüm {section.number}
                </span>
              </div>
            </div>

            <div className="min-h-[68px] min-w-0 flex-1 px-4 pt-4">
              <h3 className="text-base font-semibold text-[var(--tm-text-primary)]">
                {section.title}
              </h3>
            </div>

            <div className="mx-4 mb-2 mt-2 inline-flex min-h-10 items-center justify-between gap-1.5 text-sm font-medium text-[var(--tm-text-primary)]">
              Sınav düzenini incele
              <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
