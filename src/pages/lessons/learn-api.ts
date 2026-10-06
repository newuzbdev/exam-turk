import {useAuth} from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import axiosPrivate from "@/config/api";
import type {
  LearnContinueLearning,
  LearnCourseDetail,
  LearnCourseSummary,
  LearnAiConversationMessagesResponse,
  LearnAiConversationSummary,
  LearnAiTeacherRequest,
  LearnAiTeacherResponse,
  LearnExerciseSubmissionResult,
  LearnExerciseSubmitAnswer,
  LearnLessonDetail,
  LearnProgress,
  LearnRecommendation,
  LearnSummary,
  LearnWeakness,
} from "./learn-types";
import {
  sortCourseStructure,
  sortLearnCourses,
} from "./learn-utils";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: unknown;
}

const LEARN_REQUEST_TIMEOUT_MS = 12_000;
function useOwnedLearnQuery<T>(options:UseQueryOptions<T>){const {user}=useAuth();return useQuery({...options,queryKey:[...options.queryKey,'owner',user?.id],enabled:!!user?.id&&options.enabled!==false,staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:'always'});}


const unwrapResponse = <T,>(payload: T | ApiEnvelope<T>): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
};

const unwrapDataResponse = <T,>(payload: unknown): T => {
  const unwrapped = unwrapResponse(payload as T | ApiEnvelope<T>);

  if (
    unwrapped &&
    typeof unwrapped === "object" &&
    "data" in unwrapped
  ) {
    return (unwrapped as { data: T }).data;
  }

  return unwrapped as T;
};

export const learnQueryKeys = {
  courses: ["learn", "courses"] as const,
  course: (slug: string) => ["learn", "courses", slug] as const,
  lesson: (courseSlug: string, lessonSlug: string) =>
    ["learn", "courses", courseSlug, "lessons", lessonSlug] as const,
  myProgress: ["learn", "me", "progress"] as const,
  mySummary: ["learn", "me", "summary"] as const,
  continueLearning: ["learn", "me", "continue"] as const,
  myWeaknesses: ["learn", "me", "weaknesses"] as const,
  myRecommendations: ["learn", "me", "recommendations"] as const,
  aiConversations: (lessonId: string) =>
    ["learn", "ai", "lessons", lessonId, "conversations"] as const,
  aiConversationMessages: (conversationId: string) =>
    ["learn", "ai", "conversations", conversationId, "messages"] as const,
};

const mergeProgress = (
  current: LearnProgress[] | undefined,
  next: LearnProgress,
) => {
  const withoutCurrent = (current ?? []).filter(
    (item) => item.lessonId !== next.lessonId,
  );
  return [next, ...withoutCurrent];
};

const useProgressMutationEffects = () => {
  const queryClient = useQueryClient();
  const {user}=useAuth();

  return (progress?: LearnProgress) => {
    if (progress) {
      queryClient.setQueryData<LearnProgress[]>(
        [...learnQueryKeys.myProgress,'owner',user?.id],
        (current) => mergeProgress(current, progress),
      );
    }
    void queryClient.invalidateQueries({
      queryKey: learnQueryKeys.continueLearning,
    });
    void queryClient.invalidateQueries({
      queryKey: learnQueryKeys.mySummary,
    });
  };
};

export const usePublicLearnCourses = () =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.courses,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<{ data: LearnCourseSummary[] }> | {
          data: LearnCourseSummary[];
        }
      >("/api/learn/courses", { timeout: LEARN_REQUEST_TIMEOUT_MS });
      const payload = unwrapResponse(response.data);
      return sortLearnCourses(payload.data);
    },
    retry: 1,
  });

export const usePublicLearnCourse = (slug?: string) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.course(slug ?? ""),
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<LearnCourseDetail> | LearnCourseDetail
      >(`/api/learn/courses/${slug}`, { timeout: LEARN_REQUEST_TIMEOUT_MS });
      return sortCourseStructure(unwrapResponse(response.data));
    },
    enabled: Boolean(slug),
    retry: 1,
  });

export const usePublicLearnLesson = (
  courseSlug?: string,
  lessonSlug?: string,
) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.lesson(courseSlug ?? "", lessonSlug ?? ""),
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<LearnLessonDetail> | LearnLessonDetail
      >(`/api/learn/courses/${courseSlug}/lessons/${lessonSlug}`, {
        timeout: LEARN_REQUEST_TIMEOUT_MS,
      });
      return unwrapResponse(response.data);
    },
    enabled: Boolean(courseSlug && lessonSlug),
    retry: 1,
  });

export const useMyLearnProgress = (enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.myProgress,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<{ data: LearnProgress[] }> | { data: LearnProgress[] }
      >("/api/learn/me/progress", { timeout: LEARN_REQUEST_TIMEOUT_MS });
      return unwrapResponse(response.data).data;
    },
    enabled,
    retry: 1,
  });

export const useContinueLearning = (enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.continueLearning,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<LearnContinueLearning | null> | LearnContinueLearning | null
      >("/api/learn/me/continue", { timeout: LEARN_REQUEST_TIMEOUT_MS });
      return unwrapDataResponse<LearnContinueLearning | null>(response.data);
    },
    enabled,
    retry: 1,
  });

export const useMyLearnSummary = (enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.mySummary,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<LearnSummary> | LearnSummary
      >("/api/learn/me/summary", { timeout: LEARN_REQUEST_TIMEOUT_MS });
      return unwrapDataResponse<LearnSummary>(response.data);
    },
    enabled,
    retry: 1,
  });

export const useMyLearnWeaknesses = (enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.myWeaknesses,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<{ data: LearnWeakness[] }> | { data: LearnWeakness[] }
      >("/api/learn/me/weaknesses", { timeout: LEARN_REQUEST_TIMEOUT_MS });
      return unwrapResponse(response.data).data;
    },
    enabled,
    retry: 1,
  });

export const useMyLearnRecommendations = (enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.myRecommendations,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        | ApiEnvelope<{ data: LearnRecommendation[] }>
        | { data: LearnRecommendation[] }
      >("/api/learn/me/recommendations", {
        timeout: LEARN_REQUEST_TIMEOUT_MS,
      });
      return unwrapResponse(response.data).data;
    },
    enabled,
    retry: 1,
  });

export const useStartLearnLesson = () => {
  const syncProgress = useProgressMutationEffects();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await axiosPrivate.post<
        ApiEnvelope<LearnProgress> | LearnProgress
      >(`/api/learn/lessons/${lessonId}/start`);
      return unwrapResponse(response.data);
    },
    onSuccess: (progress) => syncProgress(progress),
  });
};

export const useCompleteLearnLesson = () => {
  const syncProgress = useProgressMutationEffects();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await axiosPrivate.post<
        ApiEnvelope<LearnProgress> | LearnProgress
      >(`/api/learn/lessons/${lessonId}/complete`);
      return unwrapResponse(response.data);
    },
    onSuccess: (progress) => syncProgress(progress),
  });
};

export const useSubmitLearnExercise = () => {
  const syncProgress = useProgressMutationEffects();

  return useMutation({
    mutationFn: async ({
      exerciseId,
      answers,
    }: {
      exerciseId: string;
      answers: LearnExerciseSubmitAnswer[];
    }) => {
      const response = await axiosPrivate.post<
        ApiEnvelope<LearnExerciseSubmissionResult> | LearnExerciseSubmissionResult
      >(`/api/learn/exercises/${exerciseId}/submit`, { answers });
      return unwrapResponse(response.data);
    },
    onSuccess: (result) => syncProgress(result.progress),
  });
};

export const useAskLearnAiTeacher = () =>
  useMutation({
    mutationFn: async ({
      lessonId,
      mode,
      message,
      action,
      conversationId,
    }: LearnAiTeacherRequest) => {
      const response = await axiosPrivate.post<
        ApiEnvelope<LearnAiTeacherResponse> | LearnAiTeacherResponse
      >(
        `/api/ai/learn/lessons/${lessonId}/ask`,
        {
          mode,
          message,
          ...(action ? { action } : {}),
          ...(conversationId ? { conversationId } : {}),
        },
        { timeout: 30_000 },
      );
      return unwrapResponse(response.data);
    },
  });

export const useLearnAiConversations = (lessonId?: string, enabled = true) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.aiConversations(lessonId ?? ""),
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<{ data: LearnAiConversationSummary[] }> | {
          data: LearnAiConversationSummary[];
        }
      >(`/api/ai/learn/lessons/${lessonId}/conversations`, {
        timeout: LEARN_REQUEST_TIMEOUT_MS,
      });
      return unwrapResponse(response.data).data;
    },
    enabled: Boolean(lessonId && enabled),
    retry: 1,
  });

export const useLearnAiConversationMessages = (
  conversationId?: string | null,
  enabled = true,
) =>
  useOwnedLearnQuery({
    queryKey: learnQueryKeys.aiConversationMessages(conversationId ?? ""),
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<LearnAiConversationMessagesResponse> | LearnAiConversationMessagesResponse
      >(`/api/ai/conversations/${conversationId}/messages`, {
        timeout: LEARN_REQUEST_TIMEOUT_MS,
      });
      return unwrapResponse(response.data);
    },
    enabled: Boolean(conversationId && enabled),
    retry: 1,
  });
