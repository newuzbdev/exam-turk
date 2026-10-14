import type { OverallSectionPrepareResponse } from "./overallTest.service";

export type PreparedListeningAudioPlayback = {
  audio: HTMLAudioElement;
  objectUrl: string;
  unlockFromUserGesture: () => Promise<void>;
  dispose: () => void;
};

type PreparedListeningSection = {
  sessionToken: string;
  preparedSection: OverallSectionPrepareResponse;
  audioBlob: Blob;
  preparedAt: number;
  startRequested: boolean;
  startAtMs: number | null;
  playback: PreparedListeningAudioPlayback | null;
};

const PREPARATION_TTL_MS = 10 * 60 * 1000;
const preparedSections = new Map<string, PreparedListeningSection>();

const getFreshEntry = (
  testId: string,
  sessionToken: string,
): PreparedListeningSection | null => {
  const entry = preparedSections.get(testId);
  if (!entry) return null;

  const expired = Date.now() - entry.preparedAt > PREPARATION_TTL_MS;
  if (expired || entry.sessionToken !== sessionToken) {
    entry.playback?.dispose();
    preparedSections.delete(testId);
    return null;
  }

  return entry;
};

export const listeningPreparationStore = {
  set: (
    testId: string,
    sessionToken: string,
    preparedSection: OverallSectionPrepareResponse,
    audioBlob: Blob,
    playback: PreparedListeningAudioPlayback | null = null,
  ) => {
    const previous = preparedSections.get(testId);
    if (previous?.playback !== playback) previous?.playback?.dispose();
    preparedSections.set(testId, {
      sessionToken,
      preparedSection,
      audioBlob,
      preparedAt: Date.now(),
      startRequested: false,
      startAtMs: null,
      playback,
    });
  },

  get: (testId: string, sessionToken: string) =>
    getFreshEntry(testId, sessionToken),

  markStartRequested: (testId: string, sessionToken: string) => {
    const entry = getFreshEntry(testId, sessionToken);
    if (!entry) return false;
    if (entry.startRequested) return true;
    entry.startRequested = true;
    entry.startAtMs = Date.now() + 3000;
    return true;
  },

  take: (testId: string, sessionToken: string) => {
    const entry = getFreshEntry(testId, sessionToken);
    if (entry) preparedSections.delete(testId);
    return entry;
  },

  clear: (testId: string) => {
    preparedSections.get(testId)?.playback?.dispose();
    preparedSections.delete(testId);
  },
};

const waitForPreparedAudio = (audio: HTMLAudioElement, timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
    if (audio.readyState >= 3) { resolve(); return; }
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      audio.removeEventListener("canplay", ready);
      audio.removeEventListener("error", failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Dinleme sesi hazırlanamadı.")); };
    const timeoutId = window.setTimeout(failed, timeoutMs);
    audio.addEventListener("canplay", ready, { once: true });
    audio.addEventListener("error", failed, { once: true });
  });

// Prime the same native player that the exam will use. A later route must not
// replace it with a new element that Safari has never admitted for playback.
const SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

export const prepareListeningAudioPlayback = async (
  audioBlob: Blob,
  timeoutMs = 20_000,
): Promise<PreparedListeningAudioPlayback> => {
  const objectUrl = URL.createObjectURL(audioBlob);
  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(objectUrl);
  };
  audio.src = objectUrl;
  const ready = waitForPreparedAudio(audio, timeoutMs);
  audio.load();
  try { await ready; }
  catch (error) { dispose(); throw error; }

  return {
    audio,
    objectUrl,
    dispose,
    unlockFromUserGesture: async () => {
      if (disposed) throw new Error("Dinleme sesi yeniden hazırlanmalı.");
      audio.src = SILENT_AUDIO;
      audio.muted = false;
      audio.currentTime = 0;
      try {
        // Called synchronously by the warning page's start-button gesture.
        await audio.play();
        audio.pause();
        if (disposed) throw new Error("Dinleme hazırlığı iptal edildi.");
        audio.src = objectUrl;
        const playable = waitForPreparedAudio(audio, timeoutMs);
        audio.load();
        await playable;
        audio.currentTime = 0;
      } catch (error) {
        if (!disposed) {
          audio.pause();
          audio.src = objectUrl;
          audio.load();
        }
        throw error;
      }
    },
  };
};

export const verifyListeningAudioBlob = async (audioBlob: Blob, timeoutMs = 20_000) => {
  const playback = await prepareListeningAudioPlayback(audioBlob, timeoutMs);
  playback.dispose();
};
