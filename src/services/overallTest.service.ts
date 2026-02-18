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
    levels: string[] = ["B1", "B2", "C1"],
    uniqueUsers: boolean = true
  ): Promise<any[]> => {
    try {
      const res = await axiosPrivate.get("/api/overal-test-result/recent", {
        params: {
          limit,
          levels: levels.join(","),
          uniqueUsers,
        },
      });
      return res.data?.data || res.data || [];
    } catch (error: any) {
      console.error("Error fetching recent qualified overall tests:", error);
      return [];
    }
  },
};

export default overallTestService;
