import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onAudioEnded: () => void;
  compact?: boolean;
  persistKey?: string;
  autoPlay?: boolean;
  controlsVisible?: boolean;
  authoritativePositionSeconds?: number | null;
  authoritativeCapturedAtMs?: number | null;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  manualStartRequired?: boolean;
  onBeforeManualStart?: () => Promise<void>;
  showManualStartControl?: boolean;
}

export interface AudioPlayerHandle {
  start: () => Promise<boolean>;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer(
    {
      src,
      onAudioEnded,
      compact = false,
      persistKey,
      autoPlay = true,
      controlsVisible = true,
      authoritativePositionSeconds,
      authoritativeCapturedAtMs,
      muted = false,
      onMutedChange,
      manualStartRequired = false,
      onBeforeManualStart,
      showManualStartControl = true,
    }: AudioPlayerProps,
    ref,
  ) {
  const [volume, setVolume] = useState(0.7);
  const [playbackIssue, setPlaybackIssue] = useState<
    "start-required" | "autoplay-blocked" | "load-error" | null
  >(null);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasStartedRef = useRef(false);
  const hasAppliedResumeTimeRef = useRef(false);
  const resumeTimeRef = useRef(0);
  const retryAttemptsRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);
  // Web Audio removed: rely on native element volume/muted only for reliability

  const getAuthoritativeResumeTime = () => {
    const position = Number(authoritativePositionSeconds);
    if (!Number.isFinite(position) || position < 0) return 0;
    if (manualStartRequired) return position;
    const capturedAt = Number(authoritativeCapturedAtMs);
    const elapsedSinceCapture =
      Number.isFinite(capturedAt) && capturedAt > 0
        ? Math.max(0, (Date.now() - capturedAt) / 1000)
        : 0;
    return position + elapsedSinceCapture;
  };

  useEffect(() => {
    // Reset playback flags for new source and rehydrate persisted progress.
    hasStartedRef.current = false;
    hasAppliedResumeTimeRef.current = false;
    retryAttemptsRef.current = 0;
    setPlaybackIssue(manualStartRequired ? "start-required" : null);
    setIsStartingPlayback(false);
    resumeTimeRef.current = getAuthoritativeResumeTime();
    const hasAuthoritativePosition =
      Number.isFinite(Number(authoritativePositionSeconds)) &&
      Number(authoritativePositionSeconds) >= 0;

    if (!persistKey) return;
    try {
      const raw = sessionStorage.getItem(persistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        currentTime?: number;
        volume?: number;
        muted?: boolean;
        ended?: boolean;
      };

      const savedVolume = Number(parsed?.volume);
      if (Number.isFinite(savedVolume) && savedVolume > 0) {
        setVolume(Math.max(0, Math.min(1, savedVolume)));
      }
      onMutedChange?.(parsed?.muted === true || savedVolume === 0);

      const savedCurrentTime = Number(parsed?.currentTime);
      if (
        !manualStartRequired &&
        Number.isFinite(savedCurrentTime) &&
        savedCurrentTime > 0
      ) {
        resumeTimeRef.current = Math.max(
          resumeTimeRef.current,
          savedCurrentTime,
        );
      }

      if (parsed?.ended && !hasAuthoritativePosition) {
        // Keep audio from auto-restarting after refresh if it already finished.
        hasStartedRef.current = true;
      }
    } catch {}
  }, [
    src,
    persistKey,
    authoritativePositionSeconds,
    authoritativeCapturedAtMs,
    onMutedChange,
    manualStartRequired,
  ]);

  const applyResumeTime = () => {
    const audio = audioRef.current;
    if (!audio || hasAppliedResumeTimeRef.current) return;
    const resumeTime = Math.max(
      resumeTimeRef.current,
      getAuthoritativeResumeTime(),
    );
    if (resumeTime <= 0) {
      hasAppliedResumeTimeRef.current = true;
      return;
    }
    try {
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(0, audio.duration - 0.1)
          : resumeTime;
      audio.currentTime = Math.min(resumeTime, duration);
    } catch {}
    hasAppliedResumeTimeRef.current = true;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      applyResumeTime();
    };

    if (audio.readyState >= 1) {
      applyResumeTime();
    } else {
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [
    src,
    authoritativePositionSeconds,
    authoritativeCapturedAtMs,
  ]);

  // Auto-play when component mounts - only once
  useEffect(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      !src ||
      hasStartedRef.current ||
      !autoPlay ||
      manualStartRequired
    ) {
      return;
    }

    let disposed = false;

    const clearPendingTimers = () => {
      if (startTimerRef.current !== null) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const tryAutoPlay = async () => {
      if (disposed || hasStartedRef.current) return;

      try {
        if (audio.readyState < 2) {
          audio.load();
        }

        if (!disposed && !hasStartedRef.current && audio.paused) {
          applyResumeTime();
          hasStartedRef.current = true;
          await audio.play();
          retryAttemptsRef.current = 0;
          setPlaybackIssue(null);
        }
      } catch (error) {
        if (disposed) return;
        hasStartedRef.current = false;
        const errorName =
          error instanceof DOMException
            ? error.name
            : String((error as { name?: unknown })?.name || "");
        if (errorName === "NotAllowedError") {
          setPlaybackIssue("autoplay-blocked");
          return;
        }

        setPlaybackIssue("load-error");
        retryAttemptsRef.current += 1;
        if (retryAttemptsRef.current > 3) return;
        retryTimerRef.current = window.setTimeout(() => {
          tryAutoPlay();
        }, 2000);
      }
    };

    startTimerRef.current = window.setTimeout(tryAutoPlay, 500);

    return () => {
      disposed = true;
      clearPendingTimers();
      try {
        audio.pause();
      } catch {}
    };
  }, [
    src,
    autoPlay,
    authoritativePositionSeconds,
    authoritativeCapturedAtMs,
    manualStartRequired,
  ]);

  // Removed Web Audio pipeline

  // Keep the underlying audio element in sync with React volume state.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = muted || volume === 0;
      audio.volume = volume;
    }
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !persistKey) return;

    const persist = (endedOverride: boolean = false) => {
      const now = Date.now();
      if (!endedOverride && now - lastPersistedAtRef.current < 250) return;
      lastPersistedAtRef.current = now;
      try {
        sessionStorage.setItem(
          persistKey,
          JSON.stringify({
            currentTime: audio.currentTime || 0,
            volume: audio.volume,
            muted: audio.muted,
            ended: endedOverride || audio.ended,
            updatedAt: now,
          })
        );
      } catch {}
    };

    const onTimeUpdate = () => persist(false);
    const onPause = () => persist(false);
    const onVolumeChange = () => persist(false);
    const onEndedPersist = () => persist(true);
    const onBeforeUnload = () => persist(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persist(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("volumechange", onVolumeChange);
    audio.addEventListener("ended", onEndedPersist);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (audio.readyState >= 1) persist(false);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("volumechange", onVolumeChange);
      audio.removeEventListener("ended", onEndedPersist);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [persistKey, src]);

  const handleEnded = () => {
    onAudioEnded();
  };

  const handlePlaybackError = () => {
    hasStartedRef.current = false;
    setPlaybackIssue("load-error");
  };

  const handleManualStart = async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || !src || isStartingPlayback) return false;

    setIsStartingPlayback(true);
    try {
      if (audio.readyState === 0) {
        audio.load();
      }
      applyResumeTime();
      await audio.play();
      if (onBeforeManualStart) {
        await onBeforeManualStart();
      }
      hasStartedRef.current = true;
      retryAttemptsRef.current = 0;
      setPlaybackIssue(null);
      return true;
    } catch (error) {
      hasStartedRef.current = false;
      try {
        audio.pause();
        if (manualStartRequired) audio.currentTime = 0;
      } catch {}
      const errorName =
        error instanceof DOMException
          ? error.name
          : String((error as { name?: unknown })?.name || "");
      setPlaybackIssue(
        errorName === "NotAllowedError" ? "autoplay-blocked" : "load-error",
      );
      return false;
    } finally {
      setIsStartingPlayback(false);
    }
  };

  useImperativeHandle(ref, () => ({
    start: handleManualStart,
  }));

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const nextMuted = newVolume === 0;
    onMutedChange?.(nextMuted);
    const audio = audioRef.current;
    if (audio) {
      audio.muted = nextMuted;
      audio.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    const nextVolume = !nextMuted && volume === 0 ? 0.7 : volume;
    if (nextVolume !== volume) {
      setVolume(nextVolume);
    }
    const audio = audioRef.current;
    if (audio) {
      audio.volume = nextVolume;
      audio.muted = nextMuted;
    }
    onMutedChange?.(nextMuted);
  };

  const effectiveVolume = muted ? 0 : volume;

  if (!controlsVisible) {
    return (
      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="auto"
        onError={handlePlaybackError}
        onEnded={handleEnded}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`items-center rounded-md border border-[#dededb] bg-[#f7f7f5] text-[#5f5e5a] ${
        compact
          ? "inline-flex h-8 w-fit max-w-full gap-2 px-2.5"
          : "flex gap-2 px-3 py-1.5"
      }`}
    >
      <audio 
        ref={audioRef} 
        src={src} 
        crossOrigin="anonymous"
        preload="auto"
        onError={handlePlaybackError}
        onEnded={handleEnded}
      />

      {playbackIssue && showManualStartControl && (
        <div
          className="flex min-w-0 items-center gap-2 text-xs text-[#5f5e5a]"
          role="status"
          aria-live="polite"
        >
          <span className={compact ? "hidden sm:inline" : ""}>
            {playbackIssue === "start-required"
              ? "Ses hazır."
              : playbackIssue === "autoplay-blocked"
              ? "Ses başlatılmayı bekliyor."
              : "Ses yüklenemedi."}
          </span>
          <button
            type="button"
            onClick={() => void handleManualStart()}
            disabled={isStartingPlayback}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded border border-[#c9c9c4] bg-white px-2 text-xs font-semibold text-[#37352f] transition-colors hover:bg-[#f1f1ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
          >
            <Play size={13} aria-hidden="true" />
            {isStartingPlayback
              ? "Başlatılıyor"
              : playbackIssue === "start-required" ||
                  playbackIssue === "autoplay-blocked"
                ? "Sesi başlat"
                : "Yeniden dene"}
          </button>
        </div>
      )}

      {/* Volume Slider */}
      <div className={`min-w-0 flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
        <button
          type="button"
          data-listening-audio-mute
          onClick={handleMuteToggle}
          aria-label={muted ? "Sesi aç" : "Sesi kapat"}
          aria-pressed={muted}
          title={muted ? "Sesi aç" : "Sesi kapat"}
          className="flex h-6 shrink-0 items-center gap-1 rounded px-1 text-xs text-[#5f5e5a] transition-colors hover:bg-white hover:text-[#37352f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
        >
          {muted ? (
            <VolumeX size={14} className="text-[#8a3f35]" />
          ) : (
            <Volume2 size={14} className="text-[#6f6d67]" />
          )}
          <span className={compact ? "hidden md:inline" : "hidden sm:inline"}>Ses</span>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={effectiveVolume}
          onChange={handleVolumeChange}
          aria-label="Ses düzeyi"
          className={`${compact ? "w-20" : "w-12 sm:w-16 lg:w-24"} listening-volume-range h-1.5 appearance-none rounded-full bg-[#dededb] cursor-pointer`}
          style={{
            background: `linear-gradient(to right, #6f6d67 0%, #6f6d67 ${effectiveVolume * 100}%, #dededb ${effectiveVolume * 100}%, #dededb 100%)`
          }}
        />
        <span className={compact ? "hidden min-w-[40px] text-right text-xs tabular-nums text-[#5f5e5a] sm:inline" : "min-w-[40px] text-right text-xs tabular-nums text-[#5f5e5a]"}>
          {muted ? "Kapalı" : `${Math.round(volume * 100)}%`}
        </span>
      </div>
    </div>
  );
});
