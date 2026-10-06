import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accessService, type AccessTarget } from '@/services/access.service';
import { clearPendingShare, INVALID_ACCESS_LINK_MESSAGE, readOwnedAccess, readPendingShareForTarget, readPendingShareRevision, removeOwnedAccess, saveOwnedAccess } from '@/utils/access-link-context';
import { prepareAccessEntry, type AccessEntry } from '@/utils/access-link-entry';

export function useAccessLink(target: AccessTarget | null, allowMockSelection = false) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const scope = target?.scope;
  const targetId = target?.targetId;
  const [state, setState] = useState<{ entry: AccessEntry | null; loading: boolean; error: string; invalid: boolean; key: string }>({ entry: null, loading: Boolean(target), error: '', invalid: false, key: '' });
  const [revision, setRevision] = useState(0);
  const pendingRevision = useSyncExternalStore(subscribePendingShare, readPendingShareRevision, () => '0');
  const key = `${userId || ''}:${scope || ''}:${targetId || ''}`;
  useEffect(() => {
    let active = true;
    if (!scope || !targetId || !isAuthenticated) return;
    if (!userId) {
      // The disabled rollout keeps the existing auth/entry contract. An enabled
      // feature always requires a confirmed account before owned ID creation.
      void accessService.getConfig().then(config => {
        if (active) setState({ entry: config.enabled ? null : { enabled: false, target: { scope, targetId } }, loading: false, error: config.enabled ? 'Hesabınız doğrulanamadı. Lütfen yeniden giriş yapın.' : '', invalid: false, key });
      }).catch(() => { if (active) setState({ entry: null, loading: false, error: 'Erişiminiz şu anda doğrulanamadı. Lütfen yeniden deneyin.', invalid: false, key }); });
      return () => { active = false; };
    }
    const currentTarget = { scope, targetId };
    const token = readPendingShareForTarget(currentTarget);
    const saved = readOwnedAccess(userId, currentTarget);
    setState({ entry: null, loading: true, error: '', invalid: false, key });
    void prepareAccessEntry(accessService, currentTarget, token, saved, value => {
      if (!active || readAccessOwner() !== userId) throw new Error('ACCESS_ENTRY_INTERRUPTED');
      saveOwnedAccess(userId, currentTarget, value);
      if (readPendingShareForTarget(currentTarget) === token) clearPendingShare();
    }, () => active && readAccessOwner() === userId, allowMockSelection).then(entry => {
      if (!active || readAccessOwner() !== userId) return;
      if (entry.enabled) saveOwnedAccess(userId, currentTarget, entry);
      setState({ entry: { ...entry, ownerId: userId }, loading: false, error: '', invalid: false, key });
    }).catch((reason: unknown) => {
      if (!active || readAccessOwner() !== userId) return;
      const status = (reason as { response?: { status?: number } })?.response?.status;
      const invalid = Boolean(token !== null || saved?.redemptionId) && ([400, 403, 404].includes(status || 0) || (reason instanceof Error && reason.message === 'ACCESS_SHARE_CONTEXT_INVALID'));
      if (invalid && readPendingShareForTarget(currentTarget) === token) clearPendingShare();
      if (invalid) removeOwnedAccess(userId, currentTarget);
      setState({ entry: null, loading: false, error: invalid ? INVALID_ACCESS_LINK_MESSAGE : 'Erişiminiz şu anda doğrulanamadı. Lütfen yeniden deneyin.', invalid, key });
    });
    return () => { active = false; };
  }, [scope, targetId, userId, isAuthenticated, key, revision, pendingRevision, allowMockSelection]);
  return { entry: state.key === key ? state.entry : null, loading: Boolean(target) && (state.key !== key || state.loading), error: state.key === key ? state.error : '', invalid: state.key === key && state.invalid, retry: () => setRevision(value => value + 1) };
}
function subscribePendingShare(onChange: () => void) {
  window.addEventListener('access:share-pending', onChange);
  return () => window.removeEventListener('access:share-pending', onChange);
}

// Content components consume the context prepared by the entry action. They do
// not create or switch sources while loading content or evaluating a saved run.
export function useOwnedAccessContext(target: AccessTarget) {
  const accessContextId = useSyncExternalStore(subscribeAccessOwner, () => {
    const owner = readAccessOwner();
    return owner ? readOwnedAccess(owner, target)?.contextId : undefined;
  }, () => undefined);
  const userId = readAccessOwner();
  const forRun = (runId: string) => {
    if (readAccessOwner() !== userId) throw new Error('Hesabınız değişti. Bağlantıyı yeniden açın.');
    if (!userId || !accessContextId) return {};
    const runTarget = { ...target, targetId: `${target.targetId}:run:${runId}` };
    const saved = readOwnedAccess(userId, runTarget);
    if (saved?.contextId) return { accessContextId: saved.contextId };
    saveOwnedAccess(userId, runTarget, { target, contextId: accessContextId });
    return { accessContextId };
  };
  return { accessContextId, forRun };
}

function subscribeAccessOwner(onChange: () => void) {
  window.addEventListener('auth:user', onChange);
  window.addEventListener('auth:tokens', onChange);
  window.addEventListener('auth:access-context', onChange);
  return () => { window.removeEventListener('auth:user', onChange); window.removeEventListener('auth:tokens', onChange); window.removeEventListener('auth:access-context', onChange); };
}
export function readAccessOwner() {
  try { return sessionStorage.getItem('userId'); } catch { return null; }
}
