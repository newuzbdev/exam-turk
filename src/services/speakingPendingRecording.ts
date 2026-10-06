export type PendingSpeakingRecording = {
  questionId: string;
  audioClientId: string;
  duration: number;
  blob: Blob;
};

const STORE = 'pending';
const openStore = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open('turkishmock-speaking-capture', 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// At most one unfinished recording per exam attempt; successful uploads are
// removed. No session token is persisted in this database.
export async function savePendingSpeakingRecording(attemptId: string, recording: PendingSpeakingRecording) {
  const db = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      store.put({ ...recording, savedAt: Date.now() }, attemptId);
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const value = cursor.result;
        if (!value) return;
        if (value.value.savedAt < Date.now() - 24 * 60 * 60 * 1000) value.delete();
        value.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function loadPendingSpeakingRecording(attemptId: string): Promise<PendingSpeakingRecording | null> {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(attemptId);
      request.onsuccess = () => {
        const value = request.result;
        resolve(value && value.savedAt >= Date.now() - 24 * 60 * 60 * 1000 && value.blob instanceof Blob ? value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function removePendingSpeakingRecording(attemptId: string) {
  const db = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(attemptId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
