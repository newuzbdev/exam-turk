import axiosPrivate from "@/config/api";

export type SpeakingEvidenceStatus = "RELIABLE" | "LIMITED" | "UNAVAILABLE";
export type SpeakingEvidenceAnalysisStatus =
  "READY" | "RUNNING" | "COMPLETED" | "INCOMPLETE" | "UNAVAILABLE";
export type SpeakingSectionKey =
  "bolum_1_1" | "bolum_1_2" | "bolum_2" | "bolum_3";
export type SpeakingCriterionKey =
  | "taskAchievement"
  | "coherenceAndCohesion"
  | "lexicalResource"
  | "grammaticalRangeAndAccuracy"
  | "pronunciationAndIntelligibility";

export type SpeakingAssessmentLockContext = {
  ham_puan: number;
  bolumler: Record<SpeakingSectionKey, { puan: number }>;
};

export type SpeakingEvidenceSegment = {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  communicationEffect: "NONE" | "LISTENER_EFFORT" | "MEANING_RISK";
};

export type SpeakingEvidencePronunciation = {
  status: SpeakingEvidenceStatus;
  criterionText: string;
  intelligibility: "CLEAR" | "MOSTLY_CLEAR" | "OFTEN_UNCLEAR" | "UNSCORABLE";
  listenerEffort: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
  meaningImpact: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
  misunderstanding: "NONE" | "OCCASIONAL" | "FREQUENT" | "UNSCORABLE";
};

export type SpeakingEvidenceRecording = {
  schemaVersion: 1;
  audioId: string;
  sectionKey: SpeakingSectionKey | "";
  durationSeconds: number;
  status: SpeakingEvidenceStatus;
  scoreImpact: "NONE";
  resolvedTranscript: {
    schemaVersion: 1;
    displayText: string;
    trustedText: string;
    status: SpeakingEvidenceStatus;
  };
  pronunciation: SpeakingEvidencePronunciation;
  segments: SpeakingEvidenceSegment[];
};

export type SpeakingAssessmentV4Annotation = {
  id: string;
  evidenceId: string;
  criterion:
    "coherenceAndCohesion" | "lexicalResource" | "grammaticalRangeAndAccuracy";
  errorType: string;
  severity: "minor" | "medium" | "major";
  original: string;
  corrected: string;
  explanation: string;
  occurrence: number;
};

export type SpeakingAssessmentV4Section = {
  puan: number;
  degerlendirme: string;
  gucluYon: string;
  puaniSinirlayanNokta: string;
  kriterler: Record<SpeakingCriterionKey, string>;
  annotations: SpeakingAssessmentV4Annotation[];
  reviewedEvidenceIds: string[];
};

export type SpeakingAssessmentV4 = {
  schemaVersion: 4;
  promptVersion: string;
  feedbackComplete: true;
  ham_puan: number;
  bolumler: Record<SpeakingSectionKey, SpeakingAssessmentV4Section>;
  genel_degerlendirme: string;
  presentationProvenance:
    | "MODEL_OVERLAY"
    | "BASE_FALLBACK"
    | "LEGACY_STORED_FALLBACK";
};

export type SpeakingEvidenceAnalysisResponse = {
  available: boolean;
  status: SpeakingEvidenceAnalysisStatus;
  scoreImpact: "NONE";
  summary: {
    recordingCount: number;
    reliableCount: number;
    limitedCount: number;
    unavailableCount: number;
  };
  recordings: SpeakingEvidenceRecording[];
  assessmentOverlay: SpeakingAssessmentV4 | null;
  retryable: boolean;
};

type UnknownRecord = Record<string, unknown>;
type NormalizedRecording = {
  value: SpeakingEvidenceRecording;
  pronunciationTrusted: boolean;
};
type NormalizedLock = {
  hamScore: number;
  scores: Record<SpeakingSectionKey, number>;
};
type AnalysisHttpClient = {
  get(
    url: string,
    config: { timeout: number; signal?: AbortSignal },
  ): Promise<{ data: unknown }>;
  post(
    url: string,
    body: undefined,
    config: { timeout: number; signal?: AbortSignal },
  ): Promise<{ data: unknown }>;
};
type AnalysisRequestOptions = { signal?: AbortSignal };

const MAX_RECORDINGS = 20;
const MAX_SEGMENTS = 200;
const MAX_TRANSCRIPT_CHARACTERS = 8_000;
const MAX_CRITERION_CHARACTERS = 2_000;
const MAX_IDENTIFIER_CHARACTERS = 100;
const MAX_SEGMENT_CHARACTERS = 500;
const MAX_DURATION_SECONDS = 4 * 60 * 60;
const MAX_ANNOTATIONS_PER_SECTION = 200;
const PROMPT_VERSION = "speaking-v4-evidence-overlay-2026-08-25";
const UNAVAILABLE_PRONUNCIATION_COPY =
  "Bu pilot sonucunda telaffuz resmî puana dahil edilmedi; güvenilir tanısal kanıt bulunmadığı için ek değerlendirme yapılmadı.";

const SECTION_KEYS: SpeakingSectionKey[] = [
  "bolum_1_1",
  "bolum_1_2",
  "bolum_2",
  "bolum_3",
];
const SECTION_MAXIMUMS: Record<SpeakingSectionKey, number> = {
  bolum_1_1: 5,
  bolum_1_2: 5,
  bolum_2: 5,
  bolum_3: 6,
};
const CRITERION_KEYS: SpeakingCriterionKey[] = [
  "taskAchievement",
  "coherenceAndCohesion",
  "lexicalResource",
  "grammaticalRangeAndAccuracy",
  "pronunciationAndIntelligibility",
];
const ANNOTATION_CRITERIA = new Set<
  SpeakingAssessmentV4Annotation["criterion"]
>(["coherenceAndCohesion", "lexicalResource", "grammaticalRangeAndAccuracy"]);
const ANNOTATION_SEVERITIES = new Set<
  SpeakingAssessmentV4Annotation["severity"]
>(["minor", "medium", "major"]);
const EVIDENCE_STATUSES = new Set<SpeakingEvidenceStatus>([
  "RELIABLE",
  "LIMITED",
  "UNAVAILABLE",
]);
const ANALYSIS_STATUSES = new Set<SpeakingEvidenceAnalysisStatus>([
  "READY",
  "RUNNING",
  "COMPLETED",
  "INCOMPLETE",
  "UNAVAILABLE",
]);
const COMMUNICATION_EFFECTS = new Set<
  SpeakingEvidenceSegment["communicationEffect"]
>(["NONE", "LISTENER_EFFORT", "MEANING_RISK"]);
const INTELLIGIBILITY = new Set<
  SpeakingEvidencePronunciation["intelligibility"]
>(["CLEAR", "MOSTLY_CLEAR", "OFTEN_UNCLEAR", "UNSCORABLE"]);
const FREQUENCIES = new Set<SpeakingEvidencePronunciation["listenerEffort"]>([
  "NONE",
  "OCCASIONAL",
  "FREQUENT",
  "UNSCORABLE",
]);
const FORBIDDEN_INTERNAL_TOKENS = new Set([
  "provider",
  "metadata",
  "schemaversion",
  "promptversion",
  "scoreimpact",
  "excludedranges",
  "trustedtranscript",
  "evidenceid",
]);
const PROVIDER_MODEL_NAME_PREFIXES = [
  "openai",
  "deepgram",
  "google",
  "gemini",
  "whisper",
  "gpt",
  "nova",
] as const;

const INTELLIGIBILITY_COPY = {
  CLEAR: "Konuşmanız anlaşılırdı.",
  MOSTLY_CLEAR: "Konuşmanız çoğunlukla anlaşılırdı.",
  OFTEN_UNCLEAR: "Konuşmanız bazı bölümlerde sık sık anlaşılmıyordu.",
} as const;
const LISTENER_EFFORT_COPY = {
  NONE: "Dinleyici ek çaba göstermeden takip edebilir.",
  OCCASIONAL: "Dinleyici zaman zaman ek çaba gösterebilir.",
  FREQUENT: "Dinleyicinin sık sık ek çaba göstermesi gerekebilir.",
} as const;
const MEANING_IMPACT_COPY = {
  NONE: "Anlam etkilenmedi.",
  OCCASIONAL: "Anlam zaman zaman etkilenebilir.",
  FREQUENT: "Anlam sık sık etkilenebilir.",
} as const;
const MISUNDERSTANDING_COPY = {
  NONE: "Yanlış anlama gözlenmedi.",
  OCCASIONAL: "Yanlış anlama zaman zaman oluşabilir.",
  FREQUENT: "Yanlış anlama sık sık oluşabilir.",
} as const;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const ownValue = (record: UnknownRecord | null, key: string): unknown => {
  if (!record) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
};

const ownArrayItems = (value: unknown, maximum: number): unknown[] => {
  if (!Array.isArray(value)) return [];
  const items: unknown[] = [];
  const length = Math.min(value.length, maximum);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor && "value" in descriptor) items.push(descriptor.value);
  }
  return items;
};

const boundedText = (value: unknown, maximum: number): string => {
  if (typeof value !== "string") return "";
  const prefixLimit = Math.max(1_024, maximum * 4);
  return Array.from(value.slice(0, prefixLimit), (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  })
    .join("")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maximum);
};

const allowedValue = <T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
): T =>
  typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : fallback;

const boundedNumber = (value: unknown, maximum: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, value))
    : 0;

const isHalfStepInRange = (value: unknown, maximum: number): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= maximum &&
  Number.isInteger(value * 2);

const normalizedTokens = (value: string): string[] =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[‐‑‒–—]/gu, "-")
    .match(/[\p{L}\p{N}]+/gu) ?? [];

type TokenRule = string | { prefix: string };

const tokenMatchesRule = (token: string, rule: TokenRule): boolean =>
  typeof rule === "string" ? token === rule : token.startsWith(rule.prefix);

const containsBoundedTokenSequence = (
  tokens: string[],
  sequence: readonly TokenRule[],
): boolean =>
  sequence.length > 0 &&
  tokens.some((_, start) =>
    sequence.every((rule, offset) =>
      tokenMatchesRule(tokens[start + offset] ?? "", rule),
    ),
  );

const containsTokenPrefix = (
  tokens: string[],
  prefixes: readonly string[],
): boolean =>
  tokens.some((token) => prefixes.some((prefix) => token.startsWith(prefix)));

const containsForbiddenLearnerCopy = (value: string): boolean => {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const tokens = normalizedTokens(normalized);
  const machineTokens = tokens.map((token) => token.replace(/ı/gu, "i"));
  const tokenHasPrefix = (prefixes: string[]) =>
    machineTokens.some((token) =>
      prefixes.some((prefix) => token.startsWith(prefix)),
    );
  const writing =
    tokenHasPrefix([
      "paragraf",
      "kompozisyon",
      "tez",
      "noktala",
      "makale",
      "yazma",
      "yazisal",
      "essay",
      "paragraph",
      "punctuation",
      "writing",
      "thesis",
    ]) ||
    ["anlatım", "cevap", "ifade", "metin", "yanıt"].some((head) =>
      containsBoundedTokenSequence(tokens, ["yazılı", { prefix: head }]),
    );
  const aboveC1 =
    tokens.includes("c2") ||
    /\bc\s*2\b/iu.test(normalized) ||
    /\bc\s*1\s*(?:\+|plus|üst|üzer|öte|above|beyond)/iu.test(normalized);
  const internal =
    machineTokens.some((token) => FORBIDDEN_INTERNAL_TOKENS.has(token)) ||
    containsTokenPrefix(machineTokens, PROVIDER_MODEL_NAME_PREFIXES) ||
    containsBoundedTokenSequence(tokens, [
      { prefix: "sağlayıcı" },
      { prefix: "güven" },
    ]) ||
    containsBoundedTokenSequence(tokens, [
      { prefix: "model" },
      { prefix: "güven" },
    ]) ||
    containsBoundedTokenSequence(machineTokens, [
      { prefix: "provider" },
      { prefix: "confidence" },
    ]) ||
    containsBoundedTokenSequence(tokens, [
      { prefix: "sağlayıcı" },
      { prefix: "uyuşmaz" },
    ]) ||
    containsBoundedTokenSequence(tokens, [
      { prefix: "sağlayıcı" },
      { prefix: "anlaşmaz" },
    ]) ||
    containsBoundedTokenSequence(machineTokens, [
      "provider",
      { prefix: "disagreement" },
    ]) ||
    containsBoundedTokenSequence(machineTokens, [
      "raw",
      { prefix: "disagreement" },
    ]) ||
    containsBoundedTokenSequence(tokens, ["ham", { prefix: "anlaşmaz" }]) ||
    containsBoundedTokenSequence(tokens, ["iç", "meta", "veri"]) ||
    containsBoundedTokenSequence(tokens, ["dahili", "meta", "veri"]);
  const scoreCopy =
    /\d+(?:[.,]\d+)?\s*(?:\/\s*75|puan)/iu.test(normalized) ||
    tokens.includes("skor") ||
    tokens.includes("score") ||
    /(?:ham|standart|standard)\s+(?:puan|score)/iu.test(normalized);
  const unsafePronunciation = tokenHasPrefix([
    "fonem",
    "aksan",
    "native",
    "anadil",
    "artikulasyon",
    "artikülasyon",
    "bogumlama",
    "boğumlama",
    "vurgu",
    "tonlama",
  ]);
  return writing || aboveC1 || internal || scoreCopy || unsafePronunciation;
};

const normalizeSegment = (
  value: unknown,
  index: number,
  durationSeconds: number,
): SpeakingEvidenceSegment | null => {
  const source = asRecord(value);
  if (!source) return null;
  const startSeconds = boundedNumber(
    ownValue(source, "startSeconds"),
    durationSeconds,
  );
  return {
    id:
      boundedText(ownValue(source, "id"), MAX_IDENTIFIER_CHARACTERS) ||
      `segment-${index + 1}`,
    startSeconds,
    endSeconds: Math.max(
      startSeconds,
      boundedNumber(ownValue(source, "endSeconds"), durationSeconds),
    ),
    text: boundedText(ownValue(source, "text"), MAX_SEGMENT_CHARACTERS),
    communicationEffect: allowedValue(
      ownValue(source, "communicationEffect"),
      COMMUNICATION_EFFECTS,
      "NONE",
    ),
  };
};

const normalizeRecording = (value: unknown): NormalizedRecording | null => {
  const source = asRecord(value);
  if (!source) return null;
  const durationSeconds = boundedNumber(
    ownValue(source, "durationSeconds"),
    MAX_DURATION_SECONDS,
  );
  const resolvedSource = asRecord(ownValue(source, "resolvedTranscript"));
  const pronunciationSource = asRecord(ownValue(source, "pronunciation"));
  const requestedSection = ownValue(source, "sectionKey");
  const sectionKey = SECTION_KEYS.includes(
    requestedSection as SpeakingSectionKey,
  )
    ? (requestedSection as SpeakingSectionKey)
    : "";
  const status = allowedValue(
    ownValue(source, "status"),
    EVIDENCE_STATUSES,
    "UNAVAILABLE",
  );
  const pronunciationStatus = allowedValue(
    ownValue(pronunciationSource, "status"),
    EVIDENCE_STATUSES,
    "UNAVAILABLE",
  );
  const intelligibility = allowedValue(
    ownValue(pronunciationSource, "intelligibility"),
    INTELLIGIBILITY,
    "UNSCORABLE",
  );
  const listenerEffort = allowedValue(
    ownValue(pronunciationSource, "listenerEffort"),
    FREQUENCIES,
    "UNSCORABLE",
  );
  const meaningImpact = allowedValue(
    ownValue(pronunciationSource, "meaningImpact"),
    FREQUENCIES,
    "UNSCORABLE",
  );
  const misunderstanding = allowedValue(
    ownValue(pronunciationSource, "misunderstanding"),
    FREQUENCIES,
    "UNSCORABLE",
  );
  const pronunciationTrusted =
    status === "RELIABLE" &&
    pronunciationStatus === "RELIABLE" &&
    ownValue(pronunciationSource, "evidenceProvenance") === "TRUSTED_AUDIO" &&
    intelligibility !== "UNSCORABLE" &&
    listenerEffort !== "UNSCORABLE" &&
    meaningImpact !== "UNSCORABLE" &&
    misunderstanding !== "UNSCORABLE";
  const criterionText = boundedText(
    ownValue(pronunciationSource, "criterionText"),
    MAX_CRITERION_CHARACTERS,
  );

  return {
    value: {
      schemaVersion: 1,
      audioId: boundedText(
        ownValue(source, "audioId"),
        MAX_IDENTIFIER_CHARACTERS,
      ),
      sectionKey,
      durationSeconds,
      status,
      scoreImpact: "NONE",
      resolvedTranscript: {
        schemaVersion: 1,
        displayText: boundedText(
          ownValue(resolvedSource, "displayText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        trustedText: boundedText(
          ownValue(resolvedSource, "trustedText"),
          MAX_TRANSCRIPT_CHARACTERS,
        ),
        status: allowedValue(
          ownValue(resolvedSource, "status"),
          EVIDENCE_STATUSES,
          "UNAVAILABLE",
        ),
      },
      pronunciation: {
        status: pronunciationStatus,
        criterionText:
          criterionText && !containsForbiddenLearnerCopy(criterionText)
            ? criterionText
            : "",
        intelligibility,
        listenerEffort,
        meaningImpact,
        misunderstanding,
      },
      segments: ownArrayItems(ownValue(source, "segments"), MAX_SEGMENTS)
        .map((segment, index) =>
          normalizeSegment(segment, index, durationSeconds),
        )
        .filter(
          (segment): segment is SpeakingEvidenceSegment => segment !== null,
        ),
    },
    pronunciationTrusted,
  };
};

const normalizeLock = (value: unknown): NormalizedLock | null => {
  const source = asRecord(value);
  const sections = asRecord(ownValue(source, "bolumler"));
  const hamScore = ownValue(source, "ham_puan");
  if (!source || !sections || !isHalfStepInRange(hamScore, 21)) return null;
  const entries = SECTION_KEYS.map((sectionKey) => {
    const score = ownValue(asRecord(ownValue(sections, sectionKey)), "puan");
    return [sectionKey, score] as const;
  });
  if (
    entries.some(
      ([sectionKey, score]) =>
        !isHalfStepInRange(score, SECTION_MAXIMUMS[sectionKey]),
    )
  ) {
    return null;
  }
  const scores = Object.fromEntries(entries) as Record<
    SpeakingSectionKey,
    number
  >;
  const total = SECTION_KEYS.reduce(
    (sum, sectionKey) => sum + scores[sectionKey],
    0,
  );
  return total === hamScore ? { hamScore, scores } : null;
};

const worstCategory = <T extends string>(values: T[], order: readonly T[]): T =>
  values.reduce(
    (worst, value) =>
      order.indexOf(value) > order.indexOf(worst) ? value : worst,
    order[0],
  );

const expectedPronunciationCopy = (
  recordings: NormalizedRecording[],
): string => {
  const reliable = recordings.filter(
    (recording) => recording.pronunciationTrusted,
  );
  if (reliable.length === 0) return UNAVAILABLE_PRONUNCIATION_COPY;
  const pronunciations = reliable.map(
    (recording) => recording.value.pronunciation,
  );
  const intelligibility = worstCategory(
    pronunciations.map(
      (item) => item.intelligibility as keyof typeof INTELLIGIBILITY_COPY,
    ),
    ["CLEAR", "MOSTLY_CLEAR", "OFTEN_UNCLEAR"] as const,
  );
  const listenerEffort = worstCategory(
    pronunciations.map(
      (item) => item.listenerEffort as keyof typeof LISTENER_EFFORT_COPY,
    ),
    ["NONE", "OCCASIONAL", "FREQUENT"] as const,
  );
  const meaningImpact = worstCategory(
    pronunciations.map(
      (item) => item.meaningImpact as keyof typeof MEANING_IMPACT_COPY,
    ),
    ["NONE", "OCCASIONAL", "FREQUENT"] as const,
  );
  const misunderstanding = worstCategory(
    pronunciations.map(
      (item) => item.misunderstanding as keyof typeof MISUNDERSTANDING_COPY,
    ),
    ["NONE", "OCCASIONAL", "FREQUENT"] as const,
  );
  return [
    INTELLIGIBILITY_COPY[intelligibility],
    LISTENER_EFFORT_COPY[listenerEffort],
    MEANING_IMPACT_COPY[meaningImpact],
    MISUNDERSTANDING_COPY[misunderstanding],
    "Bu tanısal gözlem resmî puanı değiştirmez.",
  ].join(" ");
};

const countOccurrences = (text: string, fragment: string): number => {
  let count = 0;
  let start = text.indexOf(fragment);
  while (fragment && start >= 0) {
    count += 1;
    start = text.indexOf(fragment, start + Math.max(1, fragment.length));
  }
  return count;
};

const learnerText = (value: unknown, maximum: number): string | null => {
  const text = boundedText(value, maximum);
  return text && !containsForbiddenLearnerCopy(text) ? text : null;
};

const normalizeAnnotation = (
  value: unknown,
  sectionRecordings: NormalizedRecording[],
  reviewedEvidenceIds: string[],
  annotationIds: Set<string>,
): SpeakingAssessmentV4Annotation | null => {
  const source = asRecord(value);
  if (!source) return null;
  const id = boundedText(ownValue(source, "id"), MAX_IDENTIFIER_CHARACTERS);
  const evidenceId = boundedText(
    ownValue(source, "evidenceId"),
    MAX_IDENTIFIER_CHARACTERS,
  );
  const criterion = ownValue(source, "criterion");
  const severity = ownValue(source, "severity");
  const rawOriginal = ownValue(source, "original");
  const original = learnerText(rawOriginal, MAX_SEGMENT_CHARACTERS);
  const corrected = learnerText(
    ownValue(source, "corrected"),
    MAX_SEGMENT_CHARACTERS,
  );
  const errorType = learnerText(
    ownValue(source, "errorType"),
    MAX_SEGMENT_CHARACTERS,
  );
  const explanation = learnerText(
    ownValue(source, "explanation"),
    MAX_CRITERION_CHARACTERS,
  );
  const occurrence = ownValue(source, "occurrence");
  const recording = sectionRecordings.find(
    (item) => item.value.audioId === evidenceId,
  );
  const occurrences =
    original && recording
      ? countOccurrences(
          recording.value.resolvedTranscript.trustedText,
          original,
        )
      : 0;
  if (
    !id ||
    annotationIds.has(id) ||
    !evidenceId ||
    !reviewedEvidenceIds.includes(evidenceId) ||
    !recording ||
    !ANNOTATION_CRITERIA.has(
      criterion as SpeakingAssessmentV4Annotation["criterion"],
    ) ||
    !ANNOTATION_SEVERITIES.has(
      severity as SpeakingAssessmentV4Annotation["severity"],
    ) ||
    !errorType ||
    !original ||
    rawOriginal !== original ||
    !corrected ||
    corrected === original ||
    !explanation ||
    typeof occurrence !== "number" ||
    !Number.isInteger(occurrence) ||
    occurrence < 1 ||
    occurrence > occurrences
  ) {
    return null;
  }
  annotationIds.add(id);
  return {
    id,
    evidenceId,
    criterion: criterion as SpeakingAssessmentV4Annotation["criterion"],
    errorType,
    severity: severity as SpeakingAssessmentV4Annotation["severity"],
    original,
    corrected,
    explanation,
    occurrence,
  };
};

const normalizeOverlaySection = (
  value: unknown,
  sectionKey: SpeakingSectionKey,
  lockedScore: number,
  sectionRecordings: NormalizedRecording[],
  annotationIds: Set<string>,
): SpeakingAssessmentV4Section | null => {
  const source = asRecord(value);
  const criteriaSource = asRecord(ownValue(source, "kriterler"));
  const score = ownValue(source, "puan");
  const rawAnnotations = ownValue(source, "annotations");
  const rawReviewedIds = ownValue(source, "reviewedEvidenceIds");
  if (
    !source ||
    !criteriaSource ||
    !isHalfStepInRange(score, SECTION_MAXIMUMS[sectionKey]) ||
    score !== lockedScore ||
    !Array.isArray(rawAnnotations) ||
    rawAnnotations.length > MAX_ANNOTATIONS_PER_SECTION ||
    !Array.isArray(rawReviewedIds) ||
    rawReviewedIds.length > MAX_RECORDINGS
  ) {
    return null;
  }

  const expectedEvidenceIds = sectionRecordings.map(
    (recording) => recording.value.audioId,
  );
  if (
    expectedEvidenceIds.some(
      (id, index) => !id || expectedEvidenceIds.indexOf(id) !== index,
    )
  ) {
    return null;
  }
  const reviewedEvidenceIds = ownArrayItems(rawReviewedIds, MAX_RECORDINGS).map(
    (id) => boundedText(id, MAX_IDENTIFIER_CHARACTERS),
  );
  if (
    reviewedEvidenceIds.length !== expectedEvidenceIds.length ||
    reviewedEvidenceIds.some((id, index) => id !== expectedEvidenceIds[index])
  ) {
    return null;
  }

  const degerlendirme = learnerText(
    ownValue(source, "degerlendirme"),
    MAX_CRITERION_CHARACTERS,
  );
  const gucluYon = learnerText(
    ownValue(source, "gucluYon"),
    MAX_CRITERION_CHARACTERS,
  );
  const puaniSinirlayanNokta = learnerText(
    ownValue(source, "puaniSinirlayanNokta"),
    MAX_CRITERION_CHARACTERS,
  );
  const criteriaEntries = CRITERION_KEYS.map(
    (criterion) =>
      [
        criterion,
        learnerText(
          ownValue(criteriaSource, criterion),
          MAX_CRITERION_CHARACTERS,
        ),
      ] as const,
  );
  if (
    !degerlendirme ||
    !gucluYon ||
    !puaniSinirlayanNokta ||
    criteriaEntries.some(([, text]) => !text) ||
    criteriaEntries.find(
      ([criterion]) => criterion === "pronunciationAndIntelligibility",
    )?.[1] !== expectedPronunciationCopy(sectionRecordings)
  ) {
    return null;
  }

  const annotations = ownArrayItems(
    rawAnnotations,
    MAX_ANNOTATIONS_PER_SECTION,
  ).map((annotation) =>
    normalizeAnnotation(
      annotation,
      sectionRecordings,
      reviewedEvidenceIds,
      annotationIds,
    ),
  );
  if (annotations.some((annotation) => annotation === null)) return null;

  return {
    puan: score,
    degerlendirme,
    gucluYon,
    puaniSinirlayanNokta,
    kriterler: Object.fromEntries(criteriaEntries) as Record<
      SpeakingCriterionKey,
      string
    >,
    annotations: annotations as SpeakingAssessmentV4Annotation[],
    reviewedEvidenceIds,
  };
};

const normalizeAssessmentOverlay = (
  value: unknown,
  lock: NormalizedLock | null,
  recordings: NormalizedRecording[],
): SpeakingAssessmentV4 | null => {
  if (!lock) return null;
  const source = asRecord(value);
  const sectionsSource = asRecord(ownValue(source, "bolumler"));
  const generalEvaluation = learnerText(
    ownValue(source, "genel_degerlendirme"),
    MAX_TRANSCRIPT_CHARACTERS,
  );
  const presentationProvenance = ownValue(source, "presentationProvenance");
  if (
    !source ||
    ownValue(source, "schemaVersion") !== 4 ||
    ownValue(source, "promptVersion") !== PROMPT_VERSION ||
    ownValue(source, "feedbackComplete") !== true ||
    ownValue(source, "ham_puan") !== lock.hamScore ||
    !sectionsSource ||
    !generalEvaluation
  ) {
    return null;
  }

  const annotationIds = new Set<string>();
  const entries = SECTION_KEYS.map(
    (sectionKey) =>
      [
        sectionKey,
        normalizeOverlaySection(
          ownValue(sectionsSource, sectionKey),
          sectionKey,
          lock.scores[sectionKey],
          recordings.filter(
            (recording) => recording.value.sectionKey === sectionKey,
          ),
          annotationIds,
        ),
      ] as const,
  );
  if (entries.some(([, section]) => section === null)) return null;
  return {
    schemaVersion: 4,
    promptVersion: PROMPT_VERSION,
    feedbackComplete: true,
    ham_puan: lock.hamScore,
    bolumler: Object.fromEntries(entries) as Record<
      SpeakingSectionKey,
      SpeakingAssessmentV4Section
    >,
    genel_degerlendirme: generalEvaluation,
    presentationProvenance:
      presentationProvenance === "MODEL_OVERLAY" ||
      presentationProvenance === "BASE_FALLBACK" ||
      presentationProvenance === "LEGACY_STORED_FALLBACK"
        ? presentationProvenance
        : "LEGACY_STORED_FALLBACK",
  };
};

const responsePayload = (value: unknown): unknown => {
  const source = asRecord(value);
  return ownValue(source, "data") ?? value;
};

export const normalizeSpeakingEvidenceAnalysis = (
  value: unknown,
  lockedAssessment: unknown,
): SpeakingEvidenceAnalysisResponse => {
  const source = asRecord(value);
  const normalizedRecordings = ownArrayItems(
    ownValue(source, "recordings"),
    MAX_RECORDINGS,
  )
    .map(normalizeRecording)
    .filter(
      (recording): recording is NormalizedRecording => recording !== null,
    );
  const recordings = normalizedRecordings.map((recording) => recording.value);
  const status = allowedValue(
    ownValue(source, "status"),
    ANALYSIS_STATUSES,
    "UNAVAILABLE",
  );
  return {
    available: ownValue(source, "available") === true,
    status,
    scoreImpact: "NONE",
    summary: {
      recordingCount: recordings.length,
      reliableCount: recordings.filter(
        (recording) => recording.status === "RELIABLE",
      ).length,
      limitedCount: recordings.filter(
        (recording) => recording.status === "LIMITED",
      ).length,
      unavailableCount: recordings.filter(
        (recording) => recording.status === "UNAVAILABLE",
      ).length,
    },
    recordings,
    assessmentOverlay: normalizeAssessmentOverlay(
      ownValue(source, "assessmentOverlay"),
      normalizeLock(lockedAssessment),
      normalizedRecordings,
    ),
    retryable: status === "INCOMPLETE",
  };
};

export const createPronunciationAnalysisService = (
  client: AnalysisHttpClient,
) => ({
  async get(
    submissionId: string,
    lockedAssessment: unknown,
    options: AnalysisRequestOptions = {},
  ): Promise<SpeakingEvidenceAnalysisResponse> {
    const response = await client.get(
      `/api/speaking-submission/${encodeURIComponent(submissionId)}/pronunciation-analysis`,
      {
        timeout: 15_000,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return normalizeSpeakingEvidenceAnalysis(
      responsePayload(response.data),
      lockedAssessment,
    );
  },

  async analyze(
    submissionId: string,
    lockedAssessment: unknown,
    options: AnalysisRequestOptions = {},
  ): Promise<SpeakingEvidenceAnalysisResponse> {
    const response = await client.post(
      `/api/speaking-submission/${encodeURIComponent(submissionId)}/pronunciation-analysis`,
      undefined,
      {
        timeout: 6 * 60_000,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return normalizeSpeakingEvidenceAnalysis(
      responsePayload(response.data),
      lockedAssessment,
    );
  },
});

export const pronunciationAnalysisService =
  createPronunciationAnalysisService(axiosPrivate);
