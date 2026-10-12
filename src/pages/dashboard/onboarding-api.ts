import { useAuth } from "@/contexts/AuthContext";
import { usePageDataQuery, pageDataKey } from "@/hooks/use-page-data-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axiosPrivate from "@/config/api";
import { officialExamsKey } from "@/data/official-exams-api";

export type StudentGoal =
  | "START_TURKISH"
  | "EXAM_PREPARATION"
  | "IMPROVE_SPEAKING"
  | "IMPROVE_WRITING"
  | "GENERAL_TURKISH";

export type StudentCurrentLevel =
  "NONE" | "A1" | "A2" | "B1" | "B2" | "C1" | "UNSURE";

export type StudentSupportLanguage =
  "TURKISH" | "UZBEK" | "ENGLISH" | "RUSSIAN" | "OTHER";

export type StudentExamTarget = "TYS" | "CEFR" | "UNDECIDED";

export interface StudentOnboarding {
  id: string;
  userId: string;
  goal: StudentGoal;
  currentLevel: StudentCurrentLevel;
  supportLanguage: StudentSupportLanguage;
  examTarget: StudentExamTarget;
  dailyStudyMinutes: 10 | 20 | 30 | 60;
  examDate: string | null;
  targetLevel?: "B1" | "B2" | "C1" | null;
  targetExamYear?: number | null;
  examSessionId?: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentOnboardingInput {
  goal: StudentGoal;
  currentLevel: StudentCurrentLevel;
  supportLanguage: StudentSupportLanguage;
  examTarget: StudentExamTarget;
  dailyStudyMinutes: 10 | 20 | 30 | 60;
  examDate: string | null;
  targetLevel?: "B1" | "B2" | "C1" | null;
  targetExamYear?: number | null;
  examSessionId?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: unknown;
}

const unwrapResponse = <T>(payload: T | ApiEnvelope<T>): T => {
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

export const onboardingQueryKey = ["student", "me", "onboarding"] as const;

export const useStudentOnboarding = () => {
  const { user, isAuthenticated } = useAuth();
  return usePageDataQuery({
    enabled: isAuthenticated && Boolean(user?.id),
    queryKey: onboardingQueryKey,
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ApiEnvelope<StudentOnboarding | null> | StudentOnboarding | null
      >("/api/me/onboarding");
      return unwrapResponse(response.data);
    },
    retry: 1,
  });

};

export const useSaveStudentOnboarding = (
  existing: StudentOnboarding | null | undefined,
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    onMutate: () => ({
      ownerId: user?.id,
      query: queryClient.getQueryCache().find({
        queryKey: pageDataKey(onboardingQueryKey, user?.id), exact: true,
      }),
    }),
    mutationFn: async (input: StudentOnboardingInput | Pick<StudentOnboardingInput, 'targetLevel'>) => {
      // Legacy create requires these fields; a target-only edit must never resend them.
      const creationInput = 'goal' in input ? input : {
        goal: 'GENERAL_TURKISH', currentLevel: 'UNSURE', supportLanguage: 'TURKISH',
        examTarget: 'UNDECIDED', dailyStudyMinutes: 20, examDate: null, ...input,
      };
      const request = existing
        ? axiosPrivate.patch<
            ApiEnvelope<StudentOnboarding> | StudentOnboarding
          >("/api/me/onboarding", input)
        : axiosPrivate.post<ApiEnvelope<StudentOnboarding> | StudentOnboarding>(
            "/api/me/onboarding",
            creationInput,
          );
      const response = await request;
      return unwrapResponse(response.data);
    },
    onSuccess: (profile, _input, context) => {
      if (!context?.ownerId || context.ownerId !== user?.id) return;
      const key = pageDataKey(onboardingQueryKey, context.ownerId);
      // Logout removes this query. A late save must not recreate it or update a new session.
      if (!context.query || queryClient.getQueryCache().find({ queryKey: key, exact: true }) !== context.query) return;
      void queryClient.invalidateQueries({queryKey:officialExamsKey});
      queryClient.setQueryData(key, profile);
    },
  });
};
