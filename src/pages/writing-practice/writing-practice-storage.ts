export const writingPracticeStorageKeys = (id: string) => ({
  answer: `writing_practice_${id}`,
  evaluation: `writing_practice_evaluation_${id}`,
  duration: `practice_duration_writing_${id}`,
  access: `writing_practice_access_${id}`,
});

export const writingPracticeStorage = {
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      // A session draft remains usable when persistent storage is blocked.
    }
    try {
      const legacy = sessionStorage.getItem(key);
      if (legacy !== null) {
        try {
          localStorage.setItem(key, legacy);
        } catch {
          /* Keep the legacy draft. */
        }
      }
      return legacy;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Session storage is the fallback. */
    }
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* Persistent storage remains available. */
    }
  },
};

export const hasUnfinishedWritingPractice = (id: string): boolean => {
  try {
    const keys = writingPracticeStorageKeys(id);
    const answer = writingPracticeStorage.getItem(keys.answer) || "";
    if (!answer.trim()) return false;
    let saved;
    try {
      saved = JSON.parse(
        writingPracticeStorage.getItem(keys.evaluation) || "null",
      );
    } catch {
      // A broken evaluation cache does not discard an existing draft.
    }
    return !(
      saved?.evaluation?.evaluated === true &&
      saved.evaluation.answerText === answer
    );
  } catch {
    return false;
  }
};

export const clearWritingPracticeProgress = (id: string): void => {
  const keys = writingPracticeStorageKeys(id);
  for (const key of Object.values(keys)) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

// Opaque owned context pointer only; the server revalidates it on content/AI requests.
export function readWritingPracticeAccess(id: string): { ownerId: string; contextId: string; paidContinuationContextId?: string } | null {
  try {
    const value = JSON.parse(writingPracticeStorage.getItem(writingPracticeStorageKeys(id).access) || 'null');
    if (typeof value?.ownerId === 'string' && typeof value?.contextId === 'string') return {
      ownerId: value.ownerId, contextId: value.contextId,
      ...(typeof value.paidContinuationContextId === 'string' ? { paidContinuationContextId: value.paidContinuationContextId } : {}),
    };
    const run = JSON.parse(writingPracticeStorage.getItem(writingPracticeStorageKeys(id).evaluation) || 'null');
    return typeof run?.ownerId === 'string' && typeof run?.accessContextId === 'string' ? { ownerId: run.ownerId, contextId: run.accessContextId } : null;
  } catch { return null; }
}
export function saveWritingPracticeAccess(id: string, ownerId: string, contextId: string) {
  // A fresh normal/direct entry never replaces the provenance of an unfinished draft.
  const existing = readWritingPracticeAccess(id);
  if (existing && hasUnfinishedWritingPractice(id)) {
    if (existing.ownerId !== ownerId) throw new Error('Taslak başka bir hesaba ait.');
    return;
  }
  writingPracticeStorage.setItem(writingPracticeStorageKeys(id).access, JSON.stringify({ ownerId, contextId }));
}

export function saveWritingPracticePaidContinuation(id: string, ownerId: string, contextId: string) {
  const existing = readWritingPracticeAccess(id);
  if (existing && existing.ownerId !== ownerId && hasUnfinishedWritingPractice(id)) throw new Error('Taslak başka bir hesaba ait.');
  // This pointer records an explicit user choice, never a cached access decision.
  writingPracticeStorage.setItem(writingPracticeStorageKeys(id).access, JSON.stringify({
    ownerId, contextId: existing?.ownerId === ownerId ? existing.contextId : contextId,
    paidContinuationContextId: contextId,
  }));
}
