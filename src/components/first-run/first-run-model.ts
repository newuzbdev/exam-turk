import type { ExamSession } from '@/data/exam-information';
import type { StudentCurrentLevel, StudentOnboarding, StudentOnboardingInput } from '@/pages/dashboard/onboarding-api';

// Do not interrupt an attempt, an access link, or a payment return.
export function isFirstRunEntry(pathname: string, search: string) {
  if (!['/app', '/app/', '/app/test', '/app/pratik'].includes(pathname)) return false;
  const params = new URLSearchParams(search);
  return [...params.keys()].every(key => pathname === '/app/pratik' && key === 'bolum');
}

export const needsFirstRun = (profile: StudentOnboarding | null) => !profile?.onboardingCompleted;

export function upcomingPeriods(sessions: ExamSession[], today: string) {
  return sessions.filter(item => item.published && item.examEnd >= today)
    .sort((a, b) => a.examStart.localeCompare(b.examStart));
}

export function firstRunInput(
  profile: StudentOnboarding | null | undefined,
  currentLevel: StudentCurrentLevel,
  targetLevel: 'B1' | 'B2' | 'C1',
  session?: ExamSession,
): StudentOnboardingInput {
  return {
    goal: 'EXAM_PREPARATION', currentLevel, targetLevel,
    supportLanguage: profile?.supportLanguage ?? 'TURKISH',
    dailyStudyMinutes: profile?.dailyStudyMinutes ?? 20,
    examTarget: 'CEFR',
    targetExamYear: session ? Number(session.examStart.slice(0, 4)) : null,
    examSessionId: session?.id ?? null,
    examDate: session?.examStart ?? null,
  };
}

const dismissedThisTab = new Set<string>();
const skipKey = (owner: string) => `tm:first-run:v1:${owner}`;
export function hasSkippedFirstRun(owner: string) {
  if (dismissedThisTab.has(owner)) return true;
  try { return localStorage.getItem(skipKey(owner)) === 'skipped'; } catch { return false; }
}
export function skipFirstRun(owner: string) {
  dismissedThisTab.add(owner);
  try { localStorage.setItem(skipKey(owner), 'skipped'); } catch { /* The tab can still remember the choice. */ }
}
