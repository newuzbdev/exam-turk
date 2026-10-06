type PronunciationBand =
  | "CLEAR"
  | "MOSTLY_CLEAR"
  | "OFTEN_UNCLEAR"
  | "UNSCORABLE";

type FrequencyBand = "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";

type ExperimentalPronunciationRecording = {
  status?: string | null;
  pronunciation?: {
    status?: string | null;
    intelligibility?: PronunciationBand | null;
    listenerEffort?: FrequencyBand | null;
    meaningImpact?: FrequencyBand | null;
    misunderstanding?: FrequencyBand | null;
  } | null;
};

type ExperimentalPronunciationScoreInput = {
  officialScore: unknown;
  recordings?: ExperimentalPronunciationRecording[] | null;
};

export type ExperimentalPronunciationScore = {
  officialScore: number;
  pronunciationScore: number;
  experimentalScore: number;
  trustedRecordingCount: number;
};

const INTELLIGIBILITY_POINTS: Record<Exclude<PronunciationBand, "UNSCORABLE">, number> = {
  CLEAR: 75,
  MOSTLY_CLEAR: 50,
  OFTEN_UNCLEAR: 25,
};

const FREQUENCY_POINTS: Record<Exclude<FrequencyBand, "UNSCORABLE">, number> = {
  NONE: 75,
  OCCASIONAL: 50,
  FREQUENT: 25,
};

const finiteScore = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 75) return null;
  return parsed;
};

const scoreRecording = (recording: ExperimentalPronunciationRecording) => {
  const pronunciation = recording.pronunciation;
  if (
    recording.status !== "RELIABLE" ||
    pronunciation?.status !== "RELIABLE" ||
    !pronunciation.intelligibility ||
    pronunciation.intelligibility === "UNSCORABLE" ||
    !pronunciation.listenerEffort ||
    pronunciation.listenerEffort === "UNSCORABLE" ||
    !pronunciation.meaningImpact ||
    pronunciation.meaningImpact === "UNSCORABLE" ||
    !pronunciation.misunderstanding ||
    pronunciation.misunderstanding === "UNSCORABLE"
  ) {
    return null;
  }

  return (
    INTELLIGIBILITY_POINTS[pronunciation.intelligibility] +
    FREQUENCY_POINTS[pronunciation.listenerEffort] +
    FREQUENCY_POINTS[pronunciation.meaningImpact] +
    FREQUENCY_POINTS[pronunciation.misunderstanding]
  ) / 4;
};

export const calculateExperimentalPronunciationScore = ({
  officialScore,
  recordings,
}: ExperimentalPronunciationScoreInput): ExperimentalPronunciationScore | null => {
  const normalizedOfficialScore = finiteScore(officialScore);
  if (normalizedOfficialScore === null || !Array.isArray(recordings)) return null;

  const recordingScores = recordings
    .map(scoreRecording)
    .filter((value): value is number => value !== null);
  if (recordingScores.length === 0) return null;

  const pronunciationScore = Math.round(
    recordingScores.reduce((total, value) => total + value, 0) /
      recordingScores.length,
  );

  return {
    officialScore: normalizedOfficialScore,
    pronunciationScore,
    experimentalScore: Math.round(
      normalizedOfficialScore * 0.8 + pronunciationScore * 0.2,
    ),
    trustedRecordingCount: recordingScores.length,
  };
};
