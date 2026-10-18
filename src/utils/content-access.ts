import type { AccessDecision, AccessDecisionItem, AccessTarget, CatalogGroup } from '@/services/access.service';

export const contentAccessKey = (target: AccessTarget) => `${target.scope}:${target.targetId || ''}`;
export const isContentLocked = (decision?: AccessDecision) => !decision?.canOpen || decision.sourceKind === 'SHARE';
export function canContinuePaid(decision: AccessDecision | undefined, bucket: keyof AccessDecision['remaining']) {
  const paidSource = decision?.sourceKind === 'PAID' ||
    (bucket === 'PRACTICE_AI' && decision?.sourceKind === 'PURCHASED_PACKAGE' && Boolean(decision.purchaseId));
  return decision?.canOpen === true && paidSource && (decision.remaining[bucket] ?? 0) > 0;
}
export function getContentStartIssue(targets: AccessTarget[], decisions: AccessDecisionItem[]) {
  for (const target of targets) {
    const decision = decisions.find(item => contentAccessKey(item.target) === contentAccessKey(target));
    if (!decision?.canOpen) return decision?.blockedReason || 'MEMBERSHIP_REQUIRED';
    const bucket = target.scope === 'MOCK_WRITING' || target.scope === 'MOCK_SPEAKING' ? target.scope : null;
    // Legacy free entry does not grant AI rights. Allocation remains authoritative.
    if (bucket && decision.sourceKind !== 'PURCHASED_PACKAGE' && decision.sourceKind !== 'LEGACY_FREE' && (decision.remaining[bucket] ?? 0) < 1) return 'AI_LIMIT';
  }
  return null;
}
export const initialFreeGroup = (groups: CatalogGroup[], explicitChoice: boolean) => explicitChoice ? undefined : groups.find(group => group.publicFreeCount > 0);
export function accessErrorMessage(reason: unknown): string | null {
  const error = reason as { response?: { status?: number; data?: { code?: string; message?: string; error?: string } } };
  const code = error?.response?.data?.code || error?.response?.data?.message || error?.response?.data?.error || '';
  if (/MEMBERSHIP_REQUIRED|Aktif üyelik gerekli/.test(code)) return 'Bu değerlendirme için abonelik veya tanımlı değerlendirme hakkı gerekiyor. Cevaplarınız korunuyor.';
  if (/EXPIRED/.test(code)) return 'Bu çalışma için erişiminiz sona ermiş. Cevaplarınız korunuyor.';
  if (/AI_LIMIT|ALLOWANCE|QUOTA/.test(code) || error?.response?.status === 402) return 'Bu çalışma için değerlendirme hakkınız kalmadı. Cevaplarınız korunuyor.';
  if (/EXPIRED|ACCESS_|MEMBERSHIP_REQUIRED/.test(code) || error?.response?.status === 403) return 'Bu çalışma için erişiminiz sona ermiş veya kapatılmış. Cevaplarınız korunuyor.';
  return null;
}
