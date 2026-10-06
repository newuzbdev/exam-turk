export type SavedSpeakingAnswer = {
  text: string;
  duration: number;
  audioClientId?: string;
  transcriptionStatus?: 'PENDING' | 'SUCCESS';
};

export function restoreSpeakingAnswers(entries: unknown): Map<string, SavedSpeakingAnswer> {
  const answers = new Map<string, SavedSpeakingAnswer>();
  if (!Array.isArray(entries)) return answers;
  for (const entry of entries) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !entry[0].trim()) continue;
    const value = entry[1];
    const duration = Number(value?.duration);
    const audioClientId = typeof value?.audioClientId === 'string' ? value.audioClientId.trim() : '';
    answers.set(entry[0], {
      text: typeof value?.text === 'string' ? value.text : typeof value === 'string' ? value : '',
      duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
      ...(audioClientId ? { audioClientId } : {}),
      ...(['PENDING', 'SUCCESS'].includes(value?.transcriptionStatus) ? { transcriptionStatus: value.transcriptionStatus } : {}),
    });
  }
  return answers;
}

export const serializeSpeakingAnswers = (answers: Map<string, SavedSpeakingAnswer>) =>
  Array.from(restoreSpeakingAnswers(Array.from(answers.entries())).entries());

export const getSpeakingAudioConstraints = (deviceId?: string | null): MediaTrackConstraints => ({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 44100,
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
});

export const speakingMicrophoneStorageKey = (testId: string) => `speaking_microphone_${testId}`;
export const speakingProgressStorageKey = (testId: string, overallTestId: string) =>
  `speaking_progress_${overallTestId}:${testId}`;

export const shouldRestoreSpeakingCapture = (
  recording: { questionId: string; audioClientId: string },
  answer: SavedSpeakingAnswer | undefined,
  currentQuestionId?: string | null,
) => recording.questionId === currentQuestionId &&
  answer?.audioClientId === recording.audioClientId && answer.transcriptionStatus !== 'SUCCESS';

export const isExpiredSpeakingCaptureMissing = (state: {
  sectionExpired: boolean;
  phase?: string;
  hasPendingCapture: boolean;
  hasActiveCapture: boolean;
  answer?: SavedSpeakingAnswer;
}) => state.sectionExpired && state.phase === 'RECORDING_IN_PROGRESS' &&
  !state.hasPendingCapture && !state.hasActiveCapture && state.answer?.transcriptionStatus !== 'SUCCESS';

type PhaseDeadline = {
  serverNow: string;
  outerExpiresAt?: string | null;
  recordingExpiresAt?: string | null;
  prepExpiresAt?: string | null;
  promptExpectedEndsAt?: string | null;
};

export function createSpeakingDeadline(
  phase: PhaseDeadline,
  field: 'recordingExpiresAt' | 'prepExpiresAt' | 'promptExpectedEndsAt',
  monotonicNow: number,
): number | null {
  const expiresAt = Date.parse(phase[field] || '');
  const serverNow = Date.parse(phase.serverNow);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(serverNow)) return null;
  const outerExpiresAt = Date.parse(phase.outerExpiresAt || '');
  const deadline = Number.isFinite(outerExpiresAt) ? Math.min(expiresAt, outerExpiresAt) : expiresAt;
  return monotonicNow + Math.max(0, deadline - serverNow);
}

export const remainingSpeakingMilliseconds = (deadline: number | null, monotonicNow: number) =>
  deadline === null ? null : Math.max(0, deadline - monotonicNow);

// Capture completion must never wait for the transcription provider. The caller
// retains the Blob and its identity until both operations have succeeded.
export async function finalizeSpeakingCapture<T>(actions: {
  preserve: () => void | Promise<void>;
  finalize: () => Promise<unknown>;
  transcribe: () => Promise<T>;
}): Promise<T> {
  await Promise.all([Promise.resolve().then(actions.preserve), Promise.resolve().then(actions.finalize)]);
  return actions.transcribe();
}
