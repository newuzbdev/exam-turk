import axiosPrivate from "@/config/api";
import { toast } from "sonner";

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
}

export interface WritingSubmissionItem {
	id: string;
	writingTestId: string;
	userId?: string;
	sections: WritingSubmissionSection[];
	createdAt?: string;
	updatedAt?: string;
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
	create: async (payload: WritingSubmissionPayload): Promise<WritingSubmissionItem | null> => {
		try {
      const normalizedPayload = sanitizeWritingPayload(payload);
      const { overallTestTokenStore } = await import("./overallTest.service");
      const embeddedToken =
        normalizedPayload.sessionToken ||
        overallTestTokenStore.getByTestId(normalizedPayload.writingTestId);
      const body = embeddedToken
        ? { ...normalizedPayload, sessionToken: embeddedToken }
        : normalizedPayload;
      const res = await axiosPrivate.post("/api/writing-submission", body, {
				headers: { "Content-Type": "application/json" }
			});
			// toast.success("Yazma cevabı gönderildi");
      try {
        if (embeddedToken) {
          overallTestTokenStore.clearByTestId(normalizedPayload.writingTestId);
        }
      } catch {}
			return res.data?.data || res.data || null;
		} catch (error: any) {
			console.error("Failed to submit writing answer", error);
			let errorMessage = "Yazma cevabi gonderilemedi";

			if (!error?.response && (error?.code === "ERR_NETWORK" || error?.message === "Network Error")) {
				errorMessage = "Backend baglantisi kesildi (localhost:3000). Backend servisini yeniden baslatin.";
			}

			else if (error?.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error?.response?.data?.error) {
				errorMessage = error.response.data.error;
			} else if (error?.response?.status === 400) {
				errorMessage = "Gecersiz yazma verisi";
			} else if (error?.response?.status === 401) {
				errorMessage = "Oturum tarafinda gecici bir hata olustu";
			} else if (error?.response?.status === 413) {
				errorMessage = "Yazma verisi cok buyuk";
			} else if (error?.code === "ECONNABORTED") {
				errorMessage = "Islem zaman asimina ugradi";
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
};

export default writingSubmissionService;
