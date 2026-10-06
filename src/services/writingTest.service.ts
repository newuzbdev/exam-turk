import axiosPrivate from "@/config/api";
import { toast } from "sonner";

export interface WritingTestItem {
	id: string;
	title: string;
	instruction?: string;
	ieltsId?: string;
	type?: string;
	createdAt?: string;
	updatedAt?: string;
}

export type WritingTaskCode = "TASK_1_1" | "TASK_1_2" | "TASK_2";
export type WritingPartCode = "PART_1" | "PART_2";

export interface WritingRichTextNode {
	type?: string;
	text?: string;
	attrs?: Record<string, unknown>;
	marks?: Array<{
		type?: string;
		attrs?: Record<string, unknown>;
	}>;
	content?: WritingRichTextNode[];
}

export interface WritingTestV2Question {
	id: string;
	text: string;
}

export interface WritingTestV2Task {
	id: string;
	taskCode: WritingTaskCode;
	order: number;
	label: string;
	promptJson: WritingRichTextNode;
	register: string;
	genre: string;
	targetLevel: string;
	wordMin: number;
	wordMax: number;
	maxRawScore: number;
	questions: WritingTestV2Question[];
}

export interface WritingTestV2Section {
	id: string;
	partCode: WritingPartCode;
	order: number;
	title: string;
	description?: string | null;
	subParts: WritingTestV2Task[];
}

export interface WritingTestV2 {
	id: string;
	title: string;
	instruction?: string | null;
	formatVersion: 2;
	status: "PUBLISHED" | "ARCHIVED";
	durationMinutes: number;
	sourceEmail: WritingRichTextNode;
	sections: WritingTestV2Section[];
}

export const writingTestService = {
	getAll: async (): Promise<WritingTestItem[]> => {
		try {
			const res = await axiosPrivate.get("/api/writing-test");
			return res.data?.data || res.data || [];
		} catch (error: unknown) {
			console.error("Failed to fetch writing tests", error);
			toast.error("Yazma testleri yüklenemedi");
			return [];
		}
	},

	getById: async (id: string): Promise<WritingTestItem | null> => {
		try {
			const res = await axiosPrivate.get(`/api/writing-test/${id}`);
			return res.data?.data || res.data || null;
		} catch (error: unknown) {
			console.error("Failed to fetch writing test", error);
			toast.error("Yazma testi bulunamadı");
			return null;
		}
	},

	getPublishedV2: async (id: string, sessionToken?: string | null): Promise<WritingTestV2 | null> => {
		try {
			const res = await axiosPrivate.get(`/api/writing-test/v2/${id}/student`,
				sessionToken ? { headers: { "X-Test-Session": sessionToken } } : undefined,
			);
			return res.data?.data || res.data || null;
		} catch (error: unknown) {
			console.error("Failed to fetch published Writing V2 test", error);
			toast.error("Yayınlanmış yazma testi bulunamadı");
			return null;
		}
	},

	create: async (payload: Partial<WritingTestItem>) => {
		try {
			const res = await axiosPrivate.post("/api/writing-test", payload);
			toast.success("Yazma testi oluşturuldu");
			return res.data;
		} catch (error: unknown) {
			console.error("Failed to create writing test", error);
			toast.error("Yazma testi oluşturulamadı");
			throw error;
		}
	},

	update: async (id: string, payload: Partial<WritingTestItem>) => {
		try {
			const res = await axiosPrivate.patch(`/api/writing-test/${id}`, payload);
			toast.success("Yazma testi güncellendi");
			return res.data;
		} catch (error: unknown) {
			console.error("Failed to update writing test", error);
			toast.error("Yazma testi güncellenemedi");
			throw error;
		}
	},

	remove: async (id: string) => {
		try {
			const res = await axiosPrivate.delete(`/api/writing-test/${id}`);
			toast.success("Yazma testi silindi");
			return res.data;
		} catch (error: unknown) {
			console.error("Failed to remove writing test", error);
			toast.error("Yazma testi silinemedi");
			throw error;
		}
	},
};

export default writingTestService;
