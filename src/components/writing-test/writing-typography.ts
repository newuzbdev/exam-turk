import type { CSSProperties } from "react";

type WritingFontSizeMode = "small" | "standard" | "large";

interface WritingTypographyPreset {
  mode: WritingFontSizeMode;
  menuValue: "0.9" | "1" | "1.1";
  scale: number;
  style: CSSProperties;
}

const FONT_PRESETS = {
  small: {
    bodySize: 15,
    bodyLineHeight: 24,
    questionSize: 15,
    questionLineHeight: 23,
    headingSize: 16,
    headingLineHeight: 23,
    passageTitleSize: 18,
    passageTitleLineHeight: 26,
  },
  standard: {
    bodySize: 16,
    bodyLineHeight: 25,
    questionSize: 16,
    questionLineHeight: 24,
    headingSize: 17,
    headingLineHeight: 24,
    passageTitleSize: 19,
    passageTitleLineHeight: 27,
  },
  large: {
    bodySize: 17,
    bodyLineHeight: 26,
    questionSize: 17,
    questionLineHeight: 25,
    headingSize: 18,
    headingLineHeight: 25,
    passageTitleSize: 20,
    passageTitleLineHeight: 28,
  },
} as const;

const modeForPreference = (preference: number): WritingFontSizeMode =>
  preference <= 0.95 ? "small" : preference >= 1.05 ? "large" : "standard";

export const getWritingTypographyPreset = (
  preference: number,
): WritingTypographyPreset => {
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
