import {
  type ClipboardEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ALargeSmall,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";

import { useOverallSectionHeartbeat } from "@/hooks/use-overall-section-heartbeat";
import { useAuth } from "@/contexts/AuthContext";
import {
  createBackendSyncedTimerState,
  getBackendSyncedRemainingSeconds,
  getOverallSectionTimerErrorCode,
  getOverallSectionTimerErrorMessage,
  overallTestFlowStore,
  overallTestService,
  overallTestTokenStore,
  type BackendSyncedTimerState,
  type MockSubmitMode,
} from "@/services/overallTest.service";
import {
  writingSubmissionService,
  type WritingSubmissionSection,
} from "@/services/writingSubmission.service";
import {
  writingTestService,
  type WritingTestV2,
} from "@/services/writingTest.service";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ReadingSplitHandle from "@/components/reading-test/ui/ReadingSplitHandle";
import WritingRichText from "./WritingRichText";
import { getWritingTypographyPreset } from "./writing-typography";
import { TURKISH_CHARACTER_SHORTCUTS } from "./writing-turkish-input";
import { useWritingTurkishLongPressInput } from "./use-writing-turkish-long-press";
import { useWritingInputMode } from "./use-writing-input-mode";
import {
  countWritingWords,
  getWritingAnswerLimits,
  getWritingStudentTaskMetadata,
  getWritingTaskSectionLabel,
  getWritingTaskShortLabel,
  getWritingV2Tasks,
  getWritingWordTargetLabel,
  limitWritingAnswer,
} from "./writing-v2";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

interface WritingProgressSnapshot {
  currentTaskIndex: number;
  answers: Record<string, string>;
  fontScale: number;
  lastSavedAt: number;
  pendingQuestionIds?: string[];
}

const getActiveFullscreenElement = () => {
  if (typeof document === "undefined") return null;
  const fullscreenDocument = document as FullscreenDocument;
  return (
    document.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.msFullscreenElement ||
    null
  );
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

export default function WritingTestV2({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Hold the admitted session identity even when successful submission clears its token.
  const sessionToken = useMemo(
    () => overallTestTokenStore.getByTestId(testId),
    [testId, user?.id],
  );
  useOverallSectionHeartbeat(testId);
  const [writingInputMode] = useWritingInputMode(testId, sessionToken);

  const [test, setTest] = useState<WritingTestV2 | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [characterCase, setCharacterCase] = useState<"lower" | "upper">(
    "lower",
  );
  const [showDescription, setShowDescription] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectionTimerLoading, setSectionTimerLoading] = useState(true);
  const [sectionTimerError, setSectionTimerError] = useState<string | null>(
    null,
  );
  const [timerRetryKey, setTimerRetryKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    Boolean(getActiveFullscreenElement()),
  );
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(
    () => !getActiveFullscreenElement(),
  );
  const [draftReady, setDraftReady] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState(false);
  const [draftRetryKey, setDraftRetryKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSubmitAttempts, setAutoSubmitAttempts] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  const [draftAcknowledgement, setDraftAcknowledgement] = useState(0);
  const [answerLimitNoticeQuestionId, setAnswerLimitNoticeQuestionId] =
    useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backendTimerRef = useRef<BackendSyncedTimerState | null>(null);
  const latestAnswersRef = useRef<Record<string, string>>({});
  const acknowledgedDraftAtRef = useRef(0);
  const pendingQuestionIdsRef = useRef(new Set<string>());
  const draftQueueRef = useRef<Promise<void>>(Promise.resolve());
  const hasSubmittedRef = useRef(false);
  const submitStartedRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);
  const fullscreenWasActiveRef = useRef(false);
  const answerLimitWarningQuestionRef = useRef<string | null>(null);
  const answerLimitLockByQuestionRef = useRef(new Map<string, number>());
  // Fast refresh can preserve the former Set-based lock while this screen is open.
  // Replace it so an old 150-word lock cannot survive the new 200-word rule.
  if (!(answerLimitLockByQuestionRef.current instanceof Map)) {
    answerLimitLockByQuestionRef.current = new Map<string, number>();
  }
  const answerLimitNoticeTimeoutRef = useRef<number | null>(null);
  const progressStorageKey = sessionToken && user?.id
    ? `writing_v2_progress_${encodeURIComponent(user.id)}_${encodeURIComponent(testId)}_${encodeURIComponent(sessionToken)}`
    : null;

  const tasks = useMemo(() => getWritingV2Tasks(test), [test]);
  const currentTask = tasks[currentTaskIndex] || null;
  const currentQuestion = currentTask?.questions?.[0] || null;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || ""
    : "";
  const currentWordCount = countWritingWords(currentAnswer);
  const currentAnswerLimits = currentTask
    ? getWritingAnswerLimits(currentTask)
    : { wordLimit: 200, characterLimit: 2_400 };
  const writingLocked =
    !draftReady ||
    isSubmitting ||
    sectionTimerLoading ||
    Boolean(sectionTimerError) ||
    timeLeft <= 0;

  const requestExamFullscreen = useCallback(async (notifyFailure = false) => {
    if (getActiveFullscreenElement()) {
      fullscreenWasActiveRef.current = true;
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      return true;
    }

    try {
      const root = document.documentElement as FullscreenRoot;
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else if (root.msRequestFullscreen) {
        await root.msRequestFullscreen();
      } else throw new Error("Fullscreen API unavailable");

      if (!getActiveFullscreenElement()) {
        if (notifyFailure) {
          toast.error(
            "Tam ekran açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.",
          );
        }
        return false;
      }

      fullscreenWasActiveRef.current = true;
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      return true;
    } catch {
      if (notifyFailure) {
        toast.error(
          "Tam ekran açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.",
        );
      }
      return false;
    }
  }, []);

  const exitExamFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (fullscreenDocument.webkitExitFullscreen) {
        await fullscreenDocument.webkitExitFullscreen();
      } else if (fullscreenDocument.msExitFullscreen) {
        await fullscreenDocument.msExitFullscreen();
      }
    } catch {
      toast.error("Tam ekrandan çıkılamadı. Esc tuşunu deneyin.");
    }
  }, []);

  useEffect(() => {
    latestAnswersRef.current = answers;
  }, [answers]);

  useEffect(
    () => () => {
      if (answerLimitNoticeTimeoutRef.current !== null) {
        window.clearTimeout(answerLimitNoticeTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);

    const load = async () => {
      try {
        let data: WritingTestV2 | null = null;
        const cached = sessionStorage.getItem(`test_data_WRITING_${testId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as WritingTestV2;
          if (parsed?.formatVersion === 2 && parsed?.status === "PUBLISHED") {
            data = parsed;
          }
        }
        if (!data) data = await writingTestService.getPublishedV2(testId, sessionToken);
        if (!data || data.formatVersion !== 2 || (data.status !== "PUBLISHED" && !(sessionToken && data.status === "ARCHIVED"))) {
          throw new Error("Yayınlanmış yazma testi bulunamadı.");
        }
        if (getWritingV2Tasks(data).length !== 3) {
          throw new Error("Yazma testi üç görev içermiyor.");
        }
        if (mounted) {
          setTest(data);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error ? error.message : "Yazma testi yüklenemedi.",
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [sessionToken, testId]);

  useEffect(() => {
    let restored: WritingProgressSnapshot | null = null;
    try {
      const raw = progressStorageKey && sessionStorage.getItem(progressStorageKey);
      if (raw) restored = JSON.parse(raw) as WritingProgressSnapshot;
    } catch {}
    setProgressReady(true);
    if (!restored) return;
    if (restored.answers && typeof restored.answers === "object") {
      setAnswers(restored.answers);
      latestAnswersRef.current = restored.answers;
      acknowledgedDraftAtRef.current = restored.lastSavedAt || 0;
      pendingQuestionIdsRef.current = new Set(restored.pendingQuestionIds || []);
    }
    if (Number.isFinite(restored.currentTaskIndex)) {
      setCurrentTaskIndex(
        Math.min(2, Math.max(0, Math.round(restored.currentTaskIndex))),
      );
    }
    if (Number.isFinite(restored.fontScale)) {
      setFontScale(Math.min(1.1, Math.max(0.9, restored.fontScale)));
    }
  }, [progressStorageKey]);

  useEffect(() => {
    if (!progressReady || !progressStorageKey || hasSubmittedRef.current) return;
    try {
      const snapshot: WritingProgressSnapshot = {
        currentTaskIndex,
        answers,
        fontScale,
        lastSavedAt: acknowledgedDraftAtRef.current,
        pendingQuestionIds: [...pendingQuestionIdsRef.current],
      };
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [answers, currentTaskIndex, draftAcknowledgement, fontScale, progressReady, progressStorageKey]);

  useEffect(() => {
    if (sectionTimerLoading) return;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        const backendRemaining = getBackendSyncedRemainingSeconds(
          backendTimerRef.current,
        );
        if (backendRemaining === null) return Math.max(0, previous - 1);
        return Math.min(previous, backendRemaining);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sectionTimerLoading]);

  useEffect(() => {
    if (!test || !progressReady || sectionTimerLoading || sectionTimerError || draftReady) return;
    const token = overallTestTokenStore.getByTestId(testId);
    if (!token) return;
    let mounted = true;
    let hydrated = false;
    setDraftLoadError(false);

    writingSubmissionService
      .getDraft(token)
      .then((draft) => {
        if (!mounted || !draft) return;
        hydrated = true;
        if (draft?.answers && Object.keys(draft.answers).length > 0) {
          const merged = { ...draft.answers };
          const serverSavedAt = Date.parse(draft.lastSavedAt || "");
          for (const [questionId, answer] of Object.entries(latestAnswersRef.current)) {
            if (
              pendingQuestionIdsRef.current.has(questionId) ||
              !Number.isFinite(serverSavedAt) ||
              acknowledgedDraftAtRef.current > serverSavedAt
            ) merged[questionId] = answer;
          }
          latestAnswersRef.current = merged;
          if (Number.isFinite(serverSavedAt)) {
            acknowledgedDraftAtRef.current = Math.max(acknowledgedDraftAtRef.current, serverSavedAt);
          }
          setAnswers(merged);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!mounted) return;
        if (hydrated) setDraftReady(true);
        else setDraftLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, [draftReady, draftRetryKey, progressReady, sectionTimerError, sectionTimerLoading, test, testId]);

  const writeDraft = useCallback(
    async (nextAnswers: Record<string, string>) => {
      const token = overallTestTokenStore.getByTestId(testId);
      if (!token || hasSubmittedRef.current) return;
      const wordCounts = Object.fromEntries(
        Object.entries(nextAnswers).map(([questionId, answer]) => [
          questionId,
          countWritingWords(answer),
        ]),
      );
      const saved = await writingSubmissionService.saveDraft({
        sessionToken: token,
        answers: nextAnswers,
        wordCounts,
      });
      if (!saved?.saved) return;
      for (const [questionId, answer] of Object.entries(nextAnswers)) {
        if (latestAnswersRef.current[questionId] === answer) {
          pendingQuestionIdsRef.current.delete(questionId);
        }
      }
      if (!pendingQuestionIdsRef.current.size && saved?.lastSavedAt) {
        const savedAt = Date.parse(saved.lastSavedAt);
        if (Number.isFinite(savedAt)) acknowledgedDraftAtRef.current = savedAt;
      }
      setDraftAcknowledgement((value) => value + 1);
    },
    [testId],
  );

  const queueDraft = useCallback(
    (nextAnswers: Record<string, string>) => {
      const queued = draftQueueRef.current
        .catch(() => undefined)
        .then(() => writeDraft(nextAnswers));
      draftQueueRef.current = queued.catch(() => undefined);
      return queued;
    },
    [writeDraft],
  );

  useEffect(() => {
    if (!draftReady || writingLocked || hasSubmittedRef.current) return;
    const timeout = window.setTimeout(() => {
      void queueDraft(latestAnswersRef.current);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [answers, draftReady, queueDraft, writingLocked]);

  useEffect(() => {
    if (timeLeft !== 1 || !draftReady || hasSubmittedRef.current) return;
    void queueDraft(latestAnswersRef.current);
  }, [draftReady, queueDraft, timeLeft]);

  useEffect(() => {
    let disposed = false;
    document.body.classList.add("exam-mode");

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handleFullscreenChange = () => {
      const active = Boolean(getActiveFullscreenElement());
      setIsFullscreen(active);
      if (active) {
        fullscreenWasActiveRef.current = true;
        setShowFullscreenPrompt(false);
      } else if (!hasSubmittedRef.current) {
        setShowFullscreenPrompt(true);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    if (!getActiveFullscreenElement()) {
      setShowFullscreenPrompt(true);
      void requestExamFullscreen().then((enteredFullscreen) => {
        if (!disposed && enteredFullscreen) {
          setShowFullscreenPrompt(false);
        }
      });
    }
    const fullscreenGuardInterval = window.setInterval(() => {
      if (
        !disposed &&
        !getActiveFullscreenElement() &&
        !hasSubmittedRef.current
      ) {
        setIsFullscreen(false);
        setShowFullscreenPrompt(true);
      }
    }, 1000);

    return () => {
      disposed = true;
      window.clearInterval(fullscreenGuardInterval);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      if (!overallTestFlowStore.hasActive()) {
        document.body.classList.remove("exam-mode");
      }
    };
  }, [requestExamFullscreen]);

  const buildSubmissionSections = useCallback(
    (nextAnswers: Record<string, string>): WritingSubmissionSection[] => {
      if (!test) return [];
      return [...test.sections]
        .sort((left, right) => left.order - right.order)
        .map((section) => ({
          description: section.title,
          answers: [],
          subParts: [...(section.subParts || [])]
            .sort((left, right) => left.order - right.order)
            .map((task) => ({
              description: task.label,
              answers: (task.questions || []).slice(0, 1).map((question) => ({
                questionId: question.id,
                userAnswer: nextAnswers[question.id] || "",
              })),
            })),
        }));
    },
    [test],
  );

  const clearProgress = useCallback(() => {
    try {
      if (progressStorageKey) sessionStorage.removeItem(progressStorageKey);
      sessionStorage.removeItem(`test_data_WRITING_${testId}`);
    } catch {}
    overallTestTokenStore.clearByTestId(testId);
  }, [progressStorageKey, testId]);

  const finishOverallFlow = useCallback(
    async (submissionId: string) => {
      const nextPath = overallTestFlowStore.onTestCompleted("WRITING", testId);
      if (nextPath) {
        clearProgress();
        navigate(nextPath);
        return;
      }

      const overallId = overallTestFlowStore.getOverallId();
      if (overallId && overallTestFlowStore.isAllDone()) {
        const completed = await overallTestService.complete(overallId);
        if (!completed) {
          throw new Error("Sınav sonucu tamamlanamadı. Cevabınız kaydedildi.");
        }
        overallTestFlowStore.markCompleted();
        clearProgress();
        if (getActiveFullscreenElement()) {
          try {
            await document.exitFullscreen();
          } catch {}
        }
        navigate(`/overall-results/${overallId}`);
        return;
      }

      clearProgress();
      navigate(`/writing-test/results/${submissionId}`);
    },
    [clearProgress, navigate, testId],
  );

  const recoverSubmittedSection = useCallback(async (): Promise<boolean> => {
    if (hasSubmittedRef.current) return true;
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;

    const recovery = (async () => {
      const token = overallTestTokenStore.getByTestId(testId);
      const overallTestId = overallTestFlowStore.getOverallId();
      if (!token && !overallTestId) return false;

      try {
        let recovered = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          recovered = await writingSubmissionService.getSessionResult(
            token,
            overallTestId,
          );
          if (recovered?.submissionId) break;
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 300);
          });
        }
        if (!recovered?.submissionId) return false;

        hasSubmittedRef.current = true;
        submitStartedRef.current = true;
        setSectionTimerError(null);

        if (recovered.overallCompleted) {
          overallTestFlowStore.markCompleted();
          clearProgress();
          if (getActiveFullscreenElement()) {
            try {
              await document.exitFullscreen();
            } catch {}
          }
          navigate(`/overall-results/${recovered.overallTestId}`, {
            replace: true,
          });
          return true;
        }

        try {
          await finishOverallFlow(recovered.submissionId);
        } catch {
          clearProgress();
          if (getActiveFullscreenElement()) {
            try {
              await document.exitFullscreen();
            } catch {}
          }
          navigate(`/writing-test/results/${recovered.submissionId}`, {
            replace: true,
          });
        }
        return true;
      } catch {
        return false;
      }
    })();

    recoveryPromiseRef.current = recovery;
    try {
      return await recovery;
    } finally {
      recoveryPromiseRef.current = null;
    }
  }, [clearProgress, finishOverallFlow, navigate, testId]);

  useEffect(() => {
    if (!test) return;
    let mounted = true;
    backendTimerRef.current = null;
    setSectionTimerLoading(true);
    setSectionTimerError(null);

    const startTimer = async () => {
      try {
        const timer = await overallTestService.startSectionTimerForTest(testId);
        if (!mounted || !timer) return;
        const timerState = createBackendSyncedTimerState(timer);
        backendTimerRef.current = timerState;
        setTimeLeft(
          getBackendSyncedRemainingSeconds(timerState) ??
            timerState.initialRemainingSeconds,
        );
      } catch (error) {
        if (!mounted) return;
        const code = getOverallSectionTimerErrorCode(error);
        if (code === "SECTION_ALREADY_SUBMITTED") {
          const recovered = await recoverSubmittedSection();
          if (recovered || !mounted) return;
        }
        if (code === "TEST_TIME_EXPIRED") {
          backendTimerRef.current = null;
          setSectionTimerError(null);
          setTimeLeft(0);
          return;
        }
        const recovered = await recoverSubmittedSection();
        if (recovered || !mounted) return;
        const message = getOverallSectionTimerErrorMessage(error);
        setSectionTimerError(message);
        toast.error(message);
      } finally {
        if (mounted) setSectionTimerLoading(false);
      }
    };

    void startTimer();
    return () => {
      mounted = false;
    };
  }, [recoverSubmittedSection, test, testId, timerRetryKey]);

  useEffect(() => {
    const matchesTest = (event: Event) =>
      (event as CustomEvent<{ testId?: string }>).detail?.testId === testId;

    const handleExpired = (event: Event) => {
      if (!matchesTest(event) || hasSubmittedRef.current) return;
      backendTimerRef.current = null;
      setSectionTimerError(null);
      setSectionTimerLoading(false);
      setTimeLeft(0);
    };
    const handleSubmitted = (event: Event) => {
      if (!matchesTest(event)) return;
      void recoverSubmittedSection();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || hasSubmittedRef.current) {
        return;
      }
      const backendRemaining = getBackendSyncedRemainingSeconds(
        backendTimerRef.current,
      );
      if (backendRemaining !== null && backendRemaining <= 0) {
        setSectionTimerError(null);
        setSectionTimerLoading(false);
        setTimeLeft(0);
      }
    };

    window.addEventListener("overall-section-time-expired", handleExpired);
    window.addEventListener("overall-section-submitted", handleSubmitted);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("overall-section-time-expired", handleExpired);
      window.removeEventListener("overall-section-submitted", handleSubmitted);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [recoverSubmittedSection, testId]);

  const submit = useCallback(async () => {
    if (
      !test ||
      submitStartedRef.current ||
      isSubmitting ||
      sectionTimerLoading ||
      sectionTimerError ||
      !draftReady
    ) {
      return;
    }
    const token = overallTestTokenStore.getByTestId(testId);
    if (!token) {
      toast.error("Yazma sınavı oturumu bulunamadı.");
      return;
    }

    submitStartedRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await draftQueueRef.current;
      if (!autoSubmitRef.current) {
        await writeDraft(latestAnswersRef.current);
      }
      const submitMode: MockSubmitMode = autoSubmitRef.current
        ? "AUTO"
        : "MANUAL";
      const submission = await writingSubmissionService.create({
        writingTestId: test.id,
        sessionToken: token,
        submitMode,
        sections: buildSubmissionSections(latestAnswersRef.current),
      });
      if (!submission?.id) {
        const recovered = await recoverSubmittedSection();
        if (recovered) return;
        throw new Error("Yazma cevabı gönderilemedi.");
      }
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;
      try {
        await finishOverallFlow(submission.id);
      } catch {
        clearProgress();
        if (getActiveFullscreenElement()) {
          try {
            await document.exitFullscreen();
          } catch {}
        }
        navigate(`/writing-test/results/${submission.id}`, { replace: true });
      }
    } catch (error) {
      const recovered = await recoverSubmittedSection();
      if (recovered) return;
      submitStartedRef.current = false;
      const message =
        error instanceof Error
          ? error.message
          : getOverallSectionTimerErrorMessage(error);
      toast.error(message || "Yazma cevabı gönderilemedi.");
      setSubmitError(message || "Yazma cevabı gönderilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    buildSubmissionSections,
    clearProgress,
    draftReady,
    finishOverallFlow,
    isSubmitting,
    navigate,
    recoverSubmittedSection,
    sectionTimerLoading,
    sectionTimerError,
    test,
    testId,
    writeDraft,
  ]);

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      sectionTimerLoading ||
      sectionTimerError ||
      !draftReady ||
      !test ||
      isSubmitting ||
      hasSubmittedRef.current ||
      (autoSubmitRef.current && !submitError) ||
      autoSubmitAttempts >= 3
    ) {
      return;
    }
    const attempt = () => {
      autoSubmitRef.current = true;
      setAutoSubmitAttempts((count) => count + 1);
      if (autoSubmitAttempts === 0) {
        toast.message("Süre bitti. Son cevabınız kaydedilip gönderiliyor.");
      }
      void submit();
    };
    if (autoSubmitAttempts === 0) {
      attempt();
      return;
    }
    const timeout = window.setTimeout(attempt, 2000 * 2 ** (autoSubmitAttempts - 1));
    return () => window.clearTimeout(timeout);
  }, [
    autoSubmitAttempts,
    draftReady,
    isSubmitting,
    sectionTimerError,
    sectionTimerLoading,
    submit,
    submitError,
    test,
    timeLeft,
  ]);

  const showAnswerLimitWarning = () => {
    if (!currentQuestion) return;
    if (answerLimitWarningQuestionRef.current !== currentQuestion.id) {
      toast.warning("Yazı sınırına ulaştınız.");
      answerLimitWarningQuestionRef.current = currentQuestion.id;
    }
    setAnswerLimitNoticeQuestionId(currentQuestion.id);
    if (answerLimitNoticeTimeoutRef.current !== null) {
      window.clearTimeout(answerLimitNoticeTimeoutRef.current);
    }
    answerLimitNoticeTimeoutRef.current = window.setTimeout(() => {
      setAnswerLimitNoticeQuestionId(null);
      answerLimitNoticeTimeoutRef.current = null;
    }, 4_000);
  };

  const updateCurrentAnswer = (value: string) => {
    if (!currentQuestion || writingLocked) return;
    const proposedWordCount = countWritingWords(value);
    const storedLockLimit = answerLimitLockByQuestionRef.current.get(
      currentQuestion.id,
    );
    if (
      storedLockLimit !== currentAnswerLimits.wordLimit ||
      currentWordCount < currentAnswerLimits.wordLimit
    ) {
      answerLimitLockByQuestionRef.current.delete(currentQuestion.id);
    }
    const isLockedAtLimit =
      answerLimitLockByQuestionRef.current.get(currentQuestion.id) ===
      currentAnswerLimits.wordLimit;
    const rejectNewContent =
      isLockedAtLimit &&
      value.length > currentAnswer.length &&
      proposedWordCount >= currentAnswerLimits.wordLimit;
    const limited = rejectNewContent
      ? { value: currentAnswer, wasLimited: true }
      : limitWritingAnswer(value, currentAnswerLimits);
    if (limited.wasLimited) {
      answerLimitLockByQuestionRef.current.set(
        currentQuestion.id,
        currentAnswerLimits.wordLimit,
      );
      showAnswerLimitWarning();
    } else if (proposedWordCount < currentAnswerLimits.wordLimit) {
      answerLimitLockByQuestionRef.current.delete(currentQuestion.id);
      answerLimitWarningQuestionRef.current = null;
    } else if (/\s$/u.test(value)) {
      answerLimitLockByQuestionRef.current.set(
        currentQuestion.id,
        currentAnswerLimits.wordLimit,
      );
    }
    pendingQuestionIdsRef.current.add(currentQuestion.id);
    const next = {
      ...latestAnswersRef.current,
      [currentQuestion.id]: limited.value,
    };
    latestAnswersRef.current = next;
    setAnswers(next);
  };

  const handleAnswerBeforeInput = (event: FormEvent<HTMLTextAreaElement>) => {
    if (!currentQuestion || writingLocked) return;
    const inputType = (event.nativeEvent as InputEvent).inputType || "";
    if (!inputType.startsWith("insert") || inputType === "insertFromPaste") {
      return;
    }
    const isLockedAtCurrentLimit =
      answerLimitLockByQuestionRef.current.get(currentQuestion.id) ===
      currentAnswerLimits.wordLimit;
    if (!isLockedAtCurrentLimit) return;
    event.preventDefault();
    showAnswerLimitWarning();
  };

  const handleAnswerPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!currentQuestion || writingLocked) return;
    const pastedText = event.clipboardData.getData("text");
    const start = event.currentTarget.selectionStart ?? currentAnswer.length;
    const end = event.currentTarget.selectionEnd ?? currentAnswer.length;
    const candidate =
      currentAnswer.slice(0, start) + pastedText + currentAnswer.slice(end);
    const limited = limitWritingAnswer(candidate, currentAnswerLimits);
    if (!limited.wasLimited && countWritingWords(candidate) < currentAnswerLimits.wordLimit) return;

    event.preventDefault();
    updateCurrentAnswer(candidate);
    if (countWritingWords(candidate) >= currentAnswerLimits.wordLimit) {
      answerLimitLockByQuestionRef.current.set(
        currentQuestion.id,
        currentAnswerLimits.wordLimit,
      );
    }
    window.requestAnimationFrame(() => {
      const nextCaret = Math.min(start + pastedText.length, limited.value.length);
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const {
    cancelPendingLongPress,
    handleLongPressKeyDown,
    handleLongPressKeyUp,
    lastLongPressCharacter,
  } = useWritingTurkishLongPressInput({
    textareaRef,
    contextKey: currentQuestion?.id ?? null,
    disabled: writingLocked || writingInputMode !== "long-press",
    onValueChange: updateCurrentAnswer,
  });

  const insertCharacter = (character: string) => {
    cancelPendingLongPress();
    if (!currentQuestion || writingLocked) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? currentAnswer.length;
    const end = textarea?.selectionEnd ?? currentAnswer.length;
    const nextValue =
      currentAnswer.slice(0, start) + character + currentAnswer.slice(end);
    updateCurrentAnswer(nextValue);
    window.requestAnimationFrame(() => {
      const nextCaret = start + character.length;
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      textareaRef.current?.focus();
    });
  };

  const goToTask = (index: number) => {
    cancelPendingLongPress();
    setCurrentTaskIndex(Math.min(tasks.length - 1, Math.max(0, index)));
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white text-sm text-[#5f5e5a]">
        Yazma testi hazırlanıyor...
      </div>
    );
  }

  if (loadError || !test || !currentTask || !currentQuestion) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#242424]">
            Yazma testi açılamadı
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6f6d67]">
            {loadError || "Test yapısı eksik."}
          </p>
          <Button
            className="mt-5 bg-[#37352f] text-white hover:bg-[#242424]"
            onClick={() => navigate("/app/test")}
          >
            Testlere dön
          </Button>
        </div>
      </div>
    );
  }

  const typographyPreset = getWritingTypographyPreset(fontScale);
  const selectedFontScale = typographyPreset.menuValue;
  const taskSectionLabel = getWritingTaskSectionLabel(currentTask.taskCode);

  return (
    <div
      className="notranslate flex h-dvh min-h-0 flex-col overflow-hidden bg-white font-sans text-[#37352f]"
      translate="no"
      data-exam-translation="disabled"
      style={{
        color: "#37352f",
        fontOpticalSizing: "auto",
        ...typographyPreset.style,
      }}
    >
      <header className="z-50 shrink-0 border-b border-[#e5e5e2] bg-white">
        <div className="grid h-[60px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-10 w-auto shrink-0 object-contain"
            />
            <span aria-hidden="true" className="h-5 w-px bg-[#dededb]" />
            <span className="truncate text-[17px] font-semibold">Yazma</span>
          </div>

          <div
            className={`justify-self-center rounded-md border border-[#e5e5e2] bg-[#f7f7f5] px-3 py-1.5 text-sm font-semibold tabular-nums ${
              timeLeft <= 300 ? "animate-pulse text-red-700" : "text-black"
            }`}
          >
            {sectionTimerLoading ? "--:--" : formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-3 justify-self-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#37352f]"
                  aria-label="Yazı boyutu"
                  title="Yazı boyutu"
                >
                  <ALargeSmall className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 border-[#dededb] bg-white text-[#37352f]"
              >
                <DropdownMenuRadioGroup
                  value={selectedFontScale}
                  onValueChange={(value) => setFontScale(Number(value))}
                >
                  <DropdownMenuRadioItem value="0.9">
                    Küçük
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="1">
                    Standart
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="1.1">
                    Büyük
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => void exitExamFullscreen()}
              disabled={!isFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:cursor-default disabled:opacity-45"
              aria-label="Tam ekrandan çık"
              title="Tam ekrandan çık"
            >
              <Minimize2 className="h-4 w-4" />
            </button>

            <Button
              onClick={() => setShowSubmitModal(true)}
              disabled={!draftReady || sectionTimerLoading || Boolean(sectionTimerError) || isSubmitting || timeLeft <= 0}
              className="min-h-[34px] bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? "GÖNDERİLİYOR" : "GÖNDER"}
            </Button>
          </div>
        </div>
      </header>

      {draftLoadError && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#e5e5e2] bg-[#fffdf7] px-5 py-3 text-sm">
          <p>Kayıtlı yanıtınız yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin. Sınav süresi devam ediyor.</p>
          <Button type="button" variant="outline" onClick={() => setDraftRetryKey((key) => key + 1)}>
            Taslağı tekrar yükle
          </Button>
        </div>
      )}

      {submitError && timeLeft <= 0 && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#e5e5e2] bg-[#fffdf7] px-5 py-3 text-sm">
          <p>
            Cevabınız gönderilemedi. Tarayıcıdaki yanıtınız korunuyor.
            {autoSubmitAttempts < 3 ? " Bağlantı yeniden denenecek." : " Bağlantınızı kontrol edip tekrar deneyin."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              setAutoSubmitAttempts(3);
              autoSubmitRef.current = true;
              void submit();
            }}
          >
            Gönderimi tekrar dene
          </Button>
        </div>
      )}

      <section className="shrink-0 border-b border-[#e5e5e2] bg-white px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="reading-part-heading">{taskSectionLabel}</h1>
            {showDescription && (
              <p className="reading-part-description mt-0.5">
                {currentTask.taskCode !== "TASK_2"
                  ? `${currentTask.label} · `
                  : ""}
                {getWritingStudentTaskMetadata(currentTask)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowDescription((visible) => !visible)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
            aria-label={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
            title={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
          >
            {showDescription ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </section>

      {sectionTimerError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h2 className="text-lg font-semibold text-[#242424]">
              Sınav oturumu açılamadı
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6d67]">
              {sectionTimerError}
            </p>
            <Button
              type="button"
              className="mt-5 bg-[#37352f] text-white hover:bg-[#242424]"
              onClick={() => setTimerRetryKey((key) => key + 1)}
            >
              Tekrar dene
            </Button>
          </div>
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <ResizablePanel
            defaultSize={47}
            minSize={35}
            maxSize={62}
            className="min-h-0 bg-white"
          >
            <div className="h-full overflow-y-auto px-8 py-7">
              <div className="mx-auto max-w-3xl">
                {currentTask.taskCode !== "TASK_2" && (
                  <>
                    {test.instruction?.trim() && (
                      <section className="mb-5 border-l-2 border-[#c9c8c4] pl-4">
                        <p className="reading-passage-copy font-normal text-[#242424]">
                          {test.instruction.trim()}
                        </p>
                      </section>
                    )}

                    <section aria-labelledby="writing-source-email-title">
                      <h2
                        id="writing-source-email-title"
                        className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#37352f]"
                      >
                        <span
                          aria-hidden="true"
                          className="text-[15px] leading-none"
                        >
                          ✉️
                        </span>
                        Gelen e-posta
                      </h2>
                      <WritingRichText
                        document={test.sourceEmail}
                        className="reading-passage-copy box-border w-full rounded-[4px] border border-[#cececa] bg-white px-4 py-3 font-normal text-[#242424]"
                      />
                    </section>
                  </>
                )}

                <section
                  aria-labelledby="writing-task-prompt-title"
                  className={`${
                    currentTask.taskCode === "TASK_2"
                      ? ""
                      : "mt-7 border-t border-[#dededb] pt-5"
                  }`}
                >
                  <h2
                    id="writing-task-prompt-title"
                    className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#37352f]"
                  >
                    {currentTask.taskCode === "TASK_2"
                      ? "Konu"
                      : "Sizden istenen"}
                  </h2>
                  <WritingRichText
                    document={currentTask.promptJson}
                    spacing={
                      currentTask.taskCode === "TASK_2" ? "roomy" : "default"
                    }
                    boxQuotedParagraph={currentTask.taskCode === "TASK_2"}
                    className="reading-passage-copy font-normal text-[#242424]"
                  />
                </section>
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          <ResizablePanel
            defaultSize={53}
            minSize={38}
            className="min-h-0 bg-[#fbfbfa]"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e2] px-6 py-3">
                <div>
                  <h2
                    className="font-semibold text-[#242424]"
                    style={{
                      fontSize:
                        "calc(var(--reading-question-size, 16px) * var(--reading-font-scale, 1))",
                      lineHeight:
                        "calc(var(--reading-question-line-height, 24px) * var(--reading-font-scale, 1))",
                    }}
                  >
                    Cevabınız
                  </h2>
                  <p
                    className={`mt-0.5 text-[13px] tabular-nums ${
                      currentWordCount === 0
                        ? "text-[#9b9a97]"
                        : currentWordCount < currentTask.wordMin ||
                            currentWordCount > currentTask.wordMax
                          ? "text-[#92400e]"
                          : "text-[#166534]"
                    }`}
                  >
                    {currentWordCount} /{" "}
                    {getWritingWordTargetLabel(currentTask)}
                  </p>
                  {answerLimitNoticeQuestionId === currentQuestion.id && (
                    <p role="alert" className="mt-0.5 text-[12px] font-medium text-[#92400e]">
                      Yazı sınırına ulaştınız. Devam etmek için metni kısaltın.
                    </p>
                  )}
                </div>

                <div
                  className="flex items-center gap-1 rounded-md border border-[#dededb] bg-white p-0.5"
                  aria-label="Türkçe karakterler"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCharacterCase((current) =>
                        current === "lower" ? "upper" : "lower",
                      )
                    }
                    disabled={writingLocked}
                    aria-pressed={characterCase === "upper"}
                    className="flex h-7 min-w-9 items-center justify-center rounded px-1.5 text-[12px] font-semibold text-[#5f5e5a] hover:bg-[#efefed] hover:text-[#242424] disabled:opacity-40"
                    title={
                      characterCase === "lower"
                        ? "Büyük harfleri göster"
                        : "Küçük harfleri göster"
                    }
                  >
                    a/A
                  </button>
                  <span
                    className="mx-0.5 h-4 w-px bg-[#dededb]"
                    aria-hidden="true"
                  />
                  {TURKISH_CHARACTER_SHORTCUTS.map((shortcut) => {
                    const character = shortcut[characterCase];
                    const isLongPressFeedback =
                      lastLongPressCharacter === character;
                    return (
                      <button
                        key={character}
                        type="button"
                        onClick={() => insertCharacter(character)}
                        disabled={writingLocked}
                        className={`flex h-7 min-w-7 items-center justify-center rounded px-1 text-[14px] font-medium transition-colors disabled:opacity-40 ${
                          isLongPressFeedback
                            ? "bg-[#e2f2dc] text-[#245c2a]"
                            : "text-[#5f5e5a] hover:bg-[#efefed] hover:text-[#242424]"
                        }`}
                        title={writingInputMode === "long-press"
                          ? `${character} ekle — klavyede ${shortcut.key.toLocaleLowerCase("tr-TR")} harfini basılı tutun`
                          : `${character} ekle`}
                      >
                        {character}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-[#f7f7f5] p-3">
                <textarea
                  ref={textareaRef}
                  value={currentAnswer}
                  maxLength={currentAnswerLimits.characterLimit}
                  onBeforeInput={handleAnswerBeforeInput}
                  onChange={(event) => updateCurrentAnswer(event.target.value)}
                  onPaste={handleAnswerPaste}
                  onKeyDown={handleLongPressKeyDown}
                  onKeyUp={handleLongPressKeyUp}
                  onBlur={cancelPendingLongPress}
                  onPointerDown={cancelPendingLongPress}
                  onCompositionStart={cancelPendingLongPress}
                  disabled={writingLocked}
                  spellCheck={false}
                  autoCapitalize="sentences"
                  aria-label={`${currentTask.label} cevap alanı`}
                  placeholder="Cevabınızı buraya yazın..."
                  className="reading-passage-copy h-full w-full resize-none rounded-md border border-[#dededb] bg-white px-7 py-6 font-normal text-[#242424] outline-none transition-colors placeholder:text-[#b4b4b0] focus:border-[#b4b4b0] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <nav className="z-40 grid h-[64px] shrink-0 grid-cols-[1fr_auto] items-center border-t border-[#dededb] bg-white px-4">
        <div className="flex min-w-0 items-center gap-2">
          {tasks.map((task, index) => {
            const question = task.questions?.[0];
            const completed = Boolean(
              question && String(answers[question.id] || "").trim(),
            );
            const active = index === currentTaskIndex;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => goToTask(index)}
                className={`flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-[#eeeeec] text-[#242424]"
                    : "text-[#6f6d67] hover:bg-[#f7f7f5] hover:text-[#37352f]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full border ${
                    completed
                      ? "border-[#5f5e5a] bg-[#5f5e5a]"
                      : "border-[#b4b4b0] bg-white"
                  }`}
                />
                {getWritingTaskShortLabel(task.taskCode)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToTask(currentTaskIndex - 1)}
            disabled={currentTaskIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dededb] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] disabled:opacity-35"
            aria-label="Önceki görev"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToTask(currentTaskIndex + 1)}
            disabled={currentTaskIndex === tasks.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dededb] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] disabled:opacity-35"
            aria-label="Sonraki görev"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {(showFullscreenPrompt || !isFullscreen) && !hasSubmittedRef.current && (
        <div
          className="fixed inset-0 z-[100] hidden items-center justify-center bg-white/95 px-4 backdrop-blur-[2px] lg:flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="writing-fullscreen-title"
        >
          <div className="w-full max-w-sm border border-[#dededb] bg-white p-6 text-center shadow-lg">
            <Maximize2 className="mx-auto h-5 w-5 text-[#5f5e5a]" />
            <h2
              id="writing-fullscreen-title"
              className="mt-3 text-[17px] font-semibold text-[#37352f]"
            >
              Tam ekrana dön
            </h2>
            <p className="mt-1 text-sm text-[#6f6d67]">
              Sınav süresi devam ediyor.
            </p>
            <Button
              type="button"
              onClick={() => void requestExamFullscreen(true)}
              className="mt-5 h-9 bg-[#37352f] px-4 text-sm font-semibold text-white hover:bg-[#242320]"
            >
              Tam ekrana dön
            </Button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={() => {
          setShowSubmitModal(false);
          void submit();
        }}
        title="Yazma Sınavını Gönder"
        message="Cevaplarınızı göndermek istediğinizden emin misiniz? Gönderdikten sonra değişiklik yapamazsınız."
        confirmText="Evet, Gönder"
        cancelText="İptal"
        isLoading={isSubmitting}
      />
    </div>
  );
}
