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
}

const tokenKeyByTestId = (testId: string) => `overall.sessionToken.byTestId.${testId}`;
const tokenKey = (type: TestType, testId: string) => `overall.sessionToken.${type}.${testId}`;

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
      }

      return data;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.status === 400 ? "Insufficient coins" : "Failed to start overall test");
      toast.error(message);
      return null;
    }
  },
};

export default overallTestService;


