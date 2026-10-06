export function formatSectionScore(score: number | null | undefined): number | null {
  return score == null || !Number.isFinite(score) ? null : Math.round(score * 10) / 10;
}
