import type { CSSProperties } from "react";

type ReadingFontSizeMode = "small" | "standard" | "large";

interface ReadingTypographyPreset {
  mode: ReadingFontSizeMode;
  menuValue: "0.9" | "1" | "1.1";
  scale: number;
  style: CSSProperties;
}

const FONT_PRESETS = {
  small: {
    bodySize: 16,
    bodyLineHeight: 25,
    questionSize: 15,
    questionLineHeight: 23,
    headingSize: 16,
    headingLineHeight: 23,
    passageTitleSize: 19,
    passageTitleLineHeight: 27,
  },
  standard: {
    bodySize: 17,
    bodyLineHeight: 26,
    questionSize: 16,
    questionLineHeight: 24,
    headingSize: 17,
    headingLineHeight: 24,
    passageTitleSize: 20,
    passageTitleLineHeight: 28,
  },
  large: {
    bodySize: 18,
    bodyLineHeight: 27,
    questionSize: 17,
    questionLineHeight: 25,
    headingSize: 18,
    headingLineHeight: 25,
    passageTitleSize: 21,
    passageTitleLineHeight: 29,
  },
} as const;

const modeForPreference = (preference: number): ReadingFontSizeMode =>
  preference <= 0.95
    ? "small"
    : preference >= 1.05
      ? "large"
      : "standard";

export const getReadingTypographyPreset = (
  preference: number,
): ReadingTypographyPreset => {
  const mode = modeForPreference(preference);
  const values = FONT_PRESETS[mode];
  const scale = values.bodySize / FONT_PRESETS.standard.bodySize;
  const baseValue = (target: number) => `${target / scale}px`;

  return {
    mode,
    menuValue: mode === "small" ? "0.9" : mode === "large" ? "1.1" : "1",
    scale,
    style: {
      ["--reading-font-scale" as string]: scale,
      ["--reading-body-size" as string]: baseValue(values.bodySize),
      ["--reading-body-line-height" as string]: baseValue(
        values.bodyLineHeight,
      ),
      ["--reading-question-size" as string]: baseValue(values.questionSize),
      ["--reading-question-line-height" as string]: baseValue(
        values.questionLineHeight,
      ),
      ["--reading-heading-size" as string]: baseValue(values.headingSize),
      ["--reading-heading-line-height" as string]: baseValue(
        values.headingLineHeight,
      ),
      ["--reading-passage-title-size" as string]: baseValue(
        values.passageTitleSize,
      ),
      ["--reading-passage-title-line-height" as string]: baseValue(
        values.passageTitleLineHeight,
      ),
    } as CSSProperties,
  };
};
