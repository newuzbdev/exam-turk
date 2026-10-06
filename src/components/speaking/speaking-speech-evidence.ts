export type SpeakingWordTiming = {
  word: string;
  punctuatedWord?: string;
  start: number;
  end: number;
};

export type SpeakingFluencyEvidence = {
  wordCount: number;
  speechRateWordsPerMinute?: number;
  speechWindowDurationSeconds?: number;
  articulationRateWordsPerMinute?: number;
  pauseCount: number;
  longPauseCount: number;
  totalPauseSeconds: number;
  maxPauseSeconds: number;
  pauseSegments: SpeakingPauseSegment[];
};

export type SpeakingPauseSegment = {
  start: number;
  end: number;
  durationSeconds: number;
  kind: "PAUSE" | "LONG_PAUSE";
};

export type SpeakingUtteranceSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
  wordStartIndex: number;
  wordEndIndex: number;
};

export type SpeakingSentenceTimelineSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
  textStart: number;
  textEnd: number;
  pauseAfterSeconds: number;
};

export type SpeakingTranscriptTrust = {
  status: "TRUSTED" | "MIXED" | "UNRELIABLE" | "UNVERIFIED";
};

export type SpeakingIntelligibilityEvidence = {
  status: "CLEAR" | "PARTIAL" | "UNCERTAIN" | "UNAVAILABLE";
  label: string;
};

export type SpeakingSpeechEvidence = {
  measuredDurationSeconds?: number;
  wordTimings: SpeakingWordTiming[];
  utterances: SpeakingUtteranceSegment[];
  transcriptTrust: SpeakingTranscriptTrust;
  intelligibility: SpeakingIntelligibilityEvidence;
  fluency: SpeakingFluencyEvidence;
  pronunciationStatus: "AUXILIARY_NOT_SCORED" | "NOT_EVALUATED";
};

export type SpeakingFlowDisplay = {
  durationSeconds: number;
  speakingRateWordsPerMinute?: number;
  totalPauseSeconds: number;
  noticeablePauseSeconds: number;
  noticeablePauses: SpeakingPauseSegment[];
};

export type SpeakingFlowTimeRange = {
  start: number;
  end: number;
};

export type SpeakingFlowBarTone =
  | "issue"
  | "pause"
  | "played"
  | "remaining";

export const getSpeakingFlowBarTone = (
  second: number,
  playedThroughSeconds: number,
  noticeablePauses: SpeakingPauseSegment[],
  issueTimeRanges: SpeakingFlowTimeRange[],
): SpeakingFlowBarTone => {
  if (
    issueTimeRanges.some(
      (range) => second >= range.start && second <= range.end,
    )
  ) {
    return "issue";
  }
  if (
    noticeablePauses.some(
      (pause) => second >= pause.start && second <= pause.end,
    )
  ) {
    return "pause";
  }
  return second <= playedThroughSeconds ? "played" : "remaining";
};

export const SPEAKING_FLOW_NOTICEABLE_PAUSE_SECONDS = 3;
export const SPEAKING_FLOW_BOUNDARY_SILENCE_SECONDS = 5;

type SpeakingTimingInterval = { start: number; end: number; durationSeconds: number };

// Derived intervals only: never rewrite stored word order or STT timestamps.
const normalizeSpeakingTimingIntervals = (values: unknown[], bound?: number): SpeakingTimingInterval[] => {
  const intervals = values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const { start, end } = value as { start?: unknown; end?: unknown };
    if (typeof start !== "number" || typeof end !== "number" ||
        !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start ||
        (bound !== undefined && start >= bound)) return [];
    const boundedEnd = bound === undefined ? end : Math.min(end, bound);
    return [{ start, end: boundedEnd, durationSeconds: boundedEnd - start }];
  }).sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: SpeakingTimingInterval[] = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
      previous.durationSeconds = previous.end - previous.start;
    } else merged.push({ ...interval });
  }
  return merged;
};

const deriveSpeakingTimingIntervals = (words: unknown[], pauses: unknown[], bound?: number, explicitWordCount?: unknown) => {
  const wordIntervals = words.map((word) => normalizeSpeakingTimingIntervals([word], bound)[0]);
  const completeChronologicalCoverage = words.length > 0 && !(typeof explicitWordCount === "number" && Number.isFinite(explicitWordCount) && explicitWordCount > words.length) && wordIntervals.every((word, index) =>
    word !== undefined && (index === 0 ||
      (wordIntervals[index - 1] !== undefined && word.start >= wordIntervals[index - 1]!.start)));
  const speech = normalizeSpeakingTimingIntervals(words, bound);
  const storedPauses = pauses.flatMap((pause) => normalizeSpeakingTimingIntervals([pause], bound));
  // Missing first/last rows cannot prove boundary silence. Legacy pauses still
  // remain usable independently of incomplete word timing coverage.
  const firstWordStart = completeChronologicalCoverage ? speech[0]?.start : undefined;
  const lastWordEnd = completeChronologicalCoverage ? speech[speech.length - 1]?.end : undefined;
  // Stored pauses remain useful when historical word timings are partial.
  // Remove any known speech coverage from them, then union duplicates.
  const fragments = storedPauses.flatMap((pause) => {
    let pieces = [pause];
    for (const word of speech) pieces = pieces.flatMap((piece) => {
      if (word.end <= piece.start || word.start >= piece.end) return [piece];
      return [
        ...(word.start > piece.start ? [{ start: piece.start, end: word.start, durationSeconds: word.start - piece.start }] : []),
        ...(word.end < piece.end ? [{ start: word.end, end: piece.end, durationSeconds: piece.end - word.end }] : []),
      ];
    });
    return pieces;
  });
  const allPauses = normalizeSpeakingTimingIntervals(fragments, bound);
  const internalPauses = allPauses.filter((pause) =>
    (firstWordStart === undefined || pause.start >= firstWordStart) &&
    (lastWordEnd === undefined || pause.end <= lastWordEnd));
  // Derive gaps from complete usable word coverage only when no legacy gaps exist.
  if (storedPauses.length === 0 && completeChronologicalCoverage) {
    for (let index = 1; index < speech.length; index += 1) {
      const start = speech[index - 1].end;
      const end = speech[index].start;
      if (end - start >= 0.6) internalPauses.push({ start, end, durationSeconds: end - start });
    }
  }
  const significantInternalPauses = storedPauses.length === 0
    ? internalPauses.filter((pause) => pause.durationSeconds >= 3)
    : normalizeSpeakingTimingIntervals(fragments.filter((pause) => pause.durationSeconds >= 3), bound)
      .filter((pause) => (firstWordStart === undefined || pause.start >= firstWordStart) &&
        (lastWordEnd === undefined || pause.end <= lastWordEnd));
  return { allPauses, internalPauses, significantInternalPauses, firstWordStart, lastWordEnd };
};

const roundSpeakingFlowSeconds = (value: number) =>
  Math.round(value * 100) / 100;

export const calculateSpeakingFlowSeekSeconds = (
  pointerX: number,
  timelineLeft: number,
  timelineWidth: number,
  durationSeconds: number,
) => {
  if (
    !Number.isFinite(pointerX) ||
    !Number.isFinite(timelineLeft) ||
    !Number.isFinite(timelineWidth) ||
    !Number.isFinite(durationSeconds) ||
    timelineWidth <= 0 ||
    durationSeconds <= 0
  ) {
    return 0;
  }

  const ratio = Math.min(
    Math.max((pointerX - timelineLeft) / timelineWidth, 0),
    1,
  );
  return ratio * durationSeconds;
};

export const buildSpeakingFlowDisplay = (
  evidence: SpeakingSpeechEvidence | undefined,
  audioDurationSeconds?: number | null,
): SpeakingFlowDisplay | undefined => {
  if (!evidence) return undefined;

  const validDuration = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  // Evidence metadata takes precedence over a legacy row duration. Decoded
  // media is supplied as an evidence override by the player after loading.
  const durationSeconds = validDuration(evidence.measuredDurationSeconds)
    ? evidence.measuredDurationSeconds
    : validDuration(audioDurationSeconds) ? audioDurationSeconds : undefined;
  if (durationSeconds === undefined || durationSeconds <= 0) return undefined;
  const { internalPauses, significantInternalPauses, firstWordStart, lastWordEnd } = deriveSpeakingTimingIntervals(
    evidence.wordTimings, evidence.fluency.pauseSegments, durationSeconds, evidence.fluency.wordCount,
  );
  const boundaryPauses: SpeakingPauseSegment[] = [];
  const leadingSilenceSeconds = firstWordStart ?? 0;
  if (
    firstWordStart !== undefined &&
    leadingSilenceSeconds >= SPEAKING_FLOW_BOUNDARY_SILENCE_SECONDS
  ) {
    boundaryPauses.push({
      start: 0,
      end: firstWordStart,
      durationSeconds: leadingSilenceSeconds,
      kind: "LONG_PAUSE",
    });
  }
  const trailingSilenceSeconds =
    lastWordEnd === undefined ? 0 : Math.max(0, durationSeconds - lastWordEnd);
  if (
    lastWordEnd !== undefined &&
    trailingSilenceSeconds >= SPEAKING_FLOW_BOUNDARY_SILENCE_SECONDS
  ) {
    boundaryPauses.push({
      start: lastWordEnd,
      end: durationSeconds,
      durationSeconds: trailingSilenceSeconds,
      kind: "LONG_PAUSE",
    });
  }
  const noticeablePauses = [
    ...significantInternalPauses,
    ...boundaryPauses,
  ].sort((left, right) => left.start - right.start);
  const totalPauseSeconds = roundSpeakingFlowSeconds(
    [...internalPauses, ...boundaryPauses].reduce(
      (sum, pause) => sum + pause.durationSeconds,
      0,
    ),
  );
  const noticeablePauseSeconds = roundSpeakingFlowSeconds(
    noticeablePauses.reduce((sum, pause) => sum + pause.durationSeconds, 0),
  );
  const speakingRate = evidence.fluency.speechRateWordsPerMinute;

  return {
    durationSeconds,
    ...(typeof speakingRate === "number" && Number.isFinite(speakingRate)
      ? { speakingRateWordsPerMinute: Math.round(speakingRate) }
      : {}),
    totalPauseSeconds,
    noticeablePauseSeconds,
    noticeablePauses: noticeablePauses.map((pause) => ({
      ...pause, start: roundSpeakingFlowSeconds(pause.start), end: roundSpeakingFlowSeconds(pause.end),
      durationSeconds: roundSpeakingFlowSeconds(roundSpeakingFlowSeconds(pause.end) - roundSpeakingFlowSeconds(pause.start)),
      kind: evidence.fluency.pauseSegments.find((source) => source.start <= pause.start && source.end >= pause.end)?.kind ?? "LONG_PAUSE",
    })),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (
  value: unknown,
  options: { max: number; integer?: boolean; strict?: boolean },
): number | undefined => {
  if (options.strict && typeof value !== "number") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > options.max) {
    return undefined;
  }
  return options.integer ? Math.floor(parsed) : parsed;
};

const cleanWord = (value: unknown, maxLength = 120) =>
  (typeof value === "string" ? value : "")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizeTimingToken = (value: unknown) =>
  cleanWord(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]/gu, "");

type SpeakingTranscriptToken = {
  value: string;
  start: number;
  end: number;
};

const getSpeakingTranscriptTokens = (
  transcript: string,
): SpeakingTranscriptToken[] =>
  Array.from(
    transcript.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu),
  ).map((match) => ({
    value: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

const findSpeakingWordTiming = (
  transcriptTokens: SpeakingTranscriptToken[],
  targetIndex: number,
  wordTimings: SpeakingWordTiming[],
): SpeakingWordTiming | undefined => {
  const targetToken = normalizeTimingToken(transcriptTokens[targetIndex]?.value);
  if (!targetToken) return undefined;

  const matchesTarget = (timing: SpeakingWordTiming | undefined) =>
    Boolean(
      timing &&
        [timing.word, timing.punctuatedWord].some(
          (value) => normalizeTimingToken(value) === targetToken,
        ),
    );
  const directTiming = wordTimings[targetIndex];
  if (matchesTarget(directTiming) && directTiming &&
      Number.isFinite(directTiming.start) && Number.isFinite(directTiming.end) &&
      directTiming.start >= 0 && directTiming.end > directTiming.start) return directTiming;

  return undefined;
};

const roundTimelineValue = (value: number) => Math.round(value * 100) / 100;

export const buildSpeakingSentenceTimeline = (
  transcriptValue: unknown,
  wordTimingsValue: SpeakingWordTiming[],
  recordingDurationSeconds?: number,
): SpeakingSentenceTimelineSegment[] => {
  const transcript = typeof transcriptValue === "string" ? transcriptValue.trim() : "";
  if (!transcript || wordTimingsValue.length === 0) return [];

  const tokens = Array.from(
    transcript.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu),
  ).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const usableCount = Math.min(tokens.length, wordTimingsValue.length);
  if (usableCount === 0) return [];

  const segments: SpeakingSentenceTimelineSegment[] = [];
  let segmentStartIndex = 0;

  for (let index = 0; index < usableCount; index += 1) {
    const token = tokens[index];
    const timing = wordTimingsValue[index];
    const nextTiming = wordTimingsValue[index + 1];
    const punctuationAfter = transcript.slice(
      token.end,
      tokens[index + 1]?.start ?? transcript.length,
    );
    const pauseAfterSeconds = nextTiming && Number.isFinite(nextTiming.start) && Number.isFinite(timing.end)
      ? Math.max(0, nextTiming.start - timing.end)
      : 0;
    const endsSentence = /[.!?…]/u.test(punctuationAfter);
    const isLast = index === usableCount - 1;

    if (!endsSentence && !isLast) {
      continue;
    }

    const firstToken = tokens[segmentStartIndex];
    let textEnd = token.end;
    while (textEnd < transcript.length && /[.!?…,:;]/u.test(transcript[textEnd])) {
      textEnd += 1;
    }
    const text = transcript.slice(firstToken.start, textEnd).trim();
    const timeRange = findSpeakingEvidenceTimeRange(transcript, firstToken.start, textEnd, wordTimingsValue, recordingDurationSeconds);
    if (text && timeRange) {
      segments.push({
        id: `sentence-${segments.length + 1}`,
        start: timeRange.start,
        end: timeRange.end,
        text,
        textStart: firstToken.start,
        textEnd,
        pauseAfterSeconds: roundTimelineValue(pauseAfterSeconds),
      });
    }
    segmentStartIndex = index + 1;
  }

  return segments;
};

export const findSpeakingEvidenceStartSeconds = (
  transcriptValue: unknown,
  characterOffsetValue: unknown,
  wordTimingsValue: SpeakingWordTiming[],
  recordingDurationSeconds?: number,
): number | undefined => {
  const transcript = typeof transcriptValue === "string" ? transcriptValue : "";
  const characterOffset = typeof characterOffsetValue === "number" ? characterOffsetValue : NaN;
  if (!transcript || !Number.isFinite(characterOffset) || characterOffset < 0) {
    return undefined;
  }

  const transcriptTokens = getSpeakingTranscriptTokens(transcript);
  const targetIndex = transcriptTokens.findIndex(
    (token) => token.end > characterOffset,
  );
  if (targetIndex < 0 || wordTimingsValue.length === 0) return undefined;

  const timing = findSpeakingWordTiming(transcriptTokens, targetIndex, wordTimingsValue);
  return timing && (recordingDurationSeconds === undefined ||
    (Number.isFinite(recordingDurationSeconds) && recordingDurationSeconds >= 0 && timing.end <= recordingDurationSeconds))
    ? timing.start : undefined;
};

export const findSpeakingEvidenceTimeRange = (
  transcriptValue: unknown,
  characterStartValue: unknown,
  characterEndValue: unknown,
  wordTimingsValue: SpeakingWordTiming[],
  recordingDurationSeconds?: number,
): SpeakingFlowTimeRange | undefined => {
  const transcript = typeof transcriptValue === "string" ? transcriptValue : "";
  const characterStart = typeof characterStartValue === "number" ? characterStartValue : NaN;
  const characterEnd = typeof characterEndValue === "number" ? characterEndValue : NaN;
  if (
    !transcript ||
    !Number.isFinite(characterStart) ||
    !Number.isFinite(characterEnd) ||
    characterStart < 0 ||
    characterEnd <= characterStart || characterEnd > transcript.length ||
    wordTimingsValue.length === 0
  ) {
    return undefined;
  }

  const transcriptTokens = getSpeakingTranscriptTokens(transcript);
  const matchingTokenIndexes = transcriptTokens.flatMap((token, index) =>
    token.end > characterStart && token.start < characterEnd ? [index] : [],
  );
  const firstTokenIndex = matchingTokenIndexes[0];
  const lastTokenIndex = matchingTokenIndexes[matchingTokenIndexes.length - 1];
  if (firstTokenIndex === undefined || lastTokenIndex === undefined) {
    return undefined;
  }

  const quoteTimings = matchingTokenIndexes.map((index) => findSpeakingWordTiming(transcriptTokens, index, wordTimingsValue));
  if (quoteTimings.some((timing, index) => !timing ||
      (index > 0 && quoteTimings[index - 1] && timing.start < quoteTimings[index - 1]!.start) ||
      (recordingDurationSeconds !== undefined && timing.end > recordingDurationSeconds))) return undefined;
  const firstTiming = findSpeakingWordTiming(
    transcriptTokens,
    firstTokenIndex,
    wordTimingsValue,
  );
  const lastTiming = findSpeakingWordTiming(
    transcriptTokens,
    lastTokenIndex,
    wordTimingsValue,
  );
  if (!firstTiming || !lastTiming || lastTiming.end <= firstTiming.start ||
      (recordingDurationSeconds !== undefined && (!Number.isFinite(recordingDurationSeconds) ||
        recordingDurationSeconds < 0 || lastTiming.end > recordingDurationSeconds || firstTiming.end > recordingDurationSeconds))) {
    return undefined;
  }

  return {
    start: roundTimelineValue(firstTiming.start),
    end: roundTimelineValue(lastTiming.end),
  };
};

export const normalizeSpeakingSpeechEvidence = (
  value: unknown,
): SpeakingSpeechEvidence | undefined => {
  if (
    !isRecord(value) ||
    !["NOT_EVALUATED", "AUXILIARY_NOT_SCORED"].includes(
      String(value.pronunciationStatus || ""),
    )
  ) {
    return undefined;
  }

  const wordTimings = (Array.isArray(value.wordTimings) ? value.wordTimings : [])
    .slice(0, 5000)
    .flatMap((item): SpeakingWordTiming[] => {
      if (!isRecord(item)) return [{ word: "", start: NaN, end: NaN }];

      const word = cleanWord(item.word);
      const punctuatedWord = cleanWord(item.punctuatedWord);
      const start = toNumber(item.start, { max: 24 * 60 * 60, strict: true });
      const end = toNumber(item.end, { max: 24 * 60 * 60, strict: true });
      if (!word || start === undefined || end === undefined || end < start) {
        return [{ word, ...(punctuatedWord ? { punctuatedWord } : {}), start: NaN, end: NaN }];
      }

      return [
        {
          word,
          ...(punctuatedWord ? { punctuatedWord } : {}),
          start,
          end,
        },
      ];
    });

  const sourceFluency = isRecord(value.fluency) ? value.fluency : {};
  const utterances = (Array.isArray(value.utterances) ? value.utterances : [])
    .slice(0, 500)
    .flatMap((item, index): SpeakingUtteranceSegment[] => {
      if (!isRecord(item)) return [];
      const text = cleanWord(item.text, 4000);
      const start = toNumber(item.start, { max: 24 * 60 * 60, strict: true });
      const end = toNumber(item.end, { max: 24 * 60 * 60, strict: true });
      const wordStartIndex = toNumber(item.wordStartIndex, {
        max: 5000,
        integer: true,
      });
      const wordEndIndex = toNumber(item.wordEndIndex, {
        max: 5000,
        integer: true,
      });
      if (
        !text ||
        start === undefined ||
        end === undefined ||
        end < start ||
        wordStartIndex === undefined ||
        wordEndIndex === undefined ||
        wordEndIndex < wordStartIndex
      ) {
        return [];
      }
      return [
        {
          id: cleanWord(item.id) || String(index),
          start,
          end,
          text,
          wordStartIndex,
          wordEndIndex,
        },
      ];
    });
  const sourceTrust = isRecord(value.transcriptTrust) ? value.transcriptTrust : {};
  const trustStatus = String(sourceTrust.status || "UNVERIFIED").toUpperCase();
  const transcriptTrust: SpeakingTranscriptTrust = {
    status: ["TRUSTED", "MIXED", "UNRELIABLE"].includes(trustStatus)
      ? (trustStatus as SpeakingTranscriptTrust["status"])
      : "UNVERIFIED",
  };
  const sourceIntelligibility = isRecord(value.intelligibility)
    ? value.intelligibility
    : {};
  const intelligibilityStatus = String(
    sourceIntelligibility.status || "UNAVAILABLE",
  ).toUpperCase();
  const intelligibility: SpeakingIntelligibilityEvidence = {
    status: ["CLEAR", "PARTIAL", "UNCERTAIN"].includes(intelligibilityStatus)
      ? (intelligibilityStatus as SpeakingIntelligibilityEvidence["status"])
      : "UNAVAILABLE",
    label:
      cleanWord(sourceIntelligibility.label) ||
      (value.pronunciationStatus === "NOT_EVALUATED"
        ? "Henüz değerlendirilmedi"
        : "Güvenilir ölçüm yok"),
  };
  const pauseSegments = (
    Array.isArray(sourceFluency.pauseSegments) ? sourceFluency.pauseSegments : []
  )
    .slice(0, 1000)
    .flatMap((item): SpeakingPauseSegment[] => {
      if (!isRecord(item)) return [];
      const start = toNumber(item.start, { max: 24 * 60 * 60, strict: true });
      const end = toNumber(item.end, { max: 24 * 60 * 60, strict: true });
      const durationSeconds = toNumber(item.durationSeconds, {
        max: 24 * 60 * 60,
      });
      if (
        start === undefined ||
        end === undefined ||
        durationSeconds === undefined ||
        end < start
      ) {
        return [];
      }
      return [
        {
          start,
          end,
          durationSeconds,
          kind: item.kind === "LONG_PAUSE" ? "LONG_PAUSE" : "PAUSE",
        },
      ];
    });
  const fluency: SpeakingFluencyEvidence = {
    wordCount:
      toNumber(sourceFluency.wordCount, { max: 5000, integer: true }) ??
      wordTimings.length,
    speechRateWordsPerMinute: toNumber(
      sourceFluency.speechRateWordsPerMinute,
      { max: 1000 },
    ),
    speechWindowDurationSeconds: toNumber(
      sourceFluency.speechWindowDurationSeconds,
      { max: 24 * 60 * 60 },
    ),
    articulationRateWordsPerMinute: toNumber(
      sourceFluency.articulationRateWordsPerMinute,
      { max: 1000 },
    ),
    pauseCount:
      toNumber(sourceFluency.pauseCount, { max: 5000, integer: true }) ?? 0,
    longPauseCount:
      toNumber(sourceFluency.longPauseCount, {
        max: 5000,
        integer: true,
      }) ?? 0,
    totalPauseSeconds:
      toNumber(sourceFluency.totalPauseSeconds, { max: 24 * 60 * 60 }) ?? 0,
    maxPauseSeconds:
      toNumber(sourceFluency.maxPauseSeconds, { max: 24 * 60 * 60 }) ?? 0,
    pauseSegments,
  };

  const measuredDurationSeconds = toNumber(value.measuredDurationSeconds, {
    max: 24 * 60 * 60, strict: true,
  });

  return {
    ...(measuredDurationSeconds !== undefined
      ? { measuredDurationSeconds }
      : {}),
    wordTimings,
    utterances,
    transcriptTrust,
    intelligibility,
    fluency,
    pronunciationStatus:
      value.pronunciationStatus === "AUXILIARY_NOT_SCORED"
        ? "AUXILIARY_NOT_SCORED"
        : "NOT_EVALUATED",
  };
};
