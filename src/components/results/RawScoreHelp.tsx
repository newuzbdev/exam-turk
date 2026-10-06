import { useId } from "react";
import { CircleHelp } from "lucide-react";

export default function RawScoreHelp({ rawScore, maximum, score, skill }: {
  rawScore: number;
  maximum: number;
  score: number;
  skill: "yazma" | "konuşma";
}) {
  const id = useId();
  const format = (value: number) => value.toLocaleString("tr-TR");

  return (
    <span className="group flex shrink-0 items-center gap-1.5">
      <span className="whitespace-nowrap text-[12px] font-medium tabular-nums">
        {format(rawScore)} / {maximum}
      </span>
      <button
        type="button"
        aria-label="Ham puan nedir?"
        aria-describedby={id}
        className="flex h-5 w-5 items-center justify-center rounded-sm hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="invisible absolute left-0 top-full z-30 mt-2 w-72 max-w-full rounded-[6px] border border-[var(--tm-border-subtle)] bg-white px-3 py-3 text-[13px] font-normal leading-5 text-[var(--tm-text-primary)] opacity-0 shadow-[0_8px_24px_rgba(15,15,15,0.12)] transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <strong className="mb-1 block font-semibold">Ham puan nedir?</strong>
        Her bölümdeki cevabınıza bir puan verilir. Bu puanlar toplanır. Bu toplama “ham puan” denir.
        <br /><br />
        Sonuç puanınız ise 75 üzerinden gösterilir. Ham puanınız, bir dönüşüm tablosuyla bu puana çevrilir.
        <br /><br />
        <strong className="font-semibold">Sizin sonucunuz: </strong>
        Toplam {format(rawScore)} / {format(maximum)} ham puan aldınız. Bunun karşılığı {format(score)} / 75 {skill} puanıdır.
      </span>
    </span>
  );
}
