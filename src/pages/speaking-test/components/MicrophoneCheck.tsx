import { Check, ChevronDown, Mic, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getExamFullscreenElement } from "@/utils/examFullscreen";
import { AUDIO_METER_HISTORY, AUDIO_METER_SEGMENTS, sampleAudioLevel } from "./audio-level-meter";
import "./MicrophoneCheck.css";

type PlaybackMeter = {
  audio: HTMLAudioElement;
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
};

interface Props {
  onSuccess: (deviceId: string) => void;
  embedded?: boolean;
  successButtonLabel?: string;
}

export const MicrophoneCheck = ({
  onSuccess,
  embedded = false,
  successButtonLabel = "Sınava Başla",
}: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [hasListened, setHasListened] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const verifiedDeviceIdRef = useRef("");
  const [inputLevel, setInputLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => new Array<number>(AUDIO_METER_HISTORY).fill(0));
  const [isMeterUnavailable, setIsMeterUnavailable] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // We'll store the current MediaRecorder and MediaStream for cleanup
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const stopInputSamplingRef = useRef<(() => void) | null>(null);
  const playbackMeterRef = useRef<PlaybackMeter | null>(null);
  const stopPlaybackSamplingRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
  const confirmationTimerRef = useRef<number | null>(null);

  // Check for MediaRecorder support
  const isMediaRecorderSupported =
    typeof window !== "undefined" && "MediaRecorder" in window;

  const stopInputMeter = () => {
    stopInputSamplingRef.current?.();
    stopInputSamplingRef.current = null;
    inputSourceRef.current?.disconnect();
    inputSourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    setInputLevel(0);
  };

  const stopPlaybackMeter = () => {
    stopPlaybackSamplingRef.current?.();
    stopPlaybackSamplingRef.current = null;
  };

  const disposePlaybackMeter = () => {
    stopPlaybackMeter();
    const meter = playbackMeterRef.current;
    playbackMeterRef.current = null;
    if (meter) {
      meter.source.disconnect();
      meter.analyser.disconnect();
      void meter.context.close().catch(() => undefined);
    }
  };

  const preparePlaybackMeter = (audio: HTMLAudioElement): PlaybackMeter | null => {
    const current = playbackMeterRef.current;
    if (current?.audio === audio) return current;
    disposePlaybackMeter();
    if (typeof AudioContext === "undefined") {
      setIsMeterUnavailable(true);
      return null;
    }
    const context = new AudioContext();
    let analyser: AnalyserNode;
    let source: MediaElementAudioSourceNode;
    try {
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source = context.createMediaElementSource(audio);
    } catch {
      void context.close().catch(() => undefined);
      setIsMeterUnavailable(true);
      return null;
    }
    const meter = { audio, context, source, analyser };
    playbackMeterRef.current = meter;
    // Keep sound on a direct path; the analyser is an independent measurement branch.
    source.connect(context.destination);
    source.connect(analyser);
    setIsMeterUnavailable(false);
    return meter;
  };

  const refreshDevices = async () => {
    const available = await navigator.mediaDevices.enumerateDevices();
    if (!mountedRef.current) return;
    const microphones = available.filter((device) => device.kind === "audioinput");
    setDevices(microphones);
    setSelectedDeviceId((current) => {
      if (current && microphones.some((device) => device.deviceId === current)) {
        return current;
      }
      return microphones.find((device) => device.deviceId === "default")?.deviceId
        || microphones[0]?.deviceId
        || "";
    });
  };

  const startInputMeter = (stream: MediaStream) => {
    stopInputMeter();
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      inputSourceRef.current = source;
      analyserRef.current = analyser;
      setIsMeterUnavailable(false);
      stopInputSamplingRef.current = sampleAudioLevel(analyser, embedded ? undefined : setInputLevel, () => audioContext.state === "running", embedded ? setWaveform : undefined);
      void audioContext.resume().catch(() => {
        if (audioContextRef.current !== audioContext) return;
        stopInputMeter();
        setIsMeterUnavailable(true);
      });
    } catch {
      stopInputMeter();
      setIsMeterUnavailable(true);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!isMediaRecorderSupported || !navigator.mediaDevices?.getUserMedia) {
      setError("Tarayıcınız mikrofonla kayıt almayı desteklemiyor.");
    }
    // Read existing device names without asking for microphone access.
    void refreshDevices().catch(() => undefined);

    const handleDeviceChange = () => {
      void refreshDevices().catch(() => undefined);
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (confirmationTimerRef.current !== null) window.clearTimeout(confirmationTimerRef.current);
      if (recorderRef.current) {
        recorderRef.current.onstop = null;
        recorderRef.current.ondataavailable = null;
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      stopInputMeter();
      disposePlaybackMeter();
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setIsPlaybackPlaying(false);
    setPlaybackProgress(0);
    setHasListened(false);
    const audio = playbackAudioRef.current;

    return () => {
      audio?.pause();
      if (playbackMeterRef.current?.audio === audio) disposePlaybackMeter();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // The graph belongs to this audio element and must survive pause/replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const startRecording = async () => {
    if (isRequestingPermission || recording || isConfirming) return;
    setError(null);
    stopPlaybackMeter();
    playbackAudioRef.current?.pause();
    setAudioUrl(null);
    setHasListened(false);

    if (getExamFullscreenElement()) {
      setError("Mikrofon testi için önce tam ekrandan çıkın.");
      return;
    }

    if (!isMediaRecorderSupported) {
      setError("Tarayıcınız mikrofonla kayıt almayı desteklemiyor.");
      return;
    }

    setIsRequestingPermission(true);
    try {
      const baseAudioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
      };
      const requestStream = (useSelectedDevice: boolean) =>
        navigator.mediaDevices.getUserMedia({
          audio: {
            ...baseAudioConstraints,
            ...(useSelectedDevice && selectedDeviceId
              ? { deviceId: { exact: selectedDeviceId } }
              : {}),
          },
        });

      let stream: MediaStream;
      try {
        stream = await requestStream(Boolean(selectedDeviceId));
      } catch (requestError) {
        const errorName =
          requestError instanceof Error ? requestError.name : "";
        const canRetryWithDefaultDevice =
          Boolean(selectedDeviceId) &&
          (errorName === "OverconstrainedError" ||
            errorName === "NotFoundError");
        if (!canRetryWithDefaultDevice) throw requestError;
        stream = await requestStream(false);
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      void refreshDevices().catch(() => undefined);
      streamRef.current = stream;
      verifiedDeviceIdRef.current = stream.getAudioTracks()[0]?.getSettings().deviceId || selectedDeviceId;
      chunksRef.current = [];
      startInputMeter(stream);

      const mimeType = ["audio/webm", "audio/mp4", "audio/wav"].find(
        (candidate) => MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size > 0) {
          setAudioUrl(URL.createObjectURL(blob));
        } else {
          setError("Ses kaydedilemedi. Kısa bir kayıt daha alın.");
        }
        stopInputMeter();
        // Stop all tracks after recording
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setError("Kayıt sırasında bir hata oluştu.");
        setRecording(false);
        stopInputMeter();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      setRecording(true);
      setIsRequestingPermission(false);
    } catch (error) {
      stopInputMeter();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      let errorMessage = "Mikrofon izni verilmedi veya mikrofon bulunamadı.";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Mikrofon izni verilmedi. Safari'de adres çubuğundaki mikrofon simgesinden izin verip yeniden deneyin.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Bu tarayıcı mikrofon kaydını desteklemiyor.";
        }
      }
      
      setError(errorMessage);
      setRecording(false);
      setIsRequestingPermission(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  const togglePlayback = async () => {
    if (isConfirming) return;
    const audio = playbackAudioRef.current;
    if (!audio) return;

    if (isPlaybackPlaying) {
      audio.pause();
      setIsPlaybackPlaying(false);
      stopPlaybackMeter();
      return;
    }

    setError(null);
    try {
      const meter = embedded ? preparePlaybackMeter(audio) : null;
      // Both calls happen inside the button gesture, before the first await (Safari).
      const resume = meter?.context.resume();
      const play = audio.play();
      await Promise.all([resume, play]);
      if (!mountedRef.current || playbackAudioRef.current !== audio || audio.paused) {
        audio.pause();
        return;
      }
      setIsPlaybackPlaying(true);
      stopPlaybackMeter();
      if (meter) {
        stopPlaybackSamplingRef.current = sampleAudioLevel(
          meter.analyser,
          undefined,
          () => !audio.paused && !audio.ended && !audio.muted && audio.volume > 0 && meter.context.state === "running",
          setWaveform,
        );
      }
    } catch {
      audio.pause();
      stopPlaybackMeter();
      setIsPlaybackPlaying(false);
      setError("Kayıt oynatılamadı. Lütfen tekrar deneyin.");
    }
  };

  const updatePlaybackProgress = () => {
    const audio = playbackAudioRef.current;
    if (audio && !audio.paused && audio.currentTime > 0) {
      setHasListened(true);
    }
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      setPlaybackProgress(0);
      return;
    }

    setPlaybackProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
  };

  const handlePlaybackEnded = () => {
    const audio = playbackAudioRef.current;
    if (audio) {
      audio.currentTime = 0;
    }
    setIsPlaybackPlaying(false);
    stopPlaybackMeter();
    setPlaybackProgress(0);
    setHasListened(true);
  };

  const displayedError = error;
  const confirmRecording = () => {
    if (!audioUrl || !hasListened || recording || isRequestingPermission || confirmationTimerRef.current !== null) return;
    const deviceId = verifiedDeviceIdRef.current;
    setIsConfirming(true);
    playbackAudioRef.current?.pause();
    stopPlaybackMeter();
    confirmationTimerRef.current = window.setTimeout(() => {
      confirmationTimerRef.current = null;
      if (!mountedRef.current) return;
      setIsConfirming(false);
      onSuccess(deviceId);
    }, 500);
  };
  const playerLabel = isRequestingPermission
    ? "Mikrofon izni bekleniyor…"
    : recording
      ? "Bitirince durdurun"
      : isPlaybackPlaying
        ? "Kaydınız çalıyor…"
        : audioUrl
          ? hasListened ? "Kaydı tekrar dinle" : "Kaydınızı dinleyin"
          : "Kaydı başlatın";
  const isWaitingForFirstPlayback = Boolean(audioUrl && !hasListened && !recording && !isPlaybackPlaying);
  const deviceSelector = (
    <select
      value={selectedDeviceId}
      onChange={(event) => {
        setSelectedDeviceId(event.target.value);
        setAudioUrl(null);
        setHasListened(false);
      }}
      disabled={recording || isRequestingPermission || isConfirming || devices.length === 0}
      aria-label="Kullanılacak mikrofon"
      title={devices.find(device => device.deviceId === selectedDeviceId)?.label || "Varsayılan mikrofon"}
      className={embedded ? "mic-check-device-select" : "max-w-[210px] rounded-md border border-[var(--tm-border-subtle)] bg-white px-2 py-1.5 text-xs text-[var(--tm-text-primary)] disabled:opacity-50"}
    >
      {devices.length === 0 && <option value="">Varsayılan mikrofon</option>}
      {devices.map((device, index) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Mikrofon ${index + 1}`}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className={
        embedded
          ? "microphone-check-embedded p-0"
          : "microphone-check-page safe-area-bottom safe-area-top overscroll-contain touch-pan-y"
      }
    >
      <div className={embedded ? "max-w-none" : "microphone-check-surface"}>
        {!embedded && (
          <div className="mic-check-brand">
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                console.error("Logo failed to load");
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className={embedded ? "space-y-3" : "space-y-4"}>

          <div className={embedded ? "block" : "flex items-start gap-3"}>
            <div className={embedded ? "hidden" : "shrink-0"}>
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)]">
                <Mic className="h-4 w-4 text-[var(--tm-text-secondary)]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={`${embedded ? "sr-only" : "mb-1 text-base font-semibold leading-6 text-[var(--tm-text-primary)]"}`}>
                Mikrofonunuzu kontrol edin
              </h2>
              <p className={`${embedded ? "sr-only" : "text-sm leading-[22px] text-[var(--tm-text-secondary)]"}`}>
                Kısa kayıt alıp dinleyin.
              </p>

              {(
                <>
                  <div className={embedded ? "mic-check-reading-prompt" : "mb-2 mt-4 rounded-md border border-[var(--tm-border-subtle)] bg-white p-3"}>
                    <p className="text-xs font-medium text-[var(--tm-text-secondary)] mb-1">Yüksek sesle okuyun</p>
                    <p className="text-sm font-medium leading-[22px] text-[var(--tm-text-primary)]">
                      {"\"Bugün Türkçe konuşma sınavına hazırlanıyorum.\""}
                    </p>
                  </div>

                  {!embedded && <div className="rounded-md border border-[var(--tm-border-subtle)] bg-white p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={recording ? stopRecording : startRecording}
                        className={`speaking-mic-check-core flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors touch-manipulation disabled:cursor-not-allowed disabled:opacity-45 ${
                          recording
                            ? "bg-[var(--tm-text-primary)]"
                            : "bg-[var(--tm-accent)] hover:bg-[var(--tm-accent-hover)] active:bg-[var(--tm-accent-hover)]"
                        }`}
                        disabled={isRequestingPermission}
                        aria-label={recording ? "Mikrofon kaydını durdur" : "Mikrofon kaydını başlat"}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        {recording ? (
                          <Square className="h-4 w-4 text-white" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
                        )}
                      </button>

                      <div className="min-w-16 flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tm-bg-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--tm-accent)] transition-[width] duration-100"
                            style={{ width: `${recording ? inputLevel / AUDIO_METER_SEGMENTS * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                        <span className="text-xs text-[var(--tm-accent)] font-semibold">
                          {recording ? "REC" : isRequestingPermission ? "İzin bekleniyor" : ""}
                        </span>
                        {deviceSelector}
                      </div>
                    </div>
                  </div>}

                  {embedded && <div className="mic-check-player">
                    <div className="mic-check-player-buttons" role="group" aria-label="Kayıt ve dinleme">
                      <button
                        type="button"
                        onClick={recording ? stopRecording : startRecording}
                        disabled={isRequestingPermission || isConfirming}
                        aria-label={recording ? "Mikrofon kaydını durdur" : "Mikrofon kaydını başlat"}
                        title={recording ? "Kaydı bitir" : audioUrl ? "Yeniden kaydet" : "Kaydı başlat"}
                        className="mic-check-player-button mic-check-player-record"
                      >
                        {recording ? <Square size={14} fill="currentColor" aria-hidden="true" /> : <span className="mic-check-record-dot" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={togglePlayback}
                        disabled={!audioUrl || recording || isRequestingPermission || isConfirming}
                        aria-label={isPlaybackPlaying ? "Kaydı duraklat" : "Kaydı dinle"}
                        title={isPlaybackPlaying ? "Duraklat" : "Kaydı dinle"}
                        className="mic-check-player-button"
                      >
                        {isPlaybackPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                      </button>
                      {isWaitingForFirstPlayback && (
                        <span className="mic-check-listen-prompt" aria-hidden="true">Kaydınızı dinleyin</span>
                      )}
                    </div>
                    <div className="mic-check-player-timeline">
                      <p className="sr-only" aria-live="polite">{playerLabel}</p>
                      <div className="mic-check-level-meter" role="img" aria-label={isMeterUnavailable ? "Ses seviyesi ölçülemiyor" : "Ses seviyesi"}>
                        {waveform.map((value, index) => {
                          const level = !isMeterUnavailable && (recording || isPlaybackPlaying) ? value : 0;
                          return <span key={index} aria-hidden="true" style={{ height: `${2 + level}px` }} data-lit={level > 0 || undefined} data-high={level >= 14 || undefined} />;
                        })}
                      </div>
                      {isMeterUnavailable && <p className="mic-check-meter-unavailable" role="status">Ses seviyesi ölçülemiyor.</p>}
                    </div>
                    <button
                      type="button"
                      className="mic-check-player-button mic-check-player-confirm"
                      aria-label={successButtonLabel}
                      title={hasListened ? successButtonLabel : "Onaylamak için kaydınızı dinleyin"}
                      disabled={!audioUrl || !hasListened || recording || isRequestingPermission || isConfirming}
                      data-confirmed={isConfirming || undefined}
                      onClick={confirmRecording}
                    >
                      <span className="mic-check-confirm-marker" aria-hidden="true">
                        {isConfirming && <Check size={16} strokeWidth={2.5} />}
                      </span>
                      {successButtonLabel}
                    </button>
                  </div>}

                  {audioUrl && (
                    <div className={embedded ? "contents" : "mt-2 rounded-md border border-[var(--tm-border-subtle)] bg-white p-3"}>
                      <audio
                        ref={playbackAudioRef}
                        src={audioUrl}
                        preload="metadata"
                        onTimeUpdate={updatePlaybackProgress}
                        onLoadedMetadata={updatePlaybackProgress}
                        onEnded={handlePlaybackEnded}
                        onError={() => {
                          setHasListened(false);
                          setIsPlaybackPlaying(false);
                          stopPlaybackMeter();
                          setError("Kayıt oynatılamadı. Kısa bir kayıt daha alın.");
                        }}
                        onPause={() => { setIsPlaybackPlaying(false); stopPlaybackMeter(); }}
                        className="hidden"
                      />
                      {!embedded && <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePlayback}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--tm-border-default)] bg-[var(--tm-bg-app)] text-[var(--tm-text-primary)] transition-colors hover:bg-[var(--tm-bg-hover)]"
                          aria-label={isPlaybackPlaying ? "Kaydı duraklat" : "Kaydı dinle"}
                        >
                          {isPlaybackPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-[var(--tm-text-primary)]">{hasListened ? "Kaydı tekrar dinle" : "2. Kaydınızı dinleyin"}</p>
                            <p className="text-xs text-[var(--tm-text-secondary)]">{isPlaybackPlaying ? "Çalıyor" : hasListened ? "Dinlendi" : ""}</p>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tm-bg-muted)]">
                            <div
                              className="h-full rounded-full bg-[var(--tm-accent)] transition-[width] duration-150"
                              style={{ width: `${playbackProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>}
                    </div>
                  )}

                  {!embedded && audioUrl && (
                    <div>
                    <button
                      type="button"
                      disabled={!hasListened}
                      onClick={() => { if (hasListened) onSuccess(verifiedDeviceIdRef.current); }}
                      className="mt-4 min-h-10 rounded-md bg-[var(--tm-accent)] px-4 py-2 text-sm font-semibold leading-[22px] text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {successButtonLabel}
                    </button>
                    </div>
                  )}
                  {embedded && <div className="mic-check-device-options">
                    <Mic size={13} aria-hidden="true" />
                    {deviceSelector}
                    <ChevronDown size={13} aria-hidden="true" />
                  </div>}
                </>
              )}
            </div>
          </div>
        </div>

        {displayedError && (
          <div className={`${embedded ? "mt-2 p-2" : "mt-4 p-3"} bg-red-50 border border-red-100 rounded-md`}>
            <p className="text-sm leading-[22px] text-red-700">{displayedError}</p>
            {!embedded && (
              <details className="mic-check-help">
                <summary>Mikrofon izni nasıl açılır?<ChevronDown size={14} aria-hidden="true" /></summary>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tarayıcı ayarlarına gidin (⋮ menü)</li>
                  <li>"Site ayarları" veya "İzinler" bölümünü bulun</li>
                  <li>"Mikrofon" iznini "İzin ver" olarak değiştirin</li>
                  <li>Sayfayı yenileyin (F5 veya ↻)</li>
                </ol>
                
                <div className="mt-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="min-h-10 rounded-md bg-[var(--tm-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--tm-accent-hover)]"
                  >
                    Sayfayı Yenile
                  </button>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
