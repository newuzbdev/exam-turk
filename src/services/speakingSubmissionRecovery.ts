type SpeakingSubmissionCandidate = {
  id?: unknown;
  submissionId?: unknown;
  speakingTestId?: unknown;
  overallTestId?: unknown;
  overallId?: unknown;
  overallTestResultId?: unknown;
  evaluationStatus?: unknown;
  createdAt?: unknown;
  score?: unknown;
  aiFeedback?: unknown;
};

export type RecoverableSpeakingSubmission = {
  submissionId: string;
  overallTestId?: string;
  evaluationStatus: "PENDING" | "COMPLETED" | "FAILED";
};

type StorageLike = Pick<Storage, "removeItem">;

const getCandidates = (payload: any): SpeakingSubmissionCandidate[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const hasCompletedFeedback = (candidate: SpeakingSubmissionCandidate): boolean =>
  candidate.score !== null && candidate.score !== undefined
    ? true
    : candidate.aiFeedback !== null && candidate.aiFeedback !== undefined;

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const getEvaluationStatus = (
  candidate: SpeakingSubmissionCandidate,
): RecoverableSpeakingSubmission["evaluationStatus"] | undefined => {
  const status = String(candidate.evaluationStatus || "").trim().toUpperCase();
  if (status === "PENDING" || status === "FAILED" || status === "COMPLETED") {
    return status;
  }
  return hasCompletedFeedback(candidate) ? "COMPLETED" : undefined;
};

export const selectRecentCompletedSpeakingSubmission = (
  payload: any,
  speakingTestId: string,
  submissionStartedAt: number,
): string | undefined => {
  const earliestAcceptedAt = submissionStartedAt - 5_000;

  const selected = getCandidates(payload)
    .filter((candidate) => {
      const createdAt = Date.parse(String(candidate.createdAt || ''));
      return (
        typeof candidate.id === 'string' &&
        candidate.id.trim().length > 0 &&
        candidate.speakingTestId === speakingTestId &&
        Number.isFinite(createdAt) &&
        createdAt >= earliestAcceptedAt &&
        hasCompletedFeedback(candidate)
      );
    })
    .sort(
      (left, right) =>
        Date.parse(String(right.createdAt)) - Date.parse(String(left.createdAt)),
    )[0];

  return typeof selected?.id === 'string' ? selected.id.trim() : undefined;
};

export const selectRecentRecoverableSpeakingSubmission = (
  payload: any,
  speakingTestId: string,
  submissionStartedAt: number,
  expectedOverallTestId?: string | null,
): RecoverableSpeakingSubmission | undefined => {
  const earliestAcceptedAt = submissionStartedAt - 5_000;
  const normalizedExpectedOverallTestId = firstNonEmptyString(
    expectedOverallTestId,
  );

  for (const candidate of [...getCandidates(payload)].sort(
    (left, right) =>
      Date.parse(String(right.createdAt)) - Date.parse(String(left.createdAt)),
  )) {
    const createdAt = Date.parse(String(candidate.createdAt || ""));
    const submissionId = firstNonEmptyString(candidate.submissionId, candidate.id);
    const overallTestId = firstNonEmptyString(
      candidate.overallTestId,
      candidate.overallTestResultId,
      candidate.overallId,
    );
    const evaluationStatus = getEvaluationStatus(candidate);
    if (
      !submissionId ||
      candidate.speakingTestId !== speakingTestId ||
      !Number.isFinite(createdAt) ||
      createdAt < earliestAcceptedAt ||
      (normalizedExpectedOverallTestId &&
        overallTestId !== normalizedExpectedOverallTestId) ||
      !evaluationStatus
    ) {
      continue;
    }

    return {
      submissionId,
      overallTestId,
      evaluationStatus,
    };
  }

  return undefined;
};

export const resolveSpeakingSubmissionTransition = (
  result: {
    success?: unknown;
    submissionId?: unknown;
    overallTestId?: unknown;
    evaluationStatus?: unknown;
  },
  fallbackOverallTestId?: string | null,
): (RecoverableSpeakingSubmission & { path: string }) | undefined => {
  if (!result?.success) return undefined;
  const submissionId = firstNonEmptyString(result.submissionId);
  if (!submissionId) return undefined;
  const overallTestId = firstNonEmptyString(
    result.overallTestId,
    fallbackOverallTestId,
  );
  const evaluationStatus = getEvaluationStatus({
    evaluationStatus: result.evaluationStatus,
    score: result.evaluationStatus ? undefined : 0,
  });
  if (!evaluationStatus) return undefined;

  return {
    submissionId,
    overallTestId,
    evaluationStatus,
    path: overallTestId
      ? `/overall-results/${overallTestId}`
      : `/speaking-test/results/${submissionId}`,
  };
};

export const clearAcceptedSpeakingDraft = (
  storage: StorageLike,
  speakingTestId: string,
) => {
  if (!speakingTestId) return;
  storage.removeItem(`speaking_answers_${speakingTestId}`);
  storage.removeItem(`speaking_progress_${speakingTestId}`);
};

export const shouldRefreshOverallEvaluation = ({
  writingStatus,
  speakingStatus,
}: {
  writingStatus?: unknown;
  speakingStatus?: unknown;
}) =>
  [writingStatus, speakingStatus].some(
    (status) => String(status || "").trim().toUpperCase() === "PENDING",
  );

export const resolveSpeakingRetryAction = (
  evaluationStatus: unknown,
  processingVersion: unknown,
) =>
  String(evaluationStatus || '').trim().toUpperCase() === 'FAILED' &&
  String(processingVersion || '').trim() === 'speaking-evidence-v3'
    ? ('evaluation' as const)
    : ('feedback' as const);

export const shouldShowSpeakingFeedbackRetry = (
  evaluationViewKind: unknown,
  canRetry: unknown,
) => evaluationViewKind === "completed" && canRetry === true;

export const resolveSpeakingEvaluationView = (status: unknown) => {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PENDING") {
    return {
      kind: "pending" as const,
      title: "Konuşmanız değerlendiriliyor",
      description: "Sonuç hazır olduğunda otomatik olarak gösterilecek.",
    };
  }
  if (normalized === "FAILED") {
    return {
      kind: "failed" as const,
      title: "Puanınız henüz hazırlanamadı",
      description:
        "Yanıtlarınız ve ses kayıtlarınız güvende. Değerlendirme sırasında geçici bir sorun oluştu. Aynı kayıtları tekrar değerlendirmek için “Yeniden değerlendir” düğmesine basın.",
    };
  }
  return { kind: "completed" as const, title: "", description: "" };
};

export const normalizeSpeakingSubmissionResponse = (
  payload: any,
  fallbackOverallTestId?: string | null,
): RecoverableSpeakingSubmission | undefined => {
  const candidates = [payload, payload?.data, payload?.data?.data].filter(
    (candidate) => candidate && typeof candidate === "object",
  ) as SpeakingSubmissionCandidate[];
  const submissionId = firstNonEmptyString(
    ...candidates.flatMap((candidate) => [candidate.submissionId, candidate.id]),
  );
  if (!submissionId) return undefined;

  const overallTestId = firstNonEmptyString(
    ...candidates.flatMap((candidate) => [
      candidate.overallTestId,
      candidate.overallTestResultId,
      candidate.overallId,
    ]),
    fallbackOverallTestId,
  );
  const evaluationStatus = candidates
    .map((candidate) => getEvaluationStatus(candidate))
    .find(Boolean);
  if (!evaluationStatus) return undefined;

  return { submissionId, overallTestId, evaluationStatus };
};
