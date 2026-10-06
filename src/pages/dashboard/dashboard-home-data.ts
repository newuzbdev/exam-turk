import type {
  DashboardResultSummary,
  DashboardSectionKey,
} from "./dashboard-performance";
import type { WorkbookDocumentSummary } from "../lessons/workbook/types";
import {
  buildDashboardReports,
  getCefrLevelFromScore,
  getDashboardSectionScores,
} from "./dashboard-performance.ts";
import type { DashboardOverallResult } from "./dashboard-performance";

export type DashboardPeriod = "30" | "90" | "all";
export type ProgressPoint = { id: string; score: number; timestamp: number };
export type ProgressSkill = {
  key: DashboardSectionKey;
  label: string;
  average: number | null;
  previousAverage: number | null;
  level: string | null;
  points: ProgressPoint[];
  sampleCount: number;
  sample: ProgressPoint[];
  isStale: boolean;
  lastTestAt: number | null;
};
export const dashboardNumber = (value: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);
export const dashboardDate = (value: number | string) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
export const dashboardFullDate = (value: number | string) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Asia/Tashkent", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(value));
export const dashboardReportPath = (id: string) =>
  `/overall-results/${encodeURIComponent(id)}?source=reports`;

export function buildProgressOverview(
  results: DashboardOverallResult[],
  period: DashboardPeriod,
  today: string,
) {
  const end = Date.parse(`${today}T23:59:59.999+05:00`);
  // Today plus the preceding 59 calendar days in the platform's time zone.
  const recentStart = Date.parse(`${today}T00:00:00+05:00`) - 59 * 86_400_000;
  const start =
    period === "all"
      ? 0
      : Date.parse(`${today}T00:00:00+05:00`) -
        (Number(period) - 1) * 86_400_000;
  const reports = buildDashboardReports(results).filter(
    (report) => report.timestamp >= start && report.timestamp <= end,
  );
  // Report copies referencing the same submission are a single observation.
  // Missing submission IDs fall back to report IDs; no assumptions about identical texts.
  const seenReports = new Set<string>();
  const uniqueReports = reports.filter((report) => {
    const key = DASHBOARD_SKILLS.map(
      (skill) => report.result[`${skill.key}ResultId`] ?? "",
    ).join("|");
    const identity = key === "|||" ? report.result.id : key;
    if (seenReports.has(identity)) return false;
    seenReports.add(identity);
    return true;
  });
  const skills: ProgressSkill[] = DASHBOARD_SKILLS.map((skill) => {
    const seen = new Set<string>();
    const points: ProgressPoint[] = [];
    for (const report of reports) {
      if (report.evaluationState !== "READY") continue;
      const section = getDashboardSectionScores(report.result).find(
        (item) => item.key === skill.key,
      );
      if (!section || section.score < 0 || section.score > 75) continue;
      const identity =
        report.result[`${skill.key}ResultId`] || report.result.id;
      if (seen.has(identity)) continue;
      seen.add(identity);
      points.push({
        id: report.result.id,
        score: section.score,
        timestamp: report.timestamp,
      });
    }
    const recentPoints = points.filter(point => point.timestamp >= recentStart);
    const recent = recentPoints.slice(0, 3);
    const isStale = points.length > 0 && recent.length === 0;
    // Keep the previous all-history estimate only as an explicitly stale fallback.
    // As soon as any recent result exists, older results cannot enter its average.
    const sample = isStale ? points.slice(0, 3) : recent;
    const average = sample.length
      ? sample.reduce((sum, item) => sum + item.score, 0) / sample.length
      : null;
    // Compare the displayed rolling average before and after the newest test,
    // using the same current date window; stale scores never form a baseline.
    const previousSample = recentPoints.slice(1, 4);
    const previousAverage = previousSample.length
      ? previousSample.reduce((sum, item) => sum + item.score, 0) / previousSample.length
      : null;
    return {
      ...skill,
      points,
      average,
      previousAverage,
      sampleCount: sample.length,
      sample,
      isStale,
      lastTestAt: points[0]?.timestamp ?? null,
      level: average === null ? null : getCefrLevelFromScore(average),
    };
  });
  const coverage = skills.filter((skill) => skill.average !== null).length;
  const average =
    coverage === 4
      ? skills.reduce((sum, skill) => sum + skill.average!, 0) / 4
      : null;
  return {
    skills,
    average,
    level: average === null ? null : getCefrLevelFromScore(average),
    coverage,
    hasStaleSkills: skills.some(skill => skill.isStale),
    lowEvidence: skills.some((skill) => skill.sampleCount < 3),
    reports: uniqueReports,
    completedCount: uniqueReports.filter(
      (report) => report.evaluationState === "READY",
    ).length,
  };
}

export function calendarDays(month: string): Array<string | null> {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days: Array<string | null> = Array((first.getUTCDay() + 6) % 7).fill(
    null,
  );
  for (let day = 1; day <= count; day++)
    days.push(`${month}-${String(day).padStart(2, "0")}`);
  while (days.length % 7) days.push(null);
  return days;
}

export const DASHBOARD_SKILLS: ReadonlyArray<{
  key: DashboardSectionKey;
  label: string;
}> = [
  { key: "listening", label: "Dinleme" },
  { key: "reading", label: "Okuma" },
  { key: "writing", label: "Yazma" },
  { key: "speaking", label: "Konuşma" },
];

export type DashboardSkill = {
  key: DashboardSectionKey;
  label: string;
  latest: {
    score: number;
    level: string;
    resultId: string;
    timestamp: number;
  } | null;
};

export function getLatestDashboardSkills(
  completed: readonly DashboardResultSummary[],
): DashboardSkill[] {
  const latestBySkill = new Map<
    DashboardSectionKey,
    NonNullable<DashboardSkill["latest"]>
  >();
  for (const summary of completed) {
    for (const section of summary.sections) {
      const previous = latestBySkill.get(section.key);
      if (!previous || summary.timestamp > previous.timestamp) {
        latestBySkill.set(section.key, {
          score: section.score,
          level: section.level,
          resultId: summary.result.id,
          timestamp: summary.timestamp,
        });
      }
    }
  }
  return DASHBOARD_SKILLS.map((skill) => ({
    ...skill,
    latest: latestBySkill.get(skill.key) ?? null,
  }));
}

export function selectDashboardLesson(
  lessons: readonly WorkbookDocumentSummary[],
  skills: readonly DashboardSkill[],
): WorkbookDocumentSummary | null {
  const published = lessons.filter((lesson) => lesson.status === "PUBLISHED");
  const measured = skills
    .filter((skill) => skill.latest !== null)
    .sort((left, right) => left.latest!.score - right.latest!.score);
  for (const skill of measured) {
    const lesson = published.find((item) => item.category === skill.key);
    if (lesson) return lesson;
  }
  return published[0] ?? null;
}
