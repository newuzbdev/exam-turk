import type { WritingPracticeEvaluation } from '@/services/practice.types';

export type WritingPracticeRun = {
  runId: string;
  ownerId?: string;
  accessContextId?: string;
  answerText: string;
  context: string;
};
export type WritingRunStatus = { status: 'PENDING' | 'COMPLETED' | 'FAILED'; result: WritingPracticeEvaluation | null };

// Unknown/admitted work stays with its original claim. Only a confirmed failed
// or absent run can be replaced after an explicit paid continuation.
export async function reconcileWritingPracticeRun(run: WritingPracticeRun, paidContextId: string | undefined, readStatus: () => Promise<WritingRunStatus>) {
  let status: WritingRunStatus | undefined;
  let missing = false;
  try { status = await readStatus(); }
  catch (reason) { missing = (reason as { response?: { status?: number } })?.response?.status === 404; }
  if (paidContextId && paidContextId !== run.accessContextId && (missing || status?.status === 'FAILED')) {
    return { run: { ...run, runId: crypto.randomUUID(), accessContextId: paidContextId }, result: null };
  }
  return { run, result: status?.result || null };
}
