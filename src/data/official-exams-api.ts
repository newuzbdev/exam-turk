import { usePageDataQuery } from '@/hooks/use-page-data-query';
import { useAuth } from '@/contexts/AuthContext';
import axiosPrivate from '@/config/api';
import type { ExamSession } from './exam-information';

export interface OfficialExamCalendar { sessions: ExamSession[]; selectedSession: ExamSession | null }
export const officialExamsKey = ['student', 'me', 'official-exams'] as const;
export function useOfficialExams() {
  const { user, isAuthenticated } = useAuth();
  return usePageDataQuery({enabled: isAuthenticated && Boolean(user?.id), queryKey:officialExamsKey, queryFn: async (): Promise<OfficialExamCalendar> => {
    const response = await axiosPrivate.get('/api/me/official-exams');
    const data = response.data?.success !== undefined ? response.data.data : response.data;
    if (!data || !Array.isArray(data.sessions) || !('selectedSession' in data)) throw new Error('Takvim yanıtı geçersiz.');
    return data;
  }, retry:1, staleTime:30_000, refetchInterval:60_000});
}
