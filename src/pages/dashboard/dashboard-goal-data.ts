import type { ExamSession } from "@/data/exam-information";
import type { StudentGoal } from "./onboarding-api";
import { dashboardDate } from "./dashboard-home-data";

export const sessionLabel = (session: ExamSession) =>
  `${dashboardDate(session.examStart)} – ${dashboardDate(session.examEnd)} ${session.examStart.slice(0, 4)}`;
export const goalLabels: Record<StudentGoal, string> = {
  EXAM_PREPARATION: "Sınava hazırlanıyorum",
  GENERAL_TURKISH: "Türkçemi geliştiriyorum",
  IMPROVE_SPEAKING: "Konuşmamı geliştirmek istiyorum",
  IMPROVE_WRITING: "Yazmamı geliştirmek istiyorum",
  START_TURKISH: "Türkçeye yeni başlıyorum",
};
