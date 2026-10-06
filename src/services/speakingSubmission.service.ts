import { reportMockAccessFailure } from '@/utils/mock-access-recovery';
import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import axiosPrivate from '@/config/api';
import { toast } from 'sonner';
import { normalizeDisplayText } from '@/utils/text';
import { getOverallSectionTimerErrorMessage } from './overallTest.service';
import type { MockSubmitMode } from './overallTest.service';
import {
  normalizeSpeakingSubmissionResponse,
  selectRecentRecoverableSpeakingSubmission,
  type RecoverableSpeakingSubmission,
} from './speakingSubmissionRecovery';

export interface QuestionAnswer {
  questionId: string;
  userAnswer: string;
  audioClientId?: string;
}

export interface SubPartSubmission {
  image?: string;
  duration: number;
  questions: QuestionAnswer[];
}

export interface PartSubmission {
  description: string;
  duration: number;
  image?: string;
  type?: string;
  subParts?: SubPartSubmission[];
  questions?: QuestionAnswer[];
}

export interface SpeakingSubmissionData {
  speakingTestId: string;
  parts: PartSubmission[];
  sessionToken?: string;
  submitMode?: MockSubmitMode;
}

export interface SubmissionResponse {
  success: boolean;
  submissionId?: string;
  overallTestId?: string;
  evaluationStatus?: "PENDING" | "COMPLETED" | "FAILED";
  error?: string;
}

const RETRY_ACTION_GUIDE =
  "Cevaplarınız bu tarayıcıda saklandı.";

const DEBUG_SPEAKING_API = import.meta.env.VITE_DEBUG_API === "true";

const debugSpeakingApi = (event: string, details?: Record<string, unknown>) => {
  if (DEBUG_SPEAKING_API) console.debug("[speaking-api]", event, details || {});
};

const appendRetryGuide = (message: string): string => {
  const base = String(message || "").trim();
  if (!base) return RETRY_ACTION_GUIDE;
  if (base.includes(RETRY_ACTION_GUIDE)) return base;
  return `${base}. ${RETRY_ACTION_GUIDE}`;
};

const shouldShowRetryGuide = (
  message: string,
  status?: number,
  code?: string
): boolean => {
  const normalized = String(message || "").toLowerCase();
  const isAuthRelated =
    status === 401 ||
    (/(token|session|oturum)/i.test(normalized) &&
      /(expired|not found|invalid|suresi|dol|bulunamad|gecersiz|giris)/i.test(normalized));

  if (isAuthRelated) return false;
  if (code === "ECONNABORTED" || status === 408) return true;
  if (typeof status === "number" && status >= 500) return true;

  return /(genel_degerlendirme|kelime|degerlendirme|openai|json|timeout|zaman asimi|yarim|eksik)/i.test(
    normalized
  );
};

const extractSubmissionId = (payload: any): string | undefined => {
  const candidates = [
    payload?.id,
    payload?.submissionId,
    payload?.resultId,
    payload?.data?.id,
    payload?.data?.submissionId,
    payload?.data?.resultId,
    payload?.data?.data?.id,
    payload?.data?.data?.submissionId,
    payload?.data?.data?.resultId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
};

const isAmbiguousSubmissionFailure = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  return error?.code === 'ECONNABORTED' || status === 408 || status >= 500;
};

const recoverRecentSpeakingSubmission = async (
  speakingTestId: string,
  submissionStartedAt: number,
  expectedOverallTestId?: string,
): Promise<RecoverableSpeakingSubmission | undefined> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await axiosPrivate.get(
        '/api/speaking-submission/findByUserId',
        {
          params: { page: 1, limit: 5 },
          timeout: 10_000,
        },
      );
      const recovered = selectRecentRecoverableSpeakingSubmission(
        response.data,
        speakingTestId,
        submissionStartedAt,
        expectedOverallTestId,
      );
      if (recovered) return recovered;
    } catch {
      // The original submit error remains authoritative if recovery is unavailable.
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  return undefined;
};

export const speakingSubmissionService = {
  /**
   * Submit the complete speaking test results
   * @param submissionData - The formatted submission data
   * @returns Promise with submission result
  */
  submitSpeakingTest: async (submissionData: SpeakingSubmissionData): Promise<SubmissionResponse> => {
    const submissionStartedAt = Date.now();
    let expectedOverallTestId: string | undefined;
    try {
      const { overallTestTokenStore, overallTestFlowStore } = await import('./overallTest.service');
      const isOverallFlowActive =
        overallTestFlowStore.hasActive() || !!overallTestFlowStore.getOverallId();
      expectedOverallTestId = overallTestFlowStore.getOverallId() || undefined;
      const embeddedToken =
        submissionData.sessionToken ||
        (isOverallFlowActive
          ? overallTestTokenStore.getByTestId(submissionData.speakingTestId)
          : null);
      if (!embeddedToken) {
        const message = "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlatın.";
        toast.error(message);
        return {
          success: false,
          error: "SESSION_TOKEN_REQUIRED",
        };
      }

      const payload = { ...submissionData, sessionToken: embeddedToken };

      const response = await axiosPrivate.post('/api/speaking-submission', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 180000, // AI degerlendirme icin genis timeout
      });

      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        notifyAccessAllowanceChanged();
      // toast.success('Konuşma testi başarıyla gönderildi!');
        const normalized = normalizeSpeakingSubmissionResponse(
          response.data,
          overallTestFlowStore.getOverallId(),
        );
        const submissionId = normalized?.submissionId || extractSubmissionId(response.data);
        const result = {
          success: true,
          submissionId,
          overallTestId: normalized?.overallTestId,
          evaluationStatus: normalized?.evaluationStatus,
        };
        try { if (embeddedToken) overallTestTokenStore.clearByTestId(submissionData.speakingTestId); } catch {}
        return result;
      } else {
        return {
          success: false,
          error: 'Test gönderilemedi'
        };
      }
    } catch (error: any) {
      notifyAccessAllowanceChanged();
      reportMockAccessFailure(error, { scope: 'MOCK_SPEAKING', targetId: submissionData.speakingTestId });
      debugSpeakingApi("submission-error", {
        status: error?.response?.status,
        code: error?.code,
      });
      
      let errorMessage = 'Test gönderilirken hata oluştu';
      const timerCode = error?.response?.data?.code;
      if (timerCode === "TEST_TIME_EXPIRED" || timerCode === "SECTION_NOT_STARTED" || timerCode === "SESSION_TOKEN_REQUIRED") {
        errorMessage = getOverallSectionTimerErrorMessage(error);
        toast.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
      if (isAmbiguousSubmissionFailure(error)) {
        const recoveredSubmission = await recoverRecentSpeakingSubmission(
          submissionData.speakingTestId,
          submissionStartedAt,
          expectedOverallTestId,
        );
        if (recoveredSubmission) {
          let fallbackOverallTestId: string | undefined;
          try {
            const { overallTestFlowStore, overallTestTokenStore } = await import('./overallTest.service');
            fallbackOverallTestId = overallTestFlowStore.getOverallId() || undefined;
            overallTestTokenStore.clearByTestId(submissionData.speakingTestId);
          } catch {}
          return {
            success: true,
            submissionId: recoveredSubmission.submissionId,
            overallTestId: recoveredSubmission.overallTestId || fallbackOverallTestId,
            evaluationStatus: recoveredSubmission.evaluationStatus,
          };
        }
      }
      // Prefer backend message (more actionable) over generic status buckets.
      if (error.response?.data?.message) {
        errorMessage = normalizeDisplayText(error.response.data.message);
      } else if (error.response?.data?.error) {
        errorMessage = normalizeDisplayText(error.response.data.error);
      } else if (error.response?.status === 400) {
        errorMessage = 'Konuşma cevabı kontrol edilemedi';
      } else if (error.response?.status === 401) {
        errorMessage = 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 413) {
        errorMessage = 'Konuşma kaydı çok uzun. Lütfen tekrar deneyin.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'İşlem uzun sürdü. Lütfen tekrar deneyin.';
      }

      errorMessage = normalizeDisplayText(errorMessage);

      if (shouldShowRetryGuide(errorMessage, error.response?.status, error.code)) {
        errorMessage = appendRetryGuide(errorMessage);
      }

      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
  * Get a speaking submission by id
  */
  getById: async (id: string): Promise<any | null> => {
  try {
    const res = await axiosPrivate.get(`/api/speaking-submission/${id}`)
     return res.data?.data || res.data || null
  } catch (error: any) {
    debugSpeakingApi("fetch-submission-error", {
      status: error?.response?.status,
      code: error?.code,
    })
     toast.error('Konuşma sonucu bulunamadı')
      return null
    }
  },

  retryFeedback: async (id: string): Promise<void> => {
    try {
      await axiosPrivate.post(
        `/api/speaking-submission/${id}/retry-feedback`,
        {},
        { timeout: 180000 },
      );
      toast.success('Konuşma değerlendirmeniz hazırlandı.');
    } catch (error: any) {
      const code = String(error?.response?.data?.code || '');
      const message =
        code === 'SPEAKING_FEEDBACK_ALREADY_READY'
          ? 'Bu konuşma değerlendirmesi zaten hazır.'
          : code === 'SPEAKING_FEEDBACK_RETRY_IN_PROGRESS'
            ? 'Değerlendirmeniz zaten hazırlanıyor.'
            : 'Değerlendirme tamamlanamadı. Lütfen tekrar deneyin.';
      toast.error(message);
      throw error;
    }
  },

  retryEvaluation: async (id: string): Promise<void> => {
    try {
      await axiosPrivate.post(
        `/api/speaking-submission/${id}/retry-evaluation`,
        {},
        { timeout: 180000 },
      );
      toast.success('Konuşma değerlendirmeniz yeniden başlatıldı.');
    } catch (error: any) {
      const code = String(error?.response?.data?.code || '');
      const message =
        code === 'SPEAKING_EVALUATION_RETRY_CONFLICT'
          ? 'Değerlendirmeniz zaten hazırlanıyor.'
          : code === 'SPEAKING_EVALUATION_RETRY_NOT_AVAILABLE'
            ? 'Bu konuşma yeniden değerlendirilemiyor.'
            : 'Değerlendirme yeniden başlatılamadı. Lütfen tekrar deneyin.';
      toast.error(message);
      throw error;
    }
  },
 
   /**
    * Format test data for submission according to API requirements
    * @param testData - The original test data
    * @param answers - The user's answers mapped by question ID
    * @returns Formatted submission data
    */
  formatSubmissionData: (
    testData: any, 
    answers: Record<string, string>
   ): SpeakingSubmissionData => {
    const parts: PartSubmission[] = [];

    (testData.sections || []).forEach((section: any) => {
      const part: PartSubmission = {
        description: typeof section.description === "string" ? section.description : String(section.description || ""),
        image: section.images?.[0] || undefined,
        duration: Number(section.duration ?? 0),
      };

      // Handle sections with subparts (like Part 1)
      if (section.subParts && section.subParts.length > 0) {
        part.subParts = section.subParts.map((subPart: any) => {
          const subPartSubmission: SubPartSubmission = {
            image: subPart.images?.[0] || undefined,
            duration: Number(subPart.duration ?? 0),
            questions: []
          };

          // Add questions from subpart
          const subQuestions = Array.isArray(subPart.questions) ? subPart.questions : [];
          subQuestions.forEach((question: any) => {
            const questionId = question.id || question.questionId;
            subPartSubmission.questions.push({
              questionId: questionId,
              userAnswer: answers[questionId] ?? ''
            });
          });

          return subPartSubmission;
        });
      } else {
        // Handle sections without subparts (like Part 2 and 3)
        part.questions = [];
        
        // Set type for Part 3 if needed
        if (section.type === 'PART3') {
          part.type = 'DISADVANTAGE';
        }

        // Add questions from section
        const secQuestions = Array.isArray(section.questions) ? section.questions : [];
        secQuestions.forEach((question: any) => {
          const questionId = question.id || question.questionId;
          part.questions!.push({
            questionId: questionId,
            userAnswer: answers[questionId] ?? ''
          });
        });
      }

      parts.push(part);
    });

    return {
      // submit-all flow stores `testId`, while direct flow has `id`
      speakingTestId: testData.id || testData.testId,
      parts: parts
    };
  },

  /**
   * Format assessment feedback for display
   * @param assessment - The assessment data
   * @returns Formatted feedback string
   */
  formatAssessmentFeedback: (assessment: any): string => {
    const formattedFeedback = `
GENEL SONUÇ:
 Genel CEFR Puanı: ${assessment.cefr_puan ?? 0}/75
 Belirlenen Seviye: ${assessment.seviye ?? 'Belirlenmedi'}

[BÖLÜM 1.1 ANALİZİ]
${assessment.bolumler?.bolum_1_1?.degerlendirme ?? 'Değerlendirme yapılamadı.'}

[BÖLÜM 1.2 ANALİZİ]
${assessment.bolumler?.bolum_1_2?.degerlendirme ?? 'Değerlendirme yapılamadı.'}

[BÖLÜM 2 ANALİZİ]
${assessment.bolumler?.bolum_2?.degerlendirme ?? 'Değerlendirme yapılamadı.'}

[BÖLÜM 3 ANALİZİ]
${assessment.bolumler?.bolum_3?.degerlendirme ?? 'Değerlendirme yapılamadı.'}

GENEL DEĞERLENDİRME:
${assessment.genel_degerlendirme ?? 'Genel Değerlendirme yapılamadı.'}
`.trim();

    return formattedFeedback;
  },

  /**
   * Validate submission data before sending
   * @param submissionData - The submission data to validate
   * @returns boolean indicating if the data is valid
   */
  validateSubmissionData: (submissionData: SpeakingSubmissionData): boolean => {
    if (!submissionData.speakingTestId) {
      toast.error('Test ID bulunamadı');
      return false;
    }

    if (!submissionData.parts || submissionData.parts.length === 0) {
      toast.error('Test cevapları bulunamadı');
      return false;
    }

    // Allow empty submissions: backend will score as 0 and still return a result page.
    return true;
  }
};

export default speakingSubmissionService;
