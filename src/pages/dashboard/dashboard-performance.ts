export type DashboardSectionKey =
  | "listening"
  | "reading"
  | "writing"
  | "speaking";

export type DashboardOverallResult = {
  id: string;
  status?: string | null;
  isCompleted?: boolean | null;
  completedAt?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  level?: string | null;
  overallScore?: number | string | null;
  listeningResultId?: string | null;
  readingResultId?: string | null;
  writingResultId?: string | null;
  speakingResultId?: string | null;
  speakingFeedbackRetry?: {
    eligible?: boolean;
    reason?: string | null;
  } | null;
  listeningScore?: number | string | null;
  readingScore?: number | string | null;
  writingScore?: number | string | null;
  speakingScore?: number | string | null;
  writingEvaluationStatus?: string | null;
  writingEvaluationErrorCode?: string | null;
  speakingEvaluationStatus?: string | null;
  speakingEvaluationErrorCode?: string | null;
};

export type DashboardSectionScore = {
  key: DashboardSectionKey;
  label: string;
  score: number;
  level: string;
};

export type DashboardResultSummary = {
  result: DashboardOverallResult;
  score: number;
  level: string;
  timestamp: number;
  sections: DashboardSectionScore[];
  kind: "Tam deneme" | "Bölüm testi";
};

export type DashboardReportSummary = {
  result: DashboardOverallResult;
  score: number | null;
  level: string | null;
  timestamp: number;
  sectionLabels: string[];
  kind: "Tam deneme" | "Bölüm testi";
  evaluationState: "READY" | "PENDING" | "FAILED";
};

const sectionDefinitions: Array<{
  key: DashboardSectionKey;
  label: string;
  resultIdKey:
    | "listeningResultId"
    | "readingResultId"
    | "writingResultId"
    | "speakingResultId";
  scoreKey:
    | "listeningScore"
    | "readingScore"
    | "writingScore"
    | "speakingScore";
}> = [
  {
    key: "listening",
    label: "Dinleme",
    resultIdKey: "listeningResultId",
    scoreKey: "listeningScore",
  },
  {
    key: "reading",
    label: "Okuma",
    resultIdKey: "readingResultId",
    scoreKey: "readingScore",
  },
  {
    key: "writing",
    label: "Yazma",
    resultIdKey: "writingResultId",
    scoreKey: "writingScore",
  },
  {
    key: "speaking",
    label: "Konuşma",
    resultIdKey: "speakingResultId",
    scoreKey: "speakingScore",
  },
];

const toFiniteNumber = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getCefrLevelFromScore = (score: number): string => {
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

export const normalizeDashboardLevel = (
  value: unknown,
  fallbackScore: number,
): string => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return getCefrLevelFromScore(fallbackScore);
  if (/^B1\s+ALT[Iİ]$/i.test(normalized)) return "B1 altı";
  return normalized.toUpperCase();
};

export const getDashboardResultTimestamp = (
  result: DashboardOverallResult,
): number => {
  for (const value of [
    result.completedAt,
    result.createdAt,
    result.startedAt,
  ]) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return 0;
};

export const getDashboardSectionScores = (
  result: DashboardOverallResult,
): DashboardSectionScore[] =>
  sectionDefinitions.flatMap((section) => {
    const score = toFiniteNumber(result[section.scoreKey]);
    const wasSelected = Boolean(result[section.resultIdKey]) || score !== null;
    if (!wasSelected || score === null) return [];

    return [
      {
        key: section.key,
        label: section.label,
        score,
        level: getCefrLevelFromScore(score),
      },
    ];
  });

const getDashboardSelectedSectionLabels = (
  result: DashboardOverallResult,
): string[] =>
  sectionDefinitions.flatMap((section) => {
    const score = toFiniteNumber(result[section.scoreKey]);
    return result[section.resultIdKey] || score !== null ? [section.label] : [];
  });

const getEvaluationStatus = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

const getUnresolvedEvaluationSections = (
  result: DashboardOverallResult,
): Array<{
  key: DashboardSectionKey;
  label: string;
  status: "PENDING" | "FAILED";
}> => {
  const unresolved: Array<{
    key: DashboardSectionKey;
    label: string;
    status: "PENDING" | "FAILED";
  }> = [];

  const writingStatus = getEvaluationStatus(result.writingEvaluationStatus);
  if (
    result.writingResultId &&
    (writingStatus === "PENDING" || writingStatus === "FAILED")
  ) {
    unresolved.push({
      key: "writing",
      label: "Yazma",
      status: writingStatus,
    });
  }

  const speakingStatus = getEvaluationStatus(result.speakingEvaluationStatus);
  if (
    result.speakingResultId &&
    (speakingStatus === "PENDING" || speakingStatus === "FAILED")
  ) {
    unresolved.push({
      key: "speaking",
      label: "Konuşma",
      status: speakingStatus,
    });
  }

  return unresolved;
};

export const isCompletedDashboardResult = (
  result: DashboardOverallResult,
): boolean => {
  const score = toFiniteNumber(result.overallScore);
  return (
    String(result.status ?? "").toUpperCase() === "COMPLETED" &&
    result.isCompleted === true &&
    score !== null &&
    getDashboardSectionScores(result).length > 0 &&
    getUnresolvedEvaluationSections(result).length === 0
  );
};

const toResultSummary = (
  result: DashboardOverallResult,
): DashboardResultSummary => {
  const score = toFiniteNumber(result.overallScore) ?? 0;
  const sections = getDashboardSectionScores(result);

  return {
    result,
    score,
    level: normalizeDashboardLevel(result.level, score),
    timestamp: getDashboardResultTimestamp(result),
    sections,
    kind: sections.length === 4 ? "Tam deneme" : "Bölüm testi",
  };
};

export const buildDashboardPerformance = (
  results: DashboardOverallResult[],
) => {
  const completed = results
    .filter(isCompletedDashboardResult)
    .map(toResultSummary)
    .sort((left, right) => right.timestamp - left.timestamp);
  const latest = completed[0] ?? null;
  const rankedSections = [...(latest?.sections ?? [])].sort(
    (left, right) => right.score - left.score,
  );

  return {
    completed,
    latest,
    trend: completed.slice(0, 5),
    strongestSection: rankedSections[0] ?? null,
    weakestSection: rankedSections[rankedSections.length - 1] ?? null,
  };
};

export const buildDashboardReports = (
  results: DashboardOverallResult[],
): DashboardReportSummary[] =>
  results
    .flatMap<DashboardReportSummary>((result) => {
      if (isCompletedDashboardResult(result)) {
        const summary = toResultSummary(result);
        return [
          {
            result,
            score: summary.score,
            level: summary.level,
            timestamp: summary.timestamp,
            sectionLabels: summary.sections.map((section) => section.label),
            kind: summary.kind,
            evaluationState: "READY" as const,
          },
        ];
      }

      const unresolvedEvaluationSections = getUnresolvedEvaluationSections(
        result,
      );
      const isUnresolvedEvaluationReport =
        String(result.status ?? "").toUpperCase() === "COMPLETED" &&
        result.isCompleted === true &&
        unresolvedEvaluationSections.length > 0;

      if (!isUnresolvedEvaluationReport) return [];

      const sectionLabels = getDashboardSelectedSectionLabels(result);
      return [
        {
          result,
          score: null,
          level: null,
          timestamp: getDashboardResultTimestamp(result),
          sectionLabels,
          kind:
            sectionLabels.length === sectionDefinitions.length
              ? ("Tam deneme" as const)
              : ("Bölüm testi" as const),
          evaluationState:
            unresolvedEvaluationSections.some(
              (section) => section.status === "PENDING",
            )
              ? ("PENDING" as const)
              : unresolvedEvaluationSections.some(
                    (section) => section.status === "FAILED",
                  )
              ? ("FAILED" as const)
              : ("READY" as const),
        },
      ];
    })
    .sort((left, right) => right.timestamp - left.timestamp);
