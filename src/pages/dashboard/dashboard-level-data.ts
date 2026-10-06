import { dashboardNumber } from './dashboard-home-data.ts';
import { getCefrLevelFromScore } from './dashboard-performance.ts';

/** Round display only; a boundary exception must stay below the next level. */
export function dashboardAverageNumber(score: number): string {
  const rounded = Math.round(score);
  return dashboardNumber(getCefrLevelFromScore(rounded) === getCefrLevelFromScore(score)
    ? rounded : Math.floor(score * 10) / 10);
}

// Display positions only. Assessment and CEFR classification stay unchanged.
export const LEVEL_THRESHOLDS = { B1: 38, B2: 51, C1: 65 } as const;
export const scorePosition = (score: number) => Math.min(75, Math.max(0, score)) / 75 * 100;
export const targetScore = (level: string | null | undefined): number | null =>
  level && Object.prototype.hasOwnProperty.call(LEVEL_THRESHOLDS, level)
    ? LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS]
    : null;

type LabelRange = { left: number; right: number };

export function pointerTooltipPosition(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return {
    left: Math.max(8, x + 12 + width <= viewportWidth - 8 ? x + 12 : x - width - 12),
    top: Math.max(8, y + 12 + height <= viewportHeight - 8 ? y + 12 : y - height - 12),
  };
}

/** Keep a small gap between the two display labels, even on narrow screens. */
export function levelLabelsOverlap(current: LabelRange | null, target: LabelRange | null): boolean {
  return current !== null && target !== null
    && current.right + 8 > target.left && target.right + 8 > current.left;
}

export function levelDistance(score: number, level: string) {
  const threshold = targetScore(level);
  if (threshold === null) return `B1 eşiğine ${dashboardNumber(38 - score)} puan kaldı.`;
  const distance = Math.round((score - threshold) * 10) / 10;
  return distance === 0 ? `${level} eşiğindesiniz.` : `${level} eşiğinin ${dashboardNumber(distance)} puan üzerinde.`;
}
