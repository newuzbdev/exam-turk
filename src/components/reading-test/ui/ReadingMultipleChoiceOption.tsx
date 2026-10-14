import type { ReadingReviewOptionState } from "@/components/results/ReadingReviewContext";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";

interface ReadingMultipleChoiceOptionProps {
  letter: string;
  text: string;
  selected: boolean;
  reviewState: ReadingReviewOptionState;
  partNumber?: number;
  annotationId?: string;
  onSelect: () => void;
}

export default function ReadingMultipleChoiceOption({
  letter,
  text,
  selected,
  reviewState,
  partNumber,
  annotationId,
  onSelect,
}: ReadingMultipleChoiceOptionProps) {
  const rowTone =
    reviewState === "correct"
      ? "text-[#2f6f3d]"
      : reviewState === "incorrect"
        ? "text-[#a33737]"
        : selected
          ? "bg-[#f7f7f5] text-[#37352f]"
          : "text-[#37352f]";

  const isCorrectReviewSelection = selected && reviewState === "correct";
  const ringTone = isCorrectReviewSelection
    ? "border-[#438553]"
    : selected
      ? "border-[#5f5e5a]"
      : "border-[#a9a7a1]";

  const dotTone = isCorrectReviewSelection
    ? "bg-[#438553]"
    : selected
      ? "bg-[#5f5e5a]"
      : "bg-transparent";

  return (
    <div
      data-reading-review-option-state={reviewState}
      className={`reading-option-row grid min-h-10 w-full items-start gap-x-2 rounded-md px-2.5 py-2 text-left transition-colors ${rowTone}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${letter}. ${fixMojibake(text)}`}
        data-answer-control="true"
        className="reading-option-radio-slot rounded transition-colors hover:bg-[#eeeeeb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
        onClick={onSelect}
      >
        <span aria-hidden="true">
          <span
            className={`reading-option-radio-ring rounded-full border-[1.5px] ${ringTone}`}
          >
            <span className={`reading-option-radio-dot rounded-full ${dotTone}`} />
          </span>
        </span>
      </button>
      <span className="flex min-w-0 items-baseline gap-2">
        <button
          type="button"
          className="reading-option-letter shrink-0 cursor-pointer font-semibold text-left"
          onClick={onSelect}
          aria-label={`${letter} seçeneğini işaretle`}
        >
          {letter}.
        </button>
        <span className="reading-text reading-option-copy min-w-0 font-normal">
          <HighlightableText
            text={fixMojibake(text)}
            partNumber={partNumber}
            annotationId={annotationId || `option:${letter}`}
            onPlainClick={onSelect}
            as="span"
            wrapperAs="span"
          />
        </span>
      </span>
    </div>
  );
}
