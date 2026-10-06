import { useEffect, useState } from "react";
import { AlertCircle, FlaskConical, Loader2, RefreshCw } from "lucide-react";

import {
  pronunciationAnalysisService,
  type SpeakingEvidenceAnalysisResponse,
  type SpeakingEvidenceStatus,
} from "@/services/pronunciationAnalysis.service";

type PilotAudio = {
  audioId?: string | null;
  hasAudio?: boolean;
};

type PronunciationPilotPanelProps = {
  submissionId?: string | null;
  sectionKey: string;
  audios: PilotAudio[];
  onSeekAudio?: (audio: PilotAudio, startSeconds: number) => void;
  lockedAssessment?: unknown;
};

type PronunciationEvidenceContentProps = {
  result: SpeakingEvidenceAnalysisResponse;
  sectionKey: string;
};

const STATUS_LABELS: Record<SpeakingEvidenceStatus, string> = {
  RELIABLE: "Güvenilir kanıt",
  LIMITED: "Sınırlı kanıt",
  UNAVAILABLE: "Kanıt kullanılamıyor",
};

const NEUTRAL_PRONUNCIATION_COPY =
  "Bu pilot sonucunda telaffuz resmî puana dahil edilmedi; güvenilir tanısal kanıt bulunmadığı için ek değerlendirme yapılmadı.";

const SAFE_ERROR_MESSAGE =
  "Telaffuz analizi tamamlanamadı. Daha sonra yeniden deneyebilirsiniz.";

export function PronunciationEvidenceContent({
  result,
  sectionKey,
}: PronunciationEvidenceContentProps) {
  const recordings = result.recordings.filter(
    (recording) => recording.sectionKey === sectionKey,
  );
  if (recordings.length === 0) {
    return (
      <p className="text-sm leading-6 text-neutral-600">
        Bu bölüm için güvenilir tanısal kanıt bulunmuyor. Bu durum resmî puanı
        değiştirmez.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => {
        const transcript =
          recording.resolvedTranscript.trustedText ||
          recording.resolvedTranscript.displayText;
        const criterion =
          recording.pronunciation.criterionText || NEUTRAL_PRONUNCIATION_COPY;
        return (
          <article
            key={recording.audioId}
            className="rounded-md border border-neutral-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-950">
                Telaffuz ve anlaşılabilirlik
              </h3>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                {STATUS_LABELS[recording.status]}
              </span>
            </div>
            {transcript && (
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                {transcript}
              </p>
            )}
            <p className="mt-3 text-sm leading-6 text-[#6f582f]">{criterion}</p>
          </article>
        );
      })}
    </div>
  );
}

export default function PronunciationPilotPanel({
  submissionId,
  sectionKey,
  lockedAssessment = null,
}: PronunciationPilotPanelProps) {
  const [result, setResult] = useState<SpeakingEvidenceAnalysisResponse | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    pronunciationAnalysisService
      .get(submissionId, lockedAssessment)
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lockedAssessment, submissionId]);

  if (!submissionId || !result || !result.available) return null;

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError("");
    try {
      setResult((current) =>
        current ? { ...current, status: "RUNNING" } : current,
      );
      setResult(
        await pronunciationAnalysisService.analyze(
          submissionId,
          lockedAssessment,
        ),
      );
    } catch {
      setError(SAFE_ERROR_MESSAGE);
      try {
        setResult(
          await pronunciationAnalysisService.get(
            submissionId,
            lockedAssessment,
          ),
        );
      } catch {
        // Keep the last closed response if refreshing also fails.
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const running = isAnalyzing || result.status === "RUNNING";

  return (
    <section
      data-pronunciation-pilot
      className="overflow-hidden rounded-md border border-[#e6d6b7] bg-[var(--tm-cat-speaking-bg)]"
      aria-labelledby="pronunciation-pilot-title"
    >
      <div className="border-b border-[#e6d6b7] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#dac393] bg-white/70 text-[var(--tm-cat-speaking-fg)]">
              <FlaskConical aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="pronunciation-pilot-title"
                className="text-base font-semibold text-[var(--tm-cat-speaking-fg)]"
              >
                Telaffuz ve anlaşılabilirlik
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#6f582f]">
                Bu tanısal çalışma resmî konuşma puanınızı değiştirmez.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#d8bd84] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#6f582f]">
            Deneysel · puana dahil değil
          </span>
        </div>

        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={running}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-[#745b2d] bg-[#745b2d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#624c25] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b2d]/40 focus-visible:ring-offset-2"
        >
          {running ? (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          ) : result.status === "COMPLETED" ? (
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
          ) : (
            <FlaskConical aria-hidden="true" className="mr-2 h-4 w-4" />
          )}
          {running
            ? "Kayıtlar analiz ediliyor…"
            : result.status === "COMPLETED"
              ? "Yeniden analiz et"
              : "Telaffuzu analiz et"}
        </button>
        {error && (
          <p
            className="mt-3 flex items-start gap-2 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            {error}
          </p>
        )}
      </div>

      {result.status === "COMPLETED" && (
        <div className="bg-white px-4 py-4 sm:px-5">
          <PronunciationEvidenceContent
            result={result}
            sectionKey={sectionKey}
          />
        </div>
      )}
    </section>
  );
}
