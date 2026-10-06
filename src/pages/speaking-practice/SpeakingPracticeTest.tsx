import { publishCurrentActivity } from '@/utils/access-link-context';
import ContentAccessRecovery from '@/components/subscription/ContentAccessRecovery';
import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import { readAccessOwner, useOwnedAccessContext } from '@/hooks/use-access-link';
import { useQueryClient } from "@tanstack/react-query";
import PracticeAllowance from "@/components/practice/PracticeAllowance";
import { subscriptionStatusQueryKey } from "@/services/subscription.service";
import { useEffect, useMemo, useRef, useState } from "react";
import { SPEAKING_PART_3_PRACTICE_INSTRUCTION } from "@/config/speakingInstructions";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Mic, Pause, Play, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  getPracticeErrorMessage,
  type SpeakingPracticeEvaluation,
  type PracticeSolve,
} from "@/services/practice.types";
import speakingPracticeService from "@/services/speakingPractice.service";
import { ExamAudioController } from "@/utils/examAudio";
import { protectedImageProps } from "@/utils/mediaProtection";
import { normalizeDisplayText } from "@/utils/text";
import { SpeakingPracticeAudioPlayer } from "./SpeakingPracticeAudioPlayer";

type SpeakingQuestion = {
  id: string;
  questionText: string;
  order: number;
  textToSpeechUrl?: string | null;
};

type SpeakingPoint = {
  id: string;
  type: "ADVANTAGE" | "DISADVANTAGE";
  example?: unknown;
};

type SpeakingTask = {
  id: string;
  label: string;
  description?: string | null;
  instructionAudioUrl?: string | null;
  images?: string[];
  questions?: SpeakingQuestion[];
};

type SpeakingSection = {
  id: string;
  title?: string | null;
  description?: string | null;
  type: "PART1" | "PART2" | "PART3";
  order: number;
  points?: SpeakingPoint[];
  subParts?: SpeakingTask[];
};

type SpeakingContent = {
  id: string;
  title: string;
  sections: SpeakingSection[];
};

type RecordedAnswer = {
  blob: Blob;
  url: string;
  durationSeconds: number;
};

const createPracticeRunId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const taskLabel = (code: string) =>
  code.replace("TASK_", "").replace(/_/g, ".");

const recordingDurationFor = (sectionCode: string, questionIndex: number) => {
  if (sectionCode === "TASK_1_2" && questionIndex === 0) return 45;
  if (sectionCode === "TASK_1_1" || sectionCode === "TASK_1_2") return 30;
  return 120;
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const practiceInstructionFor = (sectionCode: string) => {
  if (sectionCode === "TASK_1_1") {
    return "Soruyu okuyun. Hazır olduğunuzda kaydı başlatın ve doğal bir şekilde cevaplayın. Her soru için 30 saniyeniz vardır.";
  }
  if (sectionCode === "TASK_1_2") {
    return "Soruyu okuyun ve iki durumu karşılaştırarak cevaplayın. Kaydı başlattığınızda ilk cevap için 45, diğer cevaplar için 30 saniyeniz vardır.";
  }
  if (sectionCode === "TASK_2") {
    return "Soruların tamamını okuyun. Cevabınızı planladıktan sonra kaydı başlatın ve bütün sorulara tek konuşmada yanıt verin. İki dakikanız vardır.";
  }
  return SPEAKING_PART_3_PRACTICE_INSTRUCTION;
};

const pointText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(pointText).filter(Boolean).join(" ");
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return pointText(record.text ?? record.value ?? record.examples);
};

export default function SpeakingPracticeTest() {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ownedAccess = useOwnedAccessContext({ scope: 'PRACTICE_SPEAKING', targetId: id });
  const [practice, setPractice] = useState<PracticeSolve<SpeakingContent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState<unknown>(null);
  const paidContextRef = useRef<string | undefined>(undefined);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, RecordedAnswer>>({});
  const [evaluation, setEvaluation] = useState<SpeakingPracticeEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [runId, setRunId] = useState(createPracticeRunId);
  const recordingsRef = useRef<Record<string, RecordedAnswer>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRecordingRef = useRef(false);
  const mountedRef = useRef(true);
  const recordingTimingRef = useRef({ startedAt: 0, pausedAt: 0, pausedMs: 0, stoppedAt: 0 });
  const examAudioRef = useRef<ExamAudioController | null>(null);

  const getExamAudio = () => {
    if (!examAudioRef.current) examAudioRef.current = new ExamAudioController();
    return examAudioRef.current;
  };

  const playRecordingCue = async (type: "start" | "end") => {
    try {
      await getExamAudio().playCue(type);
    } catch {
      // A blocked cue must never prevent the learner from recording.
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    document.body.classList.add("exam-mode");
    return () => {
      mountedRef.current = false;
      document.body.classList.remove("exam-mode");
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    speakingPracticeService
      .solve<SpeakingContent>(id, { accessContextId: ownedAccess.accessContextId })
      .then((value) => mounted && setPractice(value))
      .catch((reason) => mounted && setError(getPracticeErrorMessage(reason, "Konuşma pratiği yüklenemedi.")))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      void examAudioRef.current?.destroy();
    };
  }, [id, ownedAccess.accessContextId]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(
    () => () =>
      Object.values(recordingsRef.current).forEach((url) =>
        URL.revokeObjectURL(url.url),
      ),
    [],
  );

  const section = practice?.content.sections?.[0] ?? null;
  const task = section?.subParts?.[0] ?? null;
  const taskImages = (task?.images ?? []).filter(Boolean);
  const questions = useMemo(
    () => [...(task?.questions ?? [])].sort((a, b) => a.order - b.order),
    [task],
  );
  const groupedResponse = section?.type === "PART2" || section?.type === "PART3";
  const responseQuestions = groupedResponse ? questions.slice(0, 1) : questions;
  const question = responseQuestions[questionIndex] ?? null;
  const recordingDurationSeconds = recordingDurationFor(
    practice?.sectionCode ?? "TASK_1_1",
    questionIndex,
  );
  const evaluationIsCurrent = evaluation?.version === "2.3.0";
  const legacyEvaluation = Boolean(evaluation && !evaluationIsCurrent);
  const resultLocked = Boolean(evaluation);
  const busy = evaluating || startingRecording;

  const startRecording = async () => {
    if (!question || recording || startingRecordingRef.current || busy || resultLocked) return;
    startingRecordingRef.current = true;
    setStartingRecording(true);
    let stream: MediaStream | undefined;
    try {
      const audioUnlock = getExamAudio().unlockFromUserGesture().catch(() => false);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recordingStream = stream;
      if (!mountedRef.current) {
        recordingStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const timing = { startedAt: 0, pausedAt: 0, pausedMs: 0, stoppedAt: 0 };
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!mountedRef.current) {
          recordingStream.getTracks().forEach((track) => track.stop());
          return;
        }
        const now = timing.stoppedAt || performance.now();
        const pausedMs = timing.pausedMs + (timing.pausedAt ? now - timing.pausedAt : 0);
        const durationSeconds = Math.max(1, (now - timing.startedAt - pausedMs) / 1000);
        const url = URL.createObjectURL(blob);
        setRecordings((current) => {
          const previous = current[recordingKey];
          if (previous) URL.revokeObjectURL(previous.url);
          return { ...current, [recordingKey]: { blob, url, durationSeconds } };
        });
        recordingStream.getTracks().forEach((track) => track.stop());
        void playRecordingCue("end");
      };
      await audioUnlock;
      await playRecordingCue("start");
      if (!mountedRef.current) {
        recordingStream.getTracks().forEach((track) => track.stop());
        return;
      }
      timing.startedAt = performance.now();
      recordingTimingRef.current = timing;
      recorder.start();
      recorderRef.current = recorder;
      setRecordingSecondsLeft(recordingDurationSeconds);
      setPaused(false);
      setRecording(true);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      if (mountedRef.current) toast.error("Mikrofon açılamadı. Tarayıcı mikrofon iznini kontrol edin.");
    } finally {
      startingRecordingRef.current = false;
      if (mountedRef.current) setStartingRecording(false);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recordingTimingRef.current.stoppedAt = performance.now();
    recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
    setPaused(false);
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      recordingTimingRef.current.pausedAt = performance.now();
      setPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      recordingTimingRef.current.pausedMs += performance.now() - recordingTimingRef.current.pausedAt;
      recordingTimingRef.current.pausedAt = 0;
      setPaused(false);
    }
  };

  useEffect(() => {
    if (!recording || paused) return;
    if (recordingSecondsLeft <= 0) {
      stopRecording();
      return;
    }
    const timeout = window.setTimeout(
      () => setRecordingSecondsLeft((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timeout);
  }, [paused, recording, recordingSecondsLeft]);

  const evaluateRecording = async () => {
    if (!id || !task || busy) return;
    if (evaluationIsCurrent) {
      toast.info("Bu çalışma değerlendirildi. Yeniden değerlendirmek için pratiği baştan başlatın.");
      return;
    }
    const orderedKeys = groupedResponse
      ? [task.id]
      : responseQuestions.map((item) => item.id);
    if (orderedKeys.some((key) => !recordings[key])) {
      toast.error("Değerlendirmeden önce bu bölümdeki bütün cevapları kaydedin.");
      return;
    }
    setEvaluating(true);
    try {
      const evaluationAccess = paidContextRef.current ? { accessContextId: paidContextRef.current } : ownedAccess.forRun(runId);
      const activityOwner = readAccessOwner();
      if (activityOwner && (paidContextRef.current || ownedAccess.accessContextId)) publishCurrentActivity(activityOwner, 'SPEAKING', { contentId: id, attemptId: runId, target: { scope: 'PRACTICE_SPEAKING', targetId: id } });
      const result = await speakingPracticeService.evaluate(
        id,
        runId,
        orderedKeys.map((key) => ({ key, blob: recordings[key].blob })),
        evaluationAccess,
      );
      setEvaluation(result);
      toast.success("Konuşmanız değerlendirildi.");
    } catch (reason) {
      setAccessError(reason);
      toast.error(getPracticeErrorMessage(reason, "Konuşmanız değerlendirilemedi. Lütfen yeniden deneyin."));
    } finally {
      setEvaluating(false);
      void queryClient.invalidateQueries({ queryKey: subscriptionStatusQueryKey });
      notifyAccessAllowanceChanged();
    }
  };

  const restartPractice = () => {
    Object.values(recordingsRef.current).forEach((item) => URL.revokeObjectURL(item.url));
    recordingsRef.current = {};
    setRecordings({});
    setEvaluation(null);
    setQuestionIndex(0);
    setRecordingSecondsLeft(0);
    setRunId(createPracticeRunId());
  };

  const confirmExit = () => {
    setShowExit(false);
    if (recording) stopRecording();
    navigate("/app/pratik?bolum=speaking");
  };

  if (!id) return <Navigate to="/app/pratik?bolum=speaking" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center">Yükleniyor…</div>;
  if (!practice || !section || !task || !question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div><p className="text-sm text-[#5f5e5a]">{error || "Bu bölümde konuşma sorusu bulunamadı."}</p><Button variant="outline" className="mt-4" onClick={() => navigate("/app/pratik?bolum=speaking")}>Pratiklere dön</Button></div>
      </div>
    );
  }

  const recordingKey = groupedResponse ? task.id : question.id;
  const currentRecording = recordings[recordingKey];

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-white text-[#242424]">
      <header className="z-50 flex min-h-[60px] shrink-0 items-center justify-between gap-2 border-b border-[#e5e5e2] bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo11.svg" alt="TURKISHMOCK" className="h-10 w-[115px] object-contain sm:w-[150px]" />
          <span className="hidden h-5 w-px bg-[#dededb] sm:block" />
          <span className="hidden truncate text-[17px] font-semibold sm:block">Konuşma</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowExit(true)}
            disabled={startingRecording}
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
            aria-label="Çalışmadan çık"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <Button
            type="button"
            onClick={() => void evaluateRecording()}
            disabled={recording || busy || resultLocked}
            className="h-9 min-h-9 gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {evaluating
              ? "Değerlendiriliyor…"
              : evaluationIsCurrent
                ? "Değerlendirildi"
                : legacyEvaluation
                  ? "Yeni ölçütlerle değerlendir"
                  : "Değerlendir"}
          </Button>
        </div>
      </header>
      <PracticeAllowance target={{ scope: 'PRACTICE_SPEAKING', targetId: id }} />
      <ContentAccessRecovery error={accessError} target={{ scope: 'PRACTICE_SPEAKING', targetId: id }} onClose={() => setAccessError(null)} onPaid={contextId => { paidContextRef.current = contextId; setRunId(createPracticeRunId()); }} />

      <section className="shrink-0 border-b border-[#e5e5e2] px-5 py-3.5">
        <button
          type="button"
          onClick={() => setShowInstructions((value) => !value)}
          aria-expanded={showInstructions}
          aria-controls="speaking-practice-instructions"
          aria-label="Bölüm açıklaması"
          className="flex min-h-9 w-full items-center justify-between gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
        >
          <h1 className="reading-part-heading">Bölüm {taskLabel(practice.sectionCode)}</h1>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#242424] transition-transform ${showInstructions ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <p id="speaking-practice-instructions" hidden={!showInstructions} className="reading-part-description mt-2 pb-1">
          {practiceInstructionFor(practice.sectionCode)}
        </p>
      </section>

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-8">
        <div className="flex w-full max-w-[1480px] flex-1 flex-col items-center justify-center">
          {practice.sectionCode === "TASK_1_2" && taskImages.length > 0 ? (
            <div
              data-testid="speaking-practice-comparison-images"
              className={`mb-5 grid w-full max-w-[960px] items-start gap-4 ${
                taskImages.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
              }`}
              aria-label="Karşılaştırma görselleri"
            >
              {taskImages.slice(0, 2).map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="relative mx-auto aspect-[3/2] w-full min-w-0 max-w-[560px] overflow-hidden rounded-none border border-[#dededb] bg-white"
                >
                  <img
                    {...protectedImageProps}
                    src={src}
                    alt={`Karşılaştırma görseli ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-contain p-1"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {section.type === "PART3" ? (
            <div className="mb-6 w-full max-w-5xl overflow-hidden border border-[#242424] bg-white">
              <div className="border-b border-[#242424] px-5 py-4 text-center text-lg font-semibold">{normalizeDisplayText(question.questionText)}</div>
              <div className="grid md:grid-cols-2">
                {(["ADVANTAGE", "DISADVANTAGE"] as const).map((type, index) => (
                  <div key={type} className={`p-5 ${index === 0 ? "border-b border-[#242424] md:border-b-0 md:border-r" : ""}`}>
                    <h3 className="mb-3 font-semibold">{type === "ADVANTAGE" ? "Lehine" : "Aleyhine"}</h3>
                    <ul className="list-disc space-y-2 pl-5">
                      {(section.points ?? []).filter((point) => point.type === type).map((point) => pointText(point.example)).filter(Boolean).map((text, pointIndex) => <li key={pointIndex}>{normalizeDisplayText(text)}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : section.type === "PART2" ? (
            <div className={taskImages.length > 0
              ? "mb-6 grid w-full max-w-5xl items-center gap-7 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10"
              : "mb-6 w-full max-w-3xl"}>
              {taskImages.length > 0 ? (
                <div
                  data-testid="speaking-practice-part-two-image"
                  className="relative aspect-video w-full overflow-hidden rounded-none border border-[#dededb] bg-white"
                >
                  <img
                    {...protectedImageProps}
                    src={taskImages[0]}
                    alt="Soru görseli"
                    className="absolute inset-0 h-full w-full object-contain p-1"
                  />
                </div>
              ) : null}
              <ul className="list-disc space-y-3 pl-6 text-[17px] leading-7">{questions.map((item) => <li key={item.id}>{normalizeDisplayText(item.questionText)}</li>)}</ul>
            </div>
          ) : (
            <div className="mb-7 w-full max-w-3xl">
              <p className="mb-3 text-center text-sm text-[#787774]">Soru {questionIndex + 1} / {responseQuestions.length}</p>
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 sm:gap-5" aria-label="Soru geçişleri">
                <button
                  type="button"
                  aria-label="Önceki soru"
                  title="Önceki soru"
                  disabled={questionIndex === 0 || recording || busy || resultLocked}
                  onClick={() => setQuestionIndex((value) => Math.max(0, value - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dededb] text-[#37352f] transition-colors hover:bg-[#f1f1ee] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <h2 className="text-center text-[20px] font-normal leading-8">{normalizeDisplayText(question.questionText)}</h2>
                <button
                  type="button"
                  aria-label="Sonraki soru"
                  title="Sonraki soru"
                  disabled={questionIndex === responseQuestions.length - 1 || recording || busy || resultLocked}
                  onClick={() => setQuestionIndex((value) => Math.min(responseQuestions.length - 1, value + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dededb] text-[#37352f] transition-colors hover:bg-[#f1f1ee] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className="flex w-full max-w-xl items-center gap-3 rounded-lg border border-[#dededb] bg-[#fafaf9] px-4 py-4 sm:gap-5 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium" role="status">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${recording && !paused ? "animate-pulse bg-red-600" : "bg-[#a6a59f]"}`} />
                {startingRecording ? "Mikrofon açılıyor…" : recording ? (paused ? "Duraklatıldı" : "Kaydediliyor") : currentRecording ? "Cevap kaydedildi" : "Hazır"}
              </p>
              {!groupedResponse ? <p className="mt-1 text-xs text-[#787774]">{Object.keys(recordings).length} / {responseQuestions.length} cevap kaydedildi</p> : null}
            </div>
            <span
              className={`shrink-0 text-[24px] font-normal tabular-nums tracking-tight ${recordingSecondsLeft <= 10 && recording ? "text-red-700" : "text-[#37352f]"}`}
              aria-label={recording ? "Kalan konuşma süresi" : "Konuşma süresi"}
            >
              {formatDuration(recording ? recordingSecondsLeft : recordingDurationSeconds)}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {!recording ? (
                <button
                  type="button"
                  disabled={resultLocked || busy}
                  onClick={() => void startRecording()}
                  aria-label="Kaydı başlat"
                  title="Kaydı başlat"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  <Mic className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    aria-label={paused ? "Kaydı sürdür" : "Kaydı duraklat"}
                    title={paused ? "Kaydı sürdür" : "Kaydı duraklat"}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dededb] bg-white text-[#37352f] transition-colors hover:bg-[#f1f1ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
                  >
                    {paused ? <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    aria-label="Kaydı bitir"
                    title="Kaydı bitir"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                  >
                    <Square className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
          {currentRecording && !recording && !startingRecording ? (
            <SpeakingPracticeAudioPlayer src={currentRecording.url} durationSeconds={currentRecording.durationSeconds} />
          ) : null}

          {evaluation ? (
            <section className="mt-6 w-full max-w-3xl rounded-lg border border-[#dededb] bg-white px-5 py-5 shadow-sm" aria-label="Konuşma değerlendirmesi">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">CEFR konuşma değerlendirmesi</h2>
                  {legacyEvaluation ? (
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Bu rapor eski kısa değerlendirme biçiminde. Kayıtlarınızı yeni CEFR ölçütleriyle tekrar değerlendirebilirsiniz.
                    </p>
                  ) : null}
                </div>
                {evaluation.estimatedLevel && evaluation.sectionScore !== undefined && evaluation.maximumScore !== undefined ? (
                  <div className="flex shrink-0 gap-2">
                    <span className="rounded-full bg-[#f1f1ef] px-3 py-1.5 text-sm font-semibold text-[#454440]">
                      Yaklaşık {evaluation.estimatedLevel}
                    </span>
                    <span className="rounded-full bg-[#fce8e6] px-3 py-1.5 text-sm font-semibold text-[#a61b1b]">
                      {evaluation.sectionScore.toLocaleString("tr-TR")} / {evaluation.maximumScore}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[15px] leading-6 text-[#454440]">{evaluation.summary}</p>
              {evaluation.scoreRationale ? (
                <div className="mt-4 rounded-md bg-[#f7f7f5] px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">Puanın gerekçesi</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#454440]">{evaluation.scoreRationale}</p>
                </div>
              ) : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">Güçlü yönünüz</h3>
                  <p className="mt-1.5 text-sm leading-6">{evaluation.strongPoint}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">Şimdi buna odaklanın</h3>
                  <p className="mt-1.5 text-sm leading-6">{evaluation.focusPoint}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[#eeeeec] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#787774]">Sonraki deneme</h3>
                <p className="mt-1.5 text-sm leading-6">{evaluation.nextStep}</p>
              </div>
              {evaluation.criteria ? (
                <div className="mt-5 border-t border-[#eeeeec] pt-5">
                  <h3 className="text-sm font-semibold">CEFR ölçütleri</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Görev başarısı", evaluation.criteria.taskAchievement],
                      ["Akıcılık ve tutarlılık", evaluation.criteria.fluencyAndCoherence],
                      ["Kelime kullanımı", evaluation.criteria.vocabulary],
                      ["Dil bilgisi", evaluation.criteria.grammar],
                      ["Telaffuz ve anlaşılırlık", evaluation.criteria.pronunciationAndIntelligibility],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-[#e8e8e5] px-4 py-3 last:sm:col-span-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">{label}</h4>
                        <p className="mt-1.5 text-sm leading-6 text-[#37352f]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {evaluation.answers?.length ? (
                <div className="mt-5 border-t border-[#eeeeec] pt-5">
                  <h3 className="text-sm font-semibold">Cevaplarınız</h3>
                  <div className="mt-3 space-y-4">
                    {evaluation.answers.map((answer, index) => (
                      <article key={`${answer.question}-${index}`} className="rounded-md border border-[#dededb] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="max-w-2xl whitespace-pre-line text-sm font-semibold leading-6">
                            {answer.question}
                          </h4>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${answer.taskStatus === "MET" ? "bg-emerald-50 text-emerald-800" : answer.taskStatus === "PARTLY_MET" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>
                            {answer.taskStatus === "MET" ? "Görev karşılandı" : answer.taskStatus === "PARTLY_MET" ? "Kısmen karşılandı" : "Görev karşılanmadı"}
                          </span>
                        </div>
                        <div className="mt-3 rounded-md bg-[#f7f7f5] px-3.5 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">Duyulan cevabınız</p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-[#454440]">“{answer.heardAnswer}”</p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#37352f]">{answer.feedback}</p>
                        <div className="mt-3 border-t border-[#eeeeec] pt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">
                            {answer.rewriteType === "YOUR_ANSWER" ? "Cevabınızın daha iyi hâli" : "Soruya uygun örnek cevap"}
                          </p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-[#242424]">{answer.improvedAnswer}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {legacyEvaluation ? (
                  <Button onClick={() => void evaluateRecording()} disabled={evaluating} className="bg-red-600 text-white hover:bg-red-700">
                    {evaluating ? "Değerlendiriliyor…" : "Aynı kayıtları yeni ölçütlerle değerlendir"}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={restartPractice}>Pratiği yeniden başlat</Button>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <ConfirmationModal
        isOpen={showExit}
        onClose={() => setShowExit(false)}
        onConfirm={confirmExit}
        title={recording || Object.keys(recordings).length > 0 ? "Testten çıkılsın mı?" : "Çıkmak istiyor musun?"}
        message={
          recording || Object.keys(recordings).length > 0
            ? "Bu çalışmada kaydettiğin konuşmalar silinir. Çıkmak istiyor musun?"
            : "Henüz cevap vermedin. Daha sonra tekrar başlayabilirsin."
        }
        confirmText="Çık"
        cancelText="Kal"
      />
    </div>
  );
}
