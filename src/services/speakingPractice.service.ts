import { assertContentAccessEnabled } from '@/services/access-request-guard';
import axiosPrivate from "@/config/api";
import {
  type PracticeListItem,
  type PracticeSolve,
  type SpeakingPracticeEvaluation,
  unwrapPracticeResponse,
} from "./practice.types";

export const speakingPracticeService = {
  list: async (params: { order?: "newest" | "oldest" } = {}) => {
    const response = await axiosPrivate.get<PracticeListItem[]>(
      "/api/speaking-practice", { params },
    );
    return unwrapPracticeResponse(response.data) ?? [];
  },

  solve: async <T = unknown>(id: string, input: { accessContextId?: string } = {}) => {
    await assertContentAccessEnabled(input);
    const response = await axiosPrivate.get<PracticeSolve<T>>(
      `/api/speaking-practice/${id}/solve`,
      { params: input },
    );
    return unwrapPracticeResponse(response.data);
  },

  evaluate: async (
    id: string,
    runId: string,
    recordings: Array<{ key: string; blob: Blob }>,
    input: { accessContextId?: string } = {},
  ) => {
    await assertContentAccessEnabled(input);
    const formData = new FormData();
    formData.append("runId", runId);
    if (input.accessContextId) formData.append("accessContextId", input.accessContextId);
    formData.append(
      "recordingKeys",
      JSON.stringify(recordings.map((item) => item.key)),
    );
    recordings.forEach((item, index) => {
      const extension = item.blob.type.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", item.blob, `cevap-${index + 1}.${extension}`);
    });
    const response = await axiosPrivate.post<SpeakingPracticeEvaluation>(
      `/api/speaking-practice/${id}/evaluate`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapPracticeResponse(response.data);
  },

};

export default speakingPracticeService;
