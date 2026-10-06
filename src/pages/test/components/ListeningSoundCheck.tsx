import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Play, Volume2 } from "lucide-react";
import { getSiteAudioUrl } from "@/services/siteMedia.service";

type Stage = "loading" | "idle" | "playing" | "listened" | "confirming" | "confirmed" | "error";

export default function ListeningSoundCheck({ onReadyChange, disabled = false }: {
  onReadyChange: (ready: boolean) => void;
  disabled?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const confirmationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    onReadyChange(false);
    setStage("loading");
    void getSiteAudioUrl("audio/listening-sound-check-tr-v1").then((url) => {
      if (!mounted) return;
      setAudioUrl(url);
      setStage("idle");
    }).catch(() => {
      if (mounted) setStage("error");
    });
    return () => {
      mounted = false;
      playingRef.current = false;
      if (confirmationTimerRef.current !== null) {
        window.clearTimeout(confirmationTimerRef.current);
        confirmationTimerRef.current = null;
      }
      audioRef.current?.pause();
    };
  }, [loadAttempt, onReadyChange]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      playingRef.current = false;
      audio?.pause();
    };
  }, [audioUrl]);

  const failPlayback = () => {
    playingRef.current = false;
    onReadyChange(false);
    setStage("error");
  };

  const listen = () => {
    if (disabled || playingRef.current) return;
    onReadyChange(false);
    const audio = audioRef.current;
    if (!audioUrl || !audio || stage === "error") {
      setAudioUrl(null);
      setLoadAttempt((attempt) => attempt + 1);
      return;
    }
    try {
      audio.currentTime = 0;
      audio.volume = 0.8;
      playingRef.current = true;
      setStage("playing");
      // The URL is already available, so play retains the click's user gesture.
      void audio.play().catch(() => {
        if (playingRef.current) failPlayback();
      });
    } catch {
      failPlayback();
    }
  };

  return (
    <>
      <div className="section-ready-sound-check" data-confirmed={stage === "confirmed" || undefined}>
        <h2 id="section-ready-sound-title" aria-live="polite" className={stage === "confirmed" ? "section-ready-sound-confirmed" : undefined}>
          {stage === "confirmed" && <CheckCircle2 size={18} aria-hidden="true" />}
          {stage === "confirmed" ? "Ses hazır" : "Sesi kontrol edin"}
        </h2>
        <div className="section-ready-sound-actions">
          <button type="button" className={stage === "confirmed" ? "section-ready-mic-retry" : "section-ready-sound-play"}
            onClick={listen} disabled={disabled || stage === "loading" || stage === "playing"}
            aria-label={stage === "playing" ? "Deneme sesi çalıyor" : "Deneme sesini dinle"}>
            {stage !== "confirmed" && <span className="section-ready-sound-play-icon" aria-hidden="true">
              {stage === "playing" ? <Volume2 size={15} /> : <Play size={15} />}
            </span>}
            {stage === "loading" ? "Hazırlanıyor…" : stage === "playing" ? "Çalıyor…" : stage === "confirmed" ? "Tekrar dene" : stage === "listened" ? "Tekrar dinle" : stage === "error" ? "Tekrar dene" : "Dinle"}
          </button>
          {(stage === "listened" || stage === "confirming") && <button type="button" className="mic-check-player-button mic-check-player-confirm" disabled={disabled || stage === "confirming"}
            data-confirmed={stage === "confirming" || undefined}
            onClick={() => {
              setStage("confirming");
              confirmationTimerRef.current = window.setTimeout(() => {
                confirmationTimerRef.current = null;
                setStage("confirmed");
                onReadyChange(true);
              }, 500);
            }}>
            <span className="mic-check-confirm-marker" aria-hidden="true">
              {stage === "confirming" && <Check size={16} strokeWidth={2.5} />}
            </span>
            Sesi onayla
          </button>}
        </div>
      </div>
      {stage === "error" && <p className="section-ready-error section-ready-sound-error" role="alert">Deneme sesi çalınamadı. Yeniden deneyin.</p>}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" onError={failPlayback} onEnded={() => {
        if (!playingRef.current) return;
        playingRef.current = false;
        setStage("listened");
      }} />}
    </>
  );
}
