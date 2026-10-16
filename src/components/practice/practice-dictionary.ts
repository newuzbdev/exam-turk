import type { ReadingPracticeGlossaryEntry } from "@/services/readingPractice.service";

export type PracticeDictionaryEntry = Pick<
  ReadingPracticeGlossaryEntry,
  | "term"
  | "definition"
  | "baseForm"
  | "baseMeaning"
  | "simpleDefinition"
  | "occurrenceIndex"
>;
export type DictionaryCard = {
  term: string;
  baseForm?: string;
  baseMeaning?: string;
};

export function dictionaryParts(entry: PracticeDictionaryEntry) {
  let baseForm = entry.baseForm?.trim() || "";
  let baseMeaning = entry.baseMeaning?.trim() || "";
  const legacyText = entry.simpleDefinition?.trim() || "";
  if ((!baseForm || !baseMeaning) && legacyText) {
    const markerIndex = legacyText.indexOf(" Metindeki kullanımı:");
    const leadingText =
      markerIndex >= 0 ? legacyText.slice(0, markerIndex).trim() : legacyText;
    const baseMatch = leadingText.match(/^Temel biçim [“"](.+?)[”"]:\s*(.+)$/u);
    if (baseMatch) {
      if (!baseForm) baseForm = baseMatch[1].trim();
      if (!baseMeaning) baseMeaning = baseMatch[2].trim();
    } else if (!baseMeaning) baseMeaning = leadingText;
  }
  if (!baseMeaning) baseMeaning = entry.definition?.trim() || "";
  return { baseForm, baseMeaning };
}
