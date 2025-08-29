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

export const writingTestService = {
	getAll: async (): Promise<WritingTestItem[]> => {
		try {
			const res = await axiosPrivate.get("/api/writing-test");
			return res.data?.data || res.data || [];
		} catch (error: any) {
			console.error("Failed to fetch writing tests", error);
			toast.error("Yazma testleri yüklenemedi");
			return [];
		}
	},

	getById: async (id: string): Promise<WritingTestItem | null> => {
		try {
			const res = await axiosPrivate.get(`/api/writing-test/${id}`);
			return res.data?.data || res.data || null;
		} catch (error: any) {
			console.error("Failed to fetch writing test", error);
			toast.error("Yazma testi bulunamadı");
			return null;
		}
	},

	create: async (payload: Partial<WritingTestItem>) => {
		try {
			const res = await axiosPrivate.post("/api/writing-test", payload);
			toast.success("Yazma testi oluşturuldu");
			return res.data;
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
			console.error("Failed to remove writing test", error);
			toast.error("Yazma testi silinemedi");
			throw error;
		}
	},
};

export default writingTestService;

