import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { overallTestFlowStore, overallTestTokenStore } from "@/services/overallTest.service"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, ArrowLeft, Volume2 } from "lucide-react"
import axiosPrivate from "@/config/api"
import { toast } from "sonner"
import { speakingSubmissionService } from "@/services/speakingSubmission.service"
import { MicrophoneCheck } from "./components/MicrophoneCheck"
import { getInstructionForSection } from "@/config/speakingInstructions"
import { speechToTextService } from "@/services/speechToText.service"
import SimpleTextDisplay from "@/components/speaking-test/SimpleTextDisplay"
// import ResultModal from "./components/ResultModal"
// import DisableKeys from "./components/DisableKeys"

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkishmock.uz"

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
  1: "/1.1.mp3",
  2: "/2.mp3",
  3: "/3.mp3",
}

// Static section descriptions
const getSectionDescription = (sectionTitle: string, subPartIndex?: number): string => {
  if (sectionTitle.includes("Section 1") || sectionTitle.includes("Part 1")) {
    if (subPartIndex === 0) {
      // Section 1.1
      return "Merhaba, Türkçe Yeterlik Sınavı'nın konuşma bölümüne hoş geldiniz.\nŞimdi Birinci Bölümün Birinci Kısmına geçiyoruz.\nBu bölümde size kendinizle ilgili üç kısa soru sorulacaktır.\nHer bir soruyu cevaplamak için 30 saniyeniz bulunmaktadır.\nZil sesini duyduğunuzda konuşmaya başlayabilirsiniz."
    } else if (subPartIndex === 1) {
      // Section 1.2
      return "Şimdi size iki resim gösterilecek ve onlara ilişkin daha üç soru sorulacaktır.\nHer bir soruyu cevaplamak için 30 saniyeniz bulunur.\nZil sesini duyduğunuzda konuşmaya başlayabilirsiniz."
    }
  } else if (sectionTitle.includes("Section 2") || sectionTitle.includes("Part 2")) {
    return "Bu bölümde size bir resim gösterilecek ve üç soru sorulacaktır.\nKonuşmaya başlamadan önce hazırlanmanız için 1 dakikanız,\nsoruları cevaplamanız için ise 2 dakikanız vardır.\nZil sesinden sonra konuşmaya başlayabilirsiniz."
  } else if (sectionTitle.includes("Section 3") || sectionTitle.includes("Part 3")) {
    return "Bu bölümde size bir argüman sunulacaktır.\nBu argümanın her iki yönünü ele alarak konuşmanız gerekmektedir.\nKonuşmaya başlamadan önce hazırlanmanız için 1 dakikanız,\nkonuşmanızı yapmanız için ise 2 dakikanız bulunmaktadır.\nZil sesini duyduktan sonra konuşmaya başlayabilirsiniz."
  }
  return "Bu bölümde konuşma testi yapılacaktır."
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

const SUBMIT_RETRY_GUIDE = "Cevaplariniz bu tarayicida guvenle saklandi."

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
    return "Oturum tarafinda gecici bir hata olustu. Sistem gonderimi otomatik olarak tekrar deneyecek."
  }

  if (base.includes(SUBMIT_RETRY_GUIDE)) return base
  return `${base}. ${SUBMIT_RETRY_GUIDE}`
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })


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
  const [isProcessingSpeechToText, setIsProcessingSpeechToText] = useState(false)
  // speaking/answer timer (seconds)
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION)
  const [_recordingTime, setRecordingTime] = useState(0)
  const [_recordings, setRecordings] = useState<Map<string, Recording>>(new Map())
  const [answers, setAnswers] = useState<Map<string, { text: string; duration: number }>>(new Map())
  // preparation timer (seconds)
  const [prepSeconds, setPrepSeconds] = useState<number>(0)
  const [isPrepRunning, setIsPrepRunning] = useState(false)
  const [introCountdown, setIntroCountdown] = useState<number | null>(null)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const INTRO_COUNTDOWN_SECONDS = 10
  const introCountdownRef = useRef<NodeJS.Timeout | null>(null)
  
  // instruction state
  const [completedInstructions] = useState<Set<string>>(new Set())

  const INSTRUCTION_VOLUME = 0.6
  const START_SOUND_VOLUME = 0.6







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
  const autoStartKeyRef = useRef<string | null>(null)
  const prepStartedKeyRef = useRef<string | null>(null)
  const skipToNextSectionRef = useRef<boolean>(false)
  const skipToNextQuestionRef = useRef<boolean>(false)
  const skipStoreEmptyRef = useRef<boolean>(false)
  // Guard to ensure section instruction audio plays only once per section
  const instructionPlayStartedRef = useRef<boolean>(false)
  const lastInstructionSectionRef = useRef<string | null>(null)
  const submitAllRetryRef = useRef<number>(0)

  useEffect(() => {
    // Activate exam mode immediately when entering speaking test
    if (typeof document !== "undefined") {
      document.body.classList.add("exam-mode")
      // Double-check exam mode is active if in overall test flow
      if (overallTestFlowStore.hasActive()) {
        document.body.classList.add("exam-mode")
      }
    }

    // Enter fullscreen immediately for speaking test
    enterFullscreen().catch(() => {})
    
    ; (async () => {
      try {
        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_SPEAKING_${testId}`)
        if (cachedData) {
          const data = JSON.parse(cachedData)
          setTestData(data)
          setLoading(false)
          return
        }

        // Fallback to API call if no cached data
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
      "/start.wav",
    )
    startSoundRef.current.volume = START_SOUND_VOLUME
    // Use bell sound for when user stops speaking
    endSoundRef.current = new Audio(
      "/bell-98033.mp3"
    )
    endSoundRef.current.volume = 0.5
    questionSoundRef.current = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAACAgICAf39/f39/f39/f39/f39/gICAf39/f39/f39/f39/f39/gICAf39/f39/f4CAgICAgH9/f39/f39/gICAf39/f39/f39/f39/f4CAgICAf39/f39/f39/"
    )

    return () => {
      stopAllAudio()
      cleanupMedia()
      clearTimers()
      removeNavigationLock()
      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest) {
        exitFullscreen().catch(() => { })
        removeExamBodyClass()
      }
    }
  }, [testId])


  // utils
  const playSound = (type: "start" | "end" | "question") => {
    try {
      const el = type === "start" ? startSoundRef.current : type === "end" ? endSoundRef.current : questionSoundRef.current
      if (el) {
        // Stop any currently playing audio of the same type
        el.pause()
        el.currentTime = 0
        console.log(`Playing ${type} sound`)
        el.play().catch((error) => {
          // This happens when play() is interrupted by a pause() during rapid state transitions.
          if (error?.name === "AbortError") return
          console.error(`Error playing ${type} sound:`, error)
        })
      } else {
        console.error(`Audio element for ${type} not found`)
      }
    } catch (error) {
      console.error(`Error in playSound for ${type}:`, error)
    }
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
  const currentQuestion: Question | null = (() => {
    const sec = currentSection
    if (!sec) return null
    if (sec.subParts?.length) {
      const questions = sec.subParts[currentSubPartIndex]?.questions
      if (questions) {
        // Sort questions by order field to ensure correct sequence
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)
        const question = sortedQuestions[currentQuestionIndex] ?? null
        
        console.log("Current question (sorted):", {
          questionIndex: currentQuestionIndex,
          questionOrder: question?.order,
          questionText: question?.questionText?.substring(0, 50) + "...",
          totalQuestions: sortedQuestions.length
        })
        
        return question
      }
      return null
    }
    return sec.questions?.[currentQuestionIndex] ?? null
  })()

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
    if (showSectionDescription && currentSection && micChecked && !isPlayingInstructions && introCountdown === null) {
      // Get instruction for current section/subpart
      const instruction = shouldShowInstruction(currentSectionIndex, currentSubPartIndex)
      
      if (instruction) {
        // Enter exam mode when instruction starts
        setIsExamMode(true)
        addNavigationLock()
        enterFullscreen().catch(() => {})

        // Stop any existing audio to avoid overlaps
        if (audioRef.current) {
          try {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          } catch {}
        }
        
        // Play instruction audio directly
        console.log("Loading audio from path:", instruction.audioPath)
        const audio = new Audio(instruction.audioPath)
        audio.volume = INSTRUCTION_VOLUME
        audioRef.current = audio
        setIsPlayingInstructions(true)
        instructionPlayStartedRef.current = true
        lastInstructionSectionRef.current = currentSection.id
        
        audio.onloadstart = () => {
          console.log("Audio load started for:", instruction.audioPath)
        }
        
        audio.oncanplay = () => {
          console.log("Audio can play:", instruction.audioPath)
        }
        
        audio.onerror = (e) => {
          console.error("Audio error:", e)
          console.error("Audio error details:", audio.error)
          console.error("Audio network state:", audio.networkState)
          console.error("Audio ready state:", audio.readyState)
          setIsPlayingInstructions(false)
          instructionPlayStartedRef.current = false
          toast.error("Audio yüklenemedi: " + (audio.error?.message || "Unknown error"))
        }
        
        audio.onended = () => {
          console.log("Audio ended:", instruction.audioPath)
          setIsPlayingInstructions(false)
          instructionPlayStartedRef.current = false
          startIntroCountdown()
        }
        
        audio.play().catch((error) => {
          console.error("Audio play failed:", error)
          console.error("Error name:", error.name)
          console.error("Error message:", error.message)
          setIsPlayingInstructions(false)
        })
      } else {
        // No instruction needed, proceed with old flow
        const src = sectionAudios[currentSection.order]
        if (src) {
          // Enter exam mode when audio starts playing
          setIsExamMode(true)
          addNavigationLock()
          enterFullscreen().catch(() => {})

          // Stop any existing audio to avoid overlaps
          if (audioRef.current) {
            try {
              audioRef.current.pause()
              audioRef.current.currentTime = 0
            } catch {}
          }
          const audio = new Audio(src)
          audio.volume = INSTRUCTION_VOLUME
          audioRef.current = audio
          setIsPlayingInstructions(true)
          instructionPlayStartedRef.current = true
          lastInstructionSectionRef.current = currentSection.id
          audio.onended = () => {
            setIsPlayingInstructions(false)
            instructionPlayStartedRef.current = false
            startIntroCountdown()
          }
          audio.onerror = () => {
            setIsPlayingInstructions(false)
            instructionPlayStartedRef.current = false
            toast.error("Audio yüklenemedi")
          }
          audio.play().catch(() => setIsPlayingInstructions(false))
        }
      }
    }
  }, [showSectionDescription, currentSection, micChecked, isPlayingInstructions, currentSectionIndex, currentSubPartIndex, introCountdown])

  // Play TTS audio when a new question becomes active (outside instructions)
  // After TTS ends, start preparation timer
  useEffect(() => {
    if (
      !showSectionDescription &&
      currentSection &&
      !isPlayingInstructions &&
      !isRecording &&
      !isPrepRunning &&
      !isPlayingTTS &&
      introCountdown === null
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
      
      // Play TTS audio only for PART1 (skip TTS for PART2 and PART3)
      if (currentSection.type === "PART1" && questionToUse?.textToSpeechUrl) {
        console.log(`🔊 Playing TTS for ${currentSection.type}, question: ${questionToUse.id}`)
        const fullUrl = questionToUse.textToSpeechUrl.startsWith('./')
          ? `${baseURL}${questionToUse.textToSpeechUrl.substring(1)}`
          : questionToUse.textToSpeechUrl
        const ttsAudio = new Audio(fullUrl)
        ttsAudioRef.current = ttsAudio
        setIsPlayingTTS(true)
        ttsAudio.onended = () => {
          console.log(`✅ TTS ended for ${currentSection.type}, starting preparation timer`)
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          // After question TTS ends, ALWAYS start preparation for all sections
          startPreparationAfterTTS()
        }
        ttsAudio.onerror = (e) => {
          console.error(`❌ TTS error for ${currentSection.type}:`, e)
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          // If TTS fails, start preparation immediately
          startPreparationAfterTTS()
        }
        ttsAudio.play().catch((error) => {
          console.error(`❌ TTS play failed for ${currentSection.type}:`, error)
          setIsPlayingTTS(false)
          ttsAudioRef.current = null
          // If TTS play fails, start preparation immediately
          startPreparationAfterTTS()
        })
      } else {
        // For PART2 and PART3, skip TTS and start preparation immediately
        // For PART1 without TTS, also start preparation immediately
        console.log(`⏭️ Skipping TTS for ${currentSection.type}, starting preparation immediately`)
        startPreparationAfterTTS()
      }
    }
  }, [currentSectionIndex, currentSubPartIndex, currentQuestionIndex, showSectionDescription, isPlayingInstructions, currentQuestion, isRecording, isPrepRunning, isPlayingTTS, currentSection, introCountdown])

  // Helper function to start preparation after TTS (or immediately if no TTS)
  const startPreparationAfterTTS = () => {
    if (!currentSection) return
    
    // For PART2/PART3, there might not be a currentQuestion in the same way
    // So we allow starting preparation even without currentQuestion for these sections
    if (!currentQuestion && currentSection.type !== "PART2" && currentSection.type !== "PART3") {
      return
    }
    
    const key = `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
    
    // Prevent duplicate preparation starts
    if (prepStartedKeyRef.current === key) {
      console.log(`⚠️ Preparation already started for key: ${key}`)
      return
    }
    
    console.log(`🎯 Starting preparation for ${currentSection.type}, key: ${key}`)
    prepStartedKeyRef.current = key
    
    if (currentSection.type === "PART1") {
      // Section 1.2 (subPartIndex === 1) gets 5 seconds, others get 5 seconds
      const prepTime = currentSubPartIndex === 1 ? 5 : 5
      console.log(`⏱️ PART1 preparation time: ${prepTime} seconds (subPart: ${currentSubPartIndex})`)
      beginPreparation(prepTime, () => {
        startRecording(30, true)
      })
    } else if (currentSection.type === "PART2" || currentSection.type === "PART3") {
      console.log(`⏱️ ${currentSection.type} preparation time: 60 seconds`)
      beginPreparation(60, () => {
        startRecording(120, true)
      })
    } else {
      startRecording(undefined, true)
    }
  }

  // Removed duplicate auto-advance effect to prevent loops

  // Removed: Direct auto-start effect - now handled by TTS effect which ensures TTS plays first

  // Removed centralized auto-start to prevent double hazırlık

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
      // Allow scrolling on speaking test pages (mobile should scroll when content overflows)
      const isMobile = window.matchMedia("(max-width: 640px)").matches
      document.documentElement.style.overflow = isMobile ? "auto" : "hidden"
      document.body.style.overflowY = isMobile ? "auto" : "hidden"
    } catch { }
  }

  const proceedAfterInstruction = () => {
    setShowSectionDescription(false)
    resetPerQuestionState()
    playSound("question")
    if (currentSection?.type === "PART1" || currentSection?.type === "PART2" || currentSection?.type === "PART3") {
      // TTS will handle starting preparation after it finishes
      // If no TTS, the TTS effect will handle it
    } else {
      startRecording(undefined, true)
    }
  }

  const skipInstructionAndProceed = () => {
    stopAllAudio()
    setIsPlayingInstructions(false)
    proceedAfterInstruction()
  }

  const startIntroCountdown = () => {
    // Prevent double-start
    if (introCountdownRef.current) {
      clearInterval(introCountdownRef.current)
      introCountdownRef.current = null
    }
    setIntroCountdown(INTRO_COUNTDOWN_SECONDS)
    introCountdownRef.current = setInterval(() => {
      setIntroCountdown((prev) => {
        if (prev === null) return prev
        if (prev <= 1) {
          if (introCountdownRef.current) {
            clearInterval(introCountdownRef.current)
            introCountdownRef.current = null
          }
          proceedAfterInstruction()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }
  const removeExamBodyClass = () => {
    try {
      // Only remove exam-mode if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest) {
        document.body.classList.remove("exam-mode")
        document.documentElement.style.overflow = ""
        document.body.style.overflowY = ""
      } else {
        // Ensure exam-mode stays active for next test
        document.body.classList.add("exam-mode")
        const isMobile = window.matchMedia("(max-width: 640px)").matches
        document.documentElement.style.overflow = isMobile ? "auto" : "hidden"
        document.body.style.overflowY = isMobile ? "auto" : "hidden"
      }
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

  const getCurrentAnswerKey = () => {
    let key = currentQuestion?.id
    if (!key && currentSection && currentSection.questions && currentSection.questions.length > 0 && currentSection.questions[currentQuestionIndex]) {
      key = currentSection.questions[currentQuestionIndex].id
    }
    if (!key && currentSection?.subParts?.[currentSubPartIndex]?.questions && currentSection?.subParts?.[currentSubPartIndex]?.questions
      ?.length > 0) {
      const sortedQuestions = [...currentSection?.subParts?.[currentSubPartIndex]?.questions || []].sort((a, b) => a.order - b.order)
      if (sortedQuestions[currentQuestionIndex]) {
        key = sortedQuestions[currentQuestionIndex].id
      }
    }
    if (!key) {
      key = currentSection?.id || `${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`
    }
    return key
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
        console.log(`🔔 Recording stopped for question ${currentQuestionIndex + 1}`)
        // bell to indicate answer end
        playSound("end")
        clearTimers()
        const blob = new Blob(chunksRef.current, { type: supported ? "audio/webm;codecs=opus" : "audio/webm" })
        chunksRef.current = []
        const duration = await getBlobDuration(blob)
        const key = getCurrentAnswerKey()
        console.log(`🎤 Recording saved with key: ${key} for question:`, currentQuestion?.id || "unknown")
        const rec: Recording = { blob, duration, questionId: key }
        setRecordings((prev) => new Map(prev).set(key, rec))

        if (skipStoreEmptyRef.current) {
          skipStoreEmptyRef.current = false
          setAnswers(prev => new Map(prev).set(key, { text: "", duration }))
        } else {
          // Transcribe immediately and store text answer
          setIsProcessingSpeechToText(true)
          try {
            const stt = await speechToTextService.convertAudioToText(blob)
            let text = ""
            if (stt.success && stt.text) {
              text = stt.text.trim()
            }
            // Only use placeholder if text is actually empty
            if (!text) {
              text = "[Ses metne dönüştürülemedi]"
            }
            console.log(`💾 Saving answer for question ${key}:`, text.substring(0, 50))
            setAnswers(prev => new Map(prev).set(key, { text, duration }))
          } catch (error) {
            console.error("Error converting speech to text:", error)
            setAnswers(prev => new Map(prev).set(key, { text: "[Ses metne dönüştürülemedi]", duration }))
          } finally {
            setIsProcessingSpeechToText(false)
          }
        }
        
        // If user requested to skip to next section, do it after saving
        if (skipToNextSectionRef.current) {
          skipToNextSectionRef.current = false
          setTimeout(() => {
            advanceToNextSection()
          }, 300)
        } else if (skipToNextQuestionRef.current) {
          skipToNextQuestionRef.current = false
          setTimeout(() => {
            nextQuestion(true)
          }, 300)
        } else {
          // Automatically advance to next question after recording completes
          if (currentSection?.type === "PART1") {
            console.log(`🎯 PART1: Recording finished for question ${currentQuestionIndex + 1}, auto-advancing in 800ms...`)
            setTimeout(() => {
              console.log(`🚀 Calling nextQuestion(true) for auto-advance`)
              nextQuestion(true)
            }, 800) // Slightly longer delay to ensure bell sound finishes
          } else {
            // For other parts, use shorter delay
            console.log(`🎯 Other part: Recording finished, auto-advancing in 600ms...`)
            console.log(`🎯 Current section type: ${currentSection?.type}`)
            setTimeout(() => {
              console.log(`🚀 About to call nextQuestion(true) for section ${currentSection?.type}`)
              nextQuestion(true)
            }, 600)
          }
        }
        cleanupMedia()
      }
        
        mr.start(100)
        setIsRecording(true)
        // Recording begins after preparation end bell; do not play an extra start sound here
        console.log("Recording started")
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
    // Play bell when user finishes speaking
    console.log("Stopping recording, playing bell sound")
    playSound("end")
  }

  const resetPerQuestionState = () => {
    setTimeLeft(RECORD_SECONDS_PER_QUESTION)
    setRecordingTime(0)
    setIsPaused(false)
    // Clear any existing preparation state
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
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
  }

  const advanceToNextSection = () => {
    if (!testData || !currentSection) return
    if (currentSectionIndex < (testData.sections?.length ?? 0) - 1) {
      console.log(`➡️ Skipping to next section ${currentSectionIndex + 2}`)
      setCurrentSectionIndex((i) => i + 1)
      setCurrentSubPartIndex(0)
      setCurrentQuestionIndex(0)
      setShowSectionDescription(true)
      resetPerQuestionState()
      prepStartedKeyRef.current = null
      autoStartKeyRef.current = null
    } else {
      setIsTestComplete(true)
    }
  }

  const skipSectionWithConfirm = () => {
    setShowSkipConfirm(true)
  }

  const confirmSkipSection = () => {
    setShowSkipConfirm(false)
    stopAllAudio()
    setIsPlayingInstructions(false)
    if (introCountdownRef.current) {
      clearInterval(introCountdownRef.current)
      introCountdownRef.current = null
    }
    setIntroCountdown(null)
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    setIsPrepRunning(false)

    if (isRecording) {
      // Preserve partial audio, then move to next section as soon as onstop persists it.
      skipToNextSectionRef.current = true
      stopRecording()
      return
    }

    if (currentSection?.type === "PART1" && currentSubPartIndex === 0) {
      setCurrentSubPartIndex(1)
      setCurrentQuestionIndex(0)
      setShowSectionDescription(true)
      resetPerQuestionState()
      prepStartedKeyRef.current = null
      autoStartKeyRef.current = null
      return
    }

    skipToNextSectionRef.current = true
    advanceToNextSection()
  }

  const cancelSkipSection = () => {
    setShowSkipConfirm(false)
  }

  const nextQuestion = (force: boolean = false) => {
    console.log(`🔄 nextQuestion called with force: ${force}`)
    console.log(`Current state:`, {
      isPlayingInstructions,
      isRecording,
      isPrepRunning,
      currentQuestionIndex,
      currentSubPartIndex,
      currentSectionType: currentSection?.type
    })
    
    if (!force && audioRef.current && !audioRef.current.paused) {
      console.log('❌ Audio still playing, skipping nextQuestion')
      return
    }
    if (!force && isPlayingInstructions) {
      console.log('❌ Instructions playing, skipping nextQuestion')
      return
    }
    if (!force && isPlayingTTS) {
      console.log('❌ TTS playing, skipping nextQuestion')
      return
    }
    if (!force && isRecording) {
      console.log('❌ Recording in progress, skipping nextQuestion')
      return
    }

    if (force) {
      console.log('🛑 Force mode: stopping all ongoing processes')
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

    if (!testData || !currentSection) {
      console.log('❌ No test data or current section')
      return
    }

    // Only handle subParts for PART1 (Section 1)
    if (currentSection.subParts?.length && currentSection.type === "PART1") {
      const sp = currentSection.subParts[currentSubPartIndex]
      const questions = sp?.questions
      if (questions) {
        // Sort questions by order field to ensure correct sequence
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)
        const qLen = sortedQuestions.length
        // Next question within same subpart
        if (currentQuestionIndex < qLen - 1) {
          const nextIdx = currentQuestionIndex + 1
          console.log(`🎯 Advancing to question ${nextIdx + 1} in PART1.${currentSubPartIndex + 1}`)
          setCurrentQuestionIndex(nextIdx)
          resetPerQuestionState()
          
          // For PART1, let the auto-advance effect handle the preparation
          // This ensures proper state management and prevents conflicts
          if (currentSection.type === "PART1") {
            console.log(`🔄 Question advanced, TTS will play then preparation will start for question ${nextIdx + 1}`)
          }
          return
        }
      }
      // Move to next subpart
      if (currentSubPartIndex < currentSection.subParts.length - 1) {
        const nextSp = currentSubPartIndex + 1
        setCurrentSubPartIndex(nextSp)
        setCurrentQuestionIndex(0)
        resetPerQuestionState()
        // For PART1 subpart transition, show description/instructions (1.2) first; prep will start after audio
        if (currentSection.type === "PART1") {
          setShowSectionDescription(true)
          // clear prep-start guard; it will be set at instruction end
          prepStartedKeyRef.current = null
        }
        return
      }
    } else {
      // For sections without subParts (like PART2 and PART3)
      // These sections have only one "question" (the speaking period)
      // So we should move to the next section immediately
      console.log(`🎯 Section ${currentSection.type} completed, moving to next section`)
    }

      if (currentSectionIndex < (testData.sections?.length ?? 0) - 1) {
        console.log(`🚀 Moving from section ${currentSectionIndex + 1} to section ${currentSectionIndex + 2}`)
        setCurrentSectionIndex((i) => i + 1)
        setCurrentSubPartIndex(0)
        setCurrentQuestionIndex(0)
        setShowSectionDescription(true)
        resetPerQuestionState()
        // clear any prep-start guards for new section
        prepStartedKeyRef.current = null
        autoStartKeyRef.current = null
        console.log(`✅ Section transition completed`)
      } else {
        // test finished: clean up locks & fullscreen
        console.log(`🏁 Test completed, finishing...`)
        setIsTestComplete(true)
      }
  }

  // when test becomes complete, remove navigation lock & auto-submit
  useEffect(() => {
    if (isTestComplete) {
      removeNavigationLock()
      // Don't exit exam mode here - let submitTest handle it based on navigation path
      // auto-submit and navigate to results
      if (!isSubmitting) {
        setIsSubmitting(true)
        submitTest()
      }
    }
  }, [isTestComplete])

  // preparation helper
  const beginPreparation = (seconds: number, after?: () => void) => {
    console.log(`⏱️ beginPreparation called with ${seconds} seconds`)
    
    // Clear any existing preparation timer
    if (prepIntervalRef.current) {
      window.clearInterval(prepIntervalRef.current)
      prepIntervalRef.current = null
    }
    
    // Reset preparation state immediately
    setIsPrepRunning(false)
    setPrepSeconds(0)
    
    // Small delay to ensure state is reset, then start preparation
    setTimeout(() => {
      console.log(`✅ Starting preparation timer: ${seconds} seconds`)
      setPrepSeconds(seconds)
      setIsPrepRunning(true)
      
      // no bell at prep start; bell will play when prep ends
      prepIntervalRef.current = window.setInterval(() => {
        setPrepSeconds((prev) => {
          if (prev <= 1) {
            console.log(`⏰ Preparation time ended`)
            if (prepIntervalRef.current) {
              window.clearInterval(prepIntervalRef.current)
              prepIntervalRef.current = null
            }
            setIsPrepRunning(false)
            // ensure instructions flag is off before auto-start
            setIsPlayingInstructions(false)
            // bell to indicate prep end (start speaking)
            playSound("start")
            after && after()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, 50)
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
    if (!testData) {
      setIsTestComplete(false)
      setIsSubmitting(false)
      toast.error("Test verisi bulunamadi")
      return
    }
    setIsSubmitting(true)

    try {
      const isMeaningfulText = (value: unknown) => {
        if (typeof value !== "string") return false
        const trimmed = value.trim()
        return (
          trimmed.length > 0 &&
          trimmed !== "[Cevap bulunamadı]" &&
          trimmed !== "[Ses metne dönüştürülemedi]"
        )
      }

      const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        let timeoutId: number | null = null
        try {
          return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
              timeoutId = window.setTimeout(() => {
                reject(new Error(`${label} timeout (${ms}ms)`))
              }, ms)
            }),
          ])
        } finally {
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId)
          }
        }
      }

      const ensureTranscriptsReady = async () => {
        const transcriptByQid: Record<string, string> = {}

        // Start from any already transcribed answers
        for (const [qid, v] of Array.from(answers.entries())) {
          if (isMeaningfulText(v?.text)) transcriptByQid[qid] = String(v.text).trim()
        }

        // Fill gaps using in-memory recordings (Blob). This is critical because sessionStorage cannot persist blobs.
        for (const [qid, rec] of Array.from(_recordings.entries())) {
          if (transcriptByQid[qid]) continue
          try {
            const stt = await withTimeout(
              speechToTextService.convertAudioToText(rec.blob),
              15000,
              `speech-to-text ${qid}`
            )
            if (isMeaningfulText(stt.text)) {
              transcriptByQid[qid] = String(stt.text).trim()
              setAnswers((prev) => new Map(prev).set(qid, { text: transcriptByQid[qid], duration: rec.duration }))
            }
          } catch (e) {
            console.error("ensureTranscriptsReady speech-to-text failed:", e)
          }
        }

        return transcriptByQid
      }

      const transcriptByQid = await ensureTranscriptsReady()
      if (Object.keys(transcriptByQid).length === 0) {
        // Allow empty submission; backend will score as 0 and return a result page.
        toast.message("Konuşma testi boş gönderildi (0 puan).")
      }

      const answersEntries = Array.from(answers.entries())
      console.log("📝 Submitting test with answers:", answersEntries.map(([qid, v]) => ({ qid, text: v.text?.substring(0, 50) })))

      // Persist detailed answers (with duration) for potential overall submission
      const answersObj = Object.fromEntries(
        answersEntries.map(([qid, v]) => {
          // Preserve the text as-is, don't overwrite with placeholder if it exists
          const text = v.text || "[Cevap bulunamadı]"
          return [qid, { text, duration: v.duration }]
        })
      )

      // Keep a simple questionId -> transcript map for direct submission
      // Persist transcripts (not placeholders) for reliable submit-all flow.
      const answerTextRecord = transcriptByQid
      const fallbackAnswers: Array<{ questionId: string; questionText: string; userAnswer: string }> = []
      for (const section of testData.sections || []) {
        if (Array.isArray(section.subParts) && section.subParts.length > 0) {
          for (const subPart of section.subParts) {
            for (const question of subPart.questions || []) {
              fallbackAnswers.push({
                questionId: question.id,
                questionText: question.questionText || "Soru metni mevcut değil",
                userAnswer: answerTextRecord[question.id] || "",
              })
            }
          }
        } else {
          for (const question of section.questions || []) {
            fallbackAnswers.push({
              questionId: question.id,
              questionText: question.questionText || "Soru metni mevcut değil",
              userAnswer: answerTextRecord[question.id] || "",
            })
          }
        }
      }
      const fallbackSummary = {
        testId: testData.id,
        submittedAt: new Date().toISOString(),
        score: 0,
        aiFeedback:
          Object.keys(transcriptByQid).length === 0
            ? "Herhangi bir konuşma yanıtı tespit edilmedi. Boş gönderim 0 puan olarak değerlendirildi."
            : "Sonuç kimliği üretilemedi. Yanıtlarınız kaydedildi; bu geçici geri bildirim ekranıdır.",
        answers: fallbackAnswers,
      }

      const answersData = {
        testId: testData.id,
        answers: answersObj,
        transcripts: answerTextRecord,
        sections: testData.sections,
        timestamp: new Date().toISOString()
      }

      console.log("💾 Saving to sessionStorage:", {
        testId: testData.id,
        answerCount: Object.keys(answersObj).length,
        answerKeys: Object.keys(answersObj)
      })
      sessionStorage.setItem(`speaking_answers_${testData.id}`, JSON.stringify(answersData))

      const wasOverallFlowActive = overallTestFlowStore.hasActive()
      const nextPath = overallTestFlowStore.onTestCompleted("SPEAKING", testData.id)

      if (nextPath) {
        if (typeof document !== "undefined") {
          document.body.classList.add("exam-mode")
          const enterFullscreen = async () => {
            try {
              const el: any = document.documentElement as any
              if (el.requestFullscreen) await el.requestFullscreen()
              else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
              else if (el.msRequestFullscreen) await el.msRequestFullscreen()
            } catch {}
          }
          await enterFullscreen()
        }
        navigate(nextPath)
        return
      }

      const overallId = overallTestFlowStore.getOverallId()
      if (overallId && overallTestFlowStore.isAllDone()) {
        const submitAllOk = await submitAllTests(overallId)
        if (!submitAllOk) {
          navigate(`/speaking-test/results/temp`, {
            state: {
              summary: {
                ...fallbackSummary,
                aiFeedback:
                  "Bazi bolumler simdilik gonderilemedi. Cevaplariniz yerel olarak saklandi; daha sonra tekrar denenebilir.",
              },
            },
          })
        }
        return
      }

      if (!wasOverallFlowActive) {
        const formattedSubmission = speakingSubmissionService.formatSubmissionData(testData, answerTextRecord)
        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          navigate(`/speaking-test/results/temp`, {
            state: {
              summary: {
                ...fallbackSummary,
                aiFeedback:
                  "Gonderim verisi dogrulanamadi. Cevaplariniz kaydedildi; bu gecici sonuc ekranidir.",
              },
            },
          })
          return
        }

        let submissionResult = await speakingSubmissionService.submitSpeakingTest(formattedSubmission)
        if (!submissionResult.success) {
          // One silent retry to absorb transient auth/network races.
          await wait(1000)
          const retried = await speakingSubmissionService.submitSpeakingTest(formattedSubmission)
          if (retried.success) {
            submissionResult = retried
          }
        }

        if (!submissionResult.success) {
          const submitError = String(submissionResult.error || "").trim()
          navigate(`/speaking-test/results/temp`, {
            state: {
              summary: {
                ...fallbackSummary,
                aiFeedback: submitError
                  ? buildSubmitRetryMessage(
                      `Gonderim sirasinda hata alindi: ${submitError}. Yanitlariniz yerel olarak kaydedildi`,
                      "Gonderim sirasinda hata alindi"
                    )
                  : fallbackSummary.aiFeedback,
              },
            },
          })
          return
        }

        if (submissionResult.submissionId) {
          navigate(`/speaking-test/results/${submissionResult.submissionId}`)
        } else {
          navigate(`/speaking-test/results/temp`, { state: { summary: fallbackSummary } })
        }
        return
      }

      navigate(`/speaking-test/results/temp`, { state: { summary: fallbackSummary } })
    } catch (e) {
      console.error("speaking navigation error", e)
      const emergencyAnswers = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId,
        questionText: "Soru metni mevcut degil",
        userAnswer: typeof answer?.text === "string" ? answer.text : "",
      }))
      const emergencySummary = {
        testId: testData.id,
        submittedAt: new Date().toISOString(),
        score: 0,
        aiFeedback: buildSubmitRetryMessage(e, "Test gecisinde hata olustu"),
        answers: emergencyAnswers,
      }

      try {
        navigate(`/speaking-test/results/temp`, { state: { summary: emergencySummary } })
        return
      } catch (navError) {
        console.error("speaking emergency navigation failed", navError)
      }

      setIsTestComplete(false)
      toast.error(buildSubmitRetryMessage(e, "Test gecisinde hata olustu"))
    } finally {
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
          console.log("Submitting reading test:", readingData.testId, "with answers:", readingData.answers);
          const payload = normalizeChoiceAnswers(readingData.answers);
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          if (!overallToken) {
            console.warn(
              "Reading submit-all without overall token; falling back to standard auth:",
              readingData.testId
            );
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
          console.log("Submitting listening test:", listeningData.testId, "with answers:", listeningData.answers, "audioUrl:", listeningData.audioUrl, "imageUrls:", listeningData.imageUrls);
          const payload = normalizeChoiceAnswers(listeningData.answers);
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          if (!overallToken) {
            console.warn(
              "Listening submit-all without overall token; falling back to standard auth:",
              listeningData.testId
            );
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
          console.log("Submitting writing test:", writingData.testId, "with answers:", writingData.answers);
          const overallToken = overallTestTokenStore.getByTestId(writingData.testId);
          if (!overallToken) {
            console.warn(
              "Writing submit-all without overall token; falling back to standard auth:",
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
          _recordings.size > 0
        ) {
          for (const [qid, rec] of _recordings.entries()) {
            try {
              const stt = await speechToTextService.convertAudioToText(rec.blob);
              const rawText = stt.text ?? "";
              if (isMeaningfulText(rawText)) {
                answerTextRecord[qid] = String(rawText).trim();
              }
            } catch (e) {
              console.error("Speech-to-text retry failed for submit-all:", e);
            }
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (!overallToken) {
          console.warn(
            "Speaking submit-all without overall token; falling back to standard auth:",
            speakingData.testId
          );
        } else {
          formattedSubmission.sessionToken = overallToken;
        }

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          console.warn("Skipping speaking submit-all; formatted submission is invalid.");
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
            console.warn(
              "Skipping speaking submit-all due token issue:",
              submissionResult.error
            );
            failedSubmissions.push(`Konusma (${speakingData.testId})`);
            continue;
          }
          console.error("Speaking submit-all failed:", submissionResult.error);
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
            `Gonderim tekrar deneniyor (${failedSubmissions.join(", ")}). Cevaplariniz saklandi.`
          );
          await wait(1400);
          return await submitAllTests(overallId);
        }

        toast.error(
          `Bazi bolumler gecici olarak kaydedilemedi: ${failedSubmissions.join(", ")}. ` +
            "Cevaplariniz saklandi."
        );
        if (successfulSubmissions.length > 0) {
          toast.message(`Kaydedilen bolumler: ${successfulSubmissions.join(", ")}`);
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
      
      // Exit fullscreen and go to results
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      navigate(`/overall-results/${overallId}`);
      return true;
    } catch (error) {
      console.error("Error submitting all tests:", error);
      submitAllRetryRef.current = 0;
      toast.error(buildSubmitRetryMessage(error, "Testler gonderilirken hata olustu"));
      return false;
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
        className="min-h-screen overflow-hidden"
        initial="initial"
        animate="animate"
      >
        {!micChecked ? (
      <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
    ) : (
      <>
        {introCountdown !== null ? (
          <div className="fixed inset-0 z-[9998] bg-white flex flex-col items-center justify-center text-center px-4">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              {(() => {
                const radius = 60;
                const circumference = 2 * Math.PI * radius;
                const progress =
                  introCountdown === null
                    ? 0
                    : (introCountdown / INTRO_COUNTDOWN_SECONDS);
                const offset = circumference * (1 - progress);
                return (
                  <svg className="w-full h-full" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      stroke="#fee2e2"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      stroke="#ef4444"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${offset}`}
                      transform="rotate(-90 70 70)"
                    />
                  </svg>
                );
              })()}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-5xl sm:text-6xl font-bold text-red-600">
                  {introCountdown}
                </div>
              </div>
            </div>
            <div className="mt-6 text-base sm:text-lg text-gray-600">
              {"... saniye sonra ba\u015Flayacak."}
            </div>
            <div className="text-base sm:text-lg font-semibold text-gray-800">
              {"Haz\u0131rlan\u0131n!"}
            </div>
            {/* Intro countdown: no skip button */}
          </div>
        ) : (
          <>
        {!isExamMode && !isPlayingInstructions && (
          <motion.header
            className="sticky top-0 z-10 bg-white/80  border-b border-gray-100 shadow-sm"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
          </motion.header>
        )}
          <SimpleTextDisplay
            text={(() => {
              const instruction = shouldShowInstruction(currentSectionIndex, currentSubPartIndex)
              // If instruction audio is playing, show its text
              if (isPlayingInstructions && instruction) return instruction.instructionText
              // For PART1 subpart 2, always show 1.2 text
              if (currentSection.type === "PART1" && currentSubPartIndex === 1) {
                const p12 = getInstructionForSection(currentSection.order, 2)
                if (p12) return p12.instructionText
              }
              // Fallback to generic description
              return getSectionDescription(currentSection.title, currentSubPartIndex)
            })()}
            isPlaying={isPlayingInstructions}
          />
          <div className="mt-6 flex justify-center">
            <button
              onClick={skipInstructionAndProceed}
              className="px-6 py-3 text-sm sm:text-base bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all duration-200"
            >
              Geç
            </button>
          </div>
          </>
        )}
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
      className="min-h-screen relative overflow-hidden flex flex-col"
      initial="initial"
      animate="animate"
    >
      {/* <DisableKeys /> */}
      
      {/* Header with section indicators - Same height and logic as main navbar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
        {/* Match horizontal padding with description block below */}
        <div className="px-2 sm:px-4">
          <div className="relative flex flex-wrap justify-between items-center min-h-[4.5rem] sm:min-h-[6rem] gap-2">
            {/* Logo on left */}
            <div className="flex items-center flex-shrink-0">
              <img 
                src="/logo11.svg" 
                alt="TURKISHMOCK" 
                className="h-9 sm:h-10 md:h-12 w-auto object-contain"
                onError={(e) => {
                  console.error("Logo failed to load");
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Progress indicators on right - circular tabs with connectors */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center flex-wrap justify-center gap-1 sm:gap-2 min-w-0">
              {/* Section 1.1 */}
              <div className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm md:text-base transition-all shadow-md ${
                  currentSectionIndex === 0 && currentSubPartIndex === 0
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  1.1
                </div>
                <div className={`w-4 sm:w-6 md:w-8 h-0.5 ${
                  (currentSectionIndex > 0 || (currentSectionIndex === 0 && currentSubPartIndex > 0))
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}></div>
              </div>
              
              {/* Section 1.2 */}
              <div className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm md:text-base transition-all shadow-md ${
                  currentSectionIndex === 0 && currentSubPartIndex === 1
                    ? "bg-red-500 text-white"
                    : (currentSectionIndex > 0 || (currentSectionIndex === 0 && currentSubPartIndex > 1))
                    ? "bg-gray-100 text-gray-600"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  1.2
                </div>
                <div className={`w-4 sm:w-6 md:w-8 h-0.5 ${
                  currentSectionIndex > 0
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}></div>
              </div>
              
              {/* Section 2 */}
              <div className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm md:text-base transition-all shadow-md ${
                  currentSectionIndex === 1
                    ? "bg-red-500 text-white"
                    : currentSectionIndex > 1
                    ? "bg-gray-100 text-gray-600"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  2
                </div>
                <div className={`w-4 sm:w-6 md:w-8 h-0.5 ${
                  currentSectionIndex > 1
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}></div>
              </div>
              
              {/* Section 3 */}
              <div className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm md:text-base transition-all shadow-md ${
                  currentSectionIndex === 2
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  3
                </div>
              </div>
            </div>

            {/* Mobile: show only current section */}
            <div className="flex sm:hidden items-center justify-center flex-1">
              <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                {currentSectionIndex === 0
                  ? (currentSubPartIndex === 0 ? "Bölüm 1.1" : "Bölüm 1.2")
                  : currentSectionIndex === 1
                  ? "Bölüm 2"
                  : "Bölüm 3"}
              </div>
            </div>

            <div className="flex items-center flex-shrink-0">
              <button
                onClick={skipSectionWithConfirm}
                className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Bölümü Geç
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSkipConfirm && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Bölümü Geç</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Bu bölümü geçmek istediğinize emin misiniz?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={cancelSkipSection}
                className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmSkipSection}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                Geç
              </button>
            </div>
          </div>
        </div>
      )}
      {introCountdown !== null && (
        <div className="fixed inset-0 z-[9998] bg-white flex items-center justify-center">
          <div className="text-5xl sm:text-6xl font-bold text-gray-900">
            {introCountdown}
          </div>
        </div>
      )}
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
     <main className="flex flex-1 flex-col items-center justify-start sm:justify-center min-h-0 w-full px-2 sm:px-4 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-28 sm:pb-20 safe-area-bottom overflow-y-auto overscroll-contain max-h-[calc(100dvh-5rem)] sm:max-h-none">
       <AnimatePresence mode="wait">
         <motion.div
           key={`${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`}
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 20 }}
           className="mb-12 sm:mb-16"
         >
          {currentSection?.type !== "PART2" && currentSection?.type !== "PART3" && !isPlayingInstructions && (
             <div className="text-center px-2">
               <div className="text-black font-bold text-xl sm:text-2xl md:text-3xl">
                 Soru {currentQuestionIndex + 1}
               </div>
             </div>
           )}
         </motion.div>
       </AnimatePresence>

        {!isPlayingInstructions && currentSection?.type !== "PART2" && currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
          <motion.div 
            className="mb-4 sm:mb-6 md:mb-8 w-full px-2 sm:px-4" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
          >
            {(() => {
              const imgs = currentSection.subParts[currentSubPartIndex].images
              if (imgs.length === 1) {
                return (
                  <div className="w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto aspect-[4/3] bg-transparent rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center shadow-sm border border-gray-200">
                    <motion.img
                      src={imgs[0]}
                      alt="Soru görseli"
                      className="w-full h-full object-contain p-2 sm:p-3"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
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
                  <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    {imgs.slice(0, 2).map((src, idx) => (
                      <div key={`pimg-${idx}`} className="aspect-[4/3] bg-transparent rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center shadow-sm border border-gray-200">
                        <motion.img
                          src={src}
                          alt={`Soru görseli ${idx + 1}`}
                          className="w-full h-full object-contain p-2 sm:p-3"
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.3 }}
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
              className="mb-8 sm:mb-12 md:mb-16 lg:mb-20 px-2 sm:px-4"
            >
          {currentSection?.type === "PART2" ? (
            (() => {
              const imgs = currentSection?.subParts?.[currentSubPartIndex]?.images || []
              const questions = (currentSection?.subParts?.[currentSubPartIndex]?.questions || currentSection?.questions || [])
              if (imgs.length > 0) {
                return (
                  <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-5 sm:gap-7 md:gap-10 items-center">
                    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm p-2 sm:p-3 flex items-center justify-center md:justify-start">
                      <img
                        src={imgs[0]}
                        alt="Soru görseli"
                        className="w-full h-full object-contain max-h-[380px] md:max-h-[420px]"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement
                          el.src = "https://placehold.co/800x600?text=Gorsel+Yuklenemedi"
                        }}
                      />
                    </div>
                    <div className="px-2 sm:px-0 self-center">
                      <ul className="list-disc list-inside space-y-2 sm:space-y-3 text-black">
                        {questions.map((q) => (
                          <li key={q.id} className="text-base sm:text-lg md:text-xl leading-relaxed break-words">
                            {q.questionText}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              }
              return (
                <div className="max-w-3xl mx-auto bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl">
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 text-black">
                    {questions.map((q) => (
                      <li key={q.id} className="text-base sm:text-lg md:text-xl leading-relaxed break-words">
                        {q.questionText}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()
          ) : currentSection?.type === "PART3" ? (
            <div className="w-full max-w-5xl mx-auto bg-white p-0 rounded-lg sm:rounded-xl overflow-hidden border border-gray-300 shadow-sm mb-4 sm:mb-6">
              {(() => {
                const sp = currentSection?.subParts?.[currentSubPartIndex]
                const questions = sp?.questions ? [...sp.questions].sort((a, b) => a.order - b.order) : []
                const text = questions?.[0]?.questionText || currentSection?.description || ""
                return text ? (
                  <div className="border-b border-gray-300 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 text-center whitespace-pre-line leading-relaxed break-words">
                      {text}
                    </h3>
                  </div>
                ) : null
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-3 sm:p-4 md:p-5 lg:p-6 md:border-r border-gray-300 border-b md:border-b-0">
                  <h4 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold mb-2 sm:mb-3 text-gray-900">Lehine</h4>
                  <ul className="list-disc list-inside space-y-2 sm:space-y-2.5 md:space-y-3 text-gray-800 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
                    {(currentSection as any)?.points?.filter((p: any) => p.type === 'ADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                      <li key={`adv-${idx}`} className="pl-1 break-words">{ex.text}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                  <h4 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold mb-2 sm:mb-3 text-gray-900">Aleyhine</h4>
                  <ul className="list-disc list-inside space-y-2 sm:space-y-2.5 md:space-y-3 text-gray-800 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
                    {(currentSection as any)?.points?.filter((p: any) => p.type === 'DISADVANTAGE')?.flatMap((p: any) => p.example || []).sort((a: any, b: any) => (a.order||0)-(b.order||0)).map((ex: any, idx: number) => (
                      <li key={`dis-${idx}`} className="pl-1 break-words">{ex.text}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
              ) : (
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium text-gray-800 text-center leading-relaxed max-w-4xl mx-auto px-2 sm:px-4 break-words">
                  {currentQuestion?.questionText}
                </h2>
              )}
            </motion.div>
          )}
        </AnimatePresence>


        {/* Hide microphone button until TTS finishes and preparation time completes */}
        {!isPlayingInstructions && !isPlayingTTS && !isPrepRunning ? (
          <div className="relative mt-2 sm:mt-4 md:mt-6">
            {isRecording && !isPaused && (
              <>
                <span className="absolute inset-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 -left-2 -top-2 sm:-left-3 sm:-top-3 md:-left-4 md:-top-4 rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDuration: '2.5s' }}></span>
                <span className="absolute inset-0 w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 -left-4 -top-4 sm:-left-6 sm:-top-6 md:-left-8 md:-top-8 rounded-full bg-red-500 opacity-20 animate-ping" style={{ animationDuration: '3s' }}></span>
              </>
            )}
            <motion.div
              className={`speaking-mic-core w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isRecording
                  ? "bg-red-600"
                  : isProcessingSpeechToText
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-red-400 to-red-600"
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <Mic className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
            </motion.div>
          </div>
        ) : (
          /* Show loading state when TTS is playing or preparation is running */
          (isPlayingTTS || isPrepRunning) && !isPlayingInstructions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16 sm:mb-20 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-red-200 border-t-red-600 mb-4"
              />
              <p className="text-lg sm:text-xl font-semibold text-gray-700">
                {isPlayingTTS ? "Soru okunuyor..." : "Hazırlık süresi..."}
              </p>
              {isPrepRunning && (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-2">
                    {formatTime(prepSeconds)}
                  </p>
                </>
              )}
            </motion.div>
          )
        )}

        {/* {(() => {
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
        )} */}

        {isPlayingInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-red-600 font-bold"
          >
            <Volume2 className="w-5 h-5" />
            <span>Talimatlar oynatılıyor...</span>
          </motion.div>
        )}

        {isProcessingSpeechToText && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">İşleniyor...</p>
          </div>
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

        <div className="flex flex-wrap items-center gap-4 mt-8">
          {!isExamMode && (
            <motion.button
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsTestComplete(true)}
              className="px-6 py-3 text-sm bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-bold transition-all duration-200"
            >
              Test Bitir
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


      {/* Timer always at bottom for all sections */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-[900]"
      >
        <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-800 font-mono">
          {isPrepRunning ? formatTime(prepSeconds) : formatTime(timeLeft)}
        </div>
        {isPrepRunning ? (
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 font-mono text-center mt-1 sm:mt-2">
             
          </div>
        ) : (
          isRecording && (
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 font-mono text-center mt-1 sm:mt-2">
            </div>
          )
        )}
      </motion.div>


    </motion.div>
  )
}



