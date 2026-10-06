import type {
  LearnContentBlock,
  LearnCourseDetail,
  LearnCourseSummary,
  LearnLevel,
} from "./learn-types";

const LEVEL_ORDER: Record<LearnLevel, number> = {
  STARTER: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

export const getLearnLevelLabel = (level: LearnLevel, label?: string) =>
  level === "STARTER" ? "Sıfırdan Başla" : label || level;

export const getLearnErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;

  const response = "response" in error ? error.response : null;
  if (!response || typeof response !== "object" || !("status" in response)) {
    return null;
  }

  return typeof response.status === "number" ? response.status : null;
};

export const sortLearnCourses = (courses: LearnCourseSummary[]) =>
  [...courses].sort(
    (left, right) =>
      LEVEL_ORDER[left.levelKey] - LEVEL_ORDER[right.levelKey] ||
      left.sortOrder - right.sortOrder,
  );

export const sortCourseStructure = (
  course: LearnCourseDetail,
): LearnCourseDetail => ({
  ...course,
  modules: [...course.modules]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((courseModule) => ({
      ...courseModule,
      lessons: [...courseModule.lessons].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    })),
});

export const sortContentBlocks = (blocks: LearnContentBlock[]) =>
  [...blocks].sort((left, right) => left.sortOrder - right.sortOrder);

export const getYouTubeEmbedUrl = (mediaUrl: string) => {
  try {
    const url = new URL(mediaUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      const [, route, videoId] = url.pathname.split("/");
      if (route === "embed" || route === "shorts") {
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    }
  } catch {
    return null;
  }

  return null;
};
