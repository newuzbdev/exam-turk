import axiosPrivate from '@/config/api';
import { toast } from 'sonner';
import { normalizeDisplayText } from '@/utils/text';

export interface QuestionAnswer {
  questionId: string;
  userAnswer: string;
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
}

export interface SubmissionResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
}

const RETRY_ACTION_GUIDE =
  "Cevaplariniz bu tarayicida guvenle saklandi.";

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

export const speakingSubmissionService = {
  /**
   * Submit the complete speaking test results
   * @param submissionData - The formatted submission data
   * @returns Promise with submission result
   */
  submitSpeakingTest: async (submissionData: SpeakingSubmissionData): Promise<SubmissionResponse> => {
    try {
      const { overallTestTokenStore, overallTestFlowStore } = await import('./overallTest.service');
      const isOverallFlowActive =
        overallTestFlowStore.hasActive() || !!overallTestFlowStore.getOverallId();
      const embeddedToken =
        submissionData.sessionToken ||
        (isOverallFlowActive
          ? overallTestTokenStore.getByTestId(submissionData.speakingTestId)
          : null);
      const payload = embeddedToken ? { ...submissionData, sessionToken: embeddedToken } : submissionData;

      const response = await axiosPrivate.post('/api/speaking-submission', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 180000, // AI degerlendirme icin genis timeout
      });

      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        // toast.success('KonuÅŸma testi baÅŸarÄ±yla gÃ¶nderildi!');
        const submissionId = extractSubmissionId(response.data);
        const result = {
          success: true,
          submissionId
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
      console.error('Speaking test submission error:', error);
      
      let errorMessage = 'Test gönderilirken hata oluþtu';
      // Prefer backend message (more actionable) over generic status buckets.
      if (error.response?.data?.message) {
        errorMessage = normalizeDisplayText(error.response.data.message);
      } else if (error.response?.data?.error) {
        errorMessage = normalizeDisplayText(error.response.data.error);
      } else if (error.response?.status === 400) {
        errorMessage = 'Geçersiz test verisi';
      } else if (error.response?.status === 401) {
        errorMessage = 'Oturum tarafinda gecici bir hata olustu';
      } else if (error.response?.status === 413) {
        errorMessage = 'Test verisi çok büyük';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Ýþlem zaman aþýmýna uðradý';
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
    console.error('Failed to fetch speaking submission', error)
     toast.error('Konuþma sonucu bulunamadý')
      return null
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
 Genel CEFR Puaný: ${assessment.cefr_puan ?? 0}/75
 Belirlenen Seviye: ${assessment.seviye ?? 'Belirlenmedi'}

[BÖLÜM 1.1 ANALÝZÝ]
${assessment.bolumler?.bolum_1_1?.degerlendirme ?? 'Deðerlendirme yapýlamadý.'}

[BÖLÜM 1.2 ANALÝZÝ]
${assessment.bolumler?.bolum_1_2?.degerlendirme ?? 'Deðerlendirme yapýlamadý.'}

[BÖLÜM 2 ANALÝZÝ]
${assessment.bolumler?.bolum_2?.degerlendirme ?? 'Deðerlendirme yapýlamadý.'}

[BÖLÜM 3 ANALÝZÝ]
${assessment.bolumler?.bolum_3?.degerlendirme ?? 'Deðerlendirme yapýlamadý.'}

GENEL DEÐERLENDÝRME:
${assessment.genel_degerlendirme ?? 'Genel Deðerlendirme yapýlamadý.'}
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
      toast.error('Test ID bulunamadý');
      return false;
    }

    if (!submissionData.parts || submissionData.parts.length === 0) {
      toast.error('Test cevaplarý bulunamadý');
      return false;
    }

    // Allow empty submissions: backend will score as 0 and still return a result page.
    return true;
  }
};

export default speakingSubmissionService;
