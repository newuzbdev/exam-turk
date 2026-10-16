import { Fragment } from "react";
import { X } from "lucide-react";
import {
  dictionaryParts,
  type PracticeDictionaryEntry,
  type DictionaryCard,
} from "./practice-dictionary";
import {
  normalizeWordKey,
  splitDictionaryText,
  wordOccurrenceAt,
} from "@/pages/reading-practice/reading-practice-dictionary";

export function PracticeDictionaryCard({
  selected,
  onClose,
  className = "bottom-4 z-50",
}: {
  selected: DictionaryCard | null;
  onClose: () => void;
  className?: string;
}) {
  return (
    <aside
      aria-label="Sözlük"
      className={`fixed left-4 right-4 max-h-[42dvh] overflow-y-auto rounded-[4px] border border-[#d4d4cf] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.12)] sm:left-auto sm:w-[360px] ${className}`}
    >
      <div className="sticky top-0 flex items-center justify-between gap-3 bg-white pb-3 text-[#242424]">
        <div className="min-w-0 truncate text-xl font-semibold leading-7">
          {selected?.term || "Bir kelime seçin"}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b7783] hover:bg-[#eef3f5]"
          aria-label="Sözlük kartını kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {selected ? (
        <div className="border-t border-[#e5e5e2] pt-4 text-[#242424]">
          <p className="text-sm leading-6">
            {selected.baseForm ? (
              <>
                <strong>Temel biçim:</strong> {selected.baseForm}
                <br />
              </>
            ) : null}
            {selected.baseMeaning ? (
              <>
                <strong>Anlamı:</strong> {selected.baseMeaning}
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-5 text-[#667480]">
          Metindeki bir kelimeye tıkladığınızda anlamı burada
          görünür.
        </p>
      )}
    </aside>
  );
}

export function PracticeDictionaryText({
  text,
  source,
  offset,
  entries,
  selectedTerm,
  onSelect,
}: {
  text: string;
  source: string;
  offset: number;
  entries: PracticeDictionaryEntry[];
  selectedTerm?: string;
  onSelect: (entry: DictionaryCard) => void;
}) {
  let cursor = offset;
  return (
    <>
      {splitDictionaryText(text).map((word, index) => {
        const start = cursor;
        cursor += word.length;
        const matches = entries.filter(
          (entry) => normalizeWordKey(entry.term) === normalizeWordKey(word),
        );
        const occurrence = wordOccurrenceAt(source, word, start);
        const entry =
          matches.find((item) => item.occurrenceIndex === occurrence) ||
          matches.find((item) => item.occurrenceIndex == null);
        if (!entry) return <Fragment key={index}>{word}</Fragment>;
        const parts = dictionaryParts(entry);
        return (
          <button
            key={index}
            type="button"
            aria-label={`${word}: ${parts.baseMeaning}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ term: word, ...parts });
            }}
            className={`practice-dictionary-word cursor-pointer rounded-sm text-inherit hover:underline hover:decoration-black hover:underline-offset-2 focus-visible:underline focus-visible:underline-offset-2 ${normalizeWordKey(selectedTerm || "") === normalizeWordKey(word) ? "bg-[#dff2c5]" : ""}`}
          >
            {word}
          </button>
        );
      })}
    </>
  );
}
