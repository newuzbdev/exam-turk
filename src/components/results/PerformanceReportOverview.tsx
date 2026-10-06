import type { ReactNode } from "react";

export type PerformanceReportStatTone =
  | "success"
  | "danger"
  | "muted"
  | "default";

export type PerformanceReportScoreTone =
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "goal";

export interface PerformanceReportStat {
  label: string;
  value: string | number;
  tone?: PerformanceReportStatTone;
}

export interface PerformanceReportSectionStat {
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  blank: number;
}

interface PerformanceReportOverviewProps {
  eyebrow?: string;
  title: string;
  description?: string;
  participant: string;
  completedAt: string;
  scoreLabel: string;
  score: number;
  scoreStatus?: string;
  level: string;
  stats?: PerformanceReportStat[];
  actions?: ReactNode;
  sectionNavigation?: ReactNode;
  integrateStats?: boolean;
  sectionStats?: PerformanceReportSectionStat[];
  scoreTone?: PerformanceReportScoreTone;
  summaryContent?: ReactNode;
  hideDefaultSummary?: boolean;
}

const statToneClass: Record<PerformanceReportStatTone, string> = {
  success: "border-t-[#438553] text-[#2f6f3d]",
  danger: "border-t-[#c74646] text-[#a93636]",
  muted: "border-t-[#aaa9a2] text-[var(--tm-text-secondary)]",
  default: "border-t-[#77766f] text-[var(--tm-text-primary)]",
};

const scoreToneClass: Record<
  PerformanceReportScoreTone,
  {
    card: string;
    foreground: string;
    secondary: string;
    badge: string;
  }
> = {
  listening: {
    card:
      "border-[#c5dcc5] bg-[var(--tm-cat-listening-bg)]",
    foreground: "text-[var(--tm-cat-listening-fg)]",
    secondary: "text-[#4f6f58]",
    badge:
      "border-[#bdd5bd] bg-white/55 text-[var(--tm-cat-listening-fg)]",
  },
  reading: {
    card: "border-[#bdd3de] bg-[var(--tm-cat-reading-bg)]",
    foreground: "text-[var(--tm-cat-reading-fg)]",
    secondary: "text-[#48687a]",
    badge:
      "border-[#b7ceda] bg-white/55 text-[var(--tm-cat-reading-fg)]",
  },
  writing: {
    card: "border-[#e3cad5] bg-[var(--tm-cat-writing-bg)]",
    foreground: "text-[var(--tm-cat-writing-fg)]",
    secondary: "text-[#755267]",
    badge:
      "border-[#ddc2ce] bg-white/55 text-[var(--tm-cat-writing-fg)]",
  },
  speaking: {
    card: "border-[#ead5a9] bg-[var(--tm-cat-speaking-bg)]",
    foreground: "text-[var(--tm-cat-speaking-fg)]",
    secondary: "text-[#715538]",
    badge:
      "border-[#e2cb9e] bg-white/55 text-[var(--tm-cat-speaking-fg)]",
  },
  goal: {
    card: "border-[#d7c9de] bg-[var(--tm-cat-goal-bg)]",
    foreground: "text-[var(--tm-cat-goal-fg)]",
    secondary: "text-[#6e5679]",
    badge:
      "border-[#d0c1d8] bg-white/55 text-[var(--tm-cat-goal-fg)]",
  },
};

export default function PerformanceReportOverview({
  eyebrow,
  title,
  description,
  participant,
  completedAt,
  scoreLabel,
  score,
  scoreStatus,
  level,
  stats = [],
  actions,
  sectionNavigation,
  integrateStats = false,
  sectionStats = [],
  scoreTone = "goal",
  summaryContent,
  hideDefaultSummary = false,
}: PerformanceReportOverviewProps) {
  const scoreColors = scoreToneClass[scoreTone];
  const belowLevelMatch = level.match(/^(.+?)\s+altı$/i);
  const integratedStats =
    stats.length > 0
      ? stats
      : sectionStats.length > 0
        ? [
            {
              label: "Doğru",
              value: sectionStats.reduce(
                (total, section) => total + section.correct,
                0,
              ),
              tone: "success" as const,
            },
            {
              label: "Yanlış",
              value: sectionStats.reduce(
                (total, section) => total + section.incorrect,
                0,
              ),
              tone: "danger" as const,
            },
            {
              label: "Boş",
              value: sectionStats.reduce(
                (total, section) => total + section.blank,
                0,
              ),
              tone: "muted" as const,
            },
          ]
        : [];
  const integratedSummaryVisible =
    integratedStats.length > 0 || sectionStats.length > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tm-text-tertiary)]">
              {eyebrow}
            </p>
          )}
          <h1 className={`${eyebrow ? "mt-1" : ""} text-[26px] font-semibold leading-8 text-[var(--tm-text-primary)] sm:text-[28px]`}>
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--tm-text-secondary)]">
              {description}
            </p>
          )}
          <p className="mt-2 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
            <strong className="font-medium text-[var(--tm-text-secondary)]">
              {participant}
            </strong>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <time>{completedAt}</time>
          </p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>

      {hideDefaultSummary ? null : summaryContent ? (
        summaryContent
      ) : integrateStats ? (
        <div
          data-reading-score-card
          data-performance-score-tone={scoreTone}
          className={`grid gap-3 ${
            integratedSummaryVisible
              ? "sm:grid-cols-2 lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.7fr)] lg:grid-rows-2"
              : "sm:grid-cols-2"
          }`}
        >
          <section
            className={`order-2 flex min-h-[96px] min-w-0 items-stretch rounded-[12px] border px-4 py-3.5 shadow-[var(--tm-shadow-card)] ${scoreColors.card} ${
              integratedSummaryVisible
                ? "sm:col-start-2 lg:col-start-1 lg:row-start-2"
                : ""
            }`}
          >
            <dl className="flex w-full flex-col justify-between gap-2">
              <dt className="text-[13px] font-semibold leading-5 text-[#292724]">
                {scoreLabel}
              </dt>
              <dd className="flex shrink-0 items-end self-start gap-1.5">
                {scoreStatus ? (
                  <span
                    className="max-w-[220px] text-left text-[18px] font-semibold leading-6 text-[#292724]"
                  >
                    {scoreStatus}
                  </span>
                ) : (
                  <>
                    <span
                      className="text-[34px] font-semibold leading-9 tabular-nums text-[#292724]"
                    >
                      {score}
                    </span>
                    <span
                      className="pb-0.5 text-[13px] font-medium text-[#716b63]"
                    >
                      / 75
                    </span>
                  </>
                )}
              </dd>
            </dl>
          </section>

          <section
            className={`order-1 flex min-h-[96px] min-w-0 items-stretch rounded-[12px] border border-[#ded9d2] bg-[#f7f5f2] px-4 py-3.5 shadow-[var(--tm-shadow-card)] ${
              integratedSummaryVisible
                ? "sm:col-start-1 lg:col-start-1 lg:row-start-1"
                : ""
            }`}
          >
            <dl className="flex w-full flex-col justify-between gap-2">
              <dt className="text-[13px] font-semibold leading-5 text-[#292724]">
                Seviye
              </dt>
              <div className="self-start">
                <dt className="sr-only">CEFR seviyesi</dt>
                <dd className="flex items-baseline justify-start gap-1.5 text-left font-semibold leading-none text-[#292724]">
                  {belowLevelMatch ? (
                    <>
                      <span className="text-[34px]">{belowLevelMatch[1]}</span>
                      <span className="text-[16px] font-semibold text-[#5f5a54]">altı</span>
                    </>
                  ) : (
                    <span className="text-[34px]">{level}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {integratedSummaryVisible && (
            <section className="order-3 flex min-h-[204px] min-w-0 flex-col rounded-[12px] border border-[#ead5a9] bg-[var(--tm-cat-speaking-bg)] px-5 py-3 shadow-[var(--tm-shadow-card)] sm:col-span-2 sm:px-6 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <h2 className="text-[13px] font-semibold leading-5 text-[var(--tm-cat-speaking-fg)]">
                {sectionStats.length > 0 ? "Bölüm dağılımı" : "Cevap özeti"}
              </h2>
              <div className="mt-1.5 overflow-hidden">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">
                    Sınav bölümlerindeki doğru, yanlış ve boş cevap dağılımı
                  </caption>
                  <colgroup>
                    <col className="w-[43%]" />
                    <col className="w-[19%]" />
                    <col className="w-[19%]" />
                    <col className="w-[19%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#dfc38d]">
                      <th className="pb-1 text-[12px] font-medium leading-4 text-[#715538]">
                        Bölüm
                      </th>
                      {integratedStats.map((stat) => (
                        <th
                          key={stat.label}
                          className="pb-1 text-center text-[12px] font-medium leading-4 text-[#715538]"
                        >
                          {stat.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {integratedStats.length > 0 && (
                      <tr className="border-b border-[#dfc38d]">
                        <th className="py-0.5 text-[13px] font-semibold leading-5 text-[var(--tm-cat-speaking-fg)]">
                          Toplam
                        </th>
                        {integratedStats.map((stat) => (
                          <td
                            key={stat.label}
                            className="py-0.5 text-center text-[16px] font-semibold leading-5 tabular-nums text-[var(--tm-cat-speaking-fg)]"
                          >
                            {stat.value}
                          </td>
                        ))}
                      </tr>
                    )}
                    {sectionStats.map((stat) => (
                      <tr
                        key={stat.label}
                        className="border-b border-[#ead4aa] last:border-b-0"
                      >
                        <th className="py-0.5 text-[13px] font-medium leading-4 text-[#60472f]">
                          {stat.label}
                          <span className="font-normal text-[#80694f]">
                            {" · "}
                            {stat.total} soru
                          </span>
                        </th>
                        <td className="py-0.5 text-center text-[13px] font-semibold leading-4 tabular-nums text-[#2f6f3d]">
                          {stat.correct}
                        </td>
                        <td className="py-0.5 text-center text-[13px] font-semibold leading-4 tabular-nums text-[#a93636]">
                          {stat.incorrect}
                        </td>
                        <td className="py-0.5 text-center text-[13px] font-semibold leading-4 tabular-nums text-[#696862]">
                          {stat.blank}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            stats.length > 0
              ? "grid-cols-3 lg:grid-cols-[minmax(280px,1.4fr)_repeat(3,minmax(0,0.72fr))]"
              : "grid-cols-1"
          }`}
        >
          <section
            data-performance-score-tone={scoreTone}
            className={`flex min-h-[142px] flex-col justify-between rounded-[8px] border px-5 py-5 shadow-[var(--tm-shadow-card)] ${scoreColors.card} ${
              stats.length > 0 ? "col-span-3 lg:col-span-1" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={`text-[12px] font-semibold ${scoreColors.foreground}`}
              >
                {scoreLabel}
              </p>
              <span
                className={`rounded-[5px] border px-2 py-1 text-[11px] font-semibold ${scoreColors.badge}`}
              >
                {level}
              </span>
            </div>
            <div className="mt-5 flex items-end gap-2">
              {scoreStatus ? (
                <span
                  className={`text-[19px] font-semibold leading-7 ${scoreColors.foreground}`}
                >
                  {scoreStatus}
                </span>
              ) : (
                <>
                  <span
                    className={`text-[40px] font-semibold leading-none tabular-nums ${scoreColors.foreground}`}
                  >
                    {score}
                  </span>
                  <span
                    className={`pb-1 text-[14px] font-medium ${scoreColors.secondary}`}
                  >
                    / 75
                  </span>
                </>
              )}
            </div>
          </section>

          {stats.map((stat, index) => (
            <section
              key={`${stat.label}-${index}`}
              className={`flex min-h-[142px] min-w-0 flex-col justify-between rounded-[8px] border border-[var(--tm-border-subtle)] border-t-[3px] bg-white px-4 py-5 shadow-[var(--tm-shadow-card)] ${
                statToneClass[stat.tone || "default"]
              }`}
            >
              <span className="text-[12px] font-medium leading-5 text-[var(--tm-text-secondary)]">
                {stat.label}
              </span>
              <span className="mt-5 text-[30px] font-semibold leading-none tabular-nums">
                {stat.value}
              </span>
            </section>
          ))}
        </div>
      )}

      {sectionNavigation && (
        <section className="rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-4 py-4 shadow-[var(--tm-shadow-card)] sm:px-5">
          {sectionNavigation}
        </section>
      )}
    </div>
  );
}
