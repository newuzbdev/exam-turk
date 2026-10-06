type SpeakingResultSectionSummaryProps = {
  strength?: string | null;
  limiter?: string | null;
  summary?: string | null;
  compact?: boolean;
};

type SummaryRow = {
  key: "strength" | "limiter" | "summary";
  label: string;
  text: string;
  className: string;
  headingClassName: string;
};

export default function SpeakingResultSectionSummary({
  strength,
  limiter,
  summary,
  compact = false,
}: SpeakingResultSectionSummaryProps) {
  const rows: SummaryRow[] = [
    {
      key: "strength",
      label: "Güçlü yön",
      text: strength?.trim() || "",
      className: "border-[#d9e8d6] bg-[#eef6ec]",
      headingClassName: "text-[#2f6f3d]",
    },
    {
      key: "limiter",
      label: "Geliştirilecek nokta",
      text: limiter?.trim() || "",
      className: "border-[#efd9d6] bg-[#fbefee]",
      headingClassName: "text-[#a93636]",
    },
    {
      key: "summary",
      label: "Değerlendirme özeti",
      text: summary?.trim() || "",
      className: "border-[#deded9] bg-[#f5f5f3]",
      headingClassName: "text-[var(--tm-text-primary)]",
    },
  ];
  const visibleRows = rows.filter((row) => Boolean(row.text));

  if (visibleRows.length === 0) return null;

  return (
    <section
      data-speaking-section-summary
      aria-label="Bölüm değerlendirme özeti"
      className={compact ? "grid gap-3" : "grid gap-3 lg:grid-cols-12"}
    >
      {visibleRows.map((row) => (
        <article
          key={row.key}
          className={`rounded-[8px] border px-4 py-3 ${compact ? "" : "shadow-[var(--tm-shadow-card)] sm:px-6 lg:col-span-4"} ${row.className}`}
        >
          <h2
            className={`text-[13px] font-semibold leading-5 ${row.headingClassName}`}
          >
            {row.label}
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-[var(--tm-text-primary)]">
            {row.text}
          </p>
        </article>
      ))}
    </section>
  );
}
