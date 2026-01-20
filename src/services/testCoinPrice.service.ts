import axiosPrivate from "@/config/api";
import { toast } from "sonner";

export type TestType = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

export interface TestCoinPriceItem {
  id: string;
  testType: TestType;
  coin: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const testCoinPriceService = {
  async getAll(): Promise<TestCoinPriceItem[]> {
    try {
      const res = await axiosPrivate.get("/api/test-coin-price");
      const payload = res?.data?.data || res?.data || {};
      if (Array.isArray(payload)) return payload as TestCoinPriceItem[];
      if (Array.isArray(payload?.data)) return payload.data as TestCoinPriceItem[];
      // Some backends return { total, page, limit, data: [...] }
      if (payload?.data && Array.isArray(payload.data)) return payload.data as TestCoinPriceItem[];
      return [];
    } catch (e) {
      console.error("Failed to fetch test coin prices", e);
      toast.error("Test coin narxlari yuklanmadi");
      return [];
    }
  },

  async getById(id: string): Promise<TestCoinPriceItem | null> {
    try {
      const res = await axiosPrivate.get(`/api/test-coin-price/${id}`);
      return res?.data?.data || res?.data || null;
    } catch (e) {
      console.error("Failed to fetch test coin price", e);
      toast.error("Test coin narxi topilmadi");
      return null;
    }
  },

  async update(id: string, coin: number): Promise<TestCoinPriceItem | null> {
    try {
      const res = await axiosPrivate.patch(`/api/test-coin-price/${id}`, { coin });
      toast.success("Test coin narxi yangilandi");
      return res?.data?.data || res?.data || null;
    } catch (e) {
      console.error("Failed to update test coin price", e);
      toast.error("Test coin narxini yangilashda xato");
      return null;
    }
  },
};

export default testCoinPriceService;


