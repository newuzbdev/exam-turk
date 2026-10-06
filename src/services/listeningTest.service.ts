import type { MockReviewV1 } from "@/components/results/evidence-review-utils";
import { SecureStorage } from "@/utils/secureStorage";
import axiosPrivate, { resolveApiResourceUrl } from "@/config/api";
import { toast } from "sonner";
import {
  getOverallSectionTimerErrorCode,
  getOverallSectionTimerErrorMessage,
} from "./overallTest.service";
import type { MockSubmitMode } from "./overallTest.service";

export interface ListeningAnswer {
  id: string;
  questionId?: string;
  variantText?: string | null;
  displayText?: string | null;
  answer?: string | null;
  correct?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListeningQuestion {
  id: string;
  number?: number;
  text?: string | null;
  content?: string | null;
  type: string;
  answers?: ListeningAnswer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListeningSection {
  id: string;
  partId?: string;
  title?: string | null;
  content?: string | null;
  hasBullets?: boolean;
  imageUrl?: string | null;
  questions?: ListeningQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListeningPart {
  id: string;
  testId?: string;
  number?: number;
  audioUrl?: string | null;
  title?: string | null;
  description?: string | null;
  sections?: ListeningSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListeningTestItem {
  audioUrl: string | null;
  audioDurationSeconds?: number | null;
  id: string;
  title: string;
  type?: string;
  description?: string | null;
  ieltsId?: string | null;
  parts?: ListeningPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAnswerResult {
  id: string;
  resultId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
  question: {
    id: string;
    sectionId: string;
    number: number;
    content: string | null;
    text: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    answers: {
      id: string;
      questionId: string;
      variantText: string;
      answer: string;
      correct: boolean;
      createdAt: string;
      updatedAt: string;
    }[];
  };
}

export interface TestResultData {
  id: string;
  userId: string;
  testId: string;
  score: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  userAnswers: UserAnswerResult[];
  review?: MockReviewV1 | null;
}

export interface ExamSectionDraftResponse {
  answers: Record<string, string | string[]>;
  lastSavedAt?: string | null;
  serverNow?: string;
  remainingSeconds?: number;
  phase?: "AUDIO" | "REVIEW";
  remainingAudioSeconds?: number | null;
  remainingReviewSeconds?: number | null;
  saved?: boolean;
}

export interface ListeningExamSubmitResponse {
  message?: string;
  testResultId?: string;
  correctCount?: number;
  totalQuestions?: number;
  score?: number;
  level?: string;
}

export interface ListeningAudioAccessResponse {
  url: string;
  expiresAt: string;
}

function extractData<T = unknown>(res: unknown): T {
  const r = res as { data?: unknown };
  return (
    (r?.data && typeof r.data === "object" && (r.data as { data?: unknown })?.data) ??
    r?.data ??
    (r?.data && typeof r.data === "object" && (r.data as { ieltsData?: unknown })?.ieltsData) ??
    res
  ) as T;
}

const readClientAccessToken = (): string | null => {
  const keys = ["accessToken", "token", "authToken"];
  for (const key of keys) {
    const fromSession = SecureStorage.getSessionItem?.(key);
    if (fromSession) return fromSession;
    const fromSecure = SecureStorage.getItem?.(key);
    if (fromSecure) return fromSecure;
    try {
      const fromLocal = localStorage.getItem(key);
      if (fromLocal) return fromLocal;
    } catch {
      // no-op
    }
  }
  return null;
};

const normalizeExamAnswers = (
  rawAnswers: { questionId: string; userAnswer: string }[] | Record<string, unknown>
): { questionId: string; userAnswer: string }[] => {
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const mapped = Array.isArray(rawAnswers)
    ? rawAnswers.map((item: { questionId?: string; userAnswer?: string }) => ({
        questionId: String(item?.questionId ?? "").trim(),
        userAnswer: String(item?.userAnswer ?? ""),
      }))
    : Object.entries(rawAnswers || {}).map(([questionId, userAnswer]) => ({
        questionId: String(questionId).trim(),
        userAnswer: String(userAnswer ?? ""),
      }));

  return mapped.filter(
    (item) => item.questionId.length > 0 && uuidLike.test(item.questionId)
  );
};

export const listeningTestService = {
  getAllListeningTests: async (
    page = 1,
    limit = 50
  ): Promise<ListeningTestItem[]> => {
    try {
      const res = await axiosPrivate.get("/api/test", {
        params: { page, limit, type: "LISTENING" },
      });
      const data = extractData<{ data?: ListeningTestItem[] } | ListeningTestItem[]>(res);
      if (Array.isArray(data)) return data as ListeningTestItem[];
      if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data?: ListeningTestItem[] }).data)) {
        return (data as { data: ListeningTestItem[] }).data;
      }
      return [];
    } catch (error: unknown) {
      console.error("getAllListeningTests error:", error);
      toast.error("Dinleme testleri yüklenemedi.");
      return [];
    }
  },


  getTestWithFullData: async (
    testId: string
  ): Promise<ListeningTestItem | null> => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const sessionToken = overallTestTokenStore.getByTestId(testId);
      const res = await axiosPrivate.get(`/api/test/testaddition/${testId}`, {
        params: sessionToken ? { sessionToken } : undefined,
      });
      const testData = extractData<ListeningTestItem>(res);
      return testData;
    } catch (error) {
      console.error("getTestWithFullData error:", error);
      toast.error("Dinleme testi yüklenemedi.");
      return null;
    }
  },

  getActiveAudioUrl: async (
    sessionToken: string
  ): Promise<ListeningAudioAccessResponse> => {
    const res = await axiosPrivate.post(
      "/api/overal-test-result/section/listening-audio/access",
      { sessionToken }
    );
    const access = extractData<ListeningAudioAccessResponse>(res);
    return {
      ...access,
      url: resolveApiResourceUrl(access.url),
    };
  },
};

export const listeningSubmissionService = {
  getSessionResult: async (overallTestId: string, testId: string): Promise<{
    overallTestId: string;
    overallCompleted: boolean;
    resultId: string;
  } | null> => {
    try {
      const response = await axiosPrivate.get(`/api/overal-test-result/${encodeURIComponent(overallTestId)}/results`);
      const result = extractData<{
        id: string;
        status: string;
        isCompleted: boolean;
        listening?: { resultId: string; test?: { id: string } } | null;
      }>(response);
      if (result?.id !== overallTestId || result.listening?.test?.id !== testId || !result.listening.resultId) return null;
      if (result.status !== "IN_PROGRESS" && result.status !== "COMPLETED") return null;
      return {
        overallTestId: result.id,
        overallCompleted: result.status === "COMPLETED" || result.isCompleted,
        resultId: result.listening.resultId,
      };
    } catch {
      return null;
    }
  },

  getDraft: async (
    sessionToken: string
  ): Promise<ExamSectionDraftResponse | null> => {
    try {
      const res = await axiosPrivate.get("/api/exam/sections/listening/draft", {
        params: { sessionToken },
      });
      return extractData<ExamSectionDraftResponse>(res);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 401 && status !== 404) {
        console.warn("Listening draft fetch failed");
      }
      return null;
    }
  },

  saveDraft: async (
    sessionToken: string,
    answers: Record<string, unknown>
  ): Promise<ExamSectionDraftResponse | null> => {
    try {
      const res = await axiosPrivate.patch("/api/exam/sections/listening/draft", {
        sessionToken,
        answers: answers || {},
      });
      return extractData<ExamSectionDraftResponse>(res);
    } catch (error: any) {
      const status = error?.response?.status;
      const code = getOverallSectionTimerErrorCode(error);
      if (code === "TEST_TIME_EXPIRED" || code === "SECTION_ALREADY_SUBMITTED") return null;
      if (status !== 401) {
        console.warn("Listening draft save failed");
      }
      return null;
    }
  },

  submitAnswers: async (
    testId: string,
    answers: { questionId: string; userAnswer: string }[] | Record<string, unknown>,
    token?: string | null,
    _audioUrl?: string | null,
    _imageUrls?: string[],
    submitMode: MockSubmitMode = "MANUAL"
  ): Promise<ListeningExamSubmitResponse> => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const authToken = readClientAccessToken();
      const overallSessionToken =
        overallTestTokenStore.getByTestId(testId) ||
        token ||
        null;
      const normalizedAnswers = normalizeExamAnswers(answers);
      
      if (!authToken) {
        toast.error("Cevapları göndermek için giriş yapmanız gerekiyor.");
        throw new Error("Sınav sonuçlarını göndermek için kimlik doğrulama gerekli.");
      }
      if (!overallSessionToken) {
        const message = "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.";
        toast.error(message);
        throw new Error("SESSION_TOKEN_REQUIRED");
      }

      const payload: Record<string, unknown> = { 
        testId, 
        answers: normalizedAnswers,
        sessionToken: overallSessionToken,
        submitMode,
      };
      
      // Media belongs to the server-owned test snapshot, not SubmitAnswersDto.
      // Keep the positional arguments compatible with existing callers, but do
      // not send them: strict DTO validation rejects these extra fields.
      
      const res = await axiosPrivate.post("/api/exam/submit-all", payload);
      const data = extractData<ListeningExamSubmitResponse>(res);

      // toast.success("Javoblar muvaffaqiyatli jo'natildi");
      try { if (overallSessionToken) overallTestTokenStore.clearByTestId(testId); } catch { /* no-op */ }
      return data ?? res.data ?? res;
    } catch (error: unknown) {
      if ((error as { message?: string })?.message === "SESSION_TOKEN_REQUIRED") {
        throw error;
      }
      const status = (error as { response?: { status?: number } })?.response?.status;
      const timerCode = getOverallSectionTimerErrorCode(error);
      if (
        timerCode === "TEST_TIME_EXPIRED" ||
        timerCode === "SECTION_NOT_STARTED" ||
        timerCode === "SESSION_TOKEN_REQUIRED" ||
        timerCode === "SESSION_RECOVERY_EXPIRED" ||
        timerCode === "SECTION_ALREADY_SUBMITTED"
      ) {
        toast.error(getOverallSectionTimerErrorMessage(error));
        throw error;
      }
      if (status === 401 || status === 403) {
        toast.error("Cevapları göndermek için giriş yapmanız gerekiyor.");
        throw new Error(
          "Sınav sonuçlarını göndermek için kimlik doğrulama gerekli (401/403)."
        );
      }
      console.error("submitAnswers error:", error);
      toast.error("Cevaplar gönderilemedi. Lütfen yeniden deneyin.");
      throw error;
    }
  },

  getExamResults: async (
    testResultId: string
  ): Promise<TestResultData | null> => {
    try {
      console.log("Fetching exam results for testResultId:", testResultId);
      const res = await axiosPrivate.get("/api/exam/user-answers", {
        params: { testResulId: testResultId }, // API expects testResulId (with typo)
      });
      console.log("Raw API response:", res);
      
      const data = extractData<TestResultData>(res);
      console.log("Extracted data:", data);
      
      // Handle both single object and array responses
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          console.log("Data is array, returning first item");
          return data.length > 0 ? data[0] : null;
        }
        console.log("Data is single object, returning as is");
        return data as TestResultData;
      }
      console.log("No valid data found");
      return null;
    } catch (error) {
      console.error("getExamResults error:", error);
      toast.error("Test sonucu yüklenemedi.");
      return null;
    }
  },

  // Removed per requirement: results list should not be fetched here
};

export default listeningTestService;
