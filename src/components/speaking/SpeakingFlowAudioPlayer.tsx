import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Gauge, Loader2, Pause, Play, Timer } from "lucide-react";

import {
  buildSpeakingFlowDisplay,
  calculateSpeakingFlowSeekSeconds,
  getSpeakingFlowBarTone,
  type SpeakingFlowBarTone,
  type SpeakingFlowTimeRange,
  type SpeakingSpeechEvidence,
} from "./speaking-speech-evidence";

export type SpeakingFlowAudioMeta = {
  audioId: string;
  durationSeconds?: number | null;
  allottedDurationSeconds?: number | null;
  speechEvidence?: SpeakingSpeechEvidence;
};

type SpeakingFlowAudioPlayerProps = {
  audio: SpeakingFlowAudioMeta;
  sourceUrl?: string;
  isLoading?: boolean;
  error?: string;
  onEnsureSource: () => Promise<string | null>;
  onRegisterPlayer?: (element: HTMLAudioElement | null) => void;
  onLoadedMetadata?: (element: HTMLAudioElement) => void;
  onPlaybackStart?: () => void;
  onPlaybackError?: () => void;
  onSeekRequest?: (seconds: number) => void;
  issueTimeRanges?: SpeakingFlowTimeRange[];
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const formatClock = (seconds: number) => {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatDecimal = (value: number) =>
  value.toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const SPEAKING_FLOW_BAR_COLORS: Record<SpeakingFlowBarTone, string> = {
  issue: "#de6259",
  pause: "#d2a12c",
  played: "#37352f",
  remaining: "#b7b5af",
};

export default function SpeakingFlowAudioPlayer(props: SpeakingFlowAudioPlayerProps) {
  // A different recording owns a different media element and playback state,
  // even before its private URL has loaded.
  return <SpeakingFlowAudioPlayerSession key={props.audio.audioId} {...props} />;
}

function SpeakingFlowAudioPlayerSession({
  audio,
  sourceUrl,
  isLoading = false,
  error,
  onEnsureSource,
  onRegisterPlayer,
  onLoadedMetadata,
  onPlaybackStart,
  onPlaybackError,
  onSeekRequest,
  issueTimeRanges = [],
}: SpeakingFlowAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScrubbingRef = useRef(false);
  const ensureSourceRef = useRef(onEnsureSource);
  const requestedAudioIdRef = useRef<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const flow = useMemo(
    () => buildSpeakingFlowDisplay(
      mediaDuration > 0 && audio.speechEvidence
        ? { ...audio.speechEvidence, measuredDurationSeconds: mediaDuration }
        : audio.speechEvidence,
      audio.durationSeconds,
    ),
    [audio.durationSeconds, audio.speechEvidence, mediaDuration],
  );
  const hasStoredDuration =
    typeof audio.durationSeconds === "number" &&
    Number.isFinite(audio.durationSeconds) &&
    audio.durationSeconds >= 0;
  const hasMeasuredDuration = mediaDuration > 0 || hasStoredDuration;
  const recordedDurationSeconds =
    mediaDuration > 0
      ? mediaDuration
      : flow?.durationSeconds ?? audio.durationSeconds ?? 0;
  const allottedDurationSeconds =
    typeof audio.allottedDurationSeconds === "number" &&
    Number.isFinite(audio.allottedDurationSeconds) &&
    audio.allottedDurationSeconds > 0
      ? audio.allottedDurationSeconds
      : recordedDurationSeconds;
  // Media containers can differ from the exam clock by a fraction of a
  // second. Only show unused task time when the recorded duration is known
  // and the difference is material. Missing duration metadata is unknown,
  // not evidence that the student used zero seconds.
  const unusedDurationSeconds =
    hasMeasuredDuration && allottedDurationSeconds - recordedDurationSeconds > 1
      ? allottedDurationSeconds - recordedDurationSeconds
      : 0;
  const timelineDurationSeconds = Math.max(
    recordedDurationSeconds,
    unusedDurationSeconds > 0 ? allottedDurationSeconds : 0,
  );
  const progressRatio =
    timelineDurationSeconds > 0
      ? clamp(currentTime / timelineDurationSeconds, 0, 1)
      : 0;

  ensureSourceRef.current = onEnsureSource;

  useEffect(() => {
    const player = audioRef.current;
    return () => player?.pause();
  }, []);

  useEffect(() => {
    onRegisterPlayer?.(audioRef.current);
    return () => onRegisterPlayer?.(null);
  }, [onRegisterPlayer]);

  useEffect(() => {
    if (
      sourceUrl ||
      isLoading ||
      requestedAudioIdRef.current === audio.audioId
    ) {
      return;
    }
    requestedAudioIdRef.current = audio.audioId;
    void ensureSourceRef.current();
  }, [audio.audioId, isLoading, sourceUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const visibleDuration = Math.max(timelineDurationSeconds, 1);
      const gap = 2;
      const barWidth = 2;
      const barCount = Math.max(24, Math.floor(width / (barWidth + gap)));
      const wordTimings = audio.speechEvidence?.wordTimings ?? [];
      const centerY = height / 2;

      for (let index = 0; index < barCount; index += 1) {
        const ratio = barCount === 1 ? 0 : index / (barCount - 1);
        const second = ratio * visibleDuration;
        const isSpeech = wordTimings.some(
          (word) => second >= word.start && second <= word.end,
        );
        const cadence = (Math.sin(index * 1.73) + 1) / 2;
        const barHeight = isSpeech
          ? 15 + cadence * Math.max(10, height - 23)
          : 5 + cadence * 5;
        const x = ratio * Math.max(0, width - barWidth);
        const tone = getSpeakingFlowBarTone(
          second,
          currentTime,
          flow?.noticeablePauses ?? [],
          issueTimeRanges,
        );
        context.fillStyle = SPEAKING_FLOW_BAR_COLORS[tone];
        context.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
      }

      if (currentTime > 0 && currentTime < visibleDuration) {
        const x = progressRatio * width;
        context.fillStyle = "#37352f";
        context.fillRect(Math.max(0, x - 0.75), 0, 1.5, height);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [audio.speechEvidence?.wordTimings, currentTime, flow, issueTimeRanges, progressRatio, timelineDurationSeconds]);

  const playOrPause = async () => {
    const player = audioRef.current;
    if (!player) return;

    if (!player.paused) {
      player.pause();
      return;
    }

    const resolvedUrl = sourceUrl || (await onEnsureSource());
    if (!resolvedUrl || audioRef.current !== player) return;
    if (player.src !== resolvedUrl) {
      player.src = resolvedUrl;
      player.load();
    }
    void player.play().catch(() => onPlaybackError?.());
  };

  const seekTo = (seconds: number) => {
    const target = clamp(seconds, 0, Math.max(recordedDurationSeconds, 0));
    setCurrentTime(target);
    const player = audioRef.current;

    if (player && (sourceUrl || player.src)) {
      player.currentTime = target;
      void player.play().catch(() => onPlaybackError?.());
      return;
    }

    if (onSeekRequest) {
      onSeekRequest(target);
      return;
    }

    void onEnsureSource().then((resolvedUrl) => {
      if (!resolvedUrl || !audioRef.current) return;
      audioRef.current.src = resolvedUrl;
      audioRef.current.currentTime = target;
      void audioRef.current.play().catch(() => onPlaybackError?.());
    });
  };

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    seekTo(
      calculateSpeakingFlowSeekSeconds(
        event.clientX,
        bounds.left,
        bounds.width,
        timelineDurationSeconds,
      ),
    );
  };

  const handleTimelineKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      seekTo(currentTime + direction * 5);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      void playOrPause();
    }
  };

  const metrics = flow
    ? [
        {
          label: "Ortalama konuşma hızı",
          value:
            typeof flow.speakingRateWordsPerMinute === "number"
              ? `${flow.speakingRateWordsPerMinute} kelime/dk`
              : "—",
          Icon: Gauge,
        },
        {
          label: "Belirgin duraklama",
          value: `${formatDecimal(flow.noticeablePauseSeconds)} sn`,
          Icon: Pause,
        },
        {
          label: "Toplam duraklama",
          value: `${formatDecimal(flow.totalPauseSeconds)} sn`,
          Icon: Timer,
        },
      ]
    : [];

  return (
    <div
      data-speaking-flow-player="true"
      className="pb-4 text-[var(--tm-text-primary)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">Konuşma akışı</h3>
          <p
            data-speaking-measurement-scope="true"
            className="mt-0.5 text-[11px] leading-4 text-[var(--tm-text-secondary)]"
          >
            Bu ölçümler yalnızca bu cevap kaydına aittir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void playOrPause()}
          disabled={isLoading}
          className="inline-flex h-8 items-center gap-1.5 px-1 text-[12px] font-semibold text-[var(--tm-text-primary)] transition-opacity hover:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)] disabled:cursor-wait disabled:opacity-50"
          aria-label={isPlaying ? "Ses kaydını duraklat" : "Ses kaydını oynat"}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {isPlaying ? "Duraklat" : "Dinle"}
        </button>
      </div>

      <div
        data-speaking-flow-timeline="true"
        data-noticeable-pause-seconds={flow?.noticeablePauseSeconds ?? 0}
        data-recorded-duration-seconds={recordedDurationSeconds}
        data-allotted-duration-seconds={allottedDurationSeconds}
        data-unused-duration-seconds={unusedDurationSeconds}
        data-speaking-issue-range-count={issueTimeRanges.length}
        role="slider"
        tabIndex={0}
        aria-label="Ses kaydında ilerle"
        aria-valuemin={0}
        aria-valuemax={Math.round(recordedDurationSeconds)}
        aria-valuenow={Math.round(currentTime)}
        className="mt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)]"
        onPointerDown={(event) => {
          isScrubbingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (isScrubbingRef.current) seekFromPointer(event);
        }}
        onPointerUp={(event) => {
          isScrubbingRef.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          isScrubbingRef.current = false;
        }}
        onKeyDown={handleTimelineKeyDown}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="block h-12 w-full"
        />
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--tm-text-secondary)]">
          <span>{formatClock(currentTime)}</span>
          <span>{formatClock(timelineDurationSeconds)}</span>
        </div>
      </div>

      {unusedDurationSeconds > 0 ? (
        <p
          data-speaking-unused-time="true"
          className="mt-2 text-[12px] leading-5 text-[var(--tm-text-secondary)]"
        >
          Kullanılmayan süre: {formatClock(unusedDurationSeconds)}. Cevap erken
          tamamlandı.
        </p>
      ) : null}

      {metrics.length > 0 && (
        <div className="mt-3 grid gap-3 border-t border-[var(--tm-border-subtle)] pt-3 sm:grid-cols-3">
          {metrics.map(({ label, value, Icon }, index) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 ${
                index > 0 ? "sm:border-l sm:border-[var(--tm-border-subtle)] sm:pl-3" : ""
              }`}
            >
              <Icon
                className="h-4 w-4 shrink-0 text-[#b98512]"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[11px] leading-4 text-[var(--tm-text-secondary)]">
                  {label}
                </p>
                <p className="truncate text-[13px] font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        src={sourceUrl || undefined}
        preload="metadata"
        controlsList="nodownload"
        className="hidden"
        onLoadedMetadata={(event) => {
          const player = event.currentTarget;
          if (Number.isFinite(player.duration) && player.duration > 0) {
            setMediaDuration(player.duration);
          }
          onLoadedMetadata?.(player);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => {
          setIsPlaying(true);
          onPlaybackStart?.();
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => onPlaybackError?.()}
      />

      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
