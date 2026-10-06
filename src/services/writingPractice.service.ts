import { assertContentAccessEnabled } from '@/services/access-request-guard';
import axiosPrivate from "@/config/api";
import type { WritingPracticeHelpAnswer, WritingPracticeHelpContent } from "@/pages/writing-practice/writing-practice-help";
import {
  type PracticeListItem,
  type PracticeSolve,
  type WritingPracticeEvaluation,
  unwrapPracticeResponse,
} from "./practice.types";

export const writingPracticeService = {
  list: async (params: { order?: "newest" | "oldest" } = {}) => {
    const response = await axiosPrivate.get<PracticeListItem[]>(
      "/api/writing-practice", { params },
    );
    return unwrapPracticeResponse(response.data) ?? [];
  },

  solve: async <T = unknown>(id: string, input: { accessContextId?: string } = {}) => {
    await assertContentAccessEnabled(input);
    const response = await axiosPrivate.get<PracticeSolve<T>>(
      `/api/writing-practice/${id}/solve`,
      { params: input },
    );
    return unwrapPracticeResponse(response.data);
  },

  evaluate: async (id: string, runId: string, answerText: string, signal?: AbortSignal, input: { accessContextId?: string } = {}) => {
    await assertContentAccessEnabled(input);
    const response = await axiosPrivate.post<WritingPracticeEvaluation>(
      `/api/writing-practice/${id}/evaluate`,
      { runId, answerText, ...input },
      { timeout: 120_000, signal },
    );
    return unwrapPracticeResponse(response.data);
  },

  getEvaluation: async (id: string, runId: string, signal?: AbortSignal) => {
    const response = await axiosPrivate.get<{ status: "PENDING" | "COMPLETED" | "FAILED"; result: WritingPracticeEvaluation | null }>(
      `/api/writing-practice/${id}/evaluations/${runId}`, { signal },
    );
    return unwrapPracticeResponse(response.data);
  },

  getHelp: async (id: string, signal?: AbortSignal) => {
    const response = await axiosPrivate.get<WritingPracticeHelpContent>(
      `/api/writing-practice/${id}/help`, { signal, timeout: 15000 },
    );
    return unwrapPracticeResponse(response.data);
  },

  askHelp: async (id: string, questionId: string, answerText: string, signal?: AbortSignal) => {
    const response = await axiosPrivate.post<WritingPracticeHelpAnswer>(
      `/api/writing-practice/${id}/help`, { questionId, answerText },
      { signal, timeout: 60000 },
    );
    return unwrapPracticeResponse(response.data);
  },
};

export default writingPracticeService;
