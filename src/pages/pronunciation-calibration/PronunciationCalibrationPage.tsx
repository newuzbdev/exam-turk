import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FlaskConical, RefreshCw } from "lucide-react";
import { Navigate } from "react-router";

import { tm } from "@/components/tm";
import { pronunciationCalibrationService } from "@/services/pronunciationCalibration.service";
import { AudioQualityComparison } from "./AudioQualityComparison";
import {
  PronunciationCalibrationStep,
  type CalibrationPrompt,
  type CalibrationSlotState,
  type CalibrationVariant,
} from "./PronunciationCalibrationStep";

type CalibrationSession = {
  sessionId: string;
  prompts: CalibrationPrompt[];
};

type SlotMap = Record<string, CalibrationSlotState>;

const EMPTY_SLOT: CalibrationSlotState = {
  status: "idle",
  audioUrl: null,
  durationSeconds: 0,
  error: null,
};

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

const slotKey = (promptId: string, variant: CalibrationVariant) =>
  `${promptId}:${variant}`;

const readErrorMessage = (error: unknown) => {
  const candidate = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const message = candidate?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (message) return String(message);
  return "Kayıt yerel klasöre kaydedilemedi. Lütfen tekrar deneyin.";
};

export default function PronunciationCalibrationPage() {
  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [slots, setSlots] = useState<SlotMap>({});
  const [activeVariant, setActiveVariant] =
    useState<CalibrationVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  const clearRecordingTimers = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const updateSlot = useCallback(
    (
      promptId: string,
      variant: CalibrationVariant,
      update: Partial<CalibrationSlotState>,
    ) => {
      const key = slotKey(promptId, variant);
      setSlots((current) => ({
        ...current,
        [key]: { ...(current[key] || EMPTY_SLOT), ...update },
      }));
    },
    [],
  );

  const prepareSession = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    setIsLoading(true);
    setPageError(null);
    try {
      const created = await pronunciationCalibrationService.createSession();
      setSession(created);
      setCurrentStep(0);
      setSlots({});
      setIsCompleted(false);
    } catch (error) {
      setPageError(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void prepareSession();
  }, [prepareSession]);

  useEffect(
    () => () => {
      clearRecordingTimers();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopMediaStream();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    [clearRecordingTimers, stopMediaStream],
  );

  const stopRecording = useCallback(() => {
    clearRecordingTimers();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [clearRecordingTimers]);

  const startRecording = useCallback(
    async (variant: CalibrationVariant) => {
      const prompt = session?.prompts[currentStep];
      if (!session || !prompt || activeVariant) return;

      const currentKey = slotKey(prompt.id, variant);
      const previousUrl = slots[currentKey]?.audioUrl;
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
        objectUrlsRef.current.delete(previousUrl);
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
          throw new Error("unsupported microphone");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        mediaStreamRef.current = stream;
        chunksRef.current = [];
        const mimeType = preferredMimeTypes.find((candidate) =>
          MediaRecorder.isTypeSupported(candidate),
        );
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onerror = () => {
          clearRecordingTimers();
          stopMediaStream();
          setActiveVariant(null);
          updateSlot(prompt.id, variant, {
            status: "error",
            error: "Mikrofon kaydı sırasında bir hata oluştu.",
          });
        };
        recorder.onstop = async () => {
          clearRecordingTimers();
          stopMediaStream();
          setActiveVariant(null);
          const resolvedMimeType =
            recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
          const audioBlob = new Blob(chunksRef.current, {
            type: resolvedMimeType,
          });
          if (audioBlob.size === 0) {
            updateSlot(prompt.id, variant, {
              status: "error",
              error: "Boş ses kaydı oluştu. Lütfen tekrar deneyin.",
            });
            return;
          }
          const audioUrl = URL.createObjectURL(audioBlob);
          objectUrlsRef.current.add(audioUrl);
          updateSlot(prompt.id, variant, {
            status: "saving",
            audioUrl,
            error: null,
          });
          try {
            await pronunciationCalibrationService.saveRecording({
              sessionId: session.sessionId,
              promptId: prompt.id,
              variant,
              audioBlob,
            });
            updateSlot(prompt.id, variant, {
              status: "saved",
              audioUrl,
              error: null,
            });
          } catch (error) {
            updateSlot(prompt.id, variant, {
              status: "error",
              audioUrl,
              error: readErrorMessage(error),
            });
          }
        };

        updateSlot(prompt.id, variant, {
          status: "recording",
          audioUrl: null,
          durationSeconds: 0,
          error: null,
        });
        setActiveVariant(variant);
        recorder.start(500);
        recordingTimerRef.current = setInterval(() => {
          setSlots((current) => {
            const value = current[currentKey] || EMPTY_SLOT;
            return {
              ...current,
              [currentKey]: {
                ...value,
                durationSeconds: value.durationSeconds + 1,
              },
            };
          });
        }, 1000);
        autoStopTimerRef.current = setTimeout(stopRecording, 20_000);
      } catch {
        stopMediaStream();
        setActiveVariant(null);
        updateSlot(prompt.id, variant, {
          status: "error",
          error:
            "Mikrofon açılamadı. Tarayıcıdaki mikrofon iznini kontrol edin.",
        });
      }
    },
    [
      activeVariant,
      clearRecordingTimers,
      currentStep,
      session,
      slots,
      stopMediaStream,
      stopRecording,
      updateSlot,
    ],
  );

  const resetRecording = useCallback(
    (variant: CalibrationVariant) => {
      const prompt = session?.prompts[currentStep];
      if (!prompt) return;
      const key = slotKey(prompt.id, variant);
      const audioUrl = slots[key]?.audioUrl;
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        objectUrlsRef.current.delete(audioUrl);
      }
      setSlots((current) => ({ ...current, [key]: { ...EMPTY_SLOT } }));
    },
    [currentStep, session, slots],
  );

  const goToNextStep = useCallback(async () => {
    if (!session || isCompleting) return;
    if (currentStep < session.prompts.length - 1) {
      setCurrentStep((value) => value + 1);
      return;
    }
    setIsCompleting(true);
    setPageError(null);
    try {
      await pronunciationCalibrationService.completeSession(session.sessionId);
      setIsCompleted(true);
    } catch (error) {
      setPageError(readErrorMessage(error));
    } finally {
      setIsCompleting(false);
    }
  }, [currentStep, isCompleting, session]);

  if (!import.meta.env.DEV) return <Navigate to="/app" replace />;

  const prompt = session?.prompts[currentStep];
  const normalSlot = prompt
    ? slots[slotKey(prompt.id, "normal")] || EMPTY_SLOT
    : EMPTY_SLOT;
  const contrastSlot = prompt
    ? slots[slotKey(prompt.id, "contrast")] || EMPTY_SLOT
    : EMPTY_SLOT;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--tm-border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[var(--tm-accent)]">
            <FlaskConical className="h-5 w-5" strokeWidth={2} />
            <span className="text-xs font-semibold">Yerel araştırma aracı</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[30px]">
            Telaffuz Kalibrasyonu
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
            Sekiz kısa cümleyi iki farklı biçimde okuyacaksınız. Bu çalışma
            sınav puanınızı etkilemez ve kayıtlar yalnızca bu bilgisayarda
            saklanır.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
          <span className="text-[var(--tm-text-tertiary)]">Cümle</span>
          <strong>{session ? `${currentStep + 1} / ${session.prompts.length}` : "—"}</strong>
          <span className="text-[var(--tm-text-tertiary)]">Toplam kayıt</span>
          <strong>16</strong>
        </div>
      </header>

      <main className="pt-6">
        <AudioQualityComparison />
        <div className="mt-6">
        {isLoading ? (
          <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-white px-5 py-12 text-center">
            <RefreshCw className="mx-auto h-5 w-5 animate-spin text-[var(--tm-accent)]" />
            <p className="mt-3 text-sm font-medium">Oturum hazırlanıyor…</p>
          </section>
        ) : pageError && !session ? (
          <section className="rounded-lg border border-red-200 bg-white px-5 py-10 text-center">
            <p className="text-sm font-medium text-red-700" role="alert">
              {pageError}
            </p>
            <button
              type="button"
              onClick={() => void prepareSession()}
              className={`${tm.subtleButton} mt-5 inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold`}
            >
              <RefreshCw className="h-4 w-4" />
              Tekrar dene
            </button>
          </section>
        ) : isCompleted && session ? (
          <section className="rounded-lg border border-emerald-200 bg-white px-5 py-12 text-center sm:px-8">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" strokeWidth={2} />
            <h2 className="mt-4 text-xl font-semibold">16 kayıt tamamlandı</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--tm-text-secondary)]">
              Kayıtlar yerel klasöre güvenle kaydedildi. Şimdi Codex’e
              “kalibrasyonu tamamladım” yazın; yerel model karşılaştırmasını
              çalıştıracağım.
            </p>
            <p className="mt-4 font-mono text-xs text-[var(--tm-text-tertiary)]">
              Oturum: {session.sessionId}
            </p>
          </section>
        ) : prompt && session ? (
          <>
            <PronunciationCalibrationStep
              prompt={prompt}
              stepNumber={currentStep + 1}
              totalSteps={session.prompts.length}
              normalSlot={normalSlot}
              contrastSlot={contrastSlot}
              activeVariant={activeVariant}
              onStart={(variant) => void startRecording(variant)}
              onStop={stopRecording}
              onReset={resetRecording}
              onNext={() => void goToNextStep()}
            />
            {isCompleting ? (
              <p className="mt-3 text-right text-sm text-[var(--tm-text-secondary)]">
                Oturum tamamlanıyor…
              </p>
            ) : null}
            {pageError ? (
              <p className="mt-4 text-sm font-medium text-red-700" role="alert">
                {pageError}
              </p>
            ) : null}
          </>
        ) : null}
        </div>
      </main>
    </div>
  );
}
