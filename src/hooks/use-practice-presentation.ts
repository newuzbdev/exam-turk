import { useLayoutEffect, useRef, useState } from 'react';
import { setPracticePresentation } from '@/pages/reading-practice/practice-presentation';
import { EXAM_FULLSCREEN_EVENTS, exitExamFullscreen, getExamFullscreenElement, requestNativeFullscreen } from '@/utils/examFullscreen';

export type PracticeView = 'menu' | 'wide' | 'fullscreen';

export function usePracticePresentation(enabled = true) {
  const [focused, setFocused] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const pending = useRef(false);
  const ownsFullscreen = useRef(false);

  useLayoutEffect(() => {
    if (!enabled) return;
    active.current = true;
    setPracticePresentation(true);
    const sync = () => {
      const native = Boolean(getExamFullscreenElement());
      setFullscreen(native);
      if (native) {
        ownsFullscreen.current = true;
        setFocused(true);
        setPracticePresentation(true);
      }
    };
    EXAM_FULLSCREEN_EVENTS.forEach(name => document.addEventListener(name, sync));
    sync();
    return () => {
      active.current = false;
      EXAM_FULLSCREEN_EVENTS.forEach(name => document.removeEventListener(name, sync));
      setPracticePresentation(false);
      if (ownsFullscreen.current && getExamFullscreenElement()) void exitExamFullscreen();
    };
  }, [enabled]);

  const selectMode = async (next: PracticeView): Promise<boolean> => {
    if (!enabled || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (next === 'fullscreen') {
        // Call directly in the menu gesture so browser user activation is kept.
        const entered = await requestNativeFullscreen();
        if (!active.current) {
          if (entered) await exitExamFullscreen();
          return false;
        }
        if (!entered) {
          setError('Tam ekran açılamadı. Tarayıcınızın tam ekran desteğini ve izinlerini kontrol edin.');
          return false;
        }
        ownsFullscreen.current = true;
        setFullscreen(true);
      } else if (getExamFullscreenElement()) {
        if (!await exitExamFullscreen()) {
          if (active.current) setError('Tam ekrandan çıkılamadı. Esc tuşunu deneyin.');
          return false;
        }
      }
      if (!active.current) return false;
      const nextFocused = next !== 'menu';
      setFocused(nextFocused);
      setPracticePresentation(nextFocused);
      setFullscreen(Boolean(getExamFullscreenElement()));
      return true;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };

  return { focused, mode: fullscreen ? 'fullscreen' as const : focused ? 'wide' as const : 'menu' as const, selectMode, busy, error };
}

export type PracticePresentation = ReturnType<typeof usePracticePresentation>;
