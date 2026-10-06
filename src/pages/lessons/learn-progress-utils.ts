import type {
  LearnCourseDetail,
  LearnCourseSummary,
  LearnProgress,
  LearnProgressStatus,
} from "./learn-types";

export const createProgressByLessonId = (progress: LearnProgress[]) =>
  new Map(progress.map((item) => [item.lessonId, item]));

export const getCourseProgressStatus = (
  course: Pick<LearnCourseSummary, "id" | "lessonCount">,
  progress: LearnProgress[],
): LearnProgressStatus => {
  const courseProgress = progress.filter((item) => item.course?.id === course.id);

  if (
    course.lessonCount > 0 &&
    courseProgress.filter((item) => item.status === "COMPLETED").length >=
      course.lessonCount
  ) {
    return "COMPLETED";
  }

  return courseProgress.length > 0 ? "IN_PROGRESS" : "NOT_STARTED";
};

export const getCourseDetailProgressStatus = (
  course: LearnCourseDetail,
  progressByLessonId: Map<string, LearnProgress>,
): LearnProgressStatus => {
  const lessonIds = course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((lesson) => lesson.id),
  );
  const tracked = lessonIds
    .map((lessonId) => progressByLessonId.get(lessonId))
    .filter((item): item is LearnProgress => Boolean(item));

  if (
    lessonIds.length > 0 &&
    tracked.filter((item) => item.status === "COMPLETED").length ===
      lessonIds.length
  ) {
    return "COMPLETED";
  }

  return tracked.length > 0 ? "IN_PROGRESS" : "NOT_STARTED";
};

export const canCompleteLearnLesson = (
  requiredExerciseCount: number,
  progress?: LearnProgress,
) =>
  progress?.status === "COMPLETED" ||
  requiredExerciseCount === 0 ||
  (progress?.progressPercent ?? 0) >= 90;

export const getLearnProgressLabel = (status: LearnProgressStatus) => {
  if (status === "COMPLETED") return "Tamamlandı";
  if (status === "IN_PROGRESS") return "Devam ediyor";
  return null;
};
