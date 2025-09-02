import axiosPrivate from "@/config/api";
import { toast } from "sonner";

// 🔹 Javob modeli
export interface ListeningSubmissionAnswer {
  questionId: string;
  userAnswer: string | string[];
}

// 🔹 Har bir test submissioni uchun backenddan keladigan model
export interface ListeningSubmissionItem {
  id: string;
  listeningTestId: string;
  userId: string;
  score: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// 🔹 Payload (yuboriladigan data)
export interface ListeningSubmissionPayload {
  testId: string;
  answers: ListeningSubmissionAnswer[];
}

export const listeningSubmissionService = {
  // 🔹 Testni topshirish
  create: async (
    payload: ListeningSubmissionPayload
  ): Promise<ListeningSubmissionItem | null> => {
    try {
      const res = await axiosPrivate.post("/api/exam/submit", payload, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Listening testi yuborildi ✅");
      return res.data.data || null;
    } catch (error: any) {
      console.error("❌ Listening submission error:", error);
      toast.error("Listening testi yuborilmadi");
      return null;
    }
  },

  // 🔹 Barcha submissionlarni olish (admin uchun)
  getAll: async (): Promise<ListeningSubmissionItem[]> => {
    try {
      const res = await axiosPrivate.get("/api/exam/submissions");
      return res.data.data || [];
    } catch (error: any) {
      console.error("❌ Failed to fetch listening submissions", error);
      toast.error("Listening submissionlarini olishda xato");
      return [];
    }
  },

  // 🔹 Faqat mening submissionlarim
  getMine: async (): Promise<ListeningSubmissionItem[]> => {
    try {
      const res = await axiosPrivate.get("/api/exam/my-submissions");
      return res.data.data || [];
    } catch (error: any) {
      console.error("❌ Failed to fetch my listening submissions", error);
      toast.error("Sizning submissionlaringizni olishda xato");
      return [];
    }
  },

  // 🔹 Bitta submissionni olish
  getById: async (id: string): Promise<ListeningSubmissionItem | null> => {
    try {
      const res = await axiosPrivate.get(`/api/exam/submission/${id}`);
      return res.data.data || null;
    } catch (error: any) {
      console.error("❌ Failed to fetch listening submission", error);
      toast.error("Listening submission topilmadi");
      return null;
    }
  },
};

export default listeningSubmissionService;