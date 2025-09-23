import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, ArrowLeft, CheckCircle, Info, Volume2 } from "lucide-react"
import axiosPrivate from "@/config/api"
import { toast } from "sonner"
import { MicrophoneCheck } from "./components/MicrophoneCheck"
// import ResultModal from "./components/ResultModal"
// import DisableKeys from "./components/DisableKeys"

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz"

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
}
interface Recording {
  blob: Blob
  duration: number
  questionId: string
}

const RECORD_SECONDS_PER_QUESTION = 30
const sectionAudios: Record<number, string> = {
  1: "/speakingpart1.mp3",
  2: "/speakingpart2.mp3",
  3: "/speakingpart3.mp3",
}



// Simple Progress component
const Progress = ({ value }: { value: number }) => (
  <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden">
    <motion.div
      className="h-full bg-gradient-to-r from-red-600 to-rose-600 rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.5 }}
    />
  </div>
)

// Format time utility
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}


export default function ImprovedSpeakingTest() {
  const { testId } = useParams()
  const navigate = useNavigate()

  // data / flow
  const [testData, setTestData] = useState<SpeakingTestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [micChecked, setMicChecked] = useState(false)
  const [showSectionDescription, setShowSectionDescription] = useState(true)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // exam mode (fullscreen + hide headers + lock back)
  const [isExamMode, setIsExamMode] = useState(false)
  const popHandlerRef = useRef<(e: PopStateEvent) => void | null>(null)
  const beforeUnloadRef = useRef<((e: BeforeUnloadEvent) => any) | null>(null)

  // recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlayingInstructions, setIsPlayingInstructions] = useState(false)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)
  // speaking/answer timer (seconds)
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION)
  const [_recordingTime, setRecordingTime] = useState(0)
  const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map())
  // preparation timer (seconds)
  const [prepSeconds, setPrepSeconds] = useState<number>(0)
  const [isPrepRunning, setIsPrepRunning] = useState(false)






  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const countdownRef = useRef<number | null>(null)
  const elapsedRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startSoundRef = useRef<HTMLAudioElement | null>(null)
  const endSoundRef = useRef<HTMLAudioElement | null>(null)
  const questionSoundRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const prepIntervalRef = useRef<number | null>(null)
  const autoAdvanceRef = useRef<string | null>(null)

  useEffect(() => {
    ; (async () => {
      try {
        const res = await axiosPrivate.get(`/api/speaking-test/${testId}`)
        setTestData(res.data)
      } catch (e) {
        console.error(e)
        toast.error("Test verisi yüklenemedi")
      } finally {
        setLoading(false)
      }
    })()

    startSoundRef.current = new Audio(
      "./bell-98033.mp3",
    )
    // Use a crisp, public-domain beep for end-of-prep cue
    endSoundRef.current = new Audio(
      "/bell-98033.mp3"
    )
    questionSoundRef.current = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAACAgICAf39/f39/f39/f39/f39/gICAf39/f39/f39/f39/f39/gICAf39/f39/f4CAgICAgH9/f39/f39/gICAf39/f39/f39/f39/f4CAgICAf39/f39/f39/"
    )

    return () => {
      stopAllAudio()
      cleanupMedia()
      clearTimers()
      removeNavigationLock()
      exitFullscreen().catch(() => { })
      removeExamBodyClass()
    }
  }, [testId])

  // utils
  const playSound = (type: "start" | "end" | "question") => {
    try {
      const el = type === "start" ? startSoundRef.current : type === "end" ? endSoundRef.current : questionSoundRef.current
      if (el) {
        el.currentTime = 0
        el.play().catch(() => { })
      }
    } catch { }
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

  const getBlobDuration = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new Ctx()
      const buf = await ctx.decodeAudioData(arrayBuffer.slice(0))
      // @ts-ignore
      if (ctx.close) await ctx.close()
      return Math.round(buf.duration)
    } catch (e) {
      console.error("duration error", e)
      return 0
    }
  }

  const currentSection = testData?.sections?.[currentSectionIndex]
  const currentQuestion: Question | null = (() => {
    const sec = currentSection
    if (!sec) return null
    if (sec.subParts?.length) {
      return sec.subParts[currentSubPartIndex]?.questions?.[currentQuestionIndex] ?? null
    }
    return sec.questions?.[currentQuestionIndex] ?? null
  })()

  // Auto-advance guard: avoid showing empty question frames in PART1 transitions
  useEffect(() => {
    if (currentSection?.type === "PART1" && !currentQuestion) {
      const key = `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
      if (autoAdvanceRef.current !== key) {
        autoAdvanceRef.current = key
        nextQuestion()
      }
    } else {
      autoAdvanceRef.current = null
    }
  }, [currentSection?.type, currentQuestion, currentSectionIndex, currentSubPartIndex, currentQuestionIndex])

  // Auto-play section audio when showing section description
  useEffect(() => {
    if (showSectionDescription && currentSection && micChecked && !isPlayingInstructions) {
      const src = sectionAudios[currentSection.order]
      if (src) {
        // Enter exam mode when audio starts playing
        setIsExamMode(true)
        addNavigationLock()
        enterFullscreen().catch(() => {})

        const audio = new Audio(src)
        audioRef.current = audio
        setIsPlayingInstructions(true)
        audio.onended = () => {
          setIsPlayingInstructions(false)
          // Start the section after audio ends
          setShowSectionDescription(false)
          resetPerQuestionState()
          playSound("question")
          // Start first question based on section type
          if (currentSection.type === "PART1") {
            beginPreparation(5, () => startRecording(30, true))
          } else if (currentSection.type === "PART2" || currentSection.type === "PART3") {
            beginPreparation(60, () => startRecording(120, true))
          } else {
            startRecording(undefined, true)
          }
        }
        audio.onerror = () => {
          setIsPlayingInstructions(false)
          toast.error("Audio yüklenemedi")
        }
        audio.play().catch(() => setIsPlayingInstructions(false))
      }
    }
  }, [showSectionDescription, currentSection, micChecked, isPlayingInstructions])

  // Play a short chime and TTS audio when a new question becomes active (outside instructions)
  useEffect(() => {
    if (!showSectionDescription && currentSection && !isPlayingInstructions) {
      playSound("question")

      // Play TTS audio if available
      if (currentQuestion?.textToSpeechUrl) {
        const fullUrl = currentQuestion.textToSpeechUrl.startsWith('./')
          ? `${baseURL}${currentQuestion.textToSpeechUrl.substring(1)}`
          : currentQuestion.textToSpeechUrl
        const ttsAudio = new Audio(fullUrl)
        ttsAudioRef.current = ttsAudio
        setIsPlayingTTS(true)
        ttsAudio.onended = () => {
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
        }
        ttsAudio.onerror = () => {
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          toast.error("TTS audio yüklenemedi")
        }
        ttsAudio.play().catch(() => {
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
        })
      }
    }
  }, [currentSectionIndex, currentSubPartIndex, currentQuestionIndex, showSectionDescription, isPlayingInstructions, currentQuestion])

  // timers while recording
  useEffect(() => {
    if (!isRecording || isPaused) return

    countdownRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    elapsedRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)

    return () => clearTimers()
  }, [isRecording, isPaused])

  // FULLSCREEN & NAV LOCK helpers
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement as any
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      // add body class to hide global header/footer (depends on your layout classes)
      addExamBodyClass()
    } catch (e) {
      console.warn("Fullscreen failed", e)
    }
  }

  const exitFullscreen = async () => {
    try {
      const doc: any = document
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      removeExamBodyClass()
    } catch (e) {
      console.warn("Exit fullscreen failed", e)
    }
  }

  const addExamBodyClass = () => {
    try {
      document.body.classList.add("exam-mode")
      // optionally lock scrolling
      document.documentElement.style.overflow = "hidden"
    } catch { }
  }
  const removeExamBodyClass = () => {
    try {
      document.body.classList.remove("exam-mode")
      document.documentElement.style.overflow = ""
    } catch { }
  }

  const addNavigationLock = () => {
    try {
      window.history.pushState(null, "", window.location.href)
      const popHandler = () => {
        // whenever user tries to go back, push them forward again
        window.history.pushState(null, "", window.location.href)
        toast.error("Sinov davomida orqaga qaytish mumkin emas")
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
      console.warn("Navigation lock failed", e)
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
      console.warn("remove nav lock failed", e)
    }
  }

  // recording controls
  const startRecording = async (durationSeconds?: number, allowOverride: boolean = false) => {
    try {
      if (isPlayingInstructions && !allowOverride) {
        toast.error("Talimat bitmeden kayıt başlatılamaz")
        return
      }
      // Determine effective duration by section when not explicitly provided
      const sectionType = currentSection?.type
      const effectiveDuration =
        durationSeconds ?? (sectionType === "PART1" ? 30 : sectionType === "PART2" ? 120 : sectionType === "PART3" ? 120 : RECORD_SECONDS_PER_QUESTION)

      playSound("start")
      setTimeLeft(effectiveDuration)
      setRecordingTime(0)
      setIsPaused(false)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      })
      streamRef.current = stream
      chunksRef.current = []

      const supported = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      const mr = new MediaRecorder(stream, supported ? { mimeType: "audio/webm;codecs=opus" } : undefined)
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data)
      mr.onstop = async () => {
        playSound("end")
        clearTimers()
        const blob = new Blob(chunksRef.current, { type: supported ? "audio/webm;codecs=opus" : "audio/webm" })
        chunksRef.current = []
        const duration = await getBlobDuration(blob)
        // Use question id when available, else fallback to section id
        const key = currentQuestion?.id || currentSection?.id || `${currentSectionIndex}`
        const rec: Recording = { blob, duration, questionId: key }
        setRecordings((prev) => new Map(prev).set(key, rec))
        // smooth auto-next when there is a question-based flow
        if (currentQuestion && currentSection?.type === "PART1") {
          setTimeout(() => nextQuestion(true), 900)
        }
        cleanupMedia()
        }
        
        mr.start(100)
        setIsRecording(true)
    } catch (e) {
      console.error("start error", e)
      toast.error("Mikrofon erişimi reddedildi veya başlatılamadı")
      cleanupMedia()
      clearTimers()
      setIsRecording(false)
    }
  }



  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    } catch { }
    setIsRecording(false)
    setIsPaused(false)
  }

  const resetPerQuestionState = () => {
    setTimeLeft(RECORD_SECONDS_PER_QUESTION)
    setRecordingTime(0)
    setIsPaused(false)
  }

  const nextQuestion = (force: boolean = false) => {
    if (!force && audioRef.current && !audioRef.current.paused) {
      return
    }
    if (!force && isPlayingInstructions) {
      return
    }
    if (!force && isPlayingTTS) {
      return
    }
    if (!force && isRecording) {
      return
    }

    if (force) {
      // stop any ongoing audio/instructions/prep/recording before skipping
      stopAllAudio()
      setIsPlayingInstructions(false)
      if (prepIntervalRef.current) {
        window.clearInterval(prepIntervalRef.current)
        prepIntervalRef.current = null
      }
      setIsPrepRunning(false)
      if (isRecording) stopRecording()
    }

    if (!testData || !currentSection) return

    if (currentSection.subParts?.length) {
    const sp = currentSection.subParts[currentSubPartIndex]
    const qLen = sp?.questions?.length ?? 0
    if (currentQuestionIndex < qLen - 1) {
    setCurrentQuestionIndex((i) => i + 1)
    resetPerQuestionState()
    // auto begin preparation for PART1
      if (currentSection.type === "PART1") {
        setTimeout(() => beginPreparation(5, () => startRecording(30, true)), 0)
    }
    return
    }
    if (currentSubPartIndex < currentSection.subParts.length - 1) {
      setCurrentSubPartIndex((i) => i + 1)
        setCurrentQuestionIndex(0)
      resetPerQuestionState()
      if (currentSection.type === "PART1") {
      setTimeout(() => beginPreparation(5, () => startRecording(30, true)), 0)
    }
    return
    }
    } else {
        const qLen = currentSection.questions?.length ?? 0
      if (currentQuestionIndex < qLen - 1) {
      setCurrentQuestionIndex((i) => i + 1)
      resetPerQuestionState()
      if (currentSection.type === "PART1") {
        setTimeout(() => beginPreparation(5, () => startRecording(30, true)), 0)
      }
        return
    }
    }

      if (currentSectionIndex < (testData.sections?.length ?? 0) - 1) {
        setCurrentSectionIndex((i) => i + 1)
        setCurrentSubPartIndex(0)
        setCurrentQuestionIndex(0)
        setShowSectionDescription(true)
        resetPerQuestionState()
      } else {
        // test finished: clean up locks & fullscreen
        setIsTestComplete(true)
      }
  }

  // when test becomes complete, remove navigation lock & exit fullscreen & remove body class
  useEffect(() => {
    if (isTestComplete) {
      removeNavigationLock()
      exitFullscreen().catch(() => { })
      setIsExamMode(false)
      // auto-submit and navigate to results
      if (!isSubmitting) {
        setIsSubmitting(true)
        submitTest()
      }
    }
  }, [isTestComplete])

  // preparation helper
  const beginPreparation = (seconds: number, after?: () => void) => {
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    setPrepSeconds(seconds)
    setIsPrepRunning(true)
    // beep to indicate prep timer start
    playSound("start")
    prepIntervalRef.current = window.setInterval(() => {
      setPrepSeconds((prev) => {
        if (prev <= 1) {
          if (prepIntervalRef.current) {
            window.clearInterval(prepIntervalRef.current)
            prepIntervalRef.current = null
          }
          setIsPrepRunning(false)
          // ensure instructions flag is off before auto-start
          setIsPlayingInstructions(false)
          // beep to indicate prep end (start speaking)
          playSound("end")
          after && after()
          return 0
        }
        return prev - 1
      })
    }, 1000)
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
    if (!testData) return
    setIsSubmitting(true)

    try {
      toast.info("Konuşmalarınız metne dönüştürülüyor...")

      const answerMap = new Map<string, { text: string; duration: number }>()
      testData.sections.forEach((s) => {
        if (s.subParts?.length) {
          s.subParts.forEach((sp) =>
            sp.questions.forEach((q) => answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 })),
          )
        } else {
          s.questions.forEach((q) => answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 }))
        }
      })

      for (const [qid, rec] of recordings) {
        try {
          const fd = new FormData()
          fd.append("audio", rec.blob, "recording.webm")

          const res = await axiosPrivate.post("/api/speaking-submission/speech-to-text", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
          })

          const text = res.data?.text || "[Ses metne dönüştürülemedi]"
          answerMap.set(qid, { text, duration: rec.duration })
        } catch (e) {
          console.error("speech-to-text error", e)
          const prev = answerMap.get(qid)
          answerMap.set(qid, {
            text: "[Ses metne dönüştürülemedi]",
            duration: rec.duration || prev?.duration || 0,
          })
        }
      }

      // --- Parts tuzish
      const parts = testData.sections.map((s) => {
        const p: any = { description: s.description, image: "" }

        if (s.subParts?.length) {
          const subParts = s.subParts.map((sp) => {
            const questions = sp.questions.map((q) => {
              const a = answerMap.get(q.id)
              return {
                questionId: q.id,
                userAnswer: a?.text ?? "[Cevap bulunamadı]",
                duration: a?.duration ?? 0,
              }
            })
            const duration = questions.reduce((acc, q) => acc + (q.duration || 0), 0)
            return { image: sp.images?.[0] || "", duration, questions }
          })

          const duration = subParts.reduce((acc, sp) => acc + (sp.duration || 0), 0)
          p.subParts = subParts
          p.duration = duration
        } else {
          const questions = s.questions.map((q) => {
            const a = answerMap.get(q.id)
            return {
              questionId: q.id,
              userAnswer: a?.text ?? "[Cevap bulunamadı]",
              duration: a?.duration ?? 0,
            }
          })
          const duration = questions.reduce((acc, q) => acc + (q.duration || 0), 0)
          p.questions = questions
          p.duration = duration

          if (s.type === "PART3") p.type = "DISADVANTAGE"
        }

        return p
      })

      // --- Testni serverga yuborish
      const res = await axiosPrivate.post("/api/speaking-submission", {
        speakingTestId: testData.id,
        parts,
      })

      // --- Navigate to results page like writing test
      toast.success("Test başarıyla gönderildi!")
      const submissionId = res.data?.id || res.data?.submissionId
      removeNavigationLock()
      exitFullscreen().catch(() => { })
      setIsExamMode(false)
      if (submissionId) {
        navigate(`/speaking-test/results/${submissionId}`)
        return
      }
    } catch (e) {
      console.error("submit error", e)
      toast.error("Test gönderilirken hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }



  if (loading) {
    return (
      <motion.div
        className="min-h-screen  flex items-center justify-center px-4"
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center">
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20  rounded-3xl mx-auto mb-4 sm:mb-6 grid place-items-center shadow-2xl shadow-red-200"
            animate="animate"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>
          </motion.div>
          <motion.p
            className="text-lg sm:text-xl font-bold text-gray-800 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Test yükleniyor...
          </motion.p>
          <div className="w-24 h-1 sm:w-32 sm:h-1  rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full "
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
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
            onClick={() => navigate("/test")}
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
          >
            Geri Dön
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  if (isTestComplete) {
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
        className="min-h-screen "
        initial="initial"
        animate="animate"
      >
        {!micChecked ? (
      <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
    ) : (
      <>
        {!isExamMode && (
          <motion.header
            className="sticky top-0 z-10 bg-white/80  border-b border-gray-100 shadow-sm"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
          </motion.header>
        )}
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 min-h-[calc(100vh-120px)] flex items-center justify-center">
  <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-10 shadow-lg w-full max-w-5xl">
    <div className="text-center mb-6 sm:mb-8">
      <div className="inline-flex items-center bg-gray-100 text-gray-700 px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold mb-4 sm:mb-6 border border-gray-200">
        <Info className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
        {currentSection.title}
      </div>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-6">Bölüm Açıklaması</h2>
      <p className="text-lg sm:text-xl text-gray-700 leading-relaxed whitespace-pre-line max-w-4xl mx-auto">
        {currentSection.description}
      </p>
    </div>
    {isPlayingInstructions && (
      <div className="mt-8 sm:mt-10 text-center">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
          <Volume2 className="w-5 h-5" />
          <span>Playing section instructions...</span>
        </div>
      </div>
    )}
  </div>
</main>
      </>
    )}
      </motion.div>
    )
  }

  // Only guard when section itself is missing
  if (!currentSection) {
    return null
  }

  const totalQuestionsInSection = currentSection?.subParts?.length
    ? (currentSection.subParts[currentSubPartIndex]?.questions?.length ?? 0)
    : (currentSection?.questions?.length ?? 0)
  const progressPercent = (currentQuestionIndex / Math.max(1, totalQuestionsInSection)) * 100

  return (
    <motion.div
      className="min-h-screen relative overflow-hidden"
      initial="initial"
      animate="animate"
    >
      {/* <DisableKeys /> */}
      
      {/* Header with section indicators */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-8 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white px-4 py-3 rounded font-bold text-base sm:text-lg">
            TURKISHMOCK
          </div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          {/* Section 1.1 */}
          <div className={`px-5 py-4 rounded-lg font-bold text-base sm:text-lg ${
            currentSectionIndex === 0 && currentSubPartIndex === 0
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-black"
          }`}>
            1.1
          </div>
          {/* Section 1.2 */}
          <div className={`px-5 py-4 rounded-lg font-bold text-base sm:text-lg ${
            currentSectionIndex === 0 && currentSubPartIndex === 1
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-black"
          }`}>
            1.2
          </div>
          {/* Section 2 */}
          <div className={`px-5 py-4 rounded-lg font-bold text-base sm:text-lg ${
            currentSectionIndex === 1
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-black"
          }`}>
            2
          </div>
          {/* Section 3 */}
          <div className={`px-5 py-4 rounded-lg font-bold text-base sm:text-lg ${
            currentSectionIndex === 2
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-black"
          }`}>
            3
          </div>
        </div>

        <div className="bg-red-600 text-white px-4 py-3 rounded font-bold text-base sm:text-base">MULTI LEVEL</div>
      </div>
      {!isExamMode && (
        <motion.header
          className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 shadow-sm"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-5">
            <div className="flex items-center justify-between">
              <motion.button
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate("/test")}
                className="flex items-center text-red-600 hover:text-red-700 font-bold transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-sm sm:text-lg">Geri</span>
              </motion.button>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">{testData.title}</h1>
                <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2">
                  <motion.div
                    className="px-3 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full text-xs sm:text-sm font-bold shadow-md"
                    whileHover={{ scale: 1.05 }}
                  >
                    {currentSection?.title}
                  </motion.div>
                  <span className="text-xs sm:text-sm text-gray-400">•</span>
                  <span className="text-xs sm:text-sm text-gray-600 font-semibold">Soru {currentQuestionIndex + 1}</span>
                </div>
              </motion.div>
              <motion.div
                className="text-sm sm:text-lg font-bold text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded-xl"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Bölüm {currentSectionIndex + 1} / {testData.sections.length}
              </motion.div>
            </div>
            <motion.div
              className="mt-3 sm:mt-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Progress value={progressPercent} />
            </motion.div>
          </div>
        </motion.header>
      )}
         {/* question rendering part */}
     <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-8">
       <AnimatePresence mode="wait">
         <motion.div
           key={`${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`}
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 20 }}
           className="mb-12 sm:mb-16"
         >
           {currentSection?.type !== "PART2" && !isPlayingInstructions && (
             <div className="flex items-center bg-green-600 rounded-l-2xl rounded-r-2xl overflow-hidden shadow-lg">
               <div className="bg-green-600 text-white px-4 py-2 sm:px-6 sm:py-4 font-bold text-lg sm:text-2xl">QUESTION</div>
               <div className="bg-yellow-500 text-black px-3 py-2 sm:px-6 sm:py-4 font-bold text-xl sm:text-3xl">
                 {currentQuestionIndex + 1}
               </div>
             </div>
           )}
         </motion.div>
       </AnimatePresence>

        {!isPlayingInstructions && currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
          <motion.div 
            className="mb-8" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.img
              src={currentSection.subParts[currentSubPartIndex].images[0] || "/placeholder.svg"}
              alt="Question image"
              className="max-w-lg mx-auto rounded-2xl shadow-xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
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
              className="mb-16 sm:mb-20"
            >
              {currentSection?.type === "PART2" ? (
                <div className="max-w-3xl mx-auto bg-white p-4 sm:p-6 rounded-xl">
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 text-black">
                    {(currentSection?.subParts?.[currentSubPartIndex]?.questions || currentSection?.questions || []).map((q) => (
                      <li key={q.id} className="text-lg sm:text-xl leading-relaxed">
                        {q.questionText}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : currentSection?.type === "PART3" ? (
                <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900">Lehler (Avantajlar)</h3>
                      <ul className="list-disc list-inside space-y-2 text-black">
                        {(currentSection as any)?.points?.filter((p: any) => p.type === 'ADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                          <li key={`adv-${idx}`}>{ex.text}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900">Aleyhler (Dezavantajlar)</h3>
                      <ul className="list-disc list-inside space-y-2 text-black">
                        {(currentSection as any)?.points?.filter((p: any) => p.type === 'DISADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                          <li key={`dis-${idx}`}>{ex.text}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-gray-800 text-center leading-relaxed max-w-4xl">
                  {currentQuestion?.questionText}
                </h2>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {isRecording && !isPaused && !isPlayingInstructions && !isPrepRunning && (
            <>
              <span className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 -left-3 -top-3 sm:-left-4 sm:-top-4 rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDuration: '2.5s' }}></span>
              <span className="absolute inset-0 w-36 h-36 sm:w-48 sm:h-48 -left-6 -top-6 sm:-left-8 sm:-top-8 rounded-full bg-red-500 opacity-20 animate-ping" style={{ animationDuration: '3s' }}></span>
            </>
          )}
          <motion.button
            onClick={() => {
              if (isPlayingInstructions || isPrepRunning) return
              if (isRecording) stopRecording()
              else startRecording()
            }}
            disabled={isPlayingInstructions || isPrepRunning || isPlayingTTS}
            className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700"
            } ${(isPlayingInstructions || isPrepRunning) ? "opacity-50 cursor-not-allowed" : ""}`}
            whileHover={{ scale: (isPlayingInstructions || isPrepRunning) ? 1 : 1.05 }}
            whileTap={{ scale: (isPlayingInstructions || isPrepRunning) ? 1 : 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <div>
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
            </div>
          </motion.button>
        </div>

        {(() => {
          const key = currentQuestion?.id || currentSection?.id || `${currentSectionIndex}`
          return recordings.has(key)
        })() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-green-600 font-bold"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Recorded</span>
          </motion.div>
        )}

        {isPlayingInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-blue-600 font-bold"
          >
            <Volume2 className="w-5 h-5" />
            <span>Playing instructions...</span>
          </motion.div>
        )}
{/* 
        {isPlayingTTS && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-green-600 font-bold"
          >
            <Volume2 className="w-5 h-5" />
            <span>Playing question audio...</span>
          </motion.div>
        )} */}

        <div className="flex items-center gap-4 mt-8">
          {!isExamMode && (
            <motion.button
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsTestComplete(true)}
              className="px-6 py-3 text-sm bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-bold transition-all duration-200"
            >
              Test Bitir (Debug)
            </motion.button>
          )}

          {/* <motion.button
            onClick={() => {
              if (isPlayingInstructions) {
                // Skip only the instructions, then start prep for current section
                stopAllAudio()
                setIsPlayingInstructions(false)
                startAfterInstructionsForCurrentSection()
              } else {
                // Skip the current question entirely
                nextQuestion(true)
              }
            }}
            className={`px-8 py-3 rounded-xl cursor-pointer font-bold transition-all duration-200 bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Atla
          </motion.button>

          <motion.button
            onClick={() => nextQuestion(false)}
            disabled={isRecording || isPlayingInstructions || isPrepRunning || isPlayingTTS}
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-200 ${
              (isRecording || isPlayingInstructions || isPrepRunning)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 shadow-lg"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Sonraki →
          </motion.button> */}
        </div>
      </main>

      {!isPlayingInstructions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8"
        >
          <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-800 font-mono">
            {isPrepRunning ? formatTime(prepSeconds) : formatTime(timeLeft)}
          </div>
          {isPrepRunning ? (
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 font-mono text-center mt-1 sm:mt-2">
              Hazırlık
          </div>
        ) : (
          isRecording && (
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 font-mono text-center mt-1 sm:mt-2">
            </div>
          )
        )}
        </motion.div>
      )}
    </motion.div>
  )
}
