import { useCallback, useEffect, useRef, useState } from "react";
import officialReadingInstructions from "@/data/official-reading-instructions.json";
import { isMobilePresentation, useMobilePresentation } from "@/hooks/use-mobile-presentation";
import { useNavigate } from "react-router-dom";
import {
  createBackendSyncedTimerState,
  getBackendSyncedRemainingSeconds,
  getOverallSectionTimerErrorMessage,
  getOverallSectionTimerErrorCode,
  overallTestFlowStore,
  overallTestService,
  overallTestTokenStore,
  type BackendSyncedTimerState,
  type MockSubmitMode,
} from "@/services/overallTest.service";
import { Button } from "../ui/button";
import { ConfirmationModal } from "../ui/confirmation-modal";
import {
  readingSubmissionService,
  readingTestService,
  type ReadingTestItem,
} from "@/services/readingTest.service";
import { ReadingNotesProvider, textAnnotationScope, annotationFingerprint } from "@/contexts/ReadingNotesContext";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart3 from "./ui/ReadingPart3";
import ReadingPart4 from "./ui/ReadingPart4";
import ReadingPart5 from "./ui/ReadingPart5";
import NotesPanel from "./NotesPanel";
import { getReadingTypographyPreset } from "./reading-typography";
import { toast } from "sonner";
import {
  ALargeSmall,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useOverallSectionHeartbeat } from "@/hooks/use-overall-section-heartbeat";

interface ReadingProgressSnapshot {
  sessionToken?: string | null;
  pendingAnswers?: Record<string, string>;
  currentPartNumber: number;
  answers: Record<string, string>;
  timeLeft: number;
  showDescription: boolean;
  fontScale: number;
  updatedAt: number;
}

import {
  activateMobileExamPresentation,
  clearMobileExamPresentation,
  getMobileExamPresentationElement,
} from "@/utils/examFullscreen";

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

const getActiveFullscreenElement = () => {
  if (typeof document === "undefined") return null;
  const fullscreenDocument = document as FullscreenDocument;
  return (
    document.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.msFullscreenElement ||
    getMobileExamPresentationElement() ||
    null
  );
};

export default function ReadingPage({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const mobile = useMobilePresentation();
  useOverallSectionHeartbeat(testId);
  const TOTAL_TIME = 60 * 60;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionTimerLoading, setSectionTimerLoading] = useState(false);
  const [sectionTimerError, setSectionTimerError] = useState<string | null>(null);
  const [timerRetryKey, setTimerRetryKey] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState(false);
  const [draftRetryKey, setDraftRetryKey] = useState(0);
  const [draftAcknowledgement, setDraftAcknowledgement] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSubmitAttempts, setAutoSubmitAttempts] = useState(0);
  const [, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showDescription, setShowDescription] = useState(() => !isMobilePresentation());
  const [fontScale, setFontScale] = useState(1);
  const [showAllQuestionNumbers, setShowAllQuestionNumbers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    Boolean(getActiveFullscreenElement()),
  );
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(
    () => !getActiveFullscreenElement(),
  );
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number | null>(null);
  const hasRestoredProgressRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const acceptedResultIdRef = useRef<string | null>(null);
  const submitStartedRef = useRef(false);
  const hasOverallTimerRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const backendTimerRef = useRef<BackendSyncedTimerState | null>(null);
  const draftLoadedRef = useRef(false);
  const latestAnswersRef = useRef<Record<string, string>>({});
  const editedAnswersRef = useRef<Record<string, string>>({});
  const pendingAnswersRef = useRef<Record<string, string>>({});
  const localProgressRef = useRef<Partial<ReadingProgressSnapshot> | null>(null);
  const draftNeedsSaveRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const lifecycleRef = useRef(0);
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const fullscreenWasActiveRef = useRef(false);
  const progressStorageKey = `reading_progress_${testId}`;

  useEffect(() => {
    lifecycleRef.current += 1;
    return () => { lifecycleRef.current += 1; };
  }, [testId]);

  const recoverSubmittedSection = useCallback(async (): Promise<boolean> => {
    if (hasSubmittedRef.current) return true;
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;
    const lifecycle = lifecycleRef.current;
    const recovery = (async () => {
      const overallId = overallTestFlowStore.getOverallId();
      if (!overallId) return false;
      try {
        const recovered = await readingSubmissionService.getSessionResult(overallId, testId);
        if (!recovered || lifecycleRef.current !== lifecycle) return false;
        hasSubmittedRef.current = true;
        acceptedResultIdRef.current = recovered.resultId;
        submitStartedRef.current = true;
        setSectionTimerError(null);
        setDraftLoadError(false);
        setSubmitError(null);
        try {
          sessionStorage.removeItem(progressStorageKey);
          sessionStorage.removeItem(`reading_answers_${testId}`);
        } catch {}
        if (recovered.overallCompleted) {
          overallTestFlowStore.markCompleted();
          navigate(`/overall-results/${recovered.overallTestId}`, { replace: true });
          return true;
        }
        const nextPath = overallTestFlowStore.onTestCompleted("READING", testId);
        if (nextPath) {
          navigate(nextPath, { replace: true });
          return true;
        }
        if (overallTestFlowStore.isAllDone()) {
          const completed = await overallTestService.complete(overallId).catch(() => false);
          if (lifecycleRef.current !== lifecycle) return false;
          if (completed) {
            overallTestFlowStore.markCompleted();
            navigate(`/overall-results/${overallId}`, { replace: true });
            return true;
          }
        }
        navigate(`/reading-test/results/${recovered.resultId}`, { replace: true });
        return true;
      } catch {
        return false;
      }
    })();
    recoveryPromiseRef.current = recovery;
    try { return await recovery; }
    finally { recoveryPromiseRef.current = null; }
  }, [navigate, progressStorageKey, testId]);

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
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      else if (root.msRequestFullscreen) await root.msRequestFullscreen();
      else throw new Error("Fullscreen API unavailable");

      if (!getActiveFullscreenElement() && !activateMobileExamPresentation()) {
        if (notifyFailure) {
          toast.error("Tam ekran açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.");
        }
        return false;
      }

      fullscreenWasActiveRef.current = true;
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      return true;
    } catch {
      if (activateMobileExamPresentation()) {
        fullscreenWasActiveRef.current = true;
        setIsFullscreen(true);
        setShowFullscreenPrompt(false);
        return true;
      }
      if (notifyFailure) {
        toast.error("Tam ekran açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.");
      }
      return false;
    }
  }, []);

  const exitExamFullscreen = useCallback(async () => {
    if (getMobileExamPresentationElement()) {
      clearMobileExamPresentation();
      setIsFullscreen(false);
      setShowFullscreenPrompt(true);
      return;
    }
    if (!getActiveFullscreenElement()) return;
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
    if (sectionTimerLoading) return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const backendRemaining = getBackendSyncedRemainingSeconds(backendTimerRef.current);
        return backendRemaining === null ? (prev > 0 ? prev - 1 : 0) : Math.min(prev, backendRemaining);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sectionTimerLoading]);

  useEffect(() => {
    autoSubmitRef.current = false;
    hasSubmittedRef.current = false;
    acceptedResultIdRef.current = null;
    submitStartedRef.current = false;
    draftLoadedRef.current = false;
    editedAnswersRef.current = {};
    draftNeedsSaveRef.current = false;
    setDraftReady(false);
    setDraftLoadError(false);
    setSubmitError(null);
    setAutoSubmitAttempts(0);
    draftSaveQueueRef.current = Promise.resolve();
    setDraftStatus("idle");
  }, [testId]);

  useEffect(() => {
    let mounted = true;
    const hasOverallToken = !!overallTestTokenStore.getByTestId(testId);
    hasOverallTimerRef.current = hasOverallToken;
    backendTimerRef.current = null;
    if (!hasOverallToken) {
      // A successful section POST clears its token. A refreshed page may still
      // have cached questions while overall finalization needs recovery.
      setSectionTimerLoading(true);
      setSectionTimerError(null);
      void recoverSubmittedSection().then((recovered) => {
        if (mounted && !recovered && overallTestFlowStore.getOverallId()) {
          setSectionTimerError("Sınav durumunuz doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.");
        }
      }).finally(() => {
        if (mounted) setSectionTimerLoading(false);
      });
      return () => { mounted = false; };
    }

    setSectionTimerLoading(true);
    setSectionTimerError(null);
    overallTestService
      .startSectionTimerForTest(testId)
      .then(async (timer) => {
        if (!mounted || !timer) return;
        if (timer.status === "SUBMITTED" && await recoverSubmittedSection()) return;
        const timerState = createBackendSyncedTimerState(timer);
        backendTimerRef.current = timerState;
        setTimeLeft(getBackendSyncedRemainingSeconds(timerState) ?? timerState.initialRemainingSeconds);
      })
      .catch(async (error) => {
        if (!mounted) return;
        const recovered = await recoverSubmittedSection();
        if (recovered || !mounted) return;
        if (getOverallSectionTimerErrorCode(error) === "TEST_TIME_EXPIRED") {
          setSectionTimerError(null);
          setTimeLeft(0);
          return;
        }
        const message = getOverallSectionTimerErrorMessage(error);
        setSectionTimerError(message);
        toast.error(message);
      })
      .finally(() => {
        if (mounted) setSectionTimerLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [testId, recoverSubmittedSection, timerRetryKey]);

  useEffect(() => {
    const matchesTest = (event: Event) => (event as CustomEvent<{ testId?: string }>).detail?.testId === testId;
    const handleExpired = (event: Event) => {
      if (!matchesTest(event)) return;
      setSectionTimerError(null);
      setSectionTimerLoading(false);
      setTimeLeft(0);
    };
    const handleSubmitted = (event: Event) => {
      if (matchesTest(event)) void recoverSubmittedSection();
    };
    window.addEventListener("overall-section-time-expired", handleExpired);
    window.addEventListener("overall-section-submitted", handleSubmitted);
    return () => {
      window.removeEventListener("overall-section-time-expired", handleExpired);
      window.removeEventListener("overall-section-submitted", handleSubmitted);
    };
  }, [recoverSubmittedSection, testId]);

  const normalizeRestoredAnswers = (value: unknown): Record<string, string> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const output: Record<string, string> = {};
    for (const [questionId, raw] of Object.entries(value as Record<string, unknown>)) {
      const key = String(questionId || "").trim();
      if (!key) continue;
      const answer = Array.isArray(raw) ? raw[0] : raw;
      const normalized = String(answer ?? "").trim();
      output[key] = normalized;
    }
    return output;
  };

  const getCurrentOverallToken = useCallback(() => {
    return overallTestTokenStore.getByTestId(testData?.id || testId) || null;
  }, [testData?.id, testId]);

  const writeReadingDraft = useCallback(
    async (token: string, nextAnswers: Record<string, string>, revision: number) => {
      setDraftStatus("saving");
      const result = await readingSubmissionService.saveDraft(token, nextAnswers);
      if (result?.saved) {
        if (revision === draftRevisionRef.current) {
          pendingAnswersRef.current = {};
        }
        setDraftAcknowledgement((value) => value + 1);
        setDraftStatus("saved");
        return result;
      }
      setDraftStatus("error");
      return null;
    },
    [],
  );

  const persistReadingDraft = useCallback(
    async (nextAnswers: Record<string, string>) => {
      const token = getCurrentOverallToken();
      if (!token || !draftLoadedRef.current || hasSubmittedRef.current || autoSubmitRef.current) return null;
      return writeReadingDraft(token, nextAnswers, draftRevisionRef.current);
    },
    [getCurrentOverallToken, writeReadingDraft],
  );

  const queueReadingDraft = useCallback(
    (nextAnswers: Record<string, string>) => {
      const token = getCurrentOverallToken();
      if (
        !token ||
        !draftLoadedRef.current ||
        hasSubmittedRef.current ||
        autoSubmitRef.current ||
        sectionTimerLoading ||
        sectionTimerError ||
        (hasOverallTimerRef.current && (timeLeft <= 0 ||
          (getBackendSyncedRemainingSeconds(backendTimerRef.current) ?? 1) <= 0))
      ) {
        return;
      }

      const revision = draftRevisionRef.current;
      const queuedWrite = draftSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await writeReadingDraft(token, nextAnswers, revision);
        });
      draftSaveQueueRef.current = queuedWrite.catch(() => undefined);
    },
    [
      getCurrentOverallToken,
      sectionTimerError,
      sectionTimerLoading,
      timeLeft,
      writeReadingDraft,
    ],
  );

  useEffect(() => {
    // Timer initialization must not cancel an in-flight restore. Only changing
    // the actual test (or explicitly retrying a failed load) replaces this read.
    const token = overallTestTokenStore.getByTestId(testId);
    if (!token) {
      draftLoadedRef.current = true;
      setDraftReady(true);
      return;
    }
    let mounted = true;
    setDraftLoadError(false);
    readingSubmissionService.getDraft(token)
      .then((draft) => {
        if (!mounted) return;
        if (!draft) throw new Error("Reading draft unavailable");
        const restored = normalizeRestoredAnswers(draft.answers);
        const local = localProgressRef.current;
        const serverSavedAt = draft.lastSavedAt ? Date.parse(draft.lastSavedAt) : 0;
        const keepLocal = Number(local?.updatedAt || 0) > (serverSavedAt || 0);
        const localAnswers = local?.pendingAnswers
          ? normalizeRestoredAnswers(local.pendingAnswers)
          : keepLocal ? normalizeRestoredAnswers(local?.answers) : {};
        pendingAnswersRef.current = { ...localAnswers, ...editedAnswersRef.current };
        const merged = { ...restored, ...pendingAnswersRef.current };
        latestAnswersRef.current = merged;
        draftRevisionRef.current += 1;
        draftNeedsSaveRef.current = Object.keys(pendingAnswersRef.current).length > 0;
        setAnswers(merged);
        draftLoadedRef.current = true;
        setDraftReady(true);
        setDraftStatus("saved");
      })
      .catch(() => {
        if (!mounted) return;
        setDraftLoadError(true);
        setDraftStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [testId, draftRetryKey]);

  useEffect(() => {
    if (!draftReady || sectionTimerLoading || sectionTimerError || !draftNeedsSaveRef.current) return;
    queueReadingDraft(latestAnswersRef.current);
    draftNeedsSaveRef.current = false;
  }, [draftReady, sectionTimerLoading, sectionTimerError, queueReadingDraft]);

  // Keep the exam route locked and recover cleanly when fullscreen is left.
  useEffect(() => {
    let disposed = false;
    const addNavigationLock = () => {
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    };

    const handleFullscreenChange = () => {
      const active = Boolean(getActiveFullscreenElement());
      setIsFullscreen(active);

      if (active) {
        fullscreenWasActiveRef.current = true;
        setShowFullscreenPrompt(false);
        return;
      }

      if (!hasSubmittedRef.current) {
        setShowFullscreenPrompt(true);
      }
    };

    const cleanup = addNavigationLock();
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
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      cleanup?.();

      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && getActiveFullscreenElement()) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
    };
  }, [requestExamFullscreen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        
        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_READING_${testId}`);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          if (mounted) {
            setTestData(data);
            setIsLoading(false);
          }
          return;
        }

        // Fallback to API call if no cached data
        const data = await readingTestService.getTestWithFullData(testId);
        if (!mounted) return;
        if (!data) {
          if (await recoverSubmittedSection()) return;
          throw new Error("Okuma testi yüklenemedi.");
        }
        if (mounted) {
          setTestData(data);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load reading test");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [testId, recoverSubmittedSection]);

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    let parsed: Partial<ReadingProgressSnapshot> | null = null;
    try {
      const raw = sessionStorage.getItem(progressStorageKey);
      if (raw) parsed = JSON.parse(raw) as Partial<ReadingProgressSnapshot>;
    } catch {}

    const sessionToken = overallTestTokenStore.getByTestId(testId) || null;
    if (parsed?.sessionToken !== sessionToken) parsed = null;
    localProgressRef.current = parsed;
    pendingAnswersRef.current = normalizeRestoredAnswers(parsed?.pendingAnswers);
    latestAnswersRef.current = normalizeRestoredAnswers(parsed?.answers);
    setAnswers(latestAnswersRef.current);
    if (parsed && typeof parsed === "object") {
      const restoredPart = Number(parsed.currentPartNumber);
      if (Number.isFinite(restoredPart)) {
        setCurrentPartNumber(Math.min(5, Math.max(1, Math.round(restoredPart))));
      }


      const restoredTimeLeft = Number(parsed.timeLeft);
      if (Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.min(TOTAL_TIME, Math.round(restoredTimeLeft))));
      }

      if (typeof parsed.showDescription === "boolean") {
        setShowDescription(parsed.showDescription);
      }

      const restoredFontScale = Number(parsed.fontScale);
      if (Number.isFinite(restoredFontScale)) {
        setFontScale(Math.min(1.2, Math.max(0.9, Math.round(restoredFontScale * 100) / 100)));
      }
    }

    hasRestoredProgressRef.current = true;
  }, [progressStorageKey, TOTAL_TIME]);

  useEffect(() => {
    if (!hasRestoredProgressRef.current || hasSubmittedRef.current) return;
    const snapshot: ReadingProgressSnapshot = {
      sessionToken: overallTestTokenStore.getByTestId(testId) || null,
      pendingAnswers: { ...pendingAnswersRef.current },
      currentPartNumber,
      answers,
      timeLeft,
      showDescription,
      fontScale,
      updatedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [progressStorageKey, currentPartNumber, answers, timeLeft, showDescription, fontScale, draftAcknowledgement, testId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const clearReadingProgress = () => {
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
  };

  // Preserve the recovery copy on navigation/reload. It is removed only after
  // the section has been accepted and its result route is available.
  const isReadingExpired = () => {
    if (!hasOverallTimerRef.current) return false;
    const remaining = getBackendSyncedRemainingSeconds(backendTimerRef.current);
    return timeLeft <= 0 || (remaining !== null && remaining <= 0);
  };

  const handleSubmit = async () => {
    const expired = isReadingExpired();
    if (
      !testData || submitStartedRef.current || isSubmitting ||
      sectionTimerLoading || sectionTimerError || (!draftReady && !expired)
    ) return;
    if (expired && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      setAutoSubmitAttempts((count) => Math.max(1, count));
    }
    submitStartedRef.current = true;
    setSubmitError(null);
    let submittedResultId = acceptedResultIdRef.current;
    try {
      setIsSubmitting(true);
      await draftSaveQueueRef.current;
      const submissionAnswers = { ...latestAnswersRef.current };
      // The deadline may pass while queued saves finish. Never write a new
      // draft on an expired retry; AUTO uses the server's accepted draft.
      if (isReadingExpired() && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        setAutoSubmitAttempts((count) => Math.max(1, count));
      }

      // Once accepted, retry only navigation/overall finalization. The submit
      // service has cleared the token and removed answers must stay removed.
      if (testData?.id && !hasSubmittedRef.current) {
        const answersData = {
          testId: testData.id,
          answers: submissionAnswers,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem(`reading_answers_${testData.id}`, JSON.stringify(answersData));

        const overallToken = overallTestTokenStore.getByTestId(testData.id);
        if (overallToken) {
          if (!autoSubmitRef.current) {
            await persistReadingDraft(submissionAnswers);
          }
          if (isReadingExpired() && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            setAutoSubmitAttempts((count) => Math.max(1, count));
          }
          const payload = Object.entries(submissionAnswers)
            .map(([questionId, userAnswer]) => ({
              questionId,
              userAnswer: String(userAnswer),
            }))
            .filter((item) => item.questionId);

          const submitMode: MockSubmitMode = autoSubmitRef.current ? "AUTO" : "MANUAL";
          const submitResult = await readingSubmissionService.submitAnswers(
            testData.id,
            payload,
            overallToken,
            submitMode,
          );
          hasSubmittedRef.current = true;
          submittedResultId =
            typeof submitResult?.testResultId === "string"
              ? submitResult.testResultId
              : null;
          acceptedResultIdRef.current = submittedResultId;
          try { sessionStorage.removeItem(`reading_answers_${testData.id}`); } catch {}
        }
      }

      const nextPath = overallTestFlowStore.onTestCompleted("READING", testData?.id || "");
      if (nextPath) {
        // Ensure exam mode and fullscreen stay active for next test
        if (nextPath !== "/overall-section-ready" && typeof document !== "undefined") {
          document.body.classList.add("exam-mode");
          // Immediately re-enter fullscreen before navigation
          const enterFullscreen = async () => {
            try {
              const el: any = document.documentElement as any;
              if (el.requestFullscreen) await el.requestFullscreen();
              else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
              else if (el.msRequestFullscreen) await el.msRequestFullscreen();
            } catch {}
          };
          await enterFullscreen();
        }
        clearReadingProgress();
        navigate(nextPath);
        return;
      }
      
      // If no next test, we're at the end - submit all tests
      const overallId = overallTestFlowStore.getOverallId();
      if (overallId && overallTestFlowStore.isAllDone()) {
        const submitAllOk = await submitAllTests(overallId);
        if (!submitAllOk) {
          setSubmitError("Sonuç raporu tamamlanamadı. Gönderimi tekrar deneyin.");
          return;
        }
        clearReadingProgress();
        return;
      }
      
      if (submittedResultId) {
        clearReadingProgress();
        navigate(`/reading-test/results/${submittedResultId}`);
        return;
      }

      clearReadingProgress();
      toast.info("Sonuç raporu için testi Mock Test ekranından başlatın.");
      navigate("/app/test");
    } catch (error) {
      console.error("Reading navigation error", error);
      if (await recoverSubmittedSection()) return;
      const message = getOverallSectionTimerErrorMessage(error) || "Cevaplarınız gönderilemedi. Tekrar deneyin.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      submitStartedRef.current = false;
      setIsSubmitting(false);
    }
  };

  const submitAllTests = async (overallId: string): Promise<boolean> => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
      const { speakingSubmissionService } = await import("@/services/speakingSubmission.service");
      const { overallTestTokenStore } = await import("@/services/overallTest.service");
      const failedSubmissions: string[] = [];
      const successfulSubmissions: string[] = [];

      const runWithRetries = async <T,>(
        runner: () => Promise<T>,
        isSuccess?: (value: T) => boolean,
        attempts: number = 3
      ): Promise<T> => {
        let lastError: any = null;
        let lastValue: T | null = null;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const value = await runner();
            lastValue = value;
            if (!isSuccess || isSuccess(value)) {
              return value;
            }
            lastError = new Error("Submission returned unsuccessful result");
          } catch (error) {
            lastError = error;
          }

          if (attempt < attempts) {
            await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
          }
        }

        if (lastValue !== null) {
          return lastValue;
        }
        throw lastError || new Error("Submission failed after retries");
      };
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          const rawReadingAnswers = readingData.answers;
          const payload = Array.isArray(rawReadingAnswers)
            ? rawReadingAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawReadingAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          if (!overallToken) {
            console.warn(
              "Reading submit-all without overall token; skipping mock submit without overall token:",
              readingData.testId
            );
          }
          try {
            await runWithRetries(
              () =>
                readingSubmissionService.submitAnswers(
                  readingData.testId,
                  sanitizedPayload,
                  overallToken || undefined
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Okuma (${readingData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Reading submit-all failed:", submitError);
            failedSubmissions.push(`Okuma (${readingData.testId})`);
          }
        }
      }
      
      // Submit listening test - look for listening answers from any test
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          const rawListeningAnswers = listeningData.answers;
          const payload = Array.isArray(rawListeningAnswers)
            ? rawListeningAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawListeningAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          if (!overallToken) {
            console.warn(
              "Listening submit-all without overall token; skipping mock submit without overall token:",
              listeningData.testId
            );
          }
          try {
            await runWithRetries(
              () =>
                listeningSubmissionService.submitAnswers(
                  listeningData.testId, 
                  sanitizedPayload,
                  overallToken || undefined,
                  listeningData.audioUrl,
                  listeningData.imageUrls
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Dinleme (${listeningData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Listening submit-all failed:", submitError);
            failedSubmissions.push(`Dinleme (${listeningData.testId})`);
          }
        }
      }
      
      // Submit writing test - look for writing answers from any test
      const writingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('writing_answers_'));
      for (const key of writingAnswersKeys) {
        const writingAnswers = sessionStorage.getItem(key);
        if (writingAnswers) {
          const writingData = JSON.parse(writingAnswers);
          const overallToken = overallTestTokenStore.getByTestId(writingData.testId);
          if (!overallToken) {
            console.warn(
              "Writing submit-all without overall token; skipping mock submit without overall token:",
              writingData.testId
            );
          }

          const getWritingAnswer = (
            questionId: string,
            sectionIndex: number,
            fallbackId?: string,
            itemIndex?: number
          ) => {
            const direct = writingData.answers?.[questionId];
            if (typeof direct === "string") return direct;
            const fallback = typeof fallbackId === "string" ? fallbackId : "";
            const idx = typeof itemIndex === "number" ? String(itemIndex) : "";
            const keys = [
              `${sectionIndex}-${questionId}`,
              `${sectionIndex}-${fallback}`,
              fallback,
              idx && fallback ? `${sectionIndex}-${idx}-${fallback}` : "",
              idx ? `${sectionIndex}-${idx}-${questionId}` : "",
            ].filter(Boolean);
            for (const k of keys) {
              const v = writingData.answers?.[k];
              if (typeof v === "string") return v;
            }
            return "";
          };

          const payload = {
            writingTestId: writingData.testId,
            sections: (writingData.sections || []).map((section: any, sectionIndex: number) => {
              const sectionDescription =
                (typeof section?.title === "string" && section.title.trim()) ||
                (typeof section?.description === "string" && section.description.trim()) ||
                `Section ${section?.order || sectionIndex + 1}`;
              const sectionData: any = {
                description: sectionDescription,
              };

              if (Array.isArray(section.subParts) && section.subParts.length > 0) {
                sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                  const questions = Array.isArray(subPart.questions) ? subPart.questions : [];
                  const subPartDescription =
                    (typeof subPart?.label === "string" && subPart.label.trim()) ||
                    (typeof subPart?.description === "string" && subPart.description.trim()) ||
                    `Sub Part ${subPart?.order || subPartIndex + 1}`;
                  const answersArr = questions
                    .map((q: any) => {
                      const rawQuestionId = q?.id || q?.questionId;
                      const qid =
                        typeof rawQuestionId === "string"
                          ? rawQuestionId
                          : String(rawQuestionId || "").trim();
                      if (!qid) return null;
                      return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, subPart?.id, subPartIndex) };
                    })
                    .filter(Boolean);
                  return {
                    description: subPartDescription,
                    answers: answersArr,
                  };
                });
              }

              if (Array.isArray(section.questions) && section.questions.length > 0) {
                sectionData.answers = section.questions
                  .map((q: any, questionIndex: number) => {
                    const rawQuestionId = q?.id || q?.questionId;
                    const qid =
                      typeof rawQuestionId === "string"
                        ? rawQuestionId
                        : String(rawQuestionId || "").trim();
                    if (!qid) return null;
                    return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, section?.id, questionIndex) };
                  })
                  .filter(Boolean);
              }

              return sectionData;
            }),
          };
          if (overallToken) {
            (payload as any).sessionToken = overallToken;
          }
          try {
            await runWithRetries(
              () => writingSubmissionService.create(payload as any),
              (value) => !!value,
              3
            );
            successfulSubmissions.push(`Yazma (${writingData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Writing submit-all failed:", submitError);
            failedSubmissions.push(`Yazma (${writingData.testId})`);
          }
        }
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
      for (const key of speakingAnswersKeys) {
        const speakingAnswers = sessionStorage.getItem(key);
        if (!speakingAnswers) continue;

        const speakingData = JSON.parse(speakingAnswers);
        const answerTextRecord: Record<string, string> = {};
        const isMeaningfulText = (value: unknown) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          return (
            trimmed.length > 0 &&
            trimmed !== "[Cevap bulunamadı]" &&
            trimmed !== "[Ses metne dönüştürülemedi]"
          );
        };

        if (speakingData.transcripts && typeof speakingData.transcripts === "object") {
          for (const [qid, t] of Object.entries(speakingData.transcripts)) {
            if (isMeaningfulText(t)) answerTextRecord[qid] = String(t).trim();
          }
        }

        if (speakingData.answers && typeof speakingData.answers === "object") {
          for (const [qid, val] of Object.entries(speakingData.answers)) {
            const maybeObj: any = val;
            const text = typeof val === "string" ? val : maybeObj?.text;
            if (isMeaningfulText(text)) {
              answerTextRecord[qid] = String(text).trim();
            }
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (overallToken) {
          formattedSubmission.sessionToken = overallToken;
        } else {
          console.warn(
            "Speaking submit-all without overall token; skipping mock submit without overall token:",
            speakingData.testId
          );
        }

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          console.warn("Skipping speaking submit-all; formatted submission is invalid.");
          continue;
        }

        const submissionResult = await speakingSubmissionService.submitSpeakingTest(formattedSubmission);
        if (!submissionResult.success) {
          console.error("Speaking submit-all failed:", submissionResult.error);
          failedSubmissions.push(`Konusma (${speakingData.testId})`);
          continue;
        }

        successfulSubmissions.push(`Konusma (${speakingData.testId})`);
        try {
          sessionStorage.removeItem(key);
        } catch {}
      }

      if (failedSubmissions.length > 0) {
        toast.error(
          "Bazı bölümler şu anda gönderilemedi. Cevaplarınız saklandı; lütfen biraz sonra tekrar deneyin."
        );
        if (successfulSubmissions.length > 0) {
          toast.message(`Kaydedilen bolumler: ${successfulSubmissions.join(", ")}`);
        }
        return false;
      }
      
      // Now complete the overall test
      if (!overallTestFlowStore.isCompleted()) {
        const { overallTestService } = await import("@/services/overallTest.service");
        const completed = await overallTestService.complete(overallId);
        if (!completed) throw new Error("Overall result completion failed");
        overallTestFlowStore.markCompleted();
      }
      
      // Exit fullscreen and go to results
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      clearReadingProgress();
      navigate(`/overall-results/${overallId}`);
      return true;
    } catch (error) {
      console.error("Error submitting all tests:", error);
      toast.error("Test gönderilemedi. Cevaplarınız saklandı; lütfen biraz sonra tekrar deneyin.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    handleSubmit();
  };

  useEffect(() => {
    if (
      sectionTimerLoading || sectionTimerError || isSubmitting || !testData ||
      hasSubmittedRef.current || !hasOverallTimerRef.current || timeLeft !== 0 ||
      (autoSubmitRef.current && !submitError) || autoSubmitAttempts >= 3
    ) return;

    const attempt = () => {
      autoSubmitRef.current = true;
      setAutoSubmitAttempts((count) => count + 1);
      if (autoSubmitAttempts === 0) toast.message("Süre bitti. Cevaplarınız gönderiliyor.");
      void handleSubmit();
    };
    if (autoSubmitAttempts === 0) {
      attempt();
      return;
    }
    const timeout = window.setTimeout(attempt, 2000 * 2 ** (autoSubmitAttempts - 1));
    return () => window.clearTimeout(timeout);
  }, [sectionTimerLoading, sectionTimerError, isSubmitting, timeLeft, testData, submitError, autoSubmitAttempts]);

  const handleNextPart = () => {
    const ordered = (testData?.parts || [])
      .map((p) => p.number || 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const unique = Array.from(new Set(ordered));
    if (!unique.length) return;
    const idx = unique.indexOf(currentPartNumber);
    const next = idx >= 0 && idx < unique.length - 1 ? unique[idx + 1] : unique[idx] ?? unique[0];
    setActiveQuestionNumber(null);
    setCurrentPartNumber(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPart = () => {
    const ordered = (testData?.parts || [])
      .map((p) => p.number || 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const unique = Array.from(new Set(ordered));
    if (!unique.length) return;
    const idx = unique.indexOf(currentPartNumber);
    const prev = idx > 0 ? unique[idx - 1] : unique[0];
    setActiveQuestionNumber(null);
    setCurrentPartNumber(prev);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    if (
      submitStartedRef.current || hasSubmittedRef.current ||
      sectionTimerLoading || sectionTimerError || isReadingExpired()
    ) {
      return;
    }
    const question = (testData?.parts || [])
      .flatMap((part) => part.sections || [])
      .flatMap((section) => section.questions || [])
      .find((item) => item.id === questionId);
    if (typeof question?.number === "number") {
      setActiveQuestionNumber(question.number);
    }
    editedAnswersRef.current[questionId] = value;
    pendingAnswersRef.current[questionId] = value;
    const nextAnswers = { ...latestAnswersRef.current, [questionId]: value };
    latestAnswersRef.current = nextAnswers;
    draftRevisionRef.current += 1;
    draftNeedsSaveRef.current = !draftLoadedRef.current;
    setAnswers(nextAnswers);
    queueReadingDraft(nextAnswers);
  };

  const getOrderedPartNumbers = () =>
    Array.from(
      new Set(
        (testData?.parts || [])
          .map((p) => p.number || 0)
          .filter((n) => n > 0)
          .sort((a, b) => a - b)
      )
    );

  const getPartQuestions = (partNum: number) => {
    const part = (testData?.parts || []).find((p) => (p.number || 0) === partNum);
    return (part?.sections || []).flatMap((s) => s.questions || []);
  };

  const getAnsweredCountForPart = (partNum: number) => {
    const qs = getPartQuestions(partNum);
    return qs.reduce((count, q: any) => (answers[q.id] ? count + 1 : count), 0);
  };

  const getPartInstruction = (partNumber: number) =>
    officialReadingInstructions.parts[
      String(partNumber) as keyof typeof officialReadingInstructions.parts
    ] || "";

  useEffect(() => {
    const questionNumbers = getPartQuestions(currentPartNumber)
      .map((question) => question.number)
      .filter((number): number is number => typeof number === "number")
      .sort((a, b) => a - b);
    if (!questionNumbers.length) {
      setActiveQuestionNumber(null);
      return;
    }
    setActiveQuestionNumber((current) =>
      current !== null && questionNumbers.includes(current)
        ? current
        : questionNumbers[0],
    );
  }, [currentPartNumber, testData]);

  const scrollToQuestion = (questionNumber: number) => {
    const target = document.getElementById(
      `reading-question-desktop-${questionNumber}`,
    );
    const scrollContainer = target?.closest<HTMLElement>(".reading-scroll");
    if (!target || !scrollContainer) return;

    const targetRect = target.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const centeredTop =
      scrollContainer.scrollTop +
      targetRect.top -
      containerRect.top -
      (scrollContainer.clientHeight - targetRect.height) / 2;

    scrollContainer.scrollTo({
      top: Math.max(0, centeredTop),
      behavior: "smooth",
    });
  };

  const goToQuestion = (questionNumber: number) => {
    setActiveQuestionNumber(questionNumber);
    window.requestAnimationFrame(() => {
      scrollToQuestion(questionNumber);
    });
  };

  const goToQuestionInPart = (partNumber: number, questionNumber: number) => {
    setCurrentPartNumber(partNumber);
    setActiveQuestionNumber(questionNumber);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToQuestion(questionNumber);
      });
    });
  };

  const typographyPreset = getReadingTypographyPreset(mobile ? 1 : fontScale);
  const selectedFontScale = typographyPreset.menuValue;

  return (
    <ReadingNotesProvider
      key={testId}
      scopeKey={textAnnotationScope("reading-mock", testId, overallTestFlowStore.getOverallId() ||
        (overallTestTokenStore.getByTestId(testId) ? annotationFingerprint(overallTestTokenStore.getByTestId(testId)!) : null))}
    >
      <div
        className={`notranslate reading-exam-page mock-reading-page min-h-screen h-full bg-white font-sans text-[#37352f] pb-44 sm:pb-52 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0 ${
          currentPartNumber >= 2 && currentPartNumber <= 5 ? "overflow-y-hidden" : "overflow-y-auto"
        }`}
        translate="no"
        data-exam-translation="disabled"
        style={{ color: "#37352f", ...typographyPreset.style }}
      >
        <header className="sticky top-0 z-50 w-full border-b border-[#e5e5e2] bg-white">
          <div className="px-2 sm:px-4">
            <div className="flex h-auto items-center justify-between py-2 lg:h-[60px] lg:py-0">
              <div className="block lg:hidden w-full">
                <div className="reading-mobile-header-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                  <div className="flex min-w-0 items-center">
                    <img src="/logo11.svg" alt="TURKISHMOCK" className="reading-mobile-logo hidden h-8 w-[118px] shrink-0 object-contain" />
                    <span data-exam-section-title className="min-w-0 truncate text-sm font-semibold">Okuma</span>
                  </div>
                  <div
                    className={`justify-self-center rounded-md border px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
                      timeLeft <= 300 ? "text-red-700 animate-pulse" : "text-black"
                    } border-[#e5e5e2] bg-[#f7f7f5]`}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <Button onClick={handleSubmitClick} disabled={sectionTimerLoading || !!sectionTimerError || isSubmitting || !testData || (!draftReady && timeLeft > 0)} className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-1.5 text-xs font-semibold min-h-[34px] touch-manipulation disabled:opacity-60">
                    {sectionTimerLoading ? "Yükleniyor" : "GÖNDER"}
                  </Button>
                </div>
                <div className="reading-mock-font-controls mt-2 flex items-center justify-end gap-2">
                  <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="!h-5 !w-5 !min-h-0 rounded border border-gray-200 bg-white !text-[9px] leading-none font-medium text-gray-700 p-0"
                    onClick={() => setFontScale((v) => Math.max(0.9, Math.round((v - 0.05) * 100) / 100))}
                    aria-label="Metni küçült"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    className="!h-5 !w-5 !min-h-0 rounded border border-gray-200 bg-white !text-[9px] leading-none font-medium text-gray-700 p-0"
                    onClick={() => setFontScale((v) => Math.min(1.2, Math.round((v + 0.05) * 100) / 100))}
                    aria-label="Metni büyült"
                  >
                    A+
                  </button>
                  </div>
                </div>
              </div>

              <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] items-center w-full gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src="/logo11.svg"
                    alt="TURKISHMOCK"
                    className="h-10 w-auto shrink-0 object-contain"
                  />
                  <span
                    data-exam-section-divider
                    aria-hidden="true"
                    className="h-5 w-px shrink-0 bg-[#dededb]"
                  />
                  <span data-exam-section-title className="truncate text-[17px] font-semibold text-[#37352f]">
                    Okuma
                  </span>
                </div>
                <div
                  className={`justify-self-center rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums ${
                    timeLeft <= 300 ? "text-red-700 animate-pulse" : "text-black"
                  } border-[#e5e5e2] bg-[#f7f7f5]`}
                >
                  {formatTime(timeLeft)}
                </div>
                <div className="justify-self-end flex items-center gap-3">
                  <NotesPanel currentPartNumber={currentPartNumber} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                        aria-label="Yazı boyutu"
                        title="Yazı boyutu"
                      >
                        <ALargeSmall className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 border-[#dededb] bg-white text-[#37352f] shadow-md"
                    >
                      <DropdownMenuRadioGroup
                        value={selectedFontScale}
                        onValueChange={(value) => setFontScale(Number(value))}
                      >
                        <DropdownMenuRadioItem value="0.9">Küçük</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1">Standart</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.1">Büyük</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    type="button"
                    onClick={() => void exitExamFullscreen()}
                    disabled={!isFullscreen}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:cursor-default disabled:opacity-45"
                    aria-label="Tam ekrandan çık"
                    title="Tam ekrandan çık"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <Button onClick={handleSubmitClick} disabled={sectionTimerLoading || !!sectionTimerError || isSubmitting || !testData || (!draftReady && timeLeft > 0)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold min-h-[34px] disabled:opacity-60">
                    {sectionTimerLoading ? "Yükleniyor" : "GÖNDER"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

      <section className="mock-section-heading mx-2 mt-2 border-b border-[#e5e5e2] bg-white px-3 py-3.5 sm:mx-4 sm:px-4">
          <div className={`flex items-center justify-between gap-3 ${showDescription ? "mb-1.5" : ""}`}>
            <h2 className="reading-part-heading">
              Bölüm {currentPartNumber}
            </h2>
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
              aria-expanded={showDescription}
              aria-label={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
              title={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
            >
              {showDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          {showDescription && (
            <p className="reading-part-description max-w-6xl">
              {getPartInstruction(currentPartNumber)}
            </p>
          )}
      </section>

      {sectionTimerError && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#e5e5e2] bg-[#fffdf7] px-5 py-3 text-sm">
          <p>{sectionTimerError}</p>
          <Button type="button" variant="outline" disabled={sectionTimerLoading} onClick={() => setTimerRetryKey((key) => key + 1)}>
            Durumu tekrar kontrol et
          </Button>
        </div>
      )}
      {draftLoadError && timeLeft > 0 && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#e5e5e2] bg-[#fffdf7] px-5 py-3 text-sm">
          <p>Kayıtlı cevaplarınız yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin. Sınav süresi devam ediyor.</p>
          <Button type="button" variant="outline" onClick={() => setDraftRetryKey((key) => key + 1)}>
            Taslağı tekrar yükle
          </Button>
        </div>
      )}
      {submitError && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#e5e5e2] bg-[#fffdf7] px-5 py-3 text-sm">
          <p>
            {submitError}
            {timeLeft <= 0 && autoSubmitAttempts < 3 && !hasSubmittedRef.current ? " Bağlantı yeniden denenecek." : " Cevaplarınız korunuyor."}
          </p>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => {
            if (isReadingExpired()) {
              setAutoSubmitAttempts(3);
              autoSubmitRef.current = true;
            }
            void handleSubmit();
          }}>
            Gönderimi tekrar dene
          </Button>
        </div>
      )}
      {(isLoading || error) && (
        <div className="mx-auto max-w-7xl px-6 py-3">
          {isLoading && <div className="text-sm text-[#5f5e5a]">Okuma testi yükleniyor...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      )}

      {/* Dynamic Part Content */}
      {!isLoading && !error && testData && currentPartNumber === 1 && (
        <ReadingPart1 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
          fontScale={typographyPreset.scale}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 3 && (
        <ReadingPart3 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 4 && (
        <ReadingPart4 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 5 && (
        <ReadingPart5 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <ReadingPart2 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

            {/* Footer navigation: Responsive like listening test */}
      {!isLoading && !error && testData && (() => {
        const partNumbers = getOrderedPartNumbers();
        const totalParts = Math.max(1, partNumbers.length);
        const currentPartIndex = Math.max(0, partNumbers.indexOf(currentPartNumber));
        const currentPartProgress = ((currentPartIndex + 1) / totalParts) * 100;
        const currentPartQuestions = getPartQuestions(currentPartNumber).length;
        const currentPartAnswered = getAnsweredCountForPart(currentPartNumber);

        const buildPartQuestions = (partNum: number) => {
          const part = (testData.parts || []).find((pp) => (pp.number || 0) === partNum);
          const qs = (part?.sections || []).flatMap((s) => s.questions || []);
          const nums = qs
            .map((q) => q.number)
            .filter((n): n is number => typeof n === "number")
            .sort((a, b) => a - b);
          return { qs, nums };
        };

        const allQuestionGroups = partNumbers.map((partNum) => ({
          partNum,
          ...buildPartQuestions(partNum),
        }));

        return (
          <>
            <div className="z-50 hidden shrink-0 border-t border-[#e5e5e2] bg-white lg:block">
              <div
                className={`mx-auto flex items-center gap-3 px-4 py-2 ${
                  showAllQuestionNumbers ? "max-w-none" : "max-w-7xl"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowAllQuestionNumbers((value) => !value)}
                  aria-label={
                    showAllQuestionNumbers
                      ? "Bölüm görünümüne dön"
                      : "Tüm soruları göster"
                  }
                  aria-pressed={showAllQuestionNumbers}
                  title={
                    showAllQuestionNumbers
                      ? "Bölüm görünümüne dön"
                      : "Tüm soruları göster"
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
                    showAllQuestionNumbers
                      ? "border-[#c9c9c4] bg-[#e9e9e6] text-[#2f2e2a]"
                      : "border-[#d8d8d4] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#37352f]"
                  }`}
                >
                  {showAllQuestionNumbers ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <LayoutGrid className="h-4 w-4" />
                  )}
                </button>

                <div className="h-6 w-px shrink-0 bg-[#e5e5e2]" />

                {showAllQuestionNumbers ? (
                  <nav
                    className="flex min-w-0 flex-1 items-center overflow-x-auto"
                    aria-label="Tüm okuma soruları"
                  >
                    {allQuestionGroups.map(({ partNum, qs, nums }, groupIndex) => (
                      <div
                        key={partNum}
                        className={`flex shrink-0 items-center gap-1 ${
                          groupIndex > 0
                            ? "ml-1.5 border-l border-[#dededb] pl-1.5"
                            : ""
                        }`}
                      >
                        {nums.map((questionNumber) => {
                          const questionId = qs.find(
                            (question) => question.number === questionNumber,
                          )?.id;
                          const isAnswered = !!(questionId && answers[questionId]);
                          const isActive =
                            currentPartNumber === partNum &&
                            activeQuestionNumber === questionNumber;

                          return (
                            <button
                              key={`${partNum}-${questionNumber}`}
                              type="button"
                              onClick={() =>
                                goToQuestionInPart(partNum, questionNumber)
                              }
                              aria-label={`Bölüm ${partNum}, soru ${questionNumber}`}
                              aria-current={isActive ? "step" : undefined}
                              className={`flex h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
                                isActive
                                  ? "border-[#6f6d67] bg-[#f1f1ef] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#6f6d67]"
                                  : isAnswered
                                    ? "border-[#aaa8a2] bg-[#e9e9e6] text-[#37352f]"
                                    : "border-[#d8d8d4] bg-white text-[#6f6d67] hover:border-[#b8b7b1] hover:bg-[#f7f7f5]"
                              }`}
                            >
                              {questionNumber}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </nav>
                ) : (
                  <>
                    <nav className="flex shrink-0 items-center gap-1" aria-label="Okuma bölümleri">
                      {partNumbers.map((partNum) => {
                        const isActive = currentPartNumber === partNum;
                        return (
                          <button
                            key={partNum}
                            type="button"
                            className={`h-8 rounded-md px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-0 ${
                              isActive
                                ? "bg-[#e9e9e6] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#c9c9c4]"
                                : "text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
                            }`}
                            onClick={() => {
                              setActiveQuestionNumber(null);
                              setCurrentPartNumber(partNum);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Bölüm {partNum}
                          </button>
                        );
                      })}
                    </nav>

                    <div className="h-6 w-px shrink-0 bg-[#e5e5e2]" />

                    <div className="flex min-w-0 flex-1 items-center">
                      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                        {(() => {
                          const { qs, nums } = buildPartQuestions(currentPartNumber);
                          return (nums.length ? nums : [currentPartNumber]).map((questionNumber) => {
                            const questionId = qs.find((question) => question.number === questionNumber)?.id;
                            const isAnswered = !!(questionId && answers[questionId]);
                            const isActive = activeQuestionNumber === questionNumber;
                            return (
                              <button
                                key={`${currentPartNumber}-${questionNumber}`}
                                type="button"
                                onClick={() => goToQuestion(questionNumber)}
                                aria-label={`Soru ${questionNumber}`}
                                aria-current={isActive ? "step" : undefined}
                                className={`flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-0 ${
                                  isActive
                                    ? "border-[#6f6d67] bg-[#f1f1ef] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#6f6d67]"
                                    : isAnswered
                                      ? "border-[#aaa8a2] bg-[#e9e9e6] text-[#37352f]"
                                      : "border-[#d8d8d4] bg-white text-[#6f6d67] hover:border-[#b8b7b1] hover:bg-[#f7f7f5]"
                                }`}
                              >
                                {questionNumber}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    onClick={handlePrevPart}
                    disabled={partNumbers.indexOf(currentPartNumber) <= 0}
                    className="h-9 min-h-9 w-9 border border-black bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] disabled:opacity-40"
                    aria-label="Önceki bölüm"
                    title="Önceki bölüm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleNextPart}
                    disabled={partNumbers.indexOf(currentPartNumber) >= partNumbers.length - 1}
                    className="h-9 min-h-9 w-9 border border-black bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] disabled:opacity-40"
                    aria-label="Sonraki bölüm"
                    title="Sonraki bölüm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Layout - compact prev/next with center progress */}
            <div className="mock-mobile-navigation lg:hidden fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-2 left-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 bg-white/98 backdrop-blur-sm rounded-lg shadow-sm border border-gray-300/80 z-50">
              <div className="justify-self-start">
                <Button
                  onClick={handlePrevPart}
                  disabled={partNumbers.indexOf(currentPartNumber) <= 0}
                  className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-bold px-2.5 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] touch-manipulation"
                  aria-label="Önceki"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 px-1">
                <div className="text-center text-[11px] font-semibold text-gray-800">
                  BÖLÜM {currentPartIndex + 1}/{totalParts}
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="mock-mobile-progress-fill h-full rounded-full bg-[#438553] transition-all duration-200 ease-out"
                    style={{ width: `${currentPartProgress}%` }}
                  />
                </div>
                <div className="mt-1 text-center text-[10px] text-gray-600">
                  {currentPartAnswered}/{currentPartQuestions} cevap
                </div>
              </div>
              <div className="justify-self-end">
                <Button
                  onClick={handleNextPart}
                  disabled={partNumbers.indexOf(currentPartNumber) >= partNumbers.length - 1}
                  className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold px-2.5 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] touch-manipulation"
                  aria-label="Sonraki"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Submit button (top-right already has one; optional dedicated handler) */}
      {/* Hook GÖNDER to submit current answers */}

      {/* Footer navigation removed for now (building from Part 1 only) */}

      {(showFullscreenPrompt || !isFullscreen) && !hasSubmittedRef.current && (
        <div
          className="fixed inset-0 z-[100] hidden items-center justify-center bg-white/95 px-4 backdrop-blur-[2px] lg:flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reading-fullscreen-title"
        >
          <div className="w-full max-w-sm border border-[#dededb] bg-white p-6 text-center shadow-lg">
            <Maximize2 className="mx-auto h-5 w-5 text-[#5f5e5a]" />
            <h2
              id="reading-fullscreen-title"
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Testi Gönder"
        message="Testi göndermek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Gönder"
        cancelText="İptal"
        isLoading={isSubmitting}
      />
      </div>
    </ReadingNotesProvider>
  );
}

