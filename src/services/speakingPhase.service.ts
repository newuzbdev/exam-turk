import axiosPrivate from "@/config/api";

export type SpeakingQuestionPhase =
  | "NOT_STARTED"
  | "PROMPT_LOADING"
  | "PROMPT_PLAYING"
  | "PREP_IN_PROGRESS"
  | "RECORDING_READY"
  | "RECORDING_IN_PROGRESS"
  | "RECORDING_FINALIZING"
  | "ANSWER_SAVED"
  | "NEXT_READY"
  | "SECTION_READY_TO_SUBMIT"
  | "SUBMITTED"
  | "EXPIRED";

export type SpeakingPhaseState = {
  currentQuestionId: string | null;
  questionIndex: number;
  phase: SpeakingQuestionPhase;
  phaseStartedAt: string;
  promptStartedAt?: string | null;
  promptExpectedEndsAt?: string | null;
  prepStartedAt?: string | null;
  prepExpiresAt?: string | null;
  recordingStartedAt?: string | null;
  recordingExpiresAt?: string | null;
  answerFinalizedAt?: string | null;
  outerExpiresAt?: string | null;
  canRecord: boolean;
  canGoNext: boolean;
  canSubmitSection: boolean;
  serverNow: string;
};

type PhasePayload = {
  sessionToken: string;
  questionId?: string;
};

const postPhase = async (path: string, payload: PhasePayload) => {
  const response = await axiosPrivate.post<SpeakingPhaseState>(path, payload);
  return response.data;
};

export const speakingPhaseService = {
  get: async (sessionToken: string) => {
    const response = await axiosPrivate.get<SpeakingPhaseState | null>(
      "/api/speaking-test/session/phase",
      { params: { sessionToken } },
    );
    return response.data;
  },
  startQuestion: (payload: PhasePayload) =>
    postPhase("/api/speaking-test/session/phase/start-question", payload),
  promptEnded: (payload: PhasePayload) =>
    postPhase("/api/speaking-test/session/phase/prompt-ended", payload),
  startRecording: (payload: PhasePayload) =>
    postPhase("/api/speaking-test/session/phase/start-recording", payload),
  finalizeRecording: (payload: PhasePayload) =>
    postPhase("/api/speaking-test/session/phase/finalize-recording", payload),
  next: (payload: PhasePayload) =>
    postPhase("/api/speaking-test/session/phase/next", payload),
};

export default speakingPhaseService;
