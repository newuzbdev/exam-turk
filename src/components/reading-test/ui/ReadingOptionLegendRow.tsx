import { Check } from "lucide-react";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";

interface ReadingOptionLegendRowProps {
  letter: string;
  text: string;
  selectionCount: number;
  partNumber?: number;
  annotationId?: string;
}

export default function ReadingOptionLegendRow({
  letter,
  text,
  selectionCount,
  partNumber,
  annotationId,
}: ReadingOptionLegendRowProps) {
  return (
    <div
      className={`reading-option-legend grid min-h-10 grid-cols-[minmax(0,1fr)_18px] items-start gap-x-2 rounded-md px-2.5 py-2 ${
        selectionCount > 0 ? "bg-[#f1f1ef] text-[#8a8881]" : "text-[#37352f]"
      }`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="reading-option-letter shrink-0 font-semibold tabular-nums">
          {letter}.
        </span>
        <span className="reading-text reading-option-copy min-w-0 font-normal">
          <HighlightableText
            text={fixMojibake(text)}
            partNumber={partNumber}
            annotationId={annotationId || `option:${letter}`}
            as="span"
            wrapperAs="span"
          />
        </span>
      </span>
      {selectionCount > 1 ? (
        <span className="mt-0.5 text-center text-[#8a8881]" aria-label="Birden fazla soruda seçildi">?</span>
      ) : selectionCount === 1 ? (
        <Check className="mt-1 h-4 w-4 shrink-0 text-[#8a8881]" aria-label="Bir soruda seçildi" />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
