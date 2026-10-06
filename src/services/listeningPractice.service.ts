import { assertContentAccessEnabled } from '@/services/access-request-guard';
import axiosPrivate from "@/config/api";
import {
  type ListeningPracticeCheckResult,
  type PracticeListItem,
  type PracticeSolve,
  unwrapPracticeResponse,
} from "./practice.types";

export const listeningPracticeService = {
  list: async (params: { order?: "newest" | "oldest" } = {}) => {
    const response = await axiosPrivate.get<PracticeListItem[]>(
      "/api/listening-practice", { params },
    );
    return unwrapPracticeResponse(response.data) ?? [];
  },

  solve: async <T = unknown>(id: string, input: { accessContextId?: string } = {}) => {
    await assertContentAccessEnabled(input);
    const response = await axiosPrivate.get<PracticeSolve<T>>(
      `/api/listening-practice/${id}/solve`,
      { params: input },
    );
    return unwrapPracticeResponse(response.data);
  },

  check: async (id: string, answers: Record<string, string>, input: { accessContextId?: string } = {}) => {
    await assertContentAccessEnabled(input);
    const response = await axiosPrivate.post<ListeningPracticeCheckResult>(
      `/api/listening-practice/${id}/check`,
      { answers, ...input },
    );
    return unwrapPracticeResponse(response.data);
  },
};

export default listeningPracticeService;
