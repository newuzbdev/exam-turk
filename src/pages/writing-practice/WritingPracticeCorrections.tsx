import { Fragment, useState } from "react";
import type { WritingPracticeEvaluation } from "@/services/practice.types";

const labels = {
  GRAMMAR: "Dil bilgisi",
  SPELLING: "Yazım",
  PUNCTUATION: "Noktalama",
  VOCABULARY: "Kelime",
  REGISTER: "Üslup",
};

export default function WritingPracticeCorrections({
  evaluation,
}: {
  evaluation: WritingPracticeEvaluation;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  let cursor = 0;
  const pieces = evaluation.corrections.flatMap((correction, index) => {
    if (
      !Number.isInteger(correction.start) ||
      !Number.isInteger(correction.end) ||
      correction.start < cursor ||
      correction.end <= correction.start ||
      evaluation.answerText.slice(correction.start, correction.end) !==
        correction.original
    )
      return [];
    const before = evaluation.answerText.slice(cursor, correction.start);
    cursor = correction.end;
    return [
      <Fragment key={index}>
        {before}
        <span className="relative inline">
          <span
            role="button"
            tabIndex={0}
            aria-label={`Düzeltme: ${correction.original}`}
            aria-expanded={selected === index}
            onClick={() =>
              setSelected((value) => (value === index ? null : index))
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") setSelected(null);
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelected((value) => (value === index ? null : index));
              }
            }}
            title={correction.explanation}
            className="inline cursor-pointer rounded-[3px] bg-transparent px-0.5 text-left font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96]"
          >
            <del className="text-[#a33737] decoration-1">
              {correction.original}
            </del>{" "}
            {correction.corrected ? (
              <ins className="font-medium text-[#256b32] no-underline">
                {correction.corrected}
              </ins>
            ) : null}
          </span>
          {selected === index ? (
            <span
              role="tooltip"
              className="absolute left-0 top-full z-20 mt-1 block w-[250px] max-w-[70vw] whitespace-normal rounded-md border border-[#dededb] bg-white p-3 text-[13px] leading-5 text-[#37352f] shadow-lg"
            >
              <strong className="mb-1 block font-semibold">
                {labels[correction.kind]}
              </strong>
              {correction.explanation}
            </span>
          ) : null}
        </span>
      </Fragment>,
    ];
  });
  return (
    <div
      aria-label="Değerlendirilmiş cevabınız"
      className="h-full overflow-y-auto rounded-[4px] border border-[#dededb] bg-white px-5 py-4"
    >
      <p className="reading-passage-copy whitespace-pre-wrap break-words font-normal text-[#242424]">
        {pieces}
        {evaluation.answerText.slice(cursor)}
      </p>
      <div className="mt-6 space-y-3 border-t border-[#e5e5e2] pt-4 text-sm leading-6 text-[#5f5e5a]">
        <p>{evaluation.summary}</p>
        <p>
          <strong className="font-semibold text-[#2f6f3d]">
            Başarılı nokta:{" "}
          </strong>
          {evaluation.strongPoint}
        </p>
        <p>
          <strong className="font-semibold text-[#8c5a1b]">
            Geliştirme noktası:{" "}
          </strong>
          {evaluation.focusPoint}
        </p>
        {evaluation.criteria && evaluation.estimatedLevel ? (
          <section aria-label="Rubriğe göre değerlendirme" className="pt-1">
            <h3 className="font-semibold text-[#37352f]">
              Tahmini yazma düzeyi: {evaluation.estimatedLevel}
            </h3>
            <p className="mt-1">{evaluation.levelReason}</p>
            <p className="mt-1 text-xs leading-5 text-[#76746e]">
              Bu yazıya ait bir tahmindir; resmî sınav sonucu değildir.
            </p>
            <h4 className="mt-4 font-semibold text-[#37352f]">
              Rubriğe göre kısa değerlendirme
            </h4>
            <dl className="mt-2 divide-y divide-[#e5e5e2]">
              {[
                ["Görev ve içerik", evaluation.taskFeedback],
                ["Dil bilgisi", evaluation.criteria.grammar],
                ["Kelime kullanımı", evaluation.criteria.vocabulary],
                ["Tutarlılık ve düzen", evaluation.criteria.coherence],
                ["Üslup ve hitap", evaluation.criteria.register],
                [
                  "Yazım ve noktalama",
                  evaluation.criteria.spellingAndPunctuation,
                ],
              ].map(([label, feedback]) => (
                <div
                  key={label}
                  className="grid gap-0.5 py-2 sm:grid-cols-[145px_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="font-medium text-[#37352f]">{label}</dt>
                  <dd className="min-w-0">{feedback}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <p>
            <strong className="font-semibold text-[#37352f]">Görev: </strong>
            {evaluation.taskFeedback}
          </p>
        )}
        {evaluation.wordTargetFeedback ? (
          <p>
            <strong className="font-semibold text-[#37352f]">
              Kelime hedefi:{" "}
            </strong>
            {evaluation.wordTargetFeedback}
          </p>
        ) : null}
        <p>
          <strong className="font-semibold text-[#37352f]">
            Sonraki adım:{" "}
          </strong>
          {evaluation.nextStep}
        </p>
      </div>
    </div>
  );
}
