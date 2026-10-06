import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { readAccessOwner } from '@/hooks/use-access-link';
import { accessService, type AccessTarget, type AccessMockSection } from '@/services/access.service';
import { accessErrorMessage, canContinuePaid } from '@/utils/content-access';
import MembershipRequiredDialog from './MembershipRequiredDialog';

export default function ContentAccessRecovery({ error, target, overallTestId, onClose, onPaid }: { error: unknown; target: AccessTarget; overallTestId?: string; onClose: () => void; onPaid?: (contextId: string) => void | Promise<void> }) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const message = error ? accessErrorMessage(error) : null;
  const { scope, targetId } = target;
  const bucket = scope === 'MOCK_WRITING' || scope === 'MOCK_SPEAKING' ? scope : scope === 'PRACTICE_WRITING' || scope === 'PRACTICE_SPEAKING' ? 'PRACTICE_AI' : null;
  useEffect(() => {
    let active = true;
    setEligible(false);
    setFailure('');
    if (!message || !ownerId) return;
    void accessService.getConfig().then(async config => {
      if (!config.enabled) return;
      const [decision] = await accessService.getDecisions([{ scope, targetId }], 'PAID');
      if (active && readAccessOwner() === ownerId) setEligible(bucket ? canContinuePaid(decision, bucket) : decision?.canOpen === true && decision.sourceKind === 'PAID');
    }).catch(() => { /* A failed lookup never offers paid continuation. */ });
    return () => { active = false; };
  }, [message, ownerId, scope, targetId, bucket]);
  const continuePaid = async () => {
    if (!ownerId || readAccessOwner() !== ownerId || busy) return;
    setBusy(true);
    try {
      // Check again on the explicit click; the displayed offer is not authority.
      const [decision] = await accessService.getDecisions([{ scope, targetId }], 'PAID');
      if (readAccessOwner() !== ownerId || !(bucket ? canContinuePaid(decision, bucket) : decision?.canOpen && decision.sourceKind === 'PAID')) throw new Error('Unavailable');
      const session = await accessService.createSession({ scope, targetId }, { mode: 'PAID' });
      if (readAccessOwner() !== ownerId) throw new Error('Account changed');
      const effective = overallTestId ? await accessService.continueMockPaid(overallTestId, { section: scope.slice(5) as AccessMockSection, accessContextId: session.contextId }) : session;
      if (readAccessOwner() !== ownerId) throw new Error('Account changed');
      await onPaid?.(effective.contextId);
      notifyAccessAllowanceChanged();
      onClose();
    } catch { setEligible(false); setFailure('Üyelik hakkınız doğrulanamadı. Cevaplarınız korunuyor; yeniden deneyebilirsiniz.'); }
    finally { setBusy(false); }
  };
  return <MembershipRequiredDialog open={Boolean(message)} onOpenChange={open => { if (!open && !busy) onClose(); }} title="Erişim / değerlendirme hakkı" description={failure || message || ''} catalogPath={scope.startsWith('MOCK_') ? '/app/test' : `/app/pratik?bolum=${scope.slice(9).toLowerCase()}`} onContinuePaid={eligible ? () => void continuePaid() : undefined} busy={busy} />;
}
