import type { AccessTarget } from '../services/access.service.ts';
import { studentPath, LEGACY_STUDENT_ROOTS } from '../routes/student-route-paths.ts';

const PENDING_KEY = 'tm_access_pending_share_v1';
const PENDING_REVISION_KEY = 'tm_access_pending_share_revision_v1';
const ACTIVITY_PREFIX = 'tm_activity_current_v1:';
const OWNED_PREFIX = 'tm_access_owned_v1:';
export const INVALID_ACCESS_LINK_MESSAGE = 'Bu bağlantının süresi dolmuş veya erişime kapatılmış.';
type LocationInput = string | { pathname: string; search?: string; hash?: string };
type PendingShare = { token: string; target: AccessTarget };
export type OwnedAccess = { contextId?: string; redemptionId?: string; target: AccessTarget; endsAt?: string };
const sameTarget = (a: AccessTarget, b: AccessTarget) => a.scope === b.scope && a.targetId === b.targetId;

export function safeAccessReturnTo(value: LocationInput): string | null {
  if (typeof window === 'undefined') return null;
  const raw = typeof value === 'string' ? value.trim() : `${value.pathname}${value.search || ''}${value.hash || ''}`;
  if (!raw || raw.startsWith('//') || raw.includes('\\')) return null;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const pathname = studentPath(parsed.pathname);
    if (!pathname || !(pathname === '/app' || [...LEGACY_STUDENT_ROOTS, 'profil', 'fiyatlar', 'nasil-calisir'].some(root => pathname === `/app/${root}` || pathname.startsWith(`/app/${root}/`)))) return null;
    parsed.searchParams.delete('share');
    const hash = /share[=%]/i.test(parsed.hash) ? '' : parsed.hash;
    return `${pathname}${parsed.search}${hash}`;
  } catch { return null; }
}

export function captureAccessLink(location: LocationInput): { safeReturnTo: string; pending: boolean } {
  const safeReturnTo = safeAccessReturnTo(location) || '/app';
  if (typeof window === 'undefined') return { safeReturnTo, pending: false };
  const raw = typeof location === 'string' ? location : `${location.pathname}${location.search || ''}${location.hash || ''}`;
  let pending = false;
  try {
    const parsed = new URL(raw, window.location.origin);
    const token = parsed.searchParams.get('share');
    if (token !== null) {
      // Scrub before storage, configuration, auth or any protected request.
      window.history.replaceState(window.history.state, '', safeReturnTo);
      const safe = new URL(safeReturnTo, window.location.origin);
      const skill = safe.searchParams.get('bolum')?.toUpperCase();
      const target: AccessTarget | null = safe.pathname === '/app/pratik' && ['READING', 'LISTENING', 'WRITING', 'SPEAKING'].includes(skill || '') && safe.searchParams.get('start')
        ? { scope: `PRACTICE_${skill}` as AccessTarget['scope'], targetId: safe.searchParams.get('start')! }
        : safe.pathname === '/app/test' && safe.searchParams.get('package')
          ? { scope: 'MOCK_PACKAGE', targetId: safe.searchParams.get('package')! } : null;
      if (safeAccessReturnTo(location) && target) {
        const nextPending = JSON.stringify({ token, target });
        if (sessionStorage.getItem(PENDING_KEY) !== nextPending) {
          sessionStorage.setItem(PENDING_KEY, nextPending);
          sessionStorage.setItem(PENDING_REVISION_KEY, String(Number(readPendingShareRevision()) + 1));
          if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('access:share-pending'));
        }
        pending = true;
      }
    } else pending = sessionStorage.getItem(PENDING_KEY) !== null;
  } catch { /* Storage may be blocked; raw token is already scrubbed. */ }
  return { safeReturnTo, pending };
}
export function readPendingShareRevision(): string {
  try { return sessionStorage.getItem(PENDING_REVISION_KEY) || '0'; } catch { return '0'; }
}

export function readPendingShareForTarget(target: AccessTarget): string | null {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null') as PendingShare | null;
    return pending?.target && sameTarget(pending.target, target) && typeof pending.token === 'string' ? pending.token : null;
  } catch { return null; }
}
export function clearPendingShare(): void {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* Optional storage. */ }
}
const ownedKey = (userId: string, target: AccessTarget) => `${OWNED_PREFIX}${encodeURIComponent(userId)}:${target.scope}:${encodeURIComponent(target.targetId || '')}`;
export function saveOwnedAccess(userId: string, target: AccessTarget, value: OwnedAccess): void {
  try { sessionStorage.setItem(ownedKey(userId, target), JSON.stringify({ contextId: value.contextId, redemptionId: value.redemptionId, target: value.target, endsAt: value.endsAt })); notifyAccessContext(); } catch { /* Keep in-memory entry usable. */ }
}
export function readOwnedAccess(userId: string, target: AccessTarget): OwnedAccess | null {
  try { return JSON.parse(sessionStorage.getItem(ownedKey(userId, target)) || 'null') as OwnedAccess | null; } catch { return null; }
}
export function removeOwnedAccess(userId: string, target: AccessTarget): void {
  try { sessionStorage.removeItem(ownedKey(userId, target)); notifyAccessContext(); } catch { /* Optional storage. */ }
}
export function clearOwnedAccess(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(OWNED_PREFIX) || key?.startsWith(ACTIVITY_PREFIX)) sessionStorage.removeItem(key);
    }
    notifyAccessContext();
  } catch { /* Optional storage. */ }
}
function notifyAccessContext() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('auth:access-context'));
}

// A single current hint per domain, independent of historical permission bindings.
// It never authorizes access; the server verifies ownership and active status.
type ActivityDomain = 'MOCK' | 'READING' | 'WRITING' | 'SPEAKING';
type ActivityPointer = { contentId: string; attemptId: string; target: AccessTarget };
const activityKey = (owner: string, domain: ActivityDomain) => `${ACTIVITY_PREFIX}${encodeURIComponent(owner)}:${domain}`;
export function publishCurrentActivity(owner: string, domain: ActivityDomain, value: ActivityPointer): void {
  try {
    if (sessionStorage.getItem('userId') !== owner) return;
    sessionStorage.setItem(activityKey(owner, domain), JSON.stringify({ contentId: value.contentId, attemptId: value.attemptId, target: { scope: value.target.scope, targetId: value.target.targetId } }));
    notifyAccessContext();
  } catch { /* Optional telemetry metadata must never interrupt student work. */ }
}
export function readCurrentActivity(owner: string, domain: ActivityDomain): ActivityPointer | null {
  try {
    if (sessionStorage.getItem('userId') !== owner) return null;
    const value = JSON.parse(sessionStorage.getItem(activityKey(owner, domain)) || 'null');
    return value && typeof value.contentId === 'string' && typeof value.attemptId === 'string' ? value : null;
  } catch { return null; }
}
