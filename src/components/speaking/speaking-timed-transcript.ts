import type { SpeakingWordTiming } from "./speaking-speech-evidence";

const normalizeSpeakingQuestionText = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";

type SpeakingAlignmentToken = {
  normalized: string;
  text: string;
};

const getSpeakingAlignmentTokens = (value: unknown): SpeakingAlignmentToken[] =>
  Array.from(
    normalizeSpeakingQuestionText(value).matchAll(
      /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu,
    ),
  ).map((match) => ({
    text: match[0],
    normalized: match[0]
      .replace(/[Iİ]/gu, "i")
      .toLocaleLowerCase("tr-TR"),
  }));

const getLowestGappedSpeakingAlignmentCost = (
  source: SpeakingAlignmentToken[],
  target: SpeakingAlignmentToken[],
) => {
  const rows = source.length + 1;
  const columns = target.length + 1;
  const noGap = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(Number.POSITIVE_INFINITY),
  );
  const withGap = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(Number.POSITIVE_INFINITY),
  );
  noGap[0][0] = 0;

  for (let sourceIndex = 0; sourceIndex < rows; sourceIndex += 1) {
    for (let targetIndex = 0; targetIndex < columns; targetIndex += 1) {
      if (sourceIndex > 0 && targetIndex > 0) {
        const substitutionCost =
          source[sourceIndex - 1]?.normalized ===
          target[targetIndex - 1]?.normalized
            ? 0
            : 1;
        noGap[sourceIndex][targetIndex] =
          noGap[sourceIndex - 1][targetIndex - 1] + substitutionCost;
        withGap[sourceIndex][targetIndex] = Math.min(
          withGap[sourceIndex][targetIndex],
          withGap[sourceIndex - 1][targetIndex - 1] + substitutionCost,
        );
      }
      if (sourceIndex > 0) {
        withGap[sourceIndex][targetIndex] = Math.min(
          withGap[sourceIndex][targetIndex],
          noGap[sourceIndex - 1][targetIndex] + 1,
          withGap[sourceIndex - 1][targetIndex] + 1,
        );
      }
      if (targetIndex > 0) {
        withGap[sourceIndex][targetIndex] = Math.min(
          withGap[sourceIndex][targetIndex],
          noGap[sourceIndex][targetIndex - 1] + 1,
          withGap[sourceIndex][targetIndex - 1] + 1,
        );
      }
    }
  }

  return withGap[source.length][target.length];
};

// Gemini's heard transcript is the semantic source of truth, while Deepgram
// owns word timings. Replace the displayed text only when every Gemini token
// can safely keep the corresponding Deepgram timestamp. Otherwise the timed
// Deepgram transcript remains visible and audio-grounded feedback stays untimed.
export const selectSpeakingTimedTranscript = (
  deepgramTranscriptValue: unknown,
  heardTranscriptValue: unknown,
  wordTimings: SpeakingWordTiming[],
) => {
  const deepgramTranscript = normalizeSpeakingQuestionText(
    deepgramTranscriptValue,
  );
  const heardTranscript = normalizeSpeakingQuestionText(heardTranscriptValue);
  if (!deepgramTranscript || !heardTranscript || wordTimings.length === 0) {
    return { text: deepgramTranscript, usesHeardTranscript: false, wordTimings };
  }

  const deepgramTokens = getSpeakingAlignmentTokens(deepgramTranscript);
  const heardTokens = getSpeakingAlignmentTokens(heardTranscript);
  if (
    deepgramTokens.length === 0 ||
    deepgramTokens.length !== heardTokens.length ||
    wordTimings.length !== deepgramTokens.length
  ) {
    return { text: deepgramTranscript, usesHeardTranscript: false, wordTimings };
  }

  // A positional view is only valid when the original timing tokens and their
  // order agree with the persisted transcript. Do not filter invalid entries:
  // removing a timing would shift every following token index.
  const validTimingView = wordTimings.every((timing, index) => {
    const tokens = getSpeakingAlignmentTokens(timing.word);
    return tokens.length === 1 &&
      tokens[0].normalized === deepgramTokens[index].normalized &&
      Number.isFinite(timing.start) && Number.isFinite(timing.end) &&
      timing.start >= 0 && timing.end > timing.start &&
      (index === 0 || timing.start >= wordTimings[index - 1].end);
  });
  if (!validTimingView) {
    return { text: deepgramTranscript, usesHeardTranscript: false, wordTimings };
  }

  const matchingTokenCount = deepgramTokens.reduce(
    (count, token, index) =>
      count + (token.normalized === heardTokens[index]?.normalized ? 1 : 0),
    0,
  );
  const matchRatio = matchingTokenCount / deepgramTokens.length;
  const positionalSubstitutionCost =
    deepgramTokens.length - matchingTokenCount;
  const lowestGappedAlignmentCost = getLowestGappedSpeakingAlignmentCost(
    deepgramTokens,
    heardTokens,
  );
  const safelyAligned =
    matchingTokenCount === deepgramTokens.length ||
    (matchingTokenCount >= 3 &&
      matchRatio >= 0.6 &&
      positionalSubstitutionCost < lowestGappedAlignmentCost);

  return safelyAligned
    ? {
        text: heardTranscript,
        usesHeardTranscript: true,
        wordTimings: wordTimings.map((timing, index) => ({
          ...timing,
          word: heardTokens[index].text,
          ...(timing.punctuatedWord !== undefined
            ? { punctuatedWord: heardTokens[index].text }
            : {}),
        })),
      }
    : { text: deepgramTranscript, usesHeardTranscript: false, wordTimings };
};

