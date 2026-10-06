import axiosPrivate from "@/config/api";
import type {
  CalibrationPrompt,
  CalibrationVariant,
} from "@/pages/pronunciation-calibration/PronunciationCalibrationStep";

type CalibrationSession = {
  sessionId: string;
  prompts: CalibrationPrompt[];
};

const extensionByMimeType: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
};

const getFileName = (blob: Blob) => {
  const mimeType = String(blob.type || "audio/webm")
    .split(";")[0]
    .toLowerCase();
  return `recording.${extensionByMimeType[mimeType] || "webm"}`;
};

export const pronunciationCalibrationService = {
  async createSession(): Promise<CalibrationSession> {
    const response = await axiosPrivate.post<CalibrationSession>(
      "/api/pronunciation-calibration/sessions",
    );
    return response.data;
  },

  async saveRecording(input: {
    sessionId: string;
    promptId: string;
    variant: CalibrationVariant;
    audioBlob: Blob;
  }): Promise<void> {
    const formData = new FormData();
    formData.append("promptId", input.promptId);
    formData.append("variant", input.variant);
    formData.append("audio", input.audioBlob, getFileName(input.audioBlob));
    await axiosPrivate.post(
      `/api/pronunciation-calibration/sessions/${input.sessionId}/recordings`,
      formData,
      { timeout: 30_000 },
    );
  },

  async completeSession(sessionId: string): Promise<void> {
    await axiosPrivate.post(
      `/api/pronunciation-calibration/sessions/${sessionId}/complete`,
    );
  },
};
