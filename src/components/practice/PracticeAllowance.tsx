import { readOwnedAccess } from '@/utils/access-link-context';
import { useAuth } from '@/contexts/AuthContext';
import { useContentAccessDecisions } from '@/hooks/use-content-access';
import type { AccessTarget } from '@/services/access.service';
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import {
  subscriptionService,
  subscriptionStatusQueryKey,
} from "@/services/subscription.service";

export default function PracticeAllowance({ target }: { target?: AccessTarget }) {
  const { user } = useAuth();
  const redemptionId = user?.id && target ? readOwnedAccess(user.id, target)?.redemptionId : undefined;
  const access = useContentAccessDecisions(target ? [target] : [], redemptionId);
  const decision = target ? access.decisionFor(target) : undefined;
  const status = useQuery({
    queryKey: user?.id ? [...subscriptionStatusQueryKey, user.id] : subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    enabled: isSubscriptionBillingEnabled,
    retry: 1,
  });
  if (!isSubscriptionBillingEnabled) return null;
  return (
    <div
      className="shrink-0 border-b border-[#e5e5e2] px-4 py-2 text-xs text-[#777570]"
      role="status"
    >
      {access.enabled && decision?.canOpen && (decision.sourceKind === 'PUBLIC' || decision.sourceKind === 'ADMIN' || decision.sourceKind === 'SHARE') ? (
        <>Bu içeriğe özel {decision.remaining.PRACTICE_AI ?? 0} değerlendirme hakkı{decision.endsAt ? ` · ${new Date(decision.endsAt).toLocaleString('tr-TR')} tarihine kadar` : ''}. Değerlendirmede tekrar kontrol edilir.</>
      ) : status.isPending ? (
        "Pratik haklarınız yükleniyor…"
      ) : status.isError ? (
        "Pratik haklarınız alınamadı."
      ) : status.data?.isActive ? (
        <>
          Ücretli üyeliğinizde yazma ve konuşma için ortak{" "}
          <strong className="text-[#37352f]">
            {status.data.practiceRemaining}
          </strong>{" "}
          değerlendirme kaldı.
          {status.data.practiceRemaining === 0 && (
            <>
              {" "}
              <Link className="underline" to="/app/fiyatlar">
                Üyeliği yenile
              </Link>
            </>
          )}
        </>
      ) : (
        <>
          İçeriğe özel bir değerlendirme hakkınız yoksa{" "}
          <Link className="underline" to="/app/fiyatlar">
            aktif üyelik
          </Link>{" "}
          gerekir.
        </>
      )}
    </div>
  );
}
