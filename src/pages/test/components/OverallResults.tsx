import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import { useLayoutEffect } from "react";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  Loader2,
  PlayCircle,
  RefreshCw,
  Volume2,
} from "lucide-react";
import WritingDeepReview from "@/components/writing/WritingDeepReview";
import SpeakingDeepReview, {
  extractSpeakingDiscussionPoints,
  isExplicitSingleRecordingCombinedPrompt,
  readLegacySpeakingSessionFallback,
  resolveSpeakingResultFeedback,
  type SpeakingDeepReviewSection,
} from "@/components/speaking/SpeakingDeepReview";
import SpeakingFlowAudioPlayer from "@/components/speaking/SpeakingFlowAudioPlayer";
import { resolveSpeakingResultDisplay } from "@/components/speaking/speaking-result-display";
import {
  regroupSpeakingAnswersByExpectedLayout,
  type SpeakingResultPartKey,
} from "@/components/speaking/speaking-result-section-layout";
import { sanitizeSpeakingLearnerCopy } from "@/components/speaking/speaking-learner-copy";
import {
  normalizeSpeakingSpeechEvidence,
  type SpeakingFlowTimeRange,
  type SpeakingSpeechEvidence,
} from "@/components/speaking/speaking-speech-evidence";
import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";
import ReadingEvidenceReview from "@/components/results/ReadingEvidenceReview";
import ListeningEvidenceReview from "@/components/results/ListeningEvidenceReview";
import WritingV2Results, {
  WritingV2Summary,
  isWritingV2Result,
} from "@/components/results/WritingV2Results";
import PerformanceReportOverview, {
  type PerformanceReportSectionStat,
  type PerformanceReportStat,
} from "@/components/results/PerformanceReportOverview";
import { FullTestReportSummary } from "@/components/results/FullTestReportSummary";
import {
  flattenReviewQuestions,
  isBlankReviewAnswer,
  type MockReviewV1,
} from "@/components/results/evidence-review-utils";
import speakingSubmissionService from "@/services/speakingSubmission.service";
import {
  resolveSpeakingEvaluationView,
  resolveSpeakingRetryAction,
  shouldShowSpeakingFeedbackRetry,
  shouldRefreshOverallEvaluation,
} from "@/services/speakingSubmissionRecovery";
import { createSpeakingAudioReplayUrl } from "@/services/speakingAudioReplay";
import writingSubmissionService from "@/services/writingSubmission.service";
import { useResultScreenProtection } from "@/hooks/use-result-screen-protection";
import { clearExamPresentation } from "@/utils/examFullscreen";
import { overallTestService } from "@/services/overallTest.service";

const resolveOfficialSpeakingDisplay = (
  status: unknown,
  score: unknown,
  storedLevel?: string | null,
) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return resolveSpeakingResultDisplay({
    status: normalizedStatus === "PROCESSING" ? "PENDING" : normalizedStatus,
    score:
      typeof score === "number" || typeof score === "string"
        ? score
        : null,
    storedLevel,
  });
};

const sanitizeSpeakingFallbackFields = (
  source: Record<string, unknown>,
) => {
  return {
    part1: sanitizeSpeakingLearnerCopy(source.part1),
    part2: sanitizeSpeakingLearnerCopy(source.part2),
    part3: sanitizeSpeakingLearnerCopy(source.part3),
    part4: sanitizeSpeakingLearnerCopy(source.part4),
    coherence: sanitizeSpeakingLearnerCopy(source.coherence),
    grammar: sanitizeSpeakingLearnerCopy(source.grammar),
    lexical: sanitizeSpeakingLearnerCopy(source.lexical),
    achievement: sanitizeSpeakingLearnerCopy(source.achievement),
  };
};

const isSpeakingEvaluationPending = (status: unknown) =>
  ["PENDING", "PROCESSING"].includes(
    String(status || "").trim().toUpperCase(),
  );

interface Question {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionContent: string;
  questionType: string;
  userAnswer: string;
  correctAnswers: Array<{
    id: string;
    text: string;
  }>;
}

interface TestSonuc {
  aiFeedback?: any;
  resultId?: string;
  reviewAvailable?: boolean;
  review?: MockReviewV1 | null;
  test: {
    id: string;
    title: string;
    type: string;
  };
  score: number;
  completedAt?: string;
  questions?: Question[];
  overallScore?: number;
  answers?: Array<{
    questionText: string;
    questionId: string;
    userAnswer: string;
    section?: {
      id: string;
      title: string;
      description: string;
      order: number;
    };
  }>;
  submittedAt?: string;
  sections?: any[];
  parts?: any[];
  part1?: any;
  part2?: any;
  part3?: any;
  id?: string;
  submissionId?: string;
  feedbackRetry?: {
    eligible?: boolean;
    reason?: string | null;
  };
  evaluationStatus?: string;
  processingVersion?: string | null;
  evaluationErrorCode?: string | null;
  evaluationAttempts?: number;
  evaluatedAt?: string | null;
  updatedAt?: string | null;
}

interface SpeakingAudioMeta {
  audioId?: string | null;
  hasAudio?: boolean;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
  retentionUntil?: string | null;
  sectionKey?: string | null;
  speechEvidence?: SpeakingSpeechEvidence;
}

interface OverallResponse {
  id: string;
  status: string;
  isCompleted: boolean;
  completedAt?: string;
  startedAt: string;
  totalCoinSpent: number;
  user: {
    id: string;
    name: string;
  };
  level?: string;
  listening?: TestSonuc;
  reading?: TestSonuc;
  writing?: TestSonuc;
  speaking?: TestSonuc;
}

export const getSpeakingRetryFingerprint = (speaking?: TestSonuc | null) =>
  JSON.stringify({
    evaluationStatus: speaking?.evaluationStatus ?? null,
    evaluatedAt: speaking?.evaluatedAt ?? null,
    processingVersion: speaking?.processingVersion ?? null,
    evaluationAttempts: speaking?.evaluationAttempts ?? null,
    evaluationErrorCode: speaking?.evaluationErrorCode ?? null,
    score: speaking?.score ?? null,
    updatedAt: speaking?.updatedAt ?? null,
  });

export const hasChangedSpeakingRetryResult = (
  baseline: string | null,
  current: string,
) => Boolean(baseline && baseline !== current);

export default function OverallResults() {
  useResultScreenProtection();
  const params = useParams<{ overallId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openedFromReports = searchParams.get("source") === "reports";
  const [data, setData] = useState<OverallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listening");
  const [activeTask, setActiveTask] = useState("task2");
  const [activeTask1Part, setActiveTask1Part] = useState("part1");
  const [activeSpeakingPart, setActiveSpeakingPart] = useState(0);
  const [activeSpeakingQuestion, setActiveSpeakingQuestion] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, { url: string; expiresAt: number }>>({});
  const [audioLoading, setAudioLoading] = useState<Record<string, boolean>>({});
  const [audioErrors, setAudioErrors] = useState<Record<string, string>>({});
  const [retryingSpeakingFeedback, setRetryingSpeakingFeedback] = useState(false);
  const [speakingRetryRefreshError, setSpeakingRetryRefreshError] = useState<string | null>(null);
  const [retryingWritingFeedback, setRetryingWritingFeedback] = useState(false);
  const audioElementRefs = useRef(new Map<string, HTMLAudioElement>());
  const audioObjectUrlsRef = useRef(new Map<string, string>());
  const pendingAudioSeek = useRef(new Map<string, number>());
  const speakingRetryAcceptedRef = useRef(false);
  const speakingRetryBaselineRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    void clearExamPresentation();
  }, []);

  useEffect(
    () => () => {
      audioObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioObjectUrlsRef.current.clear();
    },
    [],
  );

  const handleDownloadPDF = async () => {
    const id = params.overallId;
    if (!id) return;

    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(id, `certificate-${id}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const fetchOverallResults = useCallback(async (showLoading = true) => {
    const id = params.overallId;
    if (!id) { navigate("/app/test"); return false; }
    if (showLoading) setLoading(true);
    try {
      const res = await axiosPrivate.get(`/api/overal-test-result/${id}/results`);
      const payload = (res?.data?.data || res?.data || null) as OverallResponse | null;
      const speakingSubmissionId =
        typeof payload?.speaking?.submissionId === "string"
          ? payload.speaking.submissionId.trim()
          : typeof payload?.speaking?.id === "string"
            ? payload.speaking.id.trim()
            : "";

      if (payload?.speaking && speakingSubmissionId) {
        try {
          const speakingRes = await axiosPrivate.get(`/api/speaking-submission/${speakingSubmissionId}`);
          const detailedSpeaking = speakingRes?.data?.data || speakingRes?.data || null;
          if (detailedSpeaking) {
            setData({
              ...payload,
              speaking: {
                ...payload.speaking,
                ...detailedSpeaking,
                answers:
                  Array.isArray(detailedSpeaking.answers) && detailedSpeaking.answers.length > 0
                    ? detailedSpeaking.answers
                    : payload.speaking.answers || [],
                part1: payload.speaking.part1,
                part2: payload.speaking.part2,
                part3: payload.speaking.part3,
                test: payload.speaking.test,
              },
            });
            return true;
          }
        } catch {
          // Keep the overall result usable if detailed speaking hydration is unavailable.
        }
        setData(payload);
        return false;
      }

      setData(payload);
      return Boolean(payload);
    } catch (e) {
      console.error("Error fetching overall results:", e);
      if (showLoading) setData(null);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [params.overallId, navigate]);

  useEffect(() => {

    // exit exam mode on entering overall results
    try { document?.body?.classList?.remove("exam-mode"); } catch {}
    void fetchOverallResults();
  }, [fetchOverallResults]);

  const pendingWritingEvaluationStatus = String(
    data?.writing?.evaluationStatus ||
      (data?.writing?.aiFeedback as any)?.evaluationStatus ||
      "",
  ).toUpperCase();
  const speakingEvaluationStatus = String(
    data?.speaking?.evaluationStatus ||
      (data?.speaking?.aiFeedback as any)?.evaluationStatus ||
      "",
  ).toUpperCase();
  const pendingSpeakingEvaluation = isSpeakingEvaluationPending(
    speakingEvaluationStatus,
  );
  const speakingRetryFingerprint = getSpeakingRetryFingerprint(data?.speaking);
  const speakingEvaluationView = resolveSpeakingEvaluationView(
    pendingSpeakingEvaluation ? "PENDING" : speakingEvaluationStatus,
  );
  const shouldRefreshEvaluation = shouldRefreshOverallEvaluation({
    writingStatus: pendingWritingEvaluationStatus,
    speakingStatus: pendingSpeakingEvaluation
      ? "PENDING"
      : speakingEvaluationStatus,
  });

  useEffect(() => {
    if (
      !retryingSpeakingFeedback ||
      !speakingRetryAcceptedRef.current ||
      pendingSpeakingEvaluation ||
      !hasChangedSpeakingRetryResult(
        speakingRetryBaselineRef.current,
        speakingRetryFingerprint,
      )
    ) {
      return;
    }

    if (speakingEvaluationStatus === "COMPLETED") {
      speakingRetryAcceptedRef.current = false;
      speakingRetryBaselineRef.current = null;
      setSpeakingRetryRefreshError(null);
      setRetryingSpeakingFeedback(false);
      return;
    }

    if (speakingEvaluationStatus === "FAILED") {
      speakingRetryAcceptedRef.current = false;
      speakingRetryBaselineRef.current = null;
      setSpeakingRetryRefreshError(
        "Yeniden değerlendirme tamamlanamadı. Sonuç güncellenemedi.",
      );
      setRetryingSpeakingFeedback(false);
    }
  }, [
    pendingSpeakingEvaluation,
    retryingSpeakingFeedback,
    speakingEvaluationStatus,
    speakingRetryFingerprint,
  ]);

  useEffect(() => {
    if (!shouldRefreshEvaluation && !retryingSpeakingFeedback) return;

    const refresh = () => {
      void fetchOverallResults(false).then((refreshed) => {
        if (refreshed || !speakingRetryAcceptedRef.current) return;
        speakingRetryAcceptedRef.current = false;
        speakingRetryBaselineRef.current = null;
        setSpeakingRetryRefreshError(
          "Yeniden değerlendirme durumu şu anda yenilenemedi. Lütfen tekrar deneyin.",
        );
        setRetryingSpeakingFeedback(false);
      });
    };

    const refreshInterval = window.setInterval(() => {
      refresh();
    }, 2_500);

    return () => window.clearInterval(refreshInterval);
  }, [
    fetchOverallResults,
    retryingSpeakingFeedback,
    shouldRefreshEvaluation,
  ]);

  const speakingSubmissionId =
    typeof data?.speaking?.submissionId === "string"
      ? data.speaking.submissionId.trim()
      : typeof data?.speaking?.id === "string"
        ? data.speaking.id.trim()
        : "";
  const speakingFeedbackRetry = data?.speaking?.feedbackRetry;
  const canRetrySpeakingFeedback = Boolean(
    speakingSubmissionId && speakingFeedbackRetry?.eligible,
  );

  const retrySpeakingFeedback = async () => {
    if (
      !canRetrySpeakingFeedback ||
      !speakingSubmissionId ||
      retryingSpeakingFeedback
    ) {
      return;
    }

    setRetryingSpeakingFeedback(true);
    setSpeakingRetryRefreshError(null);
    speakingRetryBaselineRef.current = getSpeakingRetryFingerprint(
      data?.speaking,
    );
    try {
      const retryAction = resolveSpeakingRetryAction(
        speakingEvaluationStatus,
        data?.speaking?.processingVersion,
      );
      if (retryAction === "evaluation") {
        await speakingSubmissionService.retryEvaluation(speakingSubmissionId);
      } else {
        await speakingSubmissionService.retryFeedback(speakingSubmissionId);
      }
      speakingRetryAcceptedRef.current = true;
      const refreshed = await fetchOverallResults(false);
      if (!refreshed) {
        speakingRetryAcceptedRef.current = false;
        speakingRetryBaselineRef.current = null;
        setSpeakingRetryRefreshError(
          "Yeniden değerlendirme durumu şu anda yenilenemedi. Lütfen tekrar deneyin.",
        );
        setRetryingSpeakingFeedback(false);
      }
    } catch {
      // The service presents a safe student-facing error message.
      speakingRetryAcceptedRef.current = false;
      speakingRetryBaselineRef.current = null;
      setSpeakingRetryRefreshError(
        "Yeniden değerlendirme isteği gönderilemedi. Lütfen tekrar deneyin.",
      );
      setRetryingSpeakingFeedback(false);
    }
  };

  const retryWritingFeedback = async () => {
    const submissionId =
      typeof data?.writing?.submissionId === "string"
        ? data.writing.submissionId.trim()
        : typeof data?.writing?.id === "string"
          ? data.writing.id.trim()
          : "";
    if (!submissionId || retryingWritingFeedback) return;

    setRetryingWritingFeedback(true);
    try {
      const retried = await writingSubmissionService.retryFeedback(submissionId);
      if (retried) await fetchOverallResults(false);
    } finally {
      setRetryingWritingFeedback(false);
    }
  };

  const normalizeLevelLabel = (value?: string) => {
    if (!value) return value;
    const normalized = value.trim().replace(/\s+/g, " ");
    const upper = normalized.toUpperCase();
    if (
      upper === "A0" ||
      upper === "B1_ALTI" ||
      upper === "B1 ALTI" ||
      /^B1[\s_-]*alt[ıi]$/i.test(normalized) ||
      /^B1\s*alt[ıi](?:\s+alt[ıi])+$/i.test(normalized)
    ) {
      return "B1 altı";
    }
    return normalized;
  };
  const removeLowValueStrengthSentences = (text: string) => {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) return "";
    const sentences = source
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const noisyPatterns = [
      /en az bir (?:karakter|kelime)/i,
      /boş bırakmam(?:ış|is)/i,
      /bos birakmam(?:is|ış)/i,
      /motivasyonunuzun olduğunu göstermektedir/i,
      /motivasyonunuzun oldugunu gostermektedir/i,
      /yazma sürecine başlama motivasyonu/i,
      /yazma surecine baslama motivasyonu/i,
      /tamamen boş bırakmamanız açısından olumlu/i,
      /tamamen bos birakmamaniz acisindan olumlu/i,
    ];
    return sentences
      .filter((sentence) => !noisyPatterns.some((pattern) => pattern.test(sentence)))
      .join(" ")
      .trim();
  };
  const sanitizeNarrativeArtifacts = (text: string) => {
    return removeLowValueStrengthSentences(
      String(text || "")
        .replace(/\bB1\s*alt[ıi]\s+alt[ıi]\b/gi, "B1 altı")
        .replace(/\bB1\s*alti\b/gi, "B1 altı")
        .replace(/\b(A1|A2|B1|B2|C1|C2)\s+\1\b/gi, "$1")
        .replace(/güçlü yönler(?:\s+olarak)?[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/guclu yonler(?:\s+olarak)?[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/her bir bölüme en az bir (?:karakter|kelime)[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/en az bir kelimeyle de olsa[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  };
  const displayLevel = (level?: string) => {
    return normalizeLevelLabel(level);
  };
  const levelFrom75 = (score?: number | null) => {
    if (typeof score !== "number" || Number.isNaN(score)) return undefined;
    if (score >= 65) return "C1";
    if (score >= 51) return "B2";
    if (score >= 38) return "B1";
    return "B1 altı";
  };
  const wholeScore = (value: unknown): number => {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  };
  const parseUserAnswerList = (value?: string): string[] => {
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item ?? "").trim())
            .filter(Boolean);
        }
        if (typeof parsed === "string" && parsed.trim()) {
          return [parsed.trim()];
        }
      } catch {
        // Fallback to raw string handling below.
      }
    }

    return [trimmed];
  };
  const normalizeAnswerList = (values: string[]): string[] =>
    values.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const isExactAnswerSetMatch = (correct: string[], user: string[]) => {
    if (!correct.length || !user.length) return false;
    if (correct.length !== user.length) return false;
    return correct.every((answer) => user.includes(answer)) && user.every((answer) => correct.includes(answer));
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tm-bg-app)] px-4 py-8 font-sans tracking-normal sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-3 w-24 rounded bg-[#e7e7e4]" />
          <div className="mt-3 h-8 w-64 rounded bg-[#dededb]" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e7e7e4]" />
          <div className="mt-6 overflow-hidden rounded-[8px] border border-[var(--tm-border-subtle)] bg-white">
            <div className="h-10 border-b border-[var(--tm-border-subtle)] bg-[#fbfbfa]" />
            <div className="grid min-h-36 sm:grid-cols-2">
              <div className="m-5 rounded bg-[#efefed]" />
              <div className="m-5 rounded bg-[#f5f5f3]" />
            </div>
          </div>
          <p className="mt-4 text-[12px] text-[var(--tm-text-tertiary)]">
            Sonuç raporu hazırlanıyor…
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--tm-bg-app)] px-4 py-10 font-sans tracking-normal">
        <div className="mx-auto max-w-xl rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-8 text-center shadow-[var(--tm-shadow-card)]">
          <h1 className="text-[20px] font-semibold text-[var(--tm-text-primary)]">
            Sonuç raporu bulunamadı
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
            Bu sınavın sonucu henüz hazır olmayabilir veya rapora erişilemiyor.
          </p>
          <Button
            onClick={() => navigate("/app/test")}
            variant="outline"
            className="mt-5 rounded-[7px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Testlere dön
          </Button>
        </div>
      </div>
    );
  }

  const renderSpeakingFeedbackRetry = () => {
    if (!shouldShowSpeakingFeedbackRetry(
      speakingEvaluationView.kind,
      canRetrySpeakingFeedback,
    )) {
      return null;
    }

    return (
      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--tm-text-primary)]">
            Konuşma değerlendirmesi hazırlanamadı
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--tm-text-secondary)]">
            Sorun giderildiyse bu raporu yeniden değerlendirebilirsiniz.
          </p>
          {speakingRetryRefreshError && (
            <p role="alert" className="mt-2 text-sm leading-5 text-[#9f3f3f]">
              {speakingRetryRefreshError}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={retryingSpeakingFeedback}
          onClick={retrySpeakingFeedback}
          className="min-h-10 shrink-0"
        >
          {retryingSpeakingFeedback && (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          )}
          {retryingSpeakingFeedback
            ? "Değerlendiriliyor"
            : "Konuşmayı yeniden değerlendir"}
        </Button>
      </section>
    );
  };

  // Render functions using the original UI but with new data structure
  const renderListeningResults = () => {
    if (!data?.listening || !data.listening.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Dinleme testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const examData = data.listening.questions.map((q, index: number) => {
      const correctTexts = (q.correctAnswers || []).map(a => a.text).filter(Boolean);
      const correctAnswer = correctTexts.join(" / ");
      const correctNormalized = normalizeAnswerList(correctTexts);
      const userAnswers = parseUserAnswerList(q.userAnswer);
      const userNormalized = normalizeAnswerList(userAnswers);
      const isCorrect = isExactAnswerSetMatch(correctNormalized, userNormalized);
      const userAnswerDisplay = userAnswers.length > 0 ? userAnswers.join(" / ") : "Seçilmedi";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: userAnswerDisplay,
        correctAnswer,
        result: isCorrect ? "Doğru" : "Yanlış"
      };
    });

    return (
      <div className="space-y-6">
        {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sınav Sonuçları</h1> */}
        </div>
        
          <div className="space-y-6">

          <ListeningEvidenceReview
            resultId={data.listening.resultId}
            reviewAvailable={data.listening.reviewAvailable}
            review={data.listening.review}
            showOutcomeCounts={reportIsMulti}
          />

          {/* Legacy results keep their basic answer table. */}
          {!data.listening.reviewAvailable && (
          <Card className="overflow-hidden rounded-lg border border-gray-200">
            <CardContent className="p-0">
              {/* Mobile Card Layout */}
              <div className="block sm:hidden">
                {examData.map((item, index: number) => (
                  <div
                    key={item.no}
                    className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Soru {item.no}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.result === "Doğru"
                          ? "bg-[#e7f1e8] text-[#2f6f3d]"
                          : item.result === "Yanlış"
                            ? "bg-[#f8e8e8] text-[#a93636]"
                            : "bg-[#efefed] text-[var(--tm-text-secondary)]"
                      }`}>
                        {item.result}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 min-w-[90px]">Cevabınız:</span>
                        <span className="text-xs text-gray-700 break-words">{item.userAnswer}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 min-w-[90px]">Doğru Cevap:</span>
                        <span className="text-xs text-gray-800 font-medium break-words">{item.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[var(--tm-border-subtle)] bg-[#f3f3f1] text-[var(--tm-text-secondary)]">
                      <th className="px-4 py-3 text-left text-[12px] font-semibold">Soru</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold">Cevabınız</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold">Doğru cevap</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examData.map((item, index: number) => (
                      <tr
                        key={item.no}
                        className={`border-b border-[var(--tm-border-subtle)] last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-[#fbfbfa]"}`}
                      >
                        <td className="px-4 py-3 text-[13px] font-semibold text-[var(--tm-text-primary)]">S{item.no}</td>
                        <td className="break-words px-4 py-3 text-[13px] text-[var(--tm-text-secondary)]">{item.userAnswer}</td>
                        <td className="break-words px-4 py-3 text-[13px] font-medium text-[var(--tm-text-primary)]">{item.correctAnswer}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            item.result === "Doğru" 
                              ? "bg-[#e7f1e8] text-[#2f6f3d]"
                              : item.result === "Yanlış" 
                                ? "bg-[#f8e8e8] text-[#a93636]"
                                : "bg-[#efefed] text-[var(--tm-text-secondary)]"
                          }`}>
                            {item.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    );
  };

  const renderReadingResults = () => {
    if (!data?.reading || !data.reading.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Okuma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const examData = data.reading.questions.map((q, index: number) => {
      const correctTexts = (q.correctAnswers || []).map(a => a.text).filter(Boolean);
      const correctAnswer = correctTexts.join(" / ");
      const correctNormalized = normalizeAnswerList(correctTexts);
      const userAnswers = parseUserAnswerList(q.userAnswer);
      const userNormalized = normalizeAnswerList(userAnswers);
      const isCorrect = isExactAnswerSetMatch(correctNormalized, userNormalized);
      const userAnswerDisplay = userAnswers.length > 0 ? userAnswers.join(" / ") : "Seçilmedi";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: userAnswerDisplay,
        correctAnswer,
        result: isCorrect ? "Doğru" : "Yanlış"
      };
    });
    return (
      <div className="space-y-6">
        <ReadingEvidenceReview
          resultId={data.reading.resultId}
          reviewAvailable={data.reading.reviewAvailable}
          review={data.reading.review}
          showOutcomeCounts={reportIsMulti}
        />

        {/* Legacy results keep their basic answer table. */}
        {!data.reading.reviewAvailable && (
        <Card className="overflow-hidden rounded-lg border border-gray-200">
          <CardContent className="p-0">
            {/* Mobile Card Layout */}
            <div className="block sm:hidden">
              {examData.map((item, index: number) => (
                <div
                  key={item.no}
                  className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Soru {item.no}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.result === "Doğru"
                        ? "bg-[#e7f1e8] text-[#2f6f3d]"
                        : item.result === "Yanlış"
                          ? "bg-[#f8e8e8] text-[#a93636]"
                          : "bg-[#efefed] text-[var(--tm-text-secondary)]"
                    }`}>
                      {item.result}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[90px]">Cevabınız:</span>
                      <span className="text-xs text-gray-700 break-words">{item.userAnswer}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[90px]">Doğru Cevap:</span>
                      <span className="text-xs text-gray-800 font-medium break-words">{item.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--tm-border-subtle)] bg-[#f3f3f1] text-[var(--tm-text-secondary)]">
                    <th className="px-4 py-3 text-left text-[12px] font-semibold">Soru</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold">Cevabınız</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold">Doğru cevap</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index: number) => (
                    <tr
                      key={item.no}
                      className={`border-b border-[var(--tm-border-subtle)] last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-[#fbfbfa]"}`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-[var(--tm-text-primary)]">S{item.no}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--tm-text-secondary)]">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-[var(--tm-text-primary)]">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Doğru" 
                            ? "bg-[#e7f1e8] text-[#2f6f3d]"
                            : item.result === "Yanlış" 
                              ? "bg-[#f8e8e8] text-[#a93636]"
                              : "bg-[#efefed] text-[var(--tm-text-secondary)]"
                        }`}>
                          {item.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    );
  };

  const renderWritingResults = () => {
    if (!data?.writing) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Yazma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const { writing } = data;
    const rawAiFeedback =
      writing.aiFeedback ??
      (writing as any).ai_feedback ??
      (writing as any).feedback ??
      (writing as any).assessment ??
      null;
    const aiFeedback =
      rawAiFeedback && typeof rawAiFeedback === "object"
        ? (rawAiFeedback as any).aiFeedback ??
          (rawAiFeedback as any).ai_feedback ??
          (rawAiFeedback as any).feedback ??
          (rawAiFeedback as any).assessment ??
          rawAiFeedback
        : rawAiFeedback;

    if (isWritingV2Result(writing as any)) {
      return (
        <WritingV2Results
          data={writing as any}
          showOverallSummary={reportIsMulti}
          summaryMode="general-only"
          retrying={retryingWritingFeedback}
          onRetry={retryWritingFeedback}
        />
      );
    }
    
    // Bullet cleanup + Turkish text normalization + repeated sentence dedupe
    const cleanBullets = (text: string): string => {
      if (!text) return "";
      return normalizeFeedbackText(
        text
          .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      );
    };

    type StructuredGeneralFeedback = {
      ozet: string;
      tekrar_eden_eksikler: string[];
      alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
      egzersizler: Array<{ baslik: string; uygulama: string }>;
      kapanis: string;
    };

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return sanitizeNarrativeArtifacts(cleanBullets(
        text
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
          .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
          .replace(/AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi, " ")
          .replace(/GENEL DEĞERLENDİRME\s*:/gi, " ")
      ));
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
    
    // Helper function to extract feedback sections from string
    const extractFeedbackSection = (feedbackText: string | undefined, sectionName: string): string => {
      if (!feedbackText || typeof feedbackText !== 'string') {
        return `Geri bildirim mevcut değil`;
      }
      
      // Try to extract specific section from the feedback string
      const sectionPatterns: Record<string, RegExp> = {
        'part1_1': /\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part1_2': /\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part2': /\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'general': /GENEL DEĞERLENDİRME:([\s\S]*?)(?=$)/i
      };
      
      const pattern = sectionPatterns[sectionName];
      if (pattern) {
        const match = feedbackText.match(pattern);
        if (match && match[1]) {
          if (sectionName === "general") {
            return sanitizeGeneralFeedback(match[1].trim());
          }
          return match[1].trim();
        }
      }
      
      // If no specific section found, return the full feedback for general or fallback
      if (sectionName === 'general') {
        return sanitizeGeneralFeedback(feedbackText);
      }
      if (sectionName === 'taskAchievement') {
        return feedbackText;
      }
      
      return `Geri bildirim mevcut değil`;
    };

    // Extract scores from AI feedback or use defaults
    const extractScoreFromFeedback = (feedbackText: string | undefined) => {
      if (!feedbackText) return 0;
      if (typeof feedbackText === 'string') {
        const match = feedbackText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    };
    
    // Helper to extract specific feedback text from string format
    const getFeedbackText = (key: string): string => {
      if (typeof aiFeedback === 'string') {
        // Try to extract from the string format
        const patterns: Record<string, RegExp> = {
          'coherenceAndCohesion': /Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s]*([^\n\r•]*)/i,
          'grammaticalRangeAndAccuracy': /Dil Bilgisi[:\s]*([^\n\r•]*)/i,
          'lexicalResource': /Kelime Kaynağı[:\s]*([^\n\r•]*)/i,
          'taskAchievement': /(?:Görev Başarısı|Görev Yanıtı)[:\s]*([^\n\r•]*)/i,
        };
        const pattern = patterns[key];
        if (pattern) {
          const match = aiFeedback.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        // If not found, avoid dumping raw full feedback into criterion cards
        return '';
      } else if (aiFeedback && typeof aiFeedback === 'object') {
        return aiFeedback[key] || '';
      }
      return '';
    };

    // Parse AI feedback string to extract sections (similar to WritingTestResults)
    const parseAIFeedback = () => {
      if (!aiFeedback) return null;

      // If feedback is an object, normalize common backend shapes
      if (typeof aiFeedback === 'object' && aiFeedback !== null) {
        const feedbackObj: any = aiFeedback;
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
      if (typeof aiFeedback === 'string') {
        const parsed: any = {};

        // Extract GÖREV 1.1 section
        const task1_1Match = aiFeedback.match(/\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
        if (task1_1Match) {
          parsed.part1_1 = cleanBullets(task1_1Match[1].trim());
        }

        // Extract GÖREV 1.2 section
        const task1_2Match = aiFeedback.match(/\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
        if (task1_2Match) {
          parsed.part1_2 = cleanBullets(task1_2Match[1].trim());
        }

        // Extract BÖLÜM 2 section
        const part2Match = aiFeedback.match(/\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i);
        if (part2Match) {
          parsed.part2 = cleanBullets(part2Match[1].trim());
        }

        // Extract AI GERİ BİLDİRİMİ (EĞİTMEN NOTU) section
        const generalMatch = aiFeedback.match(/AI GERİ BİLDİRİMİ \(EĞİTMEN NOTU\):([\s\S]*?)(?=$)/i);
        if (generalMatch) {
          parsed.general = cleanBullets(generalMatch[1].trim());
        }

        // Extract individual criteria from each section
        const extractCriteria = (text: string) => {
          const criteria: any = {};
          
          // Extract Tutarlılık ve Bağlılık
          const coherenceMatch = text.match(/Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s]*([^\n\r•]*)/i);
          if (coherenceMatch) {
            criteria.coherenceAndCohesion = coherenceMatch[1].trim();
          }
          
          // Extract Dil Bilgisi
          const grammarMatch = text.match(/Dil Bilgisi[:\s]*([^\n\r•]*)/i);
          if (grammarMatch) {
            criteria.grammaticalRangeAndAccuracy = grammarMatch[1].trim();
          }
          
          // Extract Kelime Kaynağı
          const lexicalMatch = text.match(/Kelime Kaynağı[:\s]*([^\n\r•]*)/i);
          if (lexicalMatch) {
            criteria.lexicalResource = lexicalMatch[1].trim();
          }
          
          // Extract Görev Başarısı
          const taskMatch = text.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s]*([^\n\r•]*)/i);
          if (taskMatch) {
            criteria.taskAchievement = taskMatch[1].trim();
          }
          
          return criteria;
        };

        // Extract criteria from the full feedback text
        const allCriteria = extractCriteria(aiFeedback);
        Object.assign(parsed, allCriteria);

        return parsed;
      }

      return null;
    };

    const parsedFeedback = parseAIFeedback();
    const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
      const raw =
        (parsedFeedback as any)?.generalStructured ??
        (parsedFeedback as any)?.general_structured ??
        (parsedFeedback as any)?.genel_degerlendirme_yapilandirilmis ??
        (aiFeedback as any)?.generalStructured ??
        (aiFeedback as any)?.general_structured ??
        (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;

      if (!raw || typeof raw !== "object") return null;
      const src: any = raw;
      const clean = (value: any) => cleanBullets(typeof value === "string" ? value : "");

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
      };

      const hasContent =
        structured.ozet ||
        structured.kapanis ||
        structured.tekrar_eden_eksikler.length > 0 ||
        structured.alinti_duzeltme.length > 0 ||
        structured.egzersizler.length > 0;

      return hasContent ? structured : null;
    };
    const structuredGeneralFeedback = extractStructuredGeneralFeedback();

    const isPlaceholderText = (value?: string) => {
      if (!value || typeof value !== "string") return true;
      const normalized = value
        .trim()
        .toLowerCase()
        .replace(/\./g, "");
      return (
        normalized === "yanit yok" ||
        normalized === "yanıt yok" ||
        normalized === "degerlendirme yok" ||
        normalized === "değerlendirme yok" ||
        normalized === "yok" ||
        normalized === "-"
      );
    };

    const pickMeaningfulText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim() && !isPlaceholderText(value)) {
          return normalizeFeedbackText(value.trim());
        }
      }
      return undefined;
    };

    const extractCriteriaFromNarrative = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const source = cleanBullets(text);

      return {
        coherence: pickMeaningfulText(
          source.match(/Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Tutarlilik(?:\s*ve\s*Baglilik)?[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        grammar: pickMeaningfulText(
          source.match(/Dil Bilgisi[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        lexical: pickMeaningfulText(
          source.match(/Kelime Kaynağı[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Kelime Kaynagi[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        achievement: pickMeaningfulText(
          source.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/(?:Gorev Basarisi|Gorev Yaniti)[:\s-]*([^\n\r]+)/i)?.[1]
        ),
      };
    };

    const extractCriteriaFromGeneralFeedback = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const sentences = cleanBullets(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const pickSentence = (patterns: RegExp[]) =>
        pickMeaningfulText(
          ...sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)))
        );

      return {
        coherence: pickSentence([/tutarl/i, /bağlılık/i, /baglilik/i, /akış/i, /akis/i]),
        grammar: pickSentence([/dil\s*bilg/i, /gramer/i, /cümle/i, /cumle/i]),
        lexical: pickSentence([/kelime/i, /söz varlığı/i, /soz varligi/i, /vocabulary/i]),
        achievement: pickSentence([/görev/i, /gorev/i, /yanıt/i, /yanit/i, /talimat/i, /konu/i, /başarı/i, /basari/i]),
      };
    };

    const getActiveSectionKey = (): "bolum_1_1" | "bolum_1_2" | "bolum_2" =>
      activeTask === "task1"
        ? activeTask1Part === "part1"
          ? "bolum_1_1"
          : "bolum_1_2"
        : "bolum_2";

    const getSectionCriteriaFromObject = (sectionKey: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
      if (!aiFeedback || typeof aiFeedback !== "object") return {};
      const bolumler = (aiFeedback as any)?.bolumler || (aiFeedback as any)?.["bölümler"];
      const section = bolumler?.[sectionKey] || (aiFeedback as any)?.[sectionKey];
      const criteria = section?.kriterler || section?.criteria || section;

      return {
        coherence: pickMeaningfulText(
          criteria?.coherenceAndCohesion,
          criteria?.coherence_and_cohesion,
          criteria?.tutarlilikVeBaglilik,
          criteria?.tutarlilik_ve_baglilik,
          criteria?.["Tutarlılık ve Bağlılık"],
          criteria?.["Tutarlılık"]
        ),
        grammar: pickMeaningfulText(
          criteria?.grammaticalRangeAndAccuracy,
          criteria?.grammatical_range_and_accuracy,
          criteria?.dilBilgisi,
          criteria?.dil_bilgisi,
          criteria?.["Dil Bilgisi"]
        ),
        lexical: pickMeaningfulText(
          criteria?.lexicalResource,
          criteria?.lexical_resource,
          criteria?.kelimeKaynagi,
          criteria?.kelime_kaynagi,
          criteria?.["Kelime Kaynağı"]
        ),
        achievement: pickMeaningfulText(
          criteria?.taskAchievement,
          criteria?.task_achievement,
          criteria?.gorevBasarisi,
          criteria?.gorev_basarisi,
          criteria?.gorevYaniti,
          criteria?.gorev_yaniti,
          criteria?.["Görev Başarısı"],
          criteria?.["Görev Yanıtı"]
        ),
      };
    };

    const getSectionNarrative = (sectionKey: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
      if (sectionKey === "bolum_1_1") return parsedFeedback?.part1_1;
      if (sectionKey === "bolum_1_2") return parsedFeedback?.part1_2;
      return parsedFeedback?.part2;
    };

    const activeSectionKey = getActiveSectionKey();
    const criteriaFromObject = getSectionCriteriaFromObject(activeSectionKey);
    const criteriaFromNarrative = extractCriteriaFromNarrative(getSectionNarrative(activeSectionKey));
    const criteriaFromGeneral = extractCriteriaFromGeneralFeedback(
      pickMeaningfulText(parsedFeedback?.general, extractFeedbackSection(aiFeedback, "general"))
    );
    const activeCriteria = {
      coherence: criteriaFromObject.coherence || criteriaFromNarrative.coherence || criteriaFromGeneral.coherence || "Kısa değerlendirme yok",
      grammar: criteriaFromObject.grammar || criteriaFromNarrative.grammar || criteriaFromGeneral.grammar || "Kısa değerlendirme yok",
      lexical: criteriaFromObject.lexical || criteriaFromNarrative.lexical || criteriaFromGeneral.lexical || "Kısa değerlendirme yok",
      achievement: criteriaFromObject.achievement || criteriaFromNarrative.achievement || criteriaFromGeneral.achievement || "Kısa değerlendirme yok",
    };

    const scores = {
      overall: wholeScore(writing?.score),
      part1: 0,
      part2: 0,
      coherence: extractScoreFromFeedback(getFeedbackText('coherenceAndCohesion')) || 0,
      grammar: extractScoreFromFeedback(getFeedbackText('grammaticalRangeAndAccuracy')) || 0,
      lexical: extractScoreFromFeedback(getFeedbackText('lexicalResource')) || 0,
      achievement: extractScoreFromFeedback(getFeedbackText('taskAchievement')) || 0,
    };

    // Prefer score-derived writing level to avoid mixed/overall-level mismatches in this tab
    const level = levelFrom75(scores.overall) || displayLevel(data?.level);

    // Extract answers from either answers array or sections structure
    const extractWritingAnswers = () => {
      const sections = Array.isArray(writing?.sections) ? writing.sections : [];
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

          sortedSubParts.forEach((subPart: any, subPartIndex: number) => {
            const subPartAnswers = Array.isArray(subPart.answers) ? subPart.answers : [];
            subPartAnswers.forEach((ans: any) => {
              extracted.push({
                ...ans,
                questionText:
                  ans.questionText ||
                  ans.question ||
                  subPart.description ||
                  section.description ||
                  `Görev 1.${subPartIndex + 1}`,
              });
            });
          });

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

      if (writing?.answers && Array.isArray(writing.answers) && writing.answers.length > 0) {
        return writing.answers;
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
        answer?.taskKey ?? answer?.task_key ?? answer?.sectionKey ?? "",
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

    const hasMeaningfulAnswer = (answer?: any) => {
      if (!answer || typeof answer !== "object") return false;
      const value = typeof answer.userAnswer === "string" ? answer.userAnswer.trim() : "";
      return value.length > 0 && value !== "Cevap verilmedi";
    };

    const pickBestAnswer = (group: any[]) =>
      group.find((ans: any) => hasMeaningfulAnswer(ans)) || group[0];

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
    const task1Answers = [pickBestAnswer(task11Answers), pickBestAnswer(task12Answers)];
    const task2Answers = groupedAnswers.bolum_2;

    const answeredTask11 = hasMeaningfulAnswer(task1Answers[0]);
    const answeredTask12 = hasMeaningfulAnswer(task1Answers[1]);
    const answeredTask2 = task2Answers.some((a: any) => hasMeaningfulAnswer(a));
    const answeredTaskCount = [answeredTask11, answeredTask12, answeredTask2].filter(Boolean).length;

    const sanitizeWritingGeneralFeedback = (rawText: string) => {
      if (!rawText || typeof rawText !== "string") return "";
      let text = sanitizeNarrativeArtifacts(cleanBullets(rawText));

      if (answeredTask11) {
        text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*1(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }
      if (answeredTask12) {
        text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }
      if (answeredTask2) {
        text = text.replace(/(?:bölüm|görev)\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }

      if (answeredTaskCount >= 3) {
        text = text
          .replace(/Üçüncü bölümde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/3\.\s*bölümde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/üçüncü görevde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/3\.\s*görevde[^.?!]*[.?!]?\s*/gi, " ");
      }

      if (answeredTaskCount >= 3) {
        text = text
          .replace(/\bverilen iki bölümde\b/gi, "verilen üç görevde")
          .replace(/\biki bölümde\b/gi, "üç görevde");
      }

      if (level) {
        const levelUpper = level.toUpperCase();
        const mentionedLevels = (text.match(/\b(?:A1|A2|B1|B2|C1|C2)\b/gi) || []).map((l) => l.toUpperCase());
        const isCompatible = mentionedLevels.some((l) => levelUpper.includes(l));
        if (!isCompatible && mentionedLevels.length > 0) {
          text = text
            .replace(/\b(?:A1|A2|B1|B2|C1|C2)\s*(?:ile|ve|-)\s*(?:A1|A2|B1|B2|C1|C2)\s*arasında\b/gi, level)
            .replace(/\b(?:A1|A2|B1|B2|C1|C2)\s*düzey(?:inde|i)?\b/gi, `${level} düzeyinde`);
        }
      }

      return sanitizeNarrativeArtifacts(text.replace(/\s{2,}/g, " ").trim());
    };
    
    // Get current question and answer based on active task
    const getCurrentQuestionAndAnswer = () => {
      if (activeTask === "task1") {
        const answerIndex = activeTask1Part === "part1" ? 0 : 1;
        const currentAnswer = task1Answers[answerIndex];
        const userAnswer = currentAnswer?.userAnswer;

        // Get feedback for the specific part
        const feedbackKey = activeTask1Part === "part1" ? "part1_1" : "part1_2";
        let feedback: string;

        // Use parsed feedback if available, otherwise fall back to original logic
        if (parsedFeedback?.[feedbackKey]) {
          feedback = parsedFeedback[feedbackKey];
        } else if (typeof aiFeedback === 'string') {
          feedback = extractFeedbackSection(aiFeedback, feedbackKey);
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          feedback = aiFeedback[feedbackKey] ||
                    `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} geri bildirimi burada gösterilecek`;
        } else {
          feedback = `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} geri bildirimi burada gösterilecek`;
        }

        // Get description for 1.1 and 1.2
        const description = (currentAnswer as any)?.section?.description;

        return {
          question: (currentAnswer as any)?.questionText || `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} Sorusu`,
          answer: (userAnswer && typeof userAnswer === 'string' && userAnswer.trim() !== "") ? userAnswer : "Cevap verilmedi",
          comment: feedback,
          description: description
        };
      } else {
        // Find the Task 2 answer that has a non-empty userAnswer
        const task2AnswerWithContent = task2Answers.find((ans: any) => 
          ans?.userAnswer && typeof ans.userAnswer === 'string' && ans.userAnswer.trim() !== ""
        ) || task2Answers[0]; // Fallback to first if none found
        
        const userAnswer = task2AnswerWithContent?.userAnswer;
        
        // Get feedback for Task 2
        let feedback: string;
        
        // Use parsed feedback if available, otherwise fall back to original logic
        if (parsedFeedback?.part2) {
          feedback = parsedFeedback.part2;
        } else if (typeof aiFeedback === 'string') {
          feedback = extractFeedbackSection(aiFeedback, 'part2');
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          feedback = aiFeedback?.part2 || "Görev 2 geri bildirimi burada gösterilecek";
        } else {
          feedback = "Görev 2 geri bildirimi burada gösterilecek";
        }
        
        return {
          question: (task2AnswerWithContent as any)?.questionText || "Görev 2 Sorusu",
          answer: (userAnswer && typeof userAnswer === 'string' && userAnswer.trim() !== "") ? userAnswer : "Cevap verilmedi",
          comment: feedback,
          description: null
        };
      }
    };

    const currentData = getCurrentQuestionAndAnswer();
    const activeWritingLabel =
      activeTask === "task1"
        ? `Görev 1.${activeTask1Part === "part1" ? "1" : "2"}`
        : "Görev 2";
    const showLegacyWritingBlocks = !aiFeedback;

    return (
      <div className="w-full">
        <div className="w-full">
          {/* Header Section */}
          <WritingDeepReview
            aiFeedback={aiFeedback}
            answers={answers}
            sections={(writing as any).sections}
            score={scores.overall}
            className="mb-6 sm:mb-8"
          />

          {showLegacyWritingBlocks && (
            <>
          {/* Task Navigation - Simplified Design */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4 sm:mb-6">
              Yazma Görevleri
            </h3>

          {/* All Tasks - Mobile friendly layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Task 1.1 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part1");
              }}
              variant="outline"
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part1"
                  ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 1.1</div>
                <div className="text-xs opacity-75">Bölüm 1</div>
              </div>
            </Button>

            {/* Task 1.2 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part2");
              }}
              variant="outline"
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part2"
                  ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 1.2</div>
                <div className="text-xs opacity-75">Bölüm 1</div>
              </div>
            </Button>

            {/* Task 2 */}
            <Button
              onClick={() => setActiveTask("task2")}
              variant="outline"
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task2"
                  ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 2</div>
                <div className="text-xs opacity-75">Bölüm 2</div>
              </div>
            </Button>
          </div>
          </div>

          {/* Yazma Kriterleri - Konuşma düzenine benzer, yazmaya özel */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
                {activeWritingLabel}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Tutarlılık ve Bağlılık</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.coherence)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Dil Bilgisi</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.grammar)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Kelime Kaynağı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.lexical)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Görev Başarısı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.achievement)}
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections - Simplified */}
          <div className="space-y-6">
            {/* Question Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Soru</h2>
              <div className="space-y-4">
                {/* Render description above question text for 1.1 and 1.2 */}
                {currentData.description && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Görev Açıklaması:</h4>
                    <p className="text-gray-700 whitespace-pre-line">{currentData.description}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{normalizeDisplayText(currentData.question)}</p>
                </div>
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Cevabınız</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{normalizeDisplayText(currentData.answer)}</p>
              </div>
            </div>

            {/* GENEL DEĞERLENDİRME Section */}
            {(() => {
              const rawGeneralFeedback = parsedFeedback?.general || extractFeedbackSection(aiFeedback, "general");
              const generalFeedback = sanitizeWritingGeneralFeedback(rawGeneralFeedback);
              if (!generalFeedback && !structuredGeneralFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Genel Değerlendirme</h2>
                  {structuredGeneralFeedback ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {structuredGeneralFeedback.ozet && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Özet</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {normalizeDisplayText(structuredGeneralFeedback.ozet)}
                          </p>
                        </div>
                      )}

                      {structuredGeneralFeedback.tekrar_eden_eksikler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Tekrar Eden Eksikler</h4>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {structuredGeneralFeedback.tekrar_eden_eksikler.map((item, idx) => (
                              <li key={`overall-eksik-${idx}`}>{normalizeDisplayText(item)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredGeneralFeedback.alinti_duzeltme.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-2">İyileştirmeler</h4>
                          <div className="space-y-3">
                            {structuredGeneralFeedback.alinti_duzeltme.map((item, idx) => (
                              <div
                                key={`overall-rewrite-${idx}`}
                                className="rounded-lg border border-gray-200 bg-gray-100 p-3"
                              >
                                {item.alinti && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Alıntı</p>
                                    <p className="text-red-600 font-medium whitespace-pre-wrap mb-2">
                                      "{normalizeDisplayText(item.alinti)}"
                                    </p>
                                  </>
                                )}
                                {item.duzeltilmis && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Düzeltilmiş Versiyon</p>
                                    <p className="text-green-700 whitespace-pre-wrap mb-2">
                                      {normalizeDisplayText(item.duzeltilmis)}
                                    </p>
                                  </>
                                )}
                                {item.neden && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Neden Düzelttik?</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">
                                      {normalizeDisplayText(item.neden)}
                                    </p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.egzersizler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Önerilen Egzersizler</h4>
                          <div className="space-y-2">
                            {structuredGeneralFeedback.egzersizler.map((item, idx) => (
                              <div
                                key={`overall-exercise-${idx}`}
                                className="rounded-md border border-gray-200 bg-white p-3"
                              >
                                <p className="font-semibold text-black">
                                  {idx + 1}. {normalizeDisplayText(item.baslik || "Egzersiz")}
                                </p>
                                {item.uygulama && (
                                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                                    {normalizeDisplayText(item.uygulama)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.kapanis && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Son Not</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {normalizeDisplayText(structuredGeneralFeedback.kapanis)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {normalizeFeedbackText(generalFeedback)}
                      </p>
                    </div>
              )}
                </div>
              );
            })()}
          </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSpeakingResults = () => {
    if (!data?.speaking) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Konuşma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const { speaking } = data;
    if (speakingEvaluationView.kind !== "completed") {
      const isPending = speakingEvaluationView.kind === "pending";
      if (isPending) {
        return (
          <section
            data-speaking-evaluation-pending="true"
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex min-h-[190px] items-center justify-center rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-8 text-center shadow-[var(--tm-shadow-card)] animate-in fade-in duration-300"
          >
            <div className="max-w-md">
              <Loader2
                aria-hidden="true"
                strokeWidth={1.75}
                className="mx-auto h-7 w-7 animate-spin text-[var(--tm-cat-speaking-fg)] motion-reduce:animate-none"
              />
              <h2 className="mt-4 text-[17px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                {speakingEvaluationView.title}
              </h2>
              <p className="mt-1 text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                {speakingEvaluationView.description}
              </p>
            </div>
          </section>
        );
      }

      return (
        <section
          data-speaking-evaluation-failed="true"
          role="alert"
          aria-live="polite"
          className="rounded-[8px] border border-[#e4c9c9] bg-[#fffafa] px-5 py-6 shadow-[var(--tm-shadow-card)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--tm-text-primary)]">
                {speakingEvaluationView.title}
              </h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                {speakingEvaluationView.description}
              </p>
              {speakingRetryRefreshError && (
                <p
                  role="alert"
                  className="mt-2 text-[13px] leading-5 text-[#9f3f3f]"
                >
                  {speakingRetryRefreshError}
                </p>
              )}
              <p className="mt-2 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
                Tekrar değerlendirme de tamamlanmazsa{" "}
                <a
                  href="https://t.me/turkishmock_admin"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--tm-text-primary)] underline decoration-[var(--tm-border-default)] underline-offset-4 hover:decoration-[var(--tm-text-primary)]"
                >
                  Telegram üzerinden destek alın
                </a>
                .
              </p>
            </div>
            {canRetrySpeakingFeedback && (
              <Button
                type="button"
                variant="outline"
                disabled={retryingSpeakingFeedback}
                onClick={retrySpeakingFeedback}
                className="h-10 shrink-0 rounded-[7px] border-[var(--tm-border-default)] bg-white px-3 text-[13px] font-semibold text-[var(--tm-text-primary)] hover:bg-[#f5f5f3]"
              >
                {retryingSpeakingFeedback ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Yeniden değerlendir
              </Button>
            )}
          </div>
        </section>
      );
    }
    const rawSpeakingAiFeedback =
      (speaking as any)?.aiFeedback ??
      (speaking as any)?.ai_feedback ??
      (speaking as any)?.feedback ??
      (speaking as any)?.assessment ??
      null;

    const aiFeedback: any = resolveSpeakingResultFeedback(rawSpeakingAiFeedback);
    const canonicalAssessment =
      aiFeedback?.assessmentVersion === "speaking-canonical-v1"
        ? aiFeedback
        : null;
    
    // Helper function to remove bullet symbols from text
    const normalizeQuestionRefs = (text: string): string =>
      text
        .replace(/\bQ\s*([0-9]{1,2})\s*['’`]?\s*(de|da|te|ta)\b/gi, (_m, n) => `${n}. soruda`)
        .replace(/\bQ\s*([0-9]{1,2})\b/gi, (_m, n) => `${n}. soru`);

    const removeBullets = (text: string): string => {
      if (!text) return text;
      // Remove bullet symbols (•, , etc.) and clean up whitespace
      return normalizeFeedbackText(
        normalizeQuestionRefs(
          text
            .replace(/[•\u2022\u25E6\uF0B7]/g, '') // Remove various bullet symbols
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(),
        ),
      );
    };

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return sanitizeSpeakingLearnerCopy(
        sanitizeNarrativeArtifacts(
          removeBullets(
            text
              .replace(/\[[^\]]+\]/g, " ")
              .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
              .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
              .replace(
                /AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi,
                " ",
              )
              .replace(/GENEL DEĞERLENDİRME\s*:/gi, " "),
          ),
        ),
      );
    };

    type StructuredGeneralFeedback = {
      ozet: string;
      tekrar_eden_eksikler: string[];
      alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
      egzersizler: Array<{ baslik: string; uygulama: string }>;
      kapanis: string;
    };

    const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
      const raw =
        (aiFeedback as any)?.generalStructured ??
        (aiFeedback as any)?.general_structured ??
        (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;

      if (!raw || typeof raw !== "object") return null;
      const src: any = raw;
      const clean = (value: any) =>
        sanitizeSpeakingLearnerCopy(
          removeBullets(typeof value === "string" ? value : ""),
        );

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
      };

      const hasContent =
        structured.ozet ||
        structured.kapanis ||
        structured.tekrar_eden_eksikler.length > 0 ||
        structured.alinti_duzeltme.length > 0 ||
        structured.egzersizler.length > 0;

      return hasContent ? structured : null;
    };

    const structuredGeneralFeedback = extractStructuredGeneralFeedback();
    
    // Helper function to extract feedback sections from string format
    const extractFeedbackSection = (feedbackSource: any, sectionName: string): string => {
      if (!feedbackSource) {
        return "";
      }

      if (typeof feedbackSource === "object") {
        const feedbackObj: any = feedbackSource;
        const bolumler =
          feedbackObj?.bolumler ??
          feedbackObj?.["bölümler"] ??
          feedbackObj?.sections ??
          feedbackObj?.parts ??
          {};

        const getSectionNarrative = (section: any): string | undefined => {
          if (!section || typeof section !== "object") return undefined;
          const candidate =
            section?.degerlendirme ??
            section?.["değerlendirme"] ??
            section?.feedback ??
            section?.yorum ??
            section?.analysis;
          return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
        };

        if (sectionName === "general") {
          const directGeneral =
            feedbackObj?.genel_degerlendirme ??
            feedbackObj?.genelDegerlendirme ??
            feedbackObj?.general ??
            feedbackObj?.generalFeedback ??
            feedbackObj?.summary ??
            feedbackObj?.teacherNote ??
            feedbackObj?.teacher_note;
          if (typeof directGeneral === "string" && directGeneral.trim()) {
            return sanitizeGeneralFeedback(directGeneral.trim());
          }
          return `Geri bildirim mevcut değil`;
        }

        if (sectionName === "part1") {
          const part1_1 = getSectionNarrative(bolumler?.bolum_1_1 ?? bolumler?.["bölüm_1_1"]);
          const part1_2 = getSectionNarrative(bolumler?.bolum_1_2 ?? bolumler?.["bölüm_1_2"]);
          const merged = [part1_1, part1_2].filter(Boolean).join(" ");
          if (merged) {
            return sanitizeSpeakingLearnerCopy(removeBullets(merged));
          }
        }

        const objectFallback =
          sectionName === "part2"
            ? getSectionNarrative(bolumler?.bolum_2 ?? bolumler?.["bölüm_2"])
            : sectionName === "part3"
              ? getSectionNarrative(bolumler?.bolum_3 ?? bolumler?.["bölüm_3"])
              : feedbackObj?.[sectionName];

        if (typeof objectFallback === "string" && objectFallback.trim()) {
          return sanitizeSpeakingLearnerCopy(
            removeBullets(objectFallback.trim()),
          );
        }
      }

      if (typeof feedbackSource !== "string") {
        return "";
      }

      // Try to extract specific section from string format
      const feedbackText = feedbackSource;
      const sectionPatterns: Record<string, RegExp> = {
        part1: /\[BÖLÜM 1 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 2|\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        part2: /\[BÖLÜM 2 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        part3: /\[BÖLÜM 3 ANALİZİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        general: /GENEL DEĞERLENDİRME:([\s\S]*?)(?=$)/i,
      };

      const pattern = sectionPatterns[sectionName];
      if (pattern) {
        const match = feedbackText.match(pattern);
        if (match && match[1]) {
          if (sectionName === "general") {
            return sanitizeGeneralFeedback(match[1].trim());
          }
          return sanitizeSpeakingLearnerCopy(
            removeBullets(match[1].trim()),
          );
        }
      }

      if (sectionName === "general") {
        return sanitizeGeneralFeedback(feedbackText);
      }
      if (sectionName === "taskAchievement") {
        return sanitizeSpeakingLearnerCopy(removeBullets(feedbackText));
      }

      return "";
    };

    // Extract scores from AI feedback or use defaults
    const extractScoreFromFeedback = (feedbackText: string) => {
      const match = feedbackText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const scores = {
      overall: canonicalAssessment?.standardScore ?? speaking?.score ?? null,
      coherence: extractScoreFromFeedback(aiFeedback?.coherenceAndCohesion) || 0,
      grammar: extractScoreFromFeedback(aiFeedback?.grammaticalRangeAndAccuracy) || 0,
      lexical: extractScoreFromFeedback(aiFeedback?.lexicalResource) || 0,
      achievement: extractScoreFromFeedback(aiFeedback?.taskAchievement) || 0,
    };
    const speakingDisplay = resolveOfficialSpeakingDisplay(
      speaking?.evaluationStatus ?? aiFeedback?.evaluationStatus,
      scores.overall,
      canonicalAssessment?.cefrLevel ?? aiFeedback?.seviye ?? data?.level,
    );

    type SpeakingAnswerItem = {
      questionId: string | null;
      questionText: string;
      userAnswer: string;
      questionOrder?: number;
      partKey?: SpeakingResultPartKey;
      audio?: SpeakingAudioMeta;
      visuals?: string[];
      visualContext?: "question" | "combined-prompt";
    };

    const extractNumericOrder = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const direct = Number(trimmed);
        if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
        const fromText = trimmed.match(/(?:Soru|Question|Q)\s*#?\s*(\d{1,2})/i)?.[1];
        if (fromText) {
          const parsed = Number(fromText);
          if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
        }
      }
      return undefined;
    };

    const pickFirstNonEmptyText = (...values: unknown[]): string => {
      for (const value of values) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
          continue;
        }
        if (value && typeof value === "object") {
          const nested = value as any;
          const nestedText = [
            nested?.text,
            nested?.userAnswer,
            nested?.answer,
            nested?.transcript,
            nested?.content,
            nested?.response,
          ].find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
          if (typeof nestedText === "string") return nestedText.trim();
        }
      }
      return "";
    };

    const normalizeAudioMeta = (answer: any): SpeakingAudioMeta | undefined => {
      const candidate =
        answer?.audio && typeof answer.audio === "object"
          ? answer.audio
          : Array.isArray(answer?.audios) && answer.audios[0]
            ? answer.audios[0]
            : answer;
      const audioId =
        typeof candidate?.audioId === "string" && candidate.audioId.trim()
          ? candidate.audioId.trim()
          : typeof candidate?.id === "string" && candidate?.hasAudio
            ? candidate.id.trim()
            : "";
      if (!audioId) return undefined;
      return {
        audioId,
        hasAudio: candidate?.hasAudio !== false,
        mimeType: typeof candidate?.mimeType === "string" ? candidate.mimeType : null,
        sizeBytes: typeof candidate?.sizeBytes === "number" ? candidate.sizeBytes : null,
        durationSeconds:
          typeof candidate?.durationSeconds === "number" ? candidate.durationSeconds : null,
        retentionUntil:
          typeof candidate?.retentionUntil === "string" ? candidate.retentionUntil : null,
        sectionKey:
          typeof candidate?.sectionKey === "string" ? candidate.sectionKey : null,
        speechEvidence: normalizeSpeakingSpeechEvidence(candidate?.speechEvidence),
      };
    };

    const hasAudioMeta = (item?: { audio?: SpeakingAudioMeta }) =>
      Boolean(item?.audio?.hasAudio && item.audio.audioId);

    const toAnswerItem = (
      question: any,
      fallbackText: string,
      fallbackOrder?: number,
      visualRefs?: unknown,
      visualContext: "question" | "combined-prompt" = "question",
    ): SpeakingAnswerItem => ({
      questionId:
        (typeof question?.questionId === "string" && question.questionId) ||
        (typeof question?.questionId === "number" && String(question.questionId)) ||
        (typeof question?.id === "string" && question.id) ||
        (typeof question?.id === "number" && String(question.id)) ||
        (typeof question?.question?.id === "string" && question.question.id) ||
        (typeof question?.question?.id === "number" && String(question.question.id)) ||
        null,
      questionText: pickFirstNonEmptyText(
        question?.questionText,
        question?.question?.questionText,
        question?.question?.text,
        question?.prompt,
        typeof question?.question === "string" ? question.question : "",
        typeof question?.text === "string" ? question.text : "",
        fallbackText
      ),
      userAnswer: pickFirstNonEmptyText(
        question?.userAnswer,
        question?.answer,
        question?.text,
        question?.transcript,
        question?.content,
        question?.response,
        question?.answerText
      ),
      questionOrder:
        extractNumericOrder(question?.questionOrder) ??
        extractNumericOrder(question?.order) ??
        extractNumericOrder(question?.question?.order) ??
        extractNumericOrder(question?.questionNumber) ??
        extractNumericOrder(question?.questionText) ??
        extractNumericOrder(question?.question) ??
        fallbackOrder,
      partKey: ["bolum_1_1", "bolum_1_2", "bolum_2", "bolum_3"].includes(
        String(question?.sectionKey || question?.audio?.sectionKey || ""),
      )
        ? (String(
            question?.sectionKey || question?.audio?.sectionKey,
          ) as SpeakingResultPartKey)
        : undefined,
      audio: normalizeAudioMeta(question),
      visuals: Array.isArray(visualRefs)
        ? visualRefs.filter(
            (visual): visual is string =>
              typeof visual === "string" && Boolean(visual.trim()),
          )
        : undefined,
      visualContext,
    });

    const splitAnswersByOrder = (items: SpeakingAnswerItem[]) => {
      const canonicalItems = items.filter((item) => item.partKey);
      if (canonicalItems.length === 0) {
        const grouped = regroupSpeakingAnswersByExpectedLayout(items);
        return [
          grouped.bolum_1_1,
          grouped.bolum_1_2,
          grouped.bolum_2,
          grouped.bolum_3,
        ] as [
          SpeakingAnswerItem[],
          SpeakingAnswerItem[],
          SpeakingAnswerItem[],
          SpeakingAnswerItem[],
        ];
      }
      const groups: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] = [
        [],
        [],
        [],
        [],
      ];
      const unresolved: SpeakingAnswerItem[] = [];

      items.forEach((item) => {
        if (item.partKey) {
          const partIndex = [
            "bolum_1_1",
            "bolum_1_2",
            "bolum_2",
            "bolum_3",
          ].indexOf(item.partKey);
          groups[partIndex].push(item);
          return;
        }
        const order = extractNumericOrder(item.questionOrder);
        if (!order) {
          unresolved.push(item);
          return;
        }
        if (order <= 3) groups[0].push(item);
        else if (order <= 6) groups[1].push(item);
        else if (order === 7) groups[2].push(item);
        else groups[3].push(item);
      });

      unresolved.forEach((item) => {
        if (groups[0].length < 3) groups[0].push(item);
        else if (groups[1].length < 3) groups[1].push(item);
        else if (groups[2].length < 1) groups[2].push(item);
        else groups[3].push(item);
      });

      return groups;
    };

    const isMeaningfulSpeakingAnswer = (value?: string) => {
      const text = String(value || "").trim();
      if (!text) return false;
      const normalized = text
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s[\]]/gu, "")
        .trim();
      if (!normalized) return false;
      if (normalized.includes("cevap bulunamad")) return false;
      if (normalized === "yanit yok" || normalized === "yanıt yok") return false;
      if (normalized === "[cevap bulunamadi]" || normalized === "[cevap bulunamadı]") return false;
      return true;
    };

    const countMeaningfulAnswers = (groups: SpeakingAnswerItem[][]) =>
      groups
        .flat()
        .filter((item) => isMeaningfulSpeakingAnswer(item.userAnswer)).length;

    const emptySpeakingParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => [
      [],
      [],
      [],
      [],
    ];

    const collectQuestionCatalog = () => {
      const byId = new Map<string, { questionText: string; questionOrder?: number }>();
      const seen = new WeakSet<object>();

      const remember = (candidate: any) => {
        const normalized = toAnswerItem(candidate, "");
        if (!normalized.questionId) return;
        const existing = byId.get(normalized.questionId);
        const nextText = pickFirstNonEmptyText(
          normalized.questionText,
          existing?.questionText,
          `Soru ${byId.size + 1}`
        );
        byId.set(normalized.questionId, {
          questionText: nextText,
          questionOrder: normalized.questionOrder ?? existing?.questionOrder,
        });
      };

      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== "object") return;
        if (seen.has(node)) return;
        seen.add(node);

        remember(node);
        walk((node as any).questions);
        walk((node as any).subParts);
        walk((node as any).sections);
        walk((node as any).parts);
        walk((node as any).answers);
      };

      walk(speaking);
      return byId;
    };

    const extractSessionSpeakingAnswers = (): SpeakingAnswerItem[] => {
      try {
        const questionCatalog = collectQuestionCatalog();
        const speakingTestId = pickFirstNonEmptyText(
          (speaking as any)?.speakingTestId,
          (speaking as any)?.test?.id,
          (speaking as any)?.testId
        );

        const prioritizedKeys = [
          speakingTestId ? `speaking_answers_${speakingTestId}` : "",
          params.overallId ? `speaking_answers_${params.overallId}` : "",
        ].filter(Boolean);
        const allSpeakingKeys = speakingTestId
          ? []
          : Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
        const candidateKeys = Array.from(new Set([...prioritizedKeys, ...allSpeakingKeys]));
        if (candidateKeys.length === 0) return [];

        const byQuestionId = new Map<string, SpeakingAnswerItem>();
        const upsert = (questionIdRaw: unknown, rawValue: unknown) => {
          const questionId = String(questionIdRaw ?? "").trim();
          if (!questionId) return;

          const answerText = pickFirstNonEmptyText(
            rawValue,
            (rawValue as any)?.userAnswer,
            (rawValue as any)?.answer,
            (rawValue as any)?.text,
            (rawValue as any)?.transcript,
            (rawValue as any)?.content,
            (rawValue as any)?.response
          );
          if (!isMeaningfulSpeakingAnswer(answerText)) return;

          const fromCatalog = questionCatalog.get(questionId);
          const normalized = toAnswerItem(
            {
              questionId,
              questionText: fromCatalog?.questionText || "",
              userAnswer: answerText,
              questionOrder: fromCatalog?.questionOrder,
            },
            fromCatalog?.questionText || `Soru ${byQuestionId.size + 1}`,
            fromCatalog?.questionOrder
          );

          const existing = byQuestionId.get(questionId);
          if (!existing || normalized.userAnswer.length >= existing.userAnswer.length) {
            byQuestionId.set(questionId, normalized);
          }
        };

        candidateKeys.forEach((key) => {
          const raw = sessionStorage.getItem(key);
          if (!raw) return;

          try {
            const parsed = JSON.parse(raw);
            const parsedTestId = pickFirstNonEmptyText(parsed?.testId);
            if (speakingTestId && parsedTestId && parsedTestId !== speakingTestId) {
              return;
            }

            if (parsed?.transcripts && typeof parsed.transcripts === "object") {
              Object.entries(parsed.transcripts).forEach(([qid, value]) => {
                upsert(qid, value);
              });
            }

            if (Array.isArray(parsed?.answers)) {
              parsed.answers.forEach((item: any) => {
                upsert(item?.questionId ?? item?.id, item);
              });
            } else if (parsed?.answers && typeof parsed.answers === "object") {
              Object.entries(parsed.answers).forEach(([qid, value]) => {
                upsert(qid, value);
              });
            }
          } catch {
            // Ignore corrupted session data and continue with other keys.
          }
        });

        return Array.from(byQuestionId.values()).sort(
          (a, b) => (a.questionOrder || 0) - (b.questionOrder || 0)
        );
      } catch {
        return [];
      }
    };

    const buildSessionParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const sessionAnswers = readLegacySpeakingSessionFallback(
        aiFeedback,
        extractSessionSpeakingAnswers,
      );
      if (sessionAnswers.length === 0) return emptySpeakingParts();
      const grouped = splitAnswersByOrder(sessionAnswers);
      const hasAny = grouped.some((group) => group.length > 0);
      return hasAny ? grouped : [sessionAnswers, [], [], []];
    };

    const extractQuestionsFromPart = (
      part: any,
      visualContext: "question" | "combined-prompt" = "question",
    ): SpeakingAnswerItem[] => {
      const collected: SpeakingAnswerItem[] = [];
      if (!part || typeof part !== "object") return collected;

      let sequence = 1;
      const pushWithOrder = (question: any, visualRefs?: unknown) => {
        collected.push(
          toAnswerItem(
            question,
            `Soru ${collected.length + 1}`,
            sequence,
            visualRefs,
            visualContext,
          ),
        );
        sequence += 1;
      };

      const sections = Array.isArray(part.sections) ? part.sections : [];
      sections.forEach((section: any) => {
        const directQuestions = Array.isArray(section?.questions)
          ? section.questions
          : [];
        directQuestions.forEach((q: any) => {
          pushWithOrder(q, section?.images);
        });

        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        subParts.forEach((subPart: any) => {
          const subQuestions = Array.isArray(subPart?.questions)
            ? subPart.questions
            : [];
          subQuestions.forEach((q: any) => {
            pushWithOrder(q, subPart?.images);
          });
        });
      });

      const topLevelSubParts = Array.isArray(part.subParts) ? part.subParts : [];
      topLevelSubParts.forEach((subPart: any) => {
        const subQuestions = Array.isArray(subPart?.questions) ? subPart.questions : [];
        subQuestions.forEach((q: any) => {
          pushWithOrder(q, subPart?.images);
        });
      });

      const partQuestions = Array.isArray(part.questions) ? part.questions : [];
      partQuestions.forEach((q: any) => {
        pushWithOrder(q, part?.images);
      });

      return collected;
    };

    const buildPartsFromBackend = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const part11: SpeakingAnswerItem[] = [];
      const part12: SpeakingAnswerItem[] = [];
      const dedupeByQuestionId = (items: SpeakingAnswerItem[]) => {
        const byId = new Map<string, SpeakingAnswerItem>();
        const withoutId: SpeakingAnswerItem[] = [];

        items.forEach((item) => {
          const qid = String(item?.questionId || "").trim();
          if (!qid) {
            withoutId.push(item);
            return;
          }

          const existing = byId.get(qid);
          if (!existing) {
            byId.set(qid, item);
            return;
          }

          const existingAnswer = String(existing.userAnswer || "").trim();
          const nextAnswer = String(item.userAnswer || "").trim();
          const shouldReplace =
            isMeaningfulSpeakingAnswer(nextAnswer) &&
            (!isMeaningfulSpeakingAnswer(existingAnswer) || nextAnswer.length >= existingAnswer.length);
          if (shouldReplace) {
            byId.set(qid, item);
          }
        });

        return [...Array.from(byId.values()), ...withoutId];
      };
      const resolvePart1BucketFromHint = (node: any): 0 | 1 | undefined => {
        const hint = String(
          [node?.label, node?.title, node?.description].filter(Boolean).join(" ")
        )
          .toLocaleLowerCase("tr-TR")
          .replace(/\s+/g, " ")
          .trim();

        if (!hint) return undefined;
        const isPart12 = /(?:^|[^0-9])1[.\s_-]?2(?:[^0-9]|$)/.test(hint);
        const isPart11 = /(?:^|[^0-9])1[.\s_-]?1(?:[^0-9]|$)/.test(hint);
        if (isPart12 && !isPart11) return 1;
        if (isPart11 && !isPart12) return 0;
        return undefined;
      };

      const appendSplitPart1 = (items: SpeakingAnswerItem[]) => {
        if (!items || items.length === 0) return;
        const [group11, group12] = splitAnswersByOrder(items);
        part11.push(...group11);
        part12.push(...group12);
      };

      const addPart1FromSubParts = (subParts: any[]) => {
        if (!Array.isArray(subParts) || subParts.length === 0) return;

        if (subParts.length >= 2) {
          subParts.forEach((subPart: any, index: number) => {
            const hintedBucket = resolvePart1BucketFromHint(subPart);
            const bucket = hintedBucket ?? (index === 0 ? 0 : 1);
            const collected = extractQuestionsFromPart(subPart);
            if (bucket === 0) part11.push(...collected);
            else part12.push(...collected);
          });
          return;
        }

        const singleSubPart = subParts[0];
        const singleCollected = extractQuestionsFromPart(singleSubPart);
        const hintedBucket = resolvePart1BucketFromHint(singleSubPart);
        if (hintedBucket === 0) {
          part11.push(...singleCollected);
          return;
        }
        if (hintedBucket === 1) {
          part12.push(...singleCollected);
          return;
        }

        // Unknown hint: keep 1.1/1.2 balanced instead of sending all to 1.1.
        if (part11.length <= part12.length) {
          part11.push(...singleCollected);
        } else {
          part12.push(...singleCollected);
        }
      };

      const part1Sections = Array.isArray(speaking?.part1?.sections)
        ? speaking.part1.sections
        : [];
      part1Sections.forEach((section: any) => {
        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        addPart1FromSubParts(subParts);

        const directQuestions = Array.isArray(section?.questions)
          ? section.questions
          : [];
        if (subParts.length === 0 && directQuestions.length > 0) {
          appendSplitPart1(
            directQuestions.map((q: any, index: number) =>
              toAnswerItem(
                q,
                `Soru ${part11.length + part12.length + index + 1}`,
                undefined,
                section?.images,
              )
            )
          );
        }
      });

      if (part11.length === 0 && part12.length === 0 && speaking?.part1) {
        const topLevelSubParts = Array.isArray((speaking as any)?.part1?.subParts)
          ? (speaking as any).part1.subParts
          : [];
        addPart1FromSubParts(topLevelSubParts);

        const topLevelQuestions = Array.isArray((speaking as any)?.part1?.questions)
          ? (speaking as any).part1.questions
          : [];
        if (topLevelSubParts.length === 0 && topLevelQuestions.length > 0) {
          appendSplitPart1(
            topLevelQuestions.map((q: any, index: number) =>
              toAnswerItem(
                q,
                `Soru ${part11.length + part12.length + index + 1}`,
                undefined,
                (speaking as any)?.part1?.images,
              )
            )
          );
        }
      }

      const part2 = extractQuestionsFromPart(
        speaking?.part2,
        "combined-prompt",
      );
      const part3 = extractQuestionsFromPart(speaking?.part3);

      if (
        part11.length === 0 &&
        part12.length === 0 &&
        part2.length === 0 &&
        part3.length === 0
      ) {
        const structuredParts = Array.isArray((speaking as any)?.parts)
          ? (speaking as any).parts
          : Array.isArray((speaking as any)?.sections)
            ? (speaking as any).sections
            : [];

        if (structuredParts.length > 0) {
          const firstPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART1")
            ) || structuredParts[0];
          const secondPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART2")
            ) || structuredParts[1];
          const thirdPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART3")
            ) || structuredParts[2];

          const firstSubParts = Array.isArray(firstPart?.subParts) ? firstPart.subParts : [];
          if (firstSubParts.length > 0) {
            addPart1FromSubParts(firstSubParts);
          } else {
            const firstCollected = extractQuestionsFromPart(firstPart);
            appendSplitPart1(firstCollected);
          }

          part2.push(...extractQuestionsFromPart(secondPart));
          part3.push(...extractQuestionsFromPart(thirdPart));

          const trailingParts = structuredParts.filter(
            (part: any) => part !== firstPart && part !== secondPart && part !== thirdPart
          );
          trailingParts.forEach((part: any) => {
            part3.push(...extractQuestionsFromPart(part));
          });
        }
      }

      let normalizedPart11 = dedupeByQuestionId(part11);
      let normalizedPart12 = dedupeByQuestionId(part12);
      if (normalizedPart12.length === 0 && normalizedPart11.length > 3) {
        normalizedPart12 = normalizedPart11.slice(3);
        normalizedPart11 = normalizedPart11.slice(0, 3);
      } else {
        if (normalizedPart11.length > 3 && normalizedPart12.length < 3) {
          const needed = 3 - normalizedPart12.length;
          const overflow = normalizedPart11.slice(3, 3 + needed);
          normalizedPart12 = [...normalizedPart12, ...overflow];
        }
        normalizedPart11 = normalizedPart11.slice(0, 3);
        normalizedPart12 = normalizedPart12.slice(0, 3);
      }

      return [
        normalizedPart11,
        normalizedPart12,
        dedupeByQuestionId(part2),
        dedupeByQuestionId(part3),
      ];
    };

    const buildLegacyParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const legacyAnswers = Array.isArray((speaking as any)?.answers)
        ? (speaking as any).answers
        : Array.isArray((speaking as any)?.questions)
          ? (speaking as any).questions
          : [];
      const normalizedLegacy = legacyAnswers.map((answer: any, index: number) =>
        toAnswerItem(answer, `Soru ${index + 1}`, index + 1)
      );
      const grouped = splitAnswersByOrder(normalizedLegacy);
      const hasGroupedContent = grouped.some((group) => group.length > 0);
      return hasGroupedContent
        ? grouped
        : ([normalizedLegacy, [], [], []] as [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]]);
    };

    const collectStructuredAnswerSources = (): SpeakingAnswerItem[] => {
      const collected: SpeakingAnswerItem[] = [];
      const seen = new WeakSet<object>();

      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== "object") return;
        if (seen.has(node)) return;
        seen.add(node);

        const questions = Array.isArray((node as any).questions) ? (node as any).questions : [];
        questions.forEach((question: any, index: number) => {
          collected.push(toAnswerItem(question, `Soru ${collected.length + index + 1}`));
        });

        walk((node as any).subParts);
        walk((node as any).sections);
        walk((node as any).parts);
      };

      walk((speaking as any)?.part1);
      walk((speaking as any)?.part2);
      walk((speaking as any)?.part3);
      walk((speaking as any)?.parts);
      walk((speaking as any)?.sections);
      return collected;
    };

    const parts = (() => {
      const structured = buildPartsFromBackend();
      const legacy = buildLegacyParts();
      const sessionBased = buildSessionParts();

      const structuredTotal = structured.reduce((sum, group) => sum + group.length, 0);
      const legacyTotal = legacy.reduce((sum, group) => sum + group.length, 0);
      const sessionTotal = sessionBased.reduce((sum, group) => sum + group.length, 0);
      const legacyMeaningful = countMeaningfulAnswers(legacy);
      const sessionMeaningful = countMeaningfulAnswers(sessionBased);

      // Keep section mapping stable: prefer backend structured layout whenever present.
      let selected: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] =
        structuredTotal > 0 ? structured : legacy;

      if (structuredTotal === 0) {
        if (sessionMeaningful > legacyMeaningful) {
          selected = sessionBased;
        } else if (legacyTotal > 0) {
          selected = legacy;
        } else if (sessionTotal > 0) {
          selected = sessionBased;
        }
      }

      return selected;
    })();

    const repairSpeakingPartAnswers = (
      baseParts: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]]
    ): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const sources = [
        ...baseParts.flat(),
        ...collectStructuredAnswerSources(),
        ...buildSessionParts().flat(),
        ...buildLegacyParts().flat(),
        ...buildPartsFromBackend().flat(),
      ];

      const byQuestionId = new Map<string, string>();
      const audioByQuestionId = new Map<string, SpeakingAudioMeta>();
      const audioByPartAndOrder = new Map<string, SpeakingAudioMeta>();
      const audioByPartIndex: SpeakingAudioMeta[][] = [[], [], [], []];

      const setIfBetter = (target: Map<string, string>, key: string, value: string) => {
        const existing = target.get(key);
        if (!existing || value.length >= existing.length) {
          target.set(key, value);
        }
      };

      sources.forEach((item) => {
        const qid = String(item?.questionId || "").trim();
        if (qid && hasAudioMeta(item) && !audioByQuestionId.has(qid)) {
          audioByQuestionId.set(qid, item.audio as SpeakingAudioMeta);
        }
        const text = String(item?.userAnswer ?? "").trim();
        if (!isMeaningfulSpeakingAnswer(text)) return;

        if (qid) setIfBetter(byQuestionId, qid, text);
      });
      sources.forEach((item) => {
        if (!hasAudioMeta(item)) return;
        const order = extractNumericOrder(item?.questionOrder);
        const groupIndex =
          order && order <= 3
            ? 0
            : order && order <= 6
              ? 1
              : order === 7
                ? 2
                : order
                  ? 3
                  : -1;
        if (groupIndex < 0) return;
        const key = `${groupIndex}:${order}`;
        if (!audioByPartAndOrder.has(key)) {
          audioByPartAndOrder.set(key, item.audio as SpeakingAudioMeta);
        }
      });
      sources.forEach((item) => {
        if (!hasAudioMeta(item)) return;
        const order = extractNumericOrder(item?.questionOrder);
        const groupIndex =
          order && order <= 3
            ? 0
            : order && order <= 6
              ? 1
              : order === 7
                ? 2
                : order
                  ? 3
                  : -1;
        if (groupIndex < 0) return;
        audioByPartIndex[groupIndex].push(item.audio as SpeakingAudioMeta);
      });

      const repaired = baseParts.map((group) =>
        group.map((item, index) => {
          const existing = String(item?.userAnswer || "").trim();
          const qid = String(item?.questionId || "").trim();
          const groupIndex = baseParts.indexOf(group);
          const order = extractNumericOrder(item?.questionOrder);
          const audio =
            (hasAudioMeta(item) ? item.audio : undefined) ||
            (qid ? audioByQuestionId.get(qid) : undefined) ||
            (order ? audioByPartAndOrder.get(`${groupIndex}:${order}`) : undefined) ||
            audioByPartIndex[groupIndex]?.[index];
          if (isMeaningfulSpeakingAnswer(existing)) {
            return audio && !hasAudioMeta(item) ? { ...item, audio } : item;
          }

          if (!qid || !byQuestionId.has(qid)) return item;
          const replacement = String(byQuestionId.get(qid) || "").trim();
          if (!isMeaningfulSpeakingAnswer(replacement)) {
            return audio && !hasAudioMeta(item) ? { ...item, audio } : item;
          }
          return { ...item, userAnswer: replacement, audio };
        })
      ) as [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]];

      return repaired;
    };

    const displayParts = repairSpeakingPartAnswers(parts);

    const visiblePartEntries = displayParts
      .map((questions, index) => ({ index, questions }))
      .filter((entry) => entry.questions.length > 0);

    const effectiveActiveSpeakingPart =
      displayParts[activeSpeakingPart]?.length > 0
        ? activeSpeakingPart
        : (visiblePartEntries[0]?.index ?? 0);
    
    // Get part label based on index
    const getPartLabel = (index: number) => {
      if (index === 0) return { main: "Bölüm 1.1", sub: "Part 1.1" };
      if (index === 1) return { main: "Bölüm 1.2", sub: "Part 1.2" };
      if (index === 2) return { main: "Bölüm 2", sub: "Part 2" };
      if (index === 3) return { main: "Bölüm 3", sub: "Part 3" };
      return { main: `Bölüm ${index + 1}`, sub: `Part ${index + 1}` };
    };

    type SpeakingSectionKey = "bolum_1_1" | "bolum_1_2" | "bolum_2" | "bolum_3";

    const getSpeakingSectionKey = (partIndex: number): SpeakingSectionKey => {
      if (partIndex === 0) return "bolum_1_1";
      if (partIndex === 1) return "bolum_1_2";
      if (partIndex === 2) return "bolum_2";
      return "bolum_3";
    };

    const getSpeakingFeedbackKey = (partIndex: number): "part1" | "part2" | "part3" => {
      if (partIndex === 0 || partIndex === 1) return "part1";
      if (partIndex === 2) return "part2";
      return "part3";
    };

    const isPlaceholderText = (value?: string) => {
      if (!value || typeof value !== "string") return true;
      const normalized = value.trim().toLowerCase().replace(/\./g, "");
      return (
        normalized === "yanit yok" ||
        normalized === "yanıt yok" ||
        normalized.startsWith("yanit yok ") ||
        normalized.startsWith("yanıt yok ") ||
        normalized === "degerlendirme yok" ||
        normalized === "değerlendirme yok" ||
        normalized === "yok" ||
        normalized === "-"
      );
    };

    const pickMeaningfulText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim() && !isPlaceholderText(value)) {
          return normalizeFeedbackText(value.trim());
        }
      }
      return undefined;
    };

    const getSectionFromFeedbackObject = (sectionKey: SpeakingSectionKey) => {
      if (!aiFeedback || typeof aiFeedback !== "object") return undefined;
      const bolumler = (aiFeedback as any)?.bolumler || (aiFeedback as any)?.["bölümler"];
      const turkishKey = sectionKey.replace("bolum", "bölüm");
      return (
        bolumler?.[sectionKey] ||
        bolumler?.[turkishKey] ||
        (aiFeedback as any)?.[sectionKey] ||
        (aiFeedback as any)?.[turkishKey]
      );
    };

    const getSpeakingSectionCriteriaFromObject = (sectionKey: SpeakingSectionKey) => {
      const section = getSectionFromFeedbackObject(sectionKey);
      const criteria = section?.kriterler || section?.criteria || section;
      return {
        coherence: pickMeaningfulText(
          criteria?.coherenceAndCohesion,
          criteria?.coherence_and_cohesion,
          criteria?.tutarlilikVeBaglilik,
          criteria?.tutarlilik_ve_baglilik,
          criteria?.["Akıcılık ve Bağlılık"],
          criteria?.["Tutarlılık ve Bağlılık"]
        ),
        grammar: pickMeaningfulText(
          criteria?.grammaticalRangeAndAccuracy,
          criteria?.grammatical_range_and_accuracy,
          criteria?.dilBilgisi,
          criteria?.dil_bilgisi,
          criteria?.["Dil Bilgisi"]
        ),
        lexical: pickMeaningfulText(
          criteria?.lexicalResource,
          criteria?.lexical_resource,
          criteria?.kelimeKaynagi,
          criteria?.kelime_kaynagi,
          criteria?.["Kelime Kaynağı"]
        ),
        achievement: pickMeaningfulText(
          criteria?.taskAchievement,
          criteria?.task_achievement,
          criteria?.gorevBasarisi,
          criteria?.gorev_basarisi,
          criteria?.gorevYaniti,
          criteria?.gorev_yaniti,
          criteria?.["Görev Başarısı"],
          criteria?.["Görev Yanıtı"]
        ),
      };
    };

    const extractSpeakingCriteriaFromNarrative = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const source = removeBullets(text);
      const sentences = source
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const pickSentence = (patterns: RegExp[]) =>
        pickMeaningfulText(
          ...sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)))
        );
      return {
        coherence: pickMeaningfulText(
          source.match(/(?:Akıcılık|Akicilik|Tutarlılık|Tutarlilik)(?:\s*ve\s*(?:Bağlılık|Baglilik))?[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/akıcılık/i, /akicilik/i, /tutarl/i, /bağlılık/i, /baglilik/i, /akış/i, /akis/i])
        ),
        grammar: pickMeaningfulText(
          source.match(/Dil Bilgisi[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/dil\s*bilg/i, /gramer/i, /cümle/i, /cumle/i])
        ),
        lexical: pickMeaningfulText(
          source.match(/Kelime Kaynağı[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Kelime Kaynagi[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/kelime/i, /söz varlığı/i, /soz varligi/i, /vocabulary/i])
        ),
        achievement: pickMeaningfulText(
          source.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/(?:Gorev Basarisi|Gorev Yaniti)[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/görev/i, /gorev/i, /yanıt/i, /yanit/i, /talimat/i, /konu/i, /başarı/i, /basari/i])
        ),
      };
    };

    const getSpeakingSectionNarrative = (partIndex: number) => {
      const sectionKey = getSpeakingSectionKey(partIndex);
      const section = getSectionFromFeedbackObject(sectionKey);
      const feedbackKey = getSpeakingFeedbackKey(partIndex);
      return sanitizeSpeakingLearnerCopy(
        pickMeaningfulText(
          section?.degerlendirme,
          section?.["değerlendirme"],
          section?.feedback,
          section?.yorum,
          section?.analysis,
          typeof aiFeedback === "string"
            ? extractFeedbackSection(aiFeedback, feedbackKey)
            : undefined,
          typeof aiFeedback === "object"
            ? (aiFeedback as any)?.[feedbackKey]
            : undefined,
        ),
      );
    };

    const activeSpeakingSectionKey = getSpeakingSectionKey(effectiveActiveSpeakingPart);
    const criteriaFromSectionObject = getSpeakingSectionCriteriaFromObject(activeSpeakingSectionKey);
    const criteriaFromSectionNarrative = extractSpeakingCriteriaFromNarrative(
      getSpeakingSectionNarrative(effectiveActiveSpeakingPart)
    );
    const fallbackGlobalSpeakingCriteria = {
      coherence: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.coherenceAndCohesion : undefined
      ),
      grammar: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.grammaticalRangeAndAccuracy : undefined
      ),
      lexical: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.lexicalResource : undefined
      ),
      achievement: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.taskAchievement : undefined
      ),
    };
    const activeSpeakingCriteria = sanitizeSpeakingFallbackFields({
      coherence:
        criteriaFromSectionObject.coherence ||
          criteriaFromSectionNarrative.coherence ||
          fallbackGlobalSpeakingCriteria.coherence,
      grammar:
        criteriaFromSectionObject.grammar ||
          criteriaFromSectionNarrative.grammar ||
          fallbackGlobalSpeakingCriteria.grammar,
      lexical:
        criteriaFromSectionObject.lexical ||
          criteriaFromSectionNarrative.lexical ||
          fallbackGlobalSpeakingCriteria.lexical,
      achievement:
        criteriaFromSectionObject.achievement ||
          criteriaFromSectionNarrative.achievement ||
          fallbackGlobalSpeakingCriteria.achievement,
    });
    const activeSpeakingCriterionCards = [
      {
        key: "coherence",
        label: "Akıcılık ve Bağlılık",
        text: activeSpeakingCriteria.coherence,
      },
      {
        key: "grammar",
        label: "Dil Bilgisi",
        text: activeSpeakingCriteria.grammar,
      },
      {
        key: "lexical",
        label: "Kelime Kaynağı",
        text: activeSpeakingCriteria.lexical,
      },
      {
        key: "achievement",
        label: "Görev Yanıtı",
        text: activeSpeakingCriteria.achievement,
      },
    ].filter((criterion) => criterion.text);
    
    // Get current question and answer based on active part
    const getCurrentQuestionAndAnswer = () => {
      if (
        visiblePartEntries.length > 0 &&
        displayParts[effectiveActiveSpeakingPart] &&
        displayParts[effectiveActiveSpeakingPart].length > 0
      ) {
        const partQuestions = displayParts[effectiveActiveSpeakingPart];
        const currentQuestionIndex = Math.min(activeSpeakingQuestion, partQuestions.length - 1);
        const currentAnswer = partQuestions[currentQuestionIndex];
        const partLabel = getPartLabel(effectiveActiveSpeakingPart);
        
        // Map part index to feedback key
        // Code organizes into: part1_1 (index 0), part1_2 (index 1), part2 (index 2), part3 (index 3)
        // Feedback string has: [BÖLÜM 1 ANALİZİ], [BÖLÜM 2 ANALİZİ], [BÖLÜM 3 ANALİZİ]
        // Map: part1_1 (index 0) -> part1, part1_2 (index 1) -> part1 (both use BÖLÜM 1), 
        //      part2 (index 2) -> part2, part3 (index 3) -> part3
        let feedbackKey: string;
        if (effectiveActiveSpeakingPart === 0 || effectiveActiveSpeakingPart === 1) {
          // Both Part 1.1 and Part 1.2 use BÖLÜM 1 feedback
          feedbackKey = 'part1';
        } else if (effectiveActiveSpeakingPart === 2) {
          feedbackKey = 'part2';
        } else if (effectiveActiveSpeakingPart === 3) {
          feedbackKey = 'part3';
        } else {
          feedbackKey = `part${effectiveActiveSpeakingPart + 1}`;
        }
        
        // Get feedback for the specific part
        let partFeedback: string;
        const sectionNarrative = getSpeakingSectionNarrative(effectiveActiveSpeakingPart);
        
        // Handle both string and object formats for aiFeedback
        if (typeof aiFeedback === 'string') {
          const extracted = extractFeedbackSection(aiFeedback, feedbackKey);
          partFeedback = extracted;
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          const rawFeedback =
            sectionNarrative ||
            (aiFeedback as any)?.[feedbackKey] ||
            (aiFeedback as any)?.taskAchievement ||
            "";
          partFeedback = sanitizeSpeakingLearnerCopy(
            typeof rawFeedback === "string" ? removeBullets(rawFeedback) : "",
          );
        } else {
          partFeedback = "";
        }
        
        return {
          question: currentAnswer?.questionText || `${partLabel.main} Sorusu ${currentQuestionIndex + 1}`,
          answer: isMeaningfulSpeakingAnswer(currentAnswer?.userAnswer)
            ? currentAnswer.userAnswer
            : "Cevap verilmedi",
          comment: partFeedback,
          audio: currentAnswer?.audio,
        };
      }
      
      // Get default feedback
      let defaultFeedback: string;
      if (typeof aiFeedback === 'string') {
        defaultFeedback = extractFeedbackSection(aiFeedback, 'general');
      } else if (aiFeedback && typeof aiFeedback === 'object') {
        const rawFeedback =
          extractFeedbackSection(aiFeedback, "general") ||
          (aiFeedback as any)?.part1 ||
          (aiFeedback as any)?.taskAchievement ||
          "";
        defaultFeedback = sanitizeSpeakingLearnerCopy(
          typeof rawFeedback === "string" ? removeBullets(rawFeedback) : "",
        );
      } else {
        defaultFeedback = "";
      }
      
      return {
        question: "Soru metni burada gösterilecek",
        answer: "Cevap verilmedi",
        comment: defaultFeedback,
        audio: undefined,
      };
    };

    const currentData = getCurrentQuestionAndAnswer();

    const formatAudioDuration = (seconds?: number | null) => {
      if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
      const rounded = Math.max(1, Math.round(seconds));
      const min = Math.floor(rounded / 60);
      const sec = rounded % 60;
      return min > 0 ? `${min}:${String(sec).padStart(2, "0")}` : `${sec} sn`;
    };

    const loadAudioUrl = async (audioId: string) => {
      const cached = audioUrls[audioId];
      if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

      setAudioErrors((prev) => ({ ...prev, [audioId]: "" }));
      setAudioLoading((prev) => ({ ...prev, [audioId]: true }));
      try {
        const response = await axiosPrivate.get(`/api/speaking-submission/audio/${audioId}/url`);
        const payload = response?.data?.data || response?.data || {};
        const url = typeof payload?.url === "string" ? payload.url : "";
        if (!url) throw new Error("AUDIO_URL_MISSING");
        const replayUrl = await createSpeakingAudioReplayUrl({
          streamUrl: url,
          loadBlob: async (privateStreamUrl) => {
            const audioResponse = await axiosPrivate.get<Blob>(privateStreamUrl, {
              responseType: "blob",
              timeout: 30_000,
            });
            return audioResponse.data;
          },
        });
        const previousObjectUrl = audioObjectUrlsRef.current.get(audioId);
        if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
        audioObjectUrlsRef.current.set(audioId, replayUrl);
        setAudioUrls((prev) => ({
          ...prev,
          [audioId]: {
            url: replayUrl,
            expiresAt: Number.POSITIVE_INFINITY,
          },
        }));
        return replayUrl;
      } catch {
        setAudioErrors((prev) => ({
          ...prev,
          [audioId]: "Ses kaydı şu anda yüklenemedi.",
        }));
        return null;
      } finally {
        setAudioLoading((prev) => ({ ...prev, [audioId]: false }));
      }
    };

    const applyPendingAudioSeek = (
      audioId: string,
      player = audioElementRefs.current.get(audioId),
    ) => {
      const startSeconds = pendingAudioSeek.current.get(audioId);
      if (!player || startSeconds === undefined || player.readyState < 1) return;
      const maximum = Number.isFinite(player.duration)
        ? Math.max(0, player.duration - 0.05)
        : startSeconds;
      player.currentTime = Math.min(Math.max(0, startSeconds), maximum);
      pendingAudioSeek.current.delete(audioId);
      void player.play().catch(() => {});
    };

    const seekSpeakingAudio = async (
      audio: SpeakingAudioMeta,
      startSeconds: number,
    ) => {
      const audioId = audio.audioId;
      if (!audioId || !Number.isFinite(startSeconds)) return;
      pendingAudioSeek.current.set(audioId, Math.max(0, startSeconds));
      const url = await loadAudioUrl(audioId);
      if (!url) {
        pendingAudioSeek.current.delete(audioId);
        return;
      }
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => applyPendingAudioSeek(audioId));
      }
    };

    const renderAudioReplay = (
      audio?: SpeakingAudioMeta,
      options?: {
        variant: "flow";
        issueTimeRanges?: SpeakingFlowTimeRange[];
      },
    ) => {
      if (!audio?.hasAudio || !audio.audioId) return null;
      const signed = audioUrls[audio.audioId];
      const isLoading = Boolean(audioLoading[audio.audioId]);
      const error = audioErrors[audio.audioId];

      if (options?.variant === "flow") {
        return (
          <SpeakingFlowAudioPlayer
            audio={{ ...audio, audioId: audio.audioId }}
            sourceUrl={signed?.url}
            isLoading={isLoading}
            error={error}
            issueTimeRanges={options.issueTimeRanges}
            onEnsureSource={() => loadAudioUrl(audio.audioId!)}
            onRegisterPlayer={(element) => {
              if (element) {
                audioElementRefs.current.set(audio.audioId!, element);
                applyPendingAudioSeek(audio.audioId!, element);
              } else {
                audioElementRefs.current.delete(audio.audioId!);
              }
            }}
            onLoadedMetadata={(element) =>
              applyPendingAudioSeek(audio.audioId!, element)
            }
            onPlaybackStart={() =>
              setAudioErrors((prev) => ({ ...prev, [audio.audioId!]: "" }))
            }
            onPlaybackError={() =>
              setAudioErrors((prev) => ({
                ...prev,
                [audio.audioId!]: "Ses kaydı şu anda oynatılamadı.",
              }))
            }
            onSeekRequest={(seconds) => void seekSpeakingAudio(audio, seconds)}
          />
        );
      }

      const durationLabel = formatAudioDuration(audio.durationSeconds);

      return (
        <div data-speaking-audio-replay className="flex flex-col gap-2 py-1">
          <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] text-[var(--tm-text-secondary)]">
              <Volume2 className="h-4 w-4 text-[var(--tm-text-tertiary)]" />
              <span className="font-semibold text-[var(--tm-text-primary)]">Ses kaydı</span>
              {durationLabel && <span>· {durationLabel}</span>}
            </div>
            {!signed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadAudioUrl(audio.audioId!)}
                disabled={isLoading}
                className="h-8 rounded-[6px] px-2.5 text-[12px] sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Dinle
              </Button>
            )}
          </div>
          {signed && (
            <audio
              ref={(element) => {
                if (element) {
                  audioElementRefs.current.set(audio.audioId!, element);
                  applyPendingAudioSeek(audio.audioId!, element);
                } else {
                  audioElementRefs.current.delete(audio.audioId!);
                }
              }}
              className="h-9 w-full"
              src={signed.url}
              controls
              preload="metadata"
              controlsList="nodownload"
              onLoadedMetadata={(event) =>
                applyPendingAudioSeek(audio.audioId!, event.currentTarget)
              }
              onError={() =>
                setAudioErrors((prev) => ({
                  ...prev,
                  [audio.audioId!]: "Ses kaydı şu anda oynatılamadı.",
                }))
              }
            />
          )}
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
      );
    };

    const speakingDiscussionPoints = extractSpeakingDiscussionPoints(speaking);
    const deepReviewSections: SpeakingDeepReviewSection[] = visiblePartEntries.map(
      ({ index, questions }) => {
        const sectionKey = getSpeakingSectionKey(index);
        const sectionQuestions = questions.map((question, questionIndex) => ({
          id: question.questionId || `${sectionKey}-${questionIndex}`,
          question: question.questionText,
          transcript: isMeaningfulSpeakingAnswer(question.userAnswer)
            ? question.userAnswer
            : null,
          audio: question.audio,
          visuals: question.visuals,
          visualContext: question.visualContext,
        }));
        return {
          key: sectionKey,
          label: getPartLabel(index).main,
          feedback: getSpeakingSectionNarrative(index),
          discussionPoints:
            sectionKey === "bolum_3" ? speakingDiscussionPoints : undefined,
          singleRecordingCombinedPrompt:
            isExplicitSingleRecordingCombinedPrompt(
              sectionKey,
              sectionQuestions,
            ),
          questions: sectionQuestions,
        };
      },
    );

    if (deepReviewSections.length > 0) {
      return (
        <SpeakingDeepReview
          aiFeedback={aiFeedback}
          officialResult={speaking as unknown as Record<string, unknown>}
          sections={deepReviewSections}
          submissionId={speakingSubmissionId}
          score={speakingDisplay.score}
          level={speakingDisplay.level}
          evaluationStatus={
            speaking?.evaluationStatus ?? aiFeedback?.evaluationStatus
          }
          summaryMode={reportIsMulti ? "general-only" : "full"}
          renderAudioReplay={renderAudioReplay}
          onSeekAudioEvidence={seekSpeakingAudio}
        />
      );
    }

    return (
      <div className="w-full">
        <div className="w-full">
          {/* Part Navigation - Simplified Design */}
          {visiblePartEntries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4 sm:mb-6">
                Konuşma Bölümleri
              </h3>

              {/* All Parts - 2x2 on mobile, 4 columns on tablet+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {visiblePartEntries.map(({ index }) => {
                  const partLabel = getPartLabel(index);
                  return (
                    <Button
                      key={index}
                      onClick={() => {
                        setActiveSpeakingPart(index);
                        setActiveSpeakingQuestion(0);
                      }}
                      variant="outline"
                      className={`h-14 sm:h-16 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                        effectiveActiveSpeakingPart === index
                          ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{partLabel.main}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Question Navigation within Part - Only for Part 1.1 and Part 1.2 */}
              {displayParts[effectiveActiveSpeakingPart] && 
               displayParts[effectiveActiveSpeakingPart].length > 1 && 
               (effectiveActiveSpeakingPart === 0 || effectiveActiveSpeakingPart === 1) && (
                <div className="flex flex-wrap gap-2">
                  {displayParts[effectiveActiveSpeakingPart].map((question: SpeakingAnswerItem, index: number) => {
                    const orderLabel =
                      extractNumericOrder(question?.questionOrder) || index + 1;
                    return (
                    <Button
                      key={index}
                      onClick={() => setActiveSpeakingQuestion(index)}
                      variant="outline"
                      size="sm"
                      className={`transition-all ${
                        activeSpeakingQuestion === index
                          ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                      }`}
                    >
                      Soru {orderLabel}
                    </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bölüm Bazlı Geri Bildirim */}
          {activeSpeakingCriterionCards.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
                {getPartLabel(effectiveActiveSpeakingPart).main}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {activeSpeakingCriterionCards.map((criterion) => (
                <div
                  key={criterion.key}
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4"
                >
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    {criterion.label}
                  </div>
                  <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                    {criterion.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : null}
          {/* Content Sections - Simplified */}
          <div className="space-y-6">
            {/* Answer Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Cevabınız</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
                {renderAudioReplay(currentData.audio)}
              </div>
            </div>

            {/* GENEL DEĞERLENDİRME Section - Shows general feedback */}
            {(() => {
              const rawGeneralFeedback = extractFeedbackSection(aiFeedback, "general");
              const generalFeedback =
                rawGeneralFeedback && !isPlaceholderText(rawGeneralFeedback)
                  ? sanitizeGeneralFeedback(rawGeneralFeedback)
                  : "";
              if (!generalFeedback && !structuredGeneralFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Performans Özeti</h2>
                  {structuredGeneralFeedback ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {structuredGeneralFeedback.ozet && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Özet</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {structuredGeneralFeedback.ozet}
                          </p>
                        </div>
                      )}

                      {structuredGeneralFeedback.tekrar_eden_eksikler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Tekrar Eden Eksikler</h4>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {structuredGeneralFeedback.tekrar_eden_eksikler.map((item, idx) => (
                              <li key={`overall-speaking-eksik-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredGeneralFeedback.alinti_duzeltme.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-2">İyileştirmeler</h4>
                          <div className="space-y-3">
                            {structuredGeneralFeedback.alinti_duzeltme.map((item, idx) => (
                              <div
                                key={`overall-speaking-rewrite-${idx}`}
                                className="rounded-lg border border-gray-200 bg-gray-100 p-3"
                              >
                                {item.alinti && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Alıntı</p>
                                    <p className="text-red-600 font-medium whitespace-pre-wrap mb-2">
                                      "{item.alinti}"
                                    </p>
                                  </>
                                )}
                                {item.duzeltilmis && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Düzeltilmiş Versiyon</p>
                                    <p className="text-green-700 whitespace-pre-wrap mb-2">
                                      {item.duzeltilmis}
                                    </p>
                                  </>
                                )}
                                {item.neden && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Neden Düzelttik?</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">{item.neden}</p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.egzersizler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Önerilen Egzersizler</h4>
                          <div className="space-y-2">
                            {structuredGeneralFeedback.egzersizler.map((item, idx) => (
                              <div
                                key={`overall-speaking-exercise-${idx}`}
                                className="rounded-md border border-gray-200 bg-white p-3"
                              >
                                <p className="font-semibold text-black">{idx + 1}. {item.baslik || "Egzersiz"}</p>
                                {item.uygulama && (
                                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{item.uygulama}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.kapanis && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Son Not</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {structuredGeneralFeedback.kapanis}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{removeBullets(generalFeedback)}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  type ResultTestType = "listening" | "reading" | "writing" | "speaking";

  const availableTests: ResultTestType[] = [];
  if (data.listening) availableTests.push("listening");
  if (data.reading) availableTests.push("reading");
  if (data.writing) availableTests.push("writing");
  if (data.speaking) availableTests.push("speaking");

  const writingIsV2 = isWritingV2Result(data.writing as any);
  const writingEvaluationStatus = String(
    data.writing?.evaluationStatus ||
      (data.writing?.aiFeedback as any)?.evaluationStatus ||
      "",
  ).toUpperCase();
  const writingStatusLabel =
    writingIsV2 && writingEvaluationStatus === "FAILED"
      ? "Değerlendirme tamamlanamadı"
      : writingIsV2 && writingEvaluationStatus !== "COMPLETED"
        ? "Değerlendiriliyor"
        : undefined;
  const reportSpeakingFeedback = resolveSpeakingResultFeedback(
    data.speaking?.aiFeedback,
  ) as Record<string, unknown> | null;
  const reportCanonicalSpeakingAssessment =
    reportSpeakingFeedback?.assessmentVersion === "speaking-canonical-v1"
      ? reportSpeakingFeedback
      : null;
  const speakingDisplay = resolveOfficialSpeakingDisplay(
    speakingEvaluationStatus,
    (reportCanonicalSpeakingAssessment?.standardScore as number | undefined) ??
      data.speaking?.score,
    (reportCanonicalSpeakingAssessment?.cefrLevel as string | undefined) ??
      (data.speaking?.aiFeedback as any)?.seviye ??
      data.level,
  );

  const testInfoByType = {
    listening: {
      label: "Dinleme",
      title: "Dinleme sonucu",
      description:
        "Cevaplarınızı, transcript kanıtlarını ve ilgili ses bölümlerini inceleyin.",
      score: wholeScore(data.listening?.score),
      statusLabel: undefined as string | undefined,
      result: data.listening,
    },
    reading: {
      label: "Okuma",
      title: "Okuma sonucu",
      description:
        "Cevaplarınızı, doğru yanıtları ve metindeki gerçek kanıtları karşılaştırın.",
      score: wholeScore(data.reading?.score),
      statusLabel: undefined as string | undefined,
      result: data.reading,
    },
    writing: {
      label: "Yazma",
      title: "Yazma sonucu",
      description:
        "Kriter değerlendirmesini ve kendi metniniz üzerindeki düzeltmeleri inceleyin.",
      score: wholeScore(data.writing?.score),
      statusLabel: writingStatusLabel,
      result: data.writing,
    },
    speaking: {
      label: "Konuşma",
      title: "Konuşma sonucu",
      description: undefined,
      score: speakingDisplay.score,
      statusLabel:
        speakingEvaluationView.kind === "pending"
          ? "Değerlendiriliyor"
          : speakingEvaluationView.kind === "failed"
            ? "Tamamlanamadı"
            : speakingDisplay.score === null
              ? "—"
              : (undefined as string | undefined),
      result: data.speaking,
    },
  } as const;

  const safeActiveTab = availableTests.includes(activeTab as ResultTestType)
    ? (activeTab as ResultTestType)
    : availableTests[0] || "listening";
  const scoreList = availableTests
    .filter((type) => !testInfoByType[type].statusLabel)
    .map((type) => testInfoByType[type].score)
    .filter(
      (score): score is number =>
        typeof score === "number" && !Number.isNaN(score),
    );
  const rawOverallScore =
    (data as any)?.overallScore ??
    (data as any)?.score ??
    (data as any)?.totalScore;
  const hasNumericValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return false;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed);
  };
  const isFullOfficialReportReady =
    Boolean(data.isCompleted) &&
    String(data.status || "").toUpperCase() === "COMPLETED" &&
    hasNumericValue(rawOverallScore) &&
    (["listening", "reading", "writing", "speaking"] as const).every(
      (type) => Boolean(data[type]) && hasNumericValue(data[type]?.score),
    );
  const parsedOverallScore =
    typeof rawOverallScore === "number"
      ? rawOverallScore
      : typeof rawOverallScore === "string"
        ? Number(rawOverallScore)
        : NaN;
  const overallScore = !Number.isNaN(parsedOverallScore)
    ? wholeScore(parsedOverallScore)
    : scoreList.length > 0
      ? Math.round(
          scoreList.reduce((sum, score) => sum + score, 0) / scoreList.length,
        )
      : 0;
  const overallLevel =
    levelFrom75(overallScore) || displayLevel(data.level) || "B1 altı";
  const sectionScoreCards = availableTests.map((type) => ({
    type,
    label: testInfoByType[type].label,
    score: testInfoByType[type].score,
    statusLabel: testInfoByType[type].statusLabel,
  }));
  const getObjectiveSectionStats = (
    result?: TestSonuc,
  ): PerformanceReportStat[] => {
    if (!result) return [];

    const reviewQuestions = flattenReviewQuestions(result.review);
    if (reviewQuestions.length > 0) {
      const correct = reviewQuestions.filter(
        (question) => question.isCorrect,
      ).length;
      const blank = reviewQuestions.filter(
        (question) =>
          !question.isCorrect && isBlankReviewAnswer(question.userAnswer),
      ).length;
      const incorrect = Math.max(
        reviewQuestions.length - correct - blank,
        0,
      );
      return [
        { label: "Doğru", value: correct, tone: "success" },
        { label: "Yanlış", value: incorrect, tone: "danger" },
        { label: "Boş", value: blank, tone: "muted" },
      ];
    }

    const questions = Array.isArray(result.questions) ? result.questions : [];
    if (questions.length === 0) return [];
    let correct = 0;
    let blank = 0;
    questions.forEach((question) => {
      const userAnswers = parseUserAnswerList(question.userAnswer);
      if (userAnswers.length === 0) {
        blank += 1;
        return;
      }
      const correctAnswers = normalizeAnswerList(
        (question.correctAnswers || [])
          .map((answer) => answer.text)
          .filter(Boolean),
      );
      if (
        isExactAnswerSetMatch(
          correctAnswers,
          normalizeAnswerList(userAnswers),
        )
      ) {
        correct += 1;
      }
    });
    return [
      { label: "Doğru", value: correct, tone: "success" },
      {
        label: "Yanlış",
        value: Math.max(questions.length - correct - blank, 0),
        tone: "danger",
      },
      { label: "Boş", value: blank, tone: "muted" },
    ];
  };

  const getReadingSectionStats = (
    result?: TestSonuc,
  ): PerformanceReportSectionStat[] => {
    const sections = result?.review?.sections || [];
    if (sections.length === 0) return [];

    const statsByPart = new Map<
      number,
      { total: number; correct: number; incorrect: number; blank: number }
    >();
    sections.forEach((section, index) => {
      const partNumber =
        Number.isInteger(section.partNumber) && Number(section.partNumber) > 0
          ? Number(section.partNumber)
          : index + 1;
      const current = statsByPart.get(partNumber) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        blank: 0,
      };

      (section.questions || []).forEach((question) => {
        current.total += 1;
        if (isBlankReviewAnswer(question.userAnswer)) {
          current.blank += 1;
        } else if (question.isCorrect) {
          current.correct += 1;
        } else {
          current.incorrect += 1;
        }
      });
      statsByPart.set(partNumber, current);
    });

    return Array.from({ length: 5 }, (_, index) => {
      const stats = statsByPart.get(index + 1) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        blank: 0,
      };
      return {
        label: `Bölüm ${index + 1}`,
        ...stats,
      };
    });
  };

  const getListeningSectionStats = (
    result?: TestSonuc,
  ): PerformanceReportSectionStat[] => {
    const sections = result?.review?.sections || [];
    if (sections.length === 0) return [];

    const statsByPart = new Map<
      number,
      { total: number; correct: number; incorrect: number; blank: number }
    >();
    sections.forEach((section, index) => {
      const partNumber =
        Number.isInteger(section.partNumber) && Number(section.partNumber) > 0
          ? Number(section.partNumber)
          : index + 1;
      const current = statsByPart.get(partNumber) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        blank: 0,
      };

      (section.questions || []).forEach((question) => {
        current.total += 1;
        if (isBlankReviewAnswer(question.userAnswer)) {
          current.blank += 1;
        } else if (question.isCorrect) {
          current.correct += 1;
        } else {
          current.incorrect += 1;
        }
      });
      statsByPart.set(partNumber, current);
    });

    return Array.from({ length: 6 }, (_, index) => {
      const stats = statsByPart.get(index + 1) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        blank: 0,
      };
      return {
        label: `Bölüm ${index + 1}`,
        ...stats,
      };
    });
  };

  const formatReportDate = (value?: string) => {
    if (!value) return "Tarih bilgisi yok";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tarih bilgisi yok";
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const renderResultSection = (testType: ResultTestType) => {
    if (testType === "listening") return renderListeningResults();
    if (testType === "reading") return renderReadingResults();
    if (testType === "writing") return renderWritingResults();
    return (
      <>
        {renderSpeakingFeedbackRetry()}
        {renderSpeakingResults()}
      </>
    );
  };

  const reportIsMulti = availableTests.length > 1;
  const singleTestType = availableTests[0] || "reading";
  const singleTestInfo = testInfoByType[singleTestType];
  const reportScore = reportIsMulti
    ? shouldRefreshEvaluation
      ? Number.NaN
      : overallScore
    : singleTestInfo.score;
  const reportScoreStatus = reportIsMulti
    ? shouldRefreshEvaluation
      ? "Değerlendiriliyor"
      : undefined
    : singleTestType === "speaking"
      ? speakingDisplay.score === null
        ? "—"
        : undefined
      : singleTestInfo.statusLabel;
  const reportLevel = reportIsMulti
    ? reportScoreStatus
      ? "—"
      : overallLevel
    : singleTestType === "speaking"
      ? speakingDisplay.level
      : reportScoreStatus
        ? "—"
        : levelFrom75(reportScore) || displayLevel(data.level) || "B1 altı";
  const reportStats: PerformanceReportStat[] = reportIsMulti
    ? []
    : singleTestType === "reading" || singleTestType === "listening"
      ? getObjectiveSectionStats(singleTestInfo.result)
      : [];
  const reportSectionStats =
    !reportIsMulti && singleTestType === "reading"
      ? getReadingSectionStats(singleTestInfo.result)
      : !reportIsMulti && singleTestType === "listening"
        ? getListeningSectionStats(singleTestInfo.result)
        : [];
  const reportCompletedAt =
    (reportIsMulti
      ? data.completedAt
      : singleTestInfo.result?.completedAt) || data.startedAt;
  const returnToResults = () =>
    navigate(openedFromReports ? "/app/sonuclar" : "/app/test");
  const returnLabel = openedFromReports ? "Raporlara dön" : "Testlere dön";
  const reportActions = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        type="button"
        variant="outline"
        onClick={returnToResults}
        className="h-10 rounded-[7px] border-[var(--tm-border-default)] bg-white px-3 text-[13px] font-medium text-[var(--tm-text-primary)] shadow-[0_1px_2px_rgba(15,15,15,0.025)] hover:bg-[#f5f5f3]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {returnLabel}
      </Button>
      {isFullOfficialReportReady && (
        <Button
          type="button"
          onClick={() => void handleDownloadPDF()}
          disabled={downloadingPDF}
          className="theme-important h-10 rounded-[7px] bg-[#d53a3a] px-3 text-[13px] font-semibold text-white hover:bg-[#bd3030]"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloadingPDF ? "İndiriliyor…" : "PDF indir"}
        </Button>
      )}
    </div>
  );

  const reportOverview = (
    <PerformanceReportOverview
      eyebrow={undefined}
      title={reportIsMulti ? "Tam deneme sonucu" : singleTestInfo.title}
      description={
        reportIsMulti
          ? undefined
          : singleTestType === "reading" ||
              singleTestType === "listening" ||
              singleTestType === "writing"
            ? undefined
            : singleTestInfo.description
      }
      participant={data.user.name}
      completedAt={formatReportDate(reportCompletedAt)}
      scoreLabel={reportIsMulti ? "Genel puan" : `${singleTestInfo.label} puanı`}
      score={typeof reportScore === "number" ? reportScore : Number.NaN}
      scoreStatus={reportScoreStatus}
      level={reportLevel}
      stats={reportStats}
      sectionStats={reportSectionStats}
      scoreTone={reportIsMulti ? "goal" : singleTestType}
      hideDefaultSummary={!reportIsMulti && singleTestType === "speaking"}
      actions={reportActions}
      sectionNavigation={undefined}
      integrateStats={
        !reportIsMulti &&
        (singleTestType === "reading" || singleTestType === "listening")
      }
      summaryContent={
        reportIsMulti ? (
          <FullTestReportSummary
            score={typeof reportScore === "number" ? reportScore : Number.NaN}
            scoreStatus={reportScoreStatus}
            level={reportLevel}
            activeSection={safeActiveTab}
            sections={sectionScoreCards}
            onSectionChange={(section) => setActiveTab(section)}
          />
        ) : singleTestType === "writing" && writingIsV2 ? (
          <WritingV2Summary data={data.writing as any} />
        ) : undefined
      }
    />
  );

  return (
    <div
      className={`min-h-screen py-6 font-sans tracking-normal text-[var(--tm-text-primary)] sm:py-9 ${
        !reportIsMulti &&
        (singleTestType === "reading" || singleTestType === "listening")
          ? "bg-[var(--tm-bg-page)]"
          : "bg-[var(--tm-bg-app)]"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {reportIsMulti ? (
          <Tabs
            value={safeActiveTab}
            onValueChange={(value) => setActiveTab(value)}
            className="w-full"
          >
            {reportOverview}
            {availableTests.map((testType) => (
              <TabsContent
                key={testType}
                value={testType}
                className="mt-7 focus-visible:outline-none"
              >
                {renderResultSection(testType)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <>
            {reportOverview}
            <div className="mt-5">{renderResultSection(singleTestType)}</div>
          </>
        )}
      </div>
    </div>
  );
}






