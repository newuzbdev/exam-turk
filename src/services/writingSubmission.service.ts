import axiosPrivate from "@/config/api";
import { toast } from "sonner";

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
}

export interface WritingSubmissionItem {
	id: string;
	writingTestId: string;
	userId?: string;
	sections: WritingSubmissionSection[];
	createdAt?: string;
	updatedAt?: string;
}

export const writingSubmissionService = {
	create: async (payload: WritingSubmissionPayload): Promise<WritingSubmissionItem | null> => {
		try {
			const res = await axiosPrivate.post("/api/writing-submission", payload, {
				headers: { "Content-Type": "application/json" }
			});
			toast.success("Yazma cevabı gönderildi");
			return res.data?.data || res.data || null;
		} catch (error: any) {
			console.error("Failed to submit writing answer", error);
			toast.error("Yazma cevabı gönderilemedi");
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

