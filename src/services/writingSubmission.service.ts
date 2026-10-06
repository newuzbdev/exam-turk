import { reportMockAccessFailure } from '@/utils/mock-access-recovery';
import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { getOverallSectionTimerErrorMessage } from "./overallTest.service";
import type { MockSubmitMode } from "./overallTest.service";

const RETRY_ACTION_GUIDE =
	"Cevaplarınız bu tarayıcıda saklandı.";

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

export interface WritingSubmissionAnswer {
	questionId: string;
	userAnswer: string;
}

export interface WritingSubmissionSubPart {
	description?: string;
	answers: WritingSubmissionAnswer[];
}

export interface WritingSubmissionSection {
	description?: string;
	answers?: WritingSubmissionAnswer[];
	subParts?: WritingSubmissionSubPart[];
}

export interface WritingSubmissionPayload {
	writingTestId: string;
	sections: WritingSubmissionSection[];
  sessionToken?: string;
  submitMode?: MockSubmitMode;
}

export interface WritingSubmissionItem {
	id: string;
	writingTestId: string;
	userId?: string;
	sections: WritingSubmissionSection[];
	answers?: Array<{
		questionId?: string | null;
		questionText?: string;
		userAnswer?: string;
		answer?: string;
		taskKey?: string | null;
		taskCode?: string | null;
		subPart?: {
			label?: string | null;
			taskCode?: string | null;
			wordMin?: number | null;
			wordMax?: number | null;
			maxRawScore?: number | null;
		} | null;
	}>;
	writingTest?: {
		id?: string;
		title?: string;
		formatVersion?: number;
		status?: string;
	};
	score?: number | null;
	aiFeedback?: unknown;
	evaluationStatus?: "PENDING" | "COMPLETED" | "FAILED" | string;
	evaluationErrorCode?: string | null;
	evaluationAttempts?: number;
	evaluatedAt?: string | null;
	submittedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface WritingDraftPayload {
	sessionToken: string;
	answers: Record<string, string>;
	wordCounts?: Record<string, number>;
}

export interface WritingDraftResponse {
	answers: Record<string, string>;
	wordCounts?: Record<string, number>;
	lastSavedAt?: string | null;
	serverNow?: string;
	remainingSeconds?: number;
	saved?: boolean;
}

export interface WritingSessionResult {
	submissionId: string | null;
	overallTestId: string;
	overallCompleted: boolean;
	sectionStatus: string;
}

const normalizeWritingAnswer = (answer: unknown): WritingSubmissionAnswer | null => {
	const questionId = String((answer as any)?.questionId ?? "").trim();
	if (!questionId) return null;
	return {
		questionId,
		userAnswer: String((answer as any)?.userAnswer ?? ""),
	};
};

const sanitizeWritingPayload = (
	payload: WritingSubmissionPayload
): WritingSubmissionPayload => {
	const sections = Array.isArray(payload?.sections) ? payload.sections : [];
	const normalizedSections: WritingSubmissionSection[] = sections.map((section) => {
		const directAnswers = (Array.isArray(section?.answers) ? section.answers : [])
			.map(normalizeWritingAnswer)
			.filter((answer): answer is WritingSubmissionAnswer => !!answer);

		const subParts = (Array.isArray(section?.subParts) ? section.subParts : []).map(
			(subPart) => {
				const subPartAnswers = (Array.isArray(subPart?.answers) ? subPart.answers : [])
					.map(normalizeWritingAnswer)
					.filter((answer): answer is WritingSubmissionAnswer => !!answer);

				return {
					description:
						typeof subPart?.description === "string"
							? subPart.description
							: undefined,
					answers: subPartAnswers,
				};
			}
		);

		return {
			description:
				typeof section?.description === "string" ? section.description : undefined,
			answers: directAnswers,
			subParts,
		};
	});

	return {
		...payload,
		writingTestId: String(payload?.writingTestId ?? "").trim(),
		sections: normalizedSections,
	};
};

export const writingSubmissionService = {
	saveDraft: async (payload: WritingDraftPayload): Promise<WritingDraftResponse | null> => {
		try {
			const res = await axiosPrivate.patch("/api/writing-submission/draft", {
				sessionToken: payload.sessionToken,
				answers: payload.answers || {},
				wordCounts: payload.wordCounts || {},
			});
			return res.data?.data || res.data || null;
		} catch (error: any) {
			const status = error?.response?.status;
			const code = error?.response?.data?.code || error?.response?.data?.message;
			if (code === "TEST_TIME_EXPIRED" || code === "SECTION_ALREADY_SUBMITTED") return null;
			if (status !== 401) {
				console.warn("Writing draft save failed");
			}
			return null;
		}
	},

	getDraft: async (sessionToken: string): Promise<WritingDraftResponse | null> => {
		try {
			const res = await axiosPrivate.get("/api/writing-submission/draft", {
				params: { sessionToken },
			});
			return res.data?.data || res.data || null;
		} catch (error: any) {
			const status = error?.response?.status;
			if (status !== 404 && status !== 401) {
				console.warn("Writing draft fetch failed");
			}
			return null;
		}
	},

	getSessionResult: async (
		sessionToken?: string | null,
		overallTestId?: string | null
	): Promise<WritingSessionResult | null> => {
		const params: Record<string, string> = {};
		if (sessionToken) params.sessionToken = sessionToken;
		if (overallTestId) params.overallTestId = overallTestId;
		const res = await axiosPrivate.get(
			"/api/writing-submission/session-result",
			{ params }
		);
		return res.data?.data || res.data || null;
	},

	create: async (payload: WritingSubmissionPayload): Promise<WritingSubmissionItem | null> => {
		try {
      const normalizedPayload = sanitizeWritingPayload(payload);
      const { overallTestTokenStore } = await import("./overallTest.service");
      const embeddedToken =
        normalizedPayload.sessionToken ||
        overallTestTokenStore.getByTestId(normalizedPayload.writingTestId);
      if (!embeddedToken) {
        const message = "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.";
        toast.error(message);
        throw new Error("SESSION_TOKEN_REQUIRED");
      }

      const body = { ...normalizedPayload, sessionToken: embeddedToken };
      const res = await axiosPrivate.post("/api/writing-submission", body, {
				headers: { "Content-Type": "application/json" }
			});
			notifyAccessAllowanceChanged();
      // toast.success("Yazma cevabı gönderildi");
      try {
        if (embeddedToken) {
          overallTestTokenStore.clearByTestId(normalizedPayload.writingTestId);
        }
      } catch {}
			return res.data?.data || res.data || null;
		} catch (error: any) {
			notifyAccessAllowanceChanged();
      reportMockAccessFailure(error, { scope: 'MOCK_WRITING', targetId: payload.writingTestId });
      console.error("Failed to submit writing answer", error);
			const timerCode = error?.response?.data?.code;
			if (
				timerCode === "TEST_TIME_EXPIRED" ||
				timerCode === "SECTION_NOT_STARTED" ||
				timerCode === "SECTION_ALREADY_SUBMITTED" ||
				timerCode === "SESSION_TOKEN_REQUIRED"
			) {
				if (timerCode === "SECTION_ALREADY_SUBMITTED") return null;
				const message = getOverallSectionTimerErrorMessage(error);
				toast.error(message);
				return null;
			}
			if (error?.message === "SESSION_TOKEN_REQUIRED") {
				return null;
			}

			let errorMessage = "Yazma cevabı gönderilemedi";

			if (!error?.response && (error?.code === "ERR_NETWORK" || error?.message === "Network Error")) {
				errorMessage = "Bağlantı kesildi. Lütfen biraz sonra tekrar deneyin.";
			}

			else if (error?.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error?.response?.data?.error) {
				errorMessage = error.response.data.error;
			} else if (error?.response?.status === 400) {
				errorMessage = "Yazma cevabı kontrol edilemedi";
			} else if (error?.response?.status === 401) {
				errorMessage = "Oturum yenilenemedi. Lütfen tekrar giriş yapın.";
			} else if (error?.response?.status === 413) {
				errorMessage = "Yazınız çok uzun. Lütfen biraz kısaltıp tekrar deneyin.";
			} else if (error?.code === "ECONNABORTED") {
				errorMessage = "İşlem uzun sürdü. Lütfen tekrar deneyin.";
			}

			if (shouldShowRetryGuide(errorMessage, error?.response?.status, error?.code)) {
				errorMessage = appendRetryGuide(errorMessage);
			}

			toast.error(errorMessage);
			return null;
		}
	},

	formatSingleAnswerPayload: (
		writingTestId: string,
		questionId: string,
		userAnswer: string,
		sectionDescription?: string
	): WritingSubmissionPayload => {
		return {
			writingTestId,
			sections: [
				{
					description: sectionDescription,
					answers: [
						{
							questionId,
							userAnswer,
						},
					],
				},
			],
		};
	},

	getAll: async (): Promise<WritingSubmissionItem[]> => {
		try {
			const res = await axiosPrivate.get("/api/writing-submission");
			return res.data?.data || res.data || [];
		} catch (error: any) {
			console.error("Failed to fetch writing submissions", error);
			toast.error("Yazma gönderileri yüklenemedi");
			return [];
		}
	},

	getMine: async (): Promise<WritingSubmissionItem[]> => {
		try {
			const res = await axiosPrivate.get("/api/writing-submission/user");
			return res.data?.data || res.data || [];
		} catch (error: any) {
			console.error("Failed to fetch my writing submissions", error);
			toast.error("Yazma gönderileriniz yüklenemedi");
			return [];
		}
	},

	getById: async (id: string): Promise<WritingSubmissionItem | null> => {
		try {
			const res = await axiosPrivate.get(`/api/writing-submission/${id}`);
			return res.data?.data || res.data || null;
		} catch (error: any) {
			console.error("Failed to fetch writing submission", error);
			toast.error("Yazma gönderisi bulunamadı");
			return null;
		}
	},

	retryFeedback: async (id: string): Promise<WritingSubmissionItem | null> => {
		try {
			const res = await axiosPrivate.post(
				`/api/writing-submission/${id}/retry-feedback`
			);
			toast.success("Yazma değerlendirmeniz yeniden başlatıldı.");
			return res.data?.data || res.data || null;
		} catch (error: any) {
			const message =
				error?.response?.data?.message ||
				error?.response?.data?.error ||
				"Yazma değerlendirmesi yeniden başlatılamadı.";
			toast.error(message);
			return null;
		}
	},
};

export default writingSubmissionService;
