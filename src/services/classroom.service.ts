import axiosPrivate from "@/config/api";
import { toast } from "@/utils/toast";

export type AccountType = "STUDENT" | "TEACHER" | "INSTITUTION";

export interface TeacherProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
}

export interface Institution {
  id: string;
  name: string;
  ownerId: string;
}

export interface Classroom {
  id: string;
  name: string;
  description?: string | null;
  level?: string | null;
  teacherId: string;
  institutionId?: string | null;
  members?: Array<{ id: string; userId: string; role: string }>;
  invites?: Array<{ id: string; code: string; expiresAt?: string | null; isActive: boolean }>;
}

export interface AssignmentItem {
  id: string;
  assignmentId?: string;
  status?: string;
  windowStatus?: "UPCOMING" | "ACTIVE" | "EXPIRED";
  assignment?: {
    id: string;
    title: string;
    notes?: string | null;
    startAt: string;
    endAt: string;
    classroom?: { id: string; name: string };
  };
}

export interface CreateAssignmentPayload {
  title: string;
  notes?: string;
  startAt: string;
  endAt: string;
  listeningTestId?: string;
  readingTestId?: string;
  writingTestId?: string;
  speakingTestId?: string;
}

interface ApiShape {
  data?: unknown;
  status?: number;
  config?: {
    url?: string;
  };
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

const getNestedData = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as ApiShape;
  if (obj.data && typeof obj.data === "object" && obj.data !== null) {
    const nested = (obj.data as ApiShape).data;
    if (nested !== undefined) return nested;
  }
  return obj.data;
};

const unwrapPayload = <T>(payload: unknown, fallback: T): T => {
  const data = getNestedData(payload);
  return (data ?? fallback) as T;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const err = error as ApiShape;
  const status = err.response?.status || err.status;
  const url = err.config?.url || "";
  if (status === 404 && (url.includes("/api/teacher") || url.includes("/api/classrooms") || url.includes("/api/assignments"))) {
    return "Bu endpoint bulunamadi. Dogru backend (classroom modullu API) calismiyor olabilir.";
  }
  const message = err.response?.data?.message || err.response?.data?.error || err.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const classroomService = {
  async getTeacherProfile(): Promise<TeacherProfile | null> {
    try {
      const res = await axiosPrivate.get("/api/teacher/profile");
      return unwrapPayload<TeacherProfile | null>(res, null);
    } catch {
      return null;
    }
  },

  async upsertTeacherProfile(payload: { displayName: string; bio?: string }) {
    try {
      const res = await axiosPrivate.post("/api/teacher/profile", payload);
      toast.success("Öğretmen profili kaydedildi");
      return unwrapPayload<TeacherProfile | null>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Öğretmen profili kaydedilemedi"));
      return null;
    }
  },

  async listInstitutions(): Promise<Institution[]> {
    try {
      const res = await axiosPrivate.get("/api/teacher/institutions");
      return asArray<Institution>(unwrapPayload<unknown>(res, []));
    } catch {
      return [];
    }
  },

  async createInstitution(payload: { name: string }): Promise<Institution | null> {
    try {
      const res = await axiosPrivate.post("/api/teacher/institutions", payload);
      toast.success("Kurum oluşturuldu");
      return unwrapPayload<Institution | null>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Kurum oluşturulamadı"));
      return null;
    }
  },

  async listClassrooms(): Promise<Classroom[]> {
    try {
      const res = await axiosPrivate.get("/api/classrooms");
      return asArray<Classroom>(unwrapPayload<unknown>(res, []));
    } catch {
      return [];
    }
  },

  async createClassroom(payload: {
    name: string;
    description?: string;
    level?: string;
    institutionId?: string;
  }): Promise<Classroom | null> {
    try {
      const res = await axiosPrivate.post("/api/classrooms", payload);
      toast.success("Sınıf oluşturuldu");
      return unwrapPayload<Classroom | null>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Sınıf oluşturulamadı"));
      return null;
    }
  },

  async createInvite(classroomId: string, expiresInDays?: number) {
    try {
      const res = await axiosPrivate.post(`/api/classrooms/${classroomId}/invites`, {
        expiresInDays: expiresInDays && expiresInDays > 0 ? expiresInDays : undefined,
      });
      toast.success("Davet kodu oluşturuldu");
      return unwrapPayload<{ code?: string } | null>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Davet kodu oluşturulamadı"));
      return null;
    }
  },

  async listClassInvites(classroomId: string) {
    try {
      const res = await axiosPrivate.get(`/api/classrooms/${classroomId}/invites`);
      return asArray<{ id: string; code: string; expiresAt?: string | null; isActive: boolean }>(
        unwrapPayload<unknown>(res, []),
      );
    } catch {
      return [];
    }
  },

  async joinByCode(code: string) {
    try {
      const res = await axiosPrivate.post("/api/classrooms/join", { code: code.trim().toUpperCase() });
      toast.success("Sınıfa katıldınız");
      return unwrapPayload<unknown>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Sınıfa katılım başarısız"));
      return null;
    }
  },

  async createAssignment(classroomId: string, payload: CreateAssignmentPayload) {
    try {
      const res = await axiosPrivate.post(`/api/classrooms/${classroomId}/assignments`, payload);
      toast.success("Atama oluşturuldu");
      return unwrapPayload<unknown>(res, null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Atama oluşturulamadı"));
      return null;
    }
  },

  async listClassroomAssignments(classroomId: string) {
    try {
      const res = await axiosPrivate.get(`/api/classrooms/${classroomId}/assignments`);
      return asArray<unknown>(unwrapPayload<unknown>(res, []));
    } catch {
      return [];
    }
  },

  async listMyAssignments(): Promise<AssignmentItem[]> {
    try {
      const res = await axiosPrivate.get("/api/assignments/my");
      return asArray<AssignmentItem>(unwrapPayload<unknown>(res, []));
    } catch {
      return [];
    }
  },
};

export default classroomService;
