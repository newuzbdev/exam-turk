import React, { useState, useRef, useEffect } from "react";
import { Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onAudioEnded: () => void;
  compact?: boolean;
  persistKey?: string;
  autoPlay?: boolean;
}

export const AudioPlayer = ({
  src,
  onAudioEnded,
  compact = false,
  persistKey,
  autoPlay = true,
}: AudioPlayerProps) => {
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasStartedRef = useRef(false);
  const hasAppliedResumeTimeRef = useRef(false);
  const resumeTimeRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);
  // Web Audio removed: rely on native element volume/muted only for reliability

  useEffect(() => {
    // Reset playback flags for new source and rehydrate persisted progress.
    hasStartedRef.current = false;
    hasAppliedResumeTimeRef.current = false;
    resumeTimeRef.current = 0;

    if (!persistKey) return;
    try {
      const raw = sessionStorage.getItem(persistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        currentTime?: number;
        volume?: number;
        ended?: boolean;
      };

      const savedVolume = Number(parsed?.volume);
      if (Number.isFinite(savedVolume)) {
        setVolume(Math.max(0, Math.min(1, savedVolume)));
      }

      const savedCurrentTime = Number(parsed?.currentTime);
      if (Number.isFinite(savedCurrentTime) && savedCurrentTime > 0) {
        resumeTimeRef.current = savedCurrentTime;
      }

      if (parsed?.ended) {
        // Keep audio from auto-restarting after refresh if it already finished.
        hasStartedRef.current = true;
      }
    } catch {}
  }, [src, persistKey]);

  const applyResumeTime = () => {
    const audio = audioRef.current;
    if (!audio || hasAppliedResumeTimeRef.current) return;
    if (resumeTimeRef.current <= 0) {
      hasAppliedResumeTimeRef.current = true;
      return;
    }
    try {
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(0, audio.duration - 0.1)
          : resumeTimeRef.current;
      audio.currentTime = Math.min(resumeTimeRef.current, duration);
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
  }, [src]);

  // Auto-play when component mounts - only once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src || hasStartedRef.current || !autoPlay) return;

    console.log("Attempting auto-play...");
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
          await new Promise<void>((resolve) => {
            const onCanPlay = () => {
              audio.removeEventListener("canplay", onCanPlay);
              resolve();
            };
            audio.addEventListener("canplay", onCanPlay);
          });
        }

        if (!disposed && !hasStartedRef.current && audio.paused) {
          applyResumeTime();
          hasStartedRef.current = true;
          await audio.play();
          console.log("Auto-play successful!");
        }
      } catch (error) {
        if (disposed) return;
        console.log("Auto-play failed:", error);
        hasStartedRef.current = false;
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
  }, [src, autoPlay]);

  // Removed Web Audio pipeline

  // Keep the underlying audio element in sync with React volume state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (volume === 0) {
        // Just mute when volume is 0, don't stop
        audio.muted = true;
      } else {
        audio.muted = false;
        audio.volume = volume;
      }
    }
  }, [volume]);

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
            volume: audio.muted ? 0 : audio.volume,
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
    console.log("Audio ended - starting timer");
    onAudioEnded();
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const audio = audioRef.current;
    if (audio) {
      audio.muted = newVolume === 0;
      audio.volume = newVolume;
    }
  };

  return (
    <div
      className={`items-center bg-gray-100 rounded-lg border border-gray-300 ${
        compact
          ? "inline-flex w-fit max-w-full gap-1.5 px-2.5 py-1.5"
          : "flex gap-2 px-2 sm:px-3 py-1 sm:py-2"
      }`}
    >
      <audio 
        ref={audioRef} 
        src={src} 
        preload="auto"
        onLoadStart={() => console.log("Audio load started")}
        onLoadedData={() => console.log("Audio data loaded")}
        onCanPlay={() => console.log("Audio can play")}
        onError={(e) => console.error("Audio error:", e)}
        onEnded={handleEnded}
      />
      
      {/* Volume Slider */}
      <div className={`min-w-0 flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Volume2 size={14} className="text-gray-500" />
          <span className={compact ? "hidden md:inline" : "hidden sm:inline"}>Ses</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className={`${compact ? "w-24 sm:w-16 lg:w-20" : "w-12 sm:w-16 lg:w-20"} h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider`}
          style={{
            background: `linear-gradient(to right, #438553 0%, #438553 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className={compact ? "hidden sm:inline text-xs text-gray-600 min-w-[30px]" : "text-xs text-gray-600 min-w-[25px] sm:min-w-[30px]"}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
