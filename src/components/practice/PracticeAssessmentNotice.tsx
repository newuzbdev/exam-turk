import type { AccessDecision } from '@/services/access.service';

export default function PracticeAssessmentNotice({ isPublicFree, decision, className = 'mt-1 text-xs text-[#5f5e5a]' }: {
  isPublicFree: boolean;
  decision?: AccessDecision;
  className?: string;
}) {
  if (!isPublicFree) return null;
  const hasFreeAssessment = decision &&
    ['ADMIN', 'PUBLIC', 'SHARE'].includes(decision.sourceKind ?? '') &&
    (decision.remaining.PRACTICE_AI ?? 0) > 0;
  return <p className={className}>
    {hasFreeAssessment
      ? 'Ücretsiz çalış · Tanımlı AI değerlendirme hakkı'
      : 'Ücretsiz çalış · Değerlendirme abonelikle'}
  </p>;
}
