import { reportMockAccessFailure } from '@/utils/mock-access-recovery';
import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import { assertContentAccessEnabled } from '@/services/access-request-guard';
import axiosPrivate from "@/config/api";
import { SecureStorage } from "@/utils/secureStorage";
import { toast } from "sonner";
import { requestReauthentication } from "@/utils/authSessionRecovery";

export type TestType = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
export type MockSubmitMode = "MANUAL" | "AUTO";

export interface StartOverallRequest {
  accessContextId?: string;
  readingId?: string;
  listeningId?: string;
  writingId?: string;
  speakingId?: string;
}

export interface TestTokenItem {
  testType: TestType;
  testId: string;
  token: string;
}

export interface StartOverallResponse {
  message: string;
  testTokens: TestTokenItem[];
  totalCoinCost: number;
  remainingCoins: number;
  overallTestId?: string;
  id?: string;
  overallId?: string;
  overallTestResultId?: string;
}

export interface OverallSectionTimerResponse {
  serverNow: string;
  startedAt: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
  durationSeconds: number | null;
  graceSeconds: number;
  testType: TestType;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  phase?: "AUDIO" | "REVIEW";
  audioStartedAt?: string | null;
  audioEndsAt?: string | null;
  audioDurationSeconds?: number | null;
  reviewStartedAt?: string | null;
  reviewExpiresAt?: string | null;
  reviewDurationSeconds?: number | null;
  remainingAudioSeconds?: number | null;
  remainingReviewSeconds?: number | null;
  durationMissingLegacyMode?: boolean;
}

export interface OverallSectionPrepareResponse {
  serverNow: string;
  testType: TestType;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  requiresStart: boolean;
  startedAt?: string | null;
  expiresAt?: string | null;
  remainingSeconds?: number;
  durationSeconds?: number | null;
  graceSeconds?: number;
  phase?: "AUDIO" | "REVIEW";
  audioStartedAt?: string | null;
  audioEndsAt?: string | null;
  audioDurationSeconds?: number | null;
  reviewStartedAt?: string | null;
  reviewExpiresAt?: string | null;
  reviewDurationSeconds?: number | null;
  remainingAudioSeconds?: number | null;
  remainingReviewSeconds?: number | null;
  durationMissingLegacyMode?: boolean;
}

export interface BackendSyncedTimerState {
  expiresAtMs: number | null;
  serverNowMs: number | null;
  receivedAtMs: number;
  initialRemainingSeconds: number;
}

export interface ListeningEvidenceAudioResponse {
  startMs: number;
  endMs: number;
  streamPath: string;
}

export interface CurrentOverallSession {
  id: string;
  status: string;
  isCompleted: boolean;
  startedAt?: string | null;
  serverNow?: string;
  canResume?: boolean;
  canChangeSelection?: boolean;
  recoveryWindowSeconds?: number;
  recoveryExpiresAt?: string | null;
  activeSection?: {
    testType: TestType;
    testId: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  } | null;
  sections?: Array<{
    testType: TestType;
    testId: string;
    token: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  }>;
}

const tokenKeyByTestId = (testId: string) => `overall.sessionToken.byTestId.${testId}`;
const tokenKey = (type: TestType, testId: string) => `overall.sessionToken.${type}.${testId}`;
const flowQueueKey = "overall.flow.queue";
const flowQueueCountKey = "overall.flow.queue.count";
const overallIdKey = "overall.flow.id";
const overallCompletedKey = "overall.flow.completed";
const pendingNextSectionKey = "overall.flow.pendingNextSection";

const OVERALL_SECTION_TIMER_ERROR_CODES = [
  "SECTION_NOT_STARTED",
  "TEST_TIME_EXPIRED",
  "SECTION_ALREADY_SUBMITTED",
  "SESSION_RECOVERY_EXPIRED",
  "SESSION_TOKEN_REQUIRED",
  "LISTENING_AUDIO_IN_PROGRESS",
  "LISTENING_AUDIO_DURATION_REQUIRED",
] as const;

export type OverallSectionTimerErrorCode =
  (typeof OVERALL_SECTION_TIMER_ERROR_CODES)[number];

const isOverallSectionTimerErrorCode = (
  value: string,
): value is OverallSectionTimerErrorCode =>
  OVERALL_SECTION_TIMER_ERROR_CODES.some((code) => value.includes(code));

export const getOverallSectionTimerErrorCode = (
  error: unknown,
): OverallSectionTimerErrorCode | null => {
  const visited = new Set<unknown>();

  const findCode = (
    value: unknown,
    depth: number,
  ): OverallSectionTimerErrorCode | null => {
    if (value == null || depth > 6) return null;

    if (typeof value === "string") {
      return (
        OVERALL_SECTION_TIMER_ERROR_CODES.find((code) =>
          value.includes(code),
        ) || null
      );
    }

    if (typeof value !== "object" || visited.has(value)) return null;
    visited.add(value);

    const record = value as Record<string, unknown>;
    for (const key of [
      "code",
      "error",
      "message",
      "detail",
      "data",
      "response",
    ]) {
      const code = findCode(record[key], depth + 1);
      if (code) return code;
    }

    return null;
  };

  return findCode(error, 0);
};

export const getOverallSectionTimerErrorMessage = (error: unknown): string => {
  const response = (error as any)?.response;
  const code = getOverallSectionTimerErrorCode(error);
  if (code === "TEST_TIME_EXPIRED") {
    return "Bu bölümün süresi doldu.";
  }
  if (code === "SECTION_NOT_STARTED") {
    return "Bu bölüm başlatılmadı. Lütfen testi yeniden başlat.";
  }
  if (code === "SESSION_TOKEN_REQUIRED") {
    return "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.";
  }
  if (code === "SECTION_ALREADY_SUBMITTED") {
    return "Bu bölüm daha önce gönderildi.";
  }
  if (code === "SESSION_RECOVERY_EXPIRED") {
    return "Sınava dönmek için ayrılan 5 dakikalık süre doldu.";
  }
  if (code === "LISTENING_AUDIO_IN_PROGRESS") {
    return "Sesli metin tamamlandıktan sonra cevaplarınızı gönderebilirsiniz.";
  }
  if (code === "LISTENING_AUDIO_DURATION_REQUIRED") {
    return "Bu dinleme testi şu anda hazır değil.";
  }
  const payload = response?.data;
  const payloadMessage =
    typeof payload?.message === "string"
      ? payload.message
      : typeof payload?.error === "string" &&
          !isOverallSectionTimerErrorCode(payload.error)
        ? payload.error
        : typeof payload?.error?.message === "string"
          ? payload.error.message
          : null;
  return (
    payloadMessage ||
    (error as any)?.message ||
    "Bölüm başlatılamadı. Lütfen tekrar deneyin."
  );
};

export const createBackendSyncedTimerState = (
  timer: OverallSectionTimerResponse
): BackendSyncedTimerState => {
  const expiresAtMs = timer.expiresAt ? new Date(timer.expiresAt).getTime() : NaN;
  const serverNowMs = timer.serverNow ? new Date(timer.serverNow).getTime() : NaN;
  return {
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : null,
    serverNowMs: Number.isFinite(serverNowMs) ? serverNowMs : null,
    receivedAtMs: Date.now(),
    initialRemainingSeconds: Math.max(0, Math.round(Number(timer.remainingSeconds || 0))),
  };
};

export const getBackendSyncedRemainingSeconds = (
  state: BackendSyncedTimerState | null
): number | null => {
  if (!state) return null;
  if (state.expiresAtMs !== null && state.serverNowMs !== null) {
    const syntheticServerNow = state.serverNowMs + (Date.now() - state.receivedAtMs);
    return Math.max(0, Math.floor((state.expiresAtMs - syntheticServerNow) / 1000));
  }
  return state.initialRemainingSeconds;
};

export const overallTestTokenStore = {
  set: (type: TestType, testId: string, token: string) => {
    SecureStorage.setSessionItem(tokenKey(type, testId), token);
    SecureStorage.setSessionItem(tokenKeyByTestId(testId), token);
  },
  getByTestId: (testId: string): string | null => {
    return SecureStorage.getSessionItem(tokenKeyByTestId(testId));
  },
  clearByTestId: (testId: string) => {
    SecureStorage.removeSessionItem(tokenKeyByTestId(testId));
  },
};

type FlowItem = { testType: TestType; testId: string; path: string };
type PendingNextSection = {
  fromTestType: TestType;
  next: FlowItem;
  totalCount: number;
  completedCount: number;
};

export const overallTestFlowStore = {
  setQueue: (items: FlowItem[]) => {
    try {
      sessionStorage.setItem(flowQueueKey, JSON.stringify(items || []));
      // set initial count once per overall session
      const existing = sessionStorage.getItem(flowQueueCountKey);
      if (!existing) {
        sessionStorage.setItem(flowQueueCountKey, String(items?.length || 0));
      }
      // reset completion marker on new queue
      sessionStorage.removeItem(overallCompletedKey);
    } catch {}
  },
  getQueue: (): FlowItem[] => {
    try {
      const raw = sessionStorage.getItem(flowQueueKey);
      return raw ? (JSON.parse(raw) as FlowItem[]) : [];
    } catch {
      return [];
    }
  },
  getInitialCount: (): number => {
    try {
      const raw = sessionStorage.getItem(flowQueueCountKey);
      return raw ? parseInt(raw) : 0;
    } catch {
      return 0;
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(flowQueueKey);
      sessionStorage.removeItem(flowQueueCountKey);
      sessionStorage.removeItem(overallIdKey);
      sessionStorage.removeItem(overallCompletedKey);
      sessionStorage.removeItem(pendingNextSectionKey);
    } catch {}
  },
  setPendingNextSection: (item: PendingNextSection | null) => {
    try {
      if (!item) {
        sessionStorage.removeItem(pendingNextSectionKey);
        return;
      }
      sessionStorage.setItem(pendingNextSectionKey, JSON.stringify(item));
    } catch {}
  },
  getPendingNextSection: (): PendingNextSection | null => {
    try {
      const raw = sessionStorage.getItem(pendingNextSectionKey);
      return raw ? (JSON.parse(raw) as PendingNextSection) : null;
    } catch {
      return null;
    }
  },
  clearPendingNextSection: () => {
    try {
      sessionStorage.removeItem(pendingNextSectionKey);
    } catch {}
  },
  onTestCompleted: (_testType: TestType, testId: string): string | null => {
    const queue = overallTestFlowStore.getQueue();
    if (!queue.length) return null;
    const idx = queue.findIndex((q) => q.testId === testId);
    if (idx === -1) return null;
    const next = queue[idx + 1] || null;
    const remaining = queue.filter((q) => q.testId !== testId);
    // update remaining queue without touching the initial count
    try { sessionStorage.setItem(flowQueueKey, JSON.stringify(remaining || [])); } catch {}
    if (next) {
      const totalCount = Math.max(overallTestFlowStore.getInitialCount(), queue.length);
      const completedCount = Math.max(0, totalCount - remaining.length);
      overallTestFlowStore.setPendingNextSection({
        fromTestType: _testType,
        next,
        totalCount,
        completedCount,
      });
      return "/overall-section-ready";
    }
    overallTestFlowStore.clearPendingNextSection();
    return null;
  },
  hasActive: (): boolean => {
    return overallTestFlowStore.getQueue().length > 0;
  },
  isAllDone: (): boolean => {
    return overallTestFlowStore.getQueue().length === 0;
  },
  setOverallId: (overallId: string | null | undefined) => {
    if (!overallId) return;
    try { sessionStorage.setItem(overallIdKey, overallId); } catch {}
  },
  getOverallId: (): string | null => {
    try { return sessionStorage.getItem(overallIdKey); } catch { return null; }
  },
  isCompleted: (): boolean => {
    try { return sessionStorage.getItem(overallCompletedKey) === "1"; } catch { return false; }
  },
  markCompleted: () => {
    try { sessionStorage.setItem(overallCompletedKey, "1"); } catch {}
  },
};

const recoverExamEntryAuthentication = (error: unknown): boolean => {
  if ((error as { response?: { status?: number } })?.response?.status !== 401) return false;
  toast.error("Oturumunuz yenilenemedi. Sınava başlamak için yeniden giriş yapın.");
  requestReauthentication();
  return true;
};

export const overallTestService = {
  getCurrentSession: async (): Promise<
    CurrentOverallSession | null | undefined
  > => {
    try {
      const response = await axiosPrivate.get<CurrentOverallSession | null>(
        "/api/overal-test-result/current",
      );
      return response.data ?? null;
    } catch (error) {
      recoverExamEntryAuthentication(error);
      return undefined;
    }
  },

  restoreCurrentSession: (
    session: CurrentOverallSession,
  ): string | null => {
    if (!session?.canResume || !session.id || !session.sections?.length) {
      return null;
    }

    const orderedTypes: TestType[] = [
      "LISTENING",
      "READING",
      "WRITING",
      "SPEAKING",
    ];
    const pendingSections = [...session.sections]
      .filter(
        (section) =>
          section.status === "NOT_STARTED" ||
          section.status === "IN_PROGRESS",
      )
      .sort(
        (left, right) =>
          orderedTypes.indexOf(left.testType) -
          orderedTypes.indexOf(right.testType),
      );
    if (pendingSections.length === 0) return null;

    const toPath = (testType: TestType, testId: string) => {
      if (testType === "LISTENING") return `/listening-test/${testId}`;
      if (testType === "READING") return `/reading-test/${testId}`;
      if (testType === "WRITING") return `/writing-test/${testId}`;
      return `/speaking-test/${testId}`;
    };
    const queue = pendingSections.map((section) => ({
      testType: section.testType,
      testId: section.testId,
      path: toPath(section.testType, section.testId),
    }));

    overallTestFlowStore.clear();
    pendingSections.forEach((section) => {
      overallTestTokenStore.set(
        section.testType,
        section.testId,
        section.token,
      );
    });
    overallTestFlowStore.setOverallId(session.id);
    overallTestFlowStore.setQueue(queue);

    const first = pendingSections[0];
    if (first.status === "NOT_STARTED") {
      const completedCount = session.sections.filter(
        (section) => section.status === "SUBMITTED",
      ).length;
      overallTestFlowStore.setPendingNextSection({
        fromTestType: first.testType,
        next: queue[0],
        totalCount: session.sections.length,
        completedCount,
      });
      return "/overall-section-ready";
    }

    overallTestFlowStore.clearPendingNextSection();
    return queue[0]?.path || null;
  },

  heartbeatSectionForTest: async (
    testId: string,
  ): Promise<{
    serverNow: string;
    status: string;
    recoveryExpiresAt?: string;
  } | null> => {
    const sessionToken = overallTestTokenStore.getByTestId(testId);
    if (!sessionToken) return null;

    const response = await axiosPrivate.post(
      "/api/overal-test-result/section/heartbeat",
      { sessionToken },
    );
    return response.data;
  },

  getListeningEvidenceAudio: async (
    resultId: string,
    questionId: string,
  ): Promise<ListeningEvidenceAudioResponse> => {
    const response = await axiosPrivate.get<ListeningEvidenceAudioResponse>(
      `/api/exam/results/${encodeURIComponent(resultId)}/evidence-audio/${encodeURIComponent(questionId)}`,
    );
    const payload = response.data as ListeningEvidenceAudioResponse & {
      data?: ListeningEvidenceAudioResponse;
    };
    return payload.data || payload;
  },

  getListeningEvidenceAudioBlob: async (
    resultId: string,
    questionId: string,
  ): Promise<Blob> => {
    const response = await axiosPrivate.get(
      `/api/exam/results/${encodeURIComponent(resultId)}/evidence-audio/${encodeURIComponent(questionId)}/stream`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  startSectionTimerForTest: async (
    testId: string
  ): Promise<OverallSectionTimerResponse | null> => {
    const sessionToken = overallTestTokenStore.getByTestId(testId);
    if (!sessionToken) return null;

    const res = await axiosPrivate.post<OverallSectionTimerResponse>(
      "/api/overal-test-result/section/start",
      { sessionToken }
    ).catch(error => {
      const section = overallTestFlowStore.getQueue().find(item => item.testId === testId);
      if (section) reportMockAccessFailure(error, { scope: `MOCK_${section.testType}`, targetId: testId });
      throw error;
    }).finally(notifyAccessAllowanceChanged);
    return res.data;
  },

  prepareSectionForTest: async (
    testId: string,
  ): Promise<OverallSectionPrepareResponse | null> => {
    const sessionToken = overallTestTokenStore.getByTestId(testId);
    if (!sessionToken) return null;

    const response = await axiosPrivate.post<OverallSectionPrepareResponse>(
      "/api/overal-test-result/section/prepare",
      { sessionToken },
    ).catch(error => {
      const section = overallTestFlowStore.getQueue().find(item => item.testId === testId);
      if (section) reportMockAccessFailure(error, { scope: `MOCK_${section.testType}`, targetId: testId });
      throw error;
    });
    return response.data;
  },

  preloadListeningAudioForTest: async (
    testId: string,
  ): Promise<Blob | null> => {
    const sessionToken = overallTestTokenStore.getByTestId(testId);
    if (!sessionToken) return null;

    const response = await axiosPrivate.post(
      "/api/overal-test-result/section/listening-audio/preload",
      { sessionToken },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  submitPendingLocalSections: async (): Promise<{
    ok: boolean;
    failed: string[];
    successful: string[];
  }> => {
    const failed: string[] = [];
    const successful: string[] = [];

    const runWithRetries = async <T,>(
      runner: () => Promise<T>,
      isSuccess?: (value: T) => boolean,
      attempts: number = 3
    ): Promise<T> => {
      let lastError: any = null;
      let lastValue: T | null = null;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const value = await runner();
          lastValue = value;
          if (!isSuccess || isSuccess(value)) return value;
          lastError = new Error("Submission returned unsuccessful result");
        } catch (error) {
          lastError = error;
        }
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
        }
      }

      if (lastValue !== null) return lastValue;
      throw lastError || new Error("Submission failed after retries");
    };

    try {
      const { readingSubmissionService } = await import("./readingTest.service");
      const { listeningSubmissionService } = await import("./listeningTest.service");
      const { writingSubmissionService } = await import("./writingSubmission.service");
      const { speakingSubmissionService } = await import("./speakingSubmission.service");

      const normalizePayload = (rawAnswers: any) => {
        return Array.isArray(rawAnswers)
          ? rawAnswers.map((item: any) => ({
              questionId: String(item?.questionId ?? ""),
              userAnswer: String(item?.userAnswer ?? ""),
            }))
          : Object.entries(rawAnswers || {}).map(([questionId, userAnswer]) => ({
              questionId,
              userAnswer: String(userAnswer),
            }));
      };

      const readingKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("reading_answers_"));
      for (const key of readingKeys) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const readingData = JSON.parse(raw);
        const payload = normalizePayload(readingData.answers).filter((item: any) => item.questionId);
        const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
        try {
          await runWithRetries(
            () => readingSubmissionService.submitAnswers(readingData.testId, payload, overallToken || undefined),
            undefined,
            3
          );
          successful.push(`Okuma (${readingData.testId})`);
          try { sessionStorage.removeItem(key); } catch {}
        } catch {
          failed.push(`Okuma (${readingData.testId})`);
        }
      }

      const listeningKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("listening_answers_"));
      for (const key of listeningKeys) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const listeningData = JSON.parse(raw);
        const payload = normalizePayload(listeningData.answers).filter((item: any) => item.questionId);
        const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
        try {
          await runWithRetries(
            () =>
              listeningSubmissionService.submitAnswers(
                listeningData.testId,
                payload,
                overallToken || undefined,
                listeningData.audioUrl,
                listeningData.imageUrls
              ),
            undefined,
            3
          );
          successful.push(`Dinleme (${listeningData.testId})`);
          try { sessionStorage.removeItem(key); } catch {}
        } catch {
          failed.push(`Dinleme (${listeningData.testId})`);
        }
      }

      const writingKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("writing_answers_"));
      for (const key of writingKeys) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const writingData = JSON.parse(raw);
        const overallToken = overallTestTokenStore.getByTestId(writingData.testId);

        const getWritingAnswer = (
          questionId: string,
          sectionIndex: number,
          fallbackId?: string,
          itemIndex?: number
        ) => {
          const direct = writingData.answers?.[questionId];
          if (typeof direct === "string") return direct;
          const fallback = typeof fallbackId === "string" ? fallbackId : "";
          const idx = typeof itemIndex === "number" ? String(itemIndex) : "";
          const keys = [
            `${sectionIndex}-${questionId}`,
            `${sectionIndex}-${fallback}`,
            fallback,
            idx && fallback ? `${sectionIndex}-${idx}-${fallback}` : "",
            idx ? `${sectionIndex}-${idx}-${questionId}` : "",
          ].filter(Boolean);
          for (const k of keys) {
            const v = writingData.answers?.[k];
            if (typeof v === "string") return v;
          }
          return "";
        };

        const payload = {
          writingTestId: writingData.testId,
          sections: (writingData.sections || []).map((section: any, sectionIndex: number) => {
            const sectionDescription =
              (typeof section?.title === "string" && section.title.trim()) ||
              (typeof section?.description === "string" && section.description.trim()) ||
              `Section ${section?.order || sectionIndex + 1}`;
            const sectionData: any = { description: sectionDescription };

            if (Array.isArray(section.subParts) && section.subParts.length > 0) {
              sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                const questions = Array.isArray(subPart.questions) ? subPart.questions : [];
                const subPartDescription =
                  (typeof subPart?.label === "string" && subPart.label.trim()) ||
                  (typeof subPart?.description === "string" && subPart.description.trim()) ||
                  `Sub Part ${subPart?.order || subPartIndex + 1}`;
                const answersArr = questions
                  .map((q: any) => {
                    const rawQuestionId = q?.id || q?.questionId;
                    const qid =
                      typeof rawQuestionId === "string"
                        ? rawQuestionId
                        : String(rawQuestionId || "").trim();
                    if (!qid) return null;
                    return {
                      questionId: qid,
                      userAnswer: getWritingAnswer(qid, sectionIndex, subPart?.id, subPartIndex),
                    };
                  })
                  .filter(Boolean);
                return { description: subPartDescription, answers: answersArr };
              });
            }

            if (Array.isArray(section.questions) && section.questions.length > 0) {
              sectionData.answers = section.questions
                .map((q: any, questionIndex: number) => {
                  const rawQuestionId = q?.id || q?.questionId;
                  const qid =
                    typeof rawQuestionId === "string"
                      ? rawQuestionId
                      : String(rawQuestionId || "").trim();
                  if (!qid) return null;
                  return {
                    questionId: qid,
                    userAnswer: getWritingAnswer(qid, sectionIndex, section?.id, questionIndex),
                  };
                })
                .filter(Boolean);
            }
            return sectionData;
          }),
          ...(overallToken ? { sessionToken: overallToken } : {}),
        };

        try {
          await runWithRetries(() => writingSubmissionService.create(payload as any), (value) => !!value, 3);
          successful.push(`Yazma (${writingData.testId})`);
          try { sessionStorage.removeItem(key); } catch {}
        } catch {
          failed.push(`Yazma (${writingData.testId})`);
        }
      }

      const speakingKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
      for (const key of speakingKeys) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const speakingData = JSON.parse(raw);
        const answerTextRecord: Record<string, string> = {};
        const isMeaningfulText = (value: unknown) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          return (
            trimmed.length > 0 &&
            trimmed !== "[Cevap bulunamadı]" &&
            trimmed !== "[Ses metne dönüştürülemedi]"
          );
        };

        if (speakingData.transcripts && typeof speakingData.transcripts === "object") {
          for (const [qid, t] of Object.entries(speakingData.transcripts)) {
            if (isMeaningfulText(t)) answerTextRecord[qid] = String(t).trim();
          }
        }
        if (speakingData.answers && typeof speakingData.answers === "object") {
          for (const [qid, val] of Object.entries(speakingData.answers)) {
            const maybeObj: any = val;
            const text = typeof val === "string" ? val : maybeObj?.text;
            if (isMeaningfulText(text)) answerTextRecord[qid] = String(text).trim();
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (overallToken) formattedSubmission.sessionToken = overallToken;

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          failed.push(`Konuşma (${speakingData.testId})`);
          continue;
        }

        const submissionResult = await speakingSubmissionService.submitSpeakingTest(formattedSubmission);
        if (!submissionResult.success) {
          failed.push(`Konuşma (${speakingData.testId})`);
          continue;
        }
        successful.push(`Konuşma (${speakingData.testId})`);
        try { sessionStorage.removeItem(key); } catch {}
      }

      return { ok: failed.length === 0, failed, successful };
    } catch (error) {
      console.error("Error submitting pending local sections:", error);
      return { ok: false, failed: ["Bilinmeyen Hata"], successful: [] };
    }
  },

  finalizeEarlyExit: async (overallId: string): Promise<boolean> => {
    try {
      const submit = await overallTestService.submitPendingLocalSections();
      if (!submit.ok) {
        toast.error(
          "Bazı bölümler şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin."
        );
        return false;
      }

      const payload = {
        earlyExit: true,
        refundUnattemptedSections: true,
      };
      await axiosPrivate.patch(`/api/overal-test-result/${overallId}/complete`, payload);
      notifyAccessAllowanceChanged();
      overallTestFlowStore.markCompleted();
      return true;
    } catch (error: any) {
      console.error("Error finalizing early exit:", error);
      const message =
        error?.response?.data?.message ||
        "Sınavdan çıkış tamamlanamadı. Lütfen tekrar deneyin.";
      toast.error(message);
      return false;
    }
  },

  abandonStaleSession: async (overallId: string): Promise<boolean> => {
    try {
      await axiosPrivate.patch(`/api/overal-test-result/${overallId}/complete`, {
        earlyExit: true,
        refundUnattemptedSections: true,
      });
      overallTestFlowStore.clear();
      return true;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Önceki sınav oturumu kapatılamadı. Lütfen tekrar deneyin.";
      toast.error(message);
      return false;
    }
  },

  start: async (payload: StartOverallRequest): Promise<StartOverallResponse | null> => {
    try {
      await assertContentAccessEnabled(payload);
      const res = await axiosPrivate.post<StartOverallResponse>(
        "/api/overal-test-result/start",
        payload
      );

      const data = res.data as StartOverallResponse;
      if (data?.testTokens?.length) {
        data.testTokens.forEach((t) => {
          if (t?.token && t?.testId && t?.testType) {
            overallTestTokenStore.set(t.testType, t.testId, t.token);
          }
        });
        // Ensure initial selection count is stored even if queue is set later by UI
        try {
          const existing = sessionStorage.getItem(flowQueueCountKey);
          if (!existing) {
            sessionStorage.setItem(flowQueueCountKey, String(data.testTokens.length));
          }
        } catch {}
      }
      try {
        const oid =
          (data as any)?.overallTestId ||
          (data as any)?.overallTestResultId ||
          (data as any)?.overallId ||
          (data as any)?.id;
        if (oid) overallTestFlowStore.setOverallId(String(oid));
      } catch {}

      return data;
    } catch (error: any) {
      if (recoverExamEntryAuthentication(error)) return null;
      const responseData = error?.response?.data;
      const nestedData =
        responseData?.data && typeof responseData.data === "object"
          ? responseData.data
          : null;
      const nestedError =
        responseData?.error && typeof responseData.error === "object"
          ? responseData.error
          : null;
      const message =
        (typeof responseData?.message === "string" && responseData.message) ||
        (typeof responseData?.error === "string" && responseData.error) ||
        (typeof nestedData?.message === "string" && nestedData.message) ||
        (typeof nestedError?.message === "string" && nestedError.message) ||
        (error?.response?.status === 400
          ? "Yetersiz kredi."
          : error?.response?.status === 409
            ? "Devam eden sınav oturumu kapatılmadan yeni sınav başlatılamaz."
            : "Sınav başlatılamadı. Lütfen tekrar deneyin.");
      toast.error(message);
      return null;
    }
  },
  complete: async (overallId: string): Promise<boolean> => {
    try {
      await axiosPrivate.patch(`/api/overal-test-result/${overallId}/complete`, {});
      return true;
    } catch {
      // non-fatal for UX; still allow navigation to results
      return false;
    }
  },
  downloadPDF: async (overallId: string, filename?: string): Promise<void> => {
    try {
      const res = await axiosPrivate.get(`/api/overal-test-result/${overallId}/pdf`, {
        responseType: 'blob',
      });
      
      // Create a blob from the response
      const blob = new Blob([res.data], { type: 'application/pdf' });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `certificate-${overallId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to download certificate";
      toast.error(message);
      throw error;
    }
  },
  getTopOverallTestsLast30Days: async (): Promise<any[]> => {
    try {
      const res = await axiosPrivate.get("/api/overal-test-result/top");
      return res.data?.data || res.data || [];
    } catch (error: any) {
      console.error("Error fetching top overall tests:", error);
      return [];
    }
  },
  getRecentQualifiedOverallTests: async (
    limit: number = 15,
    levels?: string[],
    uniqueUsers: boolean = true,
    scope: "ALL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "FULL" = "ALL"
  ): Promise<any[]> => {
    try {
      const params: Record<string, any> = {
        limit,
        uniqueUsers,
        scope,
      };
      if (levels && levels.length > 0) {
        params.levels = levels.join(",");
      }

      const res = await axiosPrivate.get("/api/overal-test-result/recent", {
        params,
      });
      return res.data?.data || res.data || [];
    } catch (error: any) {
      console.error("Error fetching recent qualified overall tests:", error);
      return [];
    }
  },
};

export default overallTestService;
