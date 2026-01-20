import { SecureStorage } from "@/utils/secureStorage";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";

export interface ReadingAnswer {
  id: string;
  questionId?: string;
  variantText?: string | null;
  answer: string;
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
}

function extractData<T = any>(res: any): T {
  return (
    (res && res.data && res.data.data) ??
    (res && res.data) ??
    (res && res.data && res.data.ieltsData) ??
    res
  );
}

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
      const res = await axiosPrivate.get(`/api/test/testaddition/${testId}`);
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
  submitAnswers: async (
    testId: string,
    answers: { questionId: string; userAnswer: string }[],
    token?: string | null
  ) => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const sessionToken =
        overallTestTokenStore.getByTestId(testId) ||
        SecureStorage.getSessionItem?.("accessToken") ||
        localStorage.getItem("accessToken") ||
        token;

      if (!sessionToken) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error("Authentication required to submit exam results.");
      }

      const payload = { testId, sessionToken, answers };
      const opts = { headers: { Authorization: `Bearer ${sessionToken}` } };

      const res = await axiosPrivate.post(
        "/api/exam/submit-all",
        payload,
        opts
      );
      const data = extractData<any>(res);

      // toast.success("Javoblar muvaffaqiyatli jo'natildi");
      try { overallTestTokenStore.clearByTestId(testId); } catch {}
      return data ?? res.data ?? res;
    } catch (error: any) {
      const status = error?.response?.status;
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
