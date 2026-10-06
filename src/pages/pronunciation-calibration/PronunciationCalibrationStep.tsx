import {
  ArrowRight,
  CheckCircle2,
  CircleStop,
  Mic,
  RotateCcw,
} from "lucide-react";

import { tm } from "@/components/tm";
import { cn } from "@/lib/utils";

export type CalibrationVariant = "normal" | "contrast";

export type CalibrationPrompt = {
  id: string;
  focus: string;
  normalText: string;
  contrastInstruction: string;
  contrastText: string;
};

export type CalibrationSlotState = {
  status: "idle" | "recording" | "saving" | "saved" | "error";
  audioUrl: string | null;
  durationSeconds: number;
  error: string | null;
};

type PronunciationCalibrationStepProps = {
  prompt: CalibrationPrompt;
  stepNumber: number;
  totalSteps: number;
  normalSlot: CalibrationSlotState;
  contrastSlot: CalibrationSlotState;
  activeVariant: CalibrationVariant | null;
  onStart: (variant: CalibrationVariant) => void;
  onStop: () => void;
  onReset: (variant: CalibrationVariant) => void;
  onNext: () => void;
};

type RecordingSlotProps = {
  variant: CalibrationVariant;
  title: string;
  description: string;
  text: string;
  state: CalibrationSlotState;
  activeVariant: CalibrationVariant | null;
  onStart: (variant: CalibrationVariant) => void;
  onStop: () => void;
  onReset: (variant: CalibrationVariant) => void;
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `00:${String(safeSeconds).padStart(2, "0")}`;
};

function RecordingSlot({
  variant,
  title,
  description,
  text,
  state,
  activeVariant,
  onStart,
  onStop,
  onReset,
}: RecordingSlotProps) {
  const isActive = activeVariant === variant && state.status === "recording";
  const anotherRecordingIsActive = activeVariant !== null && !isActive;
  const isBusy = state.status === "saving" || anotherRecordingIsActive;

  return (
    <section className="rounded-lg border border-[var(--tm-border-subtle)] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--tm-text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--tm-text-secondary)]">
            {description}
          </p>
        </div>
        {state.status === "saved" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
            Kaydedildi
          </span>
        ) : null}
      </div>

      <p className="mt-4 rounded-md bg-[var(--tm-bg-muted)] px-4 py-4 text-[17px] font-medium leading-7 text-[var(--tm-text-primary)] sm:text-lg">
        {text}
      </p>

      <div className="mt-4">
        {state.status === "saved" && state.audioUrl ? (
          <div className="space-y-3">
            <audio className="h-10 w-full" controls preload="metadata" src={state.audioUrl}>
              Tarayıcınız ses oynatmayı desteklemiyor.
            </audio>
            <button
              type="button"
              onClick={() => onReset(variant)}
              disabled={anotherRecordingIsActive}
              className={`${tm.subtleButton} inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.1} />
              Tekrar kaydet
            </button>
          </div>
        ) : isActive ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <CircleStop className="h-4 w-4" fill="currentColor" />
            Kaydı durdur · {formatDuration(state.durationSeconds)}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStart(variant)}
            disabled={isBusy}
            className={cn(
              tm.primaryButton,
              "inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            <Mic className="h-4 w-4" strokeWidth={2.1} />
            {state.status === "saving" ? "Kaydediliyor…" : "Kaydı başlat"}
          </button>
        )}
        {state.error ? (
          <p className="mt-3 text-sm font-medium text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function PronunciationCalibrationStep({
  prompt,
  stepNumber,
  totalSteps,
  normalSlot,
  contrastSlot,
  activeVariant,
  onStart,
  onStop,
  onReset,
  onNext,
}: PronunciationCalibrationStepProps) {
  const canContinue =
    normalSlot.status === "saved" && contrastSlot.status === "saved";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--tm-accent)]">
            Cümle {stepNumber} / {totalSteps}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {prompt.focus}
          </h1>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tm-bg-muted)] sm:w-44"
          role="progressbar"
          aria-label="Kalibrasyon ilerlemesi"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={stepNumber}
        >
          <div
            className="h-full rounded-full bg-[var(--tm-accent)] transition-[width]"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecordingSlot
          variant="normal"
          title="Normal okuma"
          description="Cümleyi doğal ve rahat biçimde okuyun."
          text={prompt.normalText}
          state={normalSlot}
          activeVariant={activeVariant}
          onStart={onStart}
          onStop={onStop}
          onReset={onReset}
        />
        <RecordingSlot
          variant="contrast"
          title="Karşılaştırma okuması"
          description={prompt.contrastInstruction}
          text={prompt.contrastText}
          state={contrastSlot}
          activeVariant={activeVariant}
          onStart={onStart}
          onStop={onStop}
          onReset={onReset}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className={`${tm.primaryButton} inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}
        >
          Sonraki cümle
          <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
}
