// Shared wording for section selection and the preparation screen.
export const TEST_SECTION_DURATION = {
  LISTENING: "Kayıt süresi + 10 dk kontrol",
  READING: "60 dakika",
  WRITING: "60 dakika",
  SPEAKING: "Süreler bölüme göre değişir",
} as const;

export function formatListeningPreparationDuration(prepared: {
  audioDurationSeconds?: number | null;
  reviewDurationSeconds?: number | null;
}) {
  const audioSeconds = prepared.audioDurationSeconds;
  if (typeof audioSeconds !== "number" || !Number.isFinite(audioSeconds) || audioSeconds <= 0) {
    return TEST_SECTION_DURATION.LISTENING;
  }
  const format = (duration: number) => {
    const seconds = Math.max(1, Math.round(duration));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return [minutes ? `${minutes} dk` : "", remainder ? `${remainder} sn` : ""].filter(Boolean).join(" ");
  };
  const reviewSeconds = typeof prepared.reviewDurationSeconds === "number" &&
    Number.isFinite(prepared.reviewDurationSeconds) && prepared.reviewDurationSeconds > 0
      ? prepared.reviewDurationSeconds : 600;
  return `${format(audioSeconds)} + ${format(reviewSeconds)} kontrol`;
}
