import { useEffect, useRef } from 'react';
import { studentPresenceEnabled, studentPresenceService, STUDENT_PRESENCE_LOGOUT_EVENT } from '@/services/studentPresence.service';
import { overallTestFlowStore, overallTestTokenStore } from '@/services/overallTest.service';
import { readCurrentActivity } from '@/utils/access-link-context';
import { classifyStudentPage, isPresenceUuid, studentPresencePath, type PracticeDomain, type StudentPresenceRouteState } from '@/utils/student-presence-route';

type RouteContext = { pathname: string };
type Tracker = { routeChanged: () => void; stop: () => void };
const domains: Record<string, PracticeDomain> = { okuma: 'READING', dinleme: 'LISTENING', yazma: 'WRITING', konusma: 'SPEAKING' };

// Read only existing owner-scoped opaque pointers. Never inspect drafts or link tokens.
export function readStudentPresenceRouteState(userId: string, pathname: string): StudentPresenceRouteState {
  const state: StudentPresenceRouteState = { userId };
  try {
    if (sessionStorage.getItem('userId') !== userId) return state;
    const path = studentPresencePath(pathname);
    const mock = /^\/app\/(reading|listening|writing|speaking)-test\/([^/]+)(?:\/part\/\d+)?$/.exec(path);
    if (mock || path === '/app/overall-section-ready') {
      const overallId = overallTestFlowStore.getOverallId();
      const next = path === '/app/overall-section-ready' ? overallTestFlowStore.getPendingNextSection()?.next : undefined;
      const testId = mock?.[2] ?? next?.testId;
      const selected = overallTestFlowStore.getQueue().some(item => item.testId === testId && (!mock || item.testType === mock[1].toUpperCase()));
      if (isPresenceUuid(overallId) && isPresenceUuid(testId) && selected && readCurrentActivity(userId, 'MOCK')?.attemptId === overallId) {
        state.ownerId = userId; state.overallTestId = overallId; state.mockTestId = testId;
      }
    }
    const practice = /^\/app\/pratik\/(okuma|dinleme|yazma|konusma)\/([^/]+)$/.exec(path);
    const readingResult = /^\/app\/pratik\/okuma\/sonuc\/([^/]+)$/.exec(path);
    if (readingResult && isPresenceUuid(readingResult[1])) {
      const pointer = readCurrentActivity(userId, 'READING');
      if (pointer?.attemptId === readingResult[1] && isPresenceUuid(pointer.contentId)) {
        state.ownerId = userId; state.practiceId = pointer.contentId; state.readingPracticeAttemptId = pointer.attemptId;
      }
    }
    if (practice && isPresenceUuid(practice[2])) {
      const domain = domains[practice[1]];
      const pointer = domain === 'LISTENING' ? null : readCurrentActivity(userId, domain);
      if (pointer?.contentId === practice[2] && isPresenceUuid(pointer.attemptId)) {
        state.ownerId = userId; state.practiceId = pointer.contentId;
        if (domain === 'READING') state.readingPracticeAttemptId = pointer.attemptId;
        if (domain === 'WRITING' || domain === 'SPEAKING') state.evaluationRunId = pointer.attemptId;
      }
    }
  } catch { /* Blocked/malformed storage only downgrades activity evidence. */ }
  return state;
}

export function useStudentPresence({ userId, routeContext }: { userId?: string; routeContext: RouteContext }): void {
  const path = studentPresencePath(routeContext.pathname);
  const isWorkspace = path === '/app' || path.startsWith('/app/');
  const routeRef = useRef(path);
  routeRef.current = path;
  const trackerRef = useRef<Tracker | null>(null);
  const scheduledPath = useRef(path);

  useEffect(() => {
    if (!studentPresenceEnabled || !userId || !isWorkspace) return;
    const sessionId = crypto.randomUUID();
    let sequence = 0;
    let stopped = false;
    let intervalTimer: number | undefined;
    let routeTimer: number | undefined;
    let flight: { controller: AbortController; timeout: number } | undefined;
    const delay = () => document.visibilityState === 'hidden' ? 60_000 : 30_000;
    const clearSchedule = () => {
      window.clearTimeout(intervalTimer); window.clearTimeout(routeTimer);
      intervalTimer = undefined; routeTimer = undefined;
    };
    const schedule = () => {
      window.clearTimeout(intervalTimer);
      if (!stopped) intervalTimer = window.setTimeout(() => { void report(); schedule(); }, delay());
    };
    const report = async () => {
      if (stopped || flight) return;
      const controller = new AbortController();
      const request = { controller, timeout: window.setTimeout(() => { controller.abort(); if (flight === request) flight = undefined; }, 5_000) };
      flight = request;
      try {
        const state = readStudentPresenceRouteState(userId, routeRef.current);
        const page = classifyStudentPage(routeRef.current, state);
        // Token goes to a transient header only and only for the known selected Mock.
        const mockSectionToken = page.page === 'MOCK_TEST' && page.overallTestId && state.mockTestId ? overallTestTokenStore.getByTestId(state.mockTestId) ?? undefined : undefined;
        await studentPresenceService.report({ ...page, sessionId, sequence: ++sequence, visible: document.visibilityState !== 'hidden' }, { signal: controller.signal, mockSectionToken });
      } catch { /* Silent telemetry failure; the next scheduled report is the only retry. */ }
      finally { window.clearTimeout(request.timeout); if (flight === request) flight = undefined; }
    };
    const routeChanged = () => {
      if (stopped) return;
      window.clearTimeout(routeTimer);
      routeTimer = window.setTimeout(() => { void report(); schedule(); }, 5_000);
    };
    const visibilityChanged = () => { clearSchedule(); schedule(); };
    const stop = () => {
      if (stopped) return;
      stopped = true; clearSchedule();
      if (flight) { flight.controller.abort(); window.clearTimeout(flight.timeout); flight = undefined; }
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('auth:access-context', routeChanged);
      window.removeEventListener(STUDENT_PRESENCE_LOGOUT_EVENT, stop);
      // An account switch must not send the previous tab UUID with new credentials.
      try {
        if (sessionStorage.getItem('userId') === userId) void studentPresenceService.close(sessionId).catch(() => undefined);
      } catch { /* With no trusted owner pointer, expiry is the safe fallback. */ }
    };
    const tracker = { routeChanged, stop };
    trackerRef.current = tracker;
    scheduledPath.current = routeRef.current;
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('auth:access-context', routeChanged);
    window.addEventListener(STUDENT_PRESENCE_LOGOUT_EVENT, stop);
    schedule(); void report();
    return () => { stop(); if (trackerRef.current === tracker) trackerRef.current = null; };
  }, [userId, isWorkspace]);

  useEffect(() => {
    if (scheduledPath.current === path) return;
    scheduledPath.current = path;
    trackerRef.current?.routeChanged();
  }, [path]);
}
