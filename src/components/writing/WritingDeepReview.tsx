import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";

type WritingTaskKey = "bolum_1_1" | "bolum_1_2" | "bolum_2";
type CorrectionTabKey =
  | "summary"
  | "all"
  | "content"
  | "communication"
  | "organisation"
  | "vocabulary"
  | "grammar"
  | "spelling"
  | "general";

type WritingCorrection = {
  id?: string;
  section: WritingTaskKey;
  original: string;
  corrected: string;
  reason: string;
  category: string;
  matchFound?: boolean;
  annotationId?: string;
  severity?: string;
  criterion?: string;
  matchStrategy?: string;
  source?: string;
};

type DisplayWritingCorrection = Omit<WritingCorrection, "id"> & {
  id: number;
  tabKey: CorrectionTabKey;
};

type RepeatedIssue = {
  category: string;
  title: string;
  description: string;
  examples: string[];
  advice: string;
};

type StructuredGeneralFeedback = {
  ozet: string;
  tekrar_eden_eksikler: string[];
  alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
  egzersizler: Array<{ baslik: string; uygulama: string }>;
  kapanis: string;
  shortSummary?: string;
  estimatedLevel?: string;
  overallAdvice?: string;
  sectionFeedback?: Partial<
    Record<
      WritingTaskKey,
      {
        title: string;
        strengths: string[];
        issues: string[];
        improvement: string;
        wordCountWarning?: string;
      }
    >
  >;
  corrections?: WritingCorrection[];
  nextPracticeTask?: string;
  warnings?: string[];
  fullAnalysis?: {
    sectionAnalysis?: Partial<
      Record<
        WritingTaskKey,
        {
          summary: string;
          strengths: string[];
          issues: string[];
          advice: string;
        }
      >
    >;
    criterionAnalysis?: Record<
      string,
      {
        summary: string;
        majorIssues: string[];
        advice: string;
      }
    >;
    annotations?: WritingCorrection[];
    repeatedIssues?: RepeatedIssue[];
    nextPracticeTask?: string;
    warnings?: string[];
  };
};

export type WritingDeepReviewAnswer = {
  questionId?: string | null;
  questionText?: string | null;
  question?: string | null;
  userAnswer?: string | null;
  answer?: string | null;
  text?: string | null;
  taskKey?: string | null;
  task_key?: string | null;
  sectionKey?: string | null;
  description?: string | null;
  section?: {
    title?: string | null;
    description?: string | null;
  } | null;
  subPart?: {
    label?: string | null;
    description?: string | null;
  } | null;
};

export type WritingDeepReviewProps = {
  aiFeedback?: unknown;
  answers?: WritingDeepReviewAnswer[];
  sections?: unknown[];
  score?: number | string | null;
  className?: string;
  emptyMessage?: string;
};

const SECTION_LABELS: Record<WritingTaskKey, string> = {
  bolum_1_1: "Bölüm 1.1",
  bolum_1_2: "Bölüm 1.2",
  bolum_2: "Bölüm 2",
};

const VALID_CATEGORIES = [
  "task_response",
  "content_development",
  "tone_register",
  "organisation",
  "coherence",
  "vocabulary",
  "grammar",
  "spelling_punctuation",
  "word_count",
];

const CORRECTION_TABS: Array<{
  key: CorrectionTabKey;
  label: string;
  categories: string[];
  accent: string;
  markClass: string;
  activeMarkClass: string;
}> = [
  {
    key: "summary",
    label: "Özet",
    categories: [],
    accent: "bg-gray-500",
    markClass: "bg-gray-100 text-gray-950 ring-gray-300",
    activeMarkClass: "bg-gray-200 ring-gray-900",
  },
  {
    key: "all",
    label: "Tüm Düzeltmeler",
    categories: [],
    accent: "bg-gray-900",
    markClass: "bg-gray-100 text-gray-950 ring-gray-300",
    activeMarkClass: "bg-gray-200 ring-gray-900",
  },
  {
    key: "content",
    label: "Görev ve İçerik",
    categories: ["task_response", "content_development", "word_count", "detail", "example"],
    accent: "bg-blue-500",
    markClass: "bg-blue-50 text-blue-950 ring-blue-200",
    activeMarkClass: "bg-blue-100 ring-blue-500",
  },
  {
    key: "communication",
    label: "İletişim",
    categories: ["tone_register"],
    accent: "bg-purple-500",
    markClass: "bg-purple-50 text-purple-950 ring-purple-200",
    activeMarkClass: "bg-purple-100 ring-purple-500",
  },
  {
    key: "organisation",
    label: "Organizasyon",
    categories: ["organisation", "coherence", "paragraph", "transition"],
    accent: "bg-orange-500",
    markClass: "bg-orange-50 text-orange-950 ring-orange-200",
    activeMarkClass: "bg-orange-100 ring-orange-500",
  },
  {
    key: "vocabulary",
    label: "Kelime ve Üslup",
    categories: ["vocabulary", "tone_register", "communication", "register", "style"],
    accent: "bg-emerald-500",
    markClass: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    activeMarkClass: "bg-emerald-100 ring-emerald-500",
  },
  {
    key: "grammar",
    label: "Dil Kullanımı",
    categories: ["grammar", "spelling_punctuation", "syntax", "sentence_accuracy"],
    accent: "bg-rose-500",
    markClass: "bg-rose-50 text-rose-950 ring-rose-200",
    activeMarkClass: "bg-rose-100 ring-rose-500",
  },
  {
    key: "spelling",
    label: "Yazım",
    categories: ["spelling_punctuation"],
    accent: "bg-yellow-500",
    markClass: "bg-yellow-50 text-yellow-950 ring-yellow-200",
    activeMarkClass: "bg-yellow-100 ring-yellow-500",
  },
  {
    key: "general",
    label: "Genel",
    categories: ["general"],
    accent: "bg-gray-500",
    markClass: "bg-gray-100 text-gray-950 ring-gray-300",
    activeMarkClass: "bg-gray-200 ring-gray-700",
  },
];

const cleanFeedback = (value: unknown) =>
  typeof value === "string"
    ? normalizeFeedbackText(
        value
          .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
    : "";

const cleanList = (items: unknown, max = 4) =>
  Array.isArray(items)
    ? items.map((item) => cleanFeedback(item)).filter(Boolean).slice(0, max)
    : [];

const isWritingCorrection = (value: WritingCorrection | null): value is WritingCorrection =>
  value !== null;

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

const unwrapAiFeedback = (value: unknown) => {
  const parsed = parseJsonCandidate(value);
  if (!parsed || typeof parsed !== "object") return parsed;
  const source = parsed as Record<string, unknown>;
  return (
    source.aiFeedback ??
    source.ai_feedback ??
    source.feedback ??
    source.assessment ??
    parsed
  );
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return normalizeFeedbackText(value.trim());
  }
  return "";
};

const extractSectionNarrative = (section: unknown) => {
  if (!section || typeof section !== "object") return "";
  const source = section as Record<string, unknown>;
  return firstText(
    source.degerlendirme,
    source["değerlendirme"],
    source.feedback,
    source.yorum,
    source.text,
    source.analysis,
  );
};

const parseLegacyStringFeedback = (feedback: string) => {
  const parsed: Record<string, string> = {};
  const part11 = feedback.match(
    /\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i,
  );
  const part12 = feedback.match(
    /\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i,
  );
  const part2 = feedback.match(
    /\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
  );
  const general = feedback.match(/(?:AI GERİ BİLDİRİMİ \(EĞİTMEN NOTU\)|GENEL DEĞERLENDİRME):([\s\S]*?)(?=$)/i);

  if (part11?.[1]) parsed.part1_1 = cleanFeedback(part11[1]);
  if (part12?.[1]) parsed.part1_2 = cleanFeedback(part12[1]);
  if (part2?.[1]) parsed.part2 = cleanFeedback(part2[1]);
  if (general?.[1]) parsed.general = cleanFeedback(general[1]);
  if (!parsed.general) parsed.general = cleanFeedback(feedback);
  return parsed;
};

const normalizeStructuredFeedback = (rawFeedback: unknown): StructuredGeneralFeedback | null => {
  const aiFeedback = unwrapAiFeedback(rawFeedback);
  if (!aiFeedback) return null;

  if (typeof aiFeedback === "string") {
    const parsed = parseLegacyStringFeedback(aiFeedback);
    return parsed.general
      ? {
          ozet: parsed.general,
          tekrar_eden_eksikler: [],
          alinti_duzeltme: [],
          egzersizler: [],
          kapanis: "",
        }
      : null;
  }

  if (typeof aiFeedback !== "object") return null;
  const feedback = aiFeedback as Record<string, unknown>;
  const bolumler =
    (feedback.bolumler as Record<string, unknown> | undefined) ??
    (feedback["bölümler"] as Record<string, unknown> | undefined) ??
    (feedback.sections as Record<string, unknown> | undefined) ??
    (feedback.parts as Record<string, unknown> | undefined) ??
    {};
  const rawStructured =
    feedback.generalStructured ??
    feedback.general_structured ??
    feedback.genel_degerlendirme_yapilandirilmis ??
    feedback.structuredGeneral ??
    feedback;
  const rawFullAnalysis =
    feedback.fullAnalysis ??
    feedback.analysisReport ??
    (rawStructured && typeof rawStructured === "object"
      ? (rawStructured as Record<string, unknown>).fullAnalysis ??
        (rawStructured as Record<string, unknown>).analysisReport
      : undefined);
  const src =
    rawFullAnalysis && rawStructured && typeof rawStructured === "object"
      ? { ...(rawStructured as Record<string, unknown>), fullAnalysis: rawFullAnalysis }
      : rawStructured;

  if (!src || typeof src !== "object") return null;
  const source = src as Record<string, unknown>;
  const structured: StructuredGeneralFeedback = {
    ozet: firstText(
      source.ozet,
      source.shortSummary,
      source.summary,
      source.general,
      feedback.general,
      feedback.generalFeedback,
    ),
    tekrar_eden_eksikler: cleanList(source.tekrar_eden_eksikler, 6),
    alinti_duzeltme: Array.isArray(source.alinti_duzeltme)
      ? source.alinti_duzeltme
          .map((item) => {
            const value = item as Record<string, unknown>;
            return {
              alinti: cleanFeedback(value.alinti),
              duzeltilmis: cleanFeedback(value.duzeltilmis),
              neden: cleanFeedback(value.neden),
            };
          })
          .filter((item) => item.alinti || item.duzeltilmis || item.neden)
          .slice(0, 6)
      : [],
    egzersizler: Array.isArray(source.egzersizler)
      ? source.egzersizler
          .map((item) => {
            const value = item as Record<string, unknown>;
            return {
              baslik: cleanFeedback(value.baslik),
              uygulama: cleanFeedback(value.uygulama),
            };
          })
          .filter((item) => item.baslik || item.uygulama)
          .slice(0, 4)
      : [],
    kapanis: cleanFeedback(source.kapanis),
    shortSummary: cleanFeedback(source.shortSummary),
    estimatedLevel: cleanFeedback(source.estimatedLevel),
    overallAdvice: cleanFeedback(source.overallAdvice),
    nextPracticeTask: cleanFeedback(source.nextPracticeTask),
    warnings: cleanList(source.warnings, 4),
    corrections: Array.isArray(source.corrections)
      ? source.corrections
          .map((item) => normalizeCorrection(item))
          .filter(isWritingCorrection)
          .slice(0, 12)
      : [],
  };

  structured.sectionFeedback = normalizeSectionFeedback(source.sectionFeedback);
  structured.fullAnalysis = normalizeFullAnalysis(source.fullAnalysis ?? source.analysisReport);

  if (!structured.ozet) {
    structured.ozet = firstText(
      extractSectionNarrative(bolumler.bolum_1_1),
      extractSectionNarrative(bolumler["bölüm_1_1"]),
      extractSectionNarrative(feedback.bolum_1_1),
      extractSectionNarrative(feedback["bölüm_1_1"]),
    );
  }

  const hasContent =
    structured.ozet ||
    structured.kapanis ||
    structured.shortSummary ||
    structured.overallAdvice ||
    structured.nextPracticeTask ||
    structured.tekrar_eden_eksikler.length > 0 ||
    structured.alinti_duzeltme.length > 0 ||
    structured.egzersizler.length > 0 ||
    Boolean(structured.sectionFeedback) ||
    Boolean(structured.fullAnalysis) ||
    Boolean(structured.corrections?.length) ||
    Boolean(structured.warnings?.length);

  return hasContent ? structured : null;
};

const normalizeSectionFeedback = (value: unknown): StructuredGeneralFeedback["sectionFeedback"] => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const entries = (Object.keys(SECTION_LABELS) as WritingTaskKey[])
    .map((key) => {
      const section = source[key] as Record<string, unknown> | undefined;
      if (!section || typeof section !== "object") return null;
      const normalized = {
        title: cleanFeedback(section.title) || SECTION_LABELS[key],
        strengths: cleanList(section.strengths, 3),
        issues: cleanList(section.issues, 3),
        improvement: cleanFeedback(section.improvement),
        wordCountWarning: cleanFeedback(section.wordCountWarning),
      };
      const hasContent =
        normalized.title ||
        normalized.strengths.length > 0 ||
        normalized.issues.length > 0 ||
        normalized.improvement ||
        normalized.wordCountWarning;
      return hasContent ? [key, normalized] : null;
    })
    .filter(Boolean) as Array<[WritingTaskKey, NonNullable<StructuredGeneralFeedback["sectionFeedback"]>[WritingTaskKey]]>;
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const normalizeFullAnalysis = (value: unknown): StructuredGeneralFeedback["fullAnalysis"] => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;

  const sectionAnalysisEntries = (Object.keys(SECTION_LABELS) as WritingTaskKey[])
    .map((key) => {
      const section = (source.sectionAnalysis as Record<string, unknown> | undefined)?.[key] as
        | Record<string, unknown>
        | undefined;
      if (!section || typeof section !== "object") return null;
      const normalized = {
        summary: cleanFeedback(section.summary),
        strengths: cleanList(section.strengths, 4),
        issues: cleanList(section.issues, 4),
        advice: cleanFeedback(section.advice),
      };
      const hasContent =
        normalized.summary ||
        normalized.strengths.length > 0 ||
        normalized.issues.length > 0 ||
        normalized.advice;
      return hasContent ? [key, normalized] : null;
    })
    .filter(Boolean) as Array<[
    WritingTaskKey,
    NonNullable<NonNullable<StructuredGeneralFeedback["fullAnalysis"]>["sectionAnalysis"]>[WritingTaskKey],
  ]>;

  const criterionAnalysisEntries = VALID_CATEGORIES.map((key) => {
    const criterion = (source.criterionAnalysis as Record<string, unknown> | undefined)?.[key] as
      | Record<string, unknown>
      | undefined;
    if (!criterion || typeof criterion !== "object") return null;
    const normalized = {
      summary: cleanFeedback(criterion.summary),
      majorIssues: cleanList(
        criterion.majorIssues || criterion.major_issues || criterion.issues,
        5,
      ),
      advice: cleanFeedback(criterion.advice),
    };
    const hasContent =
      normalized.summary || normalized.majorIssues.length > 0 || normalized.advice;
    return hasContent ? [key, normalized] : null;
  }).filter(Boolean) as Array<[
    string,
    { summary: string; majorIssues: string[]; advice: string },
  ]>;

  const annotations = Array.isArray(source.annotations)
    ? source.annotations
        .map((item, index) =>
          normalizeCorrection(item, {
            fallbackId: `a${index + 1}`,
            requireReliableOriginal: true,
          }),
        )
        .filter(isWritingCorrection)
        .slice(0, 30)
    : [];

  const repeatedIssues = Array.isArray(source.repeatedIssues)
    ? source.repeatedIssues
        .map((item) => {
          const value = item as Record<string, unknown>;
          const category = normalizeCategory(value.category);
          return {
            category,
            title: cleanFeedback(value.title),
            description: cleanFeedback(value.description),
            examples: cleanList(value.examples, 6),
            advice: cleanFeedback(value.advice),
          };
        })
        .filter(
          (item) =>
            item.title || item.description || item.examples.length > 0 || item.advice,
        )
        .slice(0, 8)
    : [];

  const normalized = {
    sectionAnalysis: sectionAnalysisEntries.length
      ? Object.fromEntries(sectionAnalysisEntries)
      : undefined,
    criterionAnalysis: criterionAnalysisEntries.length
      ? Object.fromEntries(criterionAnalysisEntries)
      : undefined,
    annotations,
    repeatedIssues,
    nextPracticeTask: cleanFeedback(source.nextPracticeTask),
    warnings: cleanList(source.warnings, 6),
  };

  const hasContent =
    normalized.annotations.length > 0 ||
    normalized.repeatedIssues.length > 0 ||
    Boolean(normalized.sectionAnalysis) ||
    Boolean(normalized.criterionAnalysis) ||
    normalized.nextPracticeTask ||
    normalized.warnings.length > 0;

  return hasContent ? normalized : undefined;
};

const normalizeCorrection = (
  item: unknown,
  options?: { fallbackId?: string; requireReliableOriginal?: boolean },
): WritingCorrection | null => {
  if (!item || typeof item !== "object") return null;
  const value = item as Record<string, unknown>;
  const section = normalizeSectionKey(value.section);
  const category = normalizeCategory(value.category);
  const severity = cleanFeedback(value.severity).toLowerCase();
  const correction = {
    id: cleanFeedback(value.id) || options?.fallbackId || cleanFeedback(value.annotationId),
    section,
    category,
    severity: ["minor", "medium", "major"].includes(severity) ? severity : "medium",
    original: cleanFeedback(value.original || value.alinti),
    corrected: cleanFeedback(value.corrected || value.duzeltilmis),
    reason: cleanFeedback(value.explanation || value.reason || value.neden),
    criterion: cleanFeedback(value.criterion) || category,
    matchStrategy: cleanFeedback(value.matchStrategy),
    matchFound:
      typeof value.matchFound === "boolean" ? value.matchFound : undefined,
    annotationId: cleanFeedback(value.annotationId || value.id),
    source: cleanFeedback(value.source),
  };

  if (category === "word_count" || correction.matchFound === false) return null;
  if (
    options?.requireReliableOriginal &&
    !isReliableAnnotationOriginal(correction.original)
  ) {
    return null;
  }
  if (!correction.original && !correction.corrected && !correction.reason) return null;
  return correction;
};

const normalizeSectionKey = (value: unknown): WritingTaskKey => {
  const key = String(value || "").trim();
  if (key === "bolum_1_1" || key === "bolum_1_2" || key === "bolum_2") return key;
  return "bolum_2";
};

const normalizeCategory = (value: unknown) => {
  const category = cleanFeedback(value).toLowerCase().replace(/\s+/g, "_");
  return VALID_CATEGORIES.includes(category) ? category : "grammar";
};

const countAnnotationWords = (value: string) =>
  normalizeDisplayText(value || "")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter(Boolean).length;

const isNumericOnlyOriginal = (value: string) =>
  /^[\d\s.,/%+-]+$/u.test(normalizeDisplayText(value || ""));

const isReliableAnnotationOriginal = (value: string) => {
  const original = normalizeDisplayText(value || "");
  if (!original || isNumericOnlyOriginal(original)) return false;
  const wordCount = countAnnotationWords(original);
  return wordCount >= 2 && wordCount <= 12;
};

const extractAnswersFromSections = (sections: unknown[]) => {
  const extracted: WritingDeepReviewAnswer[] = [];
  const sortedSections = [...sections].sort(
    (a, b) =>
      (((a as Record<string, unknown>)?.order as number) ??
        ((a as Record<string, unknown>)?.number as number) ??
        0) -
      (((b as Record<string, unknown>)?.order as number) ??
        ((b as Record<string, unknown>)?.number as number) ??
        0),
  );

  sortedSections.forEach((rawSection, sectionIndex) => {
    const section = rawSection as Record<string, unknown>;
    const subParts = Array.isArray(section.subParts) ? section.subParts : [];
    const sortedSubParts = [...subParts].sort(
      (a, b) =>
        (((a as Record<string, unknown>)?.order as number) ??
          ((a as Record<string, unknown>)?.number as number) ??
          0) -
        (((b as Record<string, unknown>)?.order as number) ??
          ((b as Record<string, unknown>)?.number as number) ??
          0),
    );

    sortedSubParts.forEach((rawSubPart, subPartIndex) => {
      const subPart = rawSubPart as Record<string, unknown>;
      const answers = Array.isArray(subPart.answers) ? subPart.answers : [];
      answers.forEach((answer) => {
        const value = answer as WritingDeepReviewAnswer;
        extracted.push({
          ...value,
          questionText:
            value.questionText ||
            value.question ||
            String(subPart.description || section.description || `Görev 1.${subPartIndex + 1}`),
        });
      });
    });

    if (Array.isArray(section.answers)) {
      section.answers.forEach((answer, answerIndex) => {
        const value = answer as WritingDeepReviewAnswer;
        extracted.push({
          ...value,
          questionText:
            value.questionText ||
            value.question ||
            String(section.description || `Görev ${sectionIndex + 1} ${answerIndex + 1}`),
        });
      });
    }
  });

  return extracted;
};

const getAnswerText = (answer?: WritingDeepReviewAnswer | null) => {
  const value = answer?.userAnswer ?? answer?.answer ?? answer?.text ?? "";
  return typeof value === "string" ? value : "";
};

const toTaskHint = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getTaskKeyFromAnswer = (answer: WritingDeepReviewAnswer): WritingTaskKey | null => {
  const explicit = String(
    answer.taskKey ?? answer.task_key ?? answer.sectionKey ?? "",
  ).trim();
  if (explicit === "bolum_1_1" || explicit === "bolum_1_2" || explicit === "bolum_2") {
    return explicit;
  }

  const hints = [
    answer.questionText,
    answer.question,
    answer.description,
    answer.subPart?.label,
    answer.subPart?.description,
    answer.section?.title,
    answer.section?.description,
  ]
    .map(toTaskHint)
    .join(" ");

  if (/(^|\s)(1[.,]?\s*1|gorev\s*1[.,]?\s*1|bolum\s*1[.,]?\s*1)(\s|$)/.test(hints)) {
    return "bolum_1_1";
  }
  if (/(^|\s)(1[.,]?\s*2|gorev\s*1[.,]?\s*2|bolum\s*1[.,]?\s*2)(\s|$)/.test(hints)) {
    return "bolum_1_2";
  }
  if (/(gorev\s*2|bolum\s*2|tez|antitez|sentez|kompozisyon|blog|forum|essay)/.test(hints)) {
    return "bolum_2";
  }
  return null;
};

const groupAnswers = (answers: WritingDeepReviewAnswer[]) => {
  const groups: Record<WritingTaskKey, WritingDeepReviewAnswer[]> = {
    bolum_1_1: [],
    bolum_1_2: [],
    bolum_2: [],
  };
  const unresolved: WritingDeepReviewAnswer[] = [];

  answers.forEach((answer) => {
    const taskKey = getTaskKeyFromAnswer(answer);
    if (taskKey) groups[taskKey].push(answer);
    else unresolved.push(answer);
  });

  if (unresolved.length > 0 && groups.bolum_2.length === 0) {
    const longest = [...unresolved].sort(
      (a, b) => getAnswerText(b).trim().length - getAnswerText(a).trim().length,
    )[0];
    if (longest) {
      groups.bolum_2.push(longest);
      unresolved.splice(unresolved.indexOf(longest), 1);
    }
  }

  if (unresolved.length > 0) {
    const sortedByLen = [...unresolved].sort(
      (a, b) => getAnswerText(a).trim().length - getAnswerText(b).trim().length,
    );
    if (groups.bolum_1_1.length === 0 && sortedByLen.length > 0) {
      const shortest = sortedByLen.shift();
      if (shortest) groups.bolum_1_1.push(shortest);
    }
    if (groups.bolum_1_2.length === 0 && sortedByLen.length > 0) {
      const next = sortedByLen[sortedByLen.length - 1];
      if (next) groups.bolum_1_2.push(next);
    }
  }

  return groups;
};

const hasMeaningfulAnswer = (answer?: WritingDeepReviewAnswer | null) => {
  const value = getAnswerText(answer).trim();
  return value.length > 0 && value !== "Cevap verilmedi";
};

const pickBestAnswer = (group: WritingDeepReviewAnswer[]) =>
  group.find((answer) => hasMeaningfulAnswer(answer)) || group[0] || null;

const resolveCorrectionTab = (category?: string): CorrectionTabKey => {
  const normalized = String(category || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (["task_response", "content_development", "word_count", "detail", "example"].includes(normalized)) {
    return "content";
  }
  if (["organisation", "coherence", "paragraph", "transition"].includes(normalized)) {
    return "organisation";
  }
  if (["grammar", "spelling_punctuation", "syntax", "sentence_accuracy"].includes(normalized)) {
    return "grammar";
  }
  if (["vocabulary", "tone_register", "communication", "register", "style"].includes(normalized)) {
    return "vocabulary";
  }
  return "general";
};

const normalizeForCorrectionMatch = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

const findWhitespaceNormalizedMatch = (text: string, original: string) => {
  const normalizedOriginal = normalizeForCorrectionMatch(original);
  if (!normalizedOriginal) return null;

  let normalizedText = "";
  const indexMap: number[] = [];
  let lastWasSpace = true;

  Array.from(text).forEach((char, sourceIndex) => {
    if (/\s/u.test(char)) {
      if (!lastWasSpace) {
        normalizedText += " ";
        indexMap.push(sourceIndex);
        lastWasSpace = true;
      }
      return;
    }
    normalizedText += char.toLocaleLowerCase("tr-TR");
    indexMap.push(sourceIndex);
    lastWasSpace = false;
  });

  normalizedText = normalizedText.trimEnd();
  const normalizedStart = normalizedText.indexOf(normalizedOriginal);
  if (normalizedStart < 0) return null;

  const normalizedEnd = normalizedStart + normalizedOriginal.length - 1;
  const start = indexMap[normalizedStart];
  const end = (indexMap[normalizedEnd] ?? indexMap[normalizedStart]) + 1;
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
  return { start, end };
};

const findCorrectionMatch = (text: string, original: string) => {
  const phrase = normalizeDisplayText(original || "");
  if (!text || !phrase) return null;

  const exactIndex = text.indexOf(phrase);
  if (exactIndex >= 0) return { start: exactIndex, end: exactIndex + phrase.length };

  const lowerText = text.toLocaleLowerCase("tr-TR");
  const lowerPhrase = phrase.toLocaleLowerCase("tr-TR");
  const lowerIndex = lowerText.indexOf(lowerPhrase);
  if (lowerIndex >= 0) return { start: lowerIndex, end: lowerIndex + phrase.length };

  return findWhitespaceNormalizedMatch(text, phrase);
};

const getSeverityTone = (severity?: string) => {
  if (severity === "major") return "Puanı ciddi etkiler";
  if (severity === "minor") return "Küçük düzenleme";
  return "Geliştirilebilir";
};

const formatScore = (score?: number | string | null) => {
  if (score === null || score === undefined || score === "") return "Yok";
  const parsed = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(parsed)) return String(score);
  return String(Math.round(parsed));
};

const renderSectionLabel = (label: string) => {
  const match = label.match(/^(Bölüm)\s+(.+)$/);
  if (!match) return label;
  return (
    <>
      {match[1]}{" "}
      <span className="font-mono tabular-nums tracking-normal">{match[2]}</span>
    </>
  );
};

const pickFirstDisplayText = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return normalizeDisplayText(value);
    }
  }
  return "";
};

const getWhyScore = (
  structured?: StructuredGeneralFeedback | null,
  corrections: DisplayWritingCorrection[] = [],
) =>
  pickFirstDisplayText(
    structured?.shortSummary,
    structured?.ozet,
    corrections[0]?.reason,
  ) || "Fikirler anlaşılır, ancak açıklama derinliği ve örnekler puanı sınırlıyor.";

const getShortMainLimiter = (
  criterionGroups: Array<{ issues: string[]; advice: string[]; summaries: string[] }>,
  corrections: DisplayWritingCorrection[],
  fallback: string,
) => {
  const combined = [
    ...criterionGroups.flatMap((group) => [...group.issues, ...group.advice, ...group.summaries]),
    ...corrections.map((item) => item.reason),
    fallback,
  ]
    .map((item) => normalizeDisplayText(item || ""))
    .filter(Boolean);
  const lowered = combined.join(" ").toLocaleLowerCase("tr-TR");

  if (/(kelime|kısa|detay|ayrıntı|örnek|kapsam|yüzeysel)/u.test(lowered)) {
    return "metinler kısa ve örnekler az.";
  }
  if (/(organizasyon|paragraf|bağlaç|geçiş|sıra)/u.test(lowered)) {
    return "fikir akışı ve paragraf bağlantıları güçlenmeli.";
  }
  if (/(dil bilgisi|gramer|cümle|kip|syntax|yazım|noktalama)/u.test(lowered)) {
    return "cümle doğruluğu ve dil kullanımı daha dikkatli olmalı.";
  }
  if (/(kelime|üslup|resmi|register|tone|iletişim)/u.test(lowered)) {
    return "kelime seçimi ve üslup görev türüne daha iyi uymalı.";
  }

  const first = combined[0] || "cevap daha fazla ayrıntı ve örnekle güçlenmeli.";
  return first.length > 96 ? `${first.slice(0, 93).trim()}...` : first;
};

const MAIN_CRITERION_ORDER = ["Görev ve İçerik", "Organizasyon", "Dil Kullanımı", "Kelime ve Üslup"];

const getCorrectionRule = (item: DisplayWritingCorrection) => {
  if (item.tabKey === "content") return "Görevde istenen fikri örnekle ve gerekçeyle genişlet.";
  if (item.tabKey === "communication") return "Üslubu görev türüne göre daha net seç.";
  if (item.tabKey === "organisation") return "Cümleler arasında açık bağ kur.";
  if (item.tabKey === "vocabulary") return "Daha doğal, uygun ve görev türüne uyumlu kelime seç.";
  if (item.tabKey === "grammar") return "Kip, bağlaç ve cümle yapısını kontrol et.";
  if (item.tabKey === "spelling") return "Yazım ve noktalama metnin güvenilirliğini etkiler.";
  return "Cümleyi daha açık ve sınav görevine daha uygun kur.";
};

const getCorrectionVisual = (item: DisplayWritingCorrection) => {
  if (item.severity === "major") {
    return {
      accent: "bg-rose-500",
      markClass: "bg-rose-50 text-rose-950 ring-rose-200",
      activeMarkClass: "bg-rose-100 ring-rose-500",
      cardClass: "border-rose-100 bg-rose-50/45 hover:border-rose-200 hover:bg-white",
      selectedCardClass: "border-rose-400 bg-white shadow-sm",
      quoteClass: "text-rose-700",
      badgeClass: "bg-rose-100 text-rose-700",
    };
  }
  if (item.tabKey === "communication") {
    return {
      accent: "bg-purple-500",
      markClass: "bg-purple-50 text-purple-950 ring-purple-200",
      activeMarkClass: "bg-purple-100 ring-purple-500",
      cardClass: "border-purple-100 bg-purple-50/40 hover:border-purple-200 hover:bg-white",
      selectedCardClass: "border-purple-400 bg-white shadow-sm",
      quoteClass: "text-purple-700",
      badgeClass: "bg-purple-100 text-purple-700",
    };
  }
  if (item.tabKey === "organisation" || item.tabKey === "vocabulary") {
    return {
      accent: "bg-sky-500",
      markClass: "bg-sky-50 text-sky-950 ring-sky-200",
      activeMarkClass: "bg-sky-100 ring-sky-500",
      cardClass: "border-sky-100 bg-sky-50/35 hover:border-sky-200 hover:bg-white",
      selectedCardClass: "border-sky-400 bg-white shadow-sm",
      quoteClass: "text-sky-700",
      badgeClass: "bg-sky-100 text-sky-700",
    };
  }
  if (item.tabKey === "grammar") {
    return {
      accent: "bg-rose-500",
      markClass: "bg-rose-50 text-rose-950 ring-rose-200",
      activeMarkClass: "bg-rose-100 ring-rose-500",
      cardClass: "border-rose-100 bg-rose-50/35 hover:border-rose-200 hover:bg-white",
      selectedCardClass: "border-rose-400 bg-white shadow-sm",
      quoteClass: "text-rose-700",
      badgeClass: "bg-rose-100 text-rose-700",
    };
  }
  if (item.tabKey === "content" || item.tabKey === "spelling") {
    return {
      accent: "bg-amber-500",
      markClass: "bg-amber-50 text-amber-950 ring-amber-200",
      activeMarkClass: "bg-amber-100 ring-amber-500",
      cardClass: "border-amber-100 bg-amber-50/40 hover:border-amber-200 hover:bg-white",
      selectedCardClass: "border-amber-400 bg-white shadow-sm",
      quoteClass: "text-amber-800",
      badgeClass: "bg-amber-100 text-amber-800",
    };
  }
  return {
    accent: "bg-slate-500",
    markClass: "bg-slate-100 text-slate-950 ring-slate-300",
    activeMarkClass: "bg-slate-200 ring-slate-500",
    cardClass: "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white",
    selectedCardClass: "border-gray-900 bg-white shadow-sm",
    quoteClass: "text-gray-800",
    badgeClass: "bg-gray-100 text-gray-700",
  };
};

const getCriterionGroupLabel = (category: string) => {
  if (["task_response", "content_development", "word_count", "detail", "example"].includes(category)) {
    return "Görev ve İçerik";
  }
  if (["organisation", "coherence", "paragraph", "transition"].includes(category)) return "Organizasyon";
  if (["grammar", "spelling_punctuation", "syntax", "sentence_accuracy"].includes(category)) {
    return "Dil Kullanımı";
  }
  if (["vocabulary", "tone_register", "communication", "register", "style"].includes(category)) {
    return "Kelime ve Üslup";
  }
  return "Görev ve İçerik";
};

const groupCriterionRows = (
  activeCriterionRows: Array<{
    category: string;
    label: string;
    analysis?: { summary: string; majorIssues: string[]; advice: string };
  }>,
) => {
  const groups = new Map<
    string,
    {
      label: string;
      categories: string[];
      summaries: string[];
      issues: string[];
      advice: string[];
    }
  >();

  activeCriterionRows.forEach((item) => {
    if (!item.analysis) return;
    const label = getCriterionGroupLabel(item.category);
    const existing =
      groups.get(label) ||
      {
        label,
        categories: [],
        summaries: [],
        issues: [],
        advice: [],
      };

    existing.categories.push(item.category);
    if (item.analysis.summary) existing.summaries.push(item.analysis.summary);
    if (Array.isArray(item.analysis.majorIssues)) {
      existing.issues.push(...item.analysis.majorIssues);
    }
    if (item.analysis.advice) existing.advice.push(item.analysis.advice);
    groups.set(label, existing);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      summaries: Array.from(new Set(group.summaries.map(normalizeDisplayText))).slice(0, 1),
      issues: Array.from(new Set(group.issues.map(normalizeDisplayText))).slice(0, 2),
      advice: Array.from(new Set(group.advice.map(normalizeDisplayText))).slice(0, 1),
    }))
    .sort((a, b) => {
      const aIndex = MAIN_CRITERION_ORDER.indexOf(a.label);
      const bIndex = MAIN_CRITERION_ORDER.indexOf(b.label);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
};

export default function WritingDeepReview({
  aiFeedback,
  answers = [],
  sections = [],
  score,
  className = "",
  emptyMessage = "Bu sonuç için detaylı yazma analizi bulunamadı.",
}: WritingDeepReviewProps) {
  const [answerViewMode, setAnswerViewMode] = useState<"original" | "feedback">("feedback");
  const [activeSectionKey, setActiveSectionKey] = useState<WritingTaskKey>("bolum_1_1");
  const [activeCorrectionTab, setActiveCorrectionTab] = useState<CorrectionTabKey>("all");
  const [activeCorrectionId, setActiveCorrectionId] = useState<number | null>(null);

  const normalizedAnswers = useMemo(() => {
    const sectionAnswers = sections.length > 0 ? extractAnswersFromSections(sections) : [];
    return sectionAnswers.length > 0 ? sectionAnswers : answers;
  }, [answers, sections]);

  const structured = useMemo(() => normalizeStructuredFeedback(aiFeedback), [aiFeedback]);
  const groupedAnswers = useMemo(() => groupAnswers(normalizedAnswers), [normalizedAnswers]);
  const fullAnalysis = structured?.fullAnalysis;
  const legacyCorrections = structured?.corrections || [];
  const annotationCorrections = fullAnalysis?.annotations || [];
  const legacyQuoteCorrections =
    structured?.alinti_duzeltme.map((item) => ({
      section: "bolum_2" as WritingTaskKey,
      original: item.alinti,
      corrected: item.duzeltilmis,
      reason: item.neden,
      category: "grammar",
      criterion: "grammar",
      severity: undefined,
      matchFound: undefined,
      annotationId: undefined,
      matchStrategy: undefined,
      source: "legacy",
    })) || [];
  const getCorrectionTab = (tabKey: CorrectionTabKey) =>
    CORRECTION_TABS.find((tab) => tab.key === tabKey) || CORRECTION_TABS[0];

  const correctionsWithTabs = [
    ...(annotationCorrections.length > 0
      ? annotationCorrections
      : legacyCorrections.length > 0
        ? legacyCorrections
        : legacyQuoteCorrections),
  ]
    .filter((item) => item.original || item.corrected || item.reason)
    .map((item, index) => ({
      ...item,
      id: index + 1,
      tabKey: resolveCorrectionTab(item.category),
    }));

  const activeCriterionRows = VALID_CATEGORIES
    .map((category) => ({
      category,
      label: getCorrectionTab(resolveCorrectionTab(category)).label,
      analysis: fullAnalysis?.criterionAnalysis?.[category],
    }))
    .filter((item) => item.analysis);
  const sectionDefinitions = (Object.keys(SECTION_LABELS) as WritingTaskKey[]).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    answer: pickBestAnswer(groupedAnswers[key]),
  }));
  const activeSection =
    sectionDefinitions.find((section) => section.key === activeSectionKey) || sectionDefinitions[0];
  const hasAnyAnswer = sectionDefinitions.some((section) => hasMeaningfulAnswer(section.answer));
  const hasAnyFeedback =
    Boolean(structured) ||
    correctionsWithTabs.length > 0 ||
    activeCriterionRows.length > 0;
  const whyScore = getWhyScore(structured, correctionsWithTabs);
  const criterionGroups = groupCriterionRows(activeCriterionRows);
  const mainLimiter = getShortMainLimiter(criterionGroups, correctionsWithTabs, whyScore);
  const correctionMatchesTab = (item: DisplayWritingCorrection, tabKey: CorrectionTabKey) =>
    tabKey === "all" || item.tabKey === tabKey;
  const sectionCorrections = correctionsWithTabs.filter((item) => item.section === activeSection.key);
  const criterionTabs = CORRECTION_TABS.filter((tab) => {
    const supportedTabs: CorrectionTabKey[] = [
      "all",
      "content",
      "organisation",
      "grammar",
      "vocabulary",
    ];
    if (!supportedTabs.includes(tab.key)) return false;
    if (tab.key === "all") return true;
    return sectionCorrections.some((item) => item.tabKey === tab.key);
  });
  const activeFilterTab = criterionTabs.some((tab) => tab.key === activeCorrectionTab)
    ? activeCorrectionTab
    : "all";
  const filteredSectionCorrections = sectionCorrections.filter((item) =>
    correctionMatchesTab(item, activeFilterTab),
  );
  const activeCriterion = getCorrectionTab(activeFilterTab);
  const activeCriterionLabels: string[] =
    activeFilterTab === "all"
      ? []
      : Array.from(new Set(activeCriterion.categories.map(getCriterionGroupLabel)));
  const visibleCriterionGroups =
    activeFilterTab === "all"
      ? criterionGroups
      : criterionGroups.filter((group) => activeCriterionLabels.includes(group.label));
  const selectedCorrection =
    filteredSectionCorrections.find((item) => item.id === activeCorrectionId) ||
    filteredSectionCorrections[0] ||
    null;

  const handleCorrectionSelect = (correctionId: number) => {
    setActiveCorrectionId(correctionId);
    window.setTimeout(() => {
      const target =
        document.getElementById(`writing-correction-${correctionId}`) ||
        document.querySelector(`[data-correction-ids~="${correctionId}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const renderAnnotatedAnswer = (sectionKey: WritingTaskKey, answerText: string) => {
    const text = normalizeDisplayText(answerText || "Cevap verilmedi");
    if (answerViewMode === "original" || !text || text === "Cevap verilmedi") return text;

    const sectionCorrections = correctionsWithTabs.filter(
      (item) =>
        item.section === sectionKey &&
        item.original &&
        correctionMatchesTab(item, activeFilterTab),
    );
    if (sectionCorrections.length === 0) return text;

    const matches: Array<{
      start: number;
      end: number;
      corrections: typeof sectionCorrections;
    }> = [];

    sectionCorrections.forEach((correction) => {
      const match = findCorrectionMatch(text, correction.original);
      if (!match) return;
      const { start, end } = match;
      const exactRange = matches.find((range) => start === range.start && end === range.end);
      if (exactRange) {
        exactRange.corrections.push(correction);
        return;
      }
      const overlappingRange = matches.find((range) => start < range.end && end > range.start);
      if (overlappingRange) {
        overlappingRange.corrections.push(correction);
        return;
      }
      matches.push({ start, end, corrections: [correction] });
    });

    if (matches.length === 0) return text;
    matches.sort((a, b) => a.start - b.start);

    const chunks: ReactNode[] = [];
    let cursor = 0;
    matches.forEach((match) => {
      const primary = match.corrections[0];
      const correctionIds = match.corrections.map((correction) => correction.id);
      const activeInGroup = activeCorrectionId !== null && correctionIds.includes(activeCorrectionId);
      const visual = getCorrectionVisual(primary);
      const title = match.corrections
        .map((correction) => normalizeDisplayText(correction.reason))
        .filter(Boolean)
        .join(" | ");

      if (match.start > cursor) chunks.push(text.slice(cursor, match.start));
      chunks.push(
        <mark
          key={`mark-${sectionKey}-${correctionIds.join("-")}`}
          id={`writing-correction-${primary.id}`}
          data-correction-id={primary.id}
          data-correction-ids={correctionIds.join(" ")}
          onClick={() => handleCorrectionSelect(primary.id)}
          className={`cursor-pointer rounded-md px-1 py-0.5 ring-1 transition-colors ${
            visual.markClass
          } ${activeInGroup ? `${visual.activeMarkClass} ring-2` : ""}`}
          title={title}
        >
          {text.slice(match.start, match.end)}
        </mark>,
      );
      cursor = match.end;
    });
    if (cursor < text.length) chunks.push(text.slice(cursor));
    return chunks;
  };

  if (!hasAnyAnswer && !hasAnyFeedback) {
    return (
      <div className={`rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 font-sans tracking-normal text-[var(--tm-text-primary)] ${className}`}
      data-testid="writing-deep-review"
    >
      <section className="rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4 shadow-[var(--tm-shadow-card)] sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--tm-text-tertiary)]">Skor</p>
        <h2 className="mt-1 text-[17px] font-semibold leading-6 text-[var(--tm-text-primary)]">
          Yazma: <span className="tabular-nums">{formatScore(score)} / 75</span>
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[var(--tm-text-secondary)]">
          <span className="font-medium text-[var(--tm-text-primary)]">Puanı sınırlayan ana nokta:</span>{" "}
          {mainLimiter}
        </p>
      </section>

      <section className="rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4 shadow-[var(--tm-shadow-card)] sm:p-5">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--tm-text-tertiary)]">Kriter Değerlendirmesi</p>
          <h2 className="mt-1 text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">Kısa değerlendirme</h2>
        </div>
        {criterionGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {criterionGroups.slice(0, 4).map((item) => (
              <div key={`writing-criterion-${item.label}`} className="rounded-[8px] border border-[var(--tm-border-subtle)] bg-[#fbfbfa] p-3 text-[13px] leading-5">
                <div className="font-semibold text-[var(--tm-text-primary)]">{item.label}</div>
                {item.summaries.length > 0 && (
                  <p className="mt-2 text-[var(--tm-text-secondary)]">{item.summaries[0]}</p>
                )}
                {item.issues.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--tm-text-secondary)]">
                    {item.issues.map((issue, index) => (
                      <li key={`writing-criterion-issue-${item.label}-${index}`}>{issue}</li>
                    ))}
                  </ul>
                )}
                {item.advice.length > 0 && (
                  <p className="mt-2 text-[var(--tm-text-primary)]">
                    <span className="font-medium">Dikkat et:</span> {item.advice[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--tm-border-subtle)] bg-[#fbfbfa] p-4 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
            Bu sonuç için kriter bazlı kısa değerlendirme bulunamadı.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[12px] border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-card)]">
        <div className="border-b border-[var(--tm-border-subtle)] bg-white px-4 py-3 sm:px-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--tm-text-tertiary)]">Metin Üzerinde Hatalar</p>
        </div>
        <div className="grid grid-cols-1 lg:h-[calc(100vh-140px)] lg:max-h-[680px] lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--tm-border-subtle)] lg:border-b-0 lg:border-r">
            <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--tm-border-subtle)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {sectionDefinitions.map((section) => {
                  const selected = activeSection.key === section.key;
                  return (
                    <button
                      key={`writing-section-tab-${section.key}`}
                      type="button"
                      onClick={() => {
                        setActiveSectionKey(section.key);
                        setActiveCorrectionId(null);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        selected
                          ? "border-[var(--tm-text-primary)] bg-[var(--tm-text-primary)] text-white"
                          : "border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-secondary)] hover:border-[var(--tm-border-default)] hover:text-[var(--tm-text-primary)]"
                      }`}
                    >
                      {renderSectionLabel(section.label)}
                    </button>
                  );
                })}
              </div>
              <div className="inline-flex w-fit rounded-[7px] border border-[var(--tm-border-subtle)] bg-[#f7f7f5] p-1">
                {(["original", "feedback"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAnswerViewMode(mode)}
                    className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      answerViewMode === mode
                        ? "bg-white text-[var(--tm-text-primary)] shadow-[var(--tm-shadow-card)]"
                        : "text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)]"
                    }`}
                  >
                    {mode === "original" ? "Orijinal" : "Analizli"}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white p-4">
              {activeSection.answer?.questionText && (
                <div className="rounded-[10px] border-l-4 border-[#d92d2d] bg-[#fbfbfa] px-4 py-3">
                  <div className="mb-1 text-[12px] font-semibold text-[var(--tm-text-primary)]">
                    {renderSectionLabel(activeSection.label)}
                  </div>
                  <p className="break-words text-[13px] leading-6 text-[var(--tm-text-secondary)]">
                    {normalizeDisplayText(activeSection.answer.questionText)}
                  </p>
                </div>
              )}
              <div className="whitespace-pre-wrap break-words text-[15px] leading-8 text-[var(--tm-text-primary)]">
                {renderAnnotatedAnswer(activeSection.key, getAnswerText(activeSection.answer))}
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-[#fbfbfa]">
            <div className="shrink-0 border-b border-[var(--tm-border-subtle)] bg-white p-4">
              <div className="mb-2 text-[12px] font-semibold text-[var(--tm-text-primary)]">Kriter seç</div>
              <div className="flex flex-wrap gap-2">
                {criterionTabs.map((tab) => {
                  const selected = activeFilterTab === tab.key;
                  return (
                    <button
                      key={`writing-criterion-tab-${tab.key}`}
                      type="button"
                      onClick={() => {
                        setActiveCorrectionTab(tab.key);
                        setActiveCorrectionId(null);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        selected
                          ? "border-[var(--tm-text-primary)] bg-[var(--tm-text-primary)] text-white"
                          : "border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-secondary)] hover:border-[var(--tm-border-default)] hover:text-[var(--tm-text-primary)]"
                      }`}
                    >
                      {tab.key === "all" ? "Tümü" : tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {visibleCriterionGroups.length > 0 && (
                <div className="rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4">
                  <div className="text-[13px] font-semibold text-[var(--tm-text-primary)]">Kriter özeti</div>
                  <div className="mt-3 space-y-3">
                    {visibleCriterionGroups.slice(0, activeFilterTab === "all" ? 3 : 1).map((group) => (
                      <div key={`writing-active-criterion-${group.label}`} className="text-[13px] leading-5">
                        <div className="font-semibold text-[var(--tm-text-primary)]">{group.label}</div>
                        {group.summaries[0] && (
                          <p className="mt-1 text-[var(--tm-text-secondary)]">{group.summaries[0]}</p>
                        )}
                        {group.advice[0] && (
                          <p className="mt-2 text-[var(--tm-text-primary)]">
                            <span className="font-medium">Dikkat et:</span> {group.advice[0]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4">
                <div className="mb-3 text-[13px] font-semibold text-[var(--tm-text-primary)]">Hatalar</div>
                {filteredSectionCorrections.length > 0 ? (
                  <div className="space-y-3">
                    {filteredSectionCorrections.map((item) => {
                      const selected = selectedCorrection?.id === item.id;
                      return (
                        <button
                          key={`writing-filtered-correction-${item.id}`}
                          type="button"
                          onClick={() => handleCorrectionSelect(item.id)}
                          className={`w-full rounded-[9px] border p-3 text-left text-[13px] leading-5 transition-colors ${
                            selected
                              ? "border-[#d92d2d] bg-[#fff8f8]"
                              : "border-[var(--tm-border-subtle)] bg-white hover:border-[var(--tm-border-default)]"
                          }`}
                        >
                          <div className="mb-1">
                            <span className="font-medium text-[var(--tm-text-primary)]">
                              {getCorrectionTab(item.tabKey).label}
                            </span>
                          </div>
                          {item.original && (
                            <p className="break-words text-[var(--tm-text-secondary)]">
                              “{normalizeDisplayText(item.original)}”
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] leading-5 text-[var(--tm-text-secondary)]">
                    Bu bölümde seçili kritere ait hata yok.
                  </p>
                )}
              </div>

              {selectedCorrection && (
                <div className="rounded-[10px] border border-[var(--tm-border-subtle)] bg-white p-4">
                  <div className="mb-3">
                    <div className="text-[12px] font-medium text-[var(--tm-text-tertiary)]">Hata türü</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCorrectionVisual(selectedCorrection).badgeClass}`}>
                        {getCorrectionTab(selectedCorrection.tabKey).label}
                      </span>
                      <span className="rounded-full bg-[#f7f7f5] px-2 py-1 text-xs font-medium text-[var(--tm-text-secondary)]">
                        {getSeverityTone(selectedCorrection.severity)}
                      </span>
                    </div>
                  </div>
                  {selectedCorrection.original && (
                    <div>
                      <div className="text-[12px] font-medium text-[var(--tm-text-tertiary)]">Senin cümlen</div>
                      <p className={`mt-1 break-words text-[13px] leading-5 ${getCorrectionVisual(selectedCorrection).quoteClass}`}>
                        “{normalizeDisplayText(selectedCorrection.original)}”
                      </p>
                    </div>
                  )}
                  {selectedCorrection.corrected && (
                    <div className="mt-3">
                      <div className="text-[12px] font-medium text-[var(--tm-text-tertiary)]">Daha iyi hali</div>
                      <p className="mt-1 break-words text-[13px] leading-5 text-green-700">
                        {normalizeDisplayText(selectedCorrection.corrected)}
                      </p>
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="text-[12px] font-medium text-[var(--tm-text-tertiary)]">Neden?</div>
                    <p className="mt-1 break-words text-[13px] leading-5 text-[var(--tm-text-primary)]">
                      {selectedCorrection.reason
                        ? normalizeDisplayText(selectedCorrection.reason)
                        : getCorrectionRule(selectedCorrection)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
