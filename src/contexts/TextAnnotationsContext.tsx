import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode, type SetStateAction } from "react";

export type TextHighlight = { id: string; start: number; end: number; noteId?: string };
const PREFIX = "tm_text_annotations_v1:";

// Keys contain an attempt identity and a text fingerprint, never the session token.
export function annotationFingerprint(text: string) {
  let first = 2166136261;
  let second = 5381;
  for (let i = 0; i < text.length; i += 1) {
    first = Math.imul(first ^ text.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ text.charCodeAt(i);
  }
  return `${text.length}:${first >>> 0}:${second >>> 0}`;
}

export function textAnnotationScope(kind: string, contentId?: string, attemptId?: string | null) {
  try {
    const owner = sessionStorage.getItem("userId");
    return owner && contentId && attemptId ? JSON.stringify([owner, kind, contentId, attemptId]) : null;
  } catch { return null; }
}

function createAnnotationStore(scopeKey?: string | null) {
  const storageKey = scopeKey ? PREFIX + scopeKey : null;
  let values: Record<string, unknown> = {};
  try {
    const saved = storageKey ? JSON.parse(sessionStorage.getItem(storageKey) || "null") : null;
    if (saved?.version === 1 && saved.values && typeof saved.values === "object" && !Array.isArray(saved.values)) values = saved.values;
  } catch { /* Unavailable or damaged storage must not interrupt the test. */ }
  const initialized = new Set<string>();
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    get<T,>(key: string, initial: T, decode?: (value: unknown) => T): T {
      if (!initialized.has(key)) {
        const saved = values[key];
        values[key] = saved === undefined ? initial : decode ? decode(saved) :
          Array.isArray(initial) ? (Array.isArray(saved) ? saved : initial) :
          (saved && typeof saved === "object" && !Array.isArray(saved) ? saved : initial);
        initialized.add(key);
      }
      return values[key] as T;
    },
    set<T,>(key: string, update: SetStateAction<T>, initial: T) {
      const previous = this.get(key, initial);
      const next = typeof update === "function" ? (update as (value: T) => T)(previous) : update;
      if (Object.is(previous, next)) return;
      values[key] = next;
      try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify({ version: 1, values })); }
      catch { /* Keep the in-memory marks when browser storage is full/disabled. */ }
      listeners.forEach((listener) => listener());
    },
  };
}

const TextAnnotationsContext = createContext<ReturnType<typeof createAnnotationStore> | null>(null);

export function TextAnnotationsProvider({ scopeKey, children }: { scopeKey?: string | null; children: ReactNode }) {
  const store = useMemo(() => createAnnotationStore(scopeKey), [scopeKey]);
  return <TextAnnotationsContext.Provider value={store}>{children}</TextAnnotationsContext.Provider>;
}

export function useAnnotationState<T>(key: string, initial: T, decode?: (value: unknown) => T): [T, (update: SetStateAction<T>) => void] {
  const shared = useContext(TextAnnotationsContext);
  const local = useMemo(() => createAnnotationStore(), []);
  const store = shared ?? local;
  const initialRef = useRef(initial);
  const snapshot = useCallback(() => store.get(key, initialRef.current, decode), [decode, key, store]);
  const value = useSyncExternalStore(store.subscribe, snapshot, snapshot);
  const setValue = useCallback((update: SetStateAction<T>) => store.set(key, update, initialRef.current), [key, store]);
  return [value, setValue];
}

export function useTextHighlights(text: string, annotationId: string): [TextHighlight[], (update: SetStateAction<TextHighlight[]>) => void, string] {
  const key = JSON.stringify(["ranges", annotationId, annotationFingerprint(text)]);
  const [highlights, setHighlights] = useAnnotationState<TextHighlight[]>(key, [], (value) =>
    Array.isArray(value) ? value.filter((mark): mark is TextHighlight =>
      !!mark && typeof mark.id === "string" && Number.isInteger(mark.start) && Number.isInteger(mark.end) &&
      mark.start >= 0 && mark.end > mark.start && mark.end <= text.length &&
      (mark.noteId === undefined || typeof mark.noteId === "string")) : [],
  );
  return [highlights, setHighlights, key];
}
