export type AccountNotice = {
  id: string;
  occurredAt: string;
  title: string;
  body: string;
  kind?: "GIFT" | "SUCCESS" | "UPDATE";
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export function accountNoticeState(userId: string, storage: Storage) {
  const key = `student-account-updates:${userId}`;
  let seen: string[] = [];
  let batch: string[] = [];
  try {
    const value = JSON.parse(storage.getItem(key) ?? "[]");
    if (Array.isArray(value))
      seen = value.filter((v) => typeof v === "string").slice(-100);
  } catch {
    /* A denied storage still has a session-local seen list. */
  }
  return {
    next(items: AccountNotice[]): AccountNotice | null {
      const unseen = items.filter((item) => !seen.includes(item.id));
      batch = unseen.map((item) => item.id);
      return unseen[0] ?? null;
    },
    dismiss(id: string) {
      seen = Array.from(new Set([...seen, id, ...batch])).slice(-100);
      try {
        storage.setItem(key, JSON.stringify(seen));
      } catch {
        /* Session-local dismissal remains available. */
      }
    },
  };
}
