import { useCallback, useSyncExternalStore } from "react";

export type WritingInputMode = "turkish-keyboard" | "long-press";

export const getWritingPresentationInputMode = (mode: WritingInputMode | null, mobile: boolean) =>
  mobile ? "turkish-keyboard" : mode;

const listeners = new Set<() => void>();
const memoryFallback = new Map<string, WritingInputMode>();
const storageKey = (testId: string | null, sessionToken: string | null) =>
  testId && sessionToken
    ? `writing_input_mode_${encodeURIComponent(testId)}_${encodeURIComponent(sessionToken)}`
    : null;

export const writingInputModeStore = {
  get(testId: string | null, sessionToken: string | null): WritingInputMode | null {
    const key = storageKey(testId, sessionToken);
    if (!key) return null;
    const fallback = memoryFallback.get(key);
    if (fallback) return fallback;
    try {
      const value = sessionStorage.getItem(key);
      return value === "turkish-keyboard" || value === "long-press" ? value : null;
    } catch {
      return null;
    }
  },
  set(testId: string | null, sessionToken: string | null, mode: WritingInputMode) {
    const key = storageKey(testId, sessionToken);
    if (!key) return;
    try {
      sessionStorage.setItem(key, mode);
      memoryFallback.delete(key);
    } catch {
      // Keep the current attempt usable when browser storage is unavailable.
      memoryFallback.set(key, mode);
    }
    listeners.forEach((listener) => listener());
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useWritingInputMode(testId: string | null, sessionToken: string | null) {
  const getSnapshot = useCallback(
    () => writingInputModeStore.get(testId, sessionToken),
    [testId, sessionToken],
  );
  const mode = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const setMode = useCallback(
    (value: WritingInputMode) => writingInputModeStore.set(testId, sessionToken, value),
    [testId, sessionToken],
  );
  return [mode, setMode] as const;
}
