import { accessErrorMessage } from '@/utils/content-access';
import type { CatalogMetadata } from './access.service';
export type PracticeDomain = "LISTENING" | "WRITING" | "SPEAKING";

export type PracticeListItem = CatalogMetadata & {
  id: string;
  title: string;
  description?: string | null;
  level: string;
  sectionCode: string;
  coverImageUrl?: string | null;
  estimatedMinutes: number;
  isFreeAccess: boolean;
  createdAt: string;
};

export type PracticeSolve<T = unknown> = PracticeListItem & {
  content: T;
  accessContextId?: string;
};

export type WritingPracticeTaskCode = "TASK_1_1" | "TASK_1_2" | "TASK_2";
export type WritingPracticePartCode = "PART_1" | "PART_2";

export type WritingPracticeRichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{
    type?: string;
    attrs?: Record<string, unknown>;
  }>;
  content?: WritingPracticeRichTextNode[];
};

export type WritingPracticeQuestion = {
  id: string;
  text: string;
};

export type WritingPracticeTask = {
  id: string;
  taskCode: WritingPracticeTaskCode;
  order: number;
  label: string;
  promptJson: WritingPracticeRichTextNode;
  register: string;
  genre: string;
  targetLevel: string;
  wordMin: number;
  wordMax: number;
  maxRawScore: number;
  questions: WritingPracticeQuestion[];
};

export type WritingPracticeSection = {
  id: string;
  partCode: WritingPracticePartCode;
  order: number;
  title: string;
  description?: string | null;
  subParts: WritingPracticeTask[];
};

export type WritingPracticeContent = {
  id: string;
  title: string;
  instruction?: string | null;
  formatVersion: 2;
  durationMinutes: number;
  sourceEmail: WritingPracticeRichTextNode;
  sections: WritingPracticeSection[];
};

export type ListeningPracticeCheckResult = {
  total: number;
  answered: number;
  correct: number;
  details: Array<{
    questionId: string;
    questionNumber: number;
    isCorrect: boolean;
  }>;
};

export const WRITING_PRACTICE_FEEDBACK_VERSION = "1.1.1";

export type WritingPracticeCorrection = {
  start: number;
  end: number;
  original: string;
  corrected: string;
  explanation: string;
  kind: "GRAMMAR" | "SPELLING" | "PUNCTUATION" | "VOCABULARY" | "REGISTER";
};

export type WritingPracticeEvaluation = {
  version: string;
  answerText: string;
  wordCount: number;
  summary: string;
  strongPoint: string;
  focusPoint: string;
  nextStep: string;
  taskStatus: "MET" | "PARTLY_MET" | "NOT_MET";
  taskFeedback: string;
  estimatedLevel:
    | "A1 veya altı"
    | "A2"
    | "Alt B1"
    | "Üst B1"
    | "B1"
    | "Alt B2"
    | "Üst B2"
    | "B2 veya üstü"
    | "C1 veya üstü"
    | "C1"
    | "C2"
    | "Belirlenemedi";
  levelReason: string;
  criteria: {
    grammar: string;
    vocabulary: string;
    coherence: string;
    register: string;
    spellingAndPunctuation: string;
  };
  wordTargetFeedback?: string;
  corrections: WritingPracticeCorrection[];
  evaluated: true;
  cached: boolean;
};

export type SpeakingPracticeEvaluation = {
  version?: string;
  estimatedLevel?: "A1 altı" | "A1" | "A2" | "B1" | "B2" | "C1";
  sectionScore?: number;
  maximumScore?: number;
  scoreRationale?: string;
  summary: string;
  strongPoint: string;
  focusPoint: string;
  nextStep: string;
  criteria?: {
    taskAchievement: string;
    fluencyAndCoherence: string;
    vocabulary: string;
    grammar: string;
    pronunciationAndIntelligibility: string;
  };
  answers?: Array<{
    question: string;
    heardAnswer: string;
    taskStatus: "MET" | "PARTLY_MET" | "NOT_MET";
    feedback: string;
    improvedAnswer: string;
    rewriteType: "YOUR_ANSWER" | "MODEL_EXAMPLE";
  }>;
  evaluated: true;
  cached: boolean;
};

export type SpeakingPracticeComparisonEvaluation = {
  provider: "GOOGLE" | "OPENAI";
  model: string;
  inputKind: "DIRECT_AUDIO" | "SHARED_TRANSCRIPT";
  result: SpeakingPracticeEvaluation;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  estimatedModelCostUsd: number | null;
};

export type SpeakingPracticeEvaluationComparison = {
  version: "1.0.0";
  pricingSnapshot: string;
  transcripts: Array<{
    question: string;
    text: string;
    confidence: number | null;
    durationSeconds: number | null;
  }>;
  evaluations: {
    geminiDirectAudio: SpeakingPracticeComparisonEvaluation | null;
    geminiFlashSharedTranscript: SpeakingPracticeComparisonEvaluation | null;
    openAiSharedTranscript: SpeakingPracticeComparisonEvaluation | null;
  };
  errors?: Partial<
    Record<
      | "geminiDirectAudio"
      | "geminiFlashSharedTranscript"
      | "openAiSharedTranscript",
      string
    >
  >;
};

export const unwrapPracticeResponse = <T>(value: T | { data: T }): T =>
  value && typeof value === "object" && "data" in value
    ? (value as { data: T }).data
    : (value as T);

export const getPracticeErrorMessage = (reason: any, fallback: string) => {
  const accessMessage = accessErrorMessage(reason);
  if (accessMessage) return accessMessage;
  if (reason?.response?.status === 402) return "Aktif üyelik gerekli.";
  const message =
    reason?.response?.data?.message ?? reason?.response?.data?.error;
  return typeof message === "string" &&
    message.trim() &&
    message !== "İstek işlenemedi." &&
    message !== "Sunucuda beklenmeyen bir hata oluştu."
    ? message
    : fallback;
};
