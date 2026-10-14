import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  createBackendSyncedTimerState,
  getBackendSyncedRemainingSeconds,
  getOverallSectionTimerErrorMessage,
  overallTestFlowStore,
  overallTestService,
  overallTestTokenStore,
  type BackendSyncedTimerState,
  type OverallSectionTimerResponse,
  type MockSubmitMode,
} from "@/services/overallTest.service"
import { motion, AnimatePresence } from "framer-motion"
import { ALargeSmall, Maximize2, Mic, Minimize2, Volume2 } from "lucide-react"
import axiosPrivate from "@/config/api"
import { toast } from "sonner"
import { speakingSubmissionService } from "@/services/speakingSubmission.service"
import {
  clearAcceptedSpeakingDraft,
  resolveSpeakingSubmissionTransition,
} from "@/services/speakingSubmissionRecovery"
import { MicrophoneCheck } from "./components/MicrophoneCheck"
import {
  createSpeakingDeadline,
  finalizeSpeakingCapture,
  getSpeakingAudioConstraints,
  isExpiredSpeakingCaptureMissing,
  remainingSpeakingMilliseconds,
  restoreSpeakingAnswers,
  serializeSpeakingAnswers,
  shouldRestoreSpeakingCapture,
  speakingMicrophoneStorageKey,
  speakingProgressStorageKey,
} from "@/services/speakingRecordingLifecycle"
import { loadPendingSpeakingRecording, removePendingSpeakingRecording, savePendingSpeakingRecording } from "@/services/speakingPendingRecording"
import { getInstructionForSection } from "@/config/speakingInstructions"
import { speechToTextService } from "@/services/speechToText.service"
import {
  speakingPhaseService,
  type SpeakingPhaseState,
} from "@/services/speakingPhase.service"
import SimpleTextDisplay from "@/components/speaking-test/SimpleTextDisplay"
import SpeakingMobileDiscussionCard from "@/components/speaking-test/SpeakingMobileDiscussionCard"
import { useMobilePresentation } from "@/hooks/use-mobile-presentation"
import { getReadingTypographyPreset } from "@/components/reading-test/reading-typography"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { normalizeDisplayText } from "@/utils/text"
import { API_BASE_URL } from "@/config/runtime"
import { useOverallSectionHeartbeat } from "@/hooks/use-overall-section-heartbeat"
import { protectedImageProps } from "@/utils/mediaProtection"
import {
  activateExamPresentation,
  clearExamPresentation,
  EXAM_FULLSCREEN_EVENTS,
  exitExamFullscreen,
  getExamPresentationElement,
  requestExamFullscreen,
} from "@/utils/examFullscreen"
import {
  destroySharedExamAudioController,
  ExamAudioController,
  getSharedExamAudioController,
} from "@/utils/examAudio"
// import ResultModal from "./components/ResultModal"
// import DisableKeys from "./components/DisableKeys"

const baseURL = API_BASE_URL

interface Question {
  id: string
  questionText: string
  order: number
  subPartId?: string
  sectionId?: string
  textToSpeechUrl?: string
}
interface SubPart {
  id: string
  label: string
  description: string
  instructionAudioUrl?: string | null
  images: string[]
  questions: Question[]
}
interface Section {
  id: string
  title: string
  description: string
  type: string
  order: number
  subParts: SubPart[]
  questions: Question[]
}
interface SpeakingTestData {
  id: string
  title: string
  sections: Section[]
  speakingPlan?: SpeakingPlanItem[]
  speakingPhase?: SpeakingPhaseState | null
  sectionTiming?: OverallSectionTimerResponse
}
interface SpeakingPlanItem {
  questionId: string
  questionIndex: number
  sectionIndex: number
  subPartIndex: number
  localQuestionIndex: number
  part: string
  prepDurationSeconds: number
  recordingDurationSeconds: number
  requiresPrep: boolean
}
interface Recording {
  blob: Blob
  duration: number
  questionId: string
  audioClientId: string
}

type SpeakingAnswerState = {
  text: string
  duration: number
  audioClientId?: string
  transcriptionStatus?: "PENDING" | "SUCCESS"
}

interface SpeakingProgressSnapshot {
  micChecked: boolean
  showSectionDescription: boolean
  currentSectionIndex: number
  currentSubPartIndex: number
  currentQuestionIndex: number
  timeLeft: number
  prepSeconds: number
  isPrepRunning: boolean
  answersEntries: Array<[string, SpeakingAnswerState]>
  updatedAt: number
}

const RECORD_SECONDS_PER_QUESTION = 30
const DEBUG_SPEAKING = import.meta.env.VITE_DEBUG_API === "true"

const debugSpeaking = (...args: unknown[]) => {
  if (DEBUG_SPEAKING) console.debug("[speaking]", ...args)
}
const FullscreenReturnDialog = ({
  open,
  onReturn,
}: {
  open: boolean
  onReturn: () => void | Promise<void>
}) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#f7f7f5] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speaking-fullscreen-title"
    >
      <div className="w-full max-w-sm rounded-md border border-[#dededb] bg-white p-6 text-center shadow-lg">
        <Maximize2 className="mx-auto h-5 w-5 text-[#5f5e5a]" />
        <h2
          id="speaking-fullscreen-title"
          className="mt-3 text-[17px] font-semibold text-[#37352f]"
        >
          Tam ekrana dön
        </h2>
        <p className="mt-1 text-sm text-[#6f6d67]">Sınav süresi devam ediyor.</p>
        <Button
          type="button"
          className="mt-5 h-9 bg-[#37352f] px-4 text-sm font-semibold text-white hover:bg-[#242320]"
          onClick={() => void onReturn()}
        >
          Sınava dön
        </Button>
      </div>
    </div>
  )
}

// Format time utility
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatSpeakingSectionHeading = (value: string | number) => {
  const normalizedLabel = normalizeDisplayText(String(value)).trim()
  if (!normalizedLabel) return ""
  return /^bölüm\b/i.test(normalizedLabel)
    ? normalizedLabel
    : `Bölüm ${normalizedLabel}`
}

const SUBMIT_RETRY_GUIDE = "Cevaplarınız bu tarayıcıda saklandı."

const buildSubmitRetryMessage = (errorLike: unknown, fallback: string) => {
  const raw =
    typeof errorLike === "string"
      ? errorLike
      : errorLike && typeof errorLike === "object" && "message" in errorLike
      ? String((errorLike as any).message || "")
      : ""

  const base = raw.trim() || fallback
  const normalized = base.toLowerCase()
  const isTokenError =
    /(token|session|oturum)/i.test(normalized) &&
    /(expired|not found|invalid|suresi|dol|bulunamad|gecersiz)/i.test(normalized)

  if (isTokenError) {
    return "Bağlantı yenileniyor. Cevaplarınız saklandı; birazdan tekrar deneyin."
  }

  if (base.includes(SUBMIT_RETRY_GUIDE)) return base
  return `${base}. ${SUBMIT_RETRY_GUIDE}`
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const createClientAudioId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`
}


export default function ImprovedSpeakingTest() {
  const { testId } = useParams()
  const navigate = useNavigate()
  useOverallSectionHeartbeat(testId)

  // data / flow
  const [testData, setTestData] = useState<SpeakingTestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShowLoadingScreen(false)
      return
    }

    const timeoutId = window.setTimeout(() => setShowLoadingScreen(true), 250)
    return () => window.clearTimeout(timeoutId)
  }, [loading])

  const [micChecked, setMicChecked] = useState(() => {
    if (!testId || typeof window === "undefined") return false
    try {
      return sessionStorage.getItem(`speaking_mic_checked_${testId}`) === "1"
    } catch {
      return false
    }
  })
  const [audioReady, setAudioReady] = useState(() =>
    typeof window !== "undefined"
      ? getSharedExamAudioController().isUnlocked()
      : false,
  )
  const [showSectionDescription, setShowSectionDescription] = useState(true)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isRetryingRecording, setIsRetryingRecording] = useState(false)
  const [restoredCaptureAttempt, setRestoredCaptureAttempt] = useState<string | null>(null)
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null)
  const [sectionTimerLoading, setSectionTimerLoading] = useState(false)
  const [sectionTimerError, setSectionTimerError] = useState<string | null>(null)
  const [speakingPhase, setSpeakingPhase] = useState<SpeakingPhaseState | null>(null)
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [isSectionSkipping, setIsSectionSkipping] = useState(false)

  // exam mode (fullscreen + hide headers + lock back)
  const [isExamMode, setIsExamMode] = useState(false)
  const [fontScale, setFontScale] = useState(1)
  const mobile = useMobilePresentation()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)
  const fullscreenWasActiveRef = useRef(false)
  const typographyPreset = useMemo(
    () => getReadingTypographyPreset(mobile ? 1 : fontScale),
    [fontScale, mobile],
  )
  const selectedFontScale = typographyPreset.menuValue
  const popHandlerRef = useRef<(e: PopStateEvent) => void | null>(null)
  const beforeUnloadRef = useRef<((e: BeforeUnloadEvent) => any) | null>(null)

  // recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlayingInstructions, setIsPlayingInstructions] = useState(false)
  const [instructionCountdown, setInstructionCountdown] = useState<number | null>(null)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)
  const [isProcessingSpeechToText, setIsProcessingSpeechToText] = useState(false)
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false)
  // speaking/answer timer (seconds)
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION)
  const [answers, setAnswers] = useState<Map<string, SpeakingAnswerState>>(new Map())
  const recordingsRef = useRef<Map<string, Recording>>(new Map())
  const answersRef = useRef<Map<string, SpeakingAnswerState>>(new Map())
  const recordingFinalizePromiseRef = useRef<Promise<void> | null>(null)
  const recordingStartInFlightRef = useRef(false)
  const recordingDeadlineRef = useRef<number | null>(null)
  const promptDeadlineRef = useRef<number | null>(null)
  const prepDeadlineRef = useRef<number | null>(null)
  const pendingRecordingRef = useRef<Recording | null>(null)
  const submitInFlightRef = useRef(false)
  const acceptedSubmissionRef = useRef<ReturnType<typeof resolveSpeakingSubmissionTransition>>(undefined)
  const recordingStartedAtRef = useRef(0)
  const resolveRecordingFinalizeRef = useRef<(() => void) | null>(null)
  // preparation timer (seconds)
  const [prepSeconds, setPrepSeconds] = useState<number>(0)
  const [isPrepRunning, setIsPrepRunning] = useState(false)
  
  // instruction state
  const [completedInstructions] = useState<Set<string>>(new Set())

  const INSTRUCTION_VOLUME = 0.6







  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const countdownRef = useRef<number | null>(null)
  const elapsedRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const examAudioRef = useRef<ExamAudioController | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const prepIntervalRef = useRef<number | null>(null)
  const prepAfterActionRef = useRef<(() => void) | null>(null)
  const autoAdvanceRef = useRef<string | null>(null)
  const prepStartedKeyRef = useRef<string | null>(null)
  const skipToNextSectionRef = useRef<boolean>(false)
  // Guard to ensure section instruction audio plays only once per section
  const instructionPlayStartedRef = useRef<boolean>(false)
  const instructionRunKeyRef = useRef<string | null>(null)
  const instructionCountdownTimerRef = useRef<number | null>(null)
  const lastInstructionSectionRef = useRef<string | null>(null)
  const submitAllRetryRef = useRef<number>(0)
  const hasRestoredProgressRef = useRef(false)
  const hasSubmittedRef = useRef(false)
  const hasOverallTimerRef = useRef(false)
  const autoSubmitRef = useRef(false)
  const backendTimerRef = useRef<BackendSyncedTimerState | null>(null)
  const phaseStartKeyRef = useRef<string | null>(null)
  const ttsStartedKeyRef = useRef<string | null>(null)
  const speakingPhaseRef = useRef<SpeakingPhaseState | null>(null)
  const loadedAttemptRef = useRef<string | null>(null)
  const isSectionSkippingRef = useRef(false)
  const overallAttemptId = overallTestFlowStore.getOverallId() || ""
  const progressStorageKey = testId ? speakingProgressStorageKey(testId, overallAttemptId) : null
  const recordingAttemptId = `${overallAttemptId}:${testId || ""}`
  const pendingCaptureRestored = restoredCaptureAttempt === recordingAttemptId
  const sectionExpired = sectionTimeLeft !== null && sectionTimeLeft <= 0
  const micReadyStorageKey = testId ? `speaking_mic_checked_${testId}` : null
  const examStartedStorageKey = testId ? `speaking_exam_started_${testId}` : null

  useEffect(() => {
    return () => {
      if (instructionCountdownTimerRef.current !== null) {
        window.clearTimeout(instructionCountdownTimerRef.current)
        instructionCountdownTimerRef.current = null
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (!examStartedStorageKey) return

    let examStarted = false
    try {
      examStarted = sessionStorage.getItem(examStartedStorageKey) === "1"
    } catch {}

    const fullscreenActive = Boolean(getExamPresentationElement())
    setIsExamMode(examStarted)
    setIsFullscreen(fullscreenActive)
    fullscreenWasActiveRef.current = examStarted

    if (examStarted) {
      activateExamPresentation()
      setShowFullscreenPrompt(!fullscreenActive)
      return
    }

    fullscreenWasActiveRef.current = false
    setShowFullscreenPrompt(false)
    void clearExamPresentation()
  }, [examStartedStorageKey])

  useLayoutEffect(() => {
    if (!micReadyStorageKey) return
    try {
      if (sessionStorage.getItem(micReadyStorageKey) === "1") {
        setMicChecked(true)
      }
    } catch {}
  }, [micReadyStorageKey])

  useEffect(() => {
    speakingPhaseRef.current = speakingPhase
  }, [speakingPhase])

  const updateAnswers = (
    updater: (current: Map<string, SpeakingAnswerState>) => Map<string, SpeakingAnswerState>,
  ) => {
    const next = updater(new Map(answersRef.current))
    answersRef.current = next
    setAnswers(next)
    if (progressStorageKey) {
      try {
        const snapshot = JSON.parse(sessionStorage.getItem(progressStorageKey) || "{}")
        sessionStorage.setItem(progressStorageKey, JSON.stringify({ ...snapshot, answersEntries: serializeSpeakingAnswers(next) }))
      } catch {}
    }
    return next
  }

  const updateRecordings = (
    updater: (current: Map<string, Recording>) => Map<string, Recording>,
  ) => {
    const next = updater(new Map(recordingsRef.current))
    recordingsRef.current = next
    return next
  }

  useEffect(() => {
    let cancelled = false
    loadedAttemptRef.current = null
    setTestData(null)
    setLoading(true)
    if (micReadyStorageKey) {
      try {
        if (sessionStorage.getItem(micReadyStorageKey) === "1") {
          setMicChecked(true)
        }
      } catch {}
    }

    ; (async () => {
      try {
	        const sessionToken = overallTestTokenStore.getByTestId(testId || "")
          if (!sessionToken) {
            toast.error("Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.")
            await clearExamPresentation()
            navigate("/app/test")
            return
          }

	        const res = await axiosPrivate.get(`/api/speaking-test/${testId}/solve`, {
            params: { sessionToken },
          })
	        if (cancelled) return
	        loadedAttemptRef.current = recordingAttemptId
	        setTestData(res.data)
          sessionStorage.setItem(`test_data_SPEAKING_${testId}`, JSON.stringify(res.data))
          applySpeakingPhase(res.data?.speakingPhase || null, res.data)
	      } catch (e) {
	        if (cancelled) return
	        debugSpeaking("test-data-load-failed", (e as any)?.response?.status || (e as any)?.message)
	        toast.error("Test verisi yüklenemedi")
	      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      stopAllAudio()
      cleanupMedia()
      clearTimers()
      removeNavigationLock()
      examAudioRef.current = null
      const activeTestId = testId
      window.setTimeout(() => {
        if (!activeTestId || !window.location.pathname.includes(`/speaking-test/${activeTestId}`)) {
          void destroySharedExamAudioController()
          void clearExamPresentation()
        }
      }, 0)
    }
  }, [testId, micReadyStorageKey, recordingAttemptId])

  useEffect(() => {
    let mounted = true
    autoSubmitRef.current = false
    if (!testId) {
      hasOverallTimerRef.current = false
      setSectionTimeLeft(null)
      return
    }
    if (!testData || testData.id !== testId || loadedAttemptRef.current !== recordingAttemptId) return

    // An already-started section is resumed from read-only server timing.
    if (testData.sectionTiming?.startedAt) {
      const timerState = createBackendSyncedTimerState(testData.sectionTiming)
      backendTimerRef.current = timerState
      hasOverallTimerRef.current = true
      setSectionTimeLeft(getBackendSyncedRemainingSeconds(timerState))
      setSectionTimerLoading(false)
      setSectionTimerError(null)
      return
    }

    const hasExplicitStart = Boolean(
      examStartedStorageKey && sessionStorage.getItem(examStartedStorageKey) === "1",
    )
    if (!hasExplicitStart) {
      hasOverallTimerRef.current = false
      backendTimerRef.current = null
      setSectionTimerLoading(false)
      setSectionTimerError(null)
      setSectionTimeLeft(null)
      return
    }

    const hasOverallToken = !!overallTestTokenStore.getByTestId(testId)
    hasOverallTimerRef.current = hasOverallToken
    backendTimerRef.current = null
    if (!hasOverallToken) {
      setSectionTimerLoading(false)
      setSectionTimerError(null)
      setSectionTimeLeft(null)
      return
    }

    setSectionTimerLoading(true)
    setSectionTimerError(null)
    overallTestService
      .startSectionTimerForTest(testId)
      .then((timer) => {
        if (!mounted || !timer) return
        const timerState = createBackendSyncedTimerState(timer)
        backendTimerRef.current = timerState
        setSectionTimeLeft(getBackendSyncedRemainingSeconds(timerState) ?? timerState.initialRemainingSeconds)
      })
      .catch((error) => {
        if (!mounted) return
        if (backendTimerRef.current) return
        const message = getOverallSectionTimerErrorMessage(error)
        setSectionTimerError(message)
        toast.error(message)
      })
      .finally(() => {
        if (mounted) setSectionTimerLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [testId, examStartedStorageKey, testData, recordingAttemptId])

  useEffect(() => {
    setRestoredCaptureAttempt(null)
    pendingRecordingRef.current = null
    answersRef.current = new Map()
    setAnswers(new Map())
    recordingsRef.current = new Map()
    setCurrentSectionIndex(0)
    setCurrentSubPartIndex(0)
    setCurrentQuestionIndex(0)
    setIsTestComplete(false)
    setSubmissionError(null)
    setPhaseError(null)
    acceptedSubmissionRef.current = undefined
    hasSubmittedRef.current = false
    hasRestoredProgressRef.current = false
    if (!progressStorageKey) {
      hasRestoredProgressRef.current = true
      return
    }

    let parsed: Partial<SpeakingProgressSnapshot> | null = null
    try {
      const raw = sessionStorage.getItem(progressStorageKey)
      if (raw) parsed = JSON.parse(raw) as Partial<SpeakingProgressSnapshot>
    } catch {}

    if (parsed && typeof parsed === "object") {
      if (typeof parsed.micChecked === "boolean") {
        setMicChecked(parsed.micChecked)
      }
      if (typeof parsed.showSectionDescription === "boolean") {
        setShowSectionDescription(parsed.showSectionDescription)
      }

      const restoredSectionIndex = Number(parsed.currentSectionIndex)
      if (Number.isFinite(restoredSectionIndex)) {
        setCurrentSectionIndex(Math.max(0, Math.round(restoredSectionIndex)))
      }

      const restoredSubPartIndex = Number(parsed.currentSubPartIndex)
      if (Number.isFinite(restoredSubPartIndex)) {
        setCurrentSubPartIndex(Math.max(0, Math.round(restoredSubPartIndex)))
      }

      const restoredQuestionIndex = Number(parsed.currentQuestionIndex)
      if (Number.isFinite(restoredQuestionIndex)) {
        setCurrentQuestionIndex(Math.max(0, Math.round(restoredQuestionIndex)))
      }

      const restoredTimeLeft = Number(parsed.timeLeft)
      if (Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.round(restoredTimeLeft)))
      }

      const restoredPrepSeconds = Number(parsed.prepSeconds)
      if (Number.isFinite(restoredPrepSeconds)) {
        setPrepSeconds(Math.max(0, Math.round(restoredPrepSeconds)))
      }
      // Do not restore running timers directly; they will be started by flow effects.
      setIsPrepRunning(false)

      const restoredAnswers = restoreSpeakingAnswers(parsed.answersEntries)
      if (restoredAnswers.size > 0) {
        answersRef.current = restoredAnswers
        setAnswers(restoredAnswers)
      }

    }

    hasRestoredProgressRef.current = true
  }, [progressStorageKey])

  useEffect(() => {
    if (!testData || testData.id !== testId || loadedAttemptRef.current !== recordingAttemptId) return
    let cancelled = false
    void loadPendingSpeakingRecording(recordingAttemptId).then((recording) => {
      if (cancelled || !recording) return
      const answer = answersRef.current.get(recording.questionId)
      if (!shouldRestoreSpeakingCapture(recording, answer, speakingPhaseRef.current?.currentQuestionId)) return
      pendingRecordingRef.current = recording
      updateRecordings((previous) => previous.set(recording.questionId, recording))
      setPhaseError("Kaydedilen sesiniz hazır. Ses çözümlemesini yeniden deneyin.")
    }).catch(() => undefined).finally(() => {
      if (cancelled) return
      const phase = speakingPhaseRef.current
      if (isExpiredSpeakingCaptureMissing({
        sectionExpired: testData.sectionTiming?.status === "EXPIRED",
        phase: phase?.phase,
        hasPendingCapture: Boolean(pendingRecordingRef.current),
        hasActiveCapture: Boolean(recordingFinalizePromiseRef.current),
        answer: phase?.currentQuestionId ? answersRef.current.get(phase.currentQuestionId) : undefined,
      })) {
        autoSubmitRef.current = true
        setSubmissionError("Son kayıt yenileme sırasında tamamlanamadı. Tamamlanan cevaplarınız korundu.")
      }
      setRestoredCaptureAttempt(recordingAttemptId)
    })
    return () => { cancelled = true }
  }, [testData, testId, recordingAttemptId])

  useEffect(() => {
    if (pendingCaptureRestored && speakingPhase?.canSubmitSection && !pendingRecordingRef.current && !submissionError) {
      setIsTestComplete(true)
    }
  }, [pendingCaptureRestored, speakingPhase, submissionError])


  // utils
  const getExamAudio = () => {
    if (!examAudioRef.current) {
      examAudioRef.current = getSharedExamAudioController()
    }
    return examAudioRef.current
  }

  const unlockExamAudioFromGesture = async () => {
    const ready = await getExamAudio().unlockFromUserGesture()
    setAudioReady(ready)
    return ready
  }

  const playExamCue = async (type: "start" | "end") => {
    try {
      await getExamAudio().playCue(type)
    } catch (error) {
	      debugSpeaking("play-exam-cue-failed", type, (error as any)?.name || "error")
    }
  }

  const playInstructionAudio = async (url: string) => {
    try {
      await getExamAudio().playMedia(url, INSTRUCTION_VOLUME)
      return
    } catch (primaryError) {
      debugSpeaking(
        "instruction-webaudio-failed",
        (primaryError as any)?.name || (primaryError as any)?.message || "error",
      )
    }

    await getExamAudio().playHtmlMedia(url, INSTRUCTION_VOLUME)
  }

  const playInstructionAudioAutomatically = async (url: string) => {
    let lastError: unknown = new Error("Bölüm sesi oynatılamadı")

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await playInstructionAudio(url)
        return
      } catch (error) {
        lastError = error
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 180 * (attempt + 1)))
        }
      }
    }

    throw lastError
  }

  const clearTimers = () => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (elapsedRef.current) {
      window.clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
  }

  const stopAllAudio = () => {
    examAudioRef.current?.stopAll()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current.currentTime = 0
      ttsAudioRef.current = null
    }
    setIsPlayingTTS(false)
  }

  const clearSpeakingProgress = () => {
    if (!progressStorageKey) return
    try {
      sessionStorage.removeItem(progressStorageKey)
    } catch {}
  }

  const cleanupMedia = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    } catch { }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  // Check if instruction should be shown for current section
  const shouldShowInstruction = (sectionIndex: number, subPartIndex?: number) => {
    const section = testData?.sections?.[sectionIndex]
    if (!section) return false

    // For PART1, check both subparts
    if (section.type === "PART1") {
      const instruction1 = getInstructionForSection(section.order, 1)
      const instruction2 = getInstructionForSection(section.order, 2)
      
      if (subPartIndex === 0 && instruction1 && !completedInstructions.has(instruction1.id)) {
        return instruction1
      }
      if (subPartIndex === 1 && instruction2 && !completedInstructions.has(instruction2.id)) {
        return instruction2
      }
    } else {
      // For other sections, check main instruction
      const instruction = getInstructionForSection(section.order)
      if (instruction && !completedInstructions.has(instruction.id)) {
        return instruction
      }
    }
    
    return null
  }

  const currentSection = testData?.sections?.[currentSectionIndex]
  const currentInstructionSectionId = currentSection?.id ?? null
  const currentInstructionAudioUrl =
    currentSection?.subParts?.[currentSubPartIndex]?.instructionAudioUrl?.trim() ?? ""
  const currentQuestion: Question | null = (() => {
    const sec = currentSection
    if (!sec) return null
    if (sec.subParts?.length) {
      const questions = sec.subParts[currentSubPartIndex]?.questions
      if (questions) {
        // Sort questions by order field to ensure correct sequence
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)
        const question = sortedQuestions[currentQuestionIndex] ?? null
        
	        debugSpeaking("current-question", {
	          questionIndex: currentQuestionIndex,
	          questionOrder: question?.order,
	          totalQuestions: sortedQuestions.length
	        })
        
        return question
      }
      return null
    }
    return sec.questions?.[currentQuestionIndex] ?? null
  })()

  const getSessionToken = () => (testId ? overallTestTokenStore.getByTestId(testId) : null)

  const getCurrentPlanItem = () => {
    return (
      testData?.speakingPlan?.find(
        (item) =>
          item.sectionIndex === currentSectionIndex &&
          item.subPartIndex === currentSubPartIndex &&
          item.localQuestionIndex === currentQuestionIndex,
      ) || null
    )
  }

  const getCurrentPhaseQuestionId = () => {
    const planItem = getCurrentPlanItem()
    if (planItem?.questionId) return planItem.questionId
    if (currentQuestion?.id) return currentQuestion.id
    const directQuestion = currentSection?.questions?.[currentQuestionIndex]
    if (directQuestion?.id) return directQuestion.id
    const sortedQuestions = [
      ...(currentSection?.subParts?.[currentSubPartIndex]?.questions || []),
    ].sort((a, b) => a.order - b.order)
    if (sortedQuestions[currentQuestionIndex]?.id) {
      return sortedQuestions[currentQuestionIndex].id
    }
    return ""
  }

  const getActivePhaseQuestionId = () =>
    speakingPhaseRef.current?.currentQuestionId || getCurrentPhaseQuestionId()

  const getPlanItemByQuestionId = (questionId?: string | null) => {
    if (!questionId || !testData?.speakingPlan?.length) return null
    return testData.speakingPlan.find((item) => item.questionId === questionId) || null
  }

  const applySpeakingPhase = (
    phase: SpeakingPhaseState | null,
    dataOverride?: SpeakingTestData | null,
  ) => {
    setSpeakingPhase(phase)
    speakingPhaseRef.current = phase
    if (phase) {
      const now = performance.now()
      promptDeadlineRef.current = createSpeakingDeadline(phase, "promptExpectedEndsAt", now)
      prepDeadlineRef.current = createSpeakingDeadline(phase, "prepExpiresAt", now)
      recordingDeadlineRef.current = createSpeakingDeadline(phase, "recordingExpiresAt", now)
    }
    const data = dataOverride || testData
    if (!phase || !data?.speakingPlan?.length) return
    const item = data.speakingPlan.find(
      (entry) => entry.questionId === phase.currentQuestionId,
    )
    if (!item) return
    setCurrentSectionIndex(item.sectionIndex)
    setCurrentSubPartIndex(item.subPartIndex)
    setCurrentQuestionIndex(item.localQuestionIndex)
  }

  const getPhaseErrorMessage = (error: any) => {
    const code = String(error?.response?.data?.code || error?.response?.data?.error || "").trim()
    const rawMessage = String(error?.response?.data?.message || "").trim()
    const normalized = `${code} ${rawMessage}`.toLowerCase()

    if (normalized.includes("test_time_expired")) {
      return "Bu bölümün süresi doldu."
    }
    if (normalized.includes("section_not_started") || normalized.includes("session_token_required")) {
      return "Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlatın."
    }
    if (
      normalized.includes("phase") ||
      normalized.includes("mismatch") ||
      normalized.includes("currentquestion")
    ) {
      return "Cevabınız kaydediliyor, lütfen bu soruda kalın."
    }
    return rawMessage && !/[A-Z_]{3,}/.test(rawMessage)
      ? normalizeDisplayText(rawMessage)
      : "İşlem tamamlanamadı. Lütfen bu soruda kalın."
  }

  const requireSessionToken = () => {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      toast.error("Bu sınav oturumu başlatılmadı. Lütfen testi yeniden başlat.")
      return null
    }
    return sessionToken
  }

  const startBackendQuestionPhase = async (questionId: string) => {
    const sessionToken = requireSessionToken()
    if (!sessionToken || !questionId) return null
    try {
      setPhaseError(null)
      const phase = await speakingPhaseService.startQuestion({
        sessionToken,
        questionId,
      })
      applySpeakingPhase(phase)
      return phase
    } catch (error: any) {
      const message = getPhaseErrorMessage(error)
      setPhaseError(message)
      toast.error(message)
      return null
    }
  }

  const completeBackendPromptPhase = async (questionId: string) => {
    const sessionToken = requireSessionToken()
    if (!sessionToken || !questionId) return null
    try {
      setPhaseError(null)
      const phase = await speakingPhaseService.promptEnded({
        sessionToken,
        questionId,
      })
      applySpeakingPhase(phase)
      return phase
    } catch (error: any) {
      const message = getPhaseErrorMessage(error)
      setPhaseError(message)
      toast.error(message)
      return null
    }
  }

  const startBackendRecordingPhase = async (questionId: string) => {
    const sessionToken = requireSessionToken()
    if (!sessionToken || !questionId) return null
    try {
      setPhaseError(null)
      const phase = await speakingPhaseService.startRecording({
        sessionToken,
        questionId,
      })
      applySpeakingPhase(phase)
      return phase
    } catch (error: any) {
      const message = getPhaseErrorMessage(error)
      setPhaseError(message)
      toast.error(message)
      return null
    }
  }

  const finalizeBackendRecordingPhase = async (questionId: string) => {
    const sessionToken = requireSessionToken()
    if (!sessionToken || !questionId) return null
    try {
      setPhaseError(null)
      const phase = await speakingPhaseService.finalizeRecording({
        sessionToken,
        questionId,
      })
      applySpeakingPhase(phase)
      return phase
    } catch (error: any) {
      const message = getPhaseErrorMessage(error)
      setPhaseError(message)
      toast.error(message)
      return null
    }
  }

  const advanceBackendQuestionPhase = async (questionId: string) => {
    const sessionToken = requireSessionToken()
    if (!sessionToken || !questionId) return null
    try {
      setPhaseError(null)
      const phase = await speakingPhaseService.next({
        sessionToken,
        questionId,
      })
      applySpeakingPhase(phase)
      return phase
    } catch (error: any) {
      const message = getPhaseErrorMessage(error)
      setPhaseError(message)
      toast.error(message)
      return null
    }
  }

  useEffect(() => {
    if (!testData?.sections?.length) return

    const maxSectionIndex = Math.max(0, testData.sections.length - 1)
    const safeSectionIndex = Math.min(Math.max(currentSectionIndex, 0), maxSectionIndex)
    if (safeSectionIndex !== currentSectionIndex) {
      setCurrentSectionIndex(safeSectionIndex)
      return
    }

    const section = testData.sections[safeSectionIndex]
    const subParts = Array.isArray(section?.subParts) ? section.subParts : []
    const maxSubPartIndex = subParts.length > 0 ? Math.max(0, subParts.length - 1) : 0
    const safeSubPartIndex = Math.min(Math.max(currentSubPartIndex, 0), maxSubPartIndex)
    if (safeSubPartIndex !== currentSubPartIndex) {
      setCurrentSubPartIndex(safeSubPartIndex)
      return
    }

    const sortedQuestions = subParts.length > 0
      ? [...(subParts[safeSubPartIndex]?.questions || [])].sort((a, b) => a.order - b.order)
      : (section?.questions || [])
    const maxQuestionIndex = sortedQuestions.length > 0 ? sortedQuestions.length - 1 : 0
    const safeQuestionIndex = Math.min(Math.max(currentQuestionIndex, 0), maxQuestionIndex)
    if (safeQuestionIndex !== currentQuestionIndex) {
      setCurrentQuestionIndex(safeQuestionIndex)
    }
  }, [testData, currentSectionIndex, currentSubPartIndex, currentQuestionIndex])

  useEffect(() => {
    if (!progressStorageKey || !hasRestoredProgressRef.current || !pendingCaptureRestored) return
    if (isTestComplete || isSubmitting) return

    const answersEntries = serializeSpeakingAnswers(answers)

    const snapshot: SpeakingProgressSnapshot = {
      micChecked,
      showSectionDescription,
      currentSectionIndex,
      currentSubPartIndex,
      currentQuestionIndex,
      timeLeft,
      prepSeconds,
      isPrepRunning,
      answersEntries,
      updatedAt: Date.now(),
    }

    try {
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot))
    } catch {}
  }, [
    progressStorageKey,
    pendingCaptureRestored,
    micChecked,
    showSectionDescription,
    currentSectionIndex,
    currentSubPartIndex,
    currentQuestionIndex,
    timeLeft,
    prepSeconds,
    isPrepRunning,
    answers,
    isTestComplete,
    isSubmitting,
  ])

  const getQuestionTextById = (questionId: string): string => {
    if (!testData?.sections?.length) return ""
    for (const section of testData.sections) {
      if (Array.isArray(section.questions)) {
        for (const question of section.questions) {
          if (question.id === questionId) return String(question.questionText || "")
        }
      }
      if (Array.isArray(section.subParts)) {
        for (const subPart of section.subParts) {
          for (const question of subPart.questions || []) {
            if (question.id === questionId) return String(question.questionText || "")
          }
        }
      }
    }
    return ""
  }

  const getSectionKeyByQuestionId = (questionId: string): string => {
    if (!testData?.sections?.length) return ""
    for (const section of testData.sections) {
      if (Array.isArray(section.questions)) {
        for (const question of section.questions) {
          if (question.id === questionId) {
            if (section.type === "PART2") return "bolum_2"
            if (section.type === "PART3") return "bolum_3"
          }
        }
      }
      if (Array.isArray(section.subParts)) {
        for (const subPart of section.subParts) {
          for (const question of subPart.questions || []) {
            if (question.id === questionId) {
              if (section.type === "PART1" && subPart.label === "1.1") return "bolum_1_1"
              if (section.type === "PART1" && subPart.label === "1.2") return "bolum_1_2"
              if (section.type === "PART2") return "bolum_2"
              if (section.type === "PART3") return "bolum_3"
            }
          }
        }
      }
    }
    return ""
  }

  const buildSpeechToTextOptions = (
    questionId: string,
    audioClientId?: string,
    durationSeconds?: number,
  ) => {
    const questionText = getQuestionTextById(questionId).trim()
    return {
      sessionToken: getSessionToken() || undefined,
      language: "tr",
      prompt: "Bu bir Turkce yeterlik sinavi konusma transkriptidir. Metni oldugu gibi yaz ve gereksiz ceviri yapma.",
      context: questionText ? `Soru: ${questionText}` : "",
      questionId,
      sectionKey: getSectionKeyByQuestionId(questionId),
      clientAudioId: audioClientId,
      durationSeconds,
      timeoutMs: 45000,
      retryCount: 1,
    }
  }

  // Auto-advance guard: avoid showing empty question frames in PART1 transitions
  useEffect(() => {
    if (currentSection?.type === "PART1" && !currentQuestion && !showSectionDescription) {
      const key = `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
      if (autoAdvanceRef.current !== key) {
        autoAdvanceRef.current = key
        // Add a small delay to prevent rapid successive calls
        setTimeout(() => {
          nextQuestion()
        }, 50)
      }
    } else {
      autoAdvanceRef.current = null
    }
  }, [currentSection?.type, currentQuestion, currentSectionIndex, currentSubPartIndex, currentQuestionIndex, showSectionDescription])

  // Play instruction audio in background when section description is shown
  useEffect(() => {
    let cancelled = false
    const instructionRunKey = currentInstructionSectionId
      ? `${currentInstructionSectionId}:${currentSubPartIndex}:${currentInstructionAudioUrl}`
      : null
    if (
      !showSectionDescription ||
      !pendingCaptureRestored ||
      sectionExpired ||
      isSubmitting ||
      !currentInstructionSectionId ||
      !micChecked ||
      !audioReady ||
      (instructionPlayStartedRef.current &&
        instructionRunKeyRef.current === instructionRunKey)
    ) {
      return () => {
        cancelled = true
      }
    }

    const instruction = shouldShowInstruction(
      currentSectionIndex,
      currentSubPartIndex,
    )
    if (!instruction) {
      return () => {
        cancelled = true
      }
    }

    instructionPlayStartedRef.current = true
    instructionRunKeyRef.current = instructionRunKey
    lastInstructionSectionRef.current = currentInstructionSectionId
    setIsPlayingInstructions(Boolean(currentInstructionAudioUrl))

    void (async () => {
      if (!currentInstructionAudioUrl) {
        if (!cancelled) startInstructionCountdown()
        return
      }

      try {
        debugSpeaking("instruction-audio-auto-play")
        await playInstructionAudioAutomatically(currentInstructionAudioUrl)
        if (cancelled) return

        debugSpeaking("instruction-audio-ended")
        setIsPlayingInstructions(false)
        instructionPlayStartedRef.current = false
        startInstructionCountdown()
      } catch (error) {
        if (cancelled) return
        debugSpeaking(
          "instruction-audio-play-failed",
          (error as any)?.name || (error as any)?.message || "error",
        )
        setIsPlayingInstructions(false)
        instructionPlayStartedRef.current = false
        toast.error("Bölüm sesi oynatılamadı. Sınav akışı devam ediyor.")
        startInstructionCountdown()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    showSectionDescription,
    currentInstructionSectionId,
    currentInstructionAudioUrl,
    micChecked,
    audioReady,
    currentSectionIndex,
    currentSubPartIndex,
    pendingCaptureRestored,
    sectionExpired,
    isSubmitting,
  ])

  // Play TTS audio when a new question becomes active (outside instructions)
  // After TTS ends, start preparation timer
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (isTestComplete || isSubmitting || hasSubmittedRef.current || !pendingCaptureRestored || pendingRecordingRef.current || phaseError || sectionExpired) return
      if (
          !showSectionDescription &&
          currentSection &&
          !isPlayingInstructions &&
          !isRecording &&
          !isFinalizingRecording &&
          !isProcessingSpeechToText &&
          !isSectionSkipping &&
          !isPrepRunning &&
          !isPlayingTTS
      ) {
      const key = `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
      
      // If preparation already started for this question, skip
      if (prepStartedKeyRef.current === key) {
        return
      }
      
      // For PART2/PART3, check if there are questions in subParts
      let questionToUse = currentQuestion
      if (!questionToUse && (currentSection.type === "PART2" || currentSection.type === "PART3")) {
        // Try to get question from subParts
        const subPart = currentSection.subParts?.[currentSubPartIndex]
        if (subPart?.questions && subPart.questions.length > 0) {
          questionToUse = subPart.questions[0]
        } else if (currentSection.questions && currentSection.questions.length > 0) {
          questionToUse = currentSection.questions[0]
        }
      }

      const questionId = questionToUse?.id || getCurrentPhaseQuestionId()
      const phaseKey = `${key}:${questionId}`
      if (!questionId) return
      if (speakingPhaseRef.current?.phase === "NEXT_READY" && answersRef.current.has(questionId)) {
        await nextQuestion(true)
        return
      }
      if (phaseStartKeyRef.current !== phaseKey) {
        const phase = await startBackendQuestionPhase(questionId)
        if (cancelled || !phase) return
        phaseStartKeyRef.current = phaseKey
      }

      if (ttsStartedKeyRef.current === phaseKey) {
        return
      }
      ttsStartedKeyRef.current = phaseKey
      

      // PART1 audio is required by publication checks. PART2/PART3 audio is
      // optional and is played only when an admin prepared it.
      if (questionToUse?.textToSpeechUrl) {
	        debugSpeaking("tts-play", { sectionType: currentSection.type })
        const rawUrl = questionToUse.textToSpeechUrl.startsWith('./')
          ? `${baseURL}${questionToUse.textToSpeechUrl.substring(1)}`
          : questionToUse.textToSpeechUrl
        const ttsAudio = new Audio(rawUrl)
        ttsAudioRef.current = ttsAudio
        setIsPlayingTTS(true)
        ttsAudio.onended = () => {
	          debugSpeaking("tts-ended", currentSection.type)
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          // After question TTS ends, ALWAYS start preparation for all sections
          startPreparationAfterTTS(questionId)
        }
        ttsAudio.onerror = (e) => {
	          debugSpeaking("tts-error", currentSection.type, (e as any)?.name || "error")
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          toast.error("Soru sesi yüklenemedi. Metni okuyup devam ediliyor.")
          startPreparationAfterTTS(questionId)
        }
        ttsAudio.play().catch((error) => {
	          debugSpeaking("tts-play-failed", currentSection.type, (error as any)?.name || "error")
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          toast.error("Soru sesi başlatılamadı. Metni okuyup devam ediliyor.")
          startPreparationAfterTTS(questionId)
        })
      } else {

        // Continue without blocking when an optional question audio is absent.
	        debugSpeaking("tts-skip", currentSection.type)
        startPreparationAfterTTS(questionId)
      }
    }
    })()
    return () => {
      cancelled = true
    }
  }, [currentSectionIndex, currentSubPartIndex, currentQuestionIndex, showSectionDescription, isPlayingInstructions, currentQuestion, isRecording, isFinalizingRecording, isProcessingSpeechToText, isSectionSkipping, isPrepRunning, isPlayingTTS, currentSection, isTestComplete, isSubmitting, pendingCaptureRestored, phaseError, sectionExpired])

  // Helper function to start preparation after TTS (or immediately if no TTS)
  const startPreparationAfterTTS = async (questionId?: string) => {
    if (!currentSection) return
    
    // For PART2/PART3, there might not be a currentQuestion in the same way
    // So we allow starting preparation even without currentQuestion for these sections
    if (!currentQuestion && currentSection.type !== "PART2" && currentSection.type !== "PART3") {
      return
    }
    
    const key = `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
    
    // Prevent duplicate preparation starts
    if (prepStartedKeyRef.current === key) {
	      debugSpeaking("preparation-already-started")
      return
    }

    const targetQuestionId = questionId || getCurrentPhaseQuestionId()
    if (!targetQuestionId) return
    // Failed/blocked media still respects the authoritative prompt duration.
    const promptWait = remainingSpeakingMilliseconds(promptDeadlineRef.current, performance.now()) || 0
    if (promptWait > 0) await wait(promptWait + 50)
    if (prepStartedKeyRef.current === key || submitInFlightRef.current || hasSubmittedRef.current || getActivePhaseQuestionId() !== targetQuestionId) return
    prepStartedKeyRef.current = key
    const phase = await completeBackendPromptPhase(targetQuestionId)
    if (!phase) { prepStartedKeyRef.current = null; return }
    
	    debugSpeaking("preparation-start", currentSection.type)
    prepStartedKeyRef.current = key
    
    if (currentSection.type === "PART1") {
      const planItem = testData?.speakingPlan?.find((item) => item.questionId === targetQuestionId)
      const recordingTime = Math.max(1, Math.round(planItem?.recordingDurationSeconds ?? 30))
      const prepTime = Math.max(0, Math.round(
        (planItem?.prepDurationSeconds ?? 0),
      ))
      debugSpeaking("part1-preparation", { prepTime, subPartIndex: currentSubPartIndex })
      if (prepTime <= 0) {
        void startRecording(recordingTime, true)
        return
      }
      beginPreparation(prepTime, () => {
        startRecording(recordingTime, true)
      })
    } else if (currentSection.type === "PART2" || currentSection.type === "PART3") {
	      debugSpeaking("long-section-preparation", currentSection.type)
      const planItem = testData?.speakingPlan?.find((item) => item.questionId === targetQuestionId)
      beginPreparation(Math.max(0, Math.round(planItem?.prepDurationSeconds ?? 60)), () => {
        startRecording(Math.max(1, Math.round(planItem?.recordingDurationSeconds ?? 120)), true)
      })
    } else {
      startRecording(undefined, true)
    }
  }

  // Removed duplicate auto-advance effect to prevent loops

  // Removed: Direct auto-start effect - now handled by TTS effect which ensures TTS plays first

  // Removed centralized auto-start to prevent double hazırlık

  // Recompute from the server deadline; background throttling cannot extend capture.
  useEffect(() => {
    if (!isRecording || isPaused) return
    const update = () => {
      const remaining = remainingSpeakingMilliseconds(recordingDeadlineRef.current, performance.now()) ?? 0
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) void stopRecording()
    }
    update()
    countdownRef.current = window.setInterval(update, 100)
    const onVisible = () => { if (document.visibilityState === "visible") update() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { clearTimers(); document.removeEventListener("visibilitychange", onVisible) }
  }, [isRecording, isPaused])

  useEffect(() => {
    if (
      sectionTimerLoading ||
      sectionTimerError ||
      submissionError ||
      !pendingCaptureRestored ||
      !hasOverallTimerRef.current ||
      sectionTimeLeft === null ||
      isSubmitting ||
      hasSubmittedRef.current
    ) {
      return
    }

    if (sectionTimeLeft <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true
        toast.message("Süre bitti. Cevaplarınız gönderiliyor.")
        submitTest()
      }
      return
    }

    const timer = window.setTimeout(() => {
      setSectionTimeLeft((prev) => {
        if (prev === null) return prev
        const backendRemaining = getBackendSyncedRemainingSeconds(backendTimerRef.current)
        return backendRemaining === null ? Math.max(0, prev - 1) : Math.min(prev, backendRemaining)
      })
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [sectionTimerLoading, sectionTimerError, sectionTimeLeft, isSubmitting, submissionError, pendingCaptureRestored])

  // FULLSCREEN & NAV LOCK helpers
  const enterFullscreen = async () => {
    // Both operations must begin inside the same click gesture for Safari.
    const audioUnlock = unlockExamAudioFromGesture().catch(() => false)
    const fullscreenRequest = requestExamFullscreen()
    const entered = await fullscreenRequest
    const unlocked = await audioUnlock
    if (!entered) {
      setShowFullscreenPrompt(true)
      toast.error("Tam ekran açılamadı. Tarayıcı izinlerini kontrol edip yeniden deneyin.")
      return
    }
    if (!unlocked) {
      setShowFullscreenPrompt(true)
      toast.error("Ses başlatılamadı. Sınava dön düğmesine tekrar basın.")
      return
    }

    activateExamPresentation()
    fullscreenWasActiveRef.current = true
    setIsFullscreen(true)
    setShowFullscreenPrompt(false)
  }

  const exitFullscreen = async () => {
    const exited = await exitExamFullscreen()
    if (!exited) {
      toast.error("Tam ekrandan çıkılamadı. ESC tuşunu kullanmayı deneyin.")
      return
    }

    setIsFullscreen(false)
    if (isExamMode && !isTestComplete) {
      fullscreenWasActiveRef.current = true
      setShowFullscreenPrompt(true)
    }
  }

  const proceedAfterInstruction = () => {
    if (instructionCountdownTimerRef.current !== null) {
      window.clearTimeout(instructionCountdownTimerRef.current)
      instructionCountdownTimerRef.current = null
    }
    setInstructionCountdown(null)
    setShowSectionDescription(false)
    resetPerQuestionState()
    if (currentSection?.type === "PART1" || currentSection?.type === "PART2" || currentSection?.type === "PART3") {
      // TTS will handle starting preparation after it finishes
      // If no TTS, the TTS effect will handle it
    } else {
      startRecording(undefined, true)
    }
  }

  const startInstructionCountdown = () => {
    if (instructionCountdownTimerRef.current !== null) return

    stopAllAudio()
    setIsPlayingInstructions(false)
    instructionPlayStartedRef.current = false
    instructionRunKeyRef.current = null

    let nextValue = 3
    setInstructionCountdown(nextValue)

    const tick = () => {
      nextValue -= 1
      if (nextValue > 0) {
        setInstructionCountdown(nextValue)
        instructionCountdownTimerRef.current = window.setTimeout(tick, 1000)
        return
      }

      instructionCountdownTimerRef.current = null
      setInstructionCountdown(null)
      proceedAfterInstruction()
    }

    instructionCountdownTimerRef.current = window.setTimeout(tick, 1000)
  }

  useEffect(() => {
    const reconcileFullscreenState = () => {
      const fullscreenActive = Boolean(getExamPresentationElement())

      setIsFullscreen(fullscreenActive)
      if (!isExamMode || isTestComplete) {
        setShowFullscreenPrompt(false)
        return
      }

      if (fullscreenActive) {
        fullscreenWasActiveRef.current = true
        activateExamPresentation()
        setShowFullscreenPrompt(false)
      } else if (fullscreenWasActiveRef.current) {
        setShowFullscreenPrompt(true)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconcileFullscreenState()
      }
    }

    EXAM_FULLSCREEN_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, reconcileFullscreenState)
    })
    window.addEventListener("pageshow", reconcileFullscreenState)
    window.addEventListener("focus", reconcileFullscreenState)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const pollId =
      isExamMode && !isTestComplete
        ? window.setInterval(reconcileFullscreenState, 250)
        : null
    reconcileFullscreenState()

    return () => {
      EXAM_FULLSCREEN_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, reconcileFullscreenState)
      })
      window.removeEventListener("pageshow", reconcileFullscreenState)
      window.removeEventListener("focus", reconcileFullscreenState)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (pollId !== null) window.clearInterval(pollId)
    }
  }, [isExamMode, isTestComplete])

  const addNavigationLock = () => {
    try {
      if (popHandlerRef.current) {
        window.removeEventListener("popstate", popHandlerRef.current)
        popHandlerRef.current = null
      }
      if (beforeUnloadRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadRef.current)
        beforeUnloadRef.current = null
      }
      const lockedExamUrl = window.location.href
      const lockedUrl = new URL(lockedExamUrl)
      const lockedExamRoute = `${lockedUrl.pathname}${lockedUrl.search}${lockedUrl.hash}`
      const guardState = {
        ...(window.history.state || {}),
        __speakingExamGuard: testId || "active",
      }
      window.history.replaceState(guardState, "", lockedExamUrl)
      window.history.pushState(guardState, "", lockedExamUrl)
      let lastToastAt = 0
      const popHandler = () => {
        const attemptedRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`
        window.history.pushState(guardState, "", lockedExamUrl)
        if (attemptedRoute !== lockedExamRoute) {
          navigate(lockedExamRoute, { replace: true })
        }
        const now = Date.now()
        if (now - lastToastAt > 1200) {
          toast.error("Sınav sırasında geri dönemezsiniz")
          lastToastAt = now
        }
      }
      popHandlerRef.current = popHandler
      window.addEventListener("popstate", popHandler)

      const beforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = ""
      }
      beforeUnloadRef.current = beforeUnload
      window.addEventListener("beforeunload", beforeUnload)
    } catch (e) {
	      debugSpeaking("navigation-lock-failed", (e as any)?.name || "error")
    }
  }

  const removeNavigationLock = () => {
    try {
      if (popHandlerRef.current) {
        window.removeEventListener("popstate", popHandlerRef.current)
        popHandlerRef.current = null
      }
      if (beforeUnloadRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadRef.current)
        beforeUnloadRef.current = null
      }
    } catch (e) {
	      debugSpeaking("navigation-unlock-failed", (e as any)?.name || "error")
    }
  }

  useEffect(() => {
    if (!isExamMode || isTestComplete) {
      removeNavigationLock()
      return
    }

    addNavigationLock()
    return removeNavigationLock
  }, [isExamMode, isTestComplete, testId])

  const finishExamPresentation = async () => {
    setIsExamMode(false)
    setIsFullscreen(false)
    setShowFullscreenPrompt(false)
    fullscreenWasActiveRef.current = false
    removeNavigationLock()

    if (examStartedStorageKey) {
      try {
        sessionStorage.removeItem(examStartedStorageKey)
      } catch {}
    }

    await clearExamPresentation()
  }

  const completeCapturedAnswer = async (recording: Recording, advance: boolean) => {
    setIsFinalizingRecording(true)
    setPhaseError(null)
    try {
      const stt = await finalizeSpeakingCapture({
        preserve: () => {
          pendingRecordingRef.current = recording
          updateRecordings((prev) => prev.set(recording.questionId, recording))
          updateAnswers((prev) => prev.set(recording.questionId, {
            text: prev.get(recording.questionId)?.text || "",
            duration: recording.duration,
            audioClientId: recording.audioClientId,
            transcriptionStatus: "PENDING",
          }))
          return savePendingSpeakingRecording(recordingAttemptId, recording).catch(() => undefined)
        },
        finalize: async () => {
          const phase = await finalizeBackendRecordingPhase(recording.questionId)
          if (!phase?.canGoNext) throw new Error("Kayıt tamamlanamadı. Kaydedilen sesle yeniden deneyin.")
        },
        transcribe: async () => {
          setIsProcessingSpeechToText(true)
          return speechToTextService.convertAudioToText(
            recording.blob,
            buildSpeechToTextOptions(recording.questionId, recording.audioClientId, recording.duration),
          )
        },
      })
      if (!stt.success) throw new Error("Sesiniz saklandı. Ses çözümlemesini yeniden deneyin.")
      updateAnswers((prev) => prev.set(recording.questionId, {
        text: stt.text?.trim() || "",
        duration: recording.duration,
        audioClientId: recording.audioClientId,
        transcriptionStatus: "SUCCESS",
      }))
      pendingRecordingRef.current = null
      await removePendingSpeakingRecording(recordingAttemptId).catch(() => undefined)
      if (advance && !submitInFlightRef.current && !hasSubmittedRef.current) {
        if (skipToNextSectionRef.current) {
          skipToNextSectionRef.current = false
          await advanceToNextMainSpeakingUnit()
        } else {
          await nextQuestion(true)
        }
      }
      return true
    } catch (error) {
      setPhaseError(error instanceof Error ? error.message : "Sesiniz saklandı. Yeniden deneyin.")
      return false
    } finally {
      setIsProcessingSpeechToText(false)
      setIsFinalizingRecording(false)
    }
  }

  // Microphone permission and the cue precede the server's recording clock.
  const startRecording = async (
    durationSeconds?: number,
    allowOverride: boolean = false,
  ) => {
    if (recordingStartInFlightRef.current || mediaRecorderRef.current?.state === "recording" ||
        pendingRecordingRef.current || submitInFlightRef.current || hasSubmittedRef.current) return
    recordingStartInFlightRef.current = true
    setPhaseError(null)
    try {
      if (isPlayingInstructions && !allowOverride) return
      const questionId = getActivePhaseQuestionId()
      if (!questionId) throw new Error("Soru bilgisi bulunamadı.")
      let deviceId = ""
      try { deviceId = testId ? sessionStorage.getItem(speakingMicrophoneStorageKey(testId)) || "" : "" } catch {}
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getSpeakingAudioConstraints(deviceId),
      })
      streamRef.current = stream
      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      const selectedMimeType = preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
      const mr = selectedMimeType ? new MediaRecorder(stream, { mimeType: selectedMimeType }) : new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorderRef.current = mr
      mr.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data) }
      mr.onstop = async () => {
        const stoppedAt = performance.now()
        setIsRecording(false)
        setIsPaused(false)
        clearTimers()
        const blob = new Blob(chunks, { type: mr.mimeType || chunks[0]?.type || selectedMimeType || "audio/webm" })
        const recording: Recording = {
          blob,
          duration: Math.max(0, Math.round((stoppedAt - recordingStartedAtRef.current) / 1000)),
          questionId,
          audioClientId: createClientAudioId(),
        }
        cleanupMedia()
        try {
          // Capture is closed before transcription; the cue is never recorded.
          void playExamCue("end")
          await completeCapturedAnswer(recording, true)
        } finally {
          const resolveFinalize = resolveRecordingFinalizeRef.current
          resolveRecordingFinalizeRef.current = null
          recordingFinalizePromiseRef.current = null
          resolveFinalize?.()
        }
      }
      mr.onerror = () => {
        setPhaseError("Mikrofon kaydı kesildi. Kaydedilen ses tamamlanıyor.")
        void stopRecording()
      }
      await playExamCue("start")
      if (submitInFlightRef.current || hasSubmittedRef.current) { cleanupMedia(); return }
      const backendPhase = await startBackendRecordingPhase(questionId)
      if (!backendPhase?.canRecord) { cleanupMedia(); return }
      const deadline = createSpeakingDeadline(backendPhase, "recordingExpiresAt", performance.now())
      const remaining = remainingSpeakingMilliseconds(deadline, performance.now())
      if (remaining === null || remaining <= 0) {
        cleanupMedia()
        throw new Error("Bu sorunun kayıt süresi doldu. Kaydı tamamlayıp devam edin.")
      }
      recordingDeadlineRef.current = deadline
      setTimeLeft(Math.ceil(Math.min(remaining / 1000, durationSeconds ?? remaining / 1000)))
      setIsPaused(false)
      recordingFinalizePromiseRef.current = new Promise<void>((resolve) => { resolveRecordingFinalizeRef.current = resolve })
      recordingStartedAtRef.current = performance.now()
      mr.start(100)
      setIsRecording(true)
    } catch (error) {
      debugSpeaking("recording-start-failed", (error as any)?.name || "error")
      setPhaseError(error instanceof Error && error.message.startsWith("Bu sorunun")
        ? error.message : "Mikrofon başlatılamadı. Bağlantısını ve iznini kontrol edip yeniden deneyin.")
      cleanupMedia()
      clearTimers()
      setIsRecording(false)
      setIsFinalizingRecording(false)
      const resolveFinalize = resolveRecordingFinalizeRef.current
      resolveRecordingFinalizeRef.current = null
      recordingFinalizePromiseRef.current = null
      resolveFinalize?.()
    } finally {
      recordingStartInFlightRef.current = false
    }
  }

  const stopRecording = async () => {
    const pendingFinalize = recordingFinalizePromiseRef.current
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        setIsFinalizingRecording(true)
        mediaRecorderRef.current.stop()
      }
    } catch { }
    setIsRecording(false)
    setIsPaused(false)
	    debugSpeaking("recording-stop-requested")
    await (pendingFinalize || Promise.resolve())
  }

  const resetPerQuestionState = () => {
    setTimeLeft(RECORD_SECONDS_PER_QUESTION)
    setIsPaused(false)
    // Clear any existing preparation state
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    prepAfterActionRef.current = null
    setIsPrepRunning(false)
    setPrepSeconds(0)
    // Clear TTS state to allow next question's TTS to play
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current.currentTime = 0
      ttsAudioRef.current = null
    }
    setIsPlayingTTS(false)
    // Clear preparation key to allow next question to start preparation after TTS
    prepStartedKeyRef.current = null
    phaseStartKeyRef.current = null
    ttsStartedKeyRef.current = null
  }

  const advanceToNextMainSpeakingUnit = async () => {
    if (!testData?.speakingPlan?.length) return

    stopAllAudio()
    setIsPlayingInstructions(false)
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    prepAfterActionRef.current = null
    setIsPrepRunning(false)

    let activeQuestionId = getActivePhaseQuestionId()
    const originPlanItem = getPlanItemByQuestionId(activeQuestionId) || getCurrentPlanItem()
    const originSectionIndex = originPlanItem?.sectionIndex ?? currentSectionIndex
    const originSubPartIndex = originPlanItem?.subPartIndex ?? currentSubPartIndex
    const maxSteps = testData.speakingPlan.length + 1

    if (
      activeQuestionId &&
      speakingPhaseRef.current?.currentQuestionId !== activeQuestionId
    ) {
      const startedPhase = await startBackendQuestionPhase(activeQuestionId)
      if (!startedPhase) return
    }

    for (let step = 0; step < maxSteps; step += 1) {
      if (!activeQuestionId) return
      const nextPhase = await advanceBackendQuestionPhase(activeQuestionId)
      if (!nextPhase) return

      resetPerQuestionState()
      if (nextPhase.phase === "SECTION_READY_TO_SUBMIT") {
        debugSpeaking("section-skip-ready-to-submit")
        setIsTestComplete(true)
        return
      }

      const nextPlanItem = testData.speakingPlan.find(
        (item) => item.questionId === nextPhase.currentQuestionId,
      )
      if (!nextPlanItem) return

      const changedMainUnit =
        nextPlanItem.sectionIndex !== originSectionIndex ||
        nextPlanItem.subPartIndex !== originSubPartIndex

      if (changedMainUnit) {
        setCurrentSectionIndex(nextPlanItem.sectionIndex)
        setCurrentSubPartIndex(nextPlanItem.subPartIndex)
        setCurrentQuestionIndex(nextPlanItem.localQuestionIndex)
        setShowSectionDescription(true)
        debugSpeaking("skip-main-unit-complete", {
          sectionIndex: nextPlanItem.sectionIndex,
          subPartIndex: nextPlanItem.subPartIndex,
        })
        return
      }

      activeQuestionId = nextPlanItem.questionId
    }

    toast.error("Bölüm geçilemedi. Lütfen tekrar deneyin.")
  }

  const skipCurrentMainSpeakingUnit = async () => {
    if (pendingRecordingRef.current) return
    if (isSectionSkippingRef.current || isFinalizingRecording || isProcessingSpeechToText || isSubmitting) return
    isSectionSkippingRef.current = true
    setIsSectionSkipping(true)
    try {
      if (isRecording) {
        skipToNextSectionRef.current = true
        await stopRecording()
        return
      }
      await advanceToNextMainSpeakingUnit()
    } finally {
      isSectionSkippingRef.current = false
      setIsSectionSkipping(false)
    }
  }

  const nextQuestion = async (force: boolean = false) => {
    if (pendingRecordingRef.current) return
    debugSpeaking("next-question", {
      force,
      isPlayingInstructions,
      isRecording,
      isPrepRunning,
      currentQuestionIndex,
      currentSubPartIndex,
      currentSectionType: currentSection?.type
    })
    
    if (!force && audioRef.current && !audioRef.current.paused) {
      debugSpeaking("next-question-skipped", "audio-playing")
      return
    }
    if (!force && isPlayingInstructions) {
      debugSpeaking("next-question-skipped", "instructions-playing")
      return
    }
    if (!force && isPlayingTTS) {
      debugSpeaking("next-question-skipped", "tts-playing")
      return
    }
    if (!force && isRecording) {
      debugSpeaking("next-question-skipped", "recording")
      return
    }

    if (force) {
      debugSpeaking("next-question-force-stop")
      // stop any ongoing audio/instructions/prep/recording before skipping
      stopAllAudio()
      setIsPlayingInstructions(false)
      if (prepIntervalRef.current) {
        window.clearInterval(prepIntervalRef.current)
        prepIntervalRef.current = null
      }
      setIsPrepRunning(false)
      if (isRecording) {
        await stopRecording()
        return
      }
    }

    if (!testData || !currentSection) {
      debugSpeaking("next-question-missing-data")
      return
    }

    const questionId = getActivePhaseQuestionId()
    const previousPlanItem = getPlanItemByQuestionId(questionId) || getCurrentPlanItem()
    const previousSectionIndex = previousPlanItem?.sectionIndex ?? currentSectionIndex
    const previousSubPartIndex = previousPlanItem?.subPartIndex ?? currentSubPartIndex
    const currentBackendPhase = speakingPhaseRef.current
    if (
      questionId &&
      currentBackendPhase?.currentQuestionId !== questionId
    ) {
      const startedPhase = await startBackendQuestionPhase(questionId)
      if (!startedPhase) return
    }
    if (
      questionId &&
      speakingPhaseRef.current?.phase !== "SECTION_READY_TO_SUBMIT"
    ) {
      const nextPhase = await advanceBackendQuestionPhase(questionId)
      if (!nextPhase) return

      if (nextPhase.phase === "SECTION_READY_TO_SUBMIT") {
        debugSpeaking("section-ready-to-submit")
        resetPerQuestionState()
        setIsTestComplete(true)
        return
      }

      const nextPlanItem = testData.speakingPlan?.find(
        (item) => item.questionId === nextPhase.currentQuestionId,
      )
      resetPerQuestionState()
      if (nextPlanItem) {
        const changedSection =
          nextPlanItem.sectionIndex !== previousSectionIndex ||
          nextPlanItem.subPartIndex !== previousSubPartIndex
        setShowSectionDescription(changedSection)
        debugSpeaking("backend-phase-advanced", {
          questionIndex: nextPlanItem.questionIndex,
          sectionIndex: nextPlanItem.sectionIndex,
          subPartIndex: nextPlanItem.subPartIndex,
          changedSection,
        })
      }
      return
    }

    debugSpeaking("test-complete")
    setIsTestComplete(true)
  }

  // when test becomes complete, remove navigation lock & auto-submit
  useEffect(() => {
    if (!isTestComplete || isSubmitting || hasSubmittedRef.current || submissionError) return
    removeNavigationLock()
    void submitTest()
  }, [isTestComplete, isSubmitting, submissionError])

  // preparation helper
  const beginPreparation = (seconds: number, after?: () => void) => {
    prepAfterActionRef.current = after || null
    if (prepIntervalRef.current) window.clearInterval(prepIntervalRef.current)
    const deadline = prepDeadlineRef.current ?? performance.now() + seconds * 1000
    setIsPrepRunning(true)
    const update = () => {
      const remaining = remainingSpeakingMilliseconds(deadline, performance.now()) || 0
      setPrepSeconds(Math.ceil(remaining / 1000))
      if (remaining > 0) return
      if (prepIntervalRef.current) window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
      setIsPrepRunning(false)
      setIsPlayingInstructions(false)
      const nextAction = prepAfterActionRef.current
      prepAfterActionRef.current = null
      if (!submitInFlightRef.current && !hasSubmittedRef.current) nextAction?.()
    }
    prepIntervalRef.current = window.setInterval(update, 100)
    update()
  }

  const skipPreparationAndStart = () => {
    if (!(currentSection?.type === "PART2" || currentSection?.type === "PART3")) return
    if (!isPrepRunning || isRecording) return

    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    setIsPrepRunning(false)
    setPrepSeconds(0)
    setIsPlayingInstructions(false)

    const nextAction = prepAfterActionRef.current
    prepAfterActionRef.current = null
    if (nextAction) {
      nextAction()
      return
    }

    // Safety fallback: if callback is missing, start section recording directly.
    startRecording(120, true)
  }

  // const startAfterInstructionsForCurrentSection = () => {
  //   const section = currentSection
  //   if (!section) return
  //   if (section.type === "PART1") {
  //     beginPreparation(5, () => startRecording(30, true))
  //   } else if (section.type === "PART2" || section.type === "PART3") {
  //     beginPreparation(60, () => startRecording(120, true))
  //   } else {
  //     startRecording(undefined, true)
  //   }
  // }

  // const startSection = () => {
  //   if (!testData) return
  //   if (audioRef.current && !audioRef.current.paused) return
  //   if (isPlayingInstructions) return

  //   const section = currentSection
  //   if (!section) return

  //   // enter exam mode BEFORE starting audio (user gesture)
  //   setIsExamMode(true)
  //   addNavigationLock()
  //   enterFullscreen().catch(() => { })

  //   setShowSectionDescription(false)
  //   resetPerQuestionState()

  //   // Play a chime indicating the test/section question flow is starting
  //   playSound("question")

  //   const src = sectionAudios[section.order]

  //   if (!src) {
  //     startAfterInstructionsForCurrentSection()
  //     return
  //   }

  //   const audio = new Audio(src)
  //   audioRef.current = audio
  //   setIsPlayingInstructions(true)
  //   audio.onended = () => {
  //     setIsPlayingInstructions(false)
  //     setTimeout(() => !isRecording && startAfterInstructionsForCurrentSection(), 500)
  //   }
  //   audio.onerror = () => {
  //     setIsPlayingInstructions(false)
  //     toast.error("Audio yüklenemedi")
  //   }
  //   audio.play().catch(() => setIsPlayingInstructions(false))
  // }

  const submitTest = async () => {
    if (submitInFlightRef.current || isSubmitting) return
    submitInFlightRef.current = true
    hasSubmittedRef.current = true
    setIsSubmitting(true)
    setSubmissionError(null)
    stopAllAudio()
    clearTimers()
    try {
      if (!testData) throw new Error("Test verisi bulunamadı.")
      // onstop owns the final Blob and transcript; snapshot only after it settles.
      const hadActiveCapture = Boolean(recordingFinalizePromiseRef.current)
      await stopRecording()
      if (pendingRecordingRef.current) {
        if (hadActiveCapture || !await completeCapturedAnswer(pendingRecordingRef.current, false)) {
          throw new Error("Son ses kaydınız saklandı. Gönderimi yeniden deneyin.")
        }
      }
      let transition = acceptedSubmissionRef.current
      if (!transition) {
        const entries = Array.from(answersRef.current.entries())
        const transcripts = Object.fromEntries(entries.map(([id, answer]) => [id, answer.text || ""]))
        const audioClientIds = Object.fromEntries(entries.filter(([, answer]) => answer.audioClientId).map(([id, answer]) => [id, answer.audioClientId]))
        sessionStorage.setItem(`speaking_answers_${testData.id}`, JSON.stringify({
          testId: testData.id, answers: Object.fromEntries(entries), transcripts, audioClientIds,
          sections: testData.sections, timestamp: new Date().toISOString(),
        }))
        const token = getSessionToken()
        if (!token) throw new Error("Oturum bilgisi bulunamadı. Cevaplarınız saklandı.")
        const latestPhase = await speakingPhaseService.get(token)
        applySpeakingPhase(latestPhase)
        const outerRemaining = getBackendSyncedRemainingSeconds(backendTimerRef.current)
        const submitMode: MockSubmitMode = autoSubmitRef.current || outerRemaining === 0 ? "AUTO" : "MANUAL"
        if (submitMode !== "AUTO" && latestPhase?.phase !== "SECTION_READY_TO_SUBMIT") {
          throw new Error("SPEAKING_SECTION_NOT_READY")
        }
        const formatted = speakingSubmissionService.formatSubmissionData(testData, transcripts)
        for (const part of formatted.parts || []) {
          for (const question of [...(part.questions || []), ...(part.subParts || []).flatMap((subpart) => subpart.questions || [])]) {
            question.audioClientId = audioClientIds[question.questionId]
          }
        }
        formatted.sessionToken = token
        formatted.submitMode = submitMode
        const result = await speakingSubmissionService.submitSpeakingTest(formatted)
        if (!result.success) throw new Error(result.error || "Gönderim tamamlanamadı.")
        transition = resolveSpeakingSubmissionTransition(result, overallTestFlowStore.getOverallId())
        if (!transition) throw new Error("Gönderimin sonucu henüz alınamadı. Yeniden deneyin.")
        acceptedSubmissionRef.current = transition
        if (transition.overallTestId) overallTestFlowStore.setOverallId(transition.overallTestId)
        clearAcceptedSpeakingDraft(sessionStorage, testData.id)
        if (progressStorageKey) sessionStorage.removeItem(progressStorageKey)
      }
      const nextPath = overallTestFlowStore.onTestCompleted("SPEAKING", testData.id)
      await finishExamPresentation()
      if (nextPath) { navigate(nextPath); return }
      const overallId = transition.overallTestId || overallTestFlowStore.getOverallId()
      if (overallId && overallTestFlowStore.isAllDone()) {
        const submitted = await submitAllTests(overallId)
        if (submitted) return
        // Speaking is accepted; the report can expose another section's status.
        navigate(transition.path)
        return
      }
      navigate(transition.path)
    } catch (error) {
      await finishExamPresentation()
      hasSubmittedRef.current = false
      setSubmissionError(buildSubmitRetryMessage(error, "Gönderim tamamlanamadı"))
    } finally {
      submitInFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  const submitAllTests = async (overallId: string): Promise<boolean> => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
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
            await wait(700 * attempt);
          }
        }

        if (lastValue !== null) {
          return lastValue;
        }
        throw lastError || new Error("Submission failed after retries");
      };

      const normalizeChoiceAnswers = (
        rawAnswers: any
      ): { questionId: string; userAnswer: string }[] => {
        const mapped = Array.isArray(rawAnswers)
          ? rawAnswers.map((item: any) => ({
              questionId: String(item?.questionId ?? "").trim(),
              userAnswer: String(item?.userAnswer ?? ""),
            }))
          : Object.entries(rawAnswers || {}).map(([questionId, userAnswer]) => ({
              questionId: String(questionId).trim(),
              userAnswer: String(userAnswer ?? ""),
            }));

        return mapped.filter((item) => item.questionId.length > 0);
      };
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          debugSpeaking("submit-all-reading", {
            testId: readingData.testId,
            answerCount: Object.keys(readingData.answers || {}).length,
          });
          const payload = normalizeChoiceAnswers(readingData.answers);
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          if (!overallToken) {
            debugSpeaking("submit-all-reading-missing-token", { testId: readingData.testId });
          }
          try {
            await runWithRetries(
              () =>
                readingSubmissionService.submitAnswers(
                  readingData.testId,
                  payload,
                  overallToken || undefined
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Okuma (${readingData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError: any) {
            debugSpeaking("submit-all-reading-failed", {
              testId: readingData.testId,
              status: submitError?.response?.status,
              code: submitError?.code,
            });
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
          debugSpeaking("submit-all-listening", {
            testId: listeningData.testId,
            answerCount: Object.keys(listeningData.answers || {}).length,
          });
          const payload = normalizeChoiceAnswers(listeningData.answers);
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          if (!overallToken) {
            debugSpeaking("submit-all-listening-missing-token", { testId: listeningData.testId });
          }
          try {
            await runWithRetries(
              () =>
                listeningSubmissionService.submitAnswers(
                  listeningData.testId,
                  payload,
                  overallToken || undefined,
                  listeningData.audioUrl,
                  listeningData.imageUrls
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Dinleme (${listeningData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError: any) {
            debugSpeaking("submit-all-listening-failed", {
              testId: listeningData.testId,
              status: submitError?.response?.status,
              code: submitError?.code,
            });
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
          debugSpeaking("submit-all-writing", {
            testId: writingData.testId,
            answerCount: Object.keys(writingData.answers || {}).length,
          });
          const overallToken = overallTestTokenStore.getByTestId(writingData.testId);
          if (!overallToken) {
            debugSpeaking("submit-all-writing-missing-token", { testId: writingData.testId });
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
          } catch (submitError: any) {
            debugSpeaking("submit-all-writing-failed", {
              testId: writingData.testId,
              status: submitError?.response?.status,
              code: submitError?.code,
            });
            failedSubmissions.push(`Yazma (${writingData.testId})`);
          }
        }
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith("speaking_answers_"));
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

        // Prefer persisted transcript map if present.
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

        // If transcripts are missing (or placeholders), retry STT from in-memory recordings for the current test.
        if (
          Object.keys(answerTextRecord).length === 0 &&
          testData?.id &&
          speakingData.testId === testData.id &&
          recordingsRef.current.size > 0
        ) {
          for (const [qid, rec] of recordingsRef.current.entries()) {
            try {
              const stt = await speechToTextService.convertAudioToText(
                rec.blob,
                buildSpeechToTextOptions(qid, rec.audioClientId, rec.duration),
              );
              const rawText = stt.text ?? "";
              if (isMeaningfulText(rawText)) {
                answerTextRecord[qid] = String(rawText).trim();
              }
            } catch (e: any) {
              debugSpeaking("submit-all-speaking-stt-retry-failed", {
                status: e?.response?.status,
                code: e?.code,
              });
            }
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const audioClientIds =
          speakingData.audioClientIds && typeof speakingData.audioClientIds === "object"
            ? speakingData.audioClientIds
            : {};
        for (const part of formattedSubmission.parts || []) {
          for (const subPart of part.subParts || []) {
            for (const question of subPart.questions || []) {
              ;(question as any).audioClientId = audioClientIds[question.questionId]
            }
          }
          for (const question of part.questions || []) {
            ;(question as any).audioClientId = audioClientIds[question.questionId]
          }
        }
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (!overallToken) {
          debugSpeaking("submit-all-speaking-missing-token", { testId: speakingData.testId });
        } else {
          formattedSubmission.sessionToken = overallToken;
        }

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          debugSpeaking("submit-all-speaking-invalid-payload", { testId: speakingData.testId });
          failedSubmissions.push(`Konusma (${speakingData.testId})`);
          continue;
        }

        const submissionResult = await runWithRetries(
          () => speakingSubmissionService.submitSpeakingTest(formattedSubmission),
          (value) => !!value?.success,
          3
        );
        if (!submissionResult.success) {
          const normalizedError = String(submissionResult.error || "").toLowerCase();
          const isTokenError =
            /(token|session|oturum)/i.test(normalizedError) &&
            /(expired|not found|invalid|süresi|dol|bulunamad|geçersiz)/i.test(normalizedError);
          if (isTokenError) {
            debugSpeaking("submit-all-speaking-token-issue", { testId: speakingData.testId });
            failedSubmissions.push(`Konusma (${speakingData.testId})`);
            continue;
          }
          debugSpeaking("submit-all-speaking-failed", { testId: speakingData.testId });
          failedSubmissions.push(`Konusma (${speakingData.testId})`);
          continue;
        }
        successfulSubmissions.push(`Konusma (${speakingData.testId})`);
        try { sessionStorage.removeItem(key); } catch {}
      }
      
      if (failedSubmissions.length > 0) {
        if (submitAllRetryRef.current < 1) {
          submitAllRetryRef.current += 1;
          toast.message(
            "Gönderim tekrar deneniyor. Cevaplarınız saklandı."
          );
          await wait(1400);
          return await submitAllTests(overallId);
        }

        toast.error(
          "Bazı bölümler şu anda gönderilemedi. Cevaplarınız saklandı; lütfen biraz sonra tekrar deneyin."
        );
        if (successfulSubmissions.length > 0) {
          toast.message("Kaydedilen cevaplarınız korunuyor.");
        }
        submitAllRetryRef.current = 0;
        return false;
      }

      submitAllRetryRef.current = 0;

      // Now complete the overall test
      if (!overallTestFlowStore.isCompleted()) {
        const { overallTestService } = await import("@/services/overallTest.service");
        await overallTestService.complete(overallId);
        overallTestFlowStore.markCompleted();
      }
      
      await finishExamPresentation()
      clearSpeakingProgress()
      navigate(`/overall-results/${overallId}`);
      return true;
    } catch (error: any) {
      debugSpeaking("submit-all-failed", {
        status: error?.response?.status,
        code: error?.code,
      });
      submitAllRetryRef.current = 0;
      toast.error(buildSubmitRetryMessage(error, "Test gönderilemedi"));
      return false;
    }
  }



  useEffect(() => {
    if (!testId) return

    let reconciling = false
    const reconcileVisibleSession = async () => {
      if (
        document.visibilityState !== "visible" ||
        reconciling ||
        isSubmitting ||
        submissionError ||
        !pendingCaptureRestored ||
        hasSubmittedRef.current
      ) {
        return
      }

      const sessionToken = getSessionToken()
      if (!sessionToken) return
      reconciling = true
      try {
        const phase = await speakingPhaseService.get(sessionToken)
        if (!phase) return
        applySpeakingPhase(phase)
        if (phase.phase === "EXPIRED" || phase.canSubmitSection) {
          autoSubmitRef.current = true
          await submitTest()
        }
      } catch (error) {
        debugSpeaking("visible-session-reconcile-failed", {
          status: (error as any)?.response?.status,
        })
      } finally {
        reconciling = false
      }
    }

    const handleVisibleAgain = () => {
      void reconcileVisibleSession()
    }

    document.addEventListener("visibilitychange", handleVisibleAgain)
    window.addEventListener("focus", handleVisibleAgain)
    window.addEventListener("pageshow", handleVisibleAgain)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibleAgain)
      window.removeEventListener("focus", handleVisibleAgain)
      window.removeEventListener("pageshow", handleVisibleAgain)
    }
  }, [testId, isSubmitting, submissionError, pendingCaptureRestored])

  const shouldShowFullscreenPrompt =
    showFullscreenPrompt && isExamMode && !isTestComplete

  const retryCurrentStep = async () => {
    if (isRetryingRecording || isFinalizingRecording || isSubmitting) return
    setIsRetryingRecording(true)
    setPhaseError(null)
    try {
      if (pendingRecordingRef.current) {
        await completeCapturedAnswer(pendingRecordingRef.current, true)
      } else if (speakingPhaseRef.current?.phase === "NEXT_READY") {
        await nextQuestion(true)
      } else if (["PROMPT_PLAYING", "PROMPT_LOADING", "NOT_STARTED"].includes(speakingPhaseRef.current?.phase || "NOT_STARTED")) {
        const questionId = getActivePhaseQuestionId()
        if (!questionId || !await startBackendQuestionPhase(questionId)) return
        ttsStartedKeyRef.current = null
        prepStartedKeyRef.current = null
        await startPreparationAfterTTS(questionId)
      } else if (speakingPhaseRef.current?.phase === "RECORDING_IN_PROGRESS" &&
                 remainingSpeakingMilliseconds(recordingDeadlineRef.current, performance.now()) === 0) {
        await nextQuestion(true)
      } else {
        await startRecording(undefined, true)
      }
    } finally { setIsRetryingRecording(false) }
  }

  if (loading) {
    if (!showLoadingScreen) {
      return <div className="min-h-[100dvh] bg-white" aria-hidden="true" />
    }

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-[#6f6d67]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#dededb] border-t-[#6f6d67]" />
          <span>Test yükleniyor</span>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center px-4"
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-100"
          whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        >
          <motion.div
            className="w-12 h-12 sm:w-16 sm:h-16  rounded-2xl mx-auto mb-4 grid place-items-center shadow-lg"
            animate={{
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 3,
            }}
          >
            <span className="text-white text-xl sm:text-2xl font-bold">!</span>
          </motion.div>
          <motion.p
            className="text-lg sm:text-xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Test bulunamadı
          </motion.p>
          <motion.button
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={() => navigate("/app/test")}
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
          >
            Geri Dön
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  if (submissionError) {
    return (
      <div data-speaking-submit-retry role="alert" className="flex min-h-screen items-center justify-center bg-white px-5 text-[#242424]">
        <div className="max-w-md space-y-4 rounded-md border border-[#dededb] p-6">
          <h1 className="text-lg font-semibold">Gönderim tamamlanamadı</h1>
          <p className="text-sm leading-6">{submissionError}</p>
          <Button onClick={() => void submitTest()} disabled={isSubmitting}>Gönderimi yeniden dene</Button>
        </div>
      </div>
    )
  }

  if (isTestComplete || isSubmitting) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        initial="initial"
        animate="animate"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-700">Sonuç sayfasına yönlendiriliyor...</p>
        </div>
      </motion.div>
    )
  }

  if (showSectionDescription && currentSection) {
    return (
      <motion.div
        className="speaking-exam-preparation h-[100dvh] overflow-y-auto overscroll-contain touch-pan-y bg-white text-[#242424]"
        style={typographyPreset.style}
        initial="initial"
        animate="animate"
      >
        {!micChecked ? (
      <MicrophoneCheck
        onSuccess={(deviceId) => {
          // Microphone approval is a direct user gesture, so it can also unlock
          // the shared WebAudio context used by automatic instruction playback.
          void (async () => {
            try {
              const ready = await unlockExamAudioFromGesture()
              if (!ready) {
                toast.error("Ses başlatılamadı. Mikrofon kontrolünü tekrar deneyin.")
                return
              }
              setMicChecked(true)
              if (micReadyStorageKey) {
                try {
                  sessionStorage.setItem(micReadyStorageKey, "1")
                  if (testId) sessionStorage.setItem(speakingMicrophoneStorageKey(testId), deviceId)
                } catch {}
              }
            } catch {
              toast.error("Ses başlatılamadı. Mikrofon kontrolünü tekrar deneyin.")
            }
          })()
        }}
      />
    ) : (
      <>
          <header className="sticky top-0 z-50 grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e5e5e2] bg-white px-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logo11.svg" alt="TURKISHMOCK" className="h-10 max-w-[150px] shrink-0 object-contain sm:max-w-none" />
              <span data-exam-section-divider className="hidden h-5 w-px shrink-0 bg-[#dededb] sm:block" />
              <span data-exam-section-title className="hidden truncate text-[17px] font-semibold text-[#37352f] sm:block">Konuşma</span>
            </div>

            <nav className="hidden shrink-0 items-center gap-1 sm:flex" aria-label="Konuşma bölümleri">
              {[
                { label: "1.1", active: currentSectionIndex === 0 && currentSubPartIndex === 0 },
                { label: "1.2", active: currentSectionIndex === 0 && currentSubPartIndex === 1 },
                { label: "2", active: currentSectionIndex === 1 },
                { label: "3", active: currentSectionIndex === 2 },
              ].map((item) => (
                <span
                  key={item.label}
                  aria-current={item.active ? "step" : undefined}
                  className={`flex h-8 min-w-10 items-center justify-center rounded-md px-3 text-[13px] font-semibold tabular-nums transition-colors ${
                    item.active
                      ? "bg-[#e9e9e6] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#c9c9c4]"
                      : "text-[#6f6d67]"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </nav>

            <div className="flex min-w-0 items-center justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                    aria-label="Yazı boyutu"
                    title="Yazı boyutu"
                  >
                    <ALargeSmall className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[10020] min-w-36 border-[#dededb] !bg-white !opacity-100 text-[#37352f] shadow-lg backdrop-blur-none"
                  style={{ backgroundColor: "#fff", opacity: 1 }}
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
                onClick={() => void exitFullscreen()}
                disabled={!isFullscreen}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:cursor-default disabled:opacity-45"
                aria-label="Tam ekrandan çık"
                title="Tam ekrandan çık"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </header>
          <SimpleTextDisplay
            heading={formatSpeakingSectionHeading(
              currentSection.type === "PART1"
                ? currentSection.subParts?.[currentSubPartIndex]?.label ||
                    (currentSubPartIndex === 0 ? "1.1" : "1.2")
                : currentSection.order,
            )}
            text={(() => {
              const instruction = shouldShowInstruction(currentSectionIndex, currentSubPartIndex)
              const editedInstruction = normalizeDisplayText(
                currentSection.subParts?.[currentSubPartIndex]?.description,
              )
              return editedInstruction
                || (instruction ? instruction.instructionText : "")
                || normalizeDisplayText(currentSection.description)
                || "Bu bölüm için talimat bulunamadı."
            })()}
            fontScale={mobile ? 1 : fontScale}
          />
          <div
            data-testid="speaking-instruction-footer"
            className="mt-2 flex h-10 items-center justify-center"
          >
            {instructionCountdown !== null && (
              <span
                data-testid="speaking-instruction-countdown"
                className="text-[20px] font-normal tabular-nums text-[#242424]"
                aria-label="Soru başlamadan önce geri sayım"
                aria-live="assertive"
              >
                {instructionCountdown}
              </span>
            )}
          </div>
      </>
    )}
      <FullscreenReturnDialog
        open={shouldShowFullscreenPrompt}
        onReturn={enterFullscreen}
      />
      </motion.div>
    )
  }

  // Only guard when section itself is missing
  if (!currentSection) {
    return null
  }

  const isAnswerRecording = isRecording && !isPrepRunning && !isPlayingTTS && !isPlayingInstructions
  const phaseLabel = phaseError
    ? phaseError
    : speakingPhase?.phase === "PROMPT_LOADING"
    ? "Soru hazırlanıyor"
    : speakingPhase?.phase === "PROMPT_PLAYING" || isPlayingTTS
    ? "Soru okunuyor"
    : speakingPhase?.phase === "PREP_IN_PROGRESS" || isPrepRunning
    ? "Hazırlık süresi"
    : speakingPhase?.phase === "RECORDING_READY"
    ? "Kayıt otomatik başlayacak"
    : speakingPhase?.phase === "RECORDING_IN_PROGRESS" || isRecording
    ? "Kaydediliyor"
    : speakingPhase?.phase === "RECORDING_FINALIZING" || isProcessingSpeechToText
    ? "Kayıt tamamlanıyor"
    : speakingPhase?.phase === "ANSWER_SAVED" || speakingPhase?.phase === "NEXT_READY"
    ? "Cevap kaydedildi"
    : speakingPhase?.phase === "SECTION_READY_TO_SUBMIT"
    ? "Bölüm gönderime hazır"
    : null
  const sectionSkipDisabled =
    isSectionSkipping ||
    isProcessingSpeechToText ||
    isFinalizingRecording ||
    isSubmitting

  return (
    <motion.div
      className="speaking-exam-page h-[100dvh] min-h-0 relative overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] flex flex-col bg-white text-[#242424]"
      data-speaking-part={currentSection.type}
      data-speaking-subpart={currentSubPartIndex}
      style={typographyPreset.style}
      initial="initial"
      animate="animate"
    >
      {/* <DisableKeys /> */}
      
      <header className="sticky top-0 z-50 grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e5e5e2] bg-white px-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo11.svg"
            alt="TURKISHMOCK"
            className="h-10 max-w-[150px] shrink-0 object-contain sm:max-w-none"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none"
            }}
          />
          <span data-exam-section-divider className="hidden h-5 w-px shrink-0 bg-[#dededb] sm:block" />
          <p data-exam-section-title className="min-w-0 truncate text-[17px] font-semibold leading-6 text-[#242424]">Konuşma</p>
        </div>

        <nav className="hidden shrink-0 items-center gap-1 sm:flex" aria-label="Konuşma bölümleri">
          {[
            { label: "1.1", active: currentSectionIndex === 0 && currentSubPartIndex === 0 },
            { label: "1.2", active: currentSectionIndex === 0 && currentSubPartIndex === 1 },
            { label: "2", active: currentSectionIndex === 1 },
            { label: "3", active: currentSectionIndex === 2 },
          ].map((item) => (
            <span
              key={item.label}
              aria-current={item.active ? "step" : undefined}
              className={`flex h-8 min-w-10 items-center justify-center rounded-md px-3 text-[13px] font-semibold tabular-nums transition-colors ${
                item.active
                  ? "bg-[#e9e9e6] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#c9c9c4]"
                  : "text-[#6f6d67]"
              }`}
            >
              {item.label}
            </span>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                aria-label="Yazı boyutu"
                title="Yazı boyutu"
              >
                <ALargeSmall className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[10020] min-w-36 border-[#dededb] !bg-white !opacity-100 text-[#37352f] shadow-lg backdrop-blur-none"
              style={{ backgroundColor: "#fff", opacity: 1 }}
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
            onClick={() => void exitFullscreen()}
            disabled={!isFullscreen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:cursor-default disabled:opacity-45"
            aria-label="Tam ekrandan çık"
            title="Tam ekrandan çık"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={skipCurrentMainSpeakingUnit}
            disabled={sectionSkipDisabled}
            className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded border border-[#dededb] bg-white px-3 text-[13px] font-semibold text-[#37352f] transition-colors hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bölümü Geç
          </button>
        </div>
      </header>

      {/* question rendering part */}
     <main
       className={`flex flex-1 flex-col items-center min-h-0 w-full px-3 sm:px-6 md:px-8 pt-4 md:pt-6 pb-16 safe-area-bottom ${
         currentSection?.type === "PART2"
           ? "justify-center sm:justify-center"
           : currentSection?.type === "PART1" && currentSubPartIndex === 0
             ? "justify-center sm:justify-center"
             : "justify-start sm:justify-center"
       }`}
     >
        <div
          data-testid="speaking-active-stage"
          className="flex w-full flex-col items-center lg:-translate-y-[5vh]"
        >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4"
          >
          {currentSection?.type !== "PART2" && currentSection?.type !== "PART3" && !isPlayingInstructions && (
             <div className="text-center px-2">
               <div
                 className="text-[length:var(--reading-heading-size)] font-semibold leading-[var(--reading-heading-line-height)] text-[#242424]"
               >
                 Soru {currentQuestionIndex + 1}
               </div>
             </div>
           )}
         </motion.div>
       </AnimatePresence>

        {!isPlayingInstructions && currentSection?.type !== "PART2" && currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
          <motion.div 
            className="mb-5 w-full px-2 sm:px-4"
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
          >
            {(() => {
              const imgs = currentSection.subParts[currentSubPartIndex].images
              if (imgs.length === 1) {
                return (
                  <div
                    className="mx-auto flex aspect-[3/2] w-full max-w-[560px] items-center justify-center overflow-hidden rounded-none border border-[#dededb] bg-white"
                  >
                    <motion.img
                      src={imgs[0]}
                      alt="Soru görseli"
                      className="h-full w-full object-contain p-2 sm:p-3"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement
                        el.src = "https://placehold.co/800x600?text=Gorsel+Yuklenemedi"
                      }}
                    />
                  </div>
                )
              }
              if (imgs.length >= 2) {
                return (
                  <div
                    className="mx-auto grid w-full max-w-[960px] grid-cols-1 items-start gap-4 sm:grid-cols-2"
                  >
                    {imgs.slice(0, 2).map((src, idx) => (
                      <div key={`pimg-${idx}`} className="relative aspect-[3/2] w-full min-w-0 overflow-hidden rounded-none border border-[#dededb] bg-white">
                        <motion.img
                          src={src}
                          alt={`Soru görseli ${idx + 1}`}
                          className="absolute inset-0 h-full w-full object-contain p-1"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement
                            el.src = "https://placehold.co/800x600?text=Gorsel+Yuklenemedi"
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            })()}
          </motion.div>
        ) : null}

        <AnimatePresence mode="wait">
          {!isPlayingInstructions && (
            <motion.div
              key={currentQuestion?.id || `${currentSection?.id}-content`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="mb-5 w-full px-2 sm:px-4"
            >
          {currentSection?.type === "PART2" ? (
            (() => {
              const imgs = currentSection?.subParts?.[currentSubPartIndex]?.images || []
              const questions = (currentSection?.subParts?.[currentSubPartIndex]?.questions || currentSection?.questions || [])
              if (imgs.length > 0) {
                return (
                  <div className="mx-auto grid w-full max-w-5xl items-center gap-7 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10">
                    <div className="relative aspect-video w-full overflow-hidden rounded-none border border-[#dededb] bg-white">
                      <img
                        {...protectedImageProps}
                        src={imgs[0]}
                        alt="Soru görseli"
                        className="absolute inset-0 h-full w-full object-contain p-1"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement
                          el.src = "https://placehold.co/800x600?text=Gorsel+Yuklenemedi"
                        }}
                      />
                    </div>
                    <div className="w-full min-w-0 px-1 sm:px-2">
                      <ul className="list-outside list-disc space-y-3 pl-6 text-left text-[#242424] sm:space-y-4">
                        {questions.map((q) => (
                          <li key={q.id} className="break-words text-[length:var(--reading-body-size)] leading-[var(--reading-body-line-height)]">
                            {normalizeDisplayText(q.questionText)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              }
              return (
                <div className="mx-auto max-w-3xl rounded-md bg-white p-3 sm:p-4 md:p-6">
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 text-black">
                    {questions.map((q) => (
                      <li key={q.id} className="break-words text-[length:var(--reading-body-size)] leading-[var(--reading-body-line-height)]">
                        {normalizeDisplayText(q.questionText)}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()
          ) : currentSection?.type === "PART3" ? (
            <SpeakingMobileDiscussionCard
              title={(() => {
                const subPart = currentSection.subParts?.[currentSubPartIndex]
                const questions = subPart?.questions ? [...subPart.questions].sort((a, b) => a.order - b.order) : []
                const activeQuestion = currentQuestion || questions[currentQuestionIndex] || questions[0]
                return normalizeDisplayText(activeQuestion?.questionText || currentSection.description || "")
              })()}
              advantages={(currentSection as any).points?.filter((point: any) => point.type === 'ADVANTAGE').flatMap((point: any) => point.example || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((example: any) => normalizeDisplayText(example.text)) || []}
              disadvantages={(currentSection as any).points?.filter((point: any) => point.type === 'DISADVANTAGE').flatMap((point: any) => point.example || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((example: any) => normalizeDisplayText(example.text)) || []}
            >
            <div className="mx-auto mb-5 w-full max-w-5xl overflow-hidden border border-[#242424] bg-white">
              {(() => {
                const sp = currentSection?.subParts?.[currentSubPartIndex]
                const questions = sp?.questions ? [...sp.questions].sort((a, b) => a.order - b.order) : []
                const activeQuestion = currentQuestion || questions[currentQuestionIndex] || questions[0]
                const text = normalizeDisplayText(activeQuestion?.questionText || currentSection?.description || "")
                return text ? (
                  <div className="border-b border-[#242424] px-4 py-4 md:px-6">
                    <h3 className="whitespace-pre-line break-words text-center text-[length:var(--reading-heading-size)] font-semibold leading-[var(--reading-heading-line-height)] text-[#242424]">
                      {text}
                    </h3>
                  </div>
                ) : null
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b border-[#242424] p-4 md:border-b-0 md:border-r md:p-6">
                  <h4 className="mb-3 text-[length:var(--reading-body-size)] font-semibold leading-[var(--reading-body-line-height)] text-[#242424]">Lehine</h4>
                  <ul className="list-inside list-disc space-y-2 text-[length:var(--reading-body-size)] leading-[var(--reading-body-line-height)] text-[#242424]">
                    {(currentSection as any)?.points?.filter((p: any) => p.type === 'ADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                      <li key={`adv-${idx}`} className="pl-1 break-words">{normalizeDisplayText(ex.text)}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 md:p-6">
                  <h4 className="mb-3 text-[length:var(--reading-body-size)] font-semibold leading-[var(--reading-body-line-height)] text-[#242424]">Aleyhine</h4>
                  <ul className="list-inside list-disc space-y-2 text-[length:var(--reading-body-size)] leading-[var(--reading-body-line-height)] text-[#242424]">
                    {(currentSection as any)?.points?.filter((p: any) => p.type === 'DISADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                      <li key={`dis-${idx}`} className="pl-1 break-words">{normalizeDisplayText(ex.text)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            </SpeakingMobileDiscussionCard>
              ) : (
                <h2
                  className="speaking-mock-question mx-auto max-w-3xl break-words px-2 text-center text-[length:var(--reading-body-size)] font-normal leading-[var(--reading-body-line-height)] text-[#242424] sm:px-4"
                >
                  {normalizeDisplayText(currentQuestion?.questionText)}
                </h2>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isPlayingInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            data-phase-error={Boolean(phaseError) || undefined}
            className={`speaking-mock-recorder mt-2 flex min-h-[72px] w-full max-w-xl flex-wrap items-center gap-3 rounded-md border px-4 py-3 ${
              phaseError ? "border-[#efb5b0] bg-[#fff7f6]" : "border-[#dededb] bg-[#fafaf9]"
            }`}
          >
            <div className={`speaking-mock-recording-indicator relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              isRecording ? "bg-[#dc2626] text-white" : "bg-[#eeeeec] text-[#565550]"
            }`}>
              {isRecording && !isPaused && (
                <span
                  className="speaking-recording-pulse pointer-events-none absolute inset-0 rounded-full bg-[#dc2626]"
                  aria-hidden="true"
                />
              )}
              {isPlayingTTS ? <Volume2 className="relative h-5 w-5" /> : <Mic className="relative h-5 w-5" />}
            </div>

            <div className="speaking-mock-recording-status min-w-[8rem] flex-1">
              <p className={`break-words text-[15px] font-semibold leading-5 ${phaseError ? "text-[#b42318]" : "text-[#242424]"}`}>
                {isAnswerRecording
                  ? "Kaydediliyor"
                  : phaseLabel || (isPlayingTTS ? "Soru okunuyor" : "Kayıt otomatik başlayacak")}
              </p>
            </div>

            {phaseError && (
              <button type="button" onClick={() => void retryCurrentStep()}
                disabled={isRetryingRecording || isFinalizingRecording}
                className="rounded border border-[#dededb] bg-white px-3 py-2 text-sm disabled:opacity-50">
                {isRetryingRecording ? "Yeniden deneniyor…" : pendingRecordingRef.current ? "Ses çözümlemesini yeniden dene" : "Yeniden dene"}
              </button>
            )}

            {(isPrepRunning || isAnswerRecording) && (
              <span className="speaking-mock-recording-time shrink-0 font-mono text-xl font-semibold tabular-nums text-[#242424]">
                {formatTime(isPrepRunning ? prepSeconds : timeLeft)}
              </span>
            )}

            {isPrepRunning && (currentSection?.type === "PART2" || currentSection?.type === "PART3") && (
              <button
                type="button"
                onClick={skipPreparationAndStart}
                className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded border border-[#dededb] bg-white px-3 text-[13px] font-semibold text-[#37352f] transition-colors hover:bg-[#f7f7f5]"
              >
                Hazırlığı Geç
              </button>
            )}
          </motion.div>
        )}
        </div>
      </main>

      <FullscreenReturnDialog
        open={shouldShowFullscreenPrompt}
        onReturn={enterFullscreen}
      />
    </motion.div>
  )
}
