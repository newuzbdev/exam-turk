import { useQuery } from '@tanstack/react-query';
import axiosPrivate from '@/config/api';
import type { LearnExerciseSubmissionResult } from '../learn-types';
import type { ExerciseSubmitResult } from './WorkbookExercise';
import type { StudentExerciseSubmission, WorkbookDocument, WorkbookDocumentSummary } from './types';
import { unwrapWorkbookPayload } from './workbook-api-utils';

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };
const REQUEST_TIMEOUT_MS = 12_000;
export const workbookQueryKeys = { lessons: ['learn', 'workbook-lessons'] as const, lesson: (idOrSlug: string) => ['learn', 'workbook-lessons', idOrSlug] as const };

export const useWorkbookLessons = () => useQuery({
  queryKey: workbookQueryKeys.lessons,
  queryFn: async () => {
    const response = await axiosPrivate.get<ApiEnvelope<{ data: WorkbookDocumentSummary[] }> | { data: WorkbookDocumentSummary[] }>('/api/learn/workbook-lessons', { timeout: REQUEST_TIMEOUT_MS });
    return unwrapWorkbookPayload(response.data).data;
  }, retry: 1,
});

export const useWorkbookLesson = (idOrSlug?: string) => useQuery({
  queryKey: workbookQueryKeys.lesson(idOrSlug ?? ''),
  queryFn: async () => {
    const response = await axiosPrivate.get<ApiEnvelope<WorkbookDocument> | WorkbookDocument>(`/api/learn/workbook-lessons/${encodeURIComponent(idOrSlug ?? '')}`, { timeout: REQUEST_TIMEOUT_MS });
    return unwrapWorkbookPayload(response.data);
  }, enabled: Boolean(idOrSlug), retry: 1,
});

export async function submitWorkbookExercise(submission: StudentExerciseSubmission): Promise<ExerciseSubmitResult> {
  const response = await axiosPrivate.post<ApiEnvelope<LearnExerciseSubmissionResult> | LearnExerciseSubmissionResult>(`/api/learn/exercises/${encodeURIComponent(submission.exerciseId)}/submit`, { answers: submission.answers });
  const result = unwrapWorkbookPayload(response.data);
  const answer = result.answers.find(item => item.questionId === submission.answers[0]?.questionId);
  return { correct: Boolean(answer?.isCorrect), feedback: answer?.feedback ?? '' };
}
