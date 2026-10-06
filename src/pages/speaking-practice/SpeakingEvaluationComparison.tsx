import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  SpeakingPracticeComparisonEvaluation,
  SpeakingPracticeEvaluationComparison,
} from "@/services/practice.types";

type ComparisonKey = keyof SpeakingPracticeEvaluationComparison["evaluations"];

const comparisonLabels: Record<ComparisonKey, { note: string }> = {
  geminiDirectAudio: {
    note: "Doğrudan ses",
  },
  geminiFlashSharedTranscript: {
    note: "Ortak transkript",
  },
  openAiSharedTranscript: {
    note: "Ortak transkript",
  },
};

const comparisonOrder: ComparisonKey[] = [
  "geminiDirectAudio",
  "geminiFlashSharedTranscript",
  "openAiSharedTranscript",
];

const formatModelName = (model: string) => {
  if (model === "gemini-3.8-flash") return "Gemini 3.8 Flash";
  if (model === "gemini-3.5-flash-lite") return "Gemini 3.5 Flash-Lite";
  if (model.startsWith("gpt-5.6-sol")) return "GPT-5.6 Sol";
  return model;
};

const formatCost = (value: number | null) =>
  value === null ? "—" : `$${value.toFixed(value < 0.01 ? 5 : 4)}`;

const formatTokens = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("tr-TR") : "—";

function EvaluationCard({
  comparisonKey,
  evaluation,
  selected,
  onSelect,
}: {
  comparisonKey: ComparisonKey;
  evaluation: SpeakingPracticeComparisonEvaluation;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = comparisonLabels[comparisonKey];
  const result = evaluation.result;
  const sectionScore = result.sectionScore ?? 0;

  return (
    <article
      className={`flex min-w-0 flex-col rounded-lg border bg-white p-4 shadow-sm ${
        selected ? "border-[#242424] ring-1 ring-[#242424]" : "border-[#dededb]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{formatModelName(evaluation.model)}</h3>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#787774]">
            {label.note}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">
            {sectionScore.toLocaleString("tr-TR")} / {result.maximumScore ?? "—"}
          </p>
          <p className="text-xs text-[#787774]">Yaklaşık {result.estimatedLevel}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-[#f7f7f5] px-3 py-2.5 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#787774]">Token</p>
          <p className="mt-0.5 text-sm font-semibold">{formatTokens(evaluation.usage.totalTokens)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#787774]">Süre</p>
          <p className="mt-0.5 text-sm font-semibold">{(evaluation.latencyMs / 1000).toFixed(1)} sn</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#787774]">Model ücreti</p>
          <p className="mt-0.5 text-sm font-semibold">{formatCost(evaluation.estimatedModelCostUsd)}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#37352f]">{result.summary}</p>

      <div className="mt-4 space-y-3 border-t border-[#eeeeec] pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">Puan gerekçesi</p>
          <p className="mt-1 text-sm leading-6">{result.scoreRationale}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">Güçlü yön</p>
          <p className="mt-1 text-sm leading-6">{result.strongPoint}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#787774]">En önemli eksik</p>
          <p className="mt-1 text-sm leading-6">{result.focusPoint}</p>
        </div>
      </div>

      <details className="mt-4 border-t border-[#eeeeec] pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Ölçütleri ve cevapları gör</summary>
        <div className="mt-3 space-y-3 text-sm leading-6">
          <p><strong>Görev:</strong> {result.criteria?.taskAchievement}</p>
          <p><strong>Akıcılık:</strong> {result.criteria?.fluencyAndCoherence}</p>
          <p><strong>Kelime:</strong> {result.criteria?.vocabulary}</p>
          <p><strong>Dil bilgisi:</strong> {result.criteria?.grammar}</p>
          <p><strong>Telaffuz:</strong> {result.criteria?.pronunciationAndIntelligibility}</p>
          {result.answers?.map((answer, index) => (
            <div key={`${comparisonKey}-${index}`} className="rounded-md border border-[#e8e8e5] p-3">
              <p className="font-semibold">{index + 1}. cevap</p>
              <p className="mt-1 text-[#5f5e5a]">“{answer.heardAnswer}”</p>
              <p className="mt-2">{answer.feedback}</p>
              <p className="mt-2 border-t border-[#eeeeec] pt-2"><strong>Daha iyi hâli:</strong> {answer.improvedAnswer}</p>
            </div>
          ))}
        </div>
      </details>

      <Button
        type="button"
        variant={selected ? "default" : "outline"}
        className={`mt-4 w-full ${selected ? "bg-[#37352f] text-white hover:bg-[#242424]" : ""}`}
        onClick={onSelect}
      >
        {selected ? <Check className="mr-2 h-4 w-4" /> : null}
        {selected ? "En iyi sonuç olarak işaretlendi" : "Bu sonuç daha iyi"}
      </Button>
    </article>
  );
}

function EvaluationFailureCard({
  comparisonKey,
  message,
}: {
  comparisonKey: ComparisonKey;
  message: string;
}) {
  const modelName = comparisonKey === "openAiSharedTranscript"
    ? "OpenAI"
    : "Gemini 3.8 Flash";

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-[#e2c6c3] bg-[#fff9f8] p-4">
      <h3 className="text-lg font-semibold">{modelName}</h3>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#787774]">
        {comparisonLabels[comparisonKey].note}
      </p>
      <p className="mt-4 text-sm leading-6 text-[#6b2f2b]">{message}</p>
    </article>
  );
}

export function SpeakingEvaluationComparison({
  comparison,
  comparing,
  onCompareAgain,
  onRestart,
}: {
  comparison: SpeakingPracticeEvaluationComparison;
  comparing: boolean;
  onCompareAgain: () => void;
  onRestart: () => void;
}) {
  const [selected, setSelected] = useState<ComparisonKey | null>(null);

  return (
    <section className="mt-6 w-full max-w-[1480px]" aria-label="AI değerlendirme karşılaştırması">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">AI değerlendirme karşılaştırması</h2>
          <p className="mt-1 text-sm leading-6 text-[#5f5e5a]">
            İlk sütun sesi doğrudan dinler. Diğer iki sütun aynı Deepgram transkriptini kullanır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={comparing}
            onClick={onCompareAgain}
          >
            {comparing ? "Karşılaştırılıyor…" : "Aynı kayıtlarla tekrar karşılaştır"}
          </Button>
          <Button type="button" variant="outline" disabled={comparing} onClick={onRestart}>
            Yeni kayıtla karşılaştır
          </Button>
        </div>
      </div>

      <details className="mt-4 rounded-md border border-[#dededb] bg-[#fafaf9] px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Modellere verilen ortak transkripti gör</summary>
        <div className="mt-3 space-y-3">
          {comparison.transcripts.map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-md bg-white px-3 py-3 text-sm leading-6">
              <p className="font-semibold">{item.question}</p>
              <p className="mt-1 text-[#454440]">{item.text}</p>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {comparisonOrder.map((key) => {
          const evaluation = comparison.evaluations[key];
          if (evaluation) {
            return (
              <EvaluationCard
                key={key}
                comparisonKey={key}
                evaluation={evaluation}
                selected={selected === key}
                onSelect={() => setSelected(key)}
              />
            );
          }
          const message = comparison.errors?.[key];
          return message ? (
            <EvaluationFailureCard
              key={`${key}-failure`}
              comparisonKey={key}
              message={message}
            />
          ) : null;
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-[#787774]">
        Maliyetler {comparison.pricingSnapshot} tarihli model liste fiyatlarına göre yaklaşık hesaplanır; ortak transkript kullanan sütunlara Deepgram ücreti dahil değildir.
      </p>
    </section>
  );
}
