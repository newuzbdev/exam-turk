import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import WritingV2Results, {
  isWritingV2Result,
} from "@/components/results/WritingV2Results";
import writingSubmissionService from "@/services/writingSubmission.service";
import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";
import { useResultScreenProtection } from "@/hooks/use-result-screen-protection";

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

// interface TestResult {
//   id: string;
//   score?: number;
//   aiFeedback?: {
//     taskAchievement: string;
//     coherenceAndCohesion: string;
//     lexicalResource: string;
//     grammaticalRangeAndAccuracy: string;
//   };
//   submittedAt?: string;
//   createdAt?: string;
//   updatedAt?: string;
//   userId: string;
//   writingTestId: string;
// }

export default function WritingTestResults() {
  useResultScreenProtection();
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answerViewMode, setAnswerViewMode] = useState<"original" | "feedback">("feedback");
  const [activeCorrectionTab, setActiveCorrectionTab] = useState<CorrectionTabKey>("summary");
  const [activeCorrectionId, setActiveCorrectionId] = useState<number | null>(null);
  const [retryingFeedback, setRetryingFeedback] = useState(false);

  useEffect(() => {
    if (!resultId) {
      navigate("/app/test");
      return;
    }
    let cancelled = false;
    setResult(null);
    setLoading(true);
    const loadResult = async () => {
      try {
        const data = await writingSubmissionService.getById(resultId);
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) navigate("/app/test");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadResult();
    return () => { cancelled = true; };
  }, [resultId, navigate]);

  useEffect(() => {
    if (!result || !resultId) return;
    const writing = result.writing || result;
    const status = String(writing.evaluationStatus || writing.aiFeedback?.evaluationStatus || "PENDING").toUpperCase();
    if (status !== "PENDING") return;
    let cancelled = false;
    let timeout: number;
    const poll = async () => {
      try {
        const refreshed = await writingSubmissionService.getById(resultId);
        if (cancelled) return;
        if (refreshed) {
          setResult(refreshed);
          return;
        }
      } catch {
        // Keep the last result visible during a temporary connection failure.
      }
      if (!cancelled) timeout = window.setTimeout(poll, 2500);
    };
    timeout = window.setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [result, resultId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sonuç bulunamadı</p>
          <Button onClick={() => navigate("/app/test")} className="mt-4">
            Testlere Dön
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from the result structure
  const writingData = result.writing || result;
  const rawAiFeedback =
    writingData?.aiFeedback ??
    writingData?.ai_feedback ??
    writingData?.feedback ??
    writingData?.assessment ??
    null;
  const aiFeedback =
    rawAiFeedback && typeof rawAiFeedback === "object"
      ? rawAiFeedback?.aiFeedback ??
        rawAiFeedback?.ai_feedback ??
        rawAiFeedback?.feedback ??
        rawAiFeedback?.assessment ??
        rawAiFeedback
      : rawAiFeedback;

  if (isWritingV2Result(writingData)) {
    const retryFeedback = async () => {
      const submissionId = String(writingData?.id || resultId || "").trim();
      if (!submissionId || retryingFeedback) return;
      setRetryingFeedback(true);
      try {
        const retried = await writingSubmissionService.retryFeedback(submissionId);
        if (retried) {
          const refreshed = await writingSubmissionService.getById(submissionId);
          if (refreshed) setResult(refreshed);
        }
      } finally {
        setRetryingFeedback(false);
      }
    };

    return (
      <div className="min-h-screen bg-[var(--tm-bg-app)] py-7 font-sans text-[var(--tm-text-primary)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/app/test")}
                className="mt-0.5 h-9 w-9 shrink-0 rounded-[7px] border-[var(--tm-border-default)] bg-white p-0 hover:bg-[#f5f5f3]"
                aria-label="Testlere dön"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-[27px] font-semibold leading-8">
                  Yazma sonucu
                </h1>
                <p className="mt-1 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
                  Görev puanlarınızı, rubrik değerlendirmesini ve metniniz
                  üzerindeki düzeltmeleri inceleyin.
                </p>
              </div>
            </div>
          </header>
          <WritingV2Results
            data={writingData}
            showOverallSummary
            summaryMode="full"
            retrying={retryingFeedback}
            onRetry={retryFeedback}
          />
        </div>
      </div>
    );
  }

  // Bullet cleanup + Turkish text normalization + repeated sentence dedupe
  const removeBullets = (text: string | undefined | null) => {
    if (!text) return "";
    const stripped = text
      .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalizeFeedbackText(stripped);
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
    sectionFeedback?: Record<
      "bolum_1_1" | "bolum_1_2" | "bolum_2",
      {
        title: string;
        strengths: string[];
        issues: string[];
        improvement: string;
        wordCountWarning?: string;
      }
    >;
    corrections?: Array<{
      section: "bolum_1_1" | "bolum_1_2" | "bolum_2";
      original: string;
      corrected: string;
      reason: string;
      category: string;
      matchFound?: boolean;
      annotationId?: string;
    }>;
    nextPracticeTask?: string;
    warnings?: string[];
    fullAnalysis?: {
      scoreSummary?: {
        standardScore?: number;
        estimatedLevel?: string;
      };
      sectionAnalysis?: Record<
        "bolum_1_1" | "bolum_1_2" | "bolum_2",
        {
          summary: string;
          strengths: string[];
          issues: string[];
          advice: string;
        }
      >;
      criterionAnalysis?: Record<
        string,
        {
          summary: string;
          majorIssues: string[];
          advice: string;
        }
      >;
      annotations?: Array<{
        id: string;
        section: "bolum_1_1" | "bolum_1_2" | "bolum_2";
        category: string;
        severity: "minor" | "medium" | "major";
        original: string;
        corrected: string;
        explanation: string;
        criterion: string;
        matchStrategy?: string;
        matchFound?: boolean;
      }>;
      vocabularyProfile?: null;
      repeatedIssues?: Array<{
        category: string;
        title: string;
        description: string;
        examples: string[];
        advice: string;
      }>;
      nextPracticeTask?: string;
      warnings?: string[];
    };
  };

  const pickFirstText = (...values: any[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return normalizeFeedbackText(value.trim());
      }
    }
    return undefined;
  };

  const extractSectionNarrative = (section: any): string | undefined => {
    if (!section || typeof section !== "object") return undefined;
    return pickFirstText(
      section.degerlendirme,
      section["değerlendirme"],
      section.feedback,
      section.yorum,
      section.text,
      section.analysis
    );
  };

  const extractCriteriaValue = (sources: any[], keys: string[]): string | undefined => {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      for (const key of keys) {
        const candidate = source[key];
        if (typeof candidate === "string" && candidate.trim()) {
          return normalizeFeedbackText(candidate.trim());
        }
      }
    }
    return undefined;
  };

  // Parse AI feedback string to extract sections
  const parseAIFeedback = () => {
    const feedback = aiFeedback;
    if (!feedback) return null;

    // If feedback is an object, normalize common backend shapes
    if (typeof feedback === 'object' && feedback !== null) {
      const feedbackObj: any = feedback;
      const bolumler =
        feedbackObj?.bolumler ??
        feedbackObj?.["bölümler"] ??
        feedbackObj?.sections ??
        feedbackObj?.parts ??
        {};

      const bolum11 =
        bolumler?.bolum_1_1 ??
        bolumler?.["bölüm_1_1"] ??
        feedbackObj?.bolum_1_1 ??
        feedbackObj?.["bölüm_1_1"];
      const bolum12 =
        bolumler?.bolum_1_2 ??
        bolumler?.["bölüm_1_2"] ??
        feedbackObj?.bolum_1_2 ??
        feedbackObj?.["bölüm_1_2"];
      const bolum2 =
        bolumler?.bolum_2 ??
        bolumler?.["bölüm_2"] ??
        feedbackObj?.bolum_2 ??
        feedbackObj?.["bölüm_2"];

      const criteriaSources = [
        feedbackObj?.kriterler,
        feedbackObj?.criteria,
        bolum2?.kriterler,
        bolum2?.criteria,
        bolum12?.kriterler,
        bolum12?.criteria,
        bolum11?.kriterler,
        bolum11?.criteria,
      ];

      return {
        ...feedbackObj,
        generalStructured:
          feedbackObj?.general_structured ??
          feedbackObj?.generalStructured ??
          feedbackObj?.genel_degerlendirme_yapilandirilmis,
        part1_1: pickFirstText(
          feedbackObj?.part1_1,
          feedbackObj?.part1,
          extractSectionNarrative(bolum11)
        ),
        part1_2: pickFirstText(
          feedbackObj?.part1_2,
          extractSectionNarrative(bolum12)
        ),
        part2: pickFirstText(
          feedbackObj?.part2,
          feedbackObj?.part_2,
          extractSectionNarrative(bolum2)
        ),
        general: pickFirstText(
          feedbackObj?.general,
          feedbackObj?.generalFeedback,
          feedbackObj?.genel_degerlendirme,
          feedbackObj?.genelDegerlendirme,
          feedbackObj?.egitmen_notu,
          feedbackObj?.egitmenNotu,
          feedbackObj?.teacher_note,
          feedbackObj?.teacherNote,
          feedbackObj?.summary
        ),
        coherenceAndCohesion: pickFirstText(
          feedbackObj?.coherenceAndCohesion,
          extractCriteriaValue(criteriaSources, [
            "coherenceAndCohesion",
            "coherence_and_cohesion",
            "tutarlilikVeBaglilik",
            "tutarlilik_ve_baglilik",
            "Tutarlılık ve Bağlılık",
            "Tutarlılık"
          ])
        ),
        grammaticalRangeAndAccuracy: pickFirstText(
          feedbackObj?.grammaticalRangeAndAccuracy,
          extractCriteriaValue(criteriaSources, [
            "grammaticalRangeAndAccuracy",
            "grammatical_range_and_accuracy",
            "dilBilgisi",
            "dil_bilgisi",
            "Dil Bilgisi"
          ])
        ),
        lexicalResource: pickFirstText(
          feedbackObj?.lexicalResource,
          extractCriteriaValue(criteriaSources, [
            "lexicalResource",
            "lexical_resource",
            "kelimeKaynagi",
            "kelime_kaynagi",
            "Kelime Kaynağı"
          ])
        ),
        taskAchievement: pickFirstText(
          feedbackObj?.taskAchievement,
          extractCriteriaValue(criteriaSources, [
            "taskAchievement",
            "task_achievement",
            "gorevBasarisi",
            "gorev_basarisi",
            "gorevYaniti",
            "gorev_yaniti",
            "Görev Başarısı",
            "Görev Yanıtı"
          ])
        ),
      };
    }

    // If feedback is a string, parse it
    if (typeof feedback === 'string') {
      const parsed: any = {};

      // Extract GÖREV 1.1 section
      const task1_1Match = feedback.match(/\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
      if (task1_1Match) {
        parsed.part1_1 = removeBullets(task1_1Match[1].trim());
      }

      // Extract GÖREV 1.2 section
      const task1_2Match = feedback.match(/\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
      if (task1_2Match) {
        parsed.part1_2 = removeBullets(task1_2Match[1].trim());
      }

      // Extract BÖLÜM 2 section
      const part2Match = feedback.match(/\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|$)/i);
      if (part2Match) {
        parsed.part2 = removeBullets(part2Match[1].trim());
      }

      // Extract AI GERİ BİLDİRİMİ (EĞİTMEN NOTU) section
      const generalMatch = feedback.match(/AI GERİ BİLDİRİMİ \(EĞİTMEN NOTU\):([\s\S]*?)(?=$)/i);
      if (generalMatch) {
        parsed.general = removeBullets(generalMatch[1].trim());
      }

      // Extract individual criteria from each section
      const extractCriteria = (text: string) => {
        const criteria: any = {};
        
        // Extract Tutarlılık
        const coherenceMatch = text.match(/Tutarlılık[:\s]*([^\n•]*)/i);
        if (coherenceMatch) {
          criteria.coherenceAndCohesion = coherenceMatch[1].trim();
        }
        
        // Extract Dil Bilgisi
        const grammarMatch = text.match(/Dil Bilgisi[:\s]*([^\n•]*)/i);
        if (grammarMatch) {
          criteria.grammaticalRangeAndAccuracy = grammarMatch[1].trim();
        }
        
        // Extract Kelime Kaynağı
        const lexicalMatch = text.match(/Kelime Kaynağı[:\s]*([^\n•]*)/i);
        if (lexicalMatch) {
          criteria.lexicalResource = lexicalMatch[1].trim();
        }
        
        // Extract Görev Başarısı
        const taskMatch = text.match(/Görev Başarısı[:\s]*([^\n•]*)/i);
        if (taskMatch) {
          criteria.taskAchievement = taskMatch[1].trim();
        }
        
        return criteria;
      };

      // Extract criteria from the full feedback text
      const allCriteria = extractCriteria(feedback);
      Object.assign(parsed, allCriteria);

      return parsed;
    }

    return null;
  };

  const parsedFeedback = parseAIFeedback();
  const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
    const rawStructured =
      (parsedFeedback as any)?.generalStructured ??
      (parsedFeedback as any)?.general_structured ??
      (parsedFeedback as any)?.genel_degerlendirme_yapilandirilmis ??
      (aiFeedback as any)?.generalStructured ??
      (aiFeedback as any)?.general_structured ??
      (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;
    const rawFullAnalysis =
      (aiFeedback as any)?.fullAnalysis ??
      (aiFeedback as any)?.analysisReport ??
      rawStructured?.fullAnalysis ??
      rawStructured?.analysisReport;
    const raw = rawFullAnalysis
      ? {
          ...(rawStructured && typeof rawStructured === "object" ? rawStructured : {}),
          fullAnalysis: rawFullAnalysis,
        }
      : rawStructured;

    if (!raw || typeof raw !== "object") return null;
    const src: any = raw;
    const clean = (value: any) => removeBullets(typeof value === "string" ? value : "");
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

    const structured: StructuredGeneralFeedback = {
      ozet: clean(src?.ozet),
      tekrar_eden_eksikler: Array.isArray(src?.tekrar_eden_eksikler)
        ? src.tekrar_eden_eksikler.map((v: any) => clean(v)).filter(Boolean).slice(0, 6)
        : [],
      alinti_duzeltme: Array.isArray(src?.alinti_duzeltme)
        ? src.alinti_duzeltme
            .map((item: any) => ({
              alinti: clean(item?.alinti),
              duzeltilmis: clean(item?.duzeltilmis),
              neden: clean(item?.neden),
            }))
            .filter((item: any) => item.alinti || item.duzeltilmis || item.neden)
            .slice(0, 6)
        : [],
      egzersizler: Array.isArray(src?.egzersizler)
        ? src.egzersizler
            .map((item: any) => ({
              baslik: clean(item?.baslik),
              uygulama: clean(item?.uygulama),
            }))
            .filter((item: any) => item.baslik || item.uygulama)
            .slice(0, 4)
        : [],
      kapanis: clean(src?.kapanis),
      shortSummary: clean(src?.shortSummary),
      estimatedLevel: clean(src?.estimatedLevel),
      overallAdvice: clean(src?.overallAdvice),
      sectionFeedback: undefined,
      corrections: Array.isArray(src?.corrections)
        ? src.corrections
            .map((item: any) => ({
              section: item?.section,
              original: clean(item?.original),
              corrected: clean(item?.corrected),
              reason: clean(item?.reason),
              category: clean(item?.category),
              matchFound:
                typeof item?.matchFound === "boolean" ? item.matchFound : undefined,
              annotationId: clean(item?.annotationId),
            }))
            .filter((item: any) => item.original || item.corrected || item.reason)
            .slice(0, 12)
        : [],
      nextPracticeTask: clean(src?.nextPracticeTask),
      warnings: Array.isArray(src?.warnings)
        ? src.warnings.map((v: any) => clean(v)).filter(Boolean).slice(0, 4)
        : [],
    };
    const rawSectionFeedback = src?.sectionFeedback;
    if (rawSectionFeedback && typeof rawSectionFeedback === "object") {
      const sectionKeys = ["bolum_1_1", "bolum_1_2", "bolum_2"] as const;
      const entries = sectionKeys
        .map((key) => {
          const section = rawSectionFeedback[key];
          if (!section || typeof section !== "object") return null;
          const normalized = {
            title: clean(section.title),
            strengths: Array.isArray(section.strengths)
              ? section.strengths.map((v: any) => clean(v)).filter(Boolean).slice(0, 3)
              : [],
            issues: Array.isArray(section.issues)
              ? section.issues.map((v: any) => clean(v)).filter(Boolean).slice(0, 3)
              : [],
            improvement: clean(section.improvement),
            wordCountWarning: clean(section.wordCountWarning),
          };
          const hasContent =
            normalized.title ||
            normalized.strengths.length > 0 ||
            normalized.issues.length > 0 ||
            normalized.improvement ||
            normalized.wordCountWarning;
          return hasContent ? [key, normalized] : null;
        })
        .filter(Boolean) as Array<["bolum_1_1" | "bolum_1_2" | "bolum_2", NonNullable<StructuredGeneralFeedback["sectionFeedback"]>[keyof NonNullable<StructuredGeneralFeedback["sectionFeedback"]>]]>;
      if (entries.length > 0) {
        structured.sectionFeedback = Object.fromEntries(entries) as NonNullable<StructuredGeneralFeedback["sectionFeedback"]>;
      }
    }

    const rawFullAnalysisData = src?.fullAnalysis || src?.analysisReport;
    if (rawFullAnalysisData && typeof rawFullAnalysisData === "object") {
      const sectionKeys = ["bolum_1_1", "bolum_1_2", "bolum_2"] as const;
      const validCategories = [
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
      const cleanList = (items: unknown, max = 4) =>
        Array.isArray(items)
          ? items.map((item) => clean(item)).filter(Boolean).slice(0, max)
          : [];
      const sectionAnalysisEntries = sectionKeys
        .map((key) => {
          const section = rawFullAnalysisData.sectionAnalysis?.[key];
          if (!section || typeof section !== "object") return null;
          const normalized = {
            summary: clean(section.summary),
            strengths: cleanList(section.strengths, 4),
            issues: cleanList(section.issues, 4),
            advice: clean(section.advice),
          };
          const hasContent =
            normalized.summary ||
            normalized.strengths.length > 0 ||
            normalized.issues.length > 0 ||
            normalized.advice;
          return hasContent ? [key, normalized] : null;
        })
        .filter(Boolean) as Array<
          [
            "bolum_1_1" | "bolum_1_2" | "bolum_2",
            NonNullable<NonNullable<StructuredGeneralFeedback["fullAnalysis"]>["sectionAnalysis"]>[keyof NonNullable<NonNullable<StructuredGeneralFeedback["fullAnalysis"]>["sectionAnalysis"]>]
          ]
        >;
      const criterionAnalysisEntries = validCategories
        .map((key) => {
          const criterion = rawFullAnalysisData.criterionAnalysis?.[key];
          if (!criterion || typeof criterion !== "object") return null;
          const normalized = {
            summary: clean(criterion.summary),
            majorIssues: cleanList(
              criterion.majorIssues || criterion.major_issues || criterion.issues,
              5
            ),
            advice: clean(criterion.advice),
          };
          const hasContent =
            normalized.summary ||
            normalized.majorIssues.length > 0 ||
            normalized.advice;
          return hasContent ? [key, normalized] : null;
        })
        .filter(Boolean) as Array<
          [
            string,
            { summary: string; majorIssues: string[]; advice: string }
          ]
        >;
      const annotations = Array.isArray(rawFullAnalysisData.annotations)
        ? rawFullAnalysisData.annotations
            .map((item: any, index: number) => {
              const section = sectionKeys.includes(item?.section) ? item.section : "bolum_2";
              const category = validCategories.includes(item?.category)
                ? clean(item.category)
                : "grammar";
              const severity = ["minor", "medium", "major"].includes(
                clean(item?.severity).toLowerCase()
              )
                ? (clean(item?.severity).toLowerCase() as "minor" | "medium" | "major")
                : "medium";
              return {
                id: clean(item?.id) || `a${index + 1}`,
                section,
                category,
                severity,
                original: clean(item?.original),
                corrected: clean(item?.corrected),
                explanation: clean(item?.explanation || item?.reason),
                criterion: clean(item?.criterion) || category,
                matchStrategy: clean(item?.matchStrategy),
                matchFound:
                  typeof item?.matchFound === "boolean" ? item.matchFound : undefined,
              };
            })
            .filter(
              (item: any) =>
                (item.original || item.corrected || item.explanation) &&
                item.category !== "word_count" &&
                item.matchFound !== false &&
                isReliableAnnotationOriginal(item.original)
            )
            .slice(0, 30)
        : [];
      const repeatedIssues = Array.isArray(rawFullAnalysisData.repeatedIssues)
        ? rawFullAnalysisData.repeatedIssues
            .map((item: any) => {
              const category = validCategories.includes(item?.category)
                ? clean(item.category)
                : "grammar";
              return {
                category,
                title: clean(item?.title),
                description: clean(item?.description),
                examples: cleanList(item?.examples, 6),
                advice: clean(item?.advice),
              };
            })
            .filter(
              (item: any) =>
                item.title || item.description || item.examples.length > 0 || item.advice
            )
            .slice(0, 8)
        : [];
      const fullAnalysis = {
        scoreSummary:
          rawFullAnalysisData.scoreSummary && typeof rawFullAnalysisData.scoreSummary === "object"
            ? {
                standardScore:
                  typeof rawFullAnalysisData.scoreSummary.standardScore === "number"
                    ? rawFullAnalysisData.scoreSummary.standardScore
                    : undefined,
                estimatedLevel: clean(rawFullAnalysisData.scoreSummary.estimatedLevel),
              }
            : undefined,
        sectionAnalysis:
          sectionAnalysisEntries.length > 0
            ? (Object.fromEntries(sectionAnalysisEntries) as NonNullable<StructuredGeneralFeedback["fullAnalysis"]>["sectionAnalysis"])
            : undefined,
        criterionAnalysis:
          criterionAnalysisEntries.length > 0
            ? Object.fromEntries(criterionAnalysisEntries)
            : undefined,
        annotations,
        vocabularyProfile: null,
        repeatedIssues,
        nextPracticeTask: clean(rawFullAnalysisData.nextPracticeTask),
        warnings: cleanList(rawFullAnalysisData.warnings, 6),
      };
      const hasFullAnalysis =
        fullAnalysis.annotations.length > 0 ||
        fullAnalysis.repeatedIssues.length > 0 ||
        !!fullAnalysis.sectionAnalysis ||
        !!fullAnalysis.criterionAnalysis ||
        !!fullAnalysis.nextPracticeTask ||
        fullAnalysis.warnings.length > 0;
      if (hasFullAnalysis) structured.fullAnalysis = fullAnalysis;
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
      !!structured.sectionFeedback ||
      !!structured.fullAnalysis ||
      (structured.corrections?.length || 0) > 0 ||
      (structured.warnings?.length || 0) > 0;

    return hasContent ? structured : null;
  };
  const structuredGeneralFeedback = extractStructuredGeneralFeedback();
  const scoreRaw =
    (writingData as any)?.score ??
    (result as any)?.score ??
    (parsedFeedback as any)?.cefr_puan ??
    (aiFeedback as any)?.cefr_puan ??
    0;
  const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw) || 0;
  const normalizeLevel = (raw?: string | null) => {
    if (!raw) return undefined;
    const value = String(raw).trim().toUpperCase();
    if (value === "A0" || value === "B1_ALTI" || value === "B1 ALTI") return "B1 altı";
    return value;
  };
  const levelFromScore = (value: number) => {
    if (value >= 65) return "C1";
    if (value >= 51) return "B2";
    if (value >= 38) return "B1";
    return "B1 altı";
  };
  const resolvedLevel =
    normalizeLevel(
      (writingData as any)?.level ??
      (result as any)?.level ??
      (parsedFeedback as any)?.level ??
      (aiFeedback as any)?.level
    ) || levelFromScore(score);

  // Extract answers array (supports both legacy answers[] and new sections/subParts structure)
  const extractWritingAnswers = () => {
    // Prefer sections/subParts ordering when available to avoid misalignment
    const sections = Array.isArray(writingData?.sections) ? writingData.sections : [];
    const hasSectionAnswers = sections.some(
      (s: any) =>
        (Array.isArray(s.subParts) && s.subParts.some((sp: any) => Array.isArray(sp.answers) && sp.answers.length > 0)) ||
        (Array.isArray(s.answers) && s.answers.length > 0)
    );

    if (sections.length > 0 && hasSectionAnswers) {
      const extracted: any[] = [];
      const sortedSections = [...sections].sort((a: any, b: any) =>
        (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
      );

      sortedSections.forEach((section: any, sectionIndex: number) => {
        const subParts = Array.isArray(section.subParts) ? section.subParts : [];
        const sortedSubParts = [...subParts].sort((a: any, b: any) =>
          (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
        );

        // First push subPart answers (so Task 1.1 and 1.2 come first)
        sortedSubParts.forEach((subPart: any, subPartIndex: number) => {
          const subPartAnswers = Array.isArray(subPart.answers) ? subPart.answers : [];
          subPartAnswers.forEach((ans: any) => {
            extracted.push({
              ...ans,
              // Provide a reasonable questionText for UI
              questionText:
                ans.questionText ||
                ans.question ||
                subPart.description ||
                section.description ||
                `Görev 1.${subPartIndex + 1}`,
            });
          });
        });

        // Then push section-level answers (e.g. Task 2 main essay)
        if (Array.isArray(section.answers)) {
          section.answers.forEach((ans: any, answerIndex: number) => {
            extracted.push({
              ...ans,
              questionText:
                ans.questionText ||
                ans.question ||
                section.description ||
                `Görev ${sectionIndex + 1} ${answerIndex + 1}`,
            });
          });
        }
      });

      return extracted;
    }

    // Fallback: top-level answers array
    if (Array.isArray(writingData?.answers)) {
      const hasNonEmpty = writingData.answers.some(
        (a: any) => a && typeof a.userAnswer === "string" && a.userAnswer.trim() !== ""
      );
      if (hasNonEmpty) {
        return writingData.answers;
      }
    }

    return [];
  };

  const answers = extractWritingAnswers();

  type WritingTaskKey = "bolum_1_1" | "bolum_1_2" | "bolum_2";
  const toTaskHint = (value: unknown) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const getTaskKeyFromAnswer = (answer: any): WritingTaskKey | null => {
    const explicitKey = String(
      answer?.taskKey ?? answer?.task_key ?? answer?.sectionKey ?? ""
    ).trim() as WritingTaskKey | "";
    if (
      explicitKey === "bolum_1_1" ||
      explicitKey === "bolum_1_2" ||
      explicitKey === "bolum_2"
    ) {
      return explicitKey;
    }

    const hints = [
      answer?.questionText,
      answer?.question,
      answer?.description,
      answer?.subPart?.label,
      answer?.subPart?.description,
      answer?.section?.title,
      answer?.section?.description,
    ]
      .map(toTaskHint)
      .join(" ");

    if (/(^|\s)(1[.,]?\s*1|gorev\s*1[.,]?\s*1|bolum\s*1[.,]?\s*1)(\s|$)/.test(hints)) {
      return "bolum_1_1";
    }
    if (/(^|\s)(1[.,]?\s*2|gorev\s*1[.,]?\s*2|bolum\s*1[.,]?\s*2)(\s|$)/.test(hints)) {
      return "bolum_1_2";
    }
    if (
      /(gorev\s*2|bolum\s*2|tez|antitez|sentez|kompozisyon|blog|essay)/.test(hints)
    ) {
      return "bolum_2";
    }

    return null;
  };

  const getAnswerLength = (answer: any) =>
    typeof answer?.userAnswer === "string" ? answer.userAnswer.trim().length : 0;

  const isMeaningfulAnswer = (answer: any) => getAnswerLength(answer) > 0;
  const pickBestAnswer = (group: any[]) =>
    group.find((ans: any) => isMeaningfulAnswer(ans)) || group[0];

  const groupedAnswers = (() => {
    const groups: Record<WritingTaskKey, any[]> = {
      bolum_1_1: [],
      bolum_1_2: [],
      bolum_2: [],
    };
    const unresolved: any[] = [];

    answers.forEach((answer: any) => {
      const taskKey = getTaskKeyFromAnswer(answer);
      if (taskKey) groups[taskKey].push(answer);
      else unresolved.push(answer);
    });

    if (unresolved.length > 0 && groups.bolum_2.length === 0) {
      const longest = [...unresolved].sort(
        (a, b) => getAnswerLength(b) - getAnswerLength(a)
      )[0];
      if (longest) {
        groups.bolum_2.push(longest);
        unresolved.splice(unresolved.indexOf(longest), 1);
      }
    }

    if (unresolved.length > 0) {
      const sortedByLen = [...unresolved].sort(
        (a, b) => getAnswerLength(a) - getAnswerLength(b)
      );

      if (groups.bolum_1_1.length === 0 && sortedByLen.length > 0) {
        const shortest = sortedByLen.shift();
        if (shortest) groups.bolum_1_1.push(shortest);
      }
      if (groups.bolum_1_2.length === 0 && sortedByLen.length > 0) {
        groups.bolum_1_2.push(sortedByLen[sortedByLen.length - 1]);
      }
    }

    return groups;
  })();

  const task11Answers = groupedAnswers.bolum_1_1;
  const task12Answers = groupedAnswers.bolum_1_2;
  const task2Answers = groupedAnswers.bolum_2;

  const sectionFeedbackRows = structuredGeneralFeedback?.sectionFeedback
    ? ([
        ["bolum_1_1", "Bölüm 1.1"],
        ["bolum_1_2", "Bölüm 1.2"],
        ["bolum_2", "Bölüm 2"],
      ] as const)
        .map(([key, fallbackTitle]) => ({
          ...structuredGeneralFeedback.sectionFeedback?.[key],
          key,
          title: structuredGeneralFeedback.sectionFeedback?.[key]?.title || fallbackTitle,
        }))
        .filter((item) =>
          item.title ||
          item.strengths?.length ||
          item.issues?.length ||
          item.improvement ||
          item.wordCountWarning
        )
    : [];
  const visibleCorrections = (
    structuredGeneralFeedback?.fullAnalysis?.annotations &&
    structuredGeneralFeedback.fullAnalysis.annotations.length > 0
      ? structuredGeneralFeedback.fullAnalysis.annotations.map((item) => ({
          section: item.section,
          original: item.original,
          corrected: item.corrected,
          reason: item.explanation,
          category: item.category,
          matchFound: item.matchFound,
          annotationId: item.id,
          severity: item.severity,
          criterion: item.criterion,
          matchStrategy: item.matchStrategy,
          source: "fullAnalysis",
        }))
      : structuredGeneralFeedback?.corrections && structuredGeneralFeedback.corrections.length > 0
        ? structuredGeneralFeedback.corrections.map((item) => ({
            ...item,
            severity: undefined,
            criterion: undefined,
            matchStrategy: undefined,
            source: "corrections",
          }))
      : structuredGeneralFeedback?.alinti_duzeltme?.map((item) => ({
          section: "bolum_2" as const,
          original: item.alinti,
          corrected: item.duzeltilmis,
          reason: item.neden,
          category: "grammar",
          matchFound: undefined,
          annotationId: undefined,
          severity: undefined,
          criterion: undefined,
          matchStrategy: undefined,
          source: "legacy",
        })) || []
  ).filter((item) => item.original || item.corrected || item.reason);

  const correctionTabs: Array<{
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
      label: "İçerik",
      categories: ["task_response", "content_development", "word_count"],
      accent: "bg-blue-500",
      markClass: "bg-blue-50 text-blue-950 ring-blue-200",
      activeMarkClass: "bg-blue-100 ring-blue-500",
    },
    {
      key: "communication",
      label: "İletişimsel Başarı",
      categories: ["tone_register"],
      accent: "bg-purple-500",
      markClass: "bg-purple-50 text-purple-950 ring-purple-200",
      activeMarkClass: "bg-purple-100 ring-purple-500",
    },
    {
      key: "organisation",
      label: "Organizasyon",
      categories: ["organisation", "coherence"],
      accent: "bg-orange-500",
      markClass: "bg-orange-50 text-orange-950 ring-orange-200",
      activeMarkClass: "bg-orange-100 ring-orange-500",
    },
    {
      key: "vocabulary",
      label: "Kelime",
      categories: ["vocabulary"],
      accent: "bg-emerald-500",
      markClass: "bg-emerald-50 text-emerald-950 ring-emerald-200",
      activeMarkClass: "bg-emerald-100 ring-emerald-500",
    },
    {
      key: "grammar",
      label: "Dil Bilgisi",
      categories: ["grammar"],
      accent: "bg-rose-500",
      markClass: "bg-rose-50 text-rose-950 ring-rose-200",
      activeMarkClass: "bg-rose-100 ring-rose-500",
    },
    {
      key: "spelling",
      label: "Yazım ve Noktalama",
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

  const resolveCorrectionTab = (category?: string): CorrectionTabKey => {
    const normalized = String(category || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    return (
      correctionTabs.find((tab) => tab.categories.includes(normalized))?.key ||
      "general"
    );
  };

  const correctionsWithTabs = visibleCorrections.map((item, index) => ({
    ...item,
    id: index + 1,
    tabKey: resolveCorrectionTab(item.category),
  }));
  const tabsToShow = correctionTabs.filter((tab) => {
    if (tab.key === "summary") return true;
    if (tab.key === "all") return correctionsWithTabs.length > 0;
    if (tab.key === "general") {
      return correctionsWithTabs.some((item) => item.tabKey === "general");
    }
    return correctionsWithTabs.some((item) => item.tabKey === tab.key);
  });
  const activeTab =
    tabsToShow.some((tab) => tab.key === activeCorrectionTab)
      ? activeCorrectionTab
      : "summary";
  const activeTabCorrections =
    activeTab === "summary"
      ? []
      : activeTab === "all"
      ? correctionsWithTabs
      : correctionsWithTabs.filter((item) => item.tabKey === activeTab);
  const fullAnalysis = structuredGeneralFeedback?.fullAnalysis;
  const getCorrectionTab = (tabKey: CorrectionTabKey) =>
    correctionTabs.find((tab) => tab.key === tabKey) || correctionTabs[0];
  const activeTabCategoryKeys =
    activeTab === "summary" || activeTab === "all"
      ? correctionTabs
          .filter((tab) => tab.key !== "summary" && tab.key !== "all")
          .flatMap((tab) => tab.categories)
      : getCorrectionTab(activeTab).categories;
  const activeCriterionRows = activeTabCategoryKeys
    .map((category) => ({
      category,
      label: getCorrectionTab(resolveCorrectionTab(category)).label,
      analysis: fullAnalysis?.criterionAnalysis?.[category],
    }))
    .filter((item) => item.analysis);
  const activeRepeatedIssues = (fullAnalysis?.repeatedIssues || []).filter(
    (item) => activeTab === "summary" || activeTab === "all" || resolveCorrectionTab(item.category) === activeTab
  );
  const severityLabel = (severity?: string) => {
    if (severity === "major") return "önemli";
    if (severity === "minor") return "küçük";
    return "orta";
  };

  const sectionDefinitions: Array<{
    key: WritingTaskKey;
    label: string;
    answer: any;
  }> = [
    { key: "bolum_1_1", label: "Bölüm 1.1", answer: pickBestAnswer(task11Answers) },
    { key: "bolum_1_2", label: "Bölüm 1.2", answer: pickBestAnswer(task12Answers) },
    { key: "bolum_2", label: "Bölüm 2", answer: pickBestAnswer(task2Answers) },
  ];

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
    if (typeof start !== "number" || typeof end !== "number" || end <= start) {
      return null;
    }

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
    if (answerViewMode === "original" || !text || text === "Cevap verilmedi") {
      return text;
    }

    const sectionCorrections = correctionsWithTabs.filter(
      (item) =>
        item.section === sectionKey &&
        item.original &&
        (activeTab === "summary" || activeTab === "all" || item.tabKey === activeTab)
    );
    if (sectionCorrections.length === 0) return text;

    const matches: Array<{
      start: number;
      end: number;
      corrections: Array<(typeof correctionsWithTabs)[number]>;
    }> = [];

    sectionCorrections.forEach((correction) => {
      const match = findCorrectionMatch(text, correction.original);
      if (!match) return;

      const { start, end } = match;
      const exactRange = matches.find(
        (match) => start === match.start && end === match.end
      );
      if (exactRange) {
        exactRange.corrections.push(correction);
        return;
      }

      const overlappingRange = matches.find(
        (match) => start < match.end && end > match.start
      );
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
      const primaryCorrection = match.corrections[0];
      const correctionIds = match.corrections.map((correction) => correction.id);
      const activeInGroup =
        activeCorrectionId !== null && correctionIds.includes(activeCorrectionId);
      const title = match.corrections
        .map((correction) => normalizeDisplayText(correction.reason))
        .filter(Boolean)
        .join(" | ");

      if (match.start > cursor) {
        chunks.push(text.slice(cursor, match.start));
      }
      chunks.push(
        <mark
          key={`mark-${sectionKey}-${correctionIds.join("-")}`}
          id={`writing-correction-${primaryCorrection.id}`}
          data-correction-id={primaryCorrection.id}
          data-correction-ids={correctionIds.join(" ")}
          className={`rounded-md px-1 py-0.5 ring-1 transition-colors ${
            getCorrectionTab(primaryCorrection.tabKey).markClass
          } ${
            activeInGroup
              ? `${getCorrectionTab(primaryCorrection.tabKey).activeMarkClass} ring-2`
              : ""
          }`}
          title={title}
        >
          {text.slice(match.start, match.end)}
          <sup className="ml-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
            {correctionIds.join(",")}
          </sup>
        </mark>
      );
      cursor = match.end;
    });

    if (cursor < text.length) chunks.push(text.slice(cursor));
    return chunks;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/app/test")}
              className="mt-0.5 rounded-full p-1.5 transition-colors hover:bg-gray-100"
              aria-label="Testlere dön"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-950 sm:text-2xl">
                Yazma sonucu
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Cevabını, bölüm geri bildirimlerini ve önerilen düzeltmeleri birlikte incele.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Standart puan</p>
              <p className="mt-1 text-2xl font-semibold text-gray-950">
                {score} <span className="text-base font-medium text-gray-500">/ 75</span>
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Tahmini seviye</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">{resolvedLevel}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-950">Cevabın</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Geri bildirim modunda işaretli yerler sağdaki düzeltmelerle eşleşir.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-md border border-gray-200 bg-gray-50 p-1">
                {(["original", "feedback"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAnswerViewMode(mode)}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      answerViewMode === mode
                        ? "bg-white text-gray-950 shadow-sm"
                        : "text-gray-600 hover:text-gray-950"
                    }`}
                  >
                    {mode === "original" ? "Orijinal" : "Geri bildirim"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {sectionDefinitions.map((section) => {
                const answerText =
                  typeof section.answer?.userAnswer === "string" && section.answer.userAnswer.trim()
                    ? section.answer.userAnswer
                    : "";
                const correctionCount = correctionsWithTabs.filter(
                  (item) => item.section === section.key
                ).length;

                return (
                  <article
                    key={section.key}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-950">{section.label}</h3>
                        {section.answer?.questionText && (
                          <p className="mt-1 break-words text-sm text-gray-600">
                            {normalizeDisplayText(section.answer.questionText)}
                          </p>
                        )}
                      </div>
                      {correctionCount > 0 && (
                        <span className="w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          {correctionCount} işaret
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap break-words rounded-md border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">
                      {renderAnnotatedAnswer(section.key, answerText)}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-base font-semibold text-gray-950">Geri bildirim özeti</h2>
              {(structuredGeneralFeedback?.shortSummary || structuredGeneralFeedback?.ozet) && (
                <p className="mt-3 text-sm leading-6 text-gray-800">
                  {normalizeDisplayText(structuredGeneralFeedback.shortSummary || structuredGeneralFeedback.ozet)}
                </p>
              )}
              {structuredGeneralFeedback?.overallAdvice && (
                <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-800">
                  {normalizeDisplayText(structuredGeneralFeedback.overallAdvice)}
                </p>
              )}
              {structuredGeneralFeedback?.warnings && structuredGeneralFeedback.warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {structuredGeneralFeedback.warnings.map((warning, index) => (
                    <p
                      key={`warning-${index}`}
                      className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
                    >
                      {normalizeDisplayText(warning)}
                    </p>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-gray-950">Düzeltmeler</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Kategori seçerek önerileri daha kolay takip et.
                </p>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                {tabsToShow.map((tab) => {
                  const count =
                    tab.key === "summary"
                      ? null
                      : tab.key === "all"
                      ? correctionsWithTabs.length
                      : correctionsWithTabs.filter((item) => item.tabKey === tab.key).length;
                  const selected = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCorrectionTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-gray-900 bg-gray-950 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-950"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${selected ? "bg-white" : tab.accent}`} />
                      {tab.label}
                      {count !== null && (
                        <span className={selected ? "text-gray-200" : "text-gray-400"}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeTab === "summary" ? (
                <div className="space-y-4">
                  {fullAnalysis?.sectionAnalysis && (
                    <div className="space-y-3">
                      {([
                        ["bolum_1_1", "Bölüm 1.1"],
                        ["bolum_1_2", "Bölüm 1.2"],
                        ["bolum_2", "Bölüm 2"],
                      ] as const).map(([key, label]) => {
                        const section = fullAnalysis.sectionAnalysis?.[key];
                        if (!section) return null;
                        return (
                          <div key={`full-section-${key}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                            <div className="font-semibold text-gray-950">{label}</div>
                            {section.summary && (
                              <p className="mt-1 leading-6 text-gray-700">{normalizeDisplayText(section.summary)}</p>
                            )}
                            {section.issues?.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-gray-700">
                                {section.issues.slice(0, 3).map((issue, idx) => (
                                  <li key={`full-section-issue-${key}-${idx}`}>{normalizeDisplayText(issue)}</li>
                                ))}
                              </ul>
                            )}
                            {section.advice && (
                              <p className="mt-2 text-gray-800">
                                <span className="font-medium">Öneri:</span>{" "}
                                {normalizeDisplayText(section.advice)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeCriterionRows.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-950">Kriter analizi</h3>
                      {activeCriterionRows.slice(0, 8).map((item) => (
                        <div key={`criterion-${item.category}`} className="rounded-lg border border-gray-100 bg-white p-3 text-sm">
                          <div className="font-semibold text-gray-900">{item.label}</div>
                          {item.analysis?.summary && (
                            <p className="mt-1 leading-6 text-gray-700">{normalizeDisplayText(item.analysis.summary)}</p>
                          )}
                          {item.analysis?.majorIssues?.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-gray-700">
                              {item.analysis.majorIssues.slice(0, 3).map((issue, idx) => (
                                <li key={`criterion-issue-${item.category}-${idx}`}>{normalizeDisplayText(issue)}</li>
                              ))}
                            </ul>
                          ) : null}
                          {item.analysis?.advice && (
                            <p className="mt-2 text-gray-800">
                              <span className="font-medium">Çalış:</span>{" "}
                              {normalizeDisplayText(item.analysis.advice)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {activeRepeatedIssues.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-950">Tekrar eden sorunlar</h3>
                      {activeRepeatedIssues.map((issue, index) => (
                        <div key={`repeated-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                          <div className="font-semibold">{normalizeDisplayText(issue.title)}</div>
                          {issue.description && <p className="mt-1 leading-6">{normalizeDisplayText(issue.description)}</p>}
                          {issue.examples?.length > 0 && (
                            <p className="mt-2 text-xs">
                              Örnekler: {issue.examples.map((example) => normalizeDisplayText(example)).join(", ")}
                            </p>
                          )}
                          {issue.advice && <p className="mt-2">{normalizeDisplayText(issue.advice)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!fullAnalysis && (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Bu sonuç eski formatta oluşturulmuş. Düzeltmeler sekmesinden mevcut geri bildirimi inceleyebilirsin.
                    </p>
                  )}
                </div>
              ) : activeTabCorrections.length > 0 ? (
                <div className="space-y-3">
                  {activeTab !== "all" && activeCriterionRows.length > 0 && (
                    <div className="rounded-lg border border-gray-100 bg-white p-3 text-sm">
                      {activeCriterionRows.map((item) => (
                        <div key={`active-criterion-${item.category}`} className="space-y-1">
                          <div className="font-semibold text-gray-950">{item.label}</div>
                          {item.analysis?.summary && (
                            <p className="leading-6 text-gray-700">{normalizeDisplayText(item.analysis.summary)}</p>
                          )}
                          {item.analysis?.advice && (
                            <p className="text-gray-800">
                              <span className="font-medium">Öneri:</span>{" "}
                              {normalizeDisplayText(item.analysis.advice)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab !== "all" && activeRepeatedIssues.length > 0 && (
                    <div className="space-y-2">
                      {activeRepeatedIssues.map((issue, index) => (
                        <div key={`active-repeated-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                          <div className="font-semibold">{normalizeDisplayText(issue.title)}</div>
                          {issue.description && <p className="mt-1">{normalizeDisplayText(issue.description)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTabCorrections.map((item) => (
                    <button
                      type="button"
                      key={`correction-card-${item.id}`}
                      onClick={() => handleCorrectionSelect(item.id)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        activeCorrectionId === item.id
                          ? "border-gray-900 bg-white shadow-sm"
                          : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-gray-500">
                          {item.section === "bolum_1_1"
                            ? "Bölüm 1.1"
                            : item.section === "bolum_1_2"
                              ? "Bölüm 1.2"
                              : "Bölüm 2"}{" "}
                          · {getCorrectionTab(item.tabKey).label}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.severity && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              {severityLabel(item.severity)}
                            </span>
                          )}
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-800 ring-1 ring-gray-200">
                            {item.id}
                          </span>
                        </div>
                      </div>
                      {item.criterion && (
                        <p className="mb-2 text-xs text-gray-500">
                          Kriter: {normalizeDisplayText(item.criterion)}
                        </p>
                      )}
                      {item.original && (
                        <p className="break-words text-red-700">
                          “{normalizeDisplayText(item.original)}”
                        </p>
                      )}
                      {item.corrected && (
                        <p className="mt-1 break-words text-green-700">
                          → {normalizeDisplayText(item.corrected)}
                        </p>
                      )}
                      {item.reason && (
                        <p className="mt-2 break-words leading-6 text-gray-700">
                          {normalizeDisplayText(item.reason)}
                        </p>
                      )}
                      {item.matchFound === false && (
                        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          Bu düzeltme metinde otomatik işaretlenemedi.
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Bu kategoride belirgin bir düzeltme bulunmadı.
                </div>
              )}
            </section>

            {structuredGeneralFeedback?.nextPracticeTask && (
              <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h2 className="text-base font-semibold text-gray-950">Sonraki küçük görev</h2>
                <p className="mt-2 text-sm leading-6 text-gray-800">
                  {normalizeDisplayText(structuredGeneralFeedback.nextPracticeTask)}
                </p>
              </section>
            )}
          </aside>
        </div>

        {sectionFeedbackRows.length > 0 && (
          <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {sectionFeedbackRows.map((section) => (
              <div key={section.key} className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-950">{section.title}</h3>
                {section.strengths && section.strengths.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-500">Güçlü taraf</div>
                    <ul className="mt-1 space-y-1 text-sm text-gray-800">
                      {section.strengths.map((item, idx) => (
                        <li key={`strength-${section.key}-${idx}`}>{normalizeDisplayText(item)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {section.issues && section.issues.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-500">Düzeltilecek nokta</div>
                    <ul className="mt-1 space-y-1 text-sm text-gray-800">
                      {section.issues.map((item, idx) => (
                        <li key={`issue-${section.key}-${idx}`}>{normalizeDisplayText(item)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {section.improvement && (
                  <p className="mt-3 text-sm leading-6 text-gray-800">
                    <span className="font-semibold">Sonraki adım:</span>{" "}
                    {normalizeDisplayText(section.improvement)}
                  </p>
                )}
                {section.wordCountWarning && (
                  <p className="mt-2 text-xs text-amber-700">
                    {normalizeDisplayText(section.wordCountWarning)}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => navigate("/app/test")}
            variant="outline"
            className="h-9 px-4 text-sm"
          >
            Başka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}


