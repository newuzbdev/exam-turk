import type { SpeakingPracticeEvaluation } from '@/services/practice.types';
import type { SpeakingAudioDraft } from '@/services/speakingPracticeDraft.store';

export type SpeakingRunStatus = {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  accessContextId?: string | null;
  result: SpeakingPracticeEvaluation | null;
};

// An uncertain sent request can still be in flight when status returns 404.
// Preserve its exact run/context; only known unsubmitted/rejected/failed work
// may move onto a fresh admission; failed/free-limit work also needs an explicit
// paid continuation so its free-only intent survives catalog return.
export async function reconcileSpeakingPracticeDraft(
  draft: SpeakingAudioDraft,
  originalContextId: string | undefined,
  nextContextId: string | undefined,
  rebind: boolean,
  readStatus: () => Promise<SpeakingRunStatus>,
  explicitPaidContinuation = false,
) {
  let status: SpeakingRunStatus | undefined;
  const knownUnaccepted = draft.assessmentAttempt?.state === 'UNSUBMITTED' || draft.assessmentAttempt?.state === 'REJECTED';
  if (!knownUnaccepted) {
    try { status = await readStatus(); } catch { /* An uncertain request keeps its original claim, including on 404. */ }
  }
  if (status?.status === 'COMPLETED' && status.result) return { draft, result: status.result };
  const mayReplace = draft.assessmentAttempt?.state === 'UNSUBMITTED' ||
    (draft.assessmentAttempt?.state === 'REJECTED' &&
      (explicitPaidContinuation || draft.assessmentAttempt.rejectionCode === 'MEMBERSHIP_REQUIRED')) ||
    (status?.status === 'FAILED' && explicitPaidContinuation);
  if (mayReplace) {
    return { draft: {
      ...draft,
      ...(rebind ? { runId: crypto.randomUUID(), paidAccessContextId: nextContextId } : {}),
      assessmentAttempt: { state: 'UNSUBMITTED' as const },
      updatedAt: Date.now(),
    }, result: null };
  }
  const accessContextId = status?.accessContextId ?? draft.assessmentAttempt?.accessContextId ?? draft.paidAccessContextId ?? originalContextId;
  return { draft: {
    ...draft, paidAccessContextId: accessContextId,
    assessmentAttempt: draft.assessmentAttempt?.state === 'REJECTED'
      ? { ...draft.assessmentAttempt, accessContextId }
      : { state: 'UNKNOWN' as const, accessContextId },
  }, result: null };
}
