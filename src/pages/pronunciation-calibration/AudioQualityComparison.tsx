import { useCallback, useEffect, useRef, useState } from "react";
import { CircleStop, Mic, RotateCcw, Volume2 } from "lucide-react";

import { tm } from "@/components/tm";
import { cn } from "@/lib/utils";
import {
  AUDIO_QUALITY_PROFILES,
  type AudioProfileId,
} from "./audio-quality-profiles";

type RecordingState = {
  status: "idle" | "recording" | "ready" | "error";
  audioUrl: string | null;
  durationSeconds: number;
  error: string | null;
};

const EMPTY_RECORDING: RecordingState = {
  status: "idle",
  audioUrl: null,
  durationSeconds: 0,
  error: null,
};

const COMPARISON_TEXT =
  "Bugün kendimi sakin hissediyorum ve Türkçe konuşma pratiği yapıyorum.";

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

const formatDuration = (seconds: number) =>
  `00:${String(Math.max(0, Math.floor(seconds))).padStart(2, "0")}`;

export function AudioQualityComparison() {
  const [recordings, setRecordings] = useState<
    Record<AudioProfileId, RecordingState>
  >({
    current: { ...EMPTY_RECORDING },
    natural: { ...EMPTY_RECORDING },
  });
  const [activeProfile, setActiveProfile] = useState<AudioProfileId | null>(
    null,
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const updateRecording = useCallback(
    (profileId: AudioProfileId, update: Partial<RecordingState>) => {
      setRecordings((current) => ({
        ...current,
        [profileId]: { ...current[profileId], ...update },
      }));
    },
    [],
  );

  const stopRecording = useCallback(() => {
    clearTimers();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, [clearTimers]);

  useEffect(
    () => () => {
      clearTimers();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      stopStream();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    [clearTimers, stopStream],
  );

  const startRecording = useCallback(
    async (profileId: AudioProfileId) => {
      if (activeProfile) return;

      const previousUrl = recordings[profileId].audioUrl;
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
        objectUrlsRef.current.delete(previousUrl);
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
          throw new Error("unsupported microphone");
        }

        const profile = AUDIO_QUALITY_PROFILES[profileId];
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: profile.constraints,
        });
        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = preferredMimeTypes.find((candidate) =>
          MediaRecorder.isTypeSupported(candidate),
        );
        const recorderOptions: MediaRecorderOptions = {
          ...(mimeType ? { mimeType } : {}),
          ...(profile.audioBitsPerSecond
            ? { audioBitsPerSecond: profile.audioBitsPerSecond }
            : {}),
        };
        const recorder = new MediaRecorder(stream, recorderOptions);
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onerror = () => {
          clearTimers();
          stopStream();
          setActiveProfile(null);
          updateRecording(profileId, {
            status: "error",
            error: "Kayıt sırasında bir hata oluştu.",
          });
        };
        recorder.onstop = () => {
          clearTimers();
          stopStream();
          setActiveProfile(null);

          const resolvedMimeType =
            recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: resolvedMimeType });
          chunksRef.current = [];
          if (blob.size === 0) {
            updateRecording(profileId, {
              status: "error",
              error: "Boş kayıt oluştu. Lütfen tekrar deneyin.",
            });
            return;
          }

          const audioUrl = URL.createObjectURL(blob);
          objectUrlsRef.current.add(audioUrl);
          updateRecording(profileId, {
            status: "ready",
            audioUrl,
            error: null,
          });
        };

        setActiveProfile(profileId);
        updateRecording(profileId, {
          status: "recording",
          audioUrl: null,
          durationSeconds: 0,
          error: null,
        });
        recorder.start(250);
        timerRef.current = setInterval(() => {
          setRecordings((current) => ({
            ...current,
            [profileId]: {
              ...current[profileId],
              durationSeconds: current[profileId].durationSeconds + 1,
            },
          }));
        }, 1_000);
        autoStopRef.current = setTimeout(stopRecording, 10_000);
      } catch {
        clearTimers();
        stopStream();
        setActiveProfile(null);
        updateRecording(profileId, {
          status: "error",
          audioUrl: null,
          error: "Mikrofon açılamadı. Tarayıcıdaki mikrofon iznini kontrol edin.",
        });
      }
    },
    [
      activeProfile,
      clearTimers,
      recordings,
      stopRecording,
      stopStream,
      updateRecording,
    ],
  );

  const resetRecording = useCallback(
    (profileId: AudioProfileId) => {
      const audioUrl = recordings[profileId].audioUrl;
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        objectUrlsRef.current.delete(audioUrl);
      }
      setRecordings((current) => ({
        ...current,
        [profileId]: { ...EMPTY_RECORDING },
      }));
    },
    [recordings],
  );

  return (
    <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-[var(--tm-bg-muted)] p-2 text-[var(--tm-text-primary)]">
          <Volume2 className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[var(--tm-text-primary)]">
            Ses kalitesi karşılaştırması
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
            Aşağıdaki cümleyi iki kayıtta da aynı ses yüksekliği ve mikrofon
            mesafesiyle okuyun. Bu kayıtlar yalnızca tarayıcınızda tutulur.
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-[var(--tm-bg-muted)] px-4 py-3 text-base font-medium leading-7 text-[var(--tm-text-primary)]">
        {COMPARISON_TEXT}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(Object.keys(AUDIO_QUALITY_PROFILES) as AudioProfileId[]).map(
          (profileId) => {
            const profile = AUDIO_QUALITY_PROFILES[profileId];
            const recording = recordings[profileId];
            const isActive = activeProfile === profileId;
            const isBlocked = activeProfile !== null && !isActive;

            return (
              <div
                key={profileId}
                className="rounded-lg border border-[var(--tm-border-subtle)] p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--tm-text-primary)]">
                  {profile.title}
                </h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-[var(--tm-text-secondary)]">
                  {profile.description}
                </p>

                <div className="mt-4">
                  {recording.status === "ready" && recording.audioUrl ? (
                    <div className="space-y-3">
                      <audio
                        className="h-10 w-full"
                        controls
                        preload="metadata"
                        src={recording.audioUrl}
                      >
                        Tarayıcınız ses oynatmayı desteklemiyor.
                      </audio>
                      <button
                        type="button"
                        onClick={() => resetRecording(profileId)}
                        disabled={isBlocked}
                        className={`${tm.subtleButton} inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2.1} />
                        Tekrar kaydet
                      </button>
                    </div>
                  ) : isActive ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    >
                      <CircleStop className="h-4 w-4" fill="currentColor" />
                      Kaydı durdur · {formatDuration(recording.durationSeconds)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startRecording(profileId)}
                      disabled={isBlocked}
                      className={cn(
                        tm.primaryButton,
                        "inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45",
                      )}
                    >
                      <Mic className="h-4 w-4" strokeWidth={2.1} />
                      Kaydı başlat
                    </button>
                  )}
                  {recording.error ? (
                    <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                      {recording.error}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}
