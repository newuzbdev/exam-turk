// Turkish texts can contain straight or typographic apostrophes depending on
// where the content was authored. Keep the suffix with the visible word so a
// contextual glossary row such as "Norveç’in" remains one clickable target.
export const dictionaryWordPattern =
  /\p{L}+(?:['\u2019\u02BC\u0060\u00B4-]\p{L}+)*/gu;

const dictionaryWordSplitPattern = new RegExp(
  `(${dictionaryWordPattern.source})`,
  dictionaryWordPattern.flags,
);

export const normalizeWordKey = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşüâîû\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const splitDictionaryText = (value: string) =>
  value.split(dictionaryWordSplitPattern).filter(Boolean);

export const wordOccurrenceAt = (
  text: string,
  rawWord: string,
  characterIndex: number,
) => {
  const target = normalizeWordKey(rawWord);
  if (!target) return 1;

  let occurrence = 0;
  for (const match of text.matchAll(dictionaryWordPattern)) {
    if (normalizeWordKey(match[0]) !== target) continue;
    occurrence += 1;
    if (Number(match.index || 0) >= characterIndex) return occurrence;
  }

  return Math.max(1, occurrence);
};
