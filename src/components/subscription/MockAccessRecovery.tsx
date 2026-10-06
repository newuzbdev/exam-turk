import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { overallTestFlowStore } from '@/services/overallTest.service';
import type { AccessTarget } from '@/services/access.service';
import ContentAccessRecovery from './ContentAccessRecovery';
import { toast } from 'sonner';

export default function MockAccessRecovery() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<{ error: unknown; target: AccessTarget; overallTestId: string; ownerId: string } | null>(null);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ error: unknown; target: AccessTarget }>).detail;
      const overallTestId = overallTestFlowStore.getOverallId();
      if (overallTestId && user?.id) setBlocked({ ...detail, overallTestId, ownerId: user.id });
    };
    window.addEventListener('access:mock-blocked', listener);
    return () => window.removeEventListener('access:mock-blocked', listener);
  }, [user?.id]);
  if (!blocked || blocked.ownerId !== user?.id) return null;
  return <ContentAccessRecovery {...blocked} onClose={() => setBlocked(null)} onPaid={() => { toast.success('Üyelikle devam seçildi. Cevaplarınız korunuyor; aynı işlemi yeniden deneyebilirsiniz.'); }} />;
}
