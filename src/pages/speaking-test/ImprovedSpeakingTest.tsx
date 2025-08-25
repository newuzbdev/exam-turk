import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Square, ArrowLeft, CheckCircle, Info, Clock, Play, Volume2 } from "lucide-react"
import axiosPrivate from "@/config/api"
import { toast } from "sonner"
import { MicrophoneCheck } from "./components/MicrophoneCheck"
import ResultModal from "./components/ResultModal"
import DisableKeys from "./components/DisableKeys"

interface Question {
  id: string
  questionText: string
  order: number
  subPartId?: string
  sectionId?: string
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
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map())

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const countdownRef = useRef<number | null>(null)
  const elapsedRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startSoundRef = useRef<HTMLAudioElement | null>(null)
  const endSoundRef = useRef<HTMLAudioElement | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [showResult, setShowResult] = useState(false)

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
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V",
    )
    endSoundRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V",
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
  const playSound = (type: "start" | "end") => {
    try {
      const el = type === "start" ? startSoundRef.current : endSoundRef.current
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
  }

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
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
  const startRecording = async () => {
    try {
      if (isPlayingInstructions) {
        toast.error("Talimat bitmeden kayıt başlatılamaz")
        return
      }
      playSound("start")
      setTimeLeft(RECORD_SECONDS_PER_QUESTION)
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
        if (currentQuestion) {
          const duration = await getBlobDuration(blob)
          const rec: Recording = { blob, duration, questionId: currentQuestion.id }
          setRecordings((prev) => new Map(prev).set(currentQuestion.id, rec))
          // smooth auto-next
          setTimeout(() => nextQuestion(), 900)
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

  const resumeRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
      }
    } catch { }
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

  const nextQuestion = () => {
    if (audioRef.current && !audioRef.current.paused) {
      toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz")
      return
    }
    if (isPlayingInstructions) {
      toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz")
      return
    }
    if (isRecording) {
      toast.error("Kayıt devam ederken sonraki soruya geçemezsiniz")
      return
    }

    if (!testData || !currentSection) return

    if (currentSection.subParts?.length) {
      const sp = currentSection.subParts[currentSubPartIndex]
      const qLen = sp?.questions?.length ?? 0
      if (currentQuestionIndex < qLen - 1) {
        setCurrentQuestionIndex((i) => i + 1)
        resetPerQuestionState()
        return
      }
      if (currentSubPartIndex < currentSection.subParts.length - 1) {
        setCurrentSubPartIndex((i) => i + 1)
        setCurrentQuestionIndex(0)
        resetPerQuestionState()
        return
      }
    } else {
      const qLen = currentSection.questions?.length ?? 0
      if (currentQuestionIndex < qLen - 1) {
        setCurrentQuestionIndex((i) => i + 1)
        resetPerQuestionState()
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
    }
  }, [isTestComplete])

  const startSection = () => {
    if (!testData) return
    if (audioRef.current && !audioRef.current.paused) return
    if (isPlayingInstructions) return

    const section = currentSection
    if (!section) return

    // enter exam mode BEFORE starting audio (user gesture)
    setIsExamMode(true)
    addNavigationLock()
    enterFullscreen().catch(() => { })

    setShowSectionDescription(false)
    resetPerQuestionState()

    const src = sectionAudios[section.order]
    if (!src) {
      startRecording()
      return
    }

    const audio = new Audio(src)
    audioRef.current = audio
    setIsPlayingInstructions(true)
    audio.onended = () => {
      setIsPlayingInstructions(false)
      setTimeout(() => !isRecording && startRecording(), 700)
    }
    audio.onerror = () => {
      setIsPlayingInstructions(false)
      toast.error("Audio yüklenemedi")
    }
    audio.play().catch(() => setIsPlayingInstructions(false))
  }

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

      // --- Natijani saqlash va modalni ochish
      setResult(res.data)
      setShowResult(true)

      toast.success("Test başarıyla gönderildi!")
      // after successful submit, release locks & exit fullscreen
      removeNavigationLock()
      exitFullscreen().catch(() => { })
      setIsExamMode(false)
    } catch (e) {
      console.error("submit error", e)
      toast.error("Test gönderilirken hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  // UI helpers
  const Progress = ({ value }: { value: number }) => (
    <div className="w-full h-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-full overflow-hidden shadow-inner">
      <motion.div
        className="h-full bg-gradient-to-r from-red-500 via-red-600 to-rose-600 shadow-sm relative"
        initial={{ width: 0, x: "-100%" }}
        animate={{
          width: `${value}%`,
          x: "0%",
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 25,
          duration: 0.8,
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  )

  const Waveform = ({ active }: { active: boolean }) => (
    <div className="flex items-end justify-center gap-1.5 h-12 px-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-red-600 to-rose-500 shadow-sm"
          initial={{ height: 8, opacity: 0.4, scaleY: 0.5 }}
          animate={
            active
              ? {
                height: [8, 32, 16, 28, 12, 24, 10, 20][i % 8],
                opacity: [0.4, 1, 0.7, 0.9, 0.6, 0.8],
                scaleY: [0.5, 1.2, 0.8, 1.1, 0.7, 1],
              }
              : {
                height: 8,
                opacity: 0.3,
                scaleY: 0.5,
              }
          }
          transition={{
            repeat: active ? Number.POSITIVE_INFINITY : 0,
            duration: 0.6 + i * 0.02,
            delay: i * 0.04,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 flex items-center justify-center"
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-red-600 to-rose-600 rounded-3xl mx-auto mb-6 grid place-items-center shadow-2xl shadow-red-200"
            animate="animate"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Mic className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>
          <motion.p
            className="text-xl font-bold text-gray-800 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Test yükleniyor...
          </motion.p>
          <div className="w-32 h-1 bg-red-100 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-rose-500"
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
        className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 flex items-center justify-center"
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-red-100"
          whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        >
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-red-600 to-rose-600 rounded-2xl mx-auto mb-4 grid place-items-center shadow-lg"
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
            <span className="text-white text-2xl font-bold">!</span>
          </motion.div>
          <motion.p
            className="text-xl font-bold text-gray-800 mb-4"
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
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Geri Dön
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  if (isTestComplete) {
    if (result && showResult) {
      return (
        <motion.div
          className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 flex items-center justify-center p-4"
          initial="initial"
          animate="animate"
        >
          <ResultModal
            isOpen={showResult}
            onClose={() => {
              setShowResult(false), navigate("/test")
            }}
            result={result}
          />
        </motion.div>
      )
    }
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 flex items-center justify-center p-4"
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="max-w-md w-full text-center bg-white/90 backdrop-blur-sm border border-red-100 rounded-3xl p-10 shadow-2xl"
          whileHover={{ y: -5 }}
        >
          <motion.div
            className="w-24 h-24 bg-gradient-to-br from-red-600 to-rose-600 rounded-3xl grid place-items-center mx-auto mb-8 shadow-2xl shadow-red-200"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 1,
            }}
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          <motion.h1
            className="text-3xl font-black text-gray-900 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Test Tamamlandı!
          </motion.h1>
          <motion.p
            className="text-gray-600 mb-8 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {recordings.size} soru cevaplanmıştır.
          </motion.p>
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={submitTest}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-black py-4 px-6 text-lg rounded-xl hover:shadow-xl disabled:opacity-50 shadow-lg transition-all duration-200"
            >
              {isSubmitting ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                >
                  Gönderiliyor...
                </motion.span>
              ) : (
                "Testi Gönder"
              )}
            </motion.button>
            <motion.button
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={() => navigate("/test")}
              className="w-full border-2 border-red-600 text-red-600 font-black py-4 px-6 text-lg rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200"
            >
              Test Sayfasına Dön
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  if (showSectionDescription && currentSection) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100"
        initial="initial"
        animate="animate"
      >
        {!micChecked ? (
          <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
        ) : (
          <>
            {!isExamMode && (
              <motion.header
                className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 shadow-sm"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="max-w-6xl mx-auto px-6 py-5">
                  <div className="flex items-center justify-between">
                    <motion.button
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => navigate("/test")}
                      className="flex items-center text-red-600 hover:text-red-700 font-bold transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      <span className="text-lg">Geri</span>
                    </motion.button>
                    <motion.h1
                      className="text-2xl font-black text-gray-900"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {testData.title}
                    </motion.h1>
                    <motion.div
                      className="text-lg font-bold text-gray-700 bg-red-50 px-4 py-2 rounded-xl"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Bölüm {currentSectionIndex + 1} / {testData.sections.length}
                    </motion.div>
                  </div>
                </div>
              </motion.header>
            )}

            <main className="max-w-5xl mx-auto px-6 py-10">
              <motion.div
                className="bg-white/90 backdrop-blur-sm border border-red-100 rounded-3xl p-10 shadow-2xl"
                whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
              >
                <div className="text-center mb-8">
                  <motion.div
                    className="inline-flex items-center bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-2xl text-lg font-black mb-6 shadow-lg"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Info className="w-6 h-6 mr-3" />
                    {currentSection.title}
                  </motion.div>
                  <motion.h2
                    className="text-4xl font-black text-gray-900 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Bölüm Açıklaması
                  </motion.h2>
                  <motion.p
                    className="text-xl text-gray-700 leading-relaxed whitespace-pre-line max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {currentSection.description}
                  </motion.p>
                </div>
                <motion.div
                  className="mt-10 text-center"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={startSection}
                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-black py-5 px-10 text-xl rounded-2xl hover:shadow-2xl shadow-xl transition-all duration-300 relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 3,
                        ease: "easeInOut",
                      }}
                    />
                    Bölümü Başlat
                  </motion.button>
                </motion.div>
              </motion.div>
            </main>
          </>
        )}
      </motion.div>
    )
  }

  if (!currentQuestion) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 grid place-items-center"
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="text-center space-y-6 bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-red-100"
          whileHover={{ y: -5 }}
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-red-600 to-rose-600 rounded-3xl mx-auto grid place-items-center shadow-xl"
            animate={{
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 2,
            }}
          >
            <span className="text-white text-3xl font-bold">!</span>
          </motion.div>
          <motion.h2
            className="text-2xl font-black text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Soru Bulunamadı
          </motion.h2>
          <motion.p
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Bölüm {currentSectionIndex + 1}, Alt Bölüm {currentSubPartIndex + 1}, Soru {currentQuestionIndex + 1}
          </motion.p>
          <motion.button
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={nextQuestion}
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Sonraki Soruya Geç
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  const totalQuestionsInSection = currentSection?.subParts?.length
    ? (currentSection.subParts[currentSubPartIndex]?.questions?.length ?? 0)
    : (currentSection?.questions?.length ?? 0)
  const progressPercent = (currentQuestionIndex / Math.max(1, totalQuestionsInSection)) * 100

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100"
      initial="initial"
      animate="animate"
    >
      <DisableKeys />
      {!isExamMode && (
        <motion.header
          className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 shadow-sm"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <motion.button
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate("/test")}
                className="flex items-center text-red-600 hover:text-red-700 font-bold transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-lg">Geri</span>
              </motion.button>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl font-black text-gray-900">{testData.title}</h1>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <motion.div
                    className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full text-sm font-bold shadow-md"
                    whileHover={{ scale: 1.05 }}
                  >
                    {currentSection?.title}
                  </motion.div>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600 font-semibold">Soru {currentQuestionIndex + 1}</span>
                </div>
              </motion.div>
              <motion.div
                className="text-lg font-bold text-gray-700 bg-red-50 px-4 py-2 rounded-xl"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Bölüm {currentSectionIndex + 1} / {testData.sections.length}
              </motion.div>
            </div>
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Progress value={progressPercent} />
            </motion.div>
          </div>
        </motion.header>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white/90 backdrop-blur-sm border border-red-100 rounded-3xl p-10 shadow-2xl"
          >
            {currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.img
                  src={currentSection.subParts[currentSubPartIndex].images[0] || "/placeholder.svg"}
                  alt="Test görseli"
                  className="max-w-lg mx-auto rounded-2xl shadow-xl border border-red-100"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ) : null}

            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.h2
                className="text-4xl font-black text-gray-900 leading-relaxed max-w-4xl mx-auto"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {currentQuestion.questionText}
              </motion.h2>
            </motion.div>

            <motion.div
              className="mt-10 flex flex-col items-center gap-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="bg-gradient-to-r from-red-50 to-rose-50 rounded-3xl p-6 shadow-inner"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Waveform active={isRecording && !isPaused} />
              </motion.div>

              <div className="flex items-center justify-center gap-4 w-full">
                {!isRecording ? (
                  <motion.button
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={startRecording}
                    disabled={isPlayingInstructions}
                    className="flex items-center justify-center w-[88%] gap-3 bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-2xl text-xl font-black hover:shadow-2xl disabled:opacity-50 shadow-xl transition-all duration-300 relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 4,
                        ease: "easeInOut",
                      }}
                    />
                    <Mic className="w-6 h-6" /> Kaydı Başlat
                  </motion.button>
                ) : (
                  <motion.div
                    className="flex items-center justify-center gap-4 w-full"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {isPaused && (
                      <motion.button
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={resumeRecording}
                        className="flex items-center gap-2 bg-white border-2 border-green-600 text-green-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-50 transition-all duration-200"
                      >
                        <Play className="w-5 h-5" /> Devam Et
                      </motion.button>
                    )}
                    <motion.button
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={stopRecording}
                      className="flex items-center justify-center w-[88%] gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all duration-200"
                    >
                      <Square className="w-5 h-5" /> Bitir
                    </motion.button>
                  </motion.div>
                )}
              </div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, staggerChildren: 0.1 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-red-600 to-rose-600 text-white rounded-2xl p-6 text-center shadow-xl"
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Clock className="w-8 h-8 mx-auto mb-3" />
                  <div className="text-sm font-bold tracking-wide opacity-90">Kalan Süre</div>
                  <motion.div
                    className="text-3xl font-black"
                    animate={
                      timeLeft <= 10
                        ? {
                          scale: [1, 1.1, 1],
                          color: ["#ffffff", "#fef2f2", "#ffffff"],
                        }
                        : {}
                    }
                    transition={{ duration: 1, repeat: timeLeft <= 10 ? Number.POSITIVE_INFINITY : 0 }}
                  >
                    {formatTime(timeLeft)}
                  </motion.div>
                </motion.div>

                <motion.div
                  className="bg-white border-2 border-red-200 rounded-2xl p-6 text-center shadow-lg"
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <motion.div
                    className="w-8 h-8 mx-auto mb-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-full"
                    animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: isRecording ? Number.POSITIVE_INFINITY : 0 }}
                  />
                  <div className="text-sm font-bold text-gray-700">Kayıt Süresi</div>
                  <div className="text-3xl font-black text-red-600">{formatTime(recordingTime)}</div>
                </motion.div>

                <motion.div
                  className="bg-white border-2 border-red-200 rounded-2xl p-6 text-center shadow-lg"
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <div className="w-8 h-8 mx-auto mb-3">
                    {isRecording ? (
                      <motion.div
                        className="w-8 h-8 bg-gradient-to-br from-red-600 to-rose-600 rounded-full shadow-lg"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [1, 0.7, 1],
                        }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                      />
                    ) : recordings.has(currentQuestion.id) ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </motion.div>
                    ) : (
                      <div className="w-8 h-8 border-3 border-red-600 rounded-full" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-700">Durum</div>
                  <motion.div
                    className="text-lg font-black"
                    key={
                      isPlayingInstructions
                        ? "instruction"
                        : isRecording
                          ? "recording"
                          : recordings.has(currentQuestion.id)
                            ? "done"
                            : "ready"
                    }
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {isPlayingInstructions ? (
                      <span className="text-blue-600">TALİMAT</span>
                    ) : isRecording ? (
                      <span className="text-red-600">KAYIT</span>
                    ) : recordings.has(currentQuestion.id) ? (
                      <span className="text-green-600">TAMAM</span>
                    ) : (
                      <span className="text-gray-700">HAZIR</span>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>

              {isPlayingInstructions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="text-center bg-blue-50 rounded-2xl p-6 border border-blue-200 w-[88%]"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <Volume2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  </motion.div>
                  <motion.p
                    className="text-blue-800 font-bold text-lg"
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    Talimat dinleniyor...
                  </motion.p>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              className="mt-10 flex justify-between items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
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

              <div className="text-center">
                {recordings.has(currentQuestion.id) && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg"
                  >
                    <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}>
                      ✓ Cevaplandı
                    </motion.span>
                  </motion.div>
                )}
              </div>

              <motion.button
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={nextQuestion}
                disabled={isRecording || isPlayingInstructions}
                className={`px-8 py-4 text-lg font-black rounded-2xl shadow-lg transition-all duration-200 relative overflow-hidden ${isRecording || isPlayingInstructions
                  ? "bg-red-600 text-white opacity-50 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-2xl"
                  }`}
              >
                {!(isRecording || isPlayingInstructions) && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 3,
                      ease: "easeInOut",
                    }}
                  />
                )}
                Sonraki →
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}
