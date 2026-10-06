import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Props = { src: string; durationSeconds: number };

const formatTime = (seconds: number) => {
  const value = Math.floor(Math.max(0, seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

function RecordingPlayer({ src, durationSeconds }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [error, setError] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const updateDuration = () => {
    const value = audioRef.current?.duration;
    // MediaRecorder WebM files may not contain a finite duration in their header.
    if (value && Number.isFinite(value)) setDuration(value);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError("");
    try {
      await audio.play();
    } catch {
      setError("Kayıt oynatılamadı. Tekrar deneyin.");
    }
  };

  return (
    <div className="mt-3 w-full max-w-xl rounded-lg border border-[#dededb] bg-white px-4 py-3" aria-label="Cevabınızı dinleyin">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        hidden
        onLoadedMetadata={updateDuration}
        onDurationChange={updateDuration}
        onTimeUpdate={() => setPosition(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPosition(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
        onError={() => { setPlaying(false); setError("Kayıt oynatılamadı. Tekrar deneyin."); }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={playing ? "Kaydı dinlemeyi duraklat" : "Kaydı dinle"}
          title={playing ? "Kaydı dinlemeyi duraklat" : "Kaydı dinle"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1f1ee] text-[#37352f] transition-colors hover:bg-[#e8e8e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
        >
          {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-xs tabular-nums text-[#787774]">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={Math.min(position, duration)}
            aria-label="Kayıtta ilerle"
            aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`}
            disabled={!duration || Boolean(error)}
            onChange={(event) => {
              const audio = audioRef.current;
              if (!audio) return;
              const value = Number(event.target.value);
              audio.currentTime = value;
              setPosition(value);
            }}
            className="block h-4 w-full cursor-pointer accent-[#37352f] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
          />
        </div>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function SpeakingPracticeAudioPlayer(props: Props) {
  // Switching questions or replacing an answer stops playback and resets the player.
  return <RecordingPlayer key={props.src} {...props} />;
}
