import { SecureStorage } from "@/utils/secureStorage";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";

export interface ListeningAnswer {
  id: string;
  questionId?: string;
  variantText?: string | null;
  answer: string;
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
  audioUrl: any;
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
}

function extractData<T = any>(res: any): T {
  return (
    (res && res.data && res.data.data) ??
    (res && res.data) ??
    (res && res.data && res.data.ieltsData) ??
    res
  );
}

export const listeningTestService = {
  getAllListeningTests: async (
    page = 1,
    limit = 50
  ): Promise<ListeningTestItem[]> => {
    try {
      const res = await axiosPrivate.get("/api/test", {
        params: { page, limit, type: "LISTENING" },
      });
      const data = extractData<any>(res);
      if (Array.isArray(data.data)) return data.data as ListeningTestItem[];
      if (Array.isArray(data)) return data as ListeningTestItem[];
      return [];
    } catch (error: any) {
      console.error("getAllListeningTests error:", error);
      toast.error("Tinglash testlari yuklanmadi");
      return [];
    }
  },


  getTestWithFullData: async (
    testId: string
  ): Promise<ListeningTestItem | null> => {
    try {
      const res = await axiosPrivate.get(`/api/test/testaddition/${testId}`);
      const testData = extractData<ListeningTestItem>(res);
      return testData;
    } catch (error) {
      console.error("getTestWithFullData error:", error);
      toast.error("Tinglash testining to‘liq ma'lumoti yuklanmadi");
      return null;
    }
  },
};

export const listeningSubmissionService = {
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

      toast.success("Javoblar muvaffaqiyatli jo'natildi");
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
      toast.error("Test natijalari yuklanmadi");
      return null;
    }
  },

  // Removed per requirement: results list should not be fetched here
};

export default listeningTestService;
