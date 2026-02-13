import axiosPrivate from '@/config/api';
import { toast } from 'sonner';

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

export const speakingSubmissionService = {
  /**
   * Submit the complete speaking test results
   * @param submissionData - The formatted submission data
   * @returns Promise with submission result
   */
  submitSpeakingTest: async (submissionData: SpeakingSubmissionData): Promise<SubmissionResponse> => {
    try {
      const { overallTestTokenStore } = await import('./overallTest.service');
      const embeddedToken = submissionData.sessionToken || overallTestTokenStore.getByTestId(submissionData.speakingTestId);
      const payload = embeddedToken ? { ...submissionData, sessionToken: embeddedToken } : submissionData;

      const response = await axiosPrivate.post('/api/speaking-submission', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        // toast.success('KonuÅŸma testi baÅŸarÄ±yla gÃ¶nderildi!');
        const result = {
          success: true,
          submissionId: response.data.id || response.data.submissionId
        };
        try { if (embeddedToken) overallTestTokenStore.clearByTestId(submissionData.speakingTestId); } catch {}
        return result;
      } else {
        return {
          success: false,
          error: 'Test gÃ¶nderilemedi'
        };
      }
    } catch (error: any) {
      console.error('Speaking test submission error:', error);
      
      let errorMessage = 'Test gÃ¶nderilirken hata oluÅŸtu';
      // Prefer backend message (more actionable) over generic status buckets.
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'Geçersiz test verisi';
      } else if (error.response?.status === 401) {
        errorMessage = 'Oturum süresi dolmuş, lütfen tekrar giriş yapın';
      } else if (error.response?.status === 413) {
        errorMessage = 'Test verisi çok büyük';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'İşlem zaman aşımına uğradı';
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
     toast.error('KonuÅŸma sonucu bulunamadÄ±')
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
        description: section.description,
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
GENEL SONUÃ‡:
 Genel CEFR PuanÄ±: ${assessment.cefr_puan ?? 0}/75
 Belirlenen Seviye: ${assessment.seviye ?? 'Belirlenmedi'}

[BÃ–LÃœM 1.1 ANALÄ°ZÄ°]
${assessment.bolumler?.bolum_1_1?.degerlendirme ?? 'DeÄŸerlendirme yapÄ±lamadÄ±.'}

[BÃ–LÃœM 1.2 ANALÄ°ZÄ°]
${assessment.bolumler?.bolum_1_2?.degerlendirme ?? 'DeÄŸerlendirme yapÄ±lamadÄ±.'}

[BÃ–LÃœM 2 ANALÄ°ZÄ°]
${assessment.bolumler?.bolum_2?.degerlendirme ?? 'DeÄŸerlendirme yapÄ±lamadÄ±.'}

[BÃ–LÃœM 3 ANALÄ°ZÄ°]
${assessment.bolumler?.bolum_3?.degerlendirme ?? 'DeÄŸerlendirme yapÄ±lamadÄ±.'}

GENEL DEÄERLENDÄ°RME:
${assessment.genel_degerlendirme ?? 'Genel deÄŸerlendirme yapÄ±lamadÄ±.'}
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
      toast.error('Test ID bulunamadÄ±');
      return false;
    }

    if (!submissionData.parts || submissionData.parts.length === 0) {
      toast.error('Test cevaplarÄ± bulunamadÄ±');
      return false;
    }

    // Allow empty submissions: backend will score as 0 and still return a result page.
    return true;
  }
};

export default speakingSubmissionService;
