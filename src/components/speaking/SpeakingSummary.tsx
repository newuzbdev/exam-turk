import { resolveSpeakingResultDisplay } from "./speaking-result-display";
import { sanitizeSpeakingLearnerCopy } from "./speaking-learner-copy";
import RawScoreHelp from "../results/RawScoreHelp";

type SpeakingSummaryProps = {
  data?: Record<string, unknown> | null;
  presentationFeedback?: unknown;
  score?: number | string | null;
  level?: string | null;
  status?: string | null;
  mode?: "full" | "general-only";
};

const SPEAKING_RAW_MAXIMUM = 21;

const finiteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const unwrapFeedback = (value: unknown): Record<string, unknown> => {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return {};
    }
    const record = current as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      current = record.data;
      continue;
    }
    if (record.aiFeedback && typeof record.aiFeedback === "object") {
      current = record.aiFeedback;
      continue;
    }
    return record;
  }
  return (current as Record<string, unknown>) || {};
};

export default function SpeakingSummary({
  data,
  presentationFeedback,
  score,
  level,
  status,
  mode = "full",
}: SpeakingSummaryProps) {
  const officialFeedback = unwrapFeedback(data?.aiFeedback);
  const presentation = unwrapFeedback(
    presentationFeedback ?? data?.aiFeedback,
  );
  const evaluationStatus = String(
    status ??
      data?.evaluationStatus ??
      officialFeedback.evaluationStatus ??
      "",
  ).toUpperCase();
  const officialScore =
    score === undefined
      ? officialFeedback.cefr_puan ?? data?.score
      : score;
  const display = resolveSpeakingResultDisplay({
    status: evaluationStatus,
    score:
      typeof officialScore === "number" || typeof officialScore === "string"
        ? officialScore
        : null,
    storedLevel:
      typeof officialFeedback.seviye === "string"
        ? officialFeedback.seviye
        : level,
  });
  const rawScore = finiteNumber(officialFeedback.ham_puan);
  const belowLevelMatch = display.level.match(/^(.+?)\s+altı$/i);
  const structured =
    presentation.genel_degerlendirme_yapilandirilmis ??
    presentation.generalStructured ??
    presentation.general_structured;
  const structuredSummary =
    structured && typeof structured === "object" && !Array.isArray(structured)
      ? sanitizeSpeakingLearnerCopy(
          (structured as Record<string, unknown>).ozet,
        )
      : "";
  const general =
    structuredSummary ||
    sanitizeSpeakingLearnerCopy(
      presentation.genel_degerlendirme ??
        presentation.general ??
        presentation.generalFeedback,
    ) ||
    "Bu sonuç için genel değerlendirme bulunmuyor.";
  const generalOnly = mode === "general-only";

  return (
    <div
      data-speaking-summary
      data-summary-mode={mode}
      className={`grid gap-3 ${generalOnly ? "grid-cols-1" : "lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.7fr)] lg:grid-rows-2"}`}
    >
      {!generalOnly && <section className="relative z-10 order-2 flex min-h-[96px] flex-col justify-between rounded-[12px] border border-[#e6d6b7] bg-[var(--tm-cat-speaking-bg)] px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="whitespace-nowrap text-[13px] font-semibold leading-5 text-[#292724]">
            Konuşma puanı
          </span>
          {display.score !== null && rawScore !== null && (
            <div className="text-[#5f5a54]">
              <RawScoreHelp rawScore={rawScore} maximum={SPEAKING_RAW_MAXIMUM} score={display.score} skill="konuşma" />
            </div>
          )}
        </div>
        <div className="flex items-end self-start gap-1.5">
          <span className="text-[36px] font-semibold leading-none tabular-nums text-[#292724]">
            {display.score ?? "—"}
          </span>
          {display.score !== null && (
            <span className="pb-0.5 text-[13px] font-medium text-[#716b63]">
              / 75
            </span>
          )}
        </div>
      </section>}

      {!generalOnly && <section className="order-1 flex min-h-[96px] flex-col justify-between rounded-[12px] border border-[#ded9d2] bg-[#f7f5f2] px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-1">
        <span className="text-[13px] font-semibold leading-5 text-[#292724]">
          Seviye
        </span>
        <span className="flex items-baseline gap-1.5 self-start text-left font-semibold leading-none text-[#292724]">
          {belowLevelMatch ? (
            <>
              <span className="text-[34px]">{belowLevelMatch[1]}</span>
              <span className="text-[16px] font-semibold text-[#5f5a54]">altı</span>
            </>
          ) : (
            <span className="text-[34px]">{display.level}</span>
          )}
        </span>
      </section>}

      <section data-speaking-general-evaluation data-evaluation-tone="neutral" className={`order-3 rounded-[8px] border border-[#dddcd8] bg-[#f3f3f1] px-5 py-4 shadow-[var(--tm-shadow-card)] ${generalOnly ? "min-h-[148px]" : "min-h-[204px] lg:col-start-2 lg:row-span-2 lg:row-start-1"}`}>
        <h2 className="text-[13px] font-semibold leading-5 text-[#2f2f2d]">
          Genel değerlendirme
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-[14px] font-normal leading-6 text-[#454541]">
          {general}
        </p>
      </section>
    </div>
  );
}
