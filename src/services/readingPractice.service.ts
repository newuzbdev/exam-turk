import type { CatalogMetadata } from './access.service';
import { assertContentAccessEnabled } from '@/services/access-request-guard';
import axiosPrivate from "@/config/api";
import { readingPracticeEndPoint } from "@/config/endpoint";
import { toast } from "sonner";

export interface ReadingPracticeParagraph {
  label: string;
  title?: string;
  text: string;
  imageUrl?: string;
  imagePositionX?: number;
  imagePositionY?: number;
}

export interface ReadingPracticeGlossaryEntry {
  id?: string;
  order: number;
  term: string;
  definition: string;
  simpleDefinition?: string;
  baseForm?: string;
  baseMeaning?: string;
  contextMeaning?: string;
  contextSnippet?: string;
  occurrenceIndex?: number;
  translation?: string;
  example?: string;
  paragraphLabel?: string;
}

export interface ReadingPracticeQuestion {
  id: string;
  order: number;
  prompt: string;
  options?: unknown;
  meta?: unknown;
  explanation?: string;
  evidenceParagraphs?: string[];
}

export interface ReadingPracticeQuestionGroup {
  id: string;
  order: number;
  title: string;
  type: string;
  instructions?: string;
  questions: ReadingPracticeQuestion[];
}

export interface ReadingPracticeListItem extends CatalogMetadata {
  id: string;
  title: string;
  passageTitle?: string;
  description?: string;
  coverImageUrl?: string;
  topic?: string;
  level?: string;
  price?: number;
  coinCost?: number;
  estimatedMinutes: number;
  practiceType?: "COMPREHENSIVE" | "SECTION";
  sectionNumber?: number;
  isPublished: boolean;
  isFreeAccess?: boolean;
  isFreeAccessManaged?: boolean;
  glossaryCount: number;
  questionGroupCount: number;
  questionCount: number;
  attemptCount: number;
  paragraphs?: ReadingPracticeParagraph[];
  sectionSummary?: Array<{
    id: string;
    order: number;
    title: string;
    type: string;
    questionCount: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingPracticeListPage {
  data: ReadingPracticeListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReadingPracticePassage {
  id: string;
  title: string;
  passageTitle?: string;
  description?: string;
  coverImageUrl?: string;
  topic?: string;
  level?: string;
  price?: number;
  coinCost?: number;
  estimatedMinutes: number;
  practiceType?: "COMPREHENSIVE" | "SECTION";
  sectionNumber?: number;
  isPublished: boolean;
  isFreeAccess?: boolean;
  isFreeAccessManaged?: boolean;
  paragraphs: ReadingPracticeParagraph[];
  glossaryEntries: ReadingPracticeGlossaryEntry[];
  questionGroups: ReadingPracticeQuestionGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingPracticeQuestionResult {
  questionId: string;
  groupId: string;
  groupTitle: string;
  questionType: string;
  order: number;
  prompt: string;
  options: unknown[];
  explanation?: string;
  evidenceParagraphs?: string[];
  meta?: unknown;
  correctAnswer: unknown;
  acceptedAnswers?: unknown;
  userAnswer: unknown;
  isCorrect: boolean;
}

export interface ReadingPracticeAttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds?: number | null;
  completedAt?: string;
  passage: {
    id: string;
    title: string;
    passageTitle?: string;
    description?: string;
    topic?: string;
    level?: string;
    coinCost?: number;
    estimatedMinutes: number;
    paragraphs: ReadingPracticeParagraph[];
  };
  glossaryEntries: ReadingPracticeGlossaryEntry[];
  groups: {
    id: string;
    order: number;
    title: string;
    type: string;
    instructions?: string;
  }[];
  questionResults: ReadingPracticeQuestionResult[];
}

export interface ReadingPracticeLearningQuestionCheck {
  questionId: string;
  order: number;
  userAnswer: unknown;
  answered: boolean;
  isCorrect: boolean;
  wrongAttempts: number;
  canReveal: boolean;
  hint?: string;
  method?: string;
  methodUz?: string;
  correctAnswer?: unknown;
  explanation?: string;
  explanationUz?: string;
  strategy?: string;
  strategyUz?: string;
  transferTip?: string;
  transferTipUz?: string;
  distractorExplanation?: string;
  distractorExplanationUz?: string;
  evidenceParagraphs?: string[];
  evidenceSnippet?: string;
}

export interface ReadingPracticeLearningCheckResult {
  attemptId: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  allCorrect: boolean;
  questions: ReadingPracticeLearningQuestionCheck[];
}

export interface ReadingPracticeAiHelpResponse {
  answer: string;
  baseForm?: string;
  baseMeaning?: string;
  contextMeaning?: string;
  example?: string;
  mode: "calisma" | "sinav";
  source: string;
  model: string;
}

export interface ReadingPracticeStartResponse {
  passageId: string;
  attemptId: string;
  coinCost: number;
  remainingCoins: number | null;
  message: string;
  errorCode?: "INSUFFICIENT_COINS";
}

export interface ReadingPracticeCompletionSummary {
  passageIds: string[];
}

function extractData<T>(response: any): T {
  return response?.data?.resultSnapshot || response?.data || response;
}

export const readingPracticeService = {
  async getPage({ page = 1, limit = 10, ...filters }: {
    page?: number;
    limit?: number;
    order?: 'newest' | 'oldest';
    level?: string;
    practiceType?: 'SECTION';
    sectionNumber?: number;
  } = {}): Promise<ReadingPracticeListPage> {
    const response = await axiosPrivate.get(readingPracticeEndPoint.getAll, {
      timeout: 12_000,
      params: { page, limit, ...filters },
    });
    const payload = response?.data;
    const rows: ReadingPracticeListItem[] = Array.isArray(payload) ? payload
      : Array.isArray(payload?.data) ? payload.data : [];
    return {
      data: Array.isArray(payload) ? rows.slice((page - 1) * limit, page * limit) : rows,
      total: Array.isArray(payload) ? rows.length : typeof payload?.total === 'number' ? payload.total
        : (page - 1) * limit + rows.length + (rows.length === limit ? 1 : 0),
      page,
      limit,
    };
  },

  async getAll(params: { order?: "newest" | "oldest" } = {}): Promise<ReadingPracticeListItem[]> {
    try {
      const result: ReadingPracticeListItem[] = [];
      for (let page = 1; ; page += 1) {
        const response = await axiosPrivate.get(readingPracticeEndPoint.getAll, {
          timeout: 12_000,
          params: { page, limit: 100, ...params },
        });
        const payload = response?.data;
        const rows: ReadingPracticeListItem[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        result.push(...rows);
        if (Array.isArray(payload) || rows.length < 100 || (typeof payload?.total === 'number' && result.length >= payload.total)) return result;
      }
    } catch (error) {
      console.error("readingPracticeService.getAll", error);
      throw error;
    }
  },

  async getCompletedPassageIds(): Promise<string[]> {
    try {
      const response = await axiosPrivate.get(readingPracticeEndPoint.getCompletions, {
        timeout: 12_000,
      });
      const payload = extractData<ReadingPracticeCompletionSummary>(response);
      return Array.isArray(payload?.passageIds) ? payload.passageIds : [];
    } catch (error) {
      console.error("readingPracticeService.getCompletedPassageIds", error);
      return [];
    }
  },

  async getById(id: string): Promise<ReadingPracticePassage | null> {
    try {
      const response = await axiosPrivate.get(readingPracticeEndPoint.getById(id));
      return extractData<ReadingPracticePassage>(response);
    } catch (error) {
      console.error("readingPracticeService.getById", error);
      toast.error("Okuma çalışması yüklenemedi");
      return null;
    }
  },

  async getPreview(id: string): Promise<ReadingPracticeListItem | null> {
    try {
      const response = await axiosPrivate.get(readingPracticeEndPoint.getById(id));
      return extractData<ReadingPracticeListItem>(response);
    } catch (error) {
      console.error("readingPracticeService.getPreview", error);
      return null;
    }
  },

  async getSolveDetail(id: string, attemptId: string): Promise<ReadingPracticePassage | null> {
    try {
      const response = await axiosPrivate.get(
        readingPracticeEndPoint.solve(id, attemptId),
        {
          // Admin edits can update glossary entries while a local practice tab
          // is open. A unique read URL prevents a cached solve payload from
          // hiding the newly saved dictionary after refresh.
          params: { _refresh: Date.now() },
        },
      );
      return extractData<ReadingPracticePassage>(response);
    } catch (error) {
      console.error("readingPracticeService.getSolveDetail", error);
      toast.error("Okuma çalışması oturumu yüklenemedi");
      return null;
    }
  },

  async start(id: string, input: { accessContextId?: string } = {}): Promise<ReadingPracticeStartResponse | null> {
    try {
      await assertContentAccessEnabled(input);
      const response = await axiosPrivate.post(readingPracticeEndPoint.start(id), input);
      return extractData<ReadingPracticeStartResponse>(response);
    } catch (error: any) {
      console.error("readingPracticeService.start", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Okuma çalışması başlatılamadı";

      if (message === "Insufficient coins") {
        return {
          passageId: id,
          attemptId: "",
          coinCost: 0,
          remainingCoins: null,
          message,
          errorCode: "INSUFFICIENT_COINS",
        };
      }

      toast.error(message);
      return null;
    }
  },

  async submit(
    id: string,
    attemptId: string,
    answers: { questionId: string; value: unknown }[],
    durationSeconds?: number,
  ): Promise<ReadingPracticeAttemptResult | null> {
    try {
      const response = await axiosPrivate.post(readingPracticeEndPoint.submit(id), {
        attemptId,
        answers,
        durationSeconds,
      });
      return extractData<ReadingPracticeAttemptResult>(response);
    } catch (error) {
      console.error("readingPracticeService.submit", error);
      toast.error("Cevaplar gönderilemedi");
      return null;
    }
  },

  async check(
    id: string,
    attemptId: string,
    answers: { questionId: string; value: unknown }[],
    revealQuestionIds: string[] = [],
  ): Promise<ReadingPracticeLearningCheckResult | null> {
    try {
      const response = await axiosPrivate.post(readingPracticeEndPoint.check(id), {
        attemptId,
        answers,
        revealQuestionIds,
      });
      return extractData<ReadingPracticeLearningCheckResult>(response);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Cevaplar kontrol edilemedi";
      console.error("readingPracticeService.check", message, error);
      toast.error(message);
      return null;
    }
  },

  async getAttempt(attemptId: string): Promise<ReadingPracticeAttemptResult | null> {
    try {
      const response = await axiosPrivate.get(
        readingPracticeEndPoint.getAttempt(attemptId),
      );
      const payload = response?.data;

      if (payload?.resultSnapshot) {
        return {
          attemptId: payload.attemptId,
          completedAt: payload.completedAt,
          ...payload.resultSnapshot,
        };
      }

      return extractData<ReadingPracticeAttemptResult>(response);
    } catch (error) {
      console.error("readingPracticeService.getAttempt", error);
      toast.error("Sonuçlar yüklenemedi");
      return null;
    }
  },
  async getAiHelp(
    id: string,
    payload: {
      attemptId: string;
      toolType?: "WORD_EXPLAIN";
      word?: string;
      paragraphLabel?: string;
      sentence?: string;
      currentQuestionId?: string;
      prompt?: string;
      mode?: "calisma" | "sinav";
    },
  ): Promise<ReadingPracticeAiHelpResponse | null> {
    try {
      const response = await axiosPrivate.post(
        readingPracticeEndPoint.aiHelp(id),
        payload,
      );
      return extractData<ReadingPracticeAiHelpResponse>(response);
    } catch (error) {
      console.error("readingPracticeService.getAiHelp", error);
      toast.error("Kelime açıklaması alınamadı");
      return null;
    }
  },
};
