type FullTestSectionType = "listening" | "reading" | "writing" | "speaking";

type FullTestSection = {
  type: FullTestSectionType;
  label: string;
  score: number | null;
  statusLabel?: string;
};

type FullTestReportSummaryProps = {
  score: number;
  scoreStatus?: string;
  level: string;
  activeSection: string;
  sections: FullTestSection[];
  onSectionChange: (section: FullTestSectionType) => void;
};

const fullTestPalettes: Record<"original" | "soft", {
  goal: string;
  goalMuted: string;
  level: string;
  levelMuted: string;
  sections: Record<FullTestSectionType, string>;
}> = {
  original: {
    goal: "border-[#d3ccc3] bg-[#e8e3dc] text-[#302d29]",
    goalMuted: "text-[#716b63]",
    level: "border-[#ded9d2] bg-[#f7f5f2] text-[#292724]",
    levelMuted: "text-[#7b756d]",
    sections: {
      listening: "border-[#c5dcc5] bg-[var(--tm-cat-listening-bg)] text-[var(--tm-cat-listening-fg)]",
      reading: "border-[#bdd3de] bg-[var(--tm-cat-reading-bg)] text-[var(--tm-cat-reading-fg)]",
      writing: "border-[#e3cad5] bg-[var(--tm-cat-writing-bg)] text-[var(--tm-cat-writing-fg)]",
      speaking: "border-[#ead5a9] bg-[var(--tm-cat-speaking-bg)] text-[var(--tm-cat-speaking-fg)]",
    },
  },
  soft: {
    goal: "border-[#e4dae8] bg-[#f4f0f6] text-[#604b69]",
    goalMuted: "text-[#88778f]",
    level: "border-[#e5e1db] bg-[#faf9f7] text-[#302e2b]",
    levelMuted: "text-[#817b73]",
    sections: {
      listening: "border-[#d9e7d7] bg-[#eff5ee] text-[#365843]",
      reading: "border-[#d6e4e9] bg-[#eff5f7] text-[#395b6b]",
      writing: "border-[#eadce2] bg-[#f8f1f4] text-[#684756]",
      speaking: "border-[#eee1c6] bg-[#fbf5e8] text-[#684f31]",
    },
  },
};

const activePalette = fullTestPalettes.original;

export function FullTestReportSummary({
  score,
  scoreStatus,
  level,
  activeSection,
  sections,
  onSectionChange,
}: FullTestReportSummaryProps) {
  const belowLevelMatch = level.match(/^(.+?)\s+altı$/i);

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2" aria-label="Tam deneme sonuç özeti">
      <div data-full-level-card data-level-tone="warm-neutral" data-level-layout="stacked-left" className={`flex min-h-[96px] flex-col justify-between rounded-[12px] border px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-1 ${activePalette.level}`}>
        <p className="text-[12px] font-semibold">Seviye</p>
        <strong data-full-level-value className="mt-2 flex items-baseline gap-1.5 self-start text-left font-semibold leading-none">
          {belowLevelMatch ? (
            <>
              <span data-level-primary="true" className="text-[34px]">{belowLevelMatch[1]}</span>
              <span data-level-qualifier="true" className="text-[16px] font-semibold text-[#5f5a54]">altı</span>
            </>
          ) : (
            <span data-level-primary="true" className="text-[34px]">{level}</span>
          )}
        </strong>
      </div>

      <div data-full-score-card data-score-tone="warm-gray" className={`relative isolate flex min-h-[96px] overflow-hidden flex-col justify-between rounded-[12px] border px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-2 ${activePalette.goal}`}>
        <p className="text-[12px] font-semibold">
          Tam deneme puanı
        </p>
        <div className="mt-4 flex items-end gap-1.5">
          {scoreStatus ? (
            <strong className="text-[18px] font-semibold leading-6">{scoreStatus}</strong>
          ) : (
            <>
              <strong data-full-score-value className="text-[34px] font-semibold leading-none tabular-nums">{score}</strong>
              <span className={`pb-0.5 text-[11px] font-medium ${activePalette.goalMuted}`}>/ 75</span>
            </>
          )}
        </div>
      </div>

      {sections.map((section) => {
        const selected = activeSection === section.type;
        return (
          <button
            key={section.type}
            type="button"
            role="tab"
            aria-selected={selected}
            data-section={section.type}
            data-full-section-card
            data-selection-style="single-border"
            onClick={() => onSectionChange(section.type)}
            className={`flex min-h-[96px] min-w-0 flex-col justify-between rounded-[12px] border px-4 py-3.5 text-left shadow-[var(--tm-shadow-card)] transition hover:-translate-y-px hover:shadow-[0_5px_14px_rgba(15,15,15,.07)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 ${activePalette.sections[section.type]} ${selected ? "-translate-y-px !border-[#55524d] shadow-[0_4px_10px_rgba(15,15,15,.08)]" : ""}`}
          >
            <span className="text-[12px] font-semibold">{section.label}</span>
            <span className="mt-4 flex items-baseline gap-1">
              {section.statusLabel ? (
                <strong className="text-[13px] font-semibold leading-5">{section.statusLabel}</strong>
              ) : (
                <>
                  <strong className="text-[28px] font-semibold leading-none tabular-nums">{section.score ?? "—"}</strong>
                  <span className="text-[11px] font-medium opacity-70">/ 75</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </section>
  );
}
