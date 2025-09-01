// src/services/listeningTest.service.ts
import axiosPrivate from "@/config/api"; // Sizning axios instansingiz
import { toast } from "sonner"; // Xatolarni ko'rsatish uchun
import { SecureStorage } from "@/utils/secureStorage"; // Agar SecureStorage mavjud bo'lsa

/**File: Listening test modeli va service
 * TypeScript interfeyslar
 */
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

/**
 * Helper: turli endpointlar turli joyda data o'rnatishi mumkin
 */
function extractData<T = any>(res: any): T {
    return (
        (res && res.data && res.data.data) ??
        (res && res.data) ??
        (res && res.data && res.data.ieltsData) ??
        res
    );
}

/**
 * Tokenni hal qilish: param orqali berilgan yoki SecureStorage/localStorage dan olinadi.
 */
function resolveToken(passedToken?: string | null) {
    if (passedToken) return passedToken;
    try {
        const sessionToken =
            (typeof SecureStorage !== "undefined" && SecureStorage.getSessionItem?.("accessToken")) ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token");
        return sessionToken ?? null;
    } catch (e) {
        return localStorage.getItem("accessToken") || null;
    }
}

/**
 * Listening test uchun API service
 */
export const listeningTestService = {
    getAllListeningTests: async (page = 1, limit = 50): Promise<ListeningTestItem[]> => {
        try {
            const res = await axiosPrivate.get("/api/test", { params: { page, limit, type: "LISTENING" } });
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

    getPartsByTestId: async (testId: string, page = 1, limit = 50): Promise<ListeningPart[]> => {
        try {
            const res = await axiosPrivate.get("/api/parts", { params: { testId, page, limit } });
            const data = extractData<any>(res);
            if (Array.isArray(data.data)) return data.data as ListeningPart[];
            if (Array.isArray(data)) return data as ListeningPart[];
            return [];
        } catch (error: any) {
            console.error("getPartsByTestId error:", error);
            toast.error("Test qismlari yuklanmadi");
            return [];
        }
    },

    getSectionsByPartId: async (partId: string, page = 1, limit = 50): Promise<ListeningSection[]> => {
        try {
            const res = await axiosPrivate.get("/api/section", { params: { partId, page, limit } });
            const data = extractData<any>(res);
            if (Array.isArray(data.data)) return data.data as ListeningSection[];
            if (Array.isArray(data)) return data as ListeningSection[];
            return [];
        } catch (error: any) {
            console.error("getSectionsByPartId error:", error);
            toast.error("Qism bo'limlari yuklanmadi");
            return [];
        }
    },

    getQuestionsBySectionId: async (sectionId: string, page = 1, limit = 200): Promise<ListeningQuestion[]> => {
        try {
            const res = await axiosPrivate.get("/api/question", { params: { sectionId, page, limit } });
            const data = extractData<any>(res);
            if (Array.isArray(data.data)) return data.data as ListeningQuestion[];
            if (Array.isArray(data)) return data as ListeningQuestion[];
            return [];
        } catch (error: any) {
            console.error("getQuestionsBySectionId error:", error);
            toast.error("Bo'lim savollari yuklanmadi");
            return [];
        }
    },

    /**
     * Answers olish — DOCS: GET /api/answer?questionId=... (Authorization required)
     * Funksiya faqat to'g'ri token va ADMIN roli bo'lsa javoblarni oladi.
     */
    getAnswersByQuestionId: async (
        questionId: string,
        page = 1,
        limit = 50,
        token?: string | null
    ): Promise<ListeningAnswer[]> => {
        const resolvedToken = resolveToken(token);
        if (!resolvedToken) {
            console.warn(`No token found for answers; skipping for question ${questionId}.`);
            return [];
        }
        try {
            const opts = {
                params: { questionId, page, limit },
                headers: { Authorization: `Bearer ${resolvedToken}` },
            };
            const res = await axiosPrivate.get("/api/answer", opts);
            const data = extractData<any>(res);
            if (Array.isArray(data.data)) return data.data as ListeningAnswer[];
            if (Array.isArray(data)) return data as ListeningAnswer[];
            return [];
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 403) {
                console.warn(`403 Forbidden: API rejected token for answers. User may not have correct permissions. Returning empty array.`);
                return [];
            }
            console.error("getAnswersByQuestionId error:", error);
            toast.error("Savol javoblari yuklanmadi");
            return [];
        }
    },

    /**
     * Testni to'liq yig'ib olish
     */
    getTestWithFullData: async (testId: string): Promise<ListeningTestItem | null> => {
        try {
            const testRes = await axiosPrivate.get(`/api/test/only/${testId}`);
            let testData: ListeningTestItem = extractData<any>(testRes) as ListeningTestItem;

            const parts = await listeningTestService.getPartsByTestId(testId);
            if (!parts || parts.length === 0) {
                testData.parts = [];
                return testData;
            }

            const partsWithSections = await Promise.all(
                parts.map(async (part) => {
                    const sections = await listeningTestService.getSectionsByPartId(part.id);
                    if (!sections || sections.length === 0) return { ...part, sections: [] };

                    const sectionsWithQuestions = await Promise.all(
                        sections.map(async (section) => {
                            const questions = await listeningTestService.getQuestionsBySectionId(section.id);
                            if (!questions || questions.length === 0) return { ...section, questions: [] };

                            const questionsWithAnswers = await Promise.all(
                                questions.map(async (q) => {
                                    const answers = await listeningTestService.getAnswersByQuestionId(q.id).catch(() => []);
                                    return { ...q, answers };
                                })
                            );

                            return { ...section, questions: questionsWithAnswers };
                        })
                    );

                    return { ...part, sections: sectionsWithQuestions };
                })
            );

            testData.parts = partsWithSections;
            return testData;
        } catch (error) {
            console.error("getTestWithFullData error:", error);
            toast.error("Tinglash testining to‘liq ma'lumoti yuklanmadi");
            return null;
        }
    },

};

export const listeningSubmissionService = {
    submitAnswers: async (testId: string, answers: { questionId: string; userAnswer: string }[], token?: string | null) => {
        try {
            const resolvedToken = resolveToken(token);
            if (!resolvedToken) {
                toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
                throw new Error("Authentication required to submit exam results.");
            }

            const payload = { testId, answers };
            const opts = { headers: { Authorization: `Bearer ${resolvedToken}` } };
            const res = await axiosPrivate.post("/api/exam/submit-all", payload, opts);

            const data = extractData<any>(res);
            toast.success("Javoblar muvaffaqiyatli jo'natildi");
            return data ?? res.data ?? res;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                console.error("submitAnswers protected: auth required", error);
                toast.error("Javoblarni yuborish uchun tizimga kirishingiz kerak.");
                throw new Error("Authentication required to submit exam results (401/403).");
            }
            console.error("submitAnswers error:", error);
            toast.error("Javoblarni jo'natishda xato yuz berdi");
            throw error;
        }
    },
};

export default listeningTestService;