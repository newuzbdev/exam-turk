import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FileText, RefreshCw } from "lucide-react";
import { NavLink } from "react-router-dom";

import { StudentPageShell, tm } from "@/components/tm";
import {
  buildDashboardReports,
  type DashboardReportSummary,
} from "@/pages/dashboard/dashboard-performance";
import { useDashboardResults } from "@/pages/dashboard/dashboard-results-api";
import { reportFilters, reportTitle, selectReports, type ReportFilter } from './reports-list';
import './reports-page.css';

const formatDate = (summary: DashboardReportSummary) => {
  const value =
    summary.result.completedAt ||
    summary.result.createdAt ||
    summary.result.startedAt;

  if (!value) return "Tarih yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const pendingEvaluationSections = (summary: DashboardReportSummary) =>
  summary.sectionLabels.filter((label) => label === "Yazma" || label === "Konuşma");

const pendingEvaluationLabel = (summary: DashboardReportSummary) => {
  const sections = pendingEvaluationSections(summary);
  if (sections.length === 1) return `${sections[0]} sonucu`;
  if (sections.length > 1) return `${sections.join(" + ")} sonucu`;
  return "Sonuç durumu";
};

function ReportRow({ summary }: { summary: DashboardReportSummary }) {
  const title = reportTitle(summary);
  const evaluationStatusText = summary.evaluationState === "FAILED"
    ? "Değerlendirilemedi"
    : "Değerlendiriliyor";

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--tm-border-subtle)] bg-white">
      <NavLink
        to={`/overall-results/${summary.result.id}?source=reports`}
        className="group block px-4 py-3.5 transition-colors hover:bg-[var(--tm-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tm-focus)] sm:px-5"
        aria-label={`${title} · ${formatDate(summary)} · ${summary.evaluationState === 'READY' ? `${Math.round(summary.score ?? 0)} / 75, ${summary.level}` : `${pendingEvaluationLabel(summary)} ${evaluationStatusText.toLocaleLowerCase('tr-TR')}`} — Raporu aç`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-[var(--tm-text-primary)]">
                {title}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--tm-text-tertiary)]">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.9} />
                {formatDate(summary)}
              </span>
            </div>

            <p className="mt-1 text-xs text-[var(--tm-text-secondary)]">
              {summary.kind === 'Tam deneme' ? 'Dört beceri' : 'Bölüm testi'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-5 border-t border-[var(--tm-border-subtle)] pt-4 sm:w-44 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pr-2 sm:pt-0">
            <div className="text-left sm:flex-1 sm:text-center">
              {(summary.evaluationState !== 'READY' || summary.sectionLabels.length > 1) && <p className="text-xs font-medium text-[var(--tm-text-tertiary)]">
                {summary.evaluationState === "READY"
                  ? 'Genel puan'
                  : pendingEvaluationLabel(summary)}
              </p>}
              {summary.evaluationState === "READY" ? (
                <div>
                  <div className="flex items-baseline gap-1.5 sm:justify-center">
                    <strong className="text-2xl font-semibold tabular-nums text-[var(--tm-text-primary)]">
                      {Math.round(summary.score ?? 0)}
                    </strong>
                    <span className="text-sm font-normal text-[var(--tm-text-secondary)]">/ 75</span>
                  </div>
                  <span className="mt-0.5 block text-sm font-normal text-[var(--tm-text-secondary)]">
                    {summary.level}
                  </span>
                </div>
              ) : (
                <strong
                  className={`mt-1 block text-[15px] font-semibold ${
                    summary.evaluationState === "FAILED"
                      ? "text-[#9f3535]"
                      : "text-[var(--tm-text-primary)]"
                  }`}
                >
                  {evaluationStatusText}
                </strong>
              )}
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-[var(--tm-text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--tm-text-primary)]"
              strokeWidth={2}
            />
          </div>
        </div>
      </NavLink>
    </article>
  );
}

export default function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [limit, setLimit] = useState(20);
  const resultsQuery = useDashboardResults();
  const reports = useMemo(
    () => buildDashboardReports(resultsQuery.data ?? []),
    [resultsQuery.data],
  );
  const {items: visibleReports, total} = useMemo(
    () => selectReports(reports, filter, limit),
    [filter, reports, limit],
  );

  return (
    <div className="reports-page">
    <StudentPageShell
      title="Sonuçlarınız"
    >
      {resultsQuery.isLoading ? (
        <div className="space-y-3" aria-label="Raporlar yükleniyor">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-lg border border-[var(--tm-border-subtle)] bg-white"
            />
          ))}
        </div>
      ) : resultsQuery.isError && !resultsQuery.data ? (
        <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-white px-5 py-12 text-center">
          <RefreshCw
            className="mx-auto h-5 w-5 text-[var(--tm-text-tertiary)]"
            strokeWidth={1.9}
          />
          <h2 className="mt-3 text-base font-semibold">Raporlar yüklenemedi</h2>
          <p className="mt-1 text-sm text-[var(--tm-text-secondary)]">
            Bağlantını kontrol edip yeniden deneyebilirsin.
          </p>
          <button
            type="button"
            className={`${tm.subtleButton} mt-5 px-3 py-2 text-sm font-semibold`}
            onClick={() => resultsQuery.refetch()}
          >
            Yeniden dene
          </button>
        </section>
      ) : reports.length === 0 ? (
        <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-white px-5 py-14 text-center">
          <FileText
            className="mx-auto h-6 w-6 text-[var(--tm-text-tertiary)]"
            strokeWidth={1.8}
          />
          <h2 className="mt-4 text-lg font-semibold">Henüz raporun yok</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--tm-text-secondary)]">
            Tamamladığın ilk mock veya bölüm testinin raporu burada görünür.
          </p>
          <NavLink
            to="/app/test"
            className={`${tm.primaryButton} mt-6 inline-flex h-10 items-center justify-center px-4 text-sm font-semibold`}
          >
            Mock Testleri Gör
          </NavLink>
        </section>
      ) : (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-[var(--tm-border-subtle)] bg-white p-1"
              role="group"
              aria-label="Rapor türü"
            >
              {reportFilters.map((item) => {
                const active = item.key === filter;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { setFilter(item.key); setLimit(20); }}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                      active
                        ? "bg-[var(--tm-bg-active)] text-[var(--tm-text-primary)]"
                        : "text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--tm-text-tertiary)]">
              {total} rapor
            </p>
          </div>

          {visibleReports.length > 0 ? (
            <div className="space-y-2">
              {visibleReports.map((summary) => (
                <ReportRow
                  key={summary.result.id}
                  summary={summary}
                />
              ))}
              {visibleReports.length < total && (
                <div className="pt-4 text-center">
                  <button type="button" className={`${tm.subtleButton} min-h-10 px-4 py-2 text-sm font-medium`} onClick={() => setLimit(value => value + 20)}>
                    Daha fazla göster
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--tm-border-default)] px-5 py-10 text-center text-sm text-[var(--tm-text-secondary)]">
              Bu türde tamamlanmış rapor bulunmuyor.
            </div>
          )}
        </div>
      )}
    </StudentPageShell>
    </div>
  );
}
