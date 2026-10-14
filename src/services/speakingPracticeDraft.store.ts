// Audio stays in the browser until the learner restarts, evaluates, or logs out.
export type SpeakingAudioDraft = {
  version: 1;
  runId: string;
  questionIndex: number;
  updatedAt: number;
  paidAccessContextId?: string;
  recordings: Record<string, { blob: Blob; durationSeconds: number }>;
};

const DATABASE = "tm-speaking-practice-drafts";
const STORE = "drafts";
const PREFIX = "tm_speaking_draft_v1:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
let database: Promise<IDBDatabase | null> | undefined;
const writes = new Map<string, Promise<unknown>>();

export function speakingPracticeDraftScope(owner: string | null, contentId: string, contextId: string | undefined, questionKeys: string[]) {
  return owner ? JSON.stringify([owner, contentId, contextId || "study", questionKeys]) : null;
}

function openDatabase() {
  if (!database) database = new Promise<IDBDatabase | null>(resolve => {
    if (typeof indexedDB === "undefined") { resolve(null); return; }
    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => { database = undefined; resolve(null); };
      request.onblocked = () => { database = undefined; resolve(null); };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        resolve(db);
      };
    } catch { database = undefined; resolve(null); }
  });
  return database;
}

async function operation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  if (!db) throw new Error("DRAFT_STORAGE_UNAVAILABLE");
  return new Promise<T>((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || new Error("DRAFT_WRITE_ABORTED"));
      transaction.onerror = () => reject(transaction.error || new Error("DRAFT_STORAGE_FAILED"));
    } catch (error) { reject(error); }
  });
}

function enqueue<T>(scope: string, run: () => Promise<T>): Promise<T> {
  const next = (writes.get(scope) || Promise.resolve()).catch(() => {}).then(run);
  writes.set(scope, next);
  void next.finally(() => { if (writes.get(scope) === next) writes.delete(scope); }).catch(() => {});
  return next;
}

function validDraft(value: unknown): value is SpeakingAudioDraft {
  const draft = value as SpeakingAudioDraft | null;
  return !!draft && draft.version === 1 && typeof draft.runId === "string" &&
    Number.isInteger(draft.questionIndex) && draft.questionIndex >= 0 &&
    Number.isFinite(draft.updatedAt) && Date.now() - draft.updatedAt <= MAX_AGE_MS &&
    !!draft.recordings && typeof draft.recordings === "object" && !Array.isArray(draft.recordings) &&
    Object.values(draft.recordings).every(item => item?.blob instanceof Blob && item.blob.size > 0 && Number.isFinite(item.durationSeconds) && item.durationSeconds > 0);
}

async function serialize(draft: SpeakingAudioDraft) {
  const recordings: Record<string, { data: string; type: string; durationSeconds: number }> = {};
  for (const [key, recording] of Object.entries(draft.recordings)) {
    const bytes = new Uint8Array(await recording.blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    recordings[key] = { data: btoa(binary), type: recording.blob.type, durationSeconds: recording.durationSeconds };
  }
  return JSON.stringify({ ...draft, recordings });
}

function deserialize(raw: string | null): unknown {
  if (!raw) return null;
  const draft = JSON.parse(raw);
  if (!draft?.recordings || typeof draft.recordings !== "object") return null;
  const recordings: SpeakingAudioDraft["recordings"] = {};
  for (const [key, item] of Object.entries(draft.recordings) as [string, { data: string; type: string; durationSeconds: number }][]) {
    if (typeof item?.data !== "string") return null;
    const bytes = Uint8Array.from(atob(item.data), character => character.charCodeAt(0));
    recordings[key] = { blob: new Blob([bytes], { type: item.type }), durationSeconds: item.durationSeconds };
  }
  return { ...draft, recordings };
}

export async function loadSpeakingPracticeDraft(scope: string | null): Promise<SpeakingAudioDraft | null> {
  if (!scope) return null;
  await writes.get(scope)?.catch(() => {});
  let draft: unknown;
  try { draft = await operation("readonly", store => store.get(scope)); } catch { /* Use session fallback. */ }
  if (!draft) {
    try { draft = deserialize(sessionStorage.getItem(PREFIX + scope)); } catch { /* Damaged or unavailable storage. */ }
  }
  if (validDraft(draft)) return draft;
  if (draft) await deleteSpeakingPracticeDraft(scope);
  return null;
}

export function saveSpeakingPracticeDraft(scope: string | null, draft: SpeakingAudioDraft): Promise<boolean> {
  if (!scope) return Promise.resolve(false);
  return enqueue(scope, async () => {
    try {
      await operation("readwrite", store => store.put(draft, scope));
      try { sessionStorage.removeItem(PREFIX + scope); } catch { /* IndexedDB committed. */ }
      return true;
    } catch {
      try { sessionStorage.setItem(PREFIX + scope, await serialize(draft)); return true; }
      catch { return false; }
    }
  });
}

export function deleteSpeakingPracticeDraft(scope: string | null) {
  if (!scope) return Promise.resolve();
  return enqueue(scope, async () => {
    try { await operation("readwrite", store => store.delete(scope)); } catch { /* Storage may be disabled. */ }
    try { sessionStorage.removeItem(PREFIX + scope); } catch { /* Storage may be disabled. */ }
  });
}

export async function clearSpeakingPracticeDrafts(owner: string | null) {
  if (!owner) return;
  const owned = (key: string) => { try { return JSON.parse(key)[0] === owner; } catch { return false; } };
  const queued = [...writes].filter(([scope]) => owned(scope)).map(([, write]) => write);
  await Promise.allSettled(queued);
  try {
    const keys = await operation("readonly", store => store.getAllKeys());
    await Promise.all(keys.filter((key): key is string => typeof key === "string" && owned(key)).map(deleteSpeakingPracticeDraft));
  } catch { /* Session fallback is cleared below. */ }
  try {
    Object.keys(sessionStorage).filter(key => key.startsWith(PREFIX) && owned(key.slice(PREFIX.length))).forEach(key => sessionStorage.removeItem(key));
  } catch { /* Storage may be disabled. */ }
}
