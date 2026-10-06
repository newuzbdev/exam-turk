import type { accessService, AccessTarget, AccessDecision, AccessSessionInput } from '../services/access.service.ts';
import type { OwnedAccess } from './access-link-context.ts';

export type AccessEntry = OwnedAccess & { enabled: boolean; decision?: AccessDecision; ownerId?: string };
export async function prepareAccessEntry(api: Pick<typeof accessService, 'getConfig' | 'redeemShare' | 'createSession' | 'getDecisions'>, target: AccessTarget, token: string | null, saved?: OwnedAccess | null, onRedeemed?: (value: OwnedAccess) => void, isCurrent = () => true, allowMockSelection = false): Promise<AccessEntry> {
  const config = await api.getConfig();
  if (!config.enabled) {
    if (token !== null || saved?.redemptionId) throw new Error('ACCESS_SHARE_FEATURE_DISABLED');
    return { enabled: false, target };
  }
  if (!isCurrent()) throw new Error('ACCESS_ENTRY_INTERRUPTED');
  if (token !== null && !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
  const redemption = token !== null ? await api.redeemShare(token) : saved?.redemptionId ? saved : null;
  const actual = redemption?.target || target;
  if (target.scope.startsWith('PRACTICE_') && (actual.scope !== target.scope || actual.targetId !== target.targetId)) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
  if (target.scope.startsWith('MOCK_') && target.scope !== 'MOCK_PACKAGE' && (actual.scope !== target.scope || actual.targetId !== target.targetId)) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
  if (target.scope.startsWith('MOCK_') && !actual.scope.startsWith('MOCK_')) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
  if (target.scope === 'MOCK_PACKAGE' && actual.scope === 'MOCK_PACKAGE' && actual.targetId !== target.targetId) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
  const shareRedemptionId = redemption?.redemptionId;
  if (token && shareRedemptionId) onRedeemed?.({ target: actual, redemptionId: shareRedemptionId, endsAt: redemption?.endsAt });
  // Mock contexts need the explicit selection of published children in the start modal.
  if (target.scope.startsWith('MOCK_')) {
    if (!isCurrent()) throw new Error('ACCESS_ENTRY_INTERRUPTED');
    // Read-only live policy validates redemption ownership/window and actual package coverage.
    const [decision] = await api.getDecisions([target], undefined, shareRedemptionId);
    if (shareRedemptionId && (!decision?.shareTarget || decision.shareTarget.scope !== actual.scope || decision.shareTarget.targetId !== actual.targetId)) throw new Error('ACCESS_SHARE_CONTEXT_INVALID');
    if (!decision?.canOpen && !(decision && !shareRedemptionId && allowMockSelection)) throw new Error(shareRedemptionId ? 'ACCESS_SHARE_CONTEXT_INVALID' : 'ACCESS_ENTRY_DENIED');
    return { enabled: true, target: actual, redemptionId: shareRedemptionId, endsAt: decision.endsAt || redemption?.endsAt, decision };
  }
  const input: AccessSessionInput = shareRedemptionId ? { shareRedemptionId } : {};
  if (!isCurrent()) throw new Error('ACCESS_ENTRY_INTERRUPTED');
  const session = await api.createSession(actual, input);
  return { enabled: true, ...session, target: actual, redemptionId: shareRedemptionId, endsAt: redemption?.endsAt };
}
