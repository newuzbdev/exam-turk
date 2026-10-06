import type { OverallSectionPrepareResponse } from "./overallTest.service";

type PreparedListeningSection = {
  sessionToken: string;
  preparedSection: OverallSectionPrepareResponse;
  audioBlob: Blob;
  preparedAt: number;
  startRequested: boolean;
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
  ) => {
    preparedSections.set(testId, {
      sessionToken,
      preparedSection,
      audioBlob,
      preparedAt: Date.now(),
      startRequested: false,
    });
  },

  get: (testId: string, sessionToken: string) =>
    getFreshEntry(testId, sessionToken),

  markStartRequested: (testId: string, sessionToken: string) => {
    const entry = getFreshEntry(testId, sessionToken);
    if (!entry) return false;
    entry.startRequested = true;
    return true;
  },

  clear: (testId: string) => {
    preparedSections.delete(testId);
  },
};

export const verifyListeningAudioBlob = (
  audioBlob: Blob,
  timeoutMs = 20_000,
) =>
  new Promise<void>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = document.createElement("audio");
    let settled = false;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      audio.removeEventListener("canplay", handleReady);
      audio.removeEventListener("error", handleError);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const handleReady = () => finish();
    const handleError = () =>
      finish(new Error("Dinleme sesi hazırlanamadı."));
    timeoutId = window.setTimeout(
      () => finish(new Error("Dinleme sesi hazırlanamadı.")),
      timeoutMs,
    );

    audio.preload = "auto";
    audio.addEventListener("canplay", handleReady, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    audio.src = objectUrl;
    audio.load();
  });
