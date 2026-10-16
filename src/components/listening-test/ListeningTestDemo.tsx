import ListeningPracticeAudioPlayer from "./ListeningPracticeAudioPlayer";
import ListeningTranscriptEvidenceView from "@/components/results/ListeningTranscriptEvidenceView";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  listeningSubmissionService,
  listeningTestService,
} from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";
import { Button } from "../ui/button";
import PracticeViewControl from '@/components/practice/PracticeViewControl';
import { usePracticePresentation } from '@/hooks/use-practice-presentation';
import {
  ALargeSmall,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Eraser,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  PencilLine,
  VolumeX,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { AudioPlayer } from "@/pages/listening-test/components/AudioPlayer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TextAnnotationsProvider, textAnnotationScope, annotationFingerprint } from "@/contexts/ReadingNotesContext";
import HighlightableTextSimple from "@/components/listening-test/HighlightableTextSimple";
import MapWithDrawing from "@/components/listening-test/MapWithDrawing";
import ListeningMobileSplitPanels from "./ListeningMobileSplitPanels";
import { isMobilePresentation } from "@/hooks/use-mobile-presentation";
import { getReadingTypographyPreset } from "@/components/reading-test/reading-typography";
import ReadingQuestionNumber from "@/components/reading-test/ui/ReadingQuestionNumber";
import { toast } from "sonner";
import { fixMojibake } from "@/utils/text";
import { toApiUrl } from "@/config/runtime";
import { assignListeningAnswer } from "./listening-answer-rules";
import { orderListeningQuestions } from "./listening-question-order";
import { countOptionSelections } from "@/utils/selection-count";
import { useOverallSectionHeartbeat } from "@/hooks/use-overall-section-heartbeat";
import { listeningPreparationStore, prepareListeningAudioPlayback, type PreparedListeningAudioPlayback } from "@/services/listeningPreparation.store";
import listeningPracticeService from "@/services/listeningPractice.service";
import {
  getPracticeErrorMessage,
  type ListeningPracticeCheckResult,
} from "@/services/practice.types";

interface UserAnswers {
  [questionId: string]: string;
}

type ListeningPreparationState =
  | "loading"
  | "ready"
  | "starting"
  | "started"
  | "error";

interface ListeningOptionProps {
  annotationId: string;
  letter: string;
  text: string;
  selected: boolean;
  pulseActive: boolean;
  onSelect: () => void;
}

function ListeningOption({
  annotationId,
  letter,
  text,
  selected,
  pulseActive,
  onSelect,
}: ListeningOptionProps) {
  const accessibleLabel = `${letter}. ${fixMojibake(text)}`;

  return (
    <div
      className={`reading-option-row listening-option-row grid min-h-10 w-full cursor-pointer items-start gap-x-0 rounded-md px-2.5 py-2 text-left text-[#37352f] transition-colors ${
        selected ? "bg-[#f7f7f5]" : ""
      }`}
      onClick={onSelect}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={accessibleLabel}
        className="reading-option-radio-slot listening-option-radio-button rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <span aria-hidden="true">
          <span
            className={`reading-option-radio-ring relative overflow-hidden rounded-full border-[1.5px] ${
              selected ? "border-[#5f5e5a]" : "border-[#a9a7a1]"
            } ${pulseActive ? "radio-ink-hit" : ""}`}
          >
            {pulseActive ? (
              <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />
            ) : null}
            <span
              className={`reading-option-radio-dot rounded-full ${
                selected ? "bg-[#5f5e5a]" : "bg-transparent"
              }`}
            />
          </span>
        </span>
      </button>
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          className="reading-option-letter shrink-0 cursor-pointer font-semibold"
        >
          {letter}.
        </span>
        <span className="reading-text reading-option-copy min-w-0 font-normal">
          <HighlightableTextSimple
            annotationId={annotationId}
            text={fixMojibake(text)}
            onPlainClick={onSelect}
          />
        </span>
      </span>
    </div>
  );
}

function ListeningBooleanChoice({
  label,
  selected,
  pulseActive,
  onSelect,
}: {
  label: "Doğru" | "Yanlış";
  selected: boolean;
  pulseActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${label} seçeneğini işaretle`}
      className="listening-boolean-choice flex min-h-11 w-full items-center justify-center transition-colors hover:bg-[#f7f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8a8881]"
      onClick={onSelect}
    >
      <span aria-hidden="true" className="reading-option-radio-slot">
        <span
          className={`reading-option-radio-ring relative overflow-hidden rounded-full border-[1.5px] ${
            selected ? "border-[#5f5e5a]" : "border-[#a9a7a1]"
          } ${pulseActive ? "radio-ink-hit" : ""}`}
        >
          {pulseActive ? (
            <span className="radio-ink-splash pointer-events-none absolute inset-0 rounded-full" />
          ) : null}
          <span
            className={`reading-option-radio-dot rounded-full ${
              selected ? "bg-[#5f5e5a]" : "bg-transparent"
            }`}
          />
        </span>
      </span>
      <span className="listening-boolean-label" style={{ display: "none" }} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

function ListeningOptionLegendRow({
  annotationId,
  letter,
  text,
  selectionCount,
}: {
  letter: string;
  text: string;
  selectionCount: number;
  annotationId: string;
}) {
  return (
    <div
      className={`reading-option-legend grid min-h-10 grid-cols-[minmax(0,1fr)_18px] items-start gap-x-2 rounded-md px-2.5 py-2 ${
        selectionCount > 0 ? "bg-[#f1f1ef] text-[#8a8881]" : "text-[#37352f]"
      }`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="reading-option-letter shrink-0 font-semibold tabular-nums">
          {letter}.
        </span>
        <span className="reading-text reading-option-copy min-w-0 font-normal">
          <HighlightableTextSimple annotationId={annotationId} text={fixMojibake(text)} />
        </span>
      </span>
      {selectionCount > 1 ? (
        <span className="mt-0.5 text-center text-[#8a8881]" aria-label="Birden fazla soruda seçildi">?</span>
      ) : selectionCount === 1 ? (
        <Check className="mt-1 h-4 w-4 shrink-0 text-[#8a8881]" aria-label="Bir soruda seçildi" />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

function ListeningSplitHandle() {
  return (
    <ResizableHandle
      withHandle={false}
      aria-label="Panelleri yeniden boyutlandır"
      title="Panelleri yeniden boyutlandır"
      className="group !mx-0 !w-3 !cursor-ew-resize !rounded-none !bg-transparent !shadow-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#deded9] transition-colors group-hover:bg-[#b8b7b1]"
      />
      <span className="pointer-events-none relative z-10 flex h-7 w-7 shrink-0 items-center justify-center text-[#5f6670] transition-colors group-hover:text-[#2f3742]">
        <MoveHorizontal className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </ResizableHandle>
  );
}

interface ListeningProgressSnapshot {
  pendingAnswers?: UserAnswers;
  currentPartNumber: number;
  userAnswers: UserAnswers;
  timeLeft: number;
  timerActive: boolean;
  showReviewNotice: boolean;
  listeningPhase: "AUDIO" | "REVIEW" | null;
  fontScale: number;
  updatedAt: number;
}

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
    null
  );
};

const PART_FOUR_MATCHING_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function ListeningTestDemo({
  testId,
  practiceMode = false,
  accessContextId,
}: {
  testId: string;
  practiceMode?: boolean;
  accessContextId?: string;
}) {
  const attemptId = practiceMode ? accessContextId || "study" :
    overallTestFlowStore.getOverallId() ||
    (overallTestTokenStore.getByTestId(testId) ? annotationFingerprint(overallTestTokenStore.getByTestId(testId)!) : null);
  return (
    <TextAnnotationsProvider
      key={`${practiceMode ? "practice" : "exam"}-${testId}`}
      scopeKey={textAnnotationScope(practiceMode ? "listening-practice" : "listening-mock", testId, attemptId)}
    >
      <ListeningAttempt
        key={`${practiceMode ? "practice" : "exam"}-${testId}`}
        testId={testId}
        practiceMode={practiceMode}
        accessContextId={accessContextId}
      />
    </TextAnnotationsProvider>
  );
}

function ListeningAttempt({
  testId,
  practiceMode,
  accessContextId,
}: {
  testId: string;
  practiceMode: boolean;
  accessContextId?: string;
}) {
  const practicePresentation = usePracticePresentation(practiceMode);
  const [testData, setTestData] = useState<ListeningTestItem | null>(null);
  const [practiceResult, setPracticeResult] =
    useState<ListeningPracticeCheckResult | null>(null);
  const [showPracticeReview, setShowPracticeReview] = useState(false);
  const closePracticeReview = useCallback(() => setShowPracticeReview(false), []);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [contentLoadError, setContentLoadError] = useState<string | null>(null);
  const [contentRetryKey, setContentRetryKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState(() => !practiceMode && !isMobilePresentation());
  const [showReviewNotice, setShowReviewNotice] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [requiresAudioStart, setRequiresAudioStart] = useState(false);
  const [listeningPreparationState, setListeningPreparationState] =
    useState<ListeningPreparationState>(() =>
      overallTestTokenStore.getByTestId(testId) ? "loading" : "started",
    );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState(false);
  const [draftRetryKey, setDraftRetryKey] = useState(0);
  const [draftAcknowledgement, setDraftAcknowledgement] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSubmitAttempts, setAutoSubmitAttempts] = useState(0);
  const latestAnswersRef = useRef<UserAnswers>({});
  const pendingAnswersRef = useRef<UserAnswers>({});
  const editedAnswersRef = useRef<UserAnswers>({});
  const localProgressRef = useRef<Partial<ListeningProgressSnapshot> | null>(null);
  const draftRevisionRef = useRef(0);
  const submitStartedRef = useRef(false);
  const acceptedResultIdRef = useRef<string | null>(null);
  const lifecycleRef = useRef(0);
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);
  const [sectionTimerLoading, setSectionTimerLoading] = useState(
    () => !!overallTestTokenStore.getByTestId(testId),
  );
  const [sectionTimerError, setSectionTimerError] = useState<string | null>(null);
  const [audioPreparationAttempt, setAudioPreparationAttempt] = useState(0);
  const [canRetryAudioPreparation, setCanRetryAudioPreparation] =
    useState(false);
  const [preparedAudioElement, setPreparedAudioElement] = useState<HTMLAudioElement | null>(null);
  const [preparedStartAtMs, setPreparedStartAtMs] = useState<number | null>(null);
  const preparedAudioHostRef = useRef<HTMLSpanElement>(null);

  // Keep the native player outside the responsive control branches. Removing
  // and reinserting it when the header changes can restart playback in browsers.
  useLayoutEffect(() => {
    if (!preparedAudioElement) return;
    preparedAudioHostRef.current?.append(preparedAudioElement);
    return () => { preparedAudioElement.remove(); };
  }, [preparedAudioElement]);
  const [listeningPhase, setListeningPhase] = useState<"AUDIO" | "REVIEW" | null>(null);
  const [, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLg, setIsLg] = useState<boolean>(false);
  const [, setMobilePart3OpenId] = useState<string | number | null>(null);
  const [mobilePart4MapZoomed, setMobilePart4MapZoomed] = useState(false);
  const [part4MapTool, setPart4MapTool] = useState<
    "none" | "draw" | "erase"
  >("none");
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [isPartSwitchAnimating, setIsPartSwitchAnimating] = useState(false);
  const [inkPulseKey, setInkPulseKey] = useState<string | null>(null);
  const [showAllQuestionNumbers, setShowAllQuestionNumbers] = useState(false);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [authoritativeAudioProgress, setAuthoritativeAudioProgress] = useState<{
    positionSeconds: number;
    capturedAtMs: number;
  } | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const inkPulseTimeoutRef = useRef<number | null>(null);
  const hasRestoredProgressRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const hasOverallTimerRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const backendTimerRef = useRef<BackendSyncedTimerState | null>(null);
  const draftLoadedRef = useRef(false);
  const draftSaveTimerRef = useRef<number | null>(null);
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const fullscreenWasActiveRef = useRef(false);
  // Keep the admitted attempt identity stable after submit consumes its token.
  const [sectionAttemptKey] = useState(() =>
    practiceMode
      ? `practice-${testId}`
      : overallTestTokenStore.getByTestId(testId) || testId,
  );
  const practiceProgressScope = textAnnotationScope("listening-practice", testId, accessContextId || "study");
  const progressStorageKey = practiceMode
    ? practiceProgressScope ? `listening_progress_${practiceProgressScope}` : ""
    : `listening_progress_${sectionAttemptKey}`;
  const audioProgressStorageKey = `listening_audio_progress_${sectionAttemptKey}`;
  // Removed exam-mode body lock for listening; keep state local if needed later
  
  const navigate = useNavigate();
  useOverallSectionHeartbeat(testId);

  useEffect(() => {
    lifecycleRef.current += 1;
    return () => { lifecycleRef.current += 1; };
  }, [testId]);

  const recoverSubmittedSection = useCallback(async () => {
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;
    const recovery = (async () => {
    const overallId = overallTestFlowStore.getOverallId();
    if (!overallId) return false;
    const lifecycle = lifecycleRef.current;
    const recovered = await listeningSubmissionService.getSessionResult(overallId, testId);
    if (!recovered || lifecycle !== lifecycleRef.current) return false;
    hasSubmittedRef.current = true;
    acceptedResultIdRef.current = recovered.resultId;
    setSectionTimerError(null);
    setSubmitError(null);
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
    if (recovered.overallCompleted) {
      overallTestFlowStore.markCompleted();
      navigate(`/overall-results/${overallId}`, { replace: true });
    } else {
      const next = overallTestFlowStore.onTestCompleted("LISTENING", testId);
      if (next) navigate(next, { replace: true });
      else if (overallTestFlowStore.isAllDone()) {
        const completed = await overallTestService.complete(overallId).catch(() => false);
        if (lifecycle !== lifecycleRef.current) return true;
        if (completed) {
          overallTestFlowStore.markCompleted();
          navigate(`/overall-results/${overallId}`, { replace: true });
        } else {
          setListeningPreparationState("started");
          setSubmitError("Bölüm kaydedildi. Sınavın tamamlanması yeniden denenecek.");
        }
      } else navigate(`/listening-test/results/${recovered.resultId}`, { replace: true });
    }
    return true;

    })();
    recoveryPromiseRef.current = recovery;
    try { return await recovery; }
    catch { return false; }
    finally { recoveryPromiseRef.current = null; }
  }, [navigate, progressStorageKey, testId]);

  useEffect(() => {
    if (practiceMode) return;
    void recoverSubmittedSection();
    const onSubmitted = (event: Event) => {
      const submittedId = (event as CustomEvent<{ testId?: string }>).detail?.testId;
      if (!submittedId || submittedId === testId) void recoverSubmittedSection();
    };
    window.addEventListener("overall-section-submitted", onSubmitted);
    return () => window.removeEventListener("overall-section-submitted", onSubmitted);
  }, [practiceMode, recoverSubmittedSection, testId]);

  useEffect(() => {
    if (practiceMode) return;
    const handleExpiredSection = (event: Event) => {
      const expiredTestId = String(
        (event as CustomEvent<{ testId?: string }>).detail?.testId || "",
      );
      if (expiredTestId && expiredTestId !== (testData?.id || testId)) return;

      setSectionTimerError(null);
      setListeningPhase("REVIEW");
      setTimeLeft(0);
      setTimerActive(false);
      setShowReviewNotice(true);
    };

    window.addEventListener(
      "overall-section-time-expired",
      handleExpiredSection,
    );
    return () => {
      window.removeEventListener(
        "overall-section-time-expired",
        handleExpiredSection,
      );
    };
  }, [practiceMode, testData?.id, testId]);

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

  const getBackendRemainingSeconds = () => {
    return getBackendSyncedRemainingSeconds(backendTimerRef.current);
  };

  const applySectionTimer = useCallback((timer: any) => {
    const phase = timer?.phase === "AUDIO" ? "AUDIO" : "REVIEW";
    const effectiveExpiresAt =
      phase === "AUDIO"
        ? timer?.audioEndsAt || timer?.expiresAt
        : timer?.reviewExpiresAt || timer?.expiresAt;
    const effectiveRemaining =
      phase === "AUDIO"
        ? timer?.remainingAudioSeconds ?? timer?.remainingSeconds
        : timer?.remainingReviewSeconds ?? timer?.remainingSeconds;

    const timerState = createBackendSyncedTimerState({
      ...timer,
      expiresAt: effectiveExpiresAt,
      remainingSeconds: Math.max(0, Math.round(Number(effectiveRemaining || 0))),
    });
    backendTimerRef.current = timerState;
    const nextRemaining =
      getBackendSyncedRemainingSeconds(timerState) ?? timerState.initialRemainingSeconds;
    setListeningPhase(phase);
    if (phase === "AUDIO") {
      const audioDuration = Number(timer?.audioDurationSeconds);
      const remainingAudio = Number(
        timer?.remainingAudioSeconds ?? effectiveRemaining,
      );
      const serverNowMs = Date.parse(String(timer?.serverNow || ""));
      const audioStartedAtMs = Date.parse(
        String(timer?.audioStartedAt || timer?.startedAt || ""),
      );
      const timestampPosition =
        Number.isFinite(serverNowMs) && Number.isFinite(audioStartedAtMs)
          ? Math.max(0, (serverNowMs - audioStartedAtMs) / 1000)
          : NaN;
      if (
        Number.isFinite(audioDuration) &&
        audioDuration > 0 &&
        Number.isFinite(remainingAudio)
      ) {
        setAuthoritativeAudioProgress({
          positionSeconds: Math.max(
            0,
            Math.min(
              audioDuration,
              Number.isFinite(timestampPosition)
                ? timestampPosition
                : audioDuration - remainingAudio,
            ),
          ),
          capturedAtMs: Date.now(),
        });
      }
    } else {
      setAuthoritativeAudioProgress(null);
    }
    setTimeLeft(nextRemaining);
    setTimerActive(phase === "REVIEW" && nextRemaining > 0);
    setShowReviewNotice(true);
  }, []);

  const refetchSectionTimer = useCallback(async () => {
    const timer = await overallTestService.startSectionTimerForTest(testId);
    if (timer) applySectionTimer(timer);
    return timer;
  }, [applySectionTimer, testId]);

  const startPreparedListening = useCallback(async () => {
    if (!requiresAudioStart) return;
    setListeningPreparationState("starting");
    setSectionTimerLoading(true);
    setSectionTimerError(null);
    try {
      const timer = await refetchSectionTimer();
      if (!timer) throw new Error("Dinleme bölümü başlatılamadı.");
      setRequiresAudioStart(false);
      setListeningPreparationState("started");
    } catch (error) {
      const message = getOverallSectionTimerErrorMessage(error);
      setSectionTimerError(message);
      setListeningPreparationState("error");
      toast.error(message);
      throw error;
    } finally {
      setSectionTimerLoading(false);
    }
  }, [refetchSectionTimer, requiresAudioStart]);

  const normalizeRestoredAnswers = (value: unknown): UserAnswers => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const output: UserAnswers = {};
    for (const [questionId, raw] of Object.entries(value as Record<string, unknown>)) {
      const key = String(questionId || "").trim();
      if (!key) continue;
      const answer = Array.isArray(raw) ? raw[0] : raw;
      const normalized = String(answer ?? "").trim();
      if (normalized) output[key] = normalized;
    }
    return output;
  };

  const getCurrentOverallToken = useCallback(() => {
    return overallTestTokenStore.getByTestId(testData?.id || testId) || null;
  }, [testData?.id, testId]);

  const writeListeningDraft = useCallback(
    async (token: string, nextAnswers: UserAnswers, revision = draftRevisionRef.current) => {
      const lifecycle = lifecycleRef.current;
      setDraftStatus("saving");
      const result = await listeningSubmissionService.saveDraft(
        token,
        nextAnswers,
      );
      if (lifecycle !== lifecycleRef.current) return null;
      if (result?.saved) {
        if (revision === draftRevisionRef.current) pendingAnswersRef.current = {};
        setDraftAcknowledgement((value) => value + 1);
        setDraftStatus("saved");
        return result;
      }
      setDraftStatus("error");
      return null;
    },
    [],
  );

  const queueListeningDraft = useCallback(
    (nextAnswers: UserAnswers) => {
      const token = getCurrentOverallToken();
      if (
        !token ||
        !draftLoadedRef.current ||
        hasSubmittedRef.current ||
        autoSubmitRef.current ||
        sectionTimerLoading ||
        sectionTimerError
      ) {
        return Promise.resolve();
      }

      const snapshot = { ...nextAnswers };
      const revision = draftRevisionRef.current;
      const lifecycle = lifecycleRef.current;
      const queuedWrite = draftSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (lifecycle !== lifecycleRef.current || hasSubmittedRef.current) return;
          await writeListeningDraft(token, snapshot, revision);
        });
      draftSaveQueueRef.current = queuedWrite.catch(() => undefined);
      return queuedWrite;
    },
    [
      getCurrentOverallToken,
      sectionTimerError,
      sectionTimerLoading,
      writeListeningDraft,
    ],
  );

  const stopAllMediaPlayback = (hardReset: boolean = false) => {
    if (typeof document === "undefined") return;
    const mediaElements = Array.from(document.querySelectorAll("audio, video")) as HTMLMediaElement[];
    mediaElements.forEach((media) => {
      try {
        media.pause();
        if (hardReset) {
          media.currentTime = 0;
          media.removeAttribute("src");
          media.load();
        }
      } catch {}
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadTestData = async () => {
      try {
        setContentLoadError(null);
        if (practiceMode) {
          const solved = await listeningPracticeService.solve<ListeningTestItem>(testId, { accessContextId });
          if (!mounted) return;
          const partNumber = Number(solved.sectionCode.replace("PART_", "")) || 1;
          setCurrentPartNumber(partNumber);
          setTimeLeft(0);
          setTimerActive(false);
          setShowReviewNotice(true);
          setListeningPhase("REVIEW");
          setTestData(solved.content);
          setLoading(false);
          return;
        }

        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_LISTENING_${testId}`);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          if (overallTestTokenStore.getByTestId(testId)) {
            data.audioUrl = null;
          }
          setTestData(data);
          setLoading(false);
          return;
        }

        // Fallback to API call if no cached data
        const data = await listeningTestService.getTestWithFullData(testId);
        if (!mounted) return;
        setTestData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading test data:", error);
        if (mounted) {
          setContentLoadError(getPracticeErrorMessage(
            error,
            practiceMode ? "Dinleme pratiği yüklenemedi." : "Test bulunamadı",
          ));
          setLoading(false);
        }
      }
    };

    if (testId) {
      loadTestData();
    }
    return () => { mounted = false; };
  }, [testId, contentRetryKey, practiceMode, accessContextId]);

  useEffect(() => {
    const sessionToken = overallTestTokenStore.getByTestId(
      testData?.id || testId,
    );
    if (sessionToken || overallTestFlowStore.getOverallId()) return;
    setActiveAudioUrl(testData?.audioUrl || null);
    setRequiresAudioStart(false);
  }, [testData?.audioUrl, testData?.id, testId]);

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    setIsProgressReady(false);
    let parsed: Partial<ListeningProgressSnapshot> | null = null;
    try {
      const raw = progressStorageKey ? sessionStorage.getItem(progressStorageKey) : null;
      if (raw) parsed = JSON.parse(raw) as Partial<ListeningProgressSnapshot>;
    } catch {}

    if (!practiceMode && !overallTestTokenStore.getByTestId(testId)) parsed = null;
    localProgressRef.current = parsed;
    pendingAnswersRef.current = parsed?.pendingAnswers || {};
    latestAnswersRef.current = parsed?.userAnswers || {};
    setUserAnswers(latestAnswersRef.current);
    if (parsed && typeof parsed === "object") {
      const restoredPart = Number(parsed.currentPartNumber);
      if (Number.isFinite(restoredPart)) {
        setCurrentPartNumber(Math.min(6, Math.max(1, Math.round(restoredPart))));
      }

      if (parsed.userAnswers && typeof parsed.userAnswers === "object") {
        setUserAnswers(parsed.userAnswers as UserAnswers);
      }

      const restoredTimeLeft = Number(parsed.timeLeft);
      const restoredTimerActive =
        !practiceMode &&
        Boolean(parsed.timerActive) &&
        Number(parsed.timeLeft) > 0;
      if (!practiceMode && Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.min(10_800, Math.round(restoredTimeLeft))));
      }
      setTimerActive(restoredTimerActive);
      setShowReviewNotice(
        practiceMode || Boolean(parsed.showReviewNotice) || restoredTimerActive,
      );
      if (parsed.listeningPhase === "AUDIO" || parsed.listeningPhase === "REVIEW") {
        setListeningPhase(parsed.listeningPhase);
      } else if (restoredTimerActive) {
        setListeningPhase("REVIEW");
      }

      const restoredFontScale = Number(parsed.fontScale);
      if (Number.isFinite(restoredFontScale)) {
        setFontScale(Math.min(1.1, Math.max(0.9, restoredFontScale)));
      }
    }

    hasRestoredProgressRef.current = true;
    setIsProgressReady(true);
  }, [progressStorageKey, practiceMode, testId]);

  useEffect(() => {
    let mounted = true;
    let ownedPlayback: PreparedListeningAudioPlayback | null = null;
    autoSubmitRef.current = false;
    // Audio recovery must not reset an in-flight draft restore/save.
    setDraftStatus("idle");
    const hasOverallToken =
      !practiceMode && !!overallTestTokenStore.getByTestId(testId);
    hasOverallTimerRef.current = hasOverallToken;
    backendTimerRef.current = null;
    setRequiresAudioStart(false);
    setCanRetryAudioPreparation(false);
    setPreparedStartAtMs(null);
    setPreparedAudioElement(null);
    if (!hasOverallToken) {
      setListeningPreparationState("started");
      setSectionTimerError(null);
      if (overallTestFlowStore.getOverallId()) {
        setSectionTimerLoading(true);
        void recoverSubmittedSection().then((recovered) => {
          if (mounted && !recovered) setSectionTimerError("Sınav durumunuz doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.");
        }).finally(() => { if (mounted) setSectionTimerLoading(false); });
        return () => { mounted = false; };
      }
      setListeningPhase((current) => current || "AUDIO");
      setSectionTimerLoading(false);
      return;
    }

    setListeningPreparationState("loading");
    setListeningPhase(null);
    setSectionTimerLoading(true);
    setSectionTimerError(null);

    const sessionToken = overallTestTokenStore.getByTestId(testId) || "";
    const cachedEntry = listeningPreparationStore.get(testId, sessionToken);
    const cachedPreparation = cachedEntry?.startRequested && cachedEntry.playback
      ? listeningPreparationStore.take(testId, sessionToken) : null;
    ownedPlayback = cachedPreparation?.playback ?? null;

    const returnToWarning = () => {
      const queue = overallTestFlowStore.getQueue();
      const totalCount = Math.max(overallTestFlowStore.getInitialCount(), queue.length, 1);
      overallTestFlowStore.setPendingNextSection({
        fromTestType: "LISTENING",
        next: queue.find((item) => item.testType === "LISTENING" && item.testId === testId) ||
          { testType: "LISTENING", testId, path: `/listening-test/${testId}` },
        totalCount,
        completedCount: Math.max(0, totalCount - queue.length),
      });
      navigate("/overall-section-ready", { replace: true });
    };

    const loadPreparation = async () => {
      if (cachedPreparation) {
        return {
          preparedSection: cachedPreparation.preparedSection,
          audioBlob: cachedPreparation.audioBlob,
          playback: cachedPreparation.playback,
          startAtMs: cachedPreparation.startAtMs,
        };
      }

      const preparedSection = await overallTestService.prepareSectionForTest(testId);
      if (!mounted) return null;
      // Reloads and direct links must use the existing warning page. They must
      // not reveal a second start screen or start an unadmitted audio element.
      if (preparedSection?.requiresStart) {
        returnToWarning();
        return null;
      }
      const audioBlob = preparedSection?.phase === "REVIEW"
        ? null : await overallTestService.preloadListeningAudioForTest(testId);
      return { preparedSection, audioBlob, playback: null, startAtMs: null };
    };

    void loadPreparation()
      .then(async (preparation) => {
        if (!preparation) return;
        const { preparedSection, audioBlob, playback, startAtMs } = preparation;
        if (!mounted || hasSubmittedRef.current) return;
        if (preparedSection?.phase === "REVIEW" && !preparedSection.requiresStart) {
          setActiveAudioUrl(null);
          setListeningPreparationState("started");
          applySectionTimer(preparedSection);
          return;
        }
        if (!preparedSection || !audioBlob) {
          throw new Error("Dinleme sesi hazırlanamadı.");
        }

        const nativePlayback = playback ?? await prepareListeningAudioPlayback(audioBlob);
        if (!mounted) { nativePlayback.dispose(); return; }
        ownedPlayback = nativePlayback;
        setPreparedAudioElement(nativePlayback.audio);
        setPreparedStartAtMs(startAtMs);
        setActiveAudioUrl(nativePlayback.objectUrl);

        if (preparedSection.requiresStart) {
          const audioDuration = Math.max(
            0,
            Math.round(Number(preparedSection.audioDurationSeconds || 0)),
          );
          setListeningPhase("AUDIO");
          setAuthoritativeAudioProgress({
            positionSeconds: 0,
            capturedAtMs: 0,
          });
          setTimeLeft(audioDuration);
          setTimerActive(false);
          setShowReviewNotice(false);
          setRequiresAudioStart(true);
          setListeningPreparationState("ready");
          return;
        }

        listeningPreparationStore.clear(testId);
        setListeningPreparationState("started");
        applySectionTimer(preparedSection);
      })
      .catch(async (error) => {
        if (!mounted || hasSubmittedRef.current) return;
        if (await recoverSubmittedSection()) return;
        if (!mounted) return;
        const message = getOverallSectionTimerErrorMessage(error);
        setSectionTimerError(message);
        const errorCode = getOverallSectionTimerErrorCode(error);
        setCanRetryAudioPreparation(!errorCode);
        if (errorCode === "TEST_TIME_EXPIRED") {
          setSectionTimerError(null);
          setListeningPreparationState("started");
          setListeningPhase("REVIEW");
          setTimeLeft(0);
          setTimerActive(false);
          setShowReviewNotice(true);
          return;
        }
        setListeningPreparationState("error");
        toast.error(message);
      })
      .finally(() => {
        if (mounted) setSectionTimerLoading(false);
      });

    return () => {
      mounted = false;
      ownedPlayback?.dispose();
    };
  }, [
    navigate,
    applySectionTimer,
    audioPreparationAttempt,
    practiceMode,
    testId,
    recoverSubmittedSection,
  ]);

  useEffect(() => {
    const token = overallTestTokenStore.getByTestId(testId);
    if (!token) { draftLoadedRef.current = true; setDraftReady(true); return; }
    let mounted = true;
    setDraftLoadError(false);
    listeningSubmissionService.getDraft(token).then((draft) => {
      if (!mounted || hasSubmittedRef.current) return;
      if (!draft) throw new Error("Draft unavailable");
      const restored = normalizeRestoredAnswers(draft.answers);
      const local = localProgressRef.current;
      const serverSavedAt = draft.lastSavedAt ? Date.parse(draft.lastSavedAt) : 0;
      const localAnswers = local?.pendingAnswers ??
        (Number(local?.updatedAt || 0) > (serverSavedAt || 0) ? local?.userAnswers || {} : {});
      pendingAnswersRef.current = { ...localAnswers, ...editedAnswersRef.current };
      latestAnswersRef.current = { ...restored, ...pendingAnswersRef.current };
      draftRevisionRef.current += 1;
      setUserAnswers(latestAnswersRef.current);
      draftLoadedRef.current = true;
      setDraftReady(true);
    }).catch(() => { if (mounted) setDraftLoadError(true); });
    return () => { mounted = false; };
  }, [testId, draftRetryKey]);

  useEffect(() => {
    if (
      !draftReady ||
      Object.keys(pendingAnswersRef.current).length === 0 ||
      !hasOverallTimerRef.current ||
      hasSubmittedRef.current ||
      autoSubmitRef.current ||
      sectionTimerLoading ||
      sectionTimerError ||
      timeLeft <= 0
    ) {
      return;
    }

    if (timeLeft <= 1) {
      void queueListeningDraft(userAnswers);
      return;
    }

    if (draftSaveTimerRef.current) {
      window.clearTimeout(draftSaveTimerRef.current);
    }
    draftSaveTimerRef.current = window.setTimeout(() => {
      void queueListeningDraft(userAnswers);
    }, 900);

    return () => {
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [
    draftReady,
    queueListeningDraft,
    sectionTimerError,
    sectionTimerLoading,
    timeLeft,
    userAnswers,
  ]);

  // Track screen size (lg breakpoint: 1024px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const set = () => setIsLg(mq.matches);
    set();
    try {
      mq.addEventListener('change', set);
    } catch {
      // Safari
      // @ts-ignore
      mq.addListener(set);
    }
    return () => {
      try {
        mq.removeEventListener('change', set);
      } catch {
        // @ts-ignore
        mq.removeListener(set);
      }
    };
  }, []);

  useEffect(() => {
    if (currentPartNumber !== 3) {
      setMobilePart3OpenId(null);
    }
  }, [currentPartNumber]);
  
  useEffect(() => {
    if (currentPartNumber !== 4) {
      setMobilePart4MapZoomed(false);
      setPart4MapTool("none");
    }
  }, [currentPartNumber]);

  useEffect(() => {
    const content = contentScrollRef.current;
    if (content) content.scrollTop = 0;
  }, [currentPartNumber]);

  useEffect(() => {
    setIsPartSwitchAnimating(true);
    const raf = window.requestAnimationFrame(() => {
      setIsPartSwitchAnimating(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [currentPartNumber]);

  useEffect(() => {
    return () => {
      stopAllMediaPlayback();
      if (inkPulseTimeoutRef.current) {
        window.clearTimeout(inkPulseTimeoutRef.current);
        inkPulseTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredProgressRef.current || hasSubmittedRef.current) return;
    const snapshot: ListeningProgressSnapshot = {
      pendingAnswers: { ...pendingAnswersRef.current },
      currentPartNumber,
      userAnswers,
      timeLeft,
      timerActive,
      showReviewNotice,
      listeningPhase,
      fontScale,
      updatedAt: Date.now(),
    };
    try {
      if (progressStorageKey) sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [
    progressStorageKey,
    draftAcknowledgement,
    currentPartNumber,
    userAnswers,
    timeLeft,
    timerActive,
    showReviewNotice,
    listeningPhase,
    fontScale,
  ]);

  // Keep scrolling inside the test content only (prevents page-level white gap on mobile).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, []);
  

  // Keep the exam route locked and recover cleanly when fullscreen is left.
  useEffect(() => {
    if (practiceMode) {
      setShowFullscreenPrompt(false);
      return;
    }
    let disposed = false;
    const fullscreenGuardEnabled =
      listeningPreparationState === "started";

    const addNavigationLock = () => {
      // Prevent back navigation within the test
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
        // toast.error("Sınav sırasında geri gidemezsiniz");
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      // Warn on refresh/close
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

      if (
        fullscreenGuardEnabled &&
        fullscreenWasActiveRef.current &&
        !hasSubmittedRef.current
      ) {
        setShowFullscreenPrompt(true);
      }
    };

    const cleanupNav = addNavigationLock();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    if (fullscreenGuardEnabled) {
      if (!getActiveFullscreenElement()) {
        setShowFullscreenPrompt(true);
        void requestExamFullscreen().then((enteredFullscreen) => {
          if (!disposed && enteredFullscreen) {
            setShowFullscreenPrompt(false);
          }
        });
        window.setTimeout(() => {
          if (
            !disposed &&
            !getActiveFullscreenElement() &&
            !hasSubmittedRef.current
          ) {
            setShowFullscreenPrompt(true);
          }
        }, 300);
      }
    } else {
      setShowFullscreenPrompt(false);
    }
    const fullscreenGuardInterval = window.setInterval(() => {
      if (
        fullscreenGuardEnabled &&
        !disposed &&
        !getActiveFullscreenElement() &&
        !hasSubmittedRef.current
      ) {
        setShowFullscreenPrompt(true);
      }
    }, 1000);

    return () => {
      disposed = true;
      window.clearInterval(fullscreenGuardInterval);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      cleanupNav?.();

      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && getActiveFullscreenElement()) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
    };
  }, [listeningPreparationState, practiceMode, requestExamFullscreen]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const shouldRunOverallTimer =
      hasOverallTimerRef.current && !!backendTimerRef.current;

    if (!sectionTimerLoading && (timerActive || shouldRunOverallTimer) && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const backendRemaining = getBackendRemainingSeconds();
          return backendRemaining === null
            ? (prev > 0 ? prev - 1 : 0)
            : Math.max(0, backendRemaining);
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sectionTimerLoading, timerActive, timeLeft]);

  useEffect(() => {
    if (
      practiceMode ||
      hasOverallTimerRef.current ||
      sectionTimerLoading ||
      !timerActive ||
      timeLeft !== 0 ||
      isSubmitting ||
      hasSubmittedRef.current
    ) {
      return;
    }

    setTimerActive(false);
    void handleSubmit();
  }, [isSubmitting, practiceMode, sectionTimerLoading, timeLeft, timerActive]);

  useEffect(() => {
    if (
      !hasOverallTimerRef.current ||
      sectionTimerLoading ||
      sectionTimerError ||
      listeningPhase !== "AUDIO" ||
      timeLeft !== 0
    ) {
      return;
    }

    void refetchSectionTimer().catch((error) => {
      const message = getOverallSectionTimerErrorMessage(error);
      setSectionTimerError(message);
      toast.error(message);
    });
  }, [listeningPhase, refetchSectionTimer, sectionTimerError, sectionTimerLoading, timeLeft]);

  useEffect(() => {
    if (sectionTimerLoading || isSubmitting || hasSubmittedRef.current ||
      !hasOverallTimerRef.current || listeningPhase !== "REVIEW" || timeLeft !== 0 ||
      !testData || autoSubmitAttempts >= 3 || (autoSubmitRef.current && !submitError)) return;
    const attempt = () => {
      autoSubmitRef.current = true;
      setSectionTimerError(null);
      setAutoSubmitAttempts((count) => count + 1);
      void handleSubmit();
    };
    if (autoSubmitAttempts === 0) {
      toast.message("Süre bitti. Cevaplarınız gönderiliyor.");
      attempt();
      return;
    }
    const timeout = window.setTimeout(attempt, 2000 * 2 ** (autoSubmitAttempts - 1));
    return () => window.clearTimeout(timeout);
  }, [listeningPhase, sectionTimerLoading, sectionTimerError, isSubmitting, timeLeft, testData, autoSubmitAttempts, submitError]);

  // Handle audio ended - start timer
  const handleAudioEnded = () => {
    if (practiceMode) return;
    if (hasOverallTimerRef.current) {
      void refetchSectionTimer().catch((error) => {
        const message = getOverallSectionTimerErrorMessage(error);
        setSectionTimerError(message);
        toast.error(message);
      });
      return;
    }
    setTimeLeft(600);
    setTimerActive(true);
    setListeningPhase("REVIEW");
    setShowReviewNotice(true);
  };

  const triggerRadioInkPulse = (questionId: string, answer: string) => {
    const key = `${questionId}::${answer}`;
    setInkPulseKey(key);
    if (inkPulseTimeoutRef.current) {
      window.clearTimeout(inkPulseTimeoutRef.current);
    }
    inkPulseTimeoutRef.current = window.setTimeout(() => {
      setInkPulseKey((curr) => (curr === key ? null : curr));
    }, 220);
  };

  const isRadioInkActive = (questionId: string, answer: string) => inkPulseKey === `${questionId}::${answer}`;
  const handleAnswerSelect = (
    questionId: string,
    answer: string,
    _partNumber = 0,
    _questionIds: string[] = [],
  ) => {
    if (sectionTimerLoading || sectionTimerError || submitStartedRef.current || hasSubmittedRef.current || (hasOverallTimerRef.current && timeLeft <= 0)) return;
    const current = latestAnswersRef.current;
    const next = assignListeningAnswer({ answers: current, questionId, option: answer });
    if (next === current) return;
    triggerRadioInkPulse(questionId, answer);
    latestAnswersRef.current = next;
    editedAnswersRef.current[questionId] = next[questionId] ?? "";
    pendingAnswersRef.current[questionId] = next[questionId] ?? "";
    draftRevisionRef.current += 1;
    setPracticeResult(null);
    setUserAnswers(next);
  };

  const scrollContentToTop = (behavior: ScrollBehavior = "auto") => {
    const content = contentScrollRef.current;
    if (content) {
      content.scrollTo({ top: 0, behavior });
      return;
    }
    window.scrollTo({ top: 0, behavior });
  };

  const goToNextBolum = () => {
    setCurrentPartNumber((prev) => Math.min(6, prev + 1));
    setActiveQuestionNumber(null);
    scrollContentToTop("smooth");
  };
  const goToPrevBolum = () => {
    setCurrentPartNumber((prev) => Math.max(1, prev - 1));
    setActiveQuestionNumber(null);
    scrollContentToTop("smooth");
  };

  const getTotalQuestions = () => {
    // Sum across normalized bölüm groups 1..6
    let total = 0;
    for (let i = 1; i <= 6; i++) {
      total += getQuestionsForPartNumber(i).length;
    }
    return total;
  };

  const getAnsweredCountForPart = (partNumber: number) => {
    const questions = getQuestionsForPartNumber(partNumber);
    return questions.reduce((count, q: any) => (userAnswers[q.id] ? count + 1 : count), 0);
  };

  const getAllSections = () => {
    const sections: any[] = [];
    if (!testData?.parts) return sections;
    for (const p of testData.parts as any[]) {
      const parentPartNumber = typeof p.number === 'number' ? p.number : undefined;
      for (const s of (p.sections || [])) {
        sections.push({
          ...s,
          partNumber: parentPartNumber,
        });
      }
    }
    return sections;
  };

  // Use actual parent part numbers from API instead of guessing by text

  const getQuestionsForPartNumber = (partNumber: number) => {
    const questions: any[] = [];
    const sections = getAllSections();
    
    sections.forEach((section: any, sectionIndex: number) => {
      if ((section.partNumber || 0) === partNumber) {
        (section.questions || []).forEach((question: any) => {
          questions.push({
            ...question,
            sectionTitle: fixMojibake(section.title || ""),
            sectionContent: fixMojibake(section.content || ""),
            imageUrl: section.imageUrl,
            partNumber,
            sectionIndex,
          });
        });
      }
    });
    
    return orderListeningQuestions(questions);
  };

  const renderQuestion = (question: any, questionNumber: number, partNumber = 0) => {
    const questionId = String(question.id);
    const selectedAnswer = userAnswers[questionId];
    const questionText = fixMojibake(
      String(question.text || question.content || ""),
    ).trim();
    const orderedAnswers = [...(question.answers || [])].sort(
      (left: any, right: any) =>
        String(left?.variantText || "").localeCompare(
          String(right?.variantText || ""),
          "tr",
          { numeric: true },
        ),
    );
    const options =
      question.type === "TRUE_FALSE"
        ? [
            { variantText: "A", displayText: "Doğru" },
            { variantText: "B", displayText: "Yanlış" },
          ]
        : orderedAnswers;

    const optionRows = options.map((answer: any) => {
      const value = String(answer.variantText || "");
      const displayText = fixMojibake(
        String(answer.displayText ?? answer.answer ?? ""),
      ).replace(/^[A-Z][.)]\s*/, "");

      return (
        <ListeningOption
          annotationId={`question:${questionId}:option:${value}`}
          key={`${questionId}-${value}`}
          letter={value}
          text={displayText}
          selected={selectedAnswer === value}
          pulseActive={isRadioInkActive(questionId, value)}
          onSelect={() => {
            setActiveQuestionNumber(questionNumber);
            handleAnswerSelect(questionId, value, partNumber);
          }}
        />
      );
    });

    if (partNumber === 1 && !questionText) {
      return (
        <div
          key={questionId}
          id={`listening-question-${questionNumber}`}
          className="scroll-mt-4"
          onFocusCapture={() => setActiveQuestionNumber(questionNumber)}
        >
          <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-2">
            <ReadingQuestionNumber number={questionNumber} className="pt-2" />
            <div
              role="radiogroup"
              aria-label={`Soru ${questionNumber}`}
              className="grid min-w-0 max-w-3xl grid-cols-1 gap-0.5"
            >
              {optionRows}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={questionId}
        id={`listening-question-${questionNumber}`}
        className="scroll-mt-4 space-y-2.5"
        onFocusCapture={() => setActiveQuestionNumber(questionNumber)}
      >
        <div className="flex min-w-0 items-start gap-2">
          <ReadingQuestionNumber number={questionNumber} />
          {questionText ? (
            <div className="reading-question reading-primary-copy reading-text min-w-0 pt-px font-sans font-normal text-[#242424]">
              <HighlightableTextSimple annotationId={`question:${question.id}:prompt`} text={questionText} />
            </div>
          ) : null}
        </div>

        <div
          role="radiogroup"
          aria-label={`Soru ${questionNumber}`}
          className={
            question.type === "TRUE_FALSE"
              ? "ml-0 grid max-w-[360px] grid-cols-2 gap-1 sm:ml-12"
              : "ml-0 grid max-w-3xl grid-cols-1 gap-0.5 sm:ml-12"
          }
        >
          {optionRows}
        </div>
      </div>
    );
  };
  
const getStaticHeader = (partNumber: number) => {
  const headers = {
    1: "Sorular 1-8. Dinlediğiniz cümleleri tamamlayınız. Cümleleri iki defa dinleyeceksiniz. Her cümleye cevap olabilecek en doğru seçeneği (A, B veya C) işaretleyiniz.",
    2: "Sorular 9-14. Dinlediğiniz metne göre aşağıdaki cümleler için DOĞRU ya da YANLIŞ seçeneklerinden birini işaretleyiniz.\nDOĞRU – cümle, dinleme metnindeki bilgilerle uyumlu ve/veya tutarlıysa \nYANLIŞ – cümle, dinleme metnindeki bilgilerle tutarsız ve/veya çelişkiliyse",
    3: "Sorular 15-18. Şimdi insanların farklı durumlardaki konuşmalarını dinleyeceksiniz. Her konuşmacının (15-18) konuşmalarının ait olduğu seçenekleri (A-F) işaretleyiniz. Seçmemeniz gereken İKİ seçenek bulunmaktadır.",
    4: "Sorular 19-23. Dinleme metnine göre haritadaki yerleri (A-H) eşleştiriniz. Seçilmeyecek üç seçenek vardır.",
    5: "Sorular 24-29. Aşağıdaki soruları okuyunuz ve dinleme metinlerine göre doğru seçeneği (A, B ya da C) işaretleyiniz.",
    6: "Sorular 30-35. Dinleme metnine göre doğru seçeneği (A, B ya da C) işaretleyiniz."
  };
  return headers[partNumber as keyof typeof headers] || `DİNLEME metni ${partNumber}`;
};
const getPartDescription = (partNumber: number) => {
  const part = testData?.parts?.find(
    (candidate) => Number(candidate.number) === partNumber,
  );
  const description = fixMojibake(String(part?.description || "")).trim();
  return description || getStaticHeader(partNumber);
};

const getPartStartNumber = (partNumber: number) => {
  let startNumber = 1;
  for (let part = 1; part < partNumber; part += 1) {
    startNumber += getQuestionsForPartNumber(part).length;
  }
  return startNumber;
};

const renderMatchingSelect = ({
  question,
  questionNumber,
  partNumber,
  questionIds,
  options,
  compact = false,
}: {
  question: any;
  questionNumber: number;
  partNumber: number;
  questionIds: string[];
  options: string[];
  compact?: boolean;
}) => {
  const questionId = String(question.id);
  const selectedAnswer = userAnswers[questionId] || "";

  return (
    <Select
      value={selectedAnswer}
      onValueChange={(value) => {
        setActiveQuestionNumber(questionNumber);
        handleAnswerSelect(
          questionId,
          value,
          partNumber,
          questionIds,
        );
      }}
    >
      <SelectTrigger
        className={`reading-select-trigger reading-part3-compact-select w-[104px] shrink-0 ${
          selectedAnswer ? "reading-select-trigger-selected" : ""
        }`}
        style={compact ? { width: 88, height: 36 } : undefined}
        aria-label={`Soru ${questionNumber} için cevap seç`}
      >
        <SelectValue placeholder="Seç" />
      </SelectTrigger>
      <SelectContent className="reading-select-content z-50 max-h-[60vh] w-[104px] min-w-[104px] max-w-[104px] overflow-y-auto rounded-md border border-[#dededb] bg-white shadow-sm">
        {options.map((option) => (
            <SelectItem
              key={`${questionId}-${option}`}
              value={option}
              className="cursor-pointer py-2 text-[length:calc(16px*var(--reading-font-scale,1))] font-semibold text-[#37352f] focus:bg-[#f1f1ef] data-[state=checked]:bg-[#f1f1ef]"
            >
              {option}
            </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const renderModernPart = (partNumber: number) => {
  const questions = getQuestionsForPartNumber(partNumber);
  const startNumber = getPartStartNumber(partNumber);
  const emptyState = (
    <div className="py-14 text-center text-sm text-[#787774]">
      Bu bölüm için soru bulunamadı.
    </div>
  );

  if (partNumber === 1) {
    const splitIndex = Math.ceil(questions.length / 2);
    const columns = [
      questions.slice(0, splitIndex),
      questions.slice(splitIndex),
    ];

    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-6 lg:py-6">
        {questions.length === 0 ? (
          emptyState
        ) : (
          <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
            {columns.map((column, columnIndex) => (
              <div key={`part-1-column-${columnIndex}`} className="min-w-0">
                {column.map((question, index) => {
                  const offset = columnIndex === 0 ? index : splitIndex + index;
                  return (
                    <div
                      key={question.id}
                      className="border-b border-[#e5e5e2] py-4 last:border-b-0"
                    >
                      {renderQuestion(question, startNumber + offset, partNumber)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (partNumber === 2) {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-4 py-4 sm:px-6 lg:py-8">
        {questions.length === 0 ? (
          emptyState
        ) : (
          <div
            data-listening-true-false-table
            role="table"
            aria-label="Bölüm 2 doğru yanlış soruları"
            className="overflow-x-auto rounded-[4px] border border-[#242424] bg-white"
          >
            <div className="min-w-[620px]">
              <div
                role="row"
                className="grid grid-cols-[minmax(0,1fr)_76px_76px] items-stretch border-b border-[#242424] bg-white"
              >
                <span
                  role="columnheader"
                  className="px-5 py-3 text-[14px] font-semibold text-[#37352f]"
                >
                  Soru
                </span>
                <span
                  role="columnheader"
                  className="flex items-center justify-center border-l border-[#242424] px-1 py-3 text-center text-[13px] font-semibold text-[#37352f]"
                >
                  Doğru
                </span>
                <span
                  role="columnheader"
                  className="flex items-center justify-center border-l border-[#242424] px-1 py-3 text-center text-[13px] font-semibold text-[#37352f]"
                >
                  Yanlış
                </span>
              </div>

              <div role="rowgroup">
                {questions.map((question: any, index: number) => {
                  const questionId = String(question.id);
                  const questionNumber = startNumber + index;
                  const questionText = fixMojibake(
                    String(question.text || question.content || ""),
                  ).trim();
                  const selectedAnswer = userAnswers[questionId];

                  return (
                    <div
                      key={questionId}
                      id={`listening-question-${questionNumber}`}
                      role="row"
                      className="grid min-h-[64px] scroll-mt-4 grid-cols-[minmax(0,1fr)_76px_76px] items-stretch border-b border-[#242424] last:border-b-0"
                      onFocusCapture={() =>
                        setActiveQuestionNumber(questionNumber)
                      }
                    >
                      <div
                        role="cell"
                        className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center px-5 py-3"
                      >
                        <ReadingQuestionNumber number={questionNumber} />
                        <span className="reading-question reading-primary-copy reading-text min-w-0 font-sans font-normal text-[#242424]">
                          <HighlightableTextSimple annotationId={`question:${question.id}:prompt`} text={questionText} />
                        </span>
                      </div>
                      <span
                        role="cell"
                        className="flex items-stretch border-l border-[#242424]"
                      >
                        <ListeningBooleanChoice
                          label="Doğru"
                          selected={selectedAnswer === "A"}
                          pulseActive={isRadioInkActive(questionId, "A")}
                          onSelect={() => {
                            setActiveQuestionNumber(questionNumber);
                            handleAnswerSelect(
                              questionId,
                              "A",
                              partNumber,
                            );
                          }}
                        />
                      </span>
                      <span
                        role="cell"
                        className="flex items-stretch border-l border-[#242424]"
                      >
                        <ListeningBooleanChoice
                          label="Yanlış"
                          selected={selectedAnswer === "B"}
                          pulseActive={isRadioInkActive(questionId, "B")}
                          onSelect={() => {
                            setActiveQuestionNumber(questionNumber);
                            handleAnswerSelect(
                              questionId,
                              "B",
                              partNumber,
                            );
                          }}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (partNumber === 3) {
    const optionMap = new Map<string, any>();
    questions.forEach((question: any) => {
      (question.answers || []).forEach((answer: any) => {
        const value = String(answer?.variantText || "");
        if (value && !optionMap.has(value)) optionMap.set(value, answer);
      });
    });
    const answerOptions = Array.from(optionMap.values()).sort((left: any, right: any) =>
      String(left.variantText).localeCompare(String(right.variantText), "tr", {
        numeric: true,
      }),
    );
    const optionValues = answerOptions.map((option: any) =>
      String(option.variantText),
    );
    const questionIds = questions.map((question: any) => String(question.id));
    const questionList = (
      <div className="listening-matching-question-list ml-auto w-full max-w-[394px] space-y-0 px-4 lg:pt-6">
        {questions.map((question: any, index: number) => {
          const questionNumber = startNumber + index;
          const questionText = fixMojibake(
            String(question.text || question.content || ""),
          ).trim();

          return (
            <div
              key={question.id}
              id={`listening-question-${questionNumber}`}
              className="listening-matching-question-row grid min-h-[64px] scroll-mt-4 grid-cols-[52px_190px_88px] items-center gap-x-2 border-b border-[#e5e5e2] py-3 last:border-b-0"
            >
              <ReadingQuestionNumber number={questionNumber} />
              <div className="reading-question reading-primary-copy reading-text min-w-0 font-normal text-[#242424]">
                {questionText ? (
                  <HighlightableTextSimple annotationId={`question:${question.id}:prompt`} text={questionText} />
                ) : (
                  <span className="text-[#787774]">Konuşmacı {index + 1}</span>
                )}
              </div>
              {renderMatchingSelect({
                question,
                questionNumber,
                partNumber,
                questionIds,
                options: optionValues,
                compact: true,
              })}
            </div>
          );
        })}
      </div>
    );
    const optionList = (
      <div className="space-y-1">
        <h3 className="reading-options-heading mb-3">Seçenekler</h3>
        {answerOptions.map((option: any) => (
          <ListeningOptionLegendRow
            annotationId={`part:${partNumber}:option:${option.variantText}`}
            key={option.id || option.variantText}
            letter={String(option.variantText)}
            text={fixMojibake(
              String(option.displayText ?? option.answer ?? ""),
            ).replace(/^[A-Z][.)]\s*/, "")}
            selectionCount={countOptionSelections(
              userAnswers,
              questionIds,
              String(option.variantText),
            )}
          />
        ))}
      </div>
    );

    return (
      <ListeningMobileSplitPanels
        className="listening-mobile-matching-panels"
        upper={<div className="reading-scroll listening-matching-questions h-full overflow-y-auto">{questionList}</div>}
        lower={optionList}
      >
      <div className="h-full min-h-[420px]">
        <div className="grid grid-cols-1 lg:hidden">
          <div className="px-4 py-3">{questionList}</div>
          <div className="reading-surface-alt border-t border-[#e5e5e2] px-4 py-4">
            {optionList}
          </div>
        </div>
        <ResizablePanelGroup
          key="listening-part-3-panels-35-65"
          direction="horizontal"
          className="listening-part3-desktop-panels hidden h-full min-h-[420px] overflow-hidden border-t border-[#e5e5e2] lg:flex"
        >
          <ResizablePanel defaultSize={35} minSize={34}>
            <div className="reading-scroll h-full overflow-y-auto px-6 py-4">
              {questions.length === 0 ? emptyState : questionList}
            </div>
          </ResizablePanel>
          <ListeningSplitHandle />
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="reading-surface-alt reading-scroll h-full overflow-y-auto px-6 py-5">
              {optionList}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      </ListeningMobileSplitPanels>
    );
  }

  if (partNumber === 4) {
    const partSection = getAllSections().find(
      (section: any) => Number(section.partNumber) === 4,
    );
    const imageUrl =
      partSection?.imageUrl ||
      questions.find((question: any) => question.imageUrl)?.imageUrl;
    const resolvedImageUrl = imageUrl
      ? imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
        ? imageUrl
        : toApiUrl(imageUrl)
      : "";
    const questionIds = questions.map((question: any) => String(question.id));
    const questionList = (
      <div>
        <h3 className="reading-options-heading mb-2">Sorular</h3>
        {questions.map((question: any, index: number) => {
          const questionNumber = startNumber + index;
          return (
            <div
              key={question.id}
              id={`listening-question-${questionNumber}`}
              className="listening-map-answer-row flex scroll-mt-4 items-center gap-3 border-b border-[#e5e5e2] py-4 last:border-b-0"
            >
              <ReadingQuestionNumber number={questionNumber} />
              <div className="reading-question reading-primary-copy reading-text min-w-0 max-w-[320px] font-normal text-[#242424]">
                <HighlightableTextSimple
                  annotationId={`question:${question.id}:prompt`}
                  text={fixMojibake(
                    String(question.text || question.content || ""),
                  )}
                />
              </div>
              {renderMatchingSelect({
                question,
                questionNumber,
                partNumber,
                questionIds,
                options: PART_FOUR_MATCHING_OPTIONS,
                compact: true,
              })}
            </div>
          );
        })}
      </div>
    );
    const renderMapPanel = (allowZoom: boolean) => {
      const isPart4MapZoomed = allowZoom && mobilePart4MapZoomed;

      return (
        <div className="flex h-full min-h-0 flex-col">
        <div className="listening-map-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-[#e5e5e2] px-5 py-3">
          <h3 className="reading-options-heading">Harita</h3>
          <div className="flex items-center gap-1">
            {allowZoom ? (
              <button
                type="button"
                onClick={() => setMobilePart4MapZoomed((value) => !value)}
                className="flex h-7 w-7 items-center justify-center rounded text-[#5f5e5a] transition-colors hover:bg-[#f1f1ef] hover:text-[#37352f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
                aria-label={isPart4MapZoomed ? "Haritayı küçült" : "Haritayı büyüt"}
                title={isPart4MapZoomed ? "Haritayı küçült" : "Haritayı büyüt"}
              >
                {isPart4MapZoomed ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setPart4MapTool((value) =>
                  value === "draw" ? "none" : "draw",
                )
              }
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 ${
                part4MapTool === "draw"
                  ? "bg-[#e9e9e6] text-[#37352f]"
                  : "text-[#5f5e5a] hover:bg-[#f1f1ef] hover:text-[#37352f]"
              }`}
              aria-label={
                part4MapTool === "draw"
                  ? "Kalemi kapat"
                  : "Harita üzerinde çiz"
              }
              aria-pressed={part4MapTool === "draw"}
              title={
                part4MapTool === "draw"
                  ? "Kalemi kapat"
                  : "Harita üzerinde çiz"
              }
            >
              <PencilLine className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setPart4MapTool((value) =>
                  value === "erase" ? "none" : "erase",
                )
              }
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 ${
                part4MapTool === "erase"
                  ? "bg-[#e9e9e6] text-[#37352f]"
                  : "text-[#5f5e5a] hover:bg-[#f1f1ef] hover:text-[#37352f]"
              }`}
              aria-label={
                part4MapTool === "erase" ? "Silgiyi kapat" : "Silgiyi aç"
              }
              aria-pressed={part4MapTool === "erase"}
              title={
                part4MapTool === "erase" ? "Silgiyi kapat" : "Silgiyi aç"
              }
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          data-map-zoomed={isPart4MapZoomed}
          className={`listening-map-scroll reading-scroll flex min-h-0 flex-1 items-center justify-center overflow-auto p-5 ${
            part4MapTool === "none"
              ? allowZoom
                ? isPart4MapZoomed
                  ? "cursor-zoom-out"
                  : "cursor-zoom-in"
                : "cursor-default"
              : "cursor-crosshair"
          }`}
          onClick={() => {
            if (allowZoom && part4MapTool === "none") {
              setMobilePart4MapZoomed((value) => !value);
            }
          }}
        >
          {resolvedImageUrl ? (
            <div className="listening-map-image w-full max-w-[760px]">
              <MapWithDrawing
                annotationId="part:4:map"
                src={resolvedImageUrl}
                alt="Sorular 19-23 için harita"
                className="block h-auto w-full object-contain"
                tool={part4MapTool}
                zoomed={isPart4MapZoomed}
              />
            </div>
          ) : (
            <div className="text-sm text-[#787774]">Görsel bulunamadı.</div>
          )}
        </div>
        </div>
      );
    };

    return (
      <ListeningMobileSplitPanels
        className="listening-mobile-map-panels"
        upper={renderMapPanel(false)}
        lower={questions.length === 0 ? emptyState : questionList}
      >
      <div className="h-full min-h-[440px]">
        <div className="grid lg:hidden">
          <div className="min-h-[360px] border-b border-[#e5e5e2]">
            {renderMapPanel(true)}
          </div>
          <div className="px-4 py-3">
            {questions.length === 0 ? emptyState : questionList}
          </div>
        </div>
        <ResizablePanelGroup
          key="listening-part-4-panels"
          direction="horizontal"
          className={`hidden h-full min-h-[520px] overflow-hidden ${practiceMode ? "border-b" : "border-y"} border-[#e5e5e2] lg:flex`}
        >
          <ResizablePanel defaultSize={52} minSize={40}>
            {renderMapPanel(false)}
          </ResizablePanel>
          <ListeningSplitHandle />
          <ResizablePanel defaultSize={48} minSize={36}>
            <div className="reading-scroll h-full overflow-y-auto px-6 py-4">
              {questions.length === 0 ? emptyState : questionList}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      </ListeningMobileSplitPanels>
    );
  }

  if (partNumber === 5) {
    const dialogGroups = Array.from(
      { length: Math.ceil(questions.length / 2) },
      (_, dialogIndex) => questions.slice(dialogIndex * 2, dialogIndex * 2 + 2),
    );

    return (
      <div className="mx-auto w-full max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
        {questions.length === 0
          ? emptyState
          : dialogGroups.map((dialogQuestions, dialogIndex) => (
              <section
                key={`dialog-${dialogIndex + 1}`}
                className="border-b border-[#deded9] py-6 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="mb-2 flex items-center bg-[#f1f1ef] px-3 py-2">
                  <h3 className="reading-options-heading whitespace-nowrap">
                    {dialogIndex + 1}. diyalog
                  </h3>
                </div>
                <div className="divide-y divide-[#efefec]">
                  {dialogQuestions.map((question: any, questionIndex: number) => {
                    const index = dialogIndex * 2 + questionIndex;
                    return (
                      <div key={question.id} className="py-4">
                        {renderQuestion(
                          question,
                          startNumber + index,
                          partNumber,
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
      {questions.length === 0 ? (
        emptyState
      ) : (
        <div>
          {questions.map((question: any, index: number) => (
            <div
              key={question.id}
              className="border-b border-[#e5e5e2] py-5 last:border-b-0"
            >
              {renderQuestion(question, startNumber + index, partNumber)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  const renderModernTabs = () => {
    const sections: Array<{
      number: number;
      questions: number[];
      partQuestions: any[];
    }> = [];
    let nextQuestionNumber = 1;

    for (let partNumber = 1; partNumber <= 6; partNumber += 1) {
      const partQuestions = getQuestionsForPartNumber(partNumber);
      sections.push({
        number: partNumber,
        questions: partQuestions.map(
          (_question, index) => nextQuestionNumber + index,
        ),
        partQuestions,
      });
      nextQuestionNumber += partQuestions.length;
    }

    const currentSection =
      sections.find((section) => section.number === currentPartNumber) ||
      sections[0];
    const visibleActiveQuestion =
      activeQuestionNumber ?? currentSection?.questions[0] ?? null;

    const openPart = (partNumber: number) => {
      setCurrentPartNumber(partNumber);
      setActiveQuestionNumber(null);
      scrollContentToTop("smooth");
    };

    const openQuestion = (partNumber: number, questionNumber: number) => {
      setCurrentPartNumber(partNumber);
      setActiveQuestionNumber(questionNumber);
      window.setTimeout(() => {
        document
          .getElementById(`listening-question-${questionNumber}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, partNumber === currentPartNumber ? 0 : 180);
    };

    const renderQuestionButton = (
      section: (typeof sections)[number],
      questionNumber: number,
      questionIndex: number,
      compact = false,
    ) => {
      const questionId = String(
        section.partQuestions[questionIndex]?.id || "",
      );
      const isAnswered = Boolean(questionId && userAnswers[questionId]);
      const isActive =
        section.number === currentPartNumber &&
        questionNumber === visibleActiveQuestion;

      return (
        <button
          key={`${section.number}-${questionNumber}`}
          type="button"
          onClick={() => openQuestion(section.number, questionNumber)}
          className={`flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 ${
            compact ? "h-7 w-7 min-w-7 text-[11px]" : "h-8 w-8 text-xs"
          } ${
            isActive
              ? "border-[#8a8881] bg-[#f1f1ef] text-[#242424]"
              : isAnswered
                ? "border-[#d1d1cc] bg-[#e9e9e6] text-[#37352f]"
                : "border-[#dededb] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#242424]"
          }`}
          aria-current={isActive ? "step" : undefined}
          aria-label={`Soru ${questionNumber}${isAnswered ? ", cevaplandı" : ""}`}
        >
          {questionNumber}
        </button>
      );
    };

    return (
      <footer className="hidden shrink-0 border-t border-[#e5e5e2] bg-white lg:block">
        <div
          className={`mx-auto flex items-center gap-3 px-4 py-2 ${
            showAllQuestionNumbers ? "max-w-none" : "max-w-[1440px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setShowAllQuestionNumbers((value) => !value)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
              showAllQuestionNumbers
                ? "border-[#c9c9c4] bg-[#e9e9e6] text-[#2f2e2a]"
                : "border-[#d8d8d4] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#37352f]"
            }`}
            aria-label={
              showAllQuestionNumbers
                ? "Bölüm görünümüne dön"
                : `Tüm ${getTotalQuestions()} soruyu göster`
            }
            aria-pressed={showAllQuestionNumbers}
            title={
              showAllQuestionNumbers
                ? "Bölüm görünümüne dön"
                : "Tüm soruları göster"
            }
          >
            {showAllQuestionNumbers ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </button>

          <span className="h-6 w-px shrink-0 bg-[#e5e5e2]" />

          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto [scrollbar-width:thin]">
            {showAllQuestionNumbers ? (
              sections.map((section, groupIndex) => (
                <div
                  key={`all-${section.number}`}
                  className={`flex shrink-0 items-center gap-1 ${
                    groupIndex > 0
                      ? "ml-1.5 border-l border-[#dededb] pl-1.5"
                      : ""
                  }`}
                >
                  {section.questions.map((questionNumber, index) =>
                    renderQuestionButton(section, questionNumber, index, true),
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-1">
                  {sections.map((section) => (
                    <button
                      key={`part-${section.number}`}
                      type="button"
                      onClick={() => openPart(section.number)}
                      className={`h-8 whitespace-nowrap rounded px-2.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 ${
                        currentPartNumber === section.number
                          ? "bg-[#f1f1ef] text-[#242424]"
                          : "text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]"
                      }`}
                    >
                      Bölüm {section.number}
                    </button>
                  ))}
                </div>
                <span className="h-6 w-px shrink-0 bg-[#e5e5e2]" />
                <div className="flex shrink-0 items-center gap-1.5">
                  {currentSection?.questions.map((questionNumber, index) =>
                    renderQuestionButton(currentSection, questionNumber, index),
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={goToPrevBolum}
              disabled={currentPartNumber <= 1}
              className="flex h-9 w-9 items-center justify-center rounded border border-black bg-white text-[#37352f] hover:bg-[#f1f1ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Önceki bölüm"
              title="Önceki bölüm"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={goToNextBolum}
              disabled={currentPartNumber >= 6}
              className="flex h-9 w-9 items-center justify-center rounded border border-black bg-white text-[#37352f] hover:bg-[#f1f1ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Sonraki bölüm"
              title="Sonraki bölüm"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </footer>
    );
  };

  const clearListeningProgress = () => {
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
    try { sessionStorage.removeItem(audioProgressStorageKey); } catch {}
  };
  const isListeningReviewPhase =
    listeningPhase === "REVIEW" ||
    (!hasOverallTimerRef.current && showReviewNotice && timerActive);

  const handleSubmit = async () => {
    if ((!testData && !hasSubmittedRef.current) || submitStartedRef.current || isSubmitting || sectionTimerLoading || (!!sectionTimerError && !autoSubmitRef.current && !hasSubmittedRef.current) || (!draftReady && timeLeft > 0 && !hasSubmittedRef.current)) return;
    submitStartedRef.current = true;
    setSubmitError(null);
    const requestedSubmitMode: MockSubmitMode =
      autoSubmitRef.current ||
      (hasOverallTimerRef.current &&
        listeningPhase === "REVIEW" &&
        timeLeft <= 0)
        ? "AUTO"
        : "MANUAL";
    try {
      setIsSubmitting(true);
      if (practiceMode) {
        const result = await listeningPracticeService.check(
          testId,
          latestAnswersRef.current,
          { accessContextId },
        );
        setPracticeResult(result);
        stopAllMediaPlayback();
        setShowPracticeReview(true);
        setTimerActive(false);
        toast.success(`${result.correct} / ${result.total} doğru cevap`);
        return;
      }
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }

      const overallToken = testData?.id
        ? overallTestTokenStore.getByTestId(testData.id)
        : null;
      if (!overallToken && hasOverallTimerRef.current && !hasSubmittedRef.current) {
        if (await recoverSubmittedSection()) return;
        throw new Error("Oturum sonucu doğrulanamadı. Yeniden deneyin.");
      }
      if (overallToken) {
        if (requestedSubmitMode === "MANUAL") {
          await queueListeningDraft(userAnswers);
        } else {
          await draftSaveQueueRef.current;
        }
      }

      stopAllMediaPlayback();
      setTimerActive(false);
      setShowReviewNotice(false);
      
      // Store answers locally until the official section submit succeeds.
      let currentListeningAnswersData: {
        testId: string;
        answers: { questionId: string; userAnswer: string }[];
        audioUrl: string | null;
        imageUrls: string[];
        timestamp: string;
      } | null = null;
      let submittedResultId = acceptedResultIdRef.current;
      if (testData?.id && !hasSubmittedRef.current) {
        // Collect all image URLs from sections
        const imageUrls: string[] = [];
        if (testData.parts) {
          testData.parts.forEach((part: any) => {
            if (part.sections) {
              part.sections.forEach((section: any) => {
                if (section.imageUrl) {
                  imageUrls.push(section.imageUrl);
                }
              });
            }
          });
        }
        
        currentListeningAnswersData = {
          testId: testData.id,
          answers: Object.entries(latestAnswersRef.current).map(([questionId, userAnswer]) => ({ questionId, userAnswer })),
          audioUrl: null,
          imageUrls: imageUrls,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem(`listening_answers_${testData.id}`, JSON.stringify(currentListeningAnswersData));

        if (overallToken) {
          let submitMode = requestedSubmitMode;
          let submissionResult;
          try {
            submissionResult = await listeningSubmissionService.submitAnswers(
              testData.id,
              currentListeningAnswersData.answers,
              overallToken,
              currentListeningAnswersData.audioUrl,
              currentListeningAnswersData.imageUrls,
              submitMode,
            );
          } catch (error) {
            if (
              submitMode !== "MANUAL" ||
              getOverallSectionTimerErrorCode(error) !== "TEST_TIME_EXPIRED"
            ) {
              throw error;
            }

            autoSubmitRef.current = true;
            submitMode = "AUTO";
            submissionResult = await listeningSubmissionService.submitAnswers(
              testData.id,
              [],
              overallToken,
              currentListeningAnswersData.audioUrl,
              currentListeningAnswersData.imageUrls,
              submitMode,
            );
          }
          if (submissionResult && typeof submissionResult === "object") {
            const resultId = String(
              (submissionResult as { testResultId?: unknown }).testResultId || "",
            ).trim();
            if (resultId) submittedResultId = resultId;
          }
          hasSubmittedRef.current = true;
          acceptedResultIdRef.current = submittedResultId;
          try { sessionStorage.removeItem(`listening_answers_${testData.id}`); } catch {}
        }
      }

      const nextPath = overallTestFlowStore.onTestCompleted("LISTENING", testData?.id || testId);
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
          stopAllMediaPlayback();
          clearListeningProgress();
          navigate(nextPath);
          return;
        }
      
      // If no next test, we're at the end - submit all tests
        const overallId = overallTestFlowStore.getOverallId();
        if (overallId && overallTestFlowStore.isAllDone()) {
        const completed = await overallTestService.complete(overallId);
        if (!completed) throw new Error("Sınav henüz tamamlanamadı. Yeniden deneyin.");
        overallTestFlowStore.markCompleted();
        clearListeningProgress();
        navigate(`/overall-results/${overallId}`);
        return;
      }
      
      // A section-only session still needs its real persisted result.
      stopAllMediaPlayback();
      clearListeningProgress();
      if (submittedResultId) {
        navigate(`/listening-test/results/${submittedResultId}`);
        return;
      }
      toast.error("Dinleme sonucu bulunamadı. Lütfen Raporlar sayfasını kontrol edin.");
      navigate("/app/sonuclar");
    } catch (error) {
      console.error("Listening navigation error", error);
      if (!hasSubmittedRef.current && await recoverSubmittedSection()) return;
      const message = getOverallSectionTimerErrorMessage(error);
      setSubmitError(message || "Gönderilemedi. Yeniden deneyin.");
      if (message) toast.error(message);
    } finally {
      submitStartedRef.current = false;
      setIsSubmitting(false);
    }
  };


  const handleSubmitClick = () => {
    if (practiceMode && practiceResult?.review) { stopAllMediaPlayback(); setShowPracticeReview(true); return; }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    handleSubmit();
  };

  const answeredPracticeCount = Object.values(userAnswers).filter((value) =>
    String(value || "").trim(),
  ).length;

  const confirmPracticeExit = () => {
    setShowExitModal(false);
    setTimerActive(false);
    stopAllMediaPlayback();
    navigate("/app/pratik?bolum=listening");
  };

  const showReviewTimer = showReviewNotice && isListeningReviewPhase;
  const showListeningPreparation =
    listeningPreparationState !== "started";
  const submitDisabled =
    sectionTimerLoading || isSubmitting || showListeningPreparation || (!!sectionTimerError && !hasSubmittedRef.current) || (!draftReady && timeLeft > 0);
  const submitLabel = sectionTimerLoading
    ? "Yükleniyor"
    : practiceMode
      ? practiceResult?.review ? `Sonuçlar · ${practiceResult.correct}/${practiceResult.total}` : "Kontrol Et"
      : "GÖNDER";
  const submitConfirmationMessage = practiceMode
    ? "Cevaplarınızı kontrol etmek istiyor musunuz? Kontrolden sonra cevaplarınızı değiştirmeye devam edebilirsiniz."
    : isListeningReviewPhase
    ? "Dinleme bölümünü göndermek istiyor musunuz? Gönderdikten sonra cevaplarınızı değiştiremezsiniz."
    : "Ses kaydı henüz bitmedi. Şimdi gönderirseniz kalan ses ve kontrol süresi sona erer; cevaplarınızı daha sonra değiştiremezsiniz.";

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!testData && hasSubmittedRef.current && submitError) {
    return <div className="mx-auto max-w-lg p-6" role="alert"><p>{submitError}</p><Button disabled={isSubmitting} onClick={() => void handleSubmit()}>Göndermeyi tekrar dene</Button></div>;
  }

  if (!testData && overallTestFlowStore.getOverallId()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-md space-y-4 text-center text-[#37352f]" role={sectionTimerLoading ? "status" : "alert"}>
          <p className="text-sm leading-6">
            {sectionTimerLoading
              ? "Sınav durumunuz kontrol ediliyor..."
              : sectionTimerError || "Sınav içeriği yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."}
          </p>
          {!sectionTimerLoading && (
            <Button variant="outline" onClick={() => {
              setLoading(true);
              setContentRetryKey((attempt) => attempt + 1);
              setAudioPreparationAttempt((attempt) => attempt + 1);
            }}>
              Yeniden dene
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-md space-y-4 text-center text-[#37352f]" role="alert">
          <p className="text-base font-medium">{contentLoadError || "Test bulunamadı"}</p>
          {practiceMode ? (
            <Button variant="outline" onClick={() => navigate("/app/pratik?bolum=listening")}>
              Dinleme pratiklerine dön
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // current bölüm to render (1..6)
  const bolum = currentPartNumber;
  const typographyPreset = getReadingTypographyPreset(fontScale);
  const selectedFontScale = typographyPreset.menuValue;

  return (
    <div
      className="relative notranslate reading-exam-page listening-exam-page h-screen-mobile flex flex-col overflow-hidden bg-white font-sans text-[#37352f]"
      translate="no"
      data-exam-translation="disabled"
      data-listening-part={bolum}
      data-practice={practiceMode || undefined}
      data-practice-view={practiceMode ? practicePresentation.mode : undefined}
      style={{ color: "#37352f", ...typographyPreset.style }}
    >
        <span ref={preparedAudioHostRef} hidden aria-hidden="true" />
        <header className="z-50 w-full shrink-0 border-b border-[#e5e5e2] bg-white">
          {/* Match horizontal padding with description block below */}
          <div className="px-3 sm:px-4">
            <div className="flex h-auto items-center justify-between py-2 lg:h-[60px] lg:py-0">
              {/* Mobile Header - Single Line Layout */}
              <div className="block lg:hidden w-full">
                <div className="listening-mobile-header-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="listening-mobile-brand flex items-center gap-2 min-w-0">
                    <img
                      src="/logo11.svg"
                      alt="TURKISHMOCK"
                      className="h-9 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="listening-mobile-heading min-w-0 leading-tight">
                      <div className="truncate text-sm font-semibold text-[#37352f]">
                        Dinleme
                      </div>
                      <div className="text-[10px] font-semibold text-gray-500 truncate">
                        Bölüm {bolum}
                      </div>
                    </div>
                  </div>
                  <div className="listening-mobile-actions flex shrink-0 items-center gap-2 justify-self-end">
                    {!practiceMode && showReviewTimer ? (
                      <div
                        className={`shrink-0 rounded border px-2.5 py-1.5 text-[11px] font-semibold leading-none tabular-nums ${
                          timerActive && timeLeft <= 60
                            ? "border-red-200 bg-red-50 text-red-700"
                            : timerActive && timeLeft <= 120
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-[#b9d4b9] bg-[var(--tm-cat-listening-bg)] text-[var(--tm-cat-listening-fg)]"
                        }`}
                        aria-label="Kalan kontrol süresi"
                      >
                        {sectionTimerLoading ? "--:--" : formatTime(timeLeft)}
                      </div>
                    ) : null}
                    {practiceMode ? <PracticeViewControl presentation={practicePresentation} /> : null}
                    {practiceMode ? (
                      <button
                        type="button"
                        onClick={() => setShowExitModal(true)}
                        className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
                        aria-label="Dinleme pratiğinden çık"
                        title="Çık"
                      >
                        <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </button>
                    ) : null}
                    <Button
                      onClick={handleSubmitClick}
                      disabled={submitDisabled}
                      className="h-9 min-h-9 shrink-0 gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-60"
                    >
                      {practiceMode ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      ) : null}
                      {submitLabel}
                    </Button>
                  </div>
                </div>

                <div className="listening-mobile-audio-row mt-2 flex items-center gap-2">
                  {practiceMode && activeAudioUrl && !isSubmitting ? (
                    <ListeningPracticeAudioPlayer
                      className="flex-1"
                      src={activeAudioUrl.startsWith("blob:") || activeAudioUrl.startsWith("http://") || activeAudioUrl.startsWith("https://") ? activeAudioUrl : toApiUrl(activeAudioUrl)}
                    />
                  ) : null}
                  {!practiceMode && !isLg && activeAudioUrl && !isSubmitting && (
                    <div className="min-w-0 flex-1 overflow-hidden rounded-lg">
                      <AudioPlayer
                        src={
                          activeAudioUrl.startsWith("blob:") ||
                          activeAudioUrl.startsWith("http://") ||
                          activeAudioUrl.startsWith("https://")
                            ? activeAudioUrl
                            : toApiUrl(activeAudioUrl)
                        }
                        onAudioEnded={handleAudioEnded}
                        autoPlay={
                          !practiceMode &&
                          isProgressReady &&
                          !sectionTimerLoading &&
                          !sectionTimerError &&
                          (listeningPhase === "AUDIO" ||
                            (!hasOverallTimerRef.current &&
                              listeningPhase !== "REVIEW"))
                        }
                        persistKey={audioProgressStorageKey}
                        authoritativePositionSeconds={
                          authoritativeAudioProgress?.positionSeconds
                        }
                        authoritativeCapturedAtMs={
                          authoritativeAudioProgress?.capturedAtMs
                        }
                        muted={audioMuted}
                        onMutedChange={setAudioMuted}
                        manualStartRequired={requiresAudioStart}
                        onBeforeManualStart={startPreparedListening}
                        preparedAudioElement={preparedAudioElement}
                        preparedAudioMountedExternally
                        startAtMs={preparedStartAtMs}
                        compact
                      />
                    </div>
                  )}
                  <div className="listening-mobile-font-controls flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="!h-5 !w-5 !min-h-0 rounded border border-gray-200 bg-white p-0 !text-[9px] font-medium leading-none text-gray-700"
                      onClick={() =>
                        setFontScale((value) =>
                          Math.max(0.9, Math.round((value - 0.05) * 100) / 100),
                        )
                      }
                      aria-label="Metni küçült"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className="!h-5 !w-5 !min-h-0 rounded border border-gray-200 bg-white p-0 !text-[9px] font-medium leading-none text-gray-700"
                      onClick={() =>
                        setFontScale((value) =>
                          Math.min(1.1, Math.round((value + 0.05) * 100) / 100),
                        )
                      }
                      aria-label="Metni büyült"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Header - Horizontal Layout */}
              <div className={`hidden w-full items-center gap-4 lg:grid ${practiceMode ? "lg:grid-cols-[auto_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <img 
                    src="/logo11.svg" 
                    alt="TURKISHMOCK" 
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      console.error("Logo failed to load");
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="h-5 w-px shrink-0 bg-[#dededb]" />
                  <div className="truncate text-[17px] font-semibold leading-6 text-[#37352f]">
                    Dinleme
                  </div>
                </div>
                <div className={`${practiceMode ? "hidden" : "flex"} min-w-[92px] justify-center justify-self-center`}>
                  {!practiceMode && showReviewTimer ? (
                    <div
                      className={`flex items-center gap-2 rounded border px-3 py-1.5 leading-none ${
                        timerActive && timeLeft <= 60
                          ? "border-red-200 bg-red-50 text-red-700"
                          : timerActive && timeLeft <= 120
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-[#b9d4b9] bg-[var(--tm-cat-listening-bg)] text-[var(--tm-cat-listening-fg)]"
                      }`}
                    >
                      <span className="text-xs font-semibold">Kontrol süresi</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {sectionTimerLoading ? "--:--" : formatTime(timeLeft)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex min-w-0 items-center gap-2 justify-self-end">
                  {practiceMode && activeAudioUrl && !isSubmitting ? (
                    <ListeningPracticeAudioPlayer
                      className="w-[420px] xl:w-[520px]"
                      src={activeAudioUrl.startsWith("blob:") || activeAudioUrl.startsWith("http://") || activeAudioUrl.startsWith("https://") ? activeAudioUrl : toApiUrl(activeAudioUrl)}
                    />
                  ) : null}
                  {!practiceMode && isLg && activeAudioUrl && !isSubmitting && (
                    <AudioPlayer
                      src={
                        activeAudioUrl.startsWith("blob:") ||
                        activeAudioUrl.startsWith("http://") ||
                        activeAudioUrl.startsWith("https://")
                          ? activeAudioUrl
                          : toApiUrl(activeAudioUrl)
                      }
                      onAudioEnded={handleAudioEnded}
                      autoPlay={
                        !practiceMode &&
                        isProgressReady &&
                        !sectionTimerLoading &&
                        !sectionTimerError &&
                        (listeningPhase === "AUDIO" ||
                          (!hasOverallTimerRef.current &&
                            listeningPhase !== "REVIEW"))
                      }
                      persistKey={audioProgressStorageKey}
                      authoritativePositionSeconds={
                        authoritativeAudioProgress?.positionSeconds
                      }
                      authoritativeCapturedAtMs={
                        authoritativeAudioProgress?.capturedAtMs
                      }
                      muted={audioMuted}
                      onMutedChange={setAudioMuted}
                      manualStartRequired={requiresAudioStart}
                      onBeforeManualStart={startPreparedListening}
                      preparedAudioElement={preparedAudioElement}
                      preparedAudioMountedExternally
                      startAtMs={preparedStartAtMs}
                      compact
                    />
                  )}
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
                  {!practiceMode ? <button
                    type="button"
                    onClick={() => void exitExamFullscreen()}
                    disabled={!isFullscreen}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:cursor-default disabled:opacity-45"
                    aria-label="Tam ekrandan çık"
                    title="Tam ekrandan çık"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button> : null}
                  {practiceMode ? <PracticeViewControl presentation={practicePresentation} /> : null}
                  {practiceMode ? (
                    <button
                      type="button"
                      onClick={() => setShowExitModal(true)}
                      className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
                      aria-label="Dinleme pratiğinden çık"
                      title="Çık"
                    >
                      <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </button>
                  ) : null}
                  <Button
                    onClick={handleSubmitClick}
                    disabled={submitDisabled}
                    className="h-9 min-h-9 gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {practiceMode ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    ) : null}
                    {submitLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={practiceMode ? "practice-section-heading shrink-0 border-b border-[#e5e5e2] bg-white px-5 py-0 sm:py-1.5 sm:px-8" : "practice-section-heading mx-2 mt-2 shrink-0 border-b border-[#e5e5e2] bg-white px-3 py-3.5 sm:mx-4 sm:px-4"}>
          <div className={`flex items-center justify-between gap-3 ${showDescription ? "mb-1.5" : ""}`}>
            <h2 className={practiceMode ? "practice-part-heading" : "reading-part-heading"}>Bölüm {bolum}</h2>
            <button
              type="button"
              onClick={() => setShowDescription((value) => !value)}
              aria-expanded={showDescription}
              aria-label={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
              title={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
            >
              {showDescription ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
          {showDescription && (
            <p className="reading-part-description max-w-6xl">
              {getPartDescription(bolum)}
            </p>
          )}
        </section>
        <div className="shrink-0 px-2 sm:px-4">
          {draftLoadError && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#e7c8c8] bg-[#fff7f7] px-4 py-3 text-sm text-[#7c3434]"><span>Kayıtlı cevaplarınız yüklenemedi. Cevaplarınız korunuyor.</span> <button className="rounded border border-[#d6b2b2] bg-white px-3 py-1.5 font-semibold" onClick={() => setDraftRetryKey((key) => key + 1)}>Cevapları tekrar yükle</button></div>}
          {submitError && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#e7c8c8] bg-[#fff7f7] px-4 py-3 text-sm text-[#7c3434]"><span>{submitError}</span> <button className="rounded border border-[#d6b2b2] bg-white px-3 py-1.5 font-semibold" disabled={isSubmitting} onClick={() => void handleSubmit()}>Göndermeyi tekrar dene</button></div>}
          {sectionTimerError ? (
            <div
              role="alert"
              className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#e7c8c8] bg-[#fff7f7] px-4 py-3 text-[#7c3434]"
            >
              <p className="min-w-0 text-[13px] font-medium leading-5 sm:text-sm">
                {sectionTimerError}
              </p>
              {canRetryAudioPreparation && !activeAudioUrl ? <button
                type="button"
                onClick={() => {
                  setAudioPreparationAttempt((attempt) => attempt + 1);
                }}
                className="h-8 shrink-0 rounded border border-[#d6b2b2] bg-white px-3 text-[12px] font-semibold text-[#6f3030] transition-colors hover:bg-[#fff1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a96b6b]"
              >
                Yeniden dene
              </button> : null}
            </div>
          ) : null}
          {audioMuted &&
            !showReviewTimer &&
            activeAudioUrl &&
            !isSubmitting && (
              <div
                data-listening-muted-notice
                role="status"
                className="mt-2 flex items-start gap-3 rounded-lg border border-[#e8d79b] bg-[#fff8df] px-4 py-3 text-[#624b10] shadow-[0_1px_2px_rgba(15,15,15,0.035)]"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/75">
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-5 sm:text-sm">
                    Ses kapalı
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#755c19] sm:text-sm">
                    Sesi açmak için üstteki hoparlör düğmesine basın.
                  </p>
                </div>
              </div>
            )}
          {!practiceMode && showReviewTimer && (
            <div
              data-listening-review-notice
              role="status"
              className="mt-2 flex items-start gap-3 rounded-lg border border-[#b9d4b9] bg-[var(--tm-cat-listening-bg)] px-4 py-3 text-[var(--tm-cat-listening-fg)] shadow-[0_1px_2px_rgba(15,15,15,0.035)]"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-5 sm:text-sm">
                  10 dakikalık kontrol süresi başladı
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-[#395844] sm:text-sm">
                  Cevaplarınızı şimdi gönderebilir veya kontrol etmeye devam edebilirsiniz. Süre dolarsa otomatik gönderilir.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Internal scroll to keep content accessible while exam-mode locks body scroll */}
         <div ref={contentScrollRef} className="reading-scroll listening-test-container min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth pb-20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/40 lg:!pb-0">
          <div
            className={`listening-part-content ${bolum === 3 ? "h-full" : ""} transition-all duration-200 ease-out ${isPartSwitchAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
          >
            <fieldset disabled={sectionTimerLoading || !!sectionTimerError || isSubmitting || hasSubmittedRef.current} style={{ display: "contents" }}>{renderModernPart(bolum)}</fieldset>
          </div>
        </div>
      
      {/* Bottom Tabs - desktop only */}
      {!practiceMode ? renderModernTabs() : null}

      {/* Mobile: compact prev/next with center progress */}
      {!practiceMode ? <div className="mock-mobile-navigation listening-mobile-navigation lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 bg-white/98 rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="justify-self-start">
          <Button
                  onClick={goToPrevBolum}
                  disabled={currentPartNumber <= 1}
                  type="button"
                  className="h-10 min-h-10 w-10 border border-black bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] active:bg-[#e9e9e6] focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
                  aria-label="Önceki bölüm"
                  title="Önceki bölüm"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                </Button>
        </div>
        <div className="min-w-0 px-1">
          <div className="text-center text-[11px] font-semibold text-gray-800">
            BÖLÜM {currentPartNumber}/6
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="mock-mobile-progress-fill h-full rounded-full bg-[#438553] transition-all duration-200 ease-out"
              style={{ width: `${(currentPartNumber / 6) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[10px] text-gray-600">
            {getAnsweredCountForPart(currentPartNumber)}/{getQuestionsForPartNumber(currentPartNumber).length} cevap
          </div>
        </div>
        <div className="justify-self-end">
          <Button
                  onClick={goToNextBolum}
                  disabled={currentPartNumber >= 6}
                  type="button"
                  className="h-10 min-h-10 w-10 border border-black bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] active:bg-[#e9e9e6] focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
                  aria-label="Sonraki bölüm"
                  title="Sonraki bölüm"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
        </div>
      </div> : null}

      {!practiceMode && listeningPreparationState === "started" &&
        (showFullscreenPrompt || !isFullscreen) && (
        <div
          className="fixed inset-0 z-[100] hidden items-center justify-center bg-white/95 px-4 backdrop-blur-[2px] lg:flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listening-fullscreen-title"
        >
          <div className="w-full max-w-sm border border-[#dededb] bg-white p-6 text-center shadow-lg">
            <Maximize2 className="mx-auto h-5 w-5 text-[#5f5e5a]" />
            <h2
              id="listening-fullscreen-title"
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
      {practiceMode && showPracticeReview && practiceResult?.review ? (
        <ListeningTranscriptEvidenceView
          review={practiceResult.review}
          practice={{ audioUrl: practiceResult.audioUrl ?? null, correct: practiceResult.correct, total: practiceResult.total, presentation: practicePresentation, glossarySections: practiceResult.glossarySections }}
          onClose={closePracticeReview}
        />
      ) : null}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title={practiceMode ? "Cevapları kontrol et" : "Dinleme bölümünü gönder"}
        message={submitConfirmationMessage}
        confirmText={practiceMode ? "Kontrol et" : "Gönder"}
        cancelText={practiceMode ? "Devam et" : "Sınava dön"}
        isLoading={isSubmitting}
      />
      <ConfirmationModal
        isOpen={practiceMode && showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={confirmPracticeExit}
        title={answeredPracticeCount > 0 ? "Testten çıkılsın mı?" : "Çıkmak istiyor musun?"}
        message={
          answeredPracticeCount > 0
            ? "Şu ana kadarki cevapların kaydedilir. Daha sonra kaldığın yerden devam edebilirsin."
            : "Henüz cevap vermedin. Daha sonra tekrar başlayabilirsin."
        }
        confirmText="Çık"
        cancelText="Kal"
      />
    </div>
  );
}
