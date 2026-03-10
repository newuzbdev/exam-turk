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
  audioUrl: string | null;
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
    answers: { questionId: string; userAnswer: string }[] | Record<string, unknown>,
    token?: string | null,
    audioUrl?: string | null,
    imageUrls?: string[]
  ) => {
    try {
      const { overallTestTokenStore } = await import("./overallTest.service");
      const authToken = readClientAccessToken();
      const overallSessionToken =
        overallTestTokenStore.getByTestId(testId) ||
        token ||
        null;
      const normalizedAnswers = normalizeExamAnswers(answers);
      
      console.log("🔍 Dinleme testi gönderim hata ayıklama:", {
        testId,
        hasOverallToken: !!overallTestTokenStore.getByTestId(testId),
        hasSessionToken: !!overallSessionToken,
        tokenSource: overallTestTokenStore.getByTestId(testId) ? 'genel' : 'oturum',
        hasAudioUrl: !!audioUrl,
        imageUrlsCount: imageUrls?.length || 0
      });

      if (!authToken) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error("Sınav sonuçlarını göndermek için kimlik doğrulama gerekli.");
      }

      const payload: Record<string, unknown> = { 
        testId, 
        answers: normalizedAnswers
      };
      if (overallSessionToken) {
        payload.sessionToken = overallSessionToken;
      }
      
      // Add audio and images if provided
      if (audioUrl) {
        payload.audioUrl = audioUrl;
      }
      if (imageUrls && imageUrls.length > 0) {
        payload.imageUrls = imageUrls;
      }
      
      const res = await axiosPrivate.post("/api/exam/submit-all", payload);
      const data = extractData<unknown>(res);

      // toast.success("Javoblar muvaffaqiyatli jo'natildi");
      try { if (overallSessionToken) overallTestTokenStore.clearByTestId(testId); } catch { /* no-op */ }
      return data ?? res.data ?? res;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
        throw new Error(
          "Sınav sonuçlarını göndermek için kimlik doğrulama gerekli (401/403)."
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
