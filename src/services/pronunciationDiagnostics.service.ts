import axiosPrivate from "@/config/api";

export type DiagnosticTranscriptVerdict =
  | "DEEPGRAM"
  | "GOOGLE_STT"
  | "GEMINI"
  | "ADJUDICATOR"
  | "RESOLVED"
  | "OTHER";
export type DiagnosticPronunciationVerdict =
  "ACCURATE" | "INACCURATE" | "UNSURE";
export type DiagnosticCommunicationEffect =
  "NONE" | "LISTENER_EFFORT" | "MEANING_RISK";
export type DiagnosticProviderAlternative = {
  provider:
    | "DEEPGRAM"
    | "GOOGLE_STT"
    | "GEMINI_AUDIO"
    | "OPENAI_ADJUDICATOR"
    | "OTHER";
  text: string;
};
export type DiagnosticSpanResolution =
  | "AGREEMENT"
  | "DEEPGRAM_SELECTED"
  | "GOOGLE_SELECTED"
  | "LEARNER_VARIANT_CONFIRMED"
  | "PROTECTED_ENTITY"
  | "AMBIGUOUS"
  | "";
export type DiagnosticScorePolicy =
  | "FULL"
  | "CONTENT_ONLY"
  | "NO_NEGATIVE"
  | "";
export type DiagnosticLanguageHint =
  | "TR_STANDARD"
  | "UZ_TRANSFER"
  | "PROTECTED"
  | "UNKNOWN"
  | null;

export type PronunciationDiagnosticReview = {
  actualText: string;
  transcriptVerdict: DiagnosticTranscriptVerdict | null;
  pronunciationVerdict: DiagnosticPronunciationVerdict | null;
};

export type PronunciationDiagnosticReviewDto = {
  audioId: string;
  segmentId: string;
  actualText: string;
  transcriptVerdict: DiagnosticTranscriptVerdict;
  pronunciationVerdict: DiagnosticPronunciationVerdict;
};

export type PronunciationDiagnosticsResponse = {
  schemaVersion: 1;
  submissionId: string;
  updatedAt: string;
  reviews: Array<
    PronunciationDiagnosticReviewDto & {
      reviewedAt: string;
    }
  >;
  recordings: Array<{
    audioId: string;
    sectionKey: string;
    durationSeconds: number;
    deepgram: {
      text: string;
      words: Array<{
        text: string;
        startSeconds: number;
        endSeconds: number;
        confidence: number | null;
      }>;
    };
    google: {
      text: string;
      recordingQuality: "USABLE" | "LIMITED" | "UNUSABLE";
      intelligibility:
        "CLEAR" | "MOSTLY_CLEAR" | "OFTEN_UNCLEAR" | "UNSCORABLE";
      listenerEffort: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      meaningImpact: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      misunderstanding: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      segments: Array<{
        segmentId: string;
        startSeconds: number;
        endSeconds: number;
        text: string;
        communicationEffect: DiagnosticCommunicationEffect;
      }>;
    };
    googleCloud: {
      text: string;
      alternatives: Array<{
        text: string;
        confidence: number | null;
      }>;
      words: Array<{
        text: string;
        startSeconds: number;
        endSeconds: number;
        confidence: number | null;
      }>;
    };
    gemini: {
      text: string;
      recordingQuality: "USABLE" | "LIMITED" | "UNUSABLE";
      intelligibility:
        | "CLEAR"
        | "MOSTLY_CLEAR"
        | "OFTEN_UNCLEAR"
        | "UNSCORABLE";
      listenerEffort: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      meaningImpact: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      misunderstanding: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
      segments: Array<{
        segmentId: string;
        startSeconds: number;
        endSeconds: number;
        text: string;
        communicationEffect: DiagnosticCommunicationEffect;
      }>;
    };
    fusion: {
      pipelineVersion: "dual-asr-fusion-v1" | "";
      semanticText: string;
      verbatimText: string;
      status: "RELIABLE" | "LIMITED" | "UNAVAILABLE";
    };
    resolved: {
      displayText: string;
      trustedText: string;
      status: "RELIABLE" | "LIMITED" | "UNAVAILABLE";
      protectedTerms: Array<{
        canonical: string;
        observedForms: string[];
      }>;
      excludedRanges: Array<{
        startSeconds?: number;
        endSeconds?: number;
        reason:
          "PROTECTED_TERM" | "PROVIDER_DISAGREEMENT" | "LOW_AUDIO_QUALITY";
      }>;
    };
    comparisons: Array<{
      segmentId: string;
      startSeconds: number;
      endSeconds: number;
      deepgramText: string;
      deepgramWordConfidence: number | null;
      googleText: string;
      googleSttText: string;
      geminiText: string;
      adjudicatorText: string;
      selectedText: string;
      resolution: DiagnosticSpanResolution;
      scorePolicy: DiagnosticScorePolicy;
      languageHint: DiagnosticLanguageHint;
      providerAlternatives: DiagnosticProviderAlternative[];
      communicationEffect: DiagnosticCommunicationEffect;
      review: PronunciationDiagnosticReview;
    }>;
  }>;
};

type UnknownRecord = Record<string, unknown>;
type DiagnosticsRequestOptions = { signal?: AbortSignal };
type DiagnosticsHttpClient = {
  get(
    url: string,
    config: { timeout: number; signal?: AbortSignal },
  ): Promise<{ data: unknown }>;
  post(
    url: string,
    body: PronunciationDiagnosticReviewDto,
    config: { timeout: number; signal?: AbortSignal },
  ): Promise<{ data: unknown }>;
};

const MAX_RECORDINGS = 20;
const MAX_TRANSCRIPT_CHARACTERS = 8_000;
const MAX_IDENTIFIER_CHARACTERS = 100;
const MAX_SEGMENT_CHARACTERS = 500;
const MAX_CANDIDATE_CHARACTERS = 512;
const MAX_WORDS = 1_000;
const MAX_SEGMENTS = 200;
const MAX_COMPARISON_ROWS = 1_000;
const MAX_PROVIDER_ALTERNATIVES = 8;
const MAX_GOOGLE_ALTERNATIVES = 3;
const MAX_PROTECTED_TERMS = 50;
const MAX_OBSERVED_FORMS = 20;
const MAX_EXCLUDED_RANGES = 200;
const MAX_REVIEWS = 5_000;
const MAX_DURATION_SECONDS = 7_200;
const SAFE_DIAGNOSTIC_ID = /^[A-Za-z0-9_-]{1,100}$/u;

const TRANSCRIPT_VERDICTS = new Set<DiagnosticTranscriptVerdict>([
  "DEEPGRAM",
  "GOOGLE_STT",
  "GEMINI",
  "ADJUDICATOR",
  "RESOLVED",
  "OTHER",
]);
const PRONUNCIATION_VERDICTS = new Set<DiagnosticPronunciationVerdict>([
  "ACCURATE",
  "INACCURATE",
  "UNSURE",
]);
const COMMUNICATION_EFFECTS = new Set<DiagnosticCommunicationEffect>([
  "NONE",
  "LISTENER_EFFORT",
  "MEANING_RISK",
]);
const EVIDENCE_STATUSES = new Set([
  "RELIABLE",
  "LIMITED",
  "UNAVAILABLE",
] as const);
const RECORDING_QUALITIES = new Set(["USABLE", "LIMITED", "UNUSABLE"] as const);
const INTELLIGIBILITY = new Set([
  "CLEAR",
  "MOSTLY_CLEAR",
  "OFTEN_UNCLEAR",
  "UNSCORABLE",
] as const);
const FREQUENCIES = new Set([
  "NONE",
  "OCCASIONAL",
  "FREQUENT",
  "UNSCORABLE",
] as const);
const EXCLUDED_REASONS = new Set([
  "PROTECTED_TERM",
  "PROVIDER_DISAGREEMENT",
  "LOW_AUDIO_QUALITY",
] as const);
const DIAGNOSTIC_PROVIDERS = new Set([
  "DEEPGRAM",
  "GOOGLE_STT",
  "GEMINI_AUDIO",
  "OPENAI_ADJUDICATOR",
] as const);
const SPAN_RESOLUTIONS = new Set([
  "AGREEMENT",
  "DEEPGRAM_SELECTED",
  "GOOGLE_SELECTED",
  "LEARNER_VARIANT_CONFIRMED",
  "PROTECTED_ENTITY",
  "AMBIGUOUS",
] as const);
const SCORE_POLICIES = new Set([
  "FULL",
  "CONTENT_ONLY",
  "NO_NEGATIVE",
] as const);
const LANGUAGE_HINTS = new Set([
  "TR_STANDARD",
  "UZ_TRANSFER",
  "PROTECTED",
  "UNKNOWN",
] as const);

const asRecord = (value: unknown): UnknownRecord | null => {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null
      ? (value as UnknownRecord)
      : null;
  } catch {
    return null;
  }
};

const ownValue = (record: UnknownRecord | null, key: string): unknown => {
  if (!record) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
};

type BoundedOwnArray = {
  items: unknown[];
  inspectedSlots: number;
};

const ownArrayWindow = (value: unknown, maximum: number): BoundedOwnArray => {
  const safeMaximum = Number.isSafeInteger(maximum)
    ? Math.max(0, maximum)
    : 0;
  if (safeMaximum === 0) return { items: [], inspectedSlots: 0 };

  let inspectedSlots = 0;
  try {
    if (!Array.isArray(value)) {
      return { items: [], inspectedSlots: 0 };
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const rawLength =
      lengthDescriptor && "value" in lengthDescriptor
        ? lengthDescriptor.value
        : undefined;
    if (!Number.isSafeInteger(rawLength) || rawLength < 0) {
      return { items: [], inspectedSlots: 0 };
    }
    inspectedSlots = Math.min(rawLength, safeMaximum);
    const items: unknown[] = [];
    for (let index = 0; index < inspectedSlots; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor && "value" in descriptor) items.push(descriptor.value);
    }
    return { items, inspectedSlots };
  } catch {
    return { items: [], inspectedSlots };
  }
};

const ownArrayItems = (value: unknown, maximum: number): unknown[] =>
  ownArrayWindow(value, maximum).items;

const UNSAFE_DIAGNOSTIC_UNICODE = /[\p{Cc}\p{Cf}\p{Cs}\p{M}]/gu;

const boundedText = (value: unknown, maximum: number): string => {
  if (typeof value !== "string") return "";
  const safeMaximum = Number.isSafeInteger(maximum)
    ? Math.max(0, maximum)
    : 0;
  if (safeMaximum === 0) return "";
  try {
    const sanitized = value
      .slice(0, Math.max(1_024, safeMaximum * 4))
      .normalize("NFKC")
      .replace(UNSAFE_DIAGNOSTIC_UNICODE, " ")
      .replace(/\s+/gu, " ")
      .trim();
    const truncated = sanitized.slice(0, safeMaximum);
    return /[\uD800-\uDBFF]$/u.test(truncated)
      ? truncated.slice(0, -1)
      : truncated;
  } catch {
    return "";
  }
};

const boundedNumber = (value: unknown, maximum: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, value))
    : 0;

const nullableConfidence = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1
    ? value
    : null;

const allowedValue = <T>(value: unknown, values: Set<T>, fallback: T): T =>
  values.has(value as T) ? (value as T) : fallback;

const nullableAllowedValue = <T>(value: unknown, values: Set<T>): T | null =>
  values.has(value as T) ? (value as T) : null;

const normalizeTranscriptVerdict = (
  value: unknown,
): DiagnosticTranscriptVerdict | null =>
  value === "GOOGLE"
    ? "GEMINI"
    : nullableAllowedValue(value, TRANSCRIPT_VERDICTS);

const normalizeReview = (value: unknown): PronunciationDiagnosticReview => {
  const source = asRecord(value);
  return {
    actualText: boundedText(
      ownValue(source, "actualText"),
      MAX_SEGMENT_CHARACTERS,
    ),
    transcriptVerdict: normalizeTranscriptVerdict(
      ownValue(source, "transcriptVerdict"),
    ),
    pronunciationVerdict: nullableAllowedValue(
      ownValue(source, "pronunciationVerdict"),
      PRONUNCIATION_VERDICTS,
    ),
  };
};

const normalizeReviewRecord = (
  value: unknown,
): PronunciationDiagnosticsResponse["reviews"][number] | null => {
  const source = asRecord(value);
  if (!source) return null;
  const audioId = boundedText(
    ownValue(source, "audioId"),
    MAX_IDENTIFIER_CHARACTERS,
  );
  const segmentId = boundedText(
    ownValue(source, "segmentId"),
    MAX_IDENTIFIER_CHARACTERS,
  );
  const review = normalizeReview(source);
  if (
    !SAFE_DIAGNOSTIC_ID.test(audioId) ||
    !SAFE_DIAGNOSTIC_ID.test(segmentId) ||
    !review.actualText ||
    review.transcriptVerdict === null ||
    review.pronunciationVerdict === null
  ) {
    return null;
  }
  return {
    audioId,
    segmentId,
    actualText: review.actualText,
    transcriptVerdict: review.transcriptVerdict,
    pronunciationVerdict: review.pronunciationVerdict,
    reviewedAt: boundedText(
      ownValue(source, "reviewedAt"),
      MAX_IDENTIFIER_CHARACTERS,
    ),
  };
};

const normalizeRange = (
  value: unknown,
  durationSeconds: number,
):
  | PronunciationDiagnosticsResponse["recordings"][number]["resolved"]["excludedRanges"][number]
  | null => {
  const source = asRecord(value);
  if (!source) return null;
  const rawReason = ownValue(source, "reason");
  if (!EXCLUDED_REASONS.has(rawReason as never)) return null;
  const reason =
    rawReason as PronunciationDiagnosticsResponse["recordings"][number]["resolved"]["excludedRanges"][number]["reason"];
  const rawStart = ownValue(source, "startSeconds");
  const rawEnd = ownValue(source, "endSeconds");
  if (typeof rawStart !== "number" && typeof rawEnd !== "number")
    return { reason };
  const startSeconds = boundedNumber(rawStart, durationSeconds);
  const endSeconds = Math.max(
    startSeconds,
    boundedNumber(rawEnd, durationSeconds),
  );
  return { startSeconds, endSeconds, reason };
};

const normalizeDiagnosticWords = (
  value: unknown,
  durationSeconds: number,
): PronunciationDiagnosticsResponse["recordings"][number]["deepgram"]["words"] =>
  ownArrayItems(value, MAX_WORDS).flatMap((wordValue) => {
    const word = asRecord(wordValue);
    if (!word) return [];
    const text = boundedText(ownValue(word, "text"), MAX_SEGMENT_CHARACTERS);
    if (!text) return [];
    const startSeconds = boundedNumber(
      ownValue(word, "startSeconds"),
      durationSeconds,
    );
    return [
      {
        text,
        startSeconds,
        endSeconds: Math.max(
          startSeconds,
          boundedNumber(ownValue(word, "endSeconds"), durationSeconds),
        ),
        confidence: nullableConfidence(ownValue(word, "confidence")),
      },
    ];
  });

const normalizeDiagnosticSegments = (
  value: unknown,
  durationSeconds: number,
): PronunciationDiagnosticsResponse["recordings"][number]["gemini"]["segments"] =>
  ownArrayItems(value, MAX_SEGMENTS).flatMap((segmentValue) => {
    const segment = asRecord(segmentValue);
    if (!segment) return [];
    const segmentId = boundedText(
      ownValue(segment, "segmentId"),
      MAX_IDENTIFIER_CHARACTERS,
    );
    if (!SAFE_DIAGNOSTIC_ID.test(segmentId)) return [];
    const startSeconds = boundedNumber(
      ownValue(segment, "startSeconds"),
      durationSeconds,
    );
    return [
      {
        segmentId,
        startSeconds,
        endSeconds: Math.max(
          startSeconds,
          boundedNumber(ownValue(segment, "endSeconds"), durationSeconds),
        ),
        text: boundedText(
          ownValue(segment, "text"),
          MAX_SEGMENT_CHARACTERS,
        ),
        communicationEffect: allowedValue(
          ownValue(segment, "communicationEffect"),
          COMMUNICATION_EFFECTS,
          "NONE",
        ),
      },
    ];
  });

const normalizeGeminiEvidence = (
  value: unknown,
  legacyValue: UnknownRecord | null,
  durationSeconds: number,
): PronunciationDiagnosticsResponse["recordings"][number]["gemini"] => {
  const source = asRecord(value) ?? legacyValue;
  return {
    text: boundedText(ownValue(source, "text"), MAX_TRANSCRIPT_CHARACTERS),
    recordingQuality: allowedValue(
      ownValue(source, "recordingQuality"),
      RECORDING_QUALITIES,
      "UNUSABLE",
    ),
    intelligibility: allowedValue(
      ownValue(source, "intelligibility"),
      INTELLIGIBILITY,
      "UNSCORABLE",
    ),
    listenerEffort: allowedValue(
      ownValue(source, "listenerEffort"),
      FREQUENCIES,
      "UNSCORABLE",
    ),
    meaningImpact: allowedValue(
      ownValue(source, "meaningImpact"),
      FREQUENCIES,
      "UNSCORABLE",
    ),
    misunderstanding: allowedValue(
      ownValue(source, "misunderstanding"),
      FREQUENCIES,
      "UNSCORABLE",
    ),
    segments: normalizeDiagnosticSegments(
      ownValue(source, "segments"),
      durationSeconds,
    ),
  };
};

const normalizeProviderAlternatives = (
  value: unknown,
): DiagnosticProviderAlternative[] =>
  ownArrayItems(value, MAX_PROVIDER_ALTERNATIVES).flatMap((candidateValue) => {
    const candidate = asRecord(candidateValue);
    if (!candidate) return [];
    const text = boundedText(
      ownValue(candidate, "text"),
      MAX_CANDIDATE_CHARACTERS,
    );
    if (!text) return [];
    const provider = ownValue(candidate, "provider");
    return [
      {
        provider: DIAGNOSTIC_PROVIDERS.has(provider as never)
          ? (provider as DiagnosticProviderAlternative["provider"])
          : "OTHER",
        text,
      },
    ];
  });

const providerColumnText = (
  explicitValue: unknown,
  alternatives: DiagnosticProviderAlternative[],
  provider: DiagnosticProviderAlternative["provider"],
): string => {
  const matches = alternatives.filter(
    (alternative) => alternative.provider === provider,
  );
  if (matches.length > 1) return "";
  return (
    boundedText(explicitValue, MAX_CANDIDATE_CHARACTERS) ||
    matches[0]?.text ||
    ""
  );
};

type NormalizedRecordingResult = {
  recording: PronunciationDiagnosticsResponse["recordings"][number];
  inspectedComparisonSlots: number;
};

const normalizeRecording = (
  value: unknown,
  comparisonLimit: number,
): NormalizedRecordingResult | null => {
  const source = asRecord(value);
  if (!source) return null;
  const audioId = boundedText(
    ownValue(source, "audioId"),
    MAX_IDENTIFIER_CHARACTERS,
  );
  if (!SAFE_DIAGNOSTIC_ID.test(audioId)) return null;
  const durationSeconds = boundedNumber(
    ownValue(source, "durationSeconds"),
    MAX_DURATION_SECONDS,
  );
  const deepgram = asRecord(ownValue(source, "deepgram"));
  const legacyGoogle = asRecord(ownValue(source, "google"));
  const googleCloud = asRecord(ownValue(source, "googleCloud"));
  const gemini = normalizeGeminiEvidence(
    ownValue(source, "gemini"),
    legacyGoogle,
    durationSeconds,
  );
  const fusion = asRecord(ownValue(source, "fusion"));
  const resolved = asRecord(ownValue(source, "resolved"));
  const comparisons: PronunciationDiagnosticsResponse["recordings"][number]["comparisons"] = [];
  const comparisonWindow = ownArrayWindow(
    ownValue(source, "comparisons"),
    comparisonLimit,
  );
  const comparisonSources = comparisonWindow.items.map((comparisonValue) => {
    const comparison = asRecord(comparisonValue);
    return {
      comparison,
      segmentId: boundedText(
        ownValue(comparison, "segmentId"),
        MAX_IDENTIFIER_CHARACTERS,
      ),
    };
  });
  const segmentIdCounts = new Map<string, number>();
  for (const { segmentId } of comparisonSources) {
    if (!SAFE_DIAGNOSTIC_ID.test(segmentId)) continue;
    segmentIdCounts.set(segmentId, (segmentIdCounts.get(segmentId) ?? 0) + 1);
  }

  for (const { comparison, segmentId } of comparisonSources) {
    if (!comparison) continue;
    if (
      !SAFE_DIAGNOSTIC_ID.test(segmentId) ||
      segmentIdCounts.get(segmentId) !== 1
    ) {
      continue;
    }
    const startSeconds = boundedNumber(
      ownValue(comparison, "startSeconds"),
      durationSeconds,
    );
    const alternatives = normalizeProviderAlternatives(
      ownValue(comparison, "providerAlternatives"),
    );
    const legacyGeminiText = boundedText(
      ownValue(comparison, "googleText"),
      MAX_CANDIDATE_CHARACTERS,
    );
    comparisons.push({
      segmentId,
      startSeconds,
      endSeconds: Math.max(
        startSeconds,
        boundedNumber(ownValue(comparison, "endSeconds"), durationSeconds),
      ),
      deepgramText: providerColumnText(
        ownValue(comparison, "deepgramText"),
        alternatives,
        "DEEPGRAM",
      ),
      deepgramWordConfidence: nullableConfidence(
        ownValue(comparison, "deepgramWordConfidence"),
      ),
      googleText: legacyGeminiText,
      googleSttText: providerColumnText(
        ownValue(comparison, "googleSttText"),
        alternatives,
        "GOOGLE_STT",
      ),
      geminiText: providerColumnText(
        ownValue(comparison, "geminiText") ?? legacyGeminiText,
        alternatives,
        "GEMINI_AUDIO",
      ),
      adjudicatorText: providerColumnText(
        ownValue(comparison, "adjudicatorText"),
        alternatives,
        "OPENAI_ADJUDICATOR",
      ),
      selectedText: boundedText(
        ownValue(comparison, "selectedText"),
        MAX_CANDIDATE_CHARACTERS,
      ),
      resolution: allowedValue(
        ownValue(comparison, "resolution"),
        SPAN_RESOLUTIONS,
        "",
      ),
      scorePolicy: allowedValue(
        ownValue(comparison, "scorePolicy"),
        SCORE_POLICIES,
        "",
      ),
      languageHint: nullableAllowedValue(
        ownValue(comparison, "languageHint"),
        LANGUAGE_HINTS,
      ),
      providerAlternatives: alternatives,
      communicationEffect: allowedValue(
        ownValue(comparison, "communicationEffect"),
        COMMUNICATION_EFFECTS,
        "NONE",
      ),
      review: normalizeReview(ownValue(comparison, "review")),
    });
  }

  const legacyGoogleSegments = normalizeDiagnosticSegments(
    ownValue(legacyGoogle, "segments"),
    durationSeconds,
  );
  return {
    inspectedComparisonSlots: comparisonWindow.inspectedSlots,
    recording: {
      audioId,
      sectionKey: boundedText(
        ownValue(source, "sectionKey"),
        MAX_IDENTIFIER_CHARACTERS,
      ),
      durationSeconds,
      deepgram: {
        text: boundedText(
          ownValue(deepgram, "text"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        words: normalizeDiagnosticWords(
          ownValue(deepgram, "words"),
          durationSeconds,
        ),
      },
      google: {
        text: boundedText(
          ownValue(legacyGoogle, "text"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        recordingQuality: allowedValue(
          ownValue(legacyGoogle, "recordingQuality"),
          RECORDING_QUALITIES,
          "UNUSABLE",
        ),
        intelligibility: allowedValue(
          ownValue(legacyGoogle, "intelligibility"),
          INTELLIGIBILITY,
          "UNSCORABLE",
        ),
        listenerEffort: allowedValue(
          ownValue(legacyGoogle, "listenerEffort"),
          FREQUENCIES,
          "UNSCORABLE",
        ),
        meaningImpact: allowedValue(
          ownValue(legacyGoogle, "meaningImpact"),
          FREQUENCIES,
          "UNSCORABLE",
        ),
        misunderstanding: allowedValue(
          ownValue(legacyGoogle, "misunderstanding"),
          FREQUENCIES,
          "UNSCORABLE",
        ),
        segments: legacyGoogleSegments,
      },
      googleCloud: {
        text: boundedText(
          ownValue(googleCloud, "text"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        alternatives: ownArrayItems(
          ownValue(googleCloud, "alternatives"),
          MAX_GOOGLE_ALTERNATIVES,
        ).flatMap((alternativeValue) => {
          const alternative = asRecord(alternativeValue);
          if (!alternative) return [];
          const text = boundedText(
            ownValue(alternative, "text"),
            MAX_TRANSCRIPT_CHARACTERS,
          );
          return text
            ? [
                {
                  text,
                  confidence: nullableConfidence(
                    ownValue(alternative, "confidence"),
                  ),
                },
              ]
            : [];
        }),
        words: normalizeDiagnosticWords(
          ownValue(googleCloud, "words"),
          durationSeconds,
        ),
      },
      gemini,
      fusion: {
        pipelineVersion:
          ownValue(fusion, "pipelineVersion") === "dual-asr-fusion-v1"
            ? "dual-asr-fusion-v1"
            : "",
        semanticText: boundedText(
          ownValue(fusion, "semanticText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        verbatimText: boundedText(
          ownValue(fusion, "verbatimText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        status: allowedValue(
          ownValue(fusion, "status"),
          EVIDENCE_STATUSES,
          "UNAVAILABLE",
        ),
      },
      resolved: {
        displayText: boundedText(
          ownValue(resolved, "displayText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        trustedText: boundedText(
          ownValue(resolved, "trustedText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        status: allowedValue(
          ownValue(resolved, "status"),
          EVIDENCE_STATUSES,
          "UNAVAILABLE",
        ),
        protectedTerms: ownArrayItems(
          ownValue(resolved, "protectedTerms"),
          MAX_PROTECTED_TERMS,
        ).flatMap((termValue) => {
          const term = asRecord(termValue);
          if (!term) return [];
          const canonical = boundedText(
            ownValue(term, "canonical"),
            MAX_SEGMENT_CHARACTERS,
          );
          if (!canonical) return [];
          return [
            {
              canonical,
              observedForms: ownArrayItems(
                ownValue(term, "observedForms"),
                MAX_OBSERVED_FORMS,
              )
                .map((form) => boundedText(form, MAX_SEGMENT_CHARACTERS))
                .filter(Boolean),
            },
          ];
        }),
        excludedRanges: ownArrayItems(
          ownValue(resolved, "excludedRanges"),
          MAX_EXCLUDED_RANGES,
        )
          .map((range) => normalizeRange(range, durationSeconds))
          .filter(
            (
              range,
            ): range is PronunciationDiagnosticsResponse["recordings"][number]["resolved"]["excludedRanges"][number] =>
              range !== null,
          ),
      },
      comparisons,
    },
  };
};

const responsePayload = (value: unknown): unknown => {
  const source = asRecord(value);
  return ownValue(source, "data") ?? value;
};

export const normalizePronunciationDiagnostics = (
  value: unknown,
): PronunciationDiagnosticsResponse => {
  const empty = (): PronunciationDiagnosticsResponse => ({
    schemaVersion: 1,
    submissionId: "",
    updatedAt: "",
    reviews: [],
    recordings: [],
  });

  try {
    const source = asRecord(value);
    const reviews = ownArrayItems(ownValue(source, "reviews"), MAX_REVIEWS)
      .map(normalizeReviewRecord)
      .filter(
        (
          review,
        ): review is PronunciationDiagnosticsResponse["reviews"][number] =>
          review !== null,
      );
    const recordings: PronunciationDiagnosticsResponse["recordings"] = [];
    let remainingComparisonSlots = MAX_COMPARISON_ROWS;
    const recordingSources = ownArrayItems(
      ownValue(source, "recordings"),
      MAX_RECORDINGS,
    ).map((recordingValue) => {
      const recordingSource = asRecord(recordingValue);
      return {
        recordingValue,
        audioId: boundedText(
          ownValue(recordingSource, "audioId"),
          MAX_IDENTIFIER_CHARACTERS,
        ),
      };
    });
    const audioIdCounts = new Map<string, number>();
    for (const { audioId } of recordingSources) {
      if (!SAFE_DIAGNOSTIC_ID.test(audioId)) continue;
      audioIdCounts.set(audioId, (audioIdCounts.get(audioId) ?? 0) + 1);
    }

    for (const { recordingValue, audioId } of recordingSources) {
      if (
        !SAFE_DIAGNOSTIC_ID.test(audioId) ||
        audioIdCounts.get(audioId) !== 1
      ) {
        continue;
      }
      const result = normalizeRecording(
        recordingValue,
        remainingComparisonSlots,
      );
      if (!result) continue;
      remainingComparisonSlots = Math.max(
        0,
        remainingComparisonSlots - result.inspectedComparisonSlots,
      );
      recordings.push(result.recording);
    }

    return {
      schemaVersion: 1,
      submissionId: boundedText(
        ownValue(source, "submissionId"),
        MAX_IDENTIFIER_CHARACTERS,
      ),
      updatedAt: boundedText(
        ownValue(source, "updatedAt"),
        MAX_IDENTIFIER_CHARACTERS,
      ),
      reviews,
      recordings,
    };
  } catch {
    return empty();
  }
};

export const buildPronunciationDiagnosticReviewDto = (
  value: unknown,
): PronunciationDiagnosticReviewDto => {
  const source = asRecord(value);
  const audioId = boundedText(
    ownValue(source, "audioId"),
    MAX_IDENTIFIER_CHARACTERS + 1,
  );
  const segmentId = boundedText(
    ownValue(source, "segmentId"),
    MAX_IDENTIFIER_CHARACTERS + 1,
  );
  const actualText = boundedText(
    ownValue(source, "actualText"),
    MAX_SEGMENT_CHARACTERS + 1,
  );
  const transcriptVerdict = normalizeTranscriptVerdict(
    ownValue(source, "transcriptVerdict"),
  );
  const pronunciationVerdict = ownValue(source, "pronunciationVerdict");
  if (
    !SAFE_DIAGNOSTIC_ID.test(audioId) ||
    !SAFE_DIAGNOSTIC_ID.test(segmentId) ||
    !actualText ||
    actualText.length > MAX_SEGMENT_CHARACTERS ||
    transcriptVerdict === null ||
    !PRONUNCIATION_VERDICTS.has(
      pronunciationVerdict as DiagnosticPronunciationVerdict,
    )
  ) {
    throw new Error("Invalid diagnostic review.");
  }
  return {
    audioId,
    segmentId,
    actualText,
    transcriptVerdict,
    pronunciationVerdict:
      pronunciationVerdict as DiagnosticPronunciationVerdict,
  };
};

export const createPronunciationDiagnosticsService = (
  client: DiagnosticsHttpClient,
) => ({
  async get(
    submissionId: string,
    options: DiagnosticsRequestOptions = {},
  ): Promise<PronunciationDiagnosticsResponse> {
    const response = await client.get(
      `/api/speaking-submission/${encodeURIComponent(submissionId)}/pronunciation-diagnostics`,
      {
        timeout: 15_000,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return normalizePronunciationDiagnostics(responsePayload(response.data));
  },

  async review(
    input: { submissionId: string } & PronunciationDiagnosticReviewDto,
    options: DiagnosticsRequestOptions = {},
  ): Promise<PronunciationDiagnosticsResponse> {
    const dto = buildPronunciationDiagnosticReviewDto(input);
    const response = await client.post(
      `/api/speaking-submission/${encodeURIComponent(input.submissionId)}/pronunciation-diagnostics/review`,
      dto,
      {
        timeout: 15_000,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return normalizePronunciationDiagnostics(responsePayload(response.data));
  },

  async exportJson(
    submissionId: string,
    options: DiagnosticsRequestOptions = {},
  ): Promise<string> {
    const response = await client.get(
      `/api/speaking-submission/${encodeURIComponent(submissionId)}/pronunciation-diagnostics/export`,
      {
        timeout: 15_000,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return JSON.stringify(
      normalizePronunciationDiagnostics(responsePayload(response.data)),
      null,
      2,
    );
  },
});

export const pronunciationDiagnosticsService =
  createPronunciationDiagnosticsService(axiosPrivate);
