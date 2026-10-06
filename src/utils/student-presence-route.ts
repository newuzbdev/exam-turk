export const STUDENT_PAGES = ['DASHBOARD', 'MOCK_CATALOG', 'PRACTICE_CATALOG', 'PREPARATION', 'MOCK_TEST', 'PRACTICE_TEST', 'RESULT', 'PROFILE', 'SUBSCRIPTION', 'OTHER'] as const;
export type StudentPage = typeof STUDENT_PAGES[number];
export type PracticeDomain = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';
export type StudentPresencePage = {
  page: StudentPage;
  overallTestId?: string;
  readingPracticeAttemptId?: string;
  practiceDomain?: PracticeDomain;
  practiceId?: string;
  evaluationRunId?: string;
};
export type StudentPresenceRouteState = {
  userId?: string;
  ownerId?: string;
  overallTestId?: string;
  mockTestId?: string;
  practiceId?: string;
  readingPracticeAttemptId?: string;
  evaluationRunId?: string;
};
export const isPresenceUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const studentPresencePath = (pathname: string): string => pathname.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
const practiceDomains: Record<string, PracticeDomain> = { okuma: 'READING', dinleme: 'LISTENING', yazma: 'WRITING', konusma: 'SPEAKING' };

// Project only enums and known owned UUIDs. Router search/hash/state are never spread.
export function classifyStudentPage(pathname: string, state: StudentPresenceRouteState = {}): StudentPresencePage {
  const path = studentPresencePath(pathname);
  let page: StudentPage = 'OTHER';
  if (path === '/app') page = 'DASHBOARD';
  else if (path === '/app/test') page = 'MOCK_CATALOG';
  else if (path === '/app/pratik' || path === '/app/pratik/okuma') page = 'PRACTICE_CATALOG';
  else if (path === '/app/overall-section-ready') page = 'PREPARATION';
  else if (path === '/app/profil') page = 'PROFILE';
  else if (['/app/fiyatlar', '/app/odeme-sonucu'].includes(path)) page = 'SUBSCRIPTION';
  else if (['/app/sonuclar', '/app/test-unified-results'].includes(path) || /^\/app\/(?:overall-results|unified-results)\/[^/]+$/.test(path) || /^\/app\/(?:reading|listening|writing|speaking)-test\/results\/[^/]+$/.test(path) || /^\/app\/pratik\/okuma\/sonuc\/[^/]+$/.test(path)) page = 'RESULT';
  const mock = /^\/app\/(reading|listening|writing|speaking)-test\/(?!results$)([^/]+)(?:\/part\/\d+)?$/.exec(path);
  const practice = /^\/app\/pratik\/(okuma|dinleme|yazma|konusma)\/([^/]+)$/.exec(path);
  if (mock) page = 'MOCK_TEST';
  if (practice) page = 'PRACTICE_TEST';
  const result: StudentPresencePage = { page };
  if (!state.userId || state.ownerId !== state.userId) return result;
  if (isPresenceUuid(state.overallTestId) && (page === 'PREPARATION' || (mock && mock[2] === state.mockTestId && isPresenceUuid(state.mockTestId)))) result.overallTestId = state.overallTestId;
  if (practice && isPresenceUuid(practice[2]) && state.practiceId === practice[2]) {
    result.practiceDomain = practiceDomains[practice[1]];
    result.practiceId = state.practiceId;
    if (result.practiceDomain === 'READING' && isPresenceUuid(state.readingPracticeAttemptId)) result.readingPracticeAttemptId = state.readingPracticeAttemptId;
    if (['WRITING', 'SPEAKING'].includes(result.practiceDomain) && isPresenceUuid(state.evaluationRunId)) result.evaluationRunId = state.evaluationRunId;
  }
  const readingResult = /^\/app\/pratik\/okuma\/sonuc\/([^/]+)$/.exec(path);
  if (readingResult && isPresenceUuid(state.practiceId) && isPresenceUuid(state.readingPracticeAttemptId) && readingResult[1] === state.readingPracticeAttemptId) {
    result.practiceDomain = 'READING'; result.practiceId = state.practiceId; result.readingPracticeAttemptId = state.readingPracticeAttemptId;
  }
  return result;
}
