import { selectSpeakingTimedTranscript } from "./speaking-timed-transcript";
import type { KeyboardEvent, ReactNode, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  pronunciationAnalysisService,
  type SpeakingAssessmentLockContext,
  type SpeakingEvidenceAnalysisResponse,
} from "@/services/pronunciationAnalysis.service";
import { normalizeFeedbackText } from "@/utils/text";
import { protectedImageProps } from "@/utils/mediaProtection";
import PresentationImage from "@/components/practice/PresentationImage";
import {
  buildSpeakingSentenceTimeline,
  findSpeakingEvidenceTimeRange,
  type SpeakingFlowTimeRange,
  type SpeakingSpeechEvidence,
  type SpeakingUtteranceSegment,
} from "./speaking-speech-evidence";
import SpeakingSummary from "./SpeakingSummary";
import SpeakingCorrectionText from "./SpeakingCorrectionText";
import SpeakingSelectedQuote, { findSpeakingQuoteRange, type SpeakingQuoteRange } from "./SpeakingSelectedQuote";
import { sanitizeSpeakingLearnerCopy } from "./speaking-learner-copy";

export type SpeakingDeepReviewSectionKey =
  | "bolum_1_1"
  | "bolum_1_2"
  | "bolum_2"
  | "bolum_3";

export type SpeakingDeepReviewAudio = {
  audioId?: string | null;
  hasAudio?: boolean;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
  allottedDurationSeconds?: number | null;
  retentionUntil?: string | null;
  sectionKey?: string | null;
  speechEvidence?: SpeakingSpeechEvidence;
};

export type SpeakingDeepReviewQuestion = {
  id?: string | null;
  question: string;
  transcript?: string | null;
  audio?: SpeakingDeepReviewAudio;
  visuals?: string[];
  visualContext?: "question" | "combined-prompt";
};

export type SpeakingDiscussionPoints = {
  advantages: string[];
  disadvantages: string[];
};

export type SpeakingDeepReviewSection = {
  key: SpeakingDeepReviewSectionKey;
  label?: string;
  questions: SpeakingDeepReviewQuestion[];
  feedback?: string | null;
  singleRecordingCombinedPrompt?: boolean;
  discussionPoints?: SpeakingDiscussionPoints;
};

export type SpeakingDeepReviewProps = {
  aiFeedback?: unknown;
  officialResult?: Record<string, unknown> | null;
  sections: SpeakingDeepReviewSection[];
  submissionId?: string | null;
  score?: number | string | null;
  level?: string | null;
  evaluationStatus?: string | null;
  summaryMode?: "full" | "general-only";
  className?: string;
  renderAudioReplay?: (
    audio?: SpeakingDeepReviewAudio,
    options?: {
      variant: "flow";
      issueTimeRanges?: SpeakingFlowTimeRange[];
    },
  ) => ReactNode;
  onSeekAudioEvidence?: (
    audio: SpeakingDeepReviewAudio,
    startSeconds: number,
  ) => void;
};

type CriterionKey =
  | "achievement"
  | "coherence"
  | "lexical"
  | "grammar"
  | "pronunciation";

type EvidenceCriterionKey = "achievement" | "coherence" | "lexical" | "grammar";

type CriterionDefinition = {
  key: CriterionKey;
  label: string;
  aliases: string[];
};

type SpeakingAnnotation = {
  id: string;
  canonical?: true;
  evidenceId?: string;
  criterion: EvidenceCriterionKey;
  errorType: string;
  original: string;
  corrected: string;
  explanation: string;
  occurrence?: number;
  severity: "minor" | "medium" | "major";
  matchFound: boolean;
};

type AnnotationMatch = SpeakingAnnotation & {
  start: number;
  end: number;
  occurrence: number;
};

type AnnotationGroup = {
  id: string;
  criterion: EvidenceCriterionKey;
  errorType: string;
  annotations: AnnotationMatch[];
};

type CanonicalSpeakingRubricKey =
  | "taskAchievement"
  | "fluencyAndCoherence"
  | "lexicalResource"
  | "grammaticalRangeAndAccuracy"
  | "pronunciationAndIntelligibility";

type CanonicalSpeakingAnnotationKey = Exclude<
  CanonicalSpeakingRubricKey,
  "pronunciationAndIntelligibility"
>;

type CanonicalSpeakingQuestionInsight = {
  type: "strength" | "development";
  quote: string;
  explanation: string;
  suggestion: string;
  exampleSentence: string;
};

type CanonicalSpeakingAssessment = Record<string, unknown> & {
  assessmentVersion: "speaking-canonical-v1";
  promptVersion: string;
  rubricRevision: string;
  sectionResults: Array<{
    sectionKey: SpeakingDeepReviewSectionKey;
    sectionScore: number;
    questionFeedback: Array<{
      questionId: string;
      heardTranscript?: string;
      taskStatus?: "MET" | "PARTLY_MET" | "NOT_MET";
      developmentStatus?: "SUFFICIENT" | "LIMITED" | "NOT_DEMONSTRATED";
      feedback?: string;
      strength?: string;
      developmentPoint?: string;
      improvedResponseExample?: string | null;
      rewriteType?: "YOUR_ANSWER" | "MODEL_EXAMPLE" | null;
      items?: Array<{
        type: "strength" | "development";
        quote: string | null;
        explanation: string;
        suggestion: string | null;
        exampleSentence: string | null;
      }>;
    }>;
    rubricFeedback: Record<CanonicalSpeakingAnnotationKey, string> &
      Partial<Record<"pronunciationAndIntelligibility", string>>;
    annotations: Array<{
      annotationId: string;
      questionId: string;
      criterion: CanonicalSpeakingAnnotationKey;
      errorType: string;
      severity: "minor" | "medium" | "major";
      quote: string;
      rewrite: string;
      explanation: string;
      occurrence: number;
    }>;
  }>;
  generalEvaluation: string;
  rawScore: number;
  standardScore: number;
  cefrLevel: string;
  evaluatedAt: string;
};

const SECTION_LABELS: Record<SpeakingDeepReviewSectionKey, string> = {
  bolum_1_1: "Bölüm 1.1",
  bolum_1_2: "Bölüm 1.2",
  bolum_2: "Bölüm 2",
  bolum_3: "Bölüm 3",
};

const SECTION_MAXIMUMS: Record<SpeakingDeepReviewSectionKey, number> = {
  bolum_1_1: 5,
  bolum_1_2: 5,
  bolum_2: 5,
  bolum_3: 6,
};

// Official speaking-format timing. The combined prompts in Sections 2 and 3
// share one recording, while Sections 1.1 and 1.2 are timed per question.
// eslint-disable-next-line react-refresh/only-export-components
export const resolveSpeakingAllottedDurationSeconds = (
  sectionKey: SpeakingDeepReviewSectionKey,
  questionIndex: number,
) => {
  if (sectionKey === "bolum_1_1") return 30;
  if (sectionKey === "bolum_1_2") return questionIndex === 0 ? 45 : 30;
  return 120;
};

const formatSpeakingSectionScore = (score: number) =>
  score.toLocaleString("tr-TR", {
    minimumFractionDigits: Number.isInteger(score) ? 0 : 1,
    maximumFractionDigits: 1,
  });

const SPEAKING_CANONICAL_ASSESSMENT_VERSION = "speaking-canonical-v1";

export const shouldLoadSpeakingPresentation = (
  submissionId: unknown,
): submissionId is string =>
  typeof submissionId === "string" && submissionId.trim().length > 0;

export const shouldForwardSpeakingPanelWheel = (
  deltaY: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
) => {
  if (deltaY === 0) return false;
  if (deltaY < 0) return scrollTop <= 0;
  return scrollTop + clientHeight >= scrollHeight - 1;
};

const forwardSpeakingPanelWheel = (event: WheelEvent<HTMLElement>) => {
  const element = event.currentTarget;
  if (
    !shouldForwardSpeakingPanelWheel(
      event.deltaY,
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
    )
  ) {
    return;
  }

  event.preventDefault();
  const pageScroller = document.scrollingElement ?? document.documentElement;
  pageScroller.scrollTop += event.deltaY;
  pageScroller.scrollLeft += event.deltaX;
};

const CRITERIA: CriterionDefinition[] = [
  {
    key: "achievement",
    label: "Görev Başarısı",
    aliases: [
      "taskAchievement",
      "task_achievement",
      "gorevBasarisi",
      "gorev_basarisi",
      "gorevYaniti",
      "gorev_yaniti",
      "Görev Başarısı",
      "Görev Yanıtı",
    ],
  },
  {
    key: "coherence",
    label: "Akıcılık ve Tutarlılık",
    aliases: [
      "coherenceAndCohesion",
      "coherence_and_cohesion",
      "tutarlilikVeBaglilik",
      "tutarlilik_ve_baglilik",
      "Akıcılık ve Bağlılık",
      "Tutarlılık ve Bağlılık",
    ],
  },
  {
    key: "lexical",
    label: "Kelime Kullanımı",
    aliases: [
      "lexicalResource",
      "lexical_resource",
      "kelimeKaynagi",
      "kelime_kaynagi",
      "Kelime Kaynağı",
    ],
  },
  {
    key: "grammar",
    label: "Dil Bilgisi",
    aliases: [
      "grammaticalRangeAndAccuracy",
      "grammatical_range_and_accuracy",
      "dilBilgisi",
      "dil_bilgisi",
      "Dil Bilgisi",
    ],
  },
  {
    key: "pronunciation",
    label: "Telaffuz ve Anlaşılırlık",
    aliases: [
      "pronunciationAndIntelligibility",
      "pronunciation_and_intelligibility",
      "telaffuzVeAnlasilabilirlik",
      "telaffuz_ve_anlasilabilirlik",
      "Telaffuz ve Anlaşılırlık",
    ],
  },
];

const cleanText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return normalizeFeedbackText(
    value
      .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
};

const SEVERE_SPEAKING_LANGUAGE_ROOTS = [
  "sik",
  "orospu",
  "piç",
  "yarrak",
  "yarrağ",
  "ibne",
  "kahpe",
  "amın",
  "amcık",
  "göt",
  "fuck",
  "motherfuck",
] as const;

const SEVERE_LANGUAGE_FALSE_POSITIVES = [
  "siklet",
  "sikke",
  "siklon",
  "götür",
] as const;

const CONTEXTUAL_SEXUAL_LANGUAGE_ROOTS = ["seks", "porno", "pornografi"] as const;

const CONTEXTUAL_SEXUAL_LANGUAGE_FALSE_POSITIVES = ["seksiyon"] as const;

const INAPPROPRIATE_SPEAKING_CONTEXT_CUES = [
  "konu dışı",
  "uygunsuz",
  "anlamsal kopuk",
  "ilgisiz",
  "ilgili değildir",
  "görev konusuyla ilgili değil",
  "sınav üslubu",
] as const;

const isSevereSpeakingLanguageToken = (token: string) => {
  const normalized = token.toLocaleLowerCase("tr-TR");
  if (
    SEVERE_LANGUAGE_FALSE_POSITIVES.some((prefix) =>
      normalized.startsWith(prefix),
    )
  ) {
    return false;
  }
  return SEVERE_SPEAKING_LANGUAGE_ROOTS.some((root) =>
    normalized.startsWith(root),
  );
};

const isContextuallyInappropriateSpeakingText = (...values: unknown[]) => {
  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  return INAPPROPRIATE_SPEAKING_CONTEXT_CUES.some((cue) =>
    normalized.includes(cue),
  );
};

const maskSevereSpeakingLanguage = (
  value: unknown,
  maskContextualSexualLanguage = false,
) => {
  if (typeof value !== "string") return "";
  return value.replace(/\p{L}+/gu, (token) => {
    const normalized = token.toLocaleLowerCase("tr-TR");
    const isContextualSexualLanguage =
      maskContextualSexualLanguage &&
      !CONTEXTUAL_SEXUAL_LANGUAGE_FALSE_POSITIVES.some((prefix) =>
        normalized.startsWith(prefix),
      ) &&
      CONTEXTUAL_SEXUAL_LANGUAGE_ROOTS.some((root) =>
        normalized.startsWith(root),
      );
    if (!isSevereSpeakingLanguageToken(token) && !isContextualSexualLanguage) {
      return token;
    }
    const characters = Array.from(token);
    if (characters.length <= 2) return "*".repeat(characters.length);
    return `${characters[0]}${"*".repeat(characters.length - 2)}${characters[characters.length - 1]}`;
  });
};

const formatLearnerFacingCriterionText = (value: unknown) => {
  const safeText = maskSevereSpeakingLanguage(
    value,
    isContextuallyInappropriateSpeakingText(value),
  ).trim();
  if (!safeText) return "";
  const learnerFacingText = safeText
    .replace(
      /\b(?:adayın|aday|öğrencinin|öğrenci|kullanıcının|kullanıcı) üzerindeki\b/giu,
      "üzerinizdeki",
    )
    .replace(/\b(?:adaya|öğrenciye|kullanıcıya)\b/giu, "size")
    .replace(/\b(?:adaydan|öğrenciden|kullanıcıdan)\b/giu, "sizden")
    .replace(/\b(?:adayla|öğrenciyle|kullanıcıyla)\b/giu, "sizinle")
    .replace(/^(?:Adayın|Öğrencinin|Kullanıcının)\b/u, "Cevabınızın")
    .replace(/^(?:Aday|Öğrenci|Kullanıcı)\b[\s,:;-]*/u, "");
  return learnerFacingText.replace(/^\p{L}/u, (character) =>
    character.toLocaleUpperCase("tr-TR"),
  );
};

const parseJsonCandidate = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const cleaned = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  if (!(cleaned.startsWith("{") || cleaned.startsWith("["))) return value;
  try {
    return JSON.parse(cleaned);
  } catch {
    return value;
  }
};

const unwrapAiFeedback = (value: unknown): unknown => {
  let current: unknown = parseJsonCandidate(value);
  for (let index = 0; index < 3; index += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) break;
    const source = current as Record<string, unknown>;
    const nested =
      source.aiFeedback ?? source.ai_feedback ?? source.feedback ?? source.assessment;
    if (!nested || nested === current) break;
    current = parseJsonCandidate(nested);
  }
  return current;
};

const isCanonicalSpeakingAssessment = (
  value: unknown,
): value is CanonicalSpeakingAssessment =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).assessmentVersion ===
        SPEAKING_CANONICAL_ASSESSMENT_VERSION,
  );

// Current reports are already validated by the backend contract and stay on
// their exact field names. Only records without the canonical version enter
// the permissive archived-report adapter.
// eslint-disable-next-line react-refresh/only-export-components
export const resolveSpeakingResultFeedback = (value: unknown): unknown => {
  const direct = parseJsonCandidate(value);
  return isCanonicalSpeakingAssessment(direct)
    ? direct
    : unwrapAiFeedback(direct);
};

// Keep browser-only recovery lazy so opening a current server report cannot
// even read an older attempt from sessionStorage.
// eslint-disable-next-line react-refresh/only-export-components
export const readLegacySpeakingSessionFallback = <T,>(
  assessment: unknown,
  readFallback: () => T[],
): T[] => (isCanonicalSpeakingAssessment(assessment) ? [] : readFallback());

const CANONICAL_CRITERION_KEYS: Record<
  CanonicalSpeakingAnnotationKey,
  EvidenceCriterionKey
> = {
  taskAchievement: "achievement",
  fluencyAndCoherence: "coherence",
  lexicalResource: "lexical",
  grammaticalRangeAndAccuracy: "grammar",
};

const getCanonicalSectionFeedback = (
  assessment: CanonicalSpeakingAssessment,
  sectionKey: SpeakingDeepReviewSectionKey,
  questionId: string | null | undefined,
) => {
  const section = assessment.sectionResults.find(
    (candidate) => candidate.sectionKey === sectionKey,
  );
  const criteria = section?.rubricFeedback
    ? {
        achievement: cleanText(section.rubricFeedback.taskAchievement),
        coherence: cleanText(section.rubricFeedback.fluencyAndCoherence),
        lexical: cleanText(section.rubricFeedback.lexicalResource),
        grammar: cleanText(
          section.rubricFeedback.grammaticalRangeAndAccuracy,
        ),
        pronunciation: cleanText(
          section.rubricFeedback.pronunciationAndIntelligibility,
        ),
      }
    : {};
  const annotations = Array.isArray(section?.annotations)
    ? section.annotations
        .filter((annotation) => annotation.questionId === questionId)
        .map((annotation): SpeakingAnnotation | null => {
          const criterion = CANONICAL_CRITERION_KEYS[annotation.criterion];
          const original = normalizeSpeakingQuestionText(annotation.quote);
          if (!criterion || !original) return null;
          return {
            id: cleanText(annotation.annotationId),
            canonical: true,
            criterion,
            errorType: formatSpeakingErrorType(annotation.errorType),
            original,
            corrected: cleanText(annotation.rewrite),
            explanation: cleanText(annotation.explanation),
            occurrence: annotation.occurrence,
            severity: annotation.severity,
            matchFound: true,
          };
        })
        .filter((annotation): annotation is SpeakingAnnotation => Boolean(annotation))
    : [];
  const selectedQuestionFeedback = Array.isArray(section?.questionFeedback)
    ? section.questionFeedback.find(
        (candidate) => candidate.questionId === questionId,
      )
    : undefined;
  const questionFeedback = cleanText(selectedQuestionFeedback?.feedback);
  const questionInsights = Array.isArray(selectedQuestionFeedback?.items)
    ? selectedQuestionFeedback.items
        .map((item): CanonicalSpeakingQuestionInsight | null => {
          const quote = normalizeSpeakingQuestionText(item.quote);
          const explanation = cleanText(item.explanation);
          if (
            (item.type !== "strength" && item.type !== "development") ||
            (item.type === "strength" && !quote) ||
            !explanation
          ) {
            return null;
          }
          return {
            type: item.type,
            quote,
            explanation,
            suggestion: cleanText(item.suggestion),
            exampleSentence: cleanText(item.exampleSentence),
          };
        })
        .filter(
          (item): item is CanonicalSpeakingQuestionInsight => Boolean(item),
        )
    : [];

  return {
    criteria,
    annotations,
    annotationsEmpty: Array.isArray(section?.annotations) &&
      section.annotations.filter((annotation) => annotation.questionId === questionId)
        .length === 0,
    questionFeedback,
    questionInsights,
    hasAudioGroundedTranscript:
      typeof selectedQuestionFeedback?.heardTranscript === "string",
    heardTranscript: normalizeSpeakingQuestionText(
      selectedQuestionFeedback?.heardTranscript,
    ),
    questionStrength: cleanText(selectedQuestionFeedback?.strength),
    questionDevelopmentPoint: cleanText(
      selectedQuestionFeedback?.developmentPoint,
    ),
    improvedResponseExample: cleanText(
      selectedQuestionFeedback?.improvedResponseExample,
    ),
    improvedResponseType:
      selectedQuestionFeedback?.rewriteType === "MODEL_EXAMPLE"
        ? "MODEL_EXAMPLE"
        : selectedQuestionFeedback?.rewriteType === "YOUR_ANSWER"
          ? "YOUR_ANSWER"
          : null,
    score:
      typeof section?.sectionScore === "number" &&
      Number.isFinite(section.sectionScore)
        ? section.sectionScore
        : null,
    strength: "",
    limiter: "",
    summary: "",
  };
};

const isPlaceholderText = (value: string) => {
  const normalized = value
    .toLocaleLowerCase("tr-TR")
    .replace(/(?:\[|\]|[().:])/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    "yanıt yok",
    "yanit yok",
    "cevap yok",
    "cevap verilmedi",
    "değerlendirme yok",
    "degerlendirme yok",
    "ses metne dönüştürülemedi",
    "ses metne donusturulemedi",
    "transkript oluşturulamadı",
    "transkript olusturulamadi",
  ].some((placeholder) => normalized === placeholder || normalized.startsWith(`${placeholder} `));
};

const readTextValue = (value: unknown): string => {
  if (typeof value === "string") {
    const text = cleanText(value);
    return text && !isPlaceholderText(text) ? text : "";
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const source = value as Record<string, unknown>;
  for (const key of [
    "feedback",
    "degerlendirme",
    "değerlendirme",
    "summary",
    "text",
    "comment",
    "description",
  ]) {
    const text = cleanText(source[key]);
    if (text && !isPlaceholderText(text)) return text;
  }
  return "";
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = readTextValue(value);
    if (text) return text;
  }
  return "";
};

const formatSpeakingErrorType = (value: unknown) => {
  const raw = cleanText(value);
  if (!raw) return "Konuşma hatası";
  const normalized = raw
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, "$1_$2")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    baglac_eksikligi: "Bağlaç eksikliği",
    baglac_tekrari: "Bağlaç tekrarı",
    yanlis_kelime: "Yanlış kelime seçimi",
    kelime_tekrari: "Kelime tekrarı",
    ek_uyumsuzlugu: "Ek uyumsuzluğu",
    ozne_yuklem_uyumsuzlugu: "Özne-yüklem uyumsuzluğu",
    zaman_uyumsuzlugu: "Zaman uyumsuzluğu",
    cumle_yapisi: "Cümle yapısı",
    gorev_kapsami: "Görev kapsamı",
    fikir_gelistirme: "Fikir geliştirme",
    gecis_eksikligi: "Geçiş ifadesi eksikliği",
    inappropriate_word_choice: "Uygunsuz kelime seçimi",
    wrong_word_choice: "Yanlış kelime seçimi",
    subject_verb_agreement: "Özne-yüklem uyumsuzluğu",
    sentence_structure: "Cümle yapısı",
    missing_connector: "Bağlaç eksikliği",
    connector_repetition: "Bağlaç tekrarı",
    limited_development: "Fikir geliştirme",
    direct_reading: "Doğrudan okuma",
    yuklem_yapisi: "Yüklem yapısı",
    isim_yuklem_uyumsuzlugu: "İsim-yüklem uyumsuzluğu",
    uygunsuz_sozcuk_birlesimi: "Uygunsuz sözcük birleşimi",
    tamamlanmamis_sonuc: "Tamamlanmamış sonuç",
  };
  if (labels[normalized]) return labels[normalized];
  const humanized = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return humanized
    ? `${humanized.charAt(0).toLocaleUpperCase("tr-TR")}${humanized.slice(1)}`
    : "Konuşma hatası";
};

const normalizeCriterionKey = (
  value: unknown,
): Exclude<CriterionKey, "all"> | null => {
  const normalized = cleanText(value).toLocaleLowerCase("tr-TR");
  if (!normalized) return null;

  for (const criterion of CRITERIA) {
    const candidates = [criterion.key, ...criterion.aliases].map((candidate) =>
      candidate.toLocaleLowerCase("tr-TR"),
    );
    if (candidates.includes(normalized)) return criterion.key;
  }

  if (/görev|gorev|içerik|icerik|örnek|ornek|gerekçe|gerekce/.test(normalized)) {
    return "achievement";
  }
  if (/akış|akis|tutarl|bağlaç|baglac|bağlılık|baglilik|geçiş|gecis/.test(normalized)) {
    return "coherence";
  }
  if (/kelime|sözcük|sozcuk|ifade|üslup|uslup|tekrar/.test(normalized)) {
    return "lexical";
  }
  if (/dil bilgisi|dilbilgisi|gramer|grammar|cümle|cumle|kip|zaman|uyum|ek/.test(normalized)) {
    return "grammar";
  }
  return null;
};

const inferLegacyCriterion = (value: unknown): EvidenceCriterionKey => {
  const criterion = normalizeCriterionKey(value);
  return criterion &&
    criterion !== "achievement" &&
    criterion !== "pronunciation"
    ? criterion
    : "grammar";
};

const normalizeAnnotation = (
  value: unknown,
  index: number,
  fallbackCriterion?: EvidenceCriterionKey,
): SpeakingAnnotation | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const criterion = normalizeCriterionKey(source.criterion ?? source.category) ?? fallbackCriterion;
  const original = firstText(source.original, source.alinti, source["alıntı"]);
  const corrected = firstText(
    source.corrected,
    source.duzeltilmis,
    source["düzeltilmiş"],
    source.suggestion,
  );
  const explanation = firstText(source.explanation, source.reason, source.neden);
  let errorType = formatSpeakingErrorType(
    firstText(source.errorType, source.error_type, source.hataTuru, source["hata_türü"]) ||
    CRITERIA.find((item) => item.key === criterion)?.label ||
    "Konuşma hatası",
  );
  const criterionLabel = CRITERIA.find((item) => item.key === criterion)?.label;
  if (criterionLabel && errorType === criterionLabel) {
    errorType =
      criterion === "coherence"
          ? "Akış bağlantısı"
          : criterion === "lexical"
            ? "Kelime seçimi"
            : "Cümle yapısı";
  }
  const severityValue = cleanText(source.severity).toLowerCase();
  const occurrenceValue = Number(source.occurrence);

  if (
    !criterion ||
    criterion === "achievement" ||
    criterion === "pronunciation" ||
    !original ||
    (!corrected && !explanation) ||
    source.matchFound === false
  ) {
    return null;
  }

  return {
    id: cleanText(source.id) || `speaking-annotation-${index + 1}`,
    evidenceId: cleanText(source.evidenceId) || undefined,
    criterion,
    errorType,
    original,
    corrected,
    explanation,
    occurrence:
      Number.isInteger(occurrenceValue) && occurrenceValue > 0 ? occurrenceValue : undefined,
    severity:
      severityValue === "minor" || severityValue === "major" ? severityValue : "medium",
    matchFound: true,
  };
};

const readLegacyAnnotations = (source: Record<string, unknown>): SpeakingAnnotation[] => {
  const structuredCandidate =
    source.genel_degerlendirme_yapilandirilmis ??
    source.general_structured ??
    source.structuredGeneral;
  if (
    !structuredCandidate ||
    typeof structuredCandidate !== "object" ||
    Array.isArray(structuredCandidate)
  ) {
    return [];
  }

  const structured = structuredCandidate as Record<string, unknown>;
  const correctionsCandidate =
    structured.alinti_duzeltme ?? structured["alıntı_düzeltme"] ?? structured.corrections;
  if (!Array.isArray(correctionsCandidate)) return [];

  return correctionsCandidate
    .map((item, index) => {
      const sourceItem =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      return normalizeAnnotation(
        sourceItem,
        index,
        inferLegacyCriterion(
          `${cleanText(sourceItem.neden)} ${cleanText(sourceItem.explanation)}`,
        ),
      );
    })
    .filter((item): item is SpeakingAnnotation => Boolean(item));
};

const sanitizeLegacySpeakingCriterion = (value: string) =>
  sanitizeSpeakingLearnerCopy(value);

const getSectionFeedback = (
  feedback: unknown,
  sectionKey: SpeakingDeepReviewSectionKey,
) => {
  const unwrapped = unwrapAiFeedback(feedback);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    return {
      criteria: {} as Record<string, string>,
      annotations: [] as SpeakingAnnotation[],
      annotationsEmpty: false,
      questionFeedback: "",
      questionInsights: [] as CanonicalSpeakingQuestionInsight[],
      hasAudioGroundedTranscript: false,
      heardTranscript: "",
      questionStrength: "",
      questionDevelopmentPoint: "",
      improvedResponseExample: "",
      improvedResponseType: null as "YOUR_ANSWER" | "MODEL_EXAMPLE" | null,
      score: null as number | null,
      strength: "",
      limiter: "",
      summary: "",
    };
  }

  const source = unwrapped as Record<string, unknown>;
  const sectionsCandidate = source.bolumler ?? source["bölümler"];
  const sections =
    sectionsCandidate && typeof sectionsCandidate === "object" && !Array.isArray(sectionsCandidate)
      ? (sectionsCandidate as Record<string, unknown>)
      : {};
  const turkishKey = sectionKey.replace("bolum", "bölüm");
  const sectionCandidate = sections[sectionKey] ?? sections[turkishKey] ?? source[sectionKey] ?? source[turkishKey];
  const hasSection = Boolean(
    sectionCandidate &&
      typeof sectionCandidate === "object" &&
      !Array.isArray(sectionCandidate),
  );
  const section =
    hasSection
      ? (sectionCandidate as Record<string, unknown>)
      : {};
  const criteriaCandidate = section.kriterler ?? section.criteria;
  const criteriaSource =
    criteriaCandidate && typeof criteriaCandidate === "object" && !Array.isArray(criteriaCandidate)
      ? (criteriaCandidate as Record<string, unknown>)
      : hasSection
        ? section
        : source;

  const criteria = CRITERIA.reduce<Record<string, string>>((result, definition) => {
    const value = firstText(...definition.aliases.map((alias) => criteriaSource[alias]));
    const learnerValue = sanitizeLegacySpeakingCriterion(value);
    if (learnerValue) result[definition.key] = learnerValue;
    return result;
  }, {});
  const sectionAnnotations = Array.isArray(section.annotations)
    ? section.annotations
        .map((item, index) => normalizeAnnotation(item, index))
        .filter((item): item is SpeakingAnnotation => Boolean(item))
    : [];
  const legacyAnnotations = readLegacyAnnotations(source);
  return {
    criteria,
    annotations: [...sectionAnnotations, ...legacyAnnotations],
    annotationsEmpty: false,
    questionFeedback: "",
    questionInsights: [] as CanonicalSpeakingQuestionInsight[],
    hasAudioGroundedTranscript: false,
    heardTranscript: "",
    questionStrength: "",
    questionDevelopmentPoint: "",
    improvedResponseExample: "",
    improvedResponseType: null as "YOUR_ANSWER" | "MODEL_EXAMPLE" | null,
    score:
      typeof section.puan === "number" && Number.isFinite(section.puan)
        ? section.puan
        : null,
    strength: sanitizeSpeakingLearnerCopy(
      firstText(
        section.gucluYon,
        section.guclu_yon,
        section["güçlü_yön"],
      ),
    ),
    limiter: sanitizeSpeakingLearnerCopy(
      firstText(
        section.puaniSinirlayanNokta,
        section.puani_sinirlayan_nokta,
        section["puanı_sınırlayan_nokta"],
      ),
    ),
    summary: sanitizeSpeakingLearnerCopy(
      firstText(
        section.degerlendirme,
        section["değerlendirme"],
        section.summary,
        sectionKey === "bolum_1_1" || sectionKey === "bolum_1_2"
          ? source.part1
          : sectionKey === "bolum_2"
            ? source.part2
            : source.part3,
      ),
    ),
  };
};

const buildSpeakingAssessmentLockContext = (
  feedback: unknown,
): SpeakingAssessmentLockContext | null => {
  const unwrapped = unwrapAiFeedback(feedback);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    return null;
  }
  const source = unwrapped as Record<string, unknown>;
  const sectionsCandidate = source.bolumler ?? source["bölümler"];
  if (
    !sectionsCandidate ||
    typeof sectionsCandidate !== "object" ||
    Array.isArray(sectionsCandidate)
  ) {
    return null;
  }
  const sections = sectionsCandidate as Record<string, unknown>;
  const entries = (
    Object.keys(SECTION_MAXIMUMS) as SpeakingDeepReviewSectionKey[]
  ).map((sectionKey) => {
    const turkishKey = sectionKey.replace("bolum", "bölüm");
    const candidate = sections[sectionKey] ?? sections[turkishKey];
    const section =
      candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? (candidate as Record<string, unknown>)
        : null;
    const score = section?.puan;
    return [sectionKey, score] as const;
  });
  const rawScore = source.ham_puan;
  const isValidHalfStep = (value: unknown, maximum: number) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maximum &&
    Number.isInteger(value * 2);
  if (
    !isValidHalfStep(rawScore, 21) ||
    entries.some(
      ([sectionKey, value]) =>
        !isValidHalfStep(value, SECTION_MAXIMUMS[sectionKey]),
    )
  ) {
    return null;
  }
  const bolumler = Object.fromEntries(
    entries.map(([sectionKey, value]) => [sectionKey, { puan: value as number }]),
  ) as SpeakingAssessmentLockContext["bolumler"];
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  return total === rawScore
    ? { ham_puan: rawScore, bolumler }
    : null;
};

const stableSpeakingLockValue = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.assessmentVersion === "speaking-canonical-v1") {
    const canonicalSource = source as CanonicalSpeakingAssessment;
    const sectionScore = (sectionKey: SpeakingDeepReviewSectionKey) => {
      const section = canonicalSource.sectionResults.find(
        (candidate) => candidate.sectionKey === sectionKey,
      );
      return typeof section?.sectionScore === "number" &&
        Number.isFinite(section.sectionScore)
        ? section.sectionScore
        : null;
    };
    return {
      ham_puan:
        typeof canonicalSource.rawScore === "number" &&
        Number.isFinite(canonicalSource.rawScore)
          ? canonicalSource.rawScore
          : null,
      bolum_1_1: sectionScore("bolum_1_1"),
      bolum_1_2: sectionScore("bolum_1_2"),
      bolum_2: sectionScore("bolum_2"),
      bolum_3: sectionScore("bolum_3"),
    };
  }
  const sectionsCandidate = source.bolumler ?? source["bölümler"];
  const sections =
    sectionsCandidate &&
    typeof sectionsCandidate === "object" &&
    !Array.isArray(sectionsCandidate)
      ? (sectionsCandidate as Record<string, unknown>)
      : {};
  const readScore = (sectionKey: SpeakingDeepReviewSectionKey) => {
    const turkishKey = sectionKey.replace("bolum", "bölüm");
    const candidate = sections[sectionKey] ?? sections[turkishKey];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    const score = (candidate as Record<string, unknown>).puan;
    return typeof score === "number" && Number.isFinite(score) ? score : null;
  };
  return {
    ham_puan:
      typeof source.ham_puan === "number" && Number.isFinite(source.ham_puan)
        ? source.ham_puan
        : null,
    bolum_1_1: readScore("bolum_1_1"),
    bolum_1_2: readScore("bolum_1_2"),
    bolum_2: readScore("bolum_2"),
    bolum_3: readScore("bolum_3"),
  };
};

const createSpeakingAssessmentLockFingerprint = (value: unknown) =>
  JSON.stringify(stableSpeakingLockValue(value));

type SpeakingEvidencePendingRequest<T = SpeakingEvidenceAnalysisResponse> = {
  key: string;
  promise: Promise<T>;
};

const getOrCreateSpeakingEvidenceRequest = <T,>(
  current: SpeakingEvidencePendingRequest<T> | null,
  key: string,
  load: () => Promise<T>,
) => current?.key === key ? current : { key, promise: load() };

type SpeakingEvidenceRequestIdentity = {
  submissionId: string;
  lockFingerprint: string;
  generation: number;
};

const shouldAcceptSpeakingEvidenceResponse = (
  current: SpeakingEvidenceRequestIdentity & { aborted: boolean },
  expected: SpeakingEvidenceRequestIdentity,
) =>
  !current.aborted &&
  current.submissionId === expected.submissionId &&
  current.lockFingerprint === expected.lockFingerprint &&
  current.generation === expected.generation;

const selectSpeakingPresentationFeedback = (
  _evidenceResult: SpeakingEvidenceAnalysisResponse | null,
  savedFeedback: unknown,
): {
  presentationFeedback: unknown;
  assessmentOverlay: SpeakingEvidenceAnalysisResponse["assessmentOverlay"];
} => {
  return {
    presentationFeedback: savedFeedback,
    assessmentOverlay: null,
  };
};

const normalizeSpeakingQuestionText = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";

// Shared by the two result adapters so they mark only the persisted one-recording layout.
// eslint-disable-next-line react-refresh/only-export-components
export const isExplicitSingleRecordingCombinedPrompt = (
  sectionKey: SpeakingDeepReviewSectionKey,
  questions: SpeakingDeepReviewQuestion[],
) => {
  if (sectionKey !== "bolum_2") return false;
  const audioIds = new Set(
    questions
      .map((question) => question.audio?.audioId)
      .filter((audioId): audioId is string => Boolean(audioId?.trim())),
  );
  if (audioIds.size === 1) return true;
  if (audioIds.size > 1 || questions.length < 2) return false;

  const persistedTranscripts = new Set(
    questions
      .map((question) => normalizeSpeakingQuestionText(question.transcript))
      .filter(Boolean),
  );
  return persistedTranscripts.size === 1;
};

const selectSpeakingReviewQuestion = (
  section: SpeakingDeepReviewSection,
  selectedIndex: number,
) => {
  const selectedQuestion =
    section.questions[Math.min(selectedIndex, section.questions.length - 1)] ??
    section.questions[0];
  const combined =
    section.singleRecordingCombinedPrompt === true &&
    isExplicitSingleRecordingCombinedPrompt(section.key, section.questions);
  if (!combined) return { combined: false, question: selectedQuestion };
  const audioQuestion = section.questions.find((question) =>
    Boolean(question.audio?.audioId?.trim()),
  );
  const persistedAnswerQuestion = section.questions.find((question) =>
    Boolean(normalizeSpeakingQuestionText(question.transcript)),
  );
  const combinedAnswerQuestion = audioQuestion ?? persistedAnswerQuestion;
  return combinedAnswerQuestion
    ? { combined: true, question: combinedAnswerQuestion }
    : { combined: false, question: selectedQuestion };
};

const selectSpeakingQuestionEvidence = (
  recordings: SpeakingEvidenceAnalysisResponse["recordings"],
  sectionKey: SpeakingDeepReviewSectionKey,
  audioId: string | null | undefined,
  savedTranscript: string | null | undefined,
  _allowSingleRecordingCombinedPromptFallback: boolean,
) => {
  const sectionRecordings = recordings.filter(
    (recording) => recording.sectionKey === sectionKey,
  );
  const exact = audioId
    ? sectionRecordings.find((recording) => recording.audioId === audioId)
    : undefined;
  const recording = exact ?? null;
  return {
    recording,
    transcript:
      recording?.resolvedTranscript.displayText || savedTranscript || "",
    usesEvidence: Boolean(recording),
  };
};

const findTextOccurrence = (
  transcript: string,
  original: string,
  occurrence: number,
): { start: number; end: number } | null => {
  let searchFrom = 0;
  for (let current = 1; current <= occurrence; current += 1) {
    const start = transcript.indexOf(original, searchFrom);
    if (start < 0) return null;
    if (current === occurrence) return { start, end: start + original.length };
    searchFrom = start + Math.max(original.length, 1);
  }
  return null;
};

const findAnnotationMatch = (
  transcriptValue: unknown,
  originalValue: unknown,
  occurrenceValue?: unknown,
): { start: number; end: number } | null => {
  const transcript = normalizeSpeakingQuestionText(transcriptValue);
  const original = normalizeSpeakingQuestionText(originalValue);
  if (!transcript || !original) return null;
  if (occurrenceValue === undefined || occurrenceValue === null) {
    return findSpeakingQuoteRange(transcript, original);
  }
  const numericOccurrence = Number(occurrenceValue);
  const occurrence =
    Number.isInteger(numericOccurrence) && numericOccurrence > 0 ? numericOccurrence : 1;

  const exactMatch = findTextOccurrence(transcript, original, occurrence);
  if (exactMatch) return exactMatch;

  const turkishCaseMatch = findTextOccurrence(
    transcript.toLocaleLowerCase("tr-TR"),
    original.toLocaleLowerCase("tr-TR"),
    occurrence,
  );
  if (turkishCaseMatch) return turkishCaseMatch;

  // Accept Latin/Turkish capital-I variants in quoted names without collapsing
  // genuinely different lowercase letters (e.g. "sık" and "sik"). Replacements
  // preserve string length so highlights still point to the displayed text.
  const lowerTranscript = transcript.replace(/[Iİ]/gu, "i").toLocaleLowerCase("tr-TR");
  const lowerOriginal = original.replace(/[Iİ]/gu, "i").toLocaleLowerCase("tr-TR");
  const lowerMatch = findTextOccurrence(
    lowerTranscript,
    lowerOriginal,
    occurrence,
  );
  if (lowerMatch) return lowerMatch;

  const tokens = lowerOriginal.match(/[\p{L}\p{N}]+/gu) || [];
  if (tokens.length === 0) return null;
  const escapedTokens = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
  );
  const punctuationTolerant = new RegExp(
    escapedTokens.join("[^\\p{L}\\p{N}]+"),
    "gu",
  );
  let matchedOccurrence = 0;
  let match: RegExpExecArray | null;
  while ((match = punctuationTolerant.exec(lowerTranscript)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const before = start > 0 ? lowerTranscript[start - 1] : "";
    const after = end < lowerTranscript.length ? lowerTranscript[end] : "";
    if (/\p{L}|\p{N}/u.test(before) || /\p{L}|\p{N}/u.test(after)) {
      continue;
    }
    matchedOccurrence += 1;
    if (matchedOccurrence === occurrence) return { start, end };
  }
  return null;
};

const selectSpeakingQuestionAnnotations = <
  T extends { evidenceId?: string; original?: string; occurrence?: number },
>(
  overlayAnnotations: T[],
  officialAnnotations: T[],
  evidenceAudioId: string | null | undefined,
  presentationProvenance:
    | "MODEL_OVERLAY"
    | "BASE_FALLBACK"
    | "LEGACY_STORED_FALLBACK"
      | undefined,
  questionCount: number,
  visibleTranscript?: unknown,
) => {
  if (
    evidenceAudioId &&
    (presentationProvenance === "MODEL_OVERLAY" ||
      presentationProvenance === "BASE_FALLBACK")
  ) {
    const scopedAnnotations = overlayAnnotations.filter(
      (annotation) => annotation.evidenceId === evidenceAudioId,
    );
    if (scopedAnnotations.length > 0) return scopedAnnotations;
  }
  if (questionCount === 1) return officialAnnotations;

  const transcript = normalizeSpeakingQuestionText(visibleTranscript);
  if (!transcript) return [];
  const belongsToVisibleTranscript = (annotation: T) =>
    Boolean(
      findAnnotationMatch(
        transcript,
        annotation.original,
        annotation.occurrence,
      ),
    );
  const scopedOfficialAnnotations = officialAnnotations.filter(
    belongsToVisibleTranscript,
  );
  return scopedOfficialAnnotations.length > 0
    ? scopedOfficialAnnotations
    : overlayAnnotations.filter(belongsToVisibleTranscript);
};

const restoreSpeakingEvidenceAfterFailure = <T,>(
  current: T,
  previous: T,
  accepted: boolean,
) => (accepted ? previous : current);

const normalizeSpeakingVisualRefs = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const visuals: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const visual = candidate.trim();
    if (
      !visual ||
      visual.length > 2_048 ||
      !/^(?:https?:\/\/|\/(?!\/)|blob:|data:image\/(?:png|jpe?g|webp|gif);base64,)/iu.test(
        visual,
      ) ||
      visuals.includes(visual)
    ) {
      continue;
    }
    visuals.push(visual);
    if (visuals.length === 2) break;
  }
  return visuals;
};

// Shared by both result adapters so archived and direct result routes expose
// the same immutable Part 3 prompt context.
// eslint-disable-next-line react-refresh/only-export-components
export const extractSpeakingDiscussionPoints = (
  value: unknown,
): SpeakingDiscussionPoints => {
  type OrderedPoint = { order: number; text: string };
  const collected: Record<"advantages" | "disadvantages", OrderedPoint[]> = {
    advantages: [],
    disadvantages: [],
  };
  const seen = new WeakSet<object>();
  let visitedNodes = 0;

  const cleanPointText = (candidate: unknown) => {
    const raw =
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>).text
          : "";
    if (typeof raw !== "string") return "";
    const withoutControlCharacters = Array.from(raw, (character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127 ? " " : character;
    }).join("");
    return withoutControlCharacters
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 500);
  };

  const addPoint = (
    bucket: "advantages" | "disadvantages",
    candidate: unknown,
    order: unknown,
  ) => {
    const text = cleanPointText(candidate);
    if (!text || collected[bucket].some((item) => item.text === text)) return;
    const numericOrder = Number(order);
    collected[bucket].push({
      order: Number.isFinite(numericOrder) ? numericOrder : collected[bucket].length + 1,
      text,
    });
  };

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object" || visitedNodes >= 2_000) return;
    if (seen.has(node)) return;
    seen.add(node);
    visitedNodes += 1;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    if (Array.isArray(record.points)) {
      record.points.forEach((point, index) => {
        if (!point || typeof point !== "object" || Array.isArray(point)) return;
        const pointRecord = point as Record<string, unknown>;
        const type = String(pointRecord.type || "").toUpperCase();
        if (type === "ADVANTAGE") {
          addPoint("advantages", pointRecord.example, pointRecord.order ?? index + 1);
        } else if (type === "DISADVANTAGE") {
          addPoint("disadvantages", pointRecord.example, pointRecord.order ?? index + 1);
        }
      });
    }

    if (Array.isArray(record.advantages)) {
      record.advantages.forEach((point, index) =>
        addPoint("advantages", point, index + 1),
      );
    }
    if (Array.isArray(record.disadvantages)) {
      record.disadvantages.forEach((point, index) =>
        addPoint("disadvantages", point, index + 1),
      );
    }

    Object.values(record).forEach(walk);
  };

  walk(value);
  const orderedText = (items: OrderedPoint[]) =>
    items
      .sort((left, right) => left.order - right.order)
      .slice(0, 6)
      .map((item) => item.text);
  return {
    advantages: orderedText(collected.advantages),
    disadvantages: orderedText(collected.disadvantages),
  };
};

const getTabDestinationIndex = (
  currentIndex: number,
  itemCount: number,
  key: string,
) => {
  if (itemCount <= 0) return null;
  if (key === "ArrowLeft") return (currentIndex - 1 + itemCount) % itemCount;
  if (key === "ArrowRight") return (currentIndex + 1) % itemCount;
  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  return null;
};

type SpeakingEvidenceControllerParams = {
  submissionId: string;
  lockFingerprint: string;
  lock: unknown;
};

type SpeakingEvidenceControllerDependencies = {
  get: (
    submissionId: string,
    lock: unknown,
    signal: AbortSignal,
  ) => Promise<SpeakingEvidenceAnalysisResponse>;
  analyze: (
    submissionId: string,
    lock: unknown,
    signal: AbortSignal,
  ) => Promise<SpeakingEvidenceAnalysisResponse>;
  updateEvidence: (
    update: (
      current: SpeakingEvidenceState | null,
    ) => SpeakingEvidenceState | null,
  ) => void;
  updateAction: (
    update: (
      current: SpeakingAnalysisActionState | null,
    ) => SpeakingAnalysisActionState | null,
  ) => void;
  safeError: string;
  scheduleRetry?: (
    callback: () => void | Promise<void>,
    delayMs: number,
  ) => () => void;
};

const createSpeakingEvidenceTransport = (
  service: Pick<typeof pronunciationAnalysisService, "get" | "analyze">,
) => {
  return {
    get: (submissionId: string, lock: unknown, signal: AbortSignal) =>
      service.get(submissionId, lock, { signal }),
    analyze: (submissionId: string, lock: unknown, signal: AbortSignal) =>
      service.analyze(submissionId, lock, { signal }),
  };
};

const createSpeakingEvidenceRequestController = (
  dependencies: SpeakingEvidenceControllerDependencies,
) => {
  let generation = 0;
  let disposeGeneration = 0;
  let active:
    | (SpeakingEvidenceRequestIdentity & { controller: AbortController })
    | null = null;
  let pendingGet: SpeakingEvidencePendingRequest<void> | null = null;
  let evidenceSnapshot: SpeakingEvidenceState | null = null;
  let cancelScheduledRetry: (() => void) | null = null;
  let retryKey = "";
  let retryCount = 0;
  const maximumAutomaticRetries = 150;
  const automaticRetryDelayMs = 2_000;
  const scheduleRetry =
    dependencies.scheduleRetry ??
    ((callback: () => void | Promise<void>, delayMs: number) => {
      const timer = setTimeout(() => void callback(), delayMs);
      return () => clearTimeout(timer);
    });

  const writeEvidence = (next: SpeakingEvidenceState | null) => {
    evidenceSnapshot = next;
    dependencies.updateEvidence(() => next);
  };
  const writeAction = (next: SpeakingAnalysisActionState | null) => {
    dependencies.updateAction(() => next);
  };
  const cancelScheduledDispose = () => {
    disposeGeneration += 1;
  };
  const stopScheduledRetry = () => {
    cancelScheduledRetry?.();
    cancelScheduledRetry = null;
  };
  const resetAutomaticRetry = () => {
    stopScheduledRetry();
    retryKey = "";
    retryCount = 0;
  };
  const begin = (params: SpeakingEvidenceControllerParams) => {
    active?.controller.abort();
    generation += 1;
    const controller = new AbortController();
    active = { ...params, generation, controller };
    return active;
  };
  const accepts = (
    request: SpeakingEvidenceRequestIdentity & {
      controller: AbortController;
    },
  ) =>
    shouldAcceptSpeakingEvidenceResponse(
      {
        submissionId: active?.submissionId ?? "",
        lockFingerprint: active?.lockFingerprint ?? "",
        generation: active?.generation ?? -1,
        aborted: request.controller.signal.aborted,
      },
      request,
    );

  const startGet = (params: SpeakingEvidenceControllerParams) => {
    cancelScheduledDispose();
    const key = `${params.submissionId}:${params.lockFingerprint}`;
    if (pendingGet?.key === key) return pendingGet.promise;
    stopScheduledRetry();
    if (retryKey !== key) {
      retryKey = key;
      retryCount = 0;
    }
    const request = begin(params);
    let load: Promise<SpeakingEvidenceAnalysisResponse>;
    try {
      load = dependencies.get(
        params.submissionId,
        params.lock,
        request.controller.signal,
      );
    } catch (error) {
      load = Promise.reject(error);
    }
    const promise = load
      .then((result) => {
        if (!accepts(request)) return;
        writeEvidence({
          submissionId: params.submissionId,
          lockFingerprint: params.lockFingerprint,
          result,
        });
        if (
          (result.status === "READY" || result.status === "RUNNING") &&
          retryCount < maximumAutomaticRetries
        ) {
          retryCount += 1;
          cancelScheduledRetry = scheduleRetry(async () => {
            cancelScheduledRetry = null;
            await startGet(params);
          }, automaticRetryDelayMs);
        } else {
          resetAutomaticRetry();
        }
      })
      .catch(() => {
        if (!accepts(request)) return;
        resetAutomaticRetry();
        writeEvidence({
          submissionId: params.submissionId,
          lockFingerprint: params.lockFingerprint,
          result: null,
        });
      })
      .finally(() => {
        if (pendingGet?.promise === promise) pendingGet = null;
      });
    pendingGet = getOrCreateSpeakingEvidenceRequest(null, key, () => promise);
    return pendingGet.promise;
  };

  const startPost = (params: SpeakingEvidenceControllerParams) => {
    cancelScheduledDispose();
    resetAutomaticRetry();
    pendingGet = null;
    const previous =
      evidenceSnapshot?.submissionId === params.submissionId &&
      evidenceSnapshot.lockFingerprint === params.lockFingerprint
        ? evidenceSnapshot
        : null;
    const request = begin(params);
    writeAction({
      submissionId: params.submissionId,
      lockFingerprint: params.lockFingerprint,
      running: true,
      error: "",
    });
    if (previous?.result) {
      writeEvidence({
        ...previous,
        result: { ...previous.result, status: "RUNNING" },
      });
    }
    let analyze: Promise<SpeakingEvidenceAnalysisResponse>;
    try {
      analyze = dependencies.analyze(
        params.submissionId,
        params.lock,
        request.controller.signal,
      );
    } catch (error) {
      analyze = Promise.reject(error);
    }
    return analyze
      .then((result) => {
        if (!accepts(request)) return;
        writeEvidence({
          submissionId: params.submissionId,
          lockFingerprint: params.lockFingerprint,
          result,
        });
        writeAction({
          submissionId: params.submissionId,
          lockFingerprint: params.lockFingerprint,
          running: false,
          error: "",
        });
      })
      .catch(() => {
        if (!accepts(request)) return;
        writeEvidence(
          restoreSpeakingEvidenceAfterFailure(
            evidenceSnapshot,
            previous,
            true,
          ),
        );
        writeAction({
          submissionId: params.submissionId,
          lockFingerprint: params.lockFingerprint,
          running: false,
          error: dependencies.safeError,
        });
      });
  };

  const scheduleDispose = () => {
    disposeGeneration += 1;
    const scheduled = disposeGeneration;
    queueMicrotask(() => {
      if (disposeGeneration !== scheduled) return;
      resetAutomaticRetry();
      active?.controller.abort();
      active = null;
      pendingGet = null;
      generation += 1;
    });
  };

  return { startGet, startPost, scheduleDispose };
};

const hasTranscript = (value?: string | null) => {
  const normalized = cleanText(value);
  return Boolean(normalized && !isPlaceholderText(normalized));
};

const hasAudio = (audio?: SpeakingDeepReviewAudio) =>
  Boolean(audio?.hasAudio && audio.audioId);

// eslint-disable-next-line react-refresh/only-export-components
export const resolveSpeakingDiagnosticSeek = (
  sections: SpeakingDeepReviewSection[],
  sectionKey: string,
  audioId: string,
  requestedSeconds: number,
): { audio: SpeakingDeepReviewAudio; startSeconds: number } | null => {
  if (!sectionKey || !audioId) return null;
  const matches: SpeakingDeepReviewAudio[] = [];
  for (const section of sections) {
    if (section.key !== sectionKey) continue;
    for (const question of section.questions) {
      const audio = question.audio;
      if (hasAudio(audio) && audio?.audioId === audioId) matches.push(audio);
    }
  }
  const audio = matches.length === 1 ? matches[0] : null;
  if (!audio) return null;
  const safeRequestedSeconds = Number.isFinite(requestedSeconds)
    ? Math.max(0, requestedSeconds)
    : 0;
  const durationSeconds =
    typeof audio.durationSeconds === "number" &&
    Number.isFinite(audio.durationSeconds) &&
    audio.durationSeconds >= 0
      ? audio.durationSeconds
      : safeRequestedSeconds;
  return {
    audio,
    startSeconds: Math.min(safeRequestedSeconds, durationSeconds),
  };
};

const summarizeCriterion = (value: string) => {
  const text = cleanText(value)
    .replace(/\b(?:alt|üst)\s*(?:A1|A2|B1|B2|C1)?\s*band[ıi]\b\s*[-–—:]*\s*/giu, "")
    .replace(/\b(?:A1|A2|B1|B2|C1)\s*(?:seviyesi|band[ıi])\b\s*[-–—:]*\s*/giu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Bu bölüm için değerlendirme bulunmuyor.";
  return text;
};

const splitCriterionSummary = (value: string) => {
  const summary = summarizeCriterion(value);
  const sentences = summary
    .match(/[^.!?]+(?:[.!?]+|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [summary];

  if (sentences.length === 1) {
    return { diagnosis: sentences[0], observation: "", limiter: "" };
  }
  if (sentences.length === 2) {
    return {
      diagnosis: sentences[0],
      observation: "",
      limiter: sentences[1],
    };
  }

  return {
    diagnosis: sentences[0],
    observation: sentences.slice(1, -1).join(" "),
    limiter: sentences[sentences.length - 1] || "",
  };
};

const getTranscriptAnnotations = (
  annotations: SpeakingAnnotation[],
  transcriptValue: unknown,
): AnnotationMatch[] => {
  const seen = new Set<string>();

  return annotations
    .map((annotation) => {
      const occurrence = annotation.occurrence ?? 1;
      const match = findAnnotationMatch(
        transcriptValue,
        annotation.original,
        annotation.occurrence,
      );
      if (!match) return null;
      const dedupeKey = annotation.canonical
        ? `${annotation.criterion}:${match.start}:${match.end}:${annotation.id}:${annotation.errorType}`
        : `${annotation.criterion}:${match.start}:${match.end}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      return { ...annotation, ...match, occurrence, matchFound: true };
    })
    .filter((annotation): annotation is AnnotationMatch => Boolean(annotation))
    .sort((left, right) => left.start - right.start || right.end - right.start - (left.end - left.start));
};

const groupAnnotationsByErrorType = (
  annotations: AnnotationMatch[],
): AnnotationGroup[] => {
  const groups: AnnotationGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  annotations.forEach((annotation) => {
    const errorType = cleanText(annotation.errorType) || "Konuşma hatası";
    const issueSignature = cleanText(annotation.original)
      .normalize("NFKC")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    const groupKey = `${annotation.criterion}:${errorType.toLocaleLowerCase("tr-TR")}:${
      issueSignature || annotation.id
    }`;
    const existingIndex = groupIndexByKey.get(groupKey);

    if (existingIndex === undefined) {
      groupIndexByKey.set(groupKey, groups.length);
      groups.push({
        id: `${annotation.criterion}-${groups.length + 1}`,
        criterion: annotation.criterion,
        errorType,
        annotations: [annotation],
      });
      return;
    }

    groups[existingIndex].annotations.push(annotation);
  });

  return groups;
};

const TRANSCRIPT_ISSUE_TONE = {
  development: {
    default: "bg-[#fff1c9] hover:bg-[#fbe8b4]",
    selected: "bg-[#ececea]",
  },
  issue: {
    default: "bg-[#fbe7e5] hover:bg-[#f8dcd9]",
    selected: "bg-[#ececea]",
  },
} as const;

// eslint-disable-next-line react-refresh/only-export-components
export const getTranscriptIssueTone = (
  severity: SpeakingAnnotation["severity"],
  selected: boolean,
) => {
  const tone =
    severity === "minor"
      ? TRANSCRIPT_ISSUE_TONE.development
      : TRANSCRIPT_ISSUE_TONE.issue;
  return selected ? tone.selected : tone.default;
};

type SpeakingAnnotationSelectionSource = "transcript" | "analysis";

// eslint-disable-next-line react-refresh/only-export-components
export const runSpeakingAnnotationSelection = (
  source: SpeakingAnnotationSelectionSource,
  select: () => void,
  requestAudio: () => void,
) => {
  select();
  if (source === "transcript") requestAudio();
};

// eslint-disable-next-line react-refresh/only-export-components
export const runSpeakingTranscriptSentenceSelection = (
  select: () => void,
  requestAudio: () => void,
) => {
  select();
  requestAudio();
};

// eslint-disable-next-line react-refresh/only-export-components
export const getTranscriptSentenceTone = (selected: boolean) =>
  selected ? "bg-[#ececea]" : "";

const getOverlappingAnnotationFragments = (
  annotations: AnnotationMatch[],
  rangeStart: number,
  rangeEnd: number,
) =>
  annotations
    .filter(
      (annotation) =>
        annotation.end > rangeStart && annotation.start < rangeEnd,
    )
    .map((annotation) => ({
      ...annotation,
      fragmentStart: Math.max(annotation.start, rangeStart),
      fragmentEnd: Math.min(annotation.end, rangeEnd),
    }))
    .filter((annotation) => annotation.fragmentEnd > annotation.fragmentStart)
    .sort(
      (left, right) =>
        left.fragmentStart - right.fragmentStart ||
        right.fragmentEnd - right.fragmentStart -
          (left.fragmentEnd - left.fragmentStart),
    );

type AnnotationRangeFragment = AnnotationMatch & {
  fragmentStart: number;
  fragmentEnd: number;
};

type ExactAnnotationRangeGroup = {
  fragmentStart: number;
  fragmentEnd: number;
  annotations: AnnotationRangeFragment[];
};

const groupExactAnnotationRanges = (
  annotations: AnnotationRangeFragment[],
): ExactAnnotationRangeGroup[] => {
  const groups: ExactAnnotationRangeGroup[] = [];
  const groupIndexByRange = new Map<string, number>();

  annotations.forEach((annotation) => {
    const rangeKey = `${annotation.fragmentStart}:${annotation.fragmentEnd}`;
    const existingIndex = groupIndexByRange.get(rangeKey);
    if (existingIndex === undefined) {
      groupIndexByRange.set(rangeKey, groups.length);
      groups.push({
        fragmentStart: annotation.fragmentStart,
        fragmentEnd: annotation.fragmentEnd,
        annotations: [annotation],
      });
      return;
    }
    groups[existingIndex].annotations.push(annotation);
  });

  return groups.sort(
    (left, right) =>
      left.fragmentStart - right.fragmentStart ||
      right.fragmentEnd - right.fragmentStart -
        (left.fragmentEnd - left.fragmentStart),
  );
};

const renderAnnotatedTranscript = (
  transcriptValue: unknown,
  annotations: AnnotationMatch[],
  selectedAnnotationGroupId: string | null,
  annotationGroupIdByAnnotation: Map<string, string>,
  onSelect: (annotationId: string) => void,
  registerAnnotation: (annotationId: string, element: HTMLSpanElement | null) => void,
  range?: { start: number; end: number },
  sentenceSelected = false,
  selectedQuoteRange: SpeakingQuoteRange | null = null,
  selectedQuoteTone: "neutral" | "strength" | "development" = "neutral",
  registerSelectedQuote?: (element: HTMLSpanElement | null) => void,
): ReactNode => {
  const transcript = normalizeSpeakingQuestionText(transcriptValue);
  const rangeStart = Math.max(0, Math.min(transcript.length, range?.start ?? 0));
  const rangeEnd = Math.max(
    rangeStart,
    Math.min(transcript.length, range?.end ?? transcript.length),
  );
  if (!transcript) return transcript;
  const renderText = (start: number, end: number, contextual = false) => (
    <SpeakingSelectedQuote
      key={`${start}-${end}`}
      text={maskSevereSpeakingLanguage(transcript, contextual).slice(start, end)}
      start={start}
      range={selectedQuoteRange}
      tone={selectedQuoteTone}
      register={registerSelectedQuote}
    />
  );
  if (annotations.length === 0) {
    return renderText(rangeStart, rangeEnd);
  }
  const rangeAnnotations = getOverlappingAnnotationFragments(
    annotations,
    rangeStart,
    rangeEnd,
  );
  if (rangeAnnotations.length === 0) {
    return renderText(rangeStart, rangeEnd);
  }

  const groupedRanges = groupExactAnnotationRanges(rangeAnnotations);
  const nonOverlapping: ExactAnnotationRangeGroup[] = [];
  let coveredUntil = rangeStart;
  for (const group of groupedRanges) {
    if (group.fragmentStart < coveredUntil) continue;
    nonOverlapping.push(group);
    coveredUntil = group.fragmentEnd;
  }

  const nodes: ReactNode[] = [];
  let cursor = rangeStart;
  for (const rangeGroup of nonOverlapping) {
    if (rangeGroup.fragmentStart > cursor) {
      nodes.push(
        renderText(cursor, rangeGroup.fragmentStart),
      );
    }
    const criteria = Array.from(
      new Set(rangeGroup.annotations.map((annotation) => annotation.criterion)),
    );
    const selected = rangeGroup.annotations.some(
      (annotation) =>
        selectedAnnotationGroupId === annotationGroupIdByAnnotation.get(annotation.id),
    );
    const firstAnnotation = rangeGroup.annotations[0];
    const maskContextualSexualLanguage = rangeGroup.annotations.some(
      (annotation) =>
        isContextuallyInappropriateSpeakingText(
          annotation.errorType,
          annotation.explanation,
        ),
    );
    nodes.push(
      <span
        key={`${rangeGroup.annotations.map((item) => item.id).join("-")}:${rangeGroup.fragmentStart}`}
        ref={(element) => {
          rangeGroup.annotations.forEach((annotation) =>
            registerAnnotation(annotation.id, element),
          );
        }}
        role="button"
        tabIndex={0}
        data-speaking-annotation={firstAnnotation.id}
        data-speaking-annotation-criteria={criteria.join(",")}
        aria-pressed={selected}
        aria-label={`${maskSevereSpeakingLanguage(
          transcript.slice(rangeGroup.fragmentStart, rangeGroup.fragmentEnd),
          maskContextualSexualLanguage,
        )}: ${criteria
          .map((criterion) => CRITERIA.find((item) => item.key === criterion)?.label)
          .filter(Boolean)
          .join(" ve ")}`}
        onClick={() => onSelect(firstAnnotation.id)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect(firstAnnotation.id);
        }}
        className={cn(
          "inline box-decoration-clone rounded-[2px] px-[2px] py-[1px] text-left font-inherit text-[#242424] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424]",
          getTranscriptIssueTone(
            firstAnnotation.severity,
            selected || sentenceSelected,
          ),
        )}
      >
        {renderText(
          rangeGroup.fragmentStart, rangeGroup.fragmentEnd,
          maskContextualSexualLanguage,
        )}
      </span>,
    );
    cursor = rangeGroup.fragmentEnd;
  }
  if (cursor < rangeEnd) {
    nodes.push(renderText(cursor, rangeEnd));
  }
  return nodes;
};

type TimedTranscriptSegment = SpeakingUtteranceSegment & {
  textStart: number;
  textEnd: number;
};

const mapUtterancesToTranscript = (
  transcriptValue: unknown,
  utterances: SpeakingUtteranceSegment[],
  recordingDurationSeconds?: number,
): TimedTranscriptSegment[] => {
  const transcript = normalizeSpeakingQuestionText(transcriptValue);
  if (!transcript || utterances.length === 0) return [];
  const tokens = Array.from(
    transcript.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu),
  ).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  return utterances.flatMap((utterance): TimedTranscriptSegment[] => {
    if (!Number.isFinite(utterance.start) || !Number.isFinite(utterance.end) ||
      utterance.start < 0 || utterance.end <= utterance.start ||
      (recordingDurationSeconds !== undefined && utterance.end > recordingDurationSeconds)) return [];
    const firstToken = tokens[utterance.wordStartIndex];
    const lastToken = tokens[utterance.wordEndIndex];
    if (!firstToken || !lastToken || lastToken.end < firstToken.start) return [];
    let textEnd = lastToken.end;
    while (textEnd < transcript.length && /[\s.!?,;:…]/u.test(transcript[textEnd])) {
      textEnd += 1;
    }
    return [
      {
        ...utterance,
        textStart: firstToken.start,
        textEnd,
      },
    ];
  });
};

// Timing evidence may end just outside the recorded duration or omit tokens.
// In that case show the entire transcript untimed instead of hiding its gaps.
const selectCompleteTranscriptSegments = <Segment extends { textStart: number; textEnd: number }>(
  transcript: string,
  segments: Segment[],
): Segment[] => {
  let textEnd = 0;
  for (const segment of segments) {
    if (!Number.isInteger(segment.textStart) || !Number.isInteger(segment.textEnd) ||
        segment.textStart < textEnd || segment.textEnd <= segment.textStart ||
        segment.textEnd > transcript.length ||
        transcript.slice(textEnd, segment.textStart).trim()) return [];
    textEnd = segment.textEnd;
  }
  return transcript.slice(textEnd).trim() ? [] : segments;
};

const formatTimestamp = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

type SpeakingEvidenceState = {
  submissionId: string;
  lockFingerprint: string;
  result: SpeakingEvidenceAnalysisResponse | null;
};

type SpeakingAnalysisActionState = {
  submissionId: string;
  lockFingerprint: string;
  running: boolean;
  error: string;
};

export default function SpeakingDeepReview({
  aiFeedback,
  officialResult,
  sections,
  submissionId,
  score,
  level,
  evaluationStatus,
  summaryMode = "full",
  className,
  renderAudioReplay,
  onSeekAudioEvidence,
}: SpeakingDeepReviewProps) {
  const resultFeedback = useMemo(
    () => resolveSpeakingResultFeedback(aiFeedback),
    [aiFeedback],
  );
  const canonicalAssessment = isCanonicalSpeakingAssessment(resultFeedback)
    ? resultFeedback
    : null;
  const visibleSections = useMemo(
    () => sections.filter((section) => section.questions.length > 0),
    [sections],
  );
  const [activeSectionKey, setActiveSectionKey] = useState<SpeakingDeepReviewSectionKey>(
    visibleSections[0]?.key ?? "bolum_1_1",
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnnotationGroupId, setSelectedAnnotationGroupId] = useState<string | null>(null);
  const [selectedTranscriptSegmentId, setSelectedTranscriptSegmentId] = useState<string | null>(null);
  const [selectedInsightIndex, setSelectedInsightIndex] = useState<number | null>(null);
  const selectedQuoteRef = useRef<HTMLSpanElement | null>(null);
  const annotationRefs = useRef(new Map<string, HTMLSpanElement>());
  const annotationGroupRefs = useRef(new Map<string, HTMLButtonElement>());
  const analysisScrollRef = useRef<HTMLElement | null>(null);
  const sectionTabRefs = useRef(
    new Map<SpeakingDeepReviewSectionKey, HTMLButtonElement>(),
  );
  const questionTabRefs = useRef(new Map<number, HTMLButtonElement>());
  const [evidenceState, setEvidenceState] =
    useState<SpeakingEvidenceState | null>(null);
  const lockedAssessment = useMemo(
    () =>
      buildSpeakingAssessmentLockContext(resultFeedback) ?? resultFeedback,
    [resultFeedback],
  );
  const lockedSectionScores = stableSpeakingLockValue(lockedAssessment);
  const lockFingerprint = createSpeakingAssessmentLockFingerprint(
    lockedAssessment,
  );
  const lockedAssessmentRef = useRef(lockedAssessment);
  lockedAssessmentRef.current = lockedAssessment;
  const evidenceRequestControllerRef = useRef<ReturnType<
    typeof createSpeakingEvidenceRequestController
  > | null>(null);
  if (!evidenceRequestControllerRef.current) {
    const evidenceTransport = createSpeakingEvidenceTransport(
      pronunciationAnalysisService,
    );
    evidenceRequestControllerRef.current =
      createSpeakingEvidenceRequestController({
        ...evidenceTransport,
        updateEvidence: (update) => setEvidenceState(update),
        updateAction: () => {},
        safeError: "",
      });
  }

  useEffect(() => {
    if (
      canonicalAssessment ||
      !shouldLoadSpeakingPresentation(submissionId)
    ) return;
    const controller = evidenceRequestControllerRef.current;
    if (!controller) return;
    void controller.startGet({
      submissionId,
      lockFingerprint,
      lock: lockedAssessmentRef.current,
    });
    return () => controller.scheduleDispose();
  }, [canonicalAssessment, lockFingerprint, submissionId]);

  const activeSection =
    visibleSections.find((section) => section.key === activeSectionKey) ?? visibleSections[0];

  useEffect(() => {
    if (!activeSection && visibleSections[0]) {
      setActiveSectionKey(visibleSections[0].key);
    }
  }, [activeSection, visibleSections]);

  useEffect(() => {
    setActiveQuestionIndex(0);
    setSelectedInsightIndex(null);
    setSelectedAnnotationGroupId(null);
    setSelectedTranscriptSegmentId(null);
  }, [activeSectionKey]);

  useEffect(() => {
    setSelectedInsightIndex(null);
    setSelectedAnnotationGroupId(null);
    setSelectedTranscriptSegmentId(null);
  }, [activeQuestionIndex]);

  useEffect(() => {
    if (!analysisScrollRef.current) return;
    analysisScrollRef.current.scrollTop = 0;
  }, [activeSectionKey, activeQuestionIndex]);

  const evidenceResult =
    !canonicalAssessment &&
    submissionId &&
    evidenceState?.submissionId === submissionId &&
    evidenceState.lockFingerprint === lockFingerprint
      ? evidenceState.result
      : null;
  const { presentationFeedback } =
    selectSpeakingPresentationFeedback(evidenceResult, resultFeedback);

  if (!activeSection) {
    return (
      <div className={cn("border-t border-neutral-200 py-8", className)}>
        <p className="text-sm text-neutral-600">Bu sonuç için konuşma kaydı bulunamadı.</p>
      </div>
    );
  }

  const reviewSelection = selectSpeakingReviewQuestion(
    activeSection,
    activeQuestionIndex,
  );
  const isCombinedPromptSection = reviewSelection.combined;
  const selectedQuestion =
    activeSection.questions[
      Math.min(activeQuestionIndex, activeSection.questions.length - 1)
    ] ?? activeSection.questions[0];
  const reviewedQuestion = reviewSelection.question;
  const reviewedQuestionAudio = reviewedQuestion?.audio
    ? {
        ...reviewedQuestion.audio,
        allottedDurationSeconds:
          reviewedQuestion.audio.allottedDurationSeconds ??
          resolveSpeakingAllottedDurationSeconds(
            activeSection.key,
            isCombinedPromptSection ? 0 : activeQuestionIndex,
          ),
      }
    : undefined;
  const officialSectionFeedback = canonicalAssessment
    ? getCanonicalSectionFeedback(
        canonicalAssessment,
        activeSection.key,
        reviewedQuestion?.id,
      )
    : getSectionFeedback(resultFeedback, activeSection.key);
  const sectionFeedback = canonicalAssessment
    ? officialSectionFeedback
    : getSectionFeedback(presentationFeedback, activeSection.key);
  const questionEvidence = selectSpeakingQuestionEvidence(
    evidenceResult?.recordings || [],
    activeSection.key,
    reviewedQuestion?.audio?.audioId,
    reviewedQuestion?.transcript,
    activeSection.singleRecordingCombinedPrompt === true,
  );
  const speechEvidence = reviewedQuestion?.audio?.speechEvidence;
  const timedTranscript = canonicalAssessment
    ? selectSpeakingTimedTranscript(
        questionEvidence.transcript,
        officialSectionFeedback.heardTranscript,
        speechEvidence?.wordTimings || [],
      )
    : {
        text: normalizeSpeakingQuestionText(questionEvidence.transcript),
        usesHeardTranscript: false,
        wordTimings: speechEvidence?.wordTimings || [],
      };
  // Keep speech repetitions intact and use one text for timing, matching and rendering.
  const reviewedTranscript = timedTranscript.text;
  const measuredDuration = speechEvidence?.measuredDurationSeconds;
  const audioDuration = reviewedQuestion?.audio?.durationSeconds;
  const recordingDurationSeconds =
    typeof measuredDuration === "number" && Number.isFinite(measuredDuration) && measuredDuration >= 0
      ? measuredDuration
      : typeof audioDuration === "number" && Number.isFinite(audioDuration) && audioDuration >= 0
        ? audioDuration
        : undefined;
  const selectInsight = (index: number) => {
    setSelectedInsightIndex(index);
    setSelectedAnnotationGroupId(null);
    setSelectedTranscriptSegmentId(null);
    const range = findSpeakingQuoteRange(
      reviewedTranscript,
      normalizeSpeakingQuestionText(
        sectionFeedback.questionInsights[index]?.quote,
      ),
    );
    if (range && reviewedQuestion?.audio && onSeekAudioEvidence) {
      const timeRange = findSpeakingEvidenceTimeRange(
        reviewedTranscript,
        range.start,
        range.end,
        timedTranscript.wordTimings,
        recordingDurationSeconds,
      );
      if (timeRange) {
        onSeekAudioEvidence(
          reviewedQuestion.audio,
          Math.max(0, timeRange.start - 0.2),
        );
      }
    }
    if (typeof window !== "undefined") window.requestAnimationFrame(() => {
      selectedQuoteRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };
  const displayedVisuals = normalizeSpeakingVisualRefs(
    isCombinedPromptSection
      ? activeSection.questions.flatMap((question) => question.visuals || [])
      : selectedQuestion?.visuals,
  );
  const questionVisualAspect =
    activeSection.key === "bolum_2" ? "16:9" : "4:3";
  const discussionPoints = activeSection.discussionPoints;
  const hasDiscussionPoints = Boolean(
    discussionPoints?.advantages.length || discussionPoints?.disadvantages.length,
  );
  const sentenceTimelineSegments = buildSpeakingSentenceTimeline(
    reviewedTranscript,
    timedTranscript.wordTimings,
    recordingDurationSeconds,
  );
  const fallbackTranscriptSegments = mapUtterancesToTranscript(
    reviewedTranscript,
    speechEvidence?.utterances || [],
    recordingDurationSeconds,
  );
  const completeSentenceSegments = selectCompleteTranscriptSegments(
    reviewedTranscript,
    sentenceTimelineSegments,
  );
  const timedTranscriptSegments =
    completeSentenceSegments.length > 0
      ? completeSentenceSegments
      : selectCompleteTranscriptSegments(reviewedTranscript, fallbackTranscriptSegments);
  const selectedAnnotations = canonicalAssessment
    ? officialSectionFeedback.annotations
    : selectSpeakingQuestionAnnotations(
        [],
        officialSectionFeedback.annotations,
        questionEvidence.recording?.audioId,
        undefined,
        activeSection.questions.length,
        reviewedTranscript,
      );
  const transcriptAnnotations = getTranscriptAnnotations(
    selectedAnnotations,
    reviewedTranscript,
  );
  const matchedAnnotationIds = new Set(
    transcriptAnnotations.map((annotation) => annotation.id),
  );
  const untimedAudioAnnotations =
    canonicalAssessment &&
    "hasAudioGroundedTranscript" in officialSectionFeedback &&
    officialSectionFeedback.hasAudioGroundedTranscript
    ? selectedAnnotations
        .filter((annotation) => !matchedAnnotationIds.has(annotation.id))
        .map(
          (annotation, index): AnnotationMatch => ({
            ...annotation,
            start: reviewedTranscript.length + index,
            end: reviewedTranscript.length + index,
            occurrence: annotation.occurrence ?? 1,
            matchFound: false,
          }),
        )
    : [];
  // A direct-audio evaluator can hear a phrase correctly even when the timed
  // Deepgram transcript differs. Keep the Deepgram text/timing on the left,
  // while still showing the audio-grounded correction without a false seek.
  const visibleAnnotations = [
    ...transcriptAnnotations,
    ...untimedAudioAnnotations,
  ];
  const visibleIssueTimeRanges = visibleAnnotations.flatMap(
    (annotation): SpeakingFlowTimeRange[] => {
      if (!annotation.matchFound) return [];
      const range = findSpeakingEvidenceTimeRange(
        reviewedTranscript,
        annotation.start,
        annotation.end,
        timedTranscript.wordTimings,
        recordingDurationSeconds,
      );
      return range ? [range] : [];
    },
  );
  const visibleAnnotationGroups = groupAnnotationsByErrorType(visibleAnnotations);
  const annotationGroupIdByAnnotation = new Map<string, string>();
  visibleAnnotationGroups.forEach((group) => {
    group.annotations.forEach((annotation) => {
      annotationGroupIdByAnnotation.set(annotation.id, group.id);
    });
  });
  const insightRanges = sectionFeedback.questionInsights.map((item) =>
    findSpeakingQuoteRange(
      reviewedTranscript,
      normalizeSpeakingQuestionText(item.quote),
    ),
  );
  const orderedQuestionInsights = sectionFeedback.questionInsights
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftRank = left.item.type === "strength" ? 0 : 1;
      const rightRank = right.item.type === "strength" ? 0 : 1;
      return leftRank - rightRank || left.index - right.index;
    });
  const matchedDevelopmentIndex = sectionFeedback.questionInsights.findIndex(
    (item, index) => item.type === "development" && Boolean(insightRanges[index]),
  );
  const matchedAnnotationGroup = visibleAnnotationGroups.find((group) =>
    group.annotations.some((annotation) => annotation.matchFound),
  );
  const developmentIndex = sectionFeedback.questionInsights.findIndex(
    (item) => item.type === "development",
  );
  const matchedStrengthIndex = sectionFeedback.questionInsights.findIndex(
    (item, index) => item.type === "strength" && Boolean(insightRanges[index]),
  );
  const hasExplicitSelection =
    selectedInsightIndex !== null ||
    selectedAnnotationGroupId !== null ||
    selectedTranscriptSegmentId !== null;
  const automaticInsightIndex = hasExplicitSelection
    ? null
    : matchedDevelopmentIndex >= 0
      ? matchedDevelopmentIndex
      : matchedAnnotationGroup
        ? null
        : developmentIndex >= 0
          ? developmentIndex
          : matchedStrengthIndex >= 0
            ? matchedStrengthIndex
            : sectionFeedback.questionInsights.length > 0
              ? 0
              : null;
  const activeSelectedInsightIndex =
    selectedInsightIndex ?? automaticInsightIndex;
  const activeSelectedAnnotationGroupId =
    selectedAnnotationGroupId ??
    (!hasExplicitSelection && matchedDevelopmentIndex < 0
      ? matchedAnnotationGroup?.id ?? null
      : null);
  const selectedInsightRange =
    activeSelectedInsightIndex === null
      ? null
      : insightRanges[activeSelectedInsightIndex] ?? null;
  const selectedInsightTone =
    activeSelectedInsightIndex === null
      ? "neutral"
      : sectionFeedback.questionInsights[activeSelectedInsightIndex]?.type ===
          "development"
        ? "development"
        : "strength";
  const improvedResponseLabel =
    sectionFeedback.improvedResponseType === "MODEL_EXAMPLE" ||
    !hasTranscript(reviewedTranscript)
      ? "Soruya uygun örnek cevap"
      : "Cevabınızın daha iyi hâli";
  const hasVisibleQuestionAnalysisContent = Boolean(
    sectionFeedback.questionInsights.length > 0 ||
      sectionFeedback.questionStrength ||
      sectionFeedback.questionDevelopmentPoint ||
      sectionFeedback.questionFeedback ||
      visibleAnnotationGroups.length > 0 ||
      sectionFeedback.improvedResponseExample,
  );
  const seekToTranscriptEvidence = (annotation: AnnotationMatch) => {
    if (!reviewedQuestion?.audio || !onSeekAudioEvidence) return;
    const timeRange = findSpeakingEvidenceTimeRange(
      reviewedTranscript,
      annotation.start,
      annotation.end,
      timedTranscript.wordTimings,
      recordingDurationSeconds,
    );
    if (!timeRange) return;
    onSeekAudioEvidence(reviewedQuestion.audio, Math.max(0, timeRange.start - 0.2));
  };
  const seekToUtteranceEvidence = (startSeconds: number, endSeconds?: number) => {
    if (!reviewedQuestion?.audio || !onSeekAudioEvidence) return;
    if (!Number.isFinite(startSeconds) || startSeconds < 0 ||
      (endSeconds !== undefined && (!Number.isFinite(endSeconds) || endSeconds <= startSeconds)) ||
      (recordingDurationSeconds !== undefined && (startSeconds >= recordingDurationSeconds ||
        (endSeconds !== undefined && endSeconds > recordingDurationSeconds)))) return;
    onSeekAudioEvidence(reviewedQuestion.audio, Math.max(0, startSeconds - 0.15));
  };
  const selectTranscriptAnnotation = (annotationId: string) => {
    setSelectedInsightIndex(null);
    const groupId = annotationGroupIdByAnnotation.get(annotationId);
    if (!groupId) return;
    const annotation = visibleAnnotations.find((item) => item.id === annotationId);
    const transcriptSegmentId = annotation
      ? timedTranscriptSegments.find(
          (segment) =>
            annotation.start >= segment.textStart &&
            annotation.start < segment.textEnd,
        )?.id ?? null
      : null;
    runSpeakingAnnotationSelection(
      "transcript",
      () => {
        setSelectedAnnotationGroupId(groupId);
        setSelectedTranscriptSegmentId(
          transcriptSegmentId ??
            (timedTranscriptSegments.length === 0 ? "untimed-transcript" : null),
        );
      },
      () => {
        if (annotation?.matchFound) seekToTranscriptEvidence(annotation);
      },
    );
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      annotationGroupRefs.current.get(groupId)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };
  const selectAnnotationGroup = (group: AnnotationGroup) => {
    setSelectedInsightIndex(null);
    const representative = group.annotations[0];
    if (!representative) return;
    runSpeakingAnnotationSelection(
      "analysis",
      () => {
        setSelectedAnnotationGroupId(group.id);
        setSelectedTranscriptSegmentId(null);
      },
      () => {
        if (representative.matchFound) seekToTranscriptEvidence(representative);
      },
    );
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      annotationRefs.current.get(representative.id)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };
  const selectTranscriptSentence = (segment: { id: string; start: number; end: number }) => {
    setSelectedInsightIndex(null);
    runSpeakingTranscriptSentenceSelection(
      () => {
        setSelectedTranscriptSegmentId(segment.id);
        setSelectedAnnotationGroupId(null);
      },
      () => seekToUtteranceEvidence(segment.start, segment.end),
    );
  };
  const selectUntimedTranscript = () => {
    setSelectedInsightIndex(null);
    runSpeakingTranscriptSentenceSelection(
      () => {
        setSelectedTranscriptSegmentId("untimed-transcript");
        setSelectedAnnotationGroupId(null);
      },
      () => seekToUtteranceEvidence(0),
    );
  };
  const moveSectionTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const destination = getTabDestinationIndex(
      currentIndex,
      visibleSections.length,
      event.key,
    );
    if (destination === null) return;
    const nextSection = visibleSections[destination];
    if (!nextSection) return;
    event.preventDefault();
    setActiveSectionKey(nextSection.key);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      sectionTabRefs.current.get(nextSection.key)?.focus();
    });
  };
  const moveQuestionTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const destination = getTabDestinationIndex(
      currentIndex,
      activeSection.questions.length,
      event.key,
    );
    if (destination === null) return;
    event.preventDefault();
    setActiveQuestionIndex(destination);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      questionTabRefs.current.get(destination)?.focus();
    });
  };
  return (
    <section className={cn("space-y-5", className)} aria-label="Konuşma değerlendirmesi">
      <SpeakingSummary
        data={
          canonicalAssessment
            ? {
                ...(officialResult ?? {}),
                aiFeedback: { ham_puan: canonicalAssessment.rawScore },
              }
            : officialResult ?? { aiFeedback: resultFeedback }
        }
        presentationFeedback={
          canonicalAssessment
            ? { general: canonicalAssessment.generalEvaluation }
            : presentationFeedback
        }
        score={canonicalAssessment?.standardScore ?? score}
        level={canonicalAssessment?.cefrLevel ?? level}
        status={evaluationStatus}
        mode={summaryMode}
      />

      <div data-speaking-review-stack className="space-y-3">
        <div className="space-y-2">
          <div
            data-speaking-section-navigation
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="tablist"
            aria-label="Konuşma bölümleri"
          >
            {visibleSections.map((section, sectionIndex) => {
              const selected = section.key === activeSection.key;
              const sectionScore = lockedSectionScores?.[section.key];
              return (
                <button
                  key={section.key}
                  data-speaking-section-card={section.key}
                  ref={(element) => {
                    if (element) sectionTabRefs.current.set(section.key, element);
                    else sectionTabRefs.current.delete(section.key);
                  }}
                  type="button"
                  id={`speaking-section-tab-${section.key}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`speaking-section-panel-${section.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveSectionKey(section.key)}
                  onKeyDown={(event) => moveSectionTab(event, sectionIndex)}
                  className={cn(
                    "min-h-[64px] min-w-0 rounded-[8px] border px-4 py-3 text-left shadow-[var(--tm-shadow-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777773]/40 focus-visible:ring-offset-2",
                    selected
                      ? "border-[#c9c8c4] bg-[#efefed] text-[var(--tm-text-primary)]"
                      : "border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-primary)] hover:bg-[#f7f7f5]",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-semibold leading-5">
                      {section.label || SECTION_LABELS[section.key]}
                    </span>
                    {typeof sectionScore === "number" ? (
                      <span className="shrink-0 text-[22px] font-semibold leading-6 tabular-nums">
                        {formatSpeakingSectionScore(sectionScore)}
                        <span className="ml-1 text-[11px] font-medium text-[var(--tm-text-secondary)]">
                          / {formatSpeakingSectionScore(SECTION_MAXIMUMS[section.key])}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {!isCombinedPromptSection && activeSection.questions.length > 1 ? (
            <div
              data-speaking-question-navigation
              className="grid max-w-[420px] grid-cols-3 gap-2"
              role="tablist"
              aria-label="Konuşma soruları"
            >
              {activeSection.questions.map((question, index) => (
                <button
                  key={question.id || `${activeSection.key}-${index}`}
                  data-speaking-question-card={index + 1}
                  ref={(element) => {
                    if (element) questionTabRefs.current.set(index, element);
                    else questionTabRefs.current.delete(index);
                  }}
                  type="button"
                  id={`speaking-question-tab-${activeSection.key}-${index}`}
                  role="tab"
                  aria-selected={index === activeQuestionIndex}
                  aria-controls={`speaking-question-panel-${activeSection.key}-${index}`}
                  tabIndex={index === activeQuestionIndex ? 0 : -1}
                  onClick={() => setActiveQuestionIndex(index)}
                  onKeyDown={(event) => moveQuestionTab(event, index)}
                  className={cn(
                    "min-h-10 rounded-[8px] border px-3 py-2 text-left text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777773]/40 focus-visible:ring-offset-2",
                    index === activeQuestionIndex
                      ? "border-[#c9c8c4] bg-[#efefed] text-[var(--tm-text-primary)]"
                      : "border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-secondary)] hover:bg-[#f7f7f5]",
                  )}
                >
                  Soru {index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div
          id={`speaking-section-panel-${activeSection.key}`}
          role="tabpanel"
          aria-labelledby={`speaking-section-tab-${activeSection.key}`}
          className="space-y-3"
        >
          <details
            data-speaking-question-disclosure
            className="group overflow-hidden rounded-[8px] border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-card)]"
          >
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[12px] font-semibold text-[var(--tm-text-secondary)] marker:content-none sm:px-4">
              <span>
                <span className="group-open:hidden">Soruyu göster</span>
                <span className="hidden group-open:inline">Soruyu gizle</span>
              </span>
              <span aria-hidden="true" className="text-base text-[var(--tm-text-tertiary)] transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-[var(--tm-border-subtle)] px-4 py-4">
              {activeSection.key === "bolum_3" && hasDiscussionPoints ? (
                <section
                  data-speaking-discussion-points
                  data-speaking-part3-prompt-table
                  aria-label="Lehine ve aleyhine görüşler"
                  className="mx-auto w-full max-w-5xl overflow-hidden border border-[#242424] bg-white"
                >
                  <div className="border-b border-[#242424] px-4 py-3">
                    <h3
                      data-speaking-part3-prompt-question
                      className="whitespace-pre-line break-words text-center text-[16px] font-semibold leading-6 text-[#242424]"
                    >
                      {cleanText(selectedQuestion?.question) ||
                        "Soru metni bulunamadı."}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <article
                      data-speaking-part3-prompt-column="advantages"
                      className="border-b border-[#242424] p-4 md:border-b-0 md:border-r"
                    >
                      <h4 className="mb-2 text-[14px] font-semibold leading-5 text-[#242424]">
                        Lehine
                      </h4>
                      <ul className="list-inside list-disc space-y-2 text-[14px] leading-[22px] text-[#242424]">
                        {discussionPoints?.advantages.map((point) => (
                          <li key={`advantage-${point}`} className="break-words pl-1">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </article>
                    <article
                      data-speaking-part3-prompt-column="disadvantages"
                      className="p-4"
                    >
                      <h4 className="mb-2 text-[14px] font-semibold leading-5 text-[#242424]">
                        Aleyhine
                      </h4>
                      <ul className="list-inside list-disc space-y-2 text-[14px] leading-[22px] text-[#242424]">
                        {discussionPoints?.disadvantages.map((point) => (
                          <li key={`disadvantage-${point}`} className="break-words pl-1">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </section>
              ) : isCombinedPromptSection ? (
                <ol
                  data-speaking-question-copy
                  className="space-y-2 text-[15px] leading-6 text-[#242424]"
                >
                  {activeSection.questions.map((question, index) => (
                    <li key={question.id || `${activeSection.key}-prompt-${index}`} className="flex gap-3">
                      <span className="shrink-0 text-[#242424]">{index + 1}.</span>
                      <span>{cleanText(question.question) || "Soru metni bulunamadı."}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p
                  data-speaking-question-copy
                  className="text-[15px] leading-6 text-[#242424]"
                >
                  {cleanText(selectedQuestion?.question) || "Soru metni bulunamadı."}
                </p>
              )}

              {hasDiscussionPoints && activeSection.key !== "bolum_3" ? (
                <section
                  data-speaking-discussion-points
                  aria-label="Lehine ve aleyhine görüşler"
                  className="mt-4 overflow-hidden rounded-[10px] border border-[#dddcd7] bg-white"
                >
                  <div className="grid md:grid-cols-2">
                    <article className="border-b border-[#dddcd7] md:border-b-0 md:border-r">
                      <h3 className="border-b border-[#dce8da] bg-[#f2f7f0] px-4 py-2.5 text-[13px] font-semibold leading-5 text-[#2f6f3d]">
                        Lehine
                      </h3>
                      <ul className="list-disc space-y-2 px-4 py-3 pl-8 text-[13px] leading-6 text-[var(--tm-text-primary)]">
                        {discussionPoints?.advantages.map((point) => (
                          <li key={`advantage-${point}`}>{point}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h3 className="border-b border-[#eadad7] bg-[#fbf2f1] px-4 py-2.5 text-[13px] font-semibold leading-5 text-[#9b3a3a]">
                        Aleyhine
                      </h3>
                      <ul className="list-disc space-y-2 px-4 py-3 pl-8 text-[13px] leading-6 text-[var(--tm-text-primary)]">
                        {discussionPoints?.disadvantages.map((point) => (
                          <li key={`disadvantage-${point}`}>{point}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </section>
              ) : null}

              {displayedVisuals.length > 0 ? (
                <div
                  data-speaking-question-visuals={
                    selectedQuestion?.visualContext ||
                    (isCombinedPromptSection ? "combined-prompt" : "question")
                  }
                  className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,160px))] gap-3"
                >
                  {displayedVisuals.map((visual, index) => (
                    <div
                      key={visual}
                      data-speaking-question-visual-thumbnail
                      data-speaking-question-visual-frame={questionVisualAspect}
                      className={cn(
                        "flex items-center justify-center overflow-hidden rounded-[8px] border border-[var(--tm-border-subtle)] bg-white",
                        questionVisualAspect === "16:9"
                          ? "aspect-video"
                          : "aspect-[4/3]",
                      )}
                    >
                      <PresentationImage
                        {...protectedImageProps}
                        src={visual}
                        thumbnail
                        loading="lazy"
                        alt={`Konuşma sorusu görseli ${index + 1}`}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>

          <div
            data-speaking-response-workspace
            data-speaking-answer-analysis-layout
            className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch"
          >
            <section
              data-speaking-answer-panel
              id={
                !isCombinedPromptSection && activeSection.questions.length > 1
                  ? `speaking-question-panel-${activeSection.key}-${activeQuestionIndex}`
                  : undefined
              }
              role={
                !isCombinedPromptSection && activeSection.questions.length > 1
                  ? "tabpanel"
                  : undefined
              }
              aria-labelledby={
                !isCombinedPromptSection && activeSection.questions.length > 1
                  ? `speaking-question-tab-${activeSection.key}-${activeQuestionIndex}`
                  : undefined
              }
              className="flex min-w-0 flex-col rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4 shadow-[var(--tm-shadow-card)] sm:p-5 lg:h-[560px]"
            >
              <h2 className="text-[13px] font-semibold text-[var(--tm-text-primary)]">Cevabınız</h2>
              <div
                data-speaking-audio-region
                className="mt-3"
              >
                {hasAudio(reviewedQuestionAudio) && renderAudioReplay ? (
                  renderAudioReplay(reviewedQuestionAudio, {
                    variant: "flow",
                    issueTimeRanges: visibleIssueTimeRanges,
                  })
                ) : (
                  <p className="text-[13px] text-[var(--tm-text-tertiary)]">Ses kaydı bulunmuyor.</p>
                )}
              </div>

              <div
                data-speaking-answer-scroll
                data-speaking-transcript-source={
                  timedTranscript.usesHeardTranscript ? "heard" : "timed"
                }
                onWheel={forwardSpeakingPanelWheel}
                className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-gutter:stable]"
              >
                {hasTranscript(reviewedTranscript) ? (
                  timedTranscriptSegments.length > 0 ? (
                    <div className="space-y-0.5">
                      {timedTranscriptSegments.map((segment) => (
                        <div key={segment.id}>
                          <div data-speaking-utterance={segment.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => seekToUtteranceEvidence(segment.start, segment.end)}
                              className="h-fit rounded px-1.5 py-1 text-xs font-semibold tabular-nums text-neutral-500 hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424]"
                              aria-label={`${formatTimestamp(segment.start)} konumundan dinle`}
                            >
                              {formatTimestamp(segment.start)}
                            </button>
                            <p className="whitespace-pre-wrap text-[15px] leading-6 text-[var(--tm-text-primary)]">
                              <span
                                data-speaking-transcript-sentence={segment.id}
                                data-speaking-transcript-sentence-selected={
                                  selectedTranscriptSegmentId === segment.id
                                    ? "true"
                                    : "false"
                                }
                                onClick={(event) => {
                                  if ((event.target as HTMLElement).closest("[data-speaking-annotation]")) return;
                                  selectTranscriptSentence(segment);
                                }}
                                className={cn(
                                  "inline box-decoration-clone cursor-pointer rounded-[2px] px-[2px] py-[1px] transition-colors",
                                  getTranscriptSentenceTone(
                                    selectedTranscriptSegmentId === segment.id,
                                  ),
                                )}
                              >
                                {renderAnnotatedTranscript(
                                  reviewedTranscript,
                                  visibleAnnotations,
                                  selectedAnnotationGroupId,
                                  annotationGroupIdByAnnotation,
                                  selectTranscriptAnnotation,
                                  (annotationId, element) => {
                                    if (element) annotationRefs.current.set(annotationId, element);
                                    else annotationRefs.current.delete(annotationId);
                                  },
                                  { start: segment.textStart, end: segment.textEnd },
                                  selectedTranscriptSegmentId === segment.id,
                                  selectedInsightRange,
                                  selectedInsightTone,
                                  (element) => { selectedQuoteRef.current = element; },
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] leading-6 text-[var(--tm-text-primary)]">
                      <span
                        data-speaking-transcript-sentence="untimed-transcript"
                        data-speaking-transcript-sentence-selected={
                          selectedTranscriptSegmentId === "untimed-transcript"
                            ? "true"
                            : "false"
                        }
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest("[data-speaking-annotation]")) return;
                          selectUntimedTranscript();
                        }}
                        className={cn(
                          "inline box-decoration-clone cursor-pointer rounded-[2px] px-[2px] py-[1px] transition-colors",
                          getTranscriptSentenceTone(
                            selectedTranscriptSegmentId === "untimed-transcript",
                          ),
                        )}
                      >
                        {renderAnnotatedTranscript(
                          reviewedTranscript,
                          visibleAnnotations,
                          selectedAnnotationGroupId,
                          annotationGroupIdByAnnotation,
                          selectTranscriptAnnotation,
                          (annotationId, element) => {
                            if (element) annotationRefs.current.set(annotationId, element);
                            else annotationRefs.current.delete(annotationId);
                          },
                          undefined,
                          selectedTranscriptSegmentId === "untimed-transcript",
                          selectedInsightRange,
                          selectedInsightTone,
                          (element) => { selectedQuoteRef.current = element; },
                        )}
                      </span>
                    </p>
                  )
                ) : (
                  <p className="text-[13px] leading-6 text-[var(--tm-text-tertiary)]">
                    Bu cevap için konuşma metni oluşturulamadı.
                  </p>
                )}
              </div>
            </section>

            <aside
              data-speaking-analysis-panel
              className="flex flex-col rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4 shadow-[var(--tm-shadow-card)] lg:h-[560px]"
            >
              <h2 id="speaking-analysis-heading" className="text-[15px] font-semibold text-[var(--tm-text-primary)]">Cevap analizi</h2>
              <section
                data-speaking-analysis-scroll
                ref={analysisScrollRef}
                onWheel={forwardSpeakingPanelWheel}
                className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
                aria-labelledby="speaking-analysis-heading"
              >
                <div className="space-y-3">
                  {sectionFeedback.questionInsights.length > 0 ? (
                    <div data-speaking-question-insights className="space-y-2">
                      {orderedQuestionInsights.map(({ item, index }) => {
                        const isStrength = item.type === "strength";
                        const selected = activeSelectedInsightIndex === index;
                        const maskContextualLanguage = isContextuallyInappropriateSpeakingText(
                          item.explanation, item.suggestion,
                        );
                        const displayInsightText = (text: unknown) =>
                          maskSevereSpeakingLanguage(text, maskContextualLanguage);
                        return (
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => selectInsight(index)}
                            key={`${item.type}-${item.quote || item.explanation}-${index}`}
                            data-speaking-question-insight={item.type}
                            className={cn(
                              "block w-full rounded-[9px] border px-3 py-2.5 text-left text-[14px] leading-[22px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424] focus-visible:ring-offset-1",
                              isStrength
                                ? selected ? "border-[#8fad85] bg-[#f3f8f1]" : "border-[#d9e8d6] bg-[#f3f8f1]"
                                : selected ? "border-[#c4a766] bg-[#fbf8ef]" : "border-[#eadfc5] bg-[#fbf8ef]",
                              selected && "border-dashed shadow-[var(--tm-shadow-card)]",
                            )}
                          >
                            <h3
                              className={cn(
                                "text-[13px] font-semibold leading-5",
                                isStrength ? "text-[#2f6f3d]" : "text-[#7a5b19]",
                              )}
                            >
                              {isStrength ? "İyi yaptığınız" : "Geliştirmeniz gereken"}
                            </h3>
                            {item.quote ? (
                              <p className="mt-1 font-medium text-[var(--tm-text-primary)]">
                                “{displayInsightText(item.quote)}”
                              </p>
                            ) : null}
                            <p className="mt-1 text-[var(--tm-text-primary)]">
                              {displayInsightText(item.explanation)}
                            </p>
                            {item.suggestion ? (
                              <p className="mt-1.5 text-[var(--tm-text-primary)]">
                                {displayInsightText(item.suggestion)}
                              </p>
                            ) : null}
                            {item.exampleSentence ? (
                              <p className="mt-1.5 text-[var(--tm-text-primary)]">
                                <strong className="font-semibold">Örnek:</strong>{" "}
                                {displayInsightText(item.exampleSentence)}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : sectionFeedback.questionStrength ||
                  sectionFeedback.questionDevelopmentPoint ? (
                    <div data-speaking-question-coaching className="space-y-3">
                      {sectionFeedback.questionStrength ? (
                        <section className="rounded-[8px] border border-[#d9e8d6] bg-[#eef6ec] px-4 py-3">
                          <h3 className="text-[13px] font-semibold leading-5 text-[#2f6f3d]">
                            İyi yaptığınız
                          </h3>
                          <p className="mt-1 text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                            {sectionFeedback.questionStrength}
                          </p>
                        </section>
                      ) : null}
                      {sectionFeedback.questionDevelopmentPoint ? (
                        <section className="rounded-[8px] border border-[#efd9d6] bg-[#fbefee] px-4 py-3">
                          <h3 className="text-[13px] font-semibold leading-5 text-[#a93636]">
                            Geliştirmeniz gereken
                          </h3>
                          <p className="mt-1 text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                            {sectionFeedback.questionDevelopmentPoint}
                          </p>
                        </section>
                      ) : null}
                    </div>
                  ) : sectionFeedback.questionFeedback ? (
                    <p
                      data-speaking-question-feedback
                      className="rounded-[9px] border border-[var(--tm-border-subtle)] bg-white p-3 text-[14px] leading-[22px] text-[var(--tm-text-primary)]"
                    >
                      {sectionFeedback.questionFeedback}
                    </p>
                  ) : null}
                  {visibleAnnotationGroups.length > 0 ? (
                    visibleAnnotationGroups.map((group) => {
                      const criterion = CRITERIA.find((item) => item.key === group.criterion);
                      const representative = group.annotations[0];
                      const selected = activeSelectedAnnotationGroupId === group.id;
                      if (!representative) return null;
                      const maskContextualSexualLanguage = group.annotations.some((annotation) =>
                        isContextuallyInappropriateSpeakingText(annotation.errorType, annotation.explanation),
                      );
                      return (
                        <button
                          key={group.id}
                          ref={(element) => {
                            if (element) annotationGroupRefs.current.set(group.id, element);
                            else annotationGroupRefs.current.delete(group.id);
                          }}
                          type="button"
                          data-speaking-error-type={group.errorType}
                          aria-pressed={selected}
                          onClick={() => selectAnnotationGroup(group)}
                          className={cn(
                            "block w-full rounded-[9px] border bg-white p-3 text-left text-[14px] leading-[22px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424] focus-visible:ring-offset-1",
                            selected
                              ? "border-dashed border-[#d7c9de] bg-white shadow-[var(--tm-shadow-card)]"
                              : "border-[var(--tm-border-subtle)] hover:border-[var(--tm-border-default)]",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="rounded-[4px] bg-[#f7f7f5] px-1.5 py-0.5 text-[12px] font-medium leading-5 text-[#242424]">
                              {criterion?.label || "Konuşma"}
                            </span>
                          </div>
                          <div className="mt-3 border-t border-[var(--tm-border-subtle)] pt-3">
                            <p className="text-[14px] font-semibold text-[var(--tm-text-primary)]">Cümleniz</p>
                            <p className="mt-1 text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]">
                              “<SpeakingCorrectionText
                                original={maskSevereSpeakingLanguage(representative.original, maskContextualSexualLanguage)}
                                corrected={maskSevereSpeakingLanguage(representative.corrected, maskContextualSexualLanguage)}
                                side="original"
                              />”
                            </p>
                            {representative.corrected ? (
                              <div className="mt-3">
                                <p className="text-[14px] font-semibold text-[var(--tm-text-primary)]">Düzeltme</p>
                                <p className="mt-1 text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]">
                                  <SpeakingCorrectionText
                                    original={maskSevereSpeakingLanguage(representative.original, maskContextualSexualLanguage)}
                                    corrected={maskSevereSpeakingLanguage(representative.corrected, maskContextualSexualLanguage)}
                                    side="corrected"
                                  />
                                </p>
                              </div>
                            ) : null}
                            {representative.explanation ? (
                              <div className="mt-3">
                                <p className="text-[14px] font-semibold text-[var(--tm-text-primary)]">Neden?</p>
                                <p className="mt-1 text-[var(--tm-text-primary)]">
                                  {maskSevereSpeakingLanguage(representative.explanation, maskContextualSexualLanguage)}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  ) : sectionFeedback.annotationsEmpty &&
                    !hasVisibleQuestionAnalysisContent ? (
                    <p className="rounded-[9px] border border-[var(--tm-border-subtle)] bg-white p-3 text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                      Bu cevap için ayrıntılı bir düzeltme notu oluşturulmadı.
                    </p>
                  ) : canonicalAssessment ||
                    hasVisibleQuestionAnalysisContent ? null : (
                    <p className="rounded-[9px] border border-[var(--tm-border-subtle)] bg-white p-3 text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                      Bu cevap için gösterilecek bir geliştirme notu bulunmuyor.
                    </p>
                  )}
                  {sectionFeedback.improvedResponseExample ? (
                    <section
                      data-speaking-improved-response
                      data-speaking-improved-response-type={
                        sectionFeedback.improvedResponseType ??
                        (hasTranscript(reviewedTranscript)
                          ? "YOUR_ANSWER"
                          : "MODEL_EXAMPLE")
                      }
                      className="rounded-[8px] border border-[#deded9] bg-[#f5f5f3] px-4 py-3"
                    >
                      <h3 className="text-[13px] font-semibold leading-5 text-[var(--tm-text-primary)]">
                        {improvedResponseLabel}
                      </h3>
                      <p className="mt-1 text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                        {sectionFeedback.improvedResponseExample}
                      </p>
                    </section>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>

          <section
            data-speaking-rubric
            className="pt-1"
            aria-labelledby="speaking-rubric-heading"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="speaking-rubric-heading" className="text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                  Rubrik değerlendirmesi
                </h2>
                <p
                  data-speaking-rubric-scope="true"
                  className="mt-1 text-[12px] leading-5 text-[var(--tm-text-secondary)]"
                >
                  {activeSection.key === "bolum_1_1" ||
                  activeSection.key === "bolum_1_2"
                    ? "Bu puan ve açıklamalar, üç cevabın birlikte değerlendirildiği bölüm sonucudur."
                    : "Bu puan ve açıklamalar bölümün tamamına aittir."}
                </p>
              </div>
            </div>

            <div
              data-speaking-rubric-layout={
                sectionFeedback.criteria.pronunciation ? "2-2-full" : "2-2"
              }
              className="grid gap-3 md:grid-cols-2"
            >
              {CRITERIA.map((criterion) => {
                const criterionText = sectionFeedback.criteria[criterion.key] || "";
                if (criterion.key === "pronunciation" && !criterionText) return null;
                const criterionSummary = canonicalAssessment
                  ? { diagnosis: "", observation: "", limiter: "" }
                  : splitCriterionSummary(criterionText);
                return (
                  <article
                    key={criterion.key}
                    data-criterion-card={criterion.key}
                    data-speaking-rubric-last-card={criterion.key === "pronunciation" ? "true" : undefined}
                    className={cn(
                      "rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-4 py-3 text-[14px] leading-[22px] shadow-[var(--tm-shadow-card)]",
                      criterion.key === "pronunciation" && "md:col-span-2",
                    )}
                  >
                    <h3 className="font-semibold text-[var(--tm-text-primary)]">{criterion.label}</h3>
                    {criterionText ? (
                      canonicalAssessment ? (
                        <p className="mt-2 text-[var(--tm-text-primary)]">
                          {formatLearnerFacingCriterionText(criterionText)}
                        </p>
                      ) : (
                        <>
                          <p className="mt-2 text-[var(--tm-text-primary)]">
                            {formatLearnerFacingCriterionText(criterionSummary.diagnosis)}
                          </p>
                          {criterionSummary.observation ? (
                            <p className="mt-2 text-[var(--tm-text-primary)]">
                              <span className="font-semibold">Cevabınızdan gözlem:</span>{" "}
                              {formatLearnerFacingCriterionText(criterionSummary.observation)}
                            </p>
                          ) : null}
                          {criterionSummary.limiter ? (
                            <p className="mt-2 text-[var(--tm-text-primary)]">
                              <span className="font-semibold">Dikkat et:</span>{" "}
                              {formatLearnerFacingCriterionText(criterionSummary.limiter)}
                            </p>
                          ) : null}
                        </>
                      )
                    ) : canonicalAssessment ? null : (
                      <p className="mt-2 text-[var(--tm-text-primary)]">Bu ölçüt için değerlendirme bulunmuyor.</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {!isCombinedPromptSection && activeSection.questions.length > 1
          ? activeSection.questions.map((question, index) =>
              index === activeQuestionIndex ? null : (
                <div
                  key={`inactive-panel-${question.id || index}`}
                  id={`speaking-question-panel-${activeSection.key}-${index}`}
                  role="tabpanel"
                  aria-labelledby={`speaking-question-tab-${activeSection.key}-${index}`}
                  hidden
                />
              ),
            )
          : null}
      </div>

      {visibleSections.map((section) =>
        section.key === activeSection.key ? null : (
          <div
            key={`inactive-section-panel-${section.key}`}
            id={`speaking-section-panel-${section.key}`}
            role="tabpanel"
            aria-labelledby={`speaking-section-tab-${section.key}`}
            hidden
          />
        ),
      )}
    </section>
  );
}
