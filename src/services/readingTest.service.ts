import type { MockReviewV1 } from "@/components/results/evidence-review-utils";
import { SecureStorage } from "@/utils/secureStorage";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { getOverallSectionTimerErrorMessage } from "./overallTest.service";
import type { MockSubmitMode } from "./overallTest.service";

export interface ReadingAnswer {
  id: string;
  questionId?: string;
  variantText?: string | null;
  displayText?: string | null;
  answer?: string | null;
  correct?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingQuestion {
  id: string;
  number?: number;
  text?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  type: string;
  answers?: ReadingAnswer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingSection {
  id: string;
  partId?: string;
  title?: string | null;
  content?: string | null;
  hasBullets?: boolean;
  imageUrl?: string | null;
  questions?: ReadingQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingPart {
  id: string;
  testId?: string;
  number?: number;
  title?: string | null;
  description?: string | null;
  sections?: ReadingSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingTestItem {
  id: string;
  title: string;
  type?: string;
  description?: string | null;
  ieltsId?: string | null;
  parts?: ReadingPart[];
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
    imageUrl?: string | null;
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
  saved?: boolean;
}

function extractData<T = any>(res: any): T {
  return (
    (res && res.data && res.data.data) ??
    (res && res.data) ??
    (res && res.data && res.data.ieltsData) ??
    res
  );
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
    } catch {}
  }
  return null;
};

const normalizeExamAnswers = (
  rawAnswers: { questionId: string; userAnswer: string }[] | Record<string, unknown>
): { questionId: string; userAnswer: string }[] => {
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const mapped = Array.isArray(rawAnswers)
    ? rawAnswers.map((item: any) => ({
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

export const readingTestService = {
  getAllReadingTests: async (
    page = 1,
    limit = 50
  ): Promise<ReadingTestItem[]> => {
    try {
      const res = await axiosPrivate.get("/api/test", {
        params: { page, limit, type: "READING" },
      });
      const data = extractData<any>(res);
      if (Array.isArray(data.data)) return data.data as ReadingTestItem[];
      if (Array.isArray(data)) return data as ReadingTestItem[];
      return [];
    } catch (error: any) {
      console.error("getAllReadingTests error:", error);
      toast.error("O‘qish testlari yuklanmadi");
      return [];
    }
  },

  getTestWithFullData: async (
    testId: string
  ): Promise<ReadingTestItem | null> => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const sessionToken = overallTestTokenStore.getByTestId(testId);
      const res = await axiosPrivate.get(`/api/test/testaddition/${testId}`, {
        params: sessionToken ? { sessionToken } : undefined,
      });
      const testData = extractData<ReadingTestItem>(res);
      return testData;
    } catch (error) {
      console.error("getTestWithFullData error:", error);
      toast.error("O‘qish testining to‘liq ma'lumoti yuklanmadi");
      return null;
    }
  },
};

export const readingSubmissionService = {
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
        reading?: { resultId: string; test?: { id: string } } | null;
      }>(response);
      if (result?.id !== overallTestId || result.reading?.test?.id !== testId || !result.reading.resultId) return null;
      if (result.status !== "IN_PROGRESS" && result.status !== "COMPLETED") return null;
      return {
        overallTestId: result.id,
        overallCompleted: result.status === "COMPLETED" || result.isCompleted,
        resultId: result.reading.resultId,
      };
    } catch {
      return null;
    }
  },
  getDraft: async (
    sessionToken: string
  ): Promise<ExamSectionDraftResponse | null> => {
    try {
      const res = await axiosPrivate.get("/api/exam/sections/reading/draft", {
        params: { sessionToken },
      });
      return extractData<ExamSectionDraftResponse>(res);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 401 && status !== 404) {
        console.warn("Reading draft fetch failed");
      }
      return null;
    }
  },

  saveDraft: async (
    sessionToken: string,
    answers: Record<string, unknown>
  ): Promise<ExamSectionDraftResponse | null> => {
    try {
      const res = await axiosPrivate.patch("/api/exam/sections/reading/draft", {
        sessionToken,
        answers: answers || {},
      });
      return extractData<ExamSectionDraftResponse>(res);
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code || error?.response?.data?.message;
      if (code === "TEST_TIME_EXPIRED" || code === "SECTION_ALREADY_SUBMITTED") return null;
      if (status !== 401) {
        console.warn("Reading draft save failed");
      }
      return null;
    }
  },

  submitAnswers: async (
    testId: string,
    answers: { questionId: string; userAnswer: string }[] | Record<string, unknown>,
    token?: string | null,
    submitMode: MockSubmitMode = "MANUAL"
  ) => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const authToken = readClientAccessToken();
      const overallSessionToken =
        overallTestTokenStore.getByTestId(testId) || token || null;
      const normalizedAnswers = normalizeExamAnswers(answers);

      if (!authToken) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error("Authentication required to submit exam results.");
      }
      if (!overallSessionToken) {
        const message = "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.";
        toast.error(message);
        throw new Error("SESSION_TOKEN_REQUIRED");
      }

      const payload: {
        testId: string;
        answers: { questionId: string; userAnswer: string }[];
        sessionToken: string;
        submitMode: MockSubmitMode;
      } = {
        testId,
        answers: normalizedAnswers,
        sessionToken: overallSessionToken,
        submitMode,
      };

      const res = await axiosPrivate.post("/api/exam/submit-all", payload);
      const data = extractData<any>(res);

      // toast.success("Javoblar muvaffaqiyatli jo'natildi");
      try { if (overallSessionToken) overallTestTokenStore.clearByTestId(testId); } catch {}
      return data ?? res.data ?? res;
    } catch (error: any) {
      if (error?.message === "SESSION_TOKEN_REQUIRED") {
        throw error;
      }
      const status = error?.response?.status;
      const timerCode = error?.response?.data?.code;
      if (timerCode === "TEST_TIME_EXPIRED" || timerCode === "SECTION_NOT_STARTED" || timerCode === "SESSION_TOKEN_REQUIRED") {
        toast.error(getOverallSectionTimerErrorMessage(error));
        throw error;
      }
      if (status === 401 || status === 403) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error(
          "Authentication required to submit exam results (401/403)."
        );
      }
      console.error("submitAnswers error:", error);
      toast.error("Javoblarni jo'natishda xato yuz berdi");
      throw error;
    }
  },

  getExamResults: async (
    testResulId: string
  ): Promise<TestResultData | null> => {
    try {
      // Backend expects testResultId; keep legacy param for backward compatibility
      const res = await axiosPrivate.get("/api/exam/user-answers", {
        params: { testResultId: testResulId, testResulId },
      });
      const raw = extractData<any>(res);
      // Accept multiple shapes: array, object, or nested data
      if (Array.isArray(raw)) {
        return (raw[0] as TestResultData) ?? null;
      }
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) {
          return (raw.data[0] as TestResultData) ?? null;
        }
        // If it looks like a single result object
        if (raw.userAnswers || raw.id || raw.testId) {
          return raw as TestResultData;
        }
      }
      return null;
    } catch (error) {
      console.error("getExamResults error:", error);
      toast.error("Test natijalari yuklanmadi");
      return null;
    }
  },
};

export default readingTestService;
