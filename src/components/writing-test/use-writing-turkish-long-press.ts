import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";

import {
  getTurkishLongPressCharacter,
  TURKISH_LONG_PRESS_DELAY_MS,
} from "./writing-turkish-input";

interface PendingTurkishLongPress {
  key: string;
  character: string;
  textarea: HTMLTextAreaElement;
  contextKey: string;
  value: string;
  caret: number;
  mac: boolean;
  ready: boolean;
  timerId: number;
}

interface UseWritingTurkishLongPressInputOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  contextKey: string | null;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

export const useWritingTurkishLongPressInput = ({
  textareaRef,
  contextKey,
  disabled = false,
  onValueChange,
}: UseWritingTurkishLongPressInputOptions) => {
  const [lastLongPressCharacter, setLastLongPressCharacter] = useState<
    string | null
  >(null);
  const contextKeyRef = useRef(contextKey);
  const disabledRef = useRef(disabled);
  const onValueChangeRef = useRef(onValueChange);
  const pendingLongPressRef = useRef<PendingTurkishLongPress | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const isMac = typeof navigator !== "undefined" &&
    /Mac/i.test(navigator.platform) && !(navigator.maxTouchPoints > 1);

  contextKeyRef.current = contextKey;
  disabledRef.current = disabled;
  onValueChangeRef.current = onValueChange;

  const cancelPendingLongPress = useCallback(() => {
    const pending = pendingLongPressRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timerId);
    if (pending.mac) pending.textarea.readOnly = false;
    pendingLongPressRef.current = null;
  }, []);

  const showLongPressFeedback = useCallback((character: string) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setLastLongPressCharacter(character);
    feedbackTimerRef.current = window.setTimeout(() => {
      setLastLongPressCharacter(null);
      feedbackTimerRef.current = null;
    }, 650);
  }, []);

  useEffect(() => {
    cancelPendingLongPress();
  }, [contextKey, disabled, cancelPendingLongPress]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) cancelPendingLongPress();
    };
    window.addEventListener("blur", cancelPendingLongPress);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelPendingLongPress();
      window.removeEventListener("blur", cancelPendingLongPress);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [cancelPendingLongPress]);

  const commitLongPress = useCallback((pending: PendingTurkishLongPress) => {
    const { textarea, caret, character, value } = pending;
    if (
      textareaRef.current !== textarea || contextKeyRef.current !== pending.contextKey ||
      disabledRef.current || textarea.disabled || textarea.readOnly ||
      document.activeElement !== textarea || textarea.value !== value ||
      textarea.selectionStart !== caret || textarea.selectionEnd !== caret || caret < 1
    ) return;

    const nextValue = value.slice(0, caret - 1) + character + value.slice(caret);
    if (pending.mac) {
      textarea.setSelectionRange(caret - 1, caret);
      try {
        document.execCommand("insertText", false, character);
      } catch { /* Keep the original character if native editing is unavailable. */ }
      textarea.setSelectionRange(caret, caret);
      if (textarea.value !== nextValue) return;
    }
    onValueChangeRef.current(nextValue);
    showLongPressFeedback(character);
    if (!pending.mac) {
      window.requestAnimationFrame(() => {
        if (textareaRef.current === textarea && contextKeyRef.current === pending.contextKey &&
            document.activeElement === textarea && textarea.value === nextValue) {
          textarea.setSelectionRange(caret, caret);
        }
      });
    }
  }, [showLongPressFeedback, textareaRef]);

  const handleLongPressKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.nativeEvent.isComposing ||
        disabledRef.current
      ) {
        cancelPendingLongPress();
        return;
      }

      const character = getTurkishLongPressCharacter(
        event.key,
        event.shiftKey,
      );
      if (event.repeat) {
        if (character) event.preventDefault();
        return;
      }

      cancelPendingLongPress();
      if (!character) return;

      const textarea = event.currentTarget;
      const activeContextKey = contextKeyRef.current;
      if (!activeContextKey || textarea.disabled || textarea.readOnly || document.activeElement !== textarea) return;
      const before = textarea.value;
      const caret = textarea.selectionStart + event.key.length;
      const value = before.slice(0, textarea.selectionStart) + event.key + before.slice(textarea.selectionEnd);

      if (isMac) {
        if (typeof document.execCommand !== "function") return;
        let inserted = false;
        try {
          // Native insertion preserves undo history. Direct value assignments do not.
          inserted = document.execCommand("insertText", false, event.key);
        } catch { /* Leave ordinary native typing available. */ }
        if (textarea.value !== value || (!inserted && before === value)) return;
        event.preventDefault();
        onValueChangeRef.current(textarea.value);
        // Suppress the native accent picker while this key is held. Restore
        // editing before converting on release, and on every cancellation path.
        textarea.readOnly = true;
      }

      const pending: PendingTurkishLongPress = {
        key: event.key.toLocaleLowerCase("en-US"), character, textarea,
        contextKey: activeContextKey, value, caret, mac: isMac, ready: false,
        timerId: window.setTimeout(() => {
          if (pendingLongPressRef.current !== pending) return;
          if (pending.mac) {
            pending.ready = true;
          } else {
            pendingLongPressRef.current = null;
            commitLongPress(pending);
          }
        }, TURKISH_LONG_PRESS_DELAY_MS),
      };
      pendingLongPressRef.current = pending;
    },
    [cancelPendingLongPress, commitLongPress, isMac],
  );

  const handleLongPressKeyUp = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const pending = pendingLongPressRef.current;
      if (pending?.key === event.key.toLocaleLowerCase("en-US")) {
        cancelPendingLongPress();
        if (pending.mac && pending.ready) commitLongPress(pending);
      }
    },
    [cancelPendingLongPress, commitLongPress],
  );

  return {
    cancelPendingLongPress,
    handleLongPressKeyDown,
    handleLongPressKeyUp,
    lastLongPressCharacter,
  };
};
