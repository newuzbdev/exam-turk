import type {
  LearnContinueLearning,
  LearnRecommendation,
} from "@/pages/lessons/learn-types";
import type { StudentOnboarding } from "./onboarding-api";
import { examTargetLabels, goalLabels } from "./student-onboarding";

const DAY_IN_MS = 86_400_000;

export const getDaysUntilExam = (
  value: string | null,
  now = new Date(),
) => {
  if (!value) return null;

  const examDate = new Date(value);
  if (Number.isNaN(examDate.getTime())) return null;

  const todayUtc = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const examUtc = Date.UTC(
    examDate.getFullYear(),
    examDate.getMonth(),
    examDate.getDate(),
  );

  return Math.max(0, Math.ceil((examUtc - todayUtc) / DAY_IN_MS));
};

const getStudyTarget = (minutes: StudentOnboarding["dailyStudyMinutes"]) => {
  if (minutes === 10) return "Bugün tek bir kısa ders veya alıştırma tamamla.";
  if (minutes === 20) return "Bugün bir ders ve kısa bir tekrar yap.";
  if (minutes === 30) return "Bugün bir ders ve bir pratik çalışması tamamla.";
  return "Bugün ders, pratik ve kısa bir tekrar için odaklı bir saat ayır.";
};

const getRecommendedStep = (
  onboarding: StudentOnboarding,
  continueLearning: LearnContinueLearning | null | undefined,
  recommendation?: LearnRecommendation | null,
) => {
  if (continueLearning?.lesson?.title) {
    return `Bugün “${continueLearning.lesson.title}” dersine devam et.`;
  }

  if (recommendation?.target?.title) {
    return `Bugün “${recommendation.target.title}” çalışmasına odaklan.`;
  }

  if (onboarding.currentLevel === "NONE") {
    return "Sıfırdan Başla dersleriyle devam et.";
  }

  if (
    onboarding.examTarget === "TYS" ||
    onboarding.examTarget === "CEFR"
  ) {
    return "Ders, pratik ve mock test hazırlığına odaklan.";
  }

  if (onboarding.goal === "IMPROVE_SPEAKING") {
    return "Konuşma pratiğiyle başlayıp kısa bir ders tekrarı yap.";
  }

  if (onboarding.goal === "IMPROVE_WRITING") {
    return "Yazma pratiğiyle başlayıp öğrendiğin yapıları tekrar et.";
  }

  return "Seviyene uygun sıradaki dersi açarak çalışmaya başla.";
};

export interface PersonalStudyPlan {
  dailyTarget: string;
  daysUntilExam: number | null;
  goalLabel: string;
  examTargetLabel: string;
  recommendedStep: string;
  continueHref: string | null;
}

export const createPersonalStudyPlan = (
  onboarding: StudentOnboarding | null | undefined,
  continueLearning: LearnContinueLearning | null | undefined,
  recommendation: LearnRecommendation | null | undefined,
  now = new Date(),
): PersonalStudyPlan | null => {
  if (!onboarding?.onboardingCompleted) return null;

  const continueHref =
    continueLearning?.course?.slug && continueLearning?.lesson?.slug
      ? `/app/dersler/${continueLearning.course.slug}/${continueLearning.lesson.slug}`
      : recommendation?.target?.href ?? null;

  return {
    dailyTarget: getStudyTarget(onboarding.dailyStudyMinutes),
    daysUntilExam: getDaysUntilExam(onboarding.examDate, now),
    goalLabel: goalLabels[onboarding.goal] ?? "Genel Türkçe geliştirmek",
    examTargetLabel: examTargetLabels[onboarding.examTarget] ?? "Henüz belli değil",
    recommendedStep: getRecommendedStep(
      onboarding,
      continueLearning,
      recommendation,
    ),
    continueHref,
  };
};
