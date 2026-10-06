export type SpeakingDisplayInput = {
  status?: string | null;
  score?: number | string | null;
  storedLevel?: string | null;
};

export const levelFromSpeaking75 = (score: number): string => {
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

export function resolveSpeakingResultDisplay(input: SpeakingDisplayInput) {
  if (["PENDING", "FAILED"].includes(String(input.status).toUpperCase())) {
    return { score: null, level: "—" };
  }

  const score = input.score;
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 75
  ) {
    return { score: null, level: "—" };
  }
  return { score, level: levelFromSpeaking75(score) };
}
