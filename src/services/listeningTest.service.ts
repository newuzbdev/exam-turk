// src/services/listeningTest.service.ts

import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { SecureStorage } from "@/utils/secureStorage";

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

  // 🔥 To‘liq testni bitta endpoint orqali olish
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
      const sessionToken =
        SecureStorage.getSessionItem?.("accessToken") ||
        localStorage.getItem("accessToken") ||
        token;

      if (!sessionToken) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error("Authentication required to submit exam results.");
      }

      const payload = { testId, answers };
      const opts = { headers: { Authorization: `Bearer ${sessionToken}` } };

      const res = await axiosPrivate.post(
        "/api/exam/submit-all",
        payload,
        opts
      );
      const data = extractData<any>(res);

      toast.success("Javoblar muvaffaqiyatli jo'natildi");
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
      const res = await axiosPrivate.get("/api/exam/user-answers", {
        params: { testResulId },
      });
      const data = extractData<TestResultData[]>(res);
      if (Array.isArray(data) && data.length > 0) {
        return data[0]; // Server bir elementli massiv qaytaradi, shuning uchun birinchi elementni olamiz
      }
      return null;
    } catch (error) {
      console.error("getExamResults error:", error);
      toast.error("Test natijalari yuklanmadi");
      return null;
    }
  },
};

export default listeningTestService;
