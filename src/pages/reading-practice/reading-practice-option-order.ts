export type ReadingPracticeOption = {
  label: string;
  value: string;
};

export type DisplayReadingPracticeOption = ReadingPracticeOption & {
  displayLetter: string;
};

const seedFromText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const stableShuffle = <T,>(items: readonly T[], seedText: string): T[] => {
  const shuffled = [...items];
  let state = seedFromText(seedText || "reading-practice");

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((item, index) => item === items[index])) {
    const offset = (state % (shuffled.length - 1)) + 1;
    return [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
  }

  return shuffled;
};

export const buildStableDisplayOptions = (
  options: readonly ReadingPracticeOption[],
  attemptSeed: string,
  scope: string,
): DisplayReadingPracticeOption[] =>
  stableShuffle(options, `${attemptSeed}:${scope}`).map((option, index) => ({
    ...option,
    displayLetter: String.fromCharCode(65 + index),
  }));

export const displayLetterForValue = (
  options: readonly DisplayReadingPracticeOption[],
  canonicalValue: unknown,
) =>
  options.find((option) => option.value === String(canonicalValue ?? ""))?.displayLetter ||
  String(canonicalValue ?? "");
