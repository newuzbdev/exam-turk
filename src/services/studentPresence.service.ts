import axios from 'axios';
import sharedApi from '@/config/api';
import { readStoredAccessToken } from '@/utils/authTokenStorage';
import { isPresenceUuid, STUDENT_PAGES, type StudentPresencePage } from '@/utils/student-presence-route';

// Public build toggle; the API has an independent mandatory migration + rollout gate.
export const studentPresenceEnabled = import.meta.env.VITE_ADMIN_LAUNCH_FEATURES_ENABLED === 'true';
export const STUDENT_PRESENCE_LOGOUT_EVENT = 'student-presence:logout';
export type PresenceInput = StudentPresencePage & { sessionId: string; sequence: number; visible: boolean };
type Receipt = { accepted: boolean; serverNow: string };
const timeout = 5_000;
const validateStatus = () => true;
// Telemetry shares the API origin, but never its mutable auth/refresh interceptors.
const transport = axios.create({ baseURL: sharedApi.defaults.baseURL, timeout, validateStatus });
const safeInput = (input: PresenceInput): PresenceInput => {
  const result: PresenceInput = { sessionId: input.sessionId, sequence: input.sequence, visible: input.visible, page: STUDENT_PAGES.includes(input.page) ? input.page : 'OTHER' };
  for (const key of ['overallTestId', 'readingPracticeAttemptId', 'practiceId', 'evaluationRunId'] as const) if (isPresenceUuid(input[key])) result[key] = input[key];
  if (input.practiceDomain && ['READING', 'LISTENING', 'WRITING', 'SPEAKING'].includes(input.practiceDomain)) result.practiceDomain = input.practiceDomain;
  return result;
};
export const studentPresenceService = {
  async report(input: PresenceInput, options: { signal: AbortSignal; mockSectionToken?: string }): Promise<Receipt> {
    const token = readStoredAccessToken();
    if (!token) throw new Error('Presence unavailable');
    const response = await transport.post('/api/me/presence', safeInput(input), {
      signal: options.signal, timeout, validateStatus,
      headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store', ...(options.mockSectionToken ? { 'x-mock-section-token': options.mockSectionToken } : {}) },
    });
    const receipt = response.data?.data;
    if (response.status < 200 || response.status >= 300 || response.data?.success !== true || typeof receipt?.accepted !== 'boolean' || typeof receipt?.serverNow !== 'string') throw new Error('Presence unavailable');
    return { accepted: receipt.accepted, serverNow: receipt.serverNow };
  },
  async close(sessionId: string): Promise<void> {
    if (!isPresenceUuid(sessionId)) return;
    // Snapshot synchronously before logout or account replacement changes storage.
    const token = readStoredAccessToken();
    if (!token) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      await transport.delete(`/api/me/presence/${sessionId}`, {
        signal: controller.signal, timeout, validateStatus,
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' },
      });
    } catch { /* Best effort; token clearing never waits for telemetry. */ }
    finally { window.clearTimeout(timer); }
  },
};
export function closeStudentPresenceBeforeLogout(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STUDENT_PRESENCE_LOGOUT_EVENT));
}
