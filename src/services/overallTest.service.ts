import axiosPrivate from "@/config/api";
import { SecureStorage } from "@/utils/secureStorage";
import { toast } from "sonner";

export type TestType = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

export interface StartOverallRequest {
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

const tokenKeyByTestId = (testId: string) => `overall.sessionToken.byTestId.${testId}`;
const tokenKey = (type: TestType, testId: string) => `overall.sessionToken.${type}.${testId}`;
const flowQueueKey = "overall.flow.queue";
const flowQueueCountKey = "overall.flow.queue.count";
const overallIdKey = "overall.flow.id";
const overallCompletedKey = "overall.flow.completed";
const pendingNextSectionKey = "overall.flow.pendingNextSection";

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
      // Ensure exam mode is active when starting overall test
      if (typeof document !== "undefined") {
        document.body.classList.add("exam-mode");
        // Also enter fullscreen for overall test
        const enterFullscreen = async () => {
          try {
            const el: any = document.documentElement as any;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) await el.msRequestFullscreen();
          } catch {}
        };
        enterFullscreen();
      }
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
    // Ensure exam mode stays active for next test
    if (next && typeof document !== "undefined") {
      const totalCount = Math.max(overallTestFlowStore.getInitialCount(), queue.length);
      const completedCount = Math.max(0, totalCount - remaining.length);
      overallTestFlowStore.setPendingNextSection({
        fromTestType: _testType,
        next,
        totalCount,
        completedCount,
      });
      document.body.classList.add("exam-mode");
      return "/overall-section-ready";
    }
    overallTestFlowStore.clearPendingNextSection();
    return next?.path || null;
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

export const overallTestService = {
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
          `Bazi bolumler gonderilemedi: ${submit.failed.join(", ")}. Lutfen tekrar deneyin.`
        );
        return false;
      }

      const payload = {
        earlyExit: true,
        refundUnattemptedSections: true,
      };
      await axiosPrivate.patch(`/api/overal-test-result/${overallId}/complete`, payload);
      overallTestFlowStore.markCompleted();
      return true;
    } catch (error: any) {
      console.error("Error finalizing early exit:", error);
      const message =
        error?.response?.data?.message ||
        "Sinav sonlandirilamadi. Lutfen tekrar deneyin.";
      toast.error(message);
      return false;
    }
  },

  start: async (payload: StartOverallRequest): Promise<StartOverallResponse | null> => {
    try {
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
      const message =
        error?.response?.data?.message ||
        (error?.response?.status === 400 ? "Insufficient coins" : "Failed to start overall test");
      toast.error(message);
      return null;
    }
  },
  complete: async (overallId: string): Promise<boolean> => {
    try {
      console.log("Completing overall test with ID:", overallId);
      const res = await axiosPrivate.patch(`/api/overal-test-result/${overallId}/complete`, {});
      console.log("Overall test completion response:", res.data);
      return true;
    } catch (e) {
      console.error("Error completing overall test:", e);
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
    uniqueUsers: boolean = true
  ): Promise<any[]> => {
    try {
      const params: Record<string, any> = {
        limit,
        uniqueUsers,
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
