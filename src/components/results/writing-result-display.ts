const preservePublicLevel = (value: string) =>
  value.replace(/\bB1\s*alt[ıi]\b/gi, "__TM_B1_BELOW__");

export const normalizeWritingFeedbackForDisplay = (value?: unknown) => {
  const source = String(value || "").trim();
  if (!source) return "";

  return preservePublicLevel(source)
    .replace(/\b(?:yüksek|düşük|alt|üst)\s+B1\b/gi, "B1")
    .replace(/\bB1\s+(?:yüksek|düşük)\b/gi, "B1")
    .replace(/\bB1\s+ve\s+üzeri/gi, "B1")
    .replace(/\b(?:yüksek|düşük|alt|üst)\s+B2\b/gi, "B2")
    .replace(/\bB2\s+(?:yüksek|düşük|alt[ıi])\b/gi, "B2")
    .replace(/\bB2\s+ve\s+üzeri/gi, "B2")
    .replace(/\bC1\s*(?:üstü|\+)/gi, "C1")
    .replace(/\bC2\b/gi, "C1")
    .replace(/\bA[012]\b/gi, "B1 altı")
    .replace(/daha\s+üst\s+bantlara\s+ulaşmak\s+için/gi, (match) =>
      /^[A-ZÇĞİÖŞÜ]/.test(match)
        ? "Puanınızı yükseltmek için"
        : "puanınızı yükseltmek için",
    )
    .replace(
      /resm[iî]\s+ya\s+da\s+akademik\s+görevlerde/gi,
      (match) =>
        /^[A-ZÇĞİÖŞÜ]/.test(match)
          ? "Resmî mektup ve Bölüm 2 yazısında"
          : "resmî mektup ve Bölüm 2 yazısında",
    )
    .replace(/akademik\s+görevlerde/gi, "Bölüm 2 yazısında")
    .replace(/akademik\s+görev/gi, "Bölüm 2 yazısı")
    .replace(/__TM_B1_BELOW__/g, "B1 altı");
};

export type WritingFeedbackHighlightSegment = {
  text: string;
  highlighted: boolean;
};

export type WritingFeedbackEmphasisSegment = {
  text: string;
  emphasized: boolean;
};

export type WritingFeedbackInlineCodeSegment = {
  text: string;
  code: boolean;
};

export const splitWritingFeedbackEmphasis = (
  value: unknown,
): WritingFeedbackEmphasisSegment[] => {
  const text = String(value || "");
  if (!text) return [];

  const segments: WritingFeedbackEmphasisSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const opening = text.indexOf("**", cursor);
    if (opening < 0) {
      segments.push({ text: text.slice(cursor), emphasized: false });
      break;
    }

    const closing = text.indexOf("**", opening + 2);
    if (closing < 0) {
      segments.push({ text: text.slice(cursor), emphasized: false });
      break;
    }

    if (opening > cursor) {
      segments.push({
        text: text.slice(cursor, opening),
        emphasized: false,
      });
    }

    const emphasizedText = text.slice(opening + 2, closing);
    if (emphasizedText) {
      segments.push({ text: emphasizedText, emphasized: true });
    }
    cursor = closing + 2;
  }

  return segments;
};

export const splitWritingFeedbackInlineCode = (
  value: unknown,
): WritingFeedbackInlineCodeSegment[] => {
  const text = String(value || "");
  if (!text) return [];

  const segments: WritingFeedbackInlineCodeSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const opening = text.indexOf("`", cursor);
    if (opening < 0) {
      segments.push({ text: text.slice(cursor), code: false });
      break;
    }

    const closing = text.indexOf("`", opening + 1);
    if (closing < 0) {
      segments.push({ text: text.slice(cursor), code: false });
      break;
    }

    if (opening > cursor) {
      segments.push({ text: text.slice(cursor, opening), code: false });
    }

    const codeText = text.slice(opening + 1, closing);
    if (codeText) segments.push({ text: codeText, code: true });
    cursor = closing + 1;
  }

  return segments;
};

export const splitWritingFeedbackHighlights = (
  value: unknown,
  highlightValues: readonly unknown[],
): WritingFeedbackHighlightSegment[] => {
  const text = String(value || "");
  if (!text) return [];

  const highlights = Array.from(
    new Set(
      highlightValues
        .map((highlight) => String(highlight || "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => right.length - left.length);
  if (highlights.length === 0) return [{ text, highlighted: false }];

  const normalizedText = text.toLocaleLowerCase("tr-TR");
  const normalizedHighlights = highlights.map((highlight) => ({
    source: highlight,
    normalized: highlight.toLocaleLowerCase("tr-TR"),
  }));
  const segments: WritingFeedbackHighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextStart = -1;
    let nextLength = 0;

    for (const highlight of normalizedHighlights) {
      const start = normalizedText.indexOf(highlight.normalized, cursor);
      if (
        start >= 0 &&
        (nextStart < 0 ||
          start < nextStart ||
          (start === nextStart && highlight.source.length > nextLength))
      ) {
        nextStart = start;
        nextLength = highlight.source.length;
      }
    }

    if (nextStart < 0) {
      segments.push({ text: text.slice(cursor), highlighted: false });
      break;
    }
    if (nextStart > cursor) {
      segments.push({
        text: text.slice(cursor, nextStart),
        highlighted: false,
      });
    }
    segments.push({
      text: text.slice(nextStart, nextStart + nextLength),
      highlighted: true,
    });
    cursor = nextStart + nextLength;
  }

  return segments;
};

export const writingCorrectionCategoryLabel = (value?: string) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (normalized.includes("spelling") || normalized.includes("punctuation")) {
    return "Yazım ve noktalama";
  }
  if (normalized.includes("grammar")) return "Dil bilgisi";
  if (
    normalized.includes("vocabulary") ||
    normalized.includes("lexicalresource") ||
    normalized.includes("lex")
  ) {
    return "Kelime kullanımı";
  }
  if (normalized.includes("tone") || normalized.includes("register")) {
    return "Üslup";
  }
  if (normalized.includes("coherence") || normalized.includes("organisation")) {
    return "Düzen ve tutarlılık";
  }
  if (normalized.includes("task")) return "Görevi karşılama";
  if (normalized.includes("contentdevelopment")) return "Fikir geliştirme";
  if (normalized.includes("wordcount")) return "Kelime sayısı";
  if (normalized.includes("languageaccuracy")) return "Dil doğruluğu";
  return "Düzeltme";
};

export type WritingCorrectionDiffSegment = {
  type: "equal" | "removed" | "added";
  text: string;
};

export type WritingFeedbackSentenceContext = {
  before: string;
  original: string;
  after: string;
};

export type WritingCorrectionSentenceEdit = {
  start: number;
  end: number;
  original: string;
  corrected: string;
};

export type WritingCorrectionSentenceContext = {
  start: number;
  end: number;
  originalText: string;
  correctedText: string;
  edits: WritingCorrectionSentenceEdit[];
};

export type WritingReviewTextRange = {
  start: number;
  end: number;
  itemIndex: number;
  occurrenceIndex: number;
};

export type WritingReviewEvidenceInput = {
  type?: "strength" | "issue" | "development";
  criterion?: string;
  sourceUnitId?: string | null;
  original?: string | null;
  explanation?: string;
  suggestion?: string;
  exampleSentence?: string;
};

export type WritingIssueKind =
  | "objective_error"
  | "register_issue"
  | "naturalness";

export const getWritingCorrectionChangePresentation = (
  issueKind?: WritingIssueKind,
) =>
  issueKind === "naturalness"
    ? {
        removedLabel: "Mevcut ifade",
        addedLabel: "Önerilen ifade",
        removedClass: "text-[#7a5b19] decoration-[#d9c28f]",
      }
    : {
        removedLabel: "Silinen ifade",
        addedLabel: "Doğru ifade",
        removedClass: "text-[#923f39] decoration-[#d99792]",
      };

export type WritingReviewCorrectionOccurrenceInput = {
  sourceUnitId?: string;
  original?: string;
  corrected?: string;
};

export type WritingReviewCorrectionContrastInput = {
  left?: string;
  right?: string;
  explanation?: string;
};

export type WritingReviewCorrectionInput = {
  errorTitle?: string | null;
  issueKind?: WritingIssueKind;
  category?: string;
  sourceUnitId?: string;
  original?: string;
  corrected?: string;
  reason?: string;
  contrast?: WritingReviewCorrectionContrastInput | null;
  examples?: string[];
  naturalAlternative?: string;
  additionalOccurrences?: WritingReviewCorrectionOccurrenceInput[];
};

export type WritingReviewSourceUnitInput = {
  id?: string;
  start?: number;
  end?: number;
  text?: string;
};

export type WritingDevelopmentExampleInput = {
  original?: string;
  improved?: string;
};

export type WritingDevelopmentExample = {
  original: string;
  improved: string;
};

export const normalizeWritingDevelopmentExample = (
  input: WritingDevelopmentExampleInput | null | undefined,
): WritingDevelopmentExample | null => {
  const original = String(input?.original || "").trim();
  const improved = String(input?.improved || "").trim();

  if (!original || !improved || original === improved) return null;
  return { original, improved };
};

export type WritingReviewItem = {
  type: "strength" | "issue" | "development";
  issueKind?: WritingIssueKind;
  sourceUnitId?: string;
  category?: string;
  categories?: string[];
  original?: string;
  explanation?: string;
  correctionReason?: string;
  suggestion?: string;
  exampleSentence?: string;
  corrected?: string;
  naturalAlternative?: string;
  occurrences?: Array<{
    sourceUnitId?: string;
    original: string;
    corrected?: string;
  }>;
  corrections?: Array<{
    errorTitle?: string | null;
    issueKind?: WritingIssueKind;
    category?: string;
    sourceUnitId?: string;
    original: string;
    corrected?: string;
    reason?: string;
    contrast?: WritingReviewCorrectionContrastInput | null;
    examples?: string[];
    naturalAlternative?: string;
  }>;
  relatedEvidence?: Array<{
    type: "strength" | "issue" | "development";
    category?: string;
    sourceUnitId?: string;
    original?: string;
    explanation?: string;
    suggestion?: string;
    exampleSentence?: string;
  }>;
};

const writingReviewPriority = (item: WritingReviewItem): number => {
  if (item.type === "strength") return 0;
  if (
    item.type === "development" ||
    (!item.corrected &&
      ["taskAchievement", "toneAndRegister", "coherenceAndOrganisation", "coherenceAndCohesion"].includes(item.category || ""))
  ) return 1;
  return 2;
};

export const getWritingCorrectionContrastsForDisplay = (
  corrections: readonly WritingReviewCorrectionInput[] = [],
): WritingReviewCorrectionContrastInput[] => {
  const normalize = (value: unknown) =>
    normalizeWritingFeedbackForDisplay(value)
      .normalize("NFC")
      .replace(/\s+/gu, " ")
      .trim()
      .toLocaleLowerCase("tr-TR");
  const contrasts = new Map<string, WritingReviewCorrectionContrastInput>();
  for (const correction of corrections) {
    const contrast = correction.contrast;
    const left = normalize(contrast?.left);
    const right = normalize(contrast?.right);
    const explanation = normalize(contrast?.explanation);
    if (!contrast || !left || !right || !explanation) continue;

    const original = normalize(correction.original);
    const corrected = normalize(correction.corrected);
    let repeatsCorrection = false;
    if (original && corrected) {
      // A longer quote still repeats the edit when substituting the same
      // original span produces exactly the contrast's right-hand phrase.
      let start = left.indexOf(original);
      while (start >= 0) {
        if (left.slice(0, start) + corrected + left.slice(start + original.length) === right) {
          repeatsCorrection = true;
          break;
        }
        start = left.indexOf(original, start + 1);
      }
    }
    if (!repeatsCorrection) {
      contrasts.set(`${left}\u0000${right}\u0000${explanation}`, contrast);
    }
  }
  return Array.from(contrasts.values());
};

const writingDiffTokens = (value: string) => value.match(/\s+|[^\s]+/g) || [];

export const diffWritingCorrection = (
  originalValue: string,
  correctedValue: string,
): WritingCorrectionDiffSegment[] => {
  const originalTokens = writingDiffTokens(originalValue);
  const correctedTokens = writingDiffTokens(correctedValue);
  const sharedTokenCounts = Array.from(
    { length: originalTokens.length + 1 },
    () => Array<number>(correctedTokens.length + 1).fill(0),
  );

  for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex -= 1) {
    for (
      let correctedIndex = correctedTokens.length - 1;
      correctedIndex >= 0;
      correctedIndex -= 1
    ) {
      sharedTokenCounts[originalIndex][correctedIndex] =
        originalTokens[originalIndex] === correctedTokens[correctedIndex]
          ? sharedTokenCounts[originalIndex + 1][correctedIndex + 1] + 1
          : Math.max(
              sharedTokenCounts[originalIndex + 1][correctedIndex],
              sharedTokenCounts[originalIndex][correctedIndex + 1],
            );
    }
  }

  const segments: WritingCorrectionDiffSegment[] = [];
  const appendSegment = (
    type: WritingCorrectionDiffSegment["type"],
    text: string,
  ) => {
    if (!text) return;
    const previous = segments[segments.length - 1];
    if (previous?.type === type) {
      previous.text += text;
      return;
    }
    segments.push({ type, text });
  };

  let originalIndex = 0;
  let correctedIndex = 0;
  while (
    originalIndex < originalTokens.length ||
    correctedIndex < correctedTokens.length
  ) {
    if (
      originalIndex < originalTokens.length &&
      correctedIndex < correctedTokens.length &&
      originalTokens[originalIndex] === correctedTokens[correctedIndex]
    ) {
      appendSegment("equal", originalTokens[originalIndex]);
      originalIndex += 1;
      correctedIndex += 1;
      continue;
    }

    if (
      correctedIndex < correctedTokens.length &&
      (originalIndex >= originalTokens.length ||
        sharedTokenCounts[originalIndex][correctedIndex + 1] >
          sharedTokenCounts[originalIndex + 1][correctedIndex])
    ) {
      appendSegment("added", correctedTokens[correctedIndex]);
      correctedIndex += 1;
      continue;
    }

    appendSegment("removed", originalTokens[originalIndex]);
    originalIndex += 1;
  }

  return segments;
};

export const getWritingFeedbackSentenceContext = (
  sourceText: string,
  originalValue: string,
  occurrenceStart?: number,
): WritingFeedbackSentenceContext => {
  const original = String(originalValue || "");
  const targetStart =
    Number.isInteger(occurrenceStart) && Number(occurrenceStart) >= 0
      ? Number(occurrenceStart)
      : sourceText.indexOf(original);

  if (!original || targetStart < 0) {
    return { before: "", original, after: "" };
  }

  const targetEnd = targetStart + original.length;
  let sentenceStart = targetStart;
  while (sentenceStart > 0 && !/[.!?\n]/.test(sourceText[sentenceStart - 1])) {
    sentenceStart -= 1;
  }
  while (sentenceStart < targetStart && /\s/.test(sourceText[sentenceStart])) {
    sentenceStart += 1;
  }

  let sentenceEnd = targetEnd;
  while (sentenceEnd < sourceText.length && !/[.!?\n]/.test(sourceText[sentenceEnd])) {
    sentenceEnd += 1;
  }
  if (sentenceEnd < sourceText.length && /[.!?]/.test(sourceText[sentenceEnd])) {
    sentenceEnd += 1;
  }

  return {
    before: sourceText.slice(sentenceStart, targetStart),
    original: sourceText.slice(targetStart, targetEnd),
    after: sourceText.slice(targetEnd, sentenceEnd),
  };
};

const getWritingSentenceBounds = (
  sourceText: string,
  targetStart: number,
  targetEnd: number,
) => {
  let start = targetStart;
  while (start > 0 && !/[.!?\n]/.test(sourceText[start - 1])) {
    start -= 1;
  }
  while (start < targetStart && /\s/.test(sourceText[start])) {
    start += 1;
  }

  let end = targetEnd;
  while (end < sourceText.length && !/[.!?\n]/.test(sourceText[end])) {
    end += 1;
  }
  if (end < sourceText.length && /[.!?]/.test(sourceText[end])) {
    end += 1;
  }

  return { start, end };
};

export const locateWritingReviewItemRanges = <
  T extends {
    sourceUnitId?: string;
    original?: string;
    occurrences?: readonly { sourceUnitId?: string; original?: string }[];
  },
>(
  items: readonly T[],
  sourceText: string,
  sourceUnits: readonly WritingReviewSourceUnitInput[] = [],
  options: { allowSharedRanges?: boolean } = {},
): WritingReviewTextRange[] => {
  const occupied: Array<{ start: number; end: number }> = [];
  const nextStartByOriginal = new Map<string, number>();
  const ranges: WritingReviewTextRange[] = [];
  const sourceUnitById = new Map(
    sourceUnits
      .filter(
        (unit) =>
          String(unit?.id || "").trim() &&
          Number.isInteger(unit?.start) &&
          Number.isInteger(unit?.end) &&
          Number(unit.start) >= 0 &&
          Number(unit.end) <= sourceText.length &&
          Number(unit.end) > Number(unit.start),
      )
      .map((unit) => [String(unit.id), unit] as const),
  );

  items.forEach((item, itemIndex) => {
    // Different feedback cards may discuss the same evidence. Only repeated
    // occurrences within one card should advance the search in shared mode.
    if (options.allowSharedRanges) {
      occupied.length = 0;
      nextStartByOriginal.clear();
    }
    const occurrences =
      Array.isArray(item.occurrences) && item.occurrences.length > 0
        ? item.occurrences
        : [{ sourceUnitId: item.sourceUnitId, original: item.original }];

    occurrences.forEach((occurrence, occurrenceIndex) => {
      const original = String(occurrence.original || "");
      if (!original) return;
      const sourceUnitId = String(
        occurrence.sourceUnitId || item.sourceUnitId || "",
      );
      const sourceUnit = sourceUnitById.get(sourceUnitId);
      const searchKey = `${sourceUnitId}\u0000${original}`;
      const searchStart = sourceUnit
        ? Math.max(
            Number(sourceUnit.start),
            nextStartByOriginal.get(searchKey) || Number(sourceUnit.start),
          )
        : nextStartByOriginal.get(searchKey) || 0;
      let start = sourceText.indexOf(original, searchStart);

      if (
        sourceUnit &&
        (start < Number(sourceUnit.start) ||
          start + original.length > Number(sourceUnit.end))
      ) {
        start = -1;
      }

      while (
        start >= 0 &&
        occupied.some(
          (range) => start < range.end && start + original.length > range.start,
        )
      ) {
        start = sourceText.indexOf(original, start + 1);
        if (
          sourceUnit &&
          (start < Number(sourceUnit.start) ||
            start + original.length > Number(sourceUnit.end))
        ) {
          start = -1;
        }
      }

      if (start < 0) return;
      const range = {
        start,
        end: start + original.length,
        itemIndex,
        occurrenceIndex,
      };
      occupied.push(range);
      ranges.push(range);
      nextStartByOriginal.set(searchKey, range.end);
    });
  });

  return ranges.sort(
    (left, right) =>
      left.start - right.start ||
      left.itemIndex - right.itemIndex ||
      left.occurrenceIndex - right.occurrenceIndex,
  );
};

export const partitionWritingReviewRanges = (
  ranges: readonly WritingReviewTextRange[],
  selectedIndex: number | null,
): WritingReviewTextRange[] => {
  const boundaries = Array.from(new Set(
    ranges.flatMap((range) => [range.start, range.end]),
  )).sort((left, right) => left - right);
  const result: WritingReviewTextRange[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const covering = ranges.filter((range) => range.start <= start && range.end >= end);
    const owner = covering.find((range) => range.itemIndex === selectedIndex) || covering[0];
    if (!owner) continue;
    const previous = result[result.length - 1];
    if (previous && previous.end === start && previous.itemIndex === owner.itemIndex &&
        previous.occurrenceIndex === owner.occurrenceIndex) {
      previous.end = end;
    } else {
      result.push({ ...owner, start, end });
    }
  }
  return result;
};

export const buildWritingCorrectionSentenceContexts = (
  sourceText: string,
  item: Pick<WritingReviewItem, "original" | "corrected" | "occurrences">,
  ranges: readonly WritingReviewTextRange[],
  itemIndex: number,
  sourceUnits: readonly WritingReviewSourceUnitInput[] = [],
): WritingCorrectionSentenceContext[] => {
  const occurrences =
    Array.isArray(item.occurrences) && item.occurrences.length > 0
      ? item.occurrences
      : [
          {
            sourceUnitId: undefined,
            original: String(item.original || ""),
            corrected: item.corrected,
          },
        ];
  const sentenceGroups = new Map<
    string,
    {
      start: number;
      end: number;
      edits: WritingCorrectionSentenceEdit[];
    }
  >();
  const sourceUnitById = new Map(
    sourceUnits.map((unit) => [String(unit?.id || ""), unit] as const),
  );

  ranges
    .filter((range) => range.itemIndex === itemIndex)
    .sort((left, right) => left.start - right.start)
    .forEach((range) => {
      const occurrence = occurrences[range.occurrenceIndex];
      const original = sourceText.slice(range.start, range.end);
      const corrected = String(occurrence?.corrected || "");
      if (!original || !corrected) return;

      const sourceUnit = sourceUnitById.get(
        String(occurrence?.sourceUnitId || ""),
      );
      const usesSourceUnit =
        Number.isInteger(sourceUnit?.start) &&
        Number.isInteger(sourceUnit?.end) &&
        Number(sourceUnit?.start) <= range.start &&
        Number(sourceUnit?.end) >= range.end;
      const bounds = usesSourceUnit
        ? { start: Number(sourceUnit?.start), end: Number(sourceUnit?.end) }
        : getWritingSentenceBounds(sourceText, range.start, range.end);
      const key = `${bounds.start}:${bounds.end}`;
      const group = sentenceGroups.get(key) || { ...bounds, edits: [] };
      const overlapsExisting = group.edits.some(
        (edit) => range.start < edit.end && range.end > edit.start,
      );
      if (!overlapsExisting) {
        group.edits.push({
          start: range.start,
          end: range.end,
          original,
          corrected,
        });
      }
      sentenceGroups.set(key, group);
    });

  return Array.from(sentenceGroups.values())
    .sort((left, right) => left.start - right.start)
    .map((group) => {
      const edits = [...group.edits].sort((left, right) => left.start - right.start);
      let cursor = group.start;
      let correctedText = "";

      for (const edit of edits) {
        correctedText += sourceText.slice(cursor, edit.start);
        correctedText += edit.corrected;
        cursor = edit.end;
      }
      correctedText += sourceText.slice(cursor, group.end);

      return {
        start: group.start,
        end: group.end,
        originalText: sourceText.slice(group.start, group.end),
        correctedText,
        edits,
      };
    });
};

export const locateWritingReviewItemsByText = <
  T extends {
    sourceUnitId?: string;
    original?: string;
    occurrences?: readonly { sourceUnitId?: string; original?: string }[];
  },
>(
  items: readonly T[],
  sourceText: string,
  sourceUnits: readonly WritingReviewSourceUnitInput[] = [],
): Array<WritingReviewTextRange | null> => {
  const ranges = locateWritingReviewItemRanges(items, sourceText, sourceUnits);
  return items.map(
    (_, itemIndex) =>
      ranges.find((range) => range.itemIndex === itemIndex) || null,
  );
};

export const orderWritingReviewItemsByText = <
  T extends {
    sourceUnitId?: string;
    original?: string;
    occurrences?: readonly { sourceUnitId?: string; original?: string }[];
  },
>(
  items: readonly T[],
  sourceText: string,
  sourceUnits: readonly WritingReviewSourceUnitInput[] = [],
): T[] => {
  const ranges = locateWritingReviewItemsByText(items, sourceText, sourceUnits);

  return items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      position: ranges[originalIndex]?.start ?? Number.POSITIVE_INFINITY,
    }))
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ item }) => item);
};

export const buildWritingReviewItems = (
  evidenceInput: readonly WritingReviewEvidenceInput[] | null | undefined,
  correctionInput: readonly WritingReviewCorrectionInput[] | null | undefined,
  sourceText: string,
  sourceUnits: readonly WritingReviewSourceUnitInput[] = [],
): WritingReviewItem[] => {
  const knownSourceUnitIds = new Set(
    sourceUnits.map((unit) => String(unit?.id || "")).filter(Boolean),
  );
  const evidence: WritingReviewItem[] = Array.isArray(evidenceInput)
    ? evidenceInput
        .filter((item) => {
          const original = String(item?.original || "").trim();
          if (original) return true;
          if (item?.type !== "development") return false;
          return [item.explanation, item.suggestion, item.exampleSentence].some(
            (value) => String(value || "").trim(),
          );
        })
        .map((item) => {
          const sourceUnitId = String(item.sourceUnitId || "").trim();
          const original = String(item.original || "").trim();
          return {
            type: item.type || "development",
            category: item.criterion,
            sourceUnitId: sourceUnitId || undefined,
            original: original || undefined,
            explanation: item.explanation,
            suggestion: item.suggestion,
            exampleSentence: item.exampleSentence,
          };
        })
    : [];

  const correctionGroups: WritingReviewItem[] = Array.isArray(correctionInput)
    ? correctionInput
        .filter((item) => String(item?.original || "").trim())
        .map((item) => ({
          type: item.issueKind === "naturalness" ? "development" : "issue",
          issueKind: item.issueKind,
          category: item.category,
          sourceUnitId: item.sourceUnitId,
          categories: item.category ? [item.category] : [],
          original: item.original,
          correctionReason: item.reason,
          corrected: item.corrected,
          naturalAlternative: item.naturalAlternative,
          corrections: [
            {
              errorTitle: item.errorTitle,
              issueKind: item.issueKind,
              category: item.category,
              sourceUnitId: item.sourceUnitId,
              original: String(item.original || ""),
              corrected: item.corrected,
              reason: item.reason,
              contrast: item.contrast,
              examples: Array.isArray(item.examples)
                ? item.examples
                    .map((example: unknown) => String(example || "").trim())
                    .filter(Boolean)
                : [],
              naturalAlternative: item.naturalAlternative,
            },
          ],
          occurrences: [
            {
              ...(item.sourceUnitId
                ? { sourceUnitId: item.sourceUnitId }
                : {}),
              original: String(item.original || ""),
              corrected: item.corrected,
            },
            ...(Array.isArray(item.additionalOccurrences)
              ? item.additionalOccurrences
                  .filter((occurrence: WritingReviewCorrectionOccurrenceInput) =>
                    String(occurrence?.original || "").trim(),
                  )
                  .map((occurrence: WritingReviewCorrectionOccurrenceInput) => ({
                    ...(occurrence.sourceUnitId
                      ? { sourceUnitId: occurrence.sourceUnitId }
                      : {}),
                    original: String(occurrence.original || ""),
                    corrected: occurrence.corrected,
                  }))
              : []),
          ],
        }))
    : [];

  const parents = correctionGroups.map((_, index) => index);
  const findRoot = (index: number): number => {
    if (parents[index] !== index) parents[index] = findRoot(parents[index]);
    return parents[index];
  };
  const join = (left: number, right: number) => {
    const leftRoot = findRoot(left);
    const rightRoot = findRoot(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };

  const correctionRanges = locateWritingReviewItemRanges(
    correctionGroups,
    sourceText,
    sourceUnits,
  );
  const sentenceOwner = new Map<string, number>();
  correctionRanges
    .filter((range) => range.occurrenceIndex === 0)
    .forEach((range) => {
      const sourceUnitId = String(
        correctionGroups[range.itemIndex]?.sourceUnitId || "",
      );
      const key = knownSourceUnitIds.has(sourceUnitId)
        ? `${correctionGroups[range.itemIndex].type}:unit:${sourceUnitId}`
        : (() => {
            const bounds = getWritingSentenceBounds(
              sourceText,
              range.start,
              range.end,
            );
            return `${correctionGroups[range.itemIndex].type}:sentence:${bounds.start}:${bounds.end}`;
          })();
      const owner = sentenceOwner.get(key);
      if (owner === undefined) sentenceOwner.set(key, range.itemIndex);
      else join(owner, range.itemIndex);
    });

  const components = new Map<number, number[]>();
  correctionGroups.forEach((_, index) => {
    const root = findRoot(index);
    const members = components.get(root) || [];
    members.push(index);
    components.set(root, members);
  });

  const combinedCorrections = Array.from(components.values()).map((members) => {
    const groups = members.map((index) => correctionGroups[index]);
    const first = groups[0];
    const categories = Array.from(
      new Set(groups.flatMap((group) => group.categories || []).filter(Boolean)),
    );
    return {
      ...first,
      category: categories[0] || first.category,
      categories,
      occurrences: groups.flatMap((group) => group.occurrences || []),
      corrections: groups.flatMap((group) => group.corrections || []),
    } satisfies WritingReviewItem;
  });

  const consumedEvidence = new Set<number>();
  // Sharing a sentence does not make a content criticism a language error.
  // Only redundant language evidence belongs on a concrete correction card.
  const isLanguageEvidence = (item: WritingReviewItem) =>
    item.category === "languageAccuracy" || item.category === "lexicalResource";
  const correctionsWithEvidence = combinedCorrections.map((correction) => {
    const originals = new Set(
      (correction.occurrences || []).map((occurrence) =>
        String(occurrence.original || "").trim(),
      ),
    );
    const matchingEvidence = evidence
      .map((item, index) => ({ item, index }))
          .filter(
            ({ item }) =>
              correction.type === "issue" &&
              item.type === "issue" &&
              isLanguageEvidence(item) &&
              ((item.sourceUnitId &&
                correction.sourceUnitId &&
                item.sourceUnitId === correction.sourceUnitId) ||
                originals.has(String(item.original || "").trim())),
          );
    matchingEvidence.forEach(({ index }) => consumedEvidence.add(index));
    const firstEvidence = matchingEvidence[0]?.item;

    return firstEvidence
      ? {
          ...correction,
          explanation: firstEvidence.explanation,
          suggestion: firstEvidence.suggestion,
          exampleSentence: firstEvidence.exampleSentence,
        }
      : correction;
  });

  const correctionSentenceByIndex = new Map<number, string>();
  locateWritingReviewItemRanges(
    correctionsWithEvidence,
    sourceText,
    sourceUnits,
  )
    .filter((range) => range.occurrenceIndex === 0)
    .forEach((range) => {
      const sourceUnitId = String(
        correctionsWithEvidence[range.itemIndex]?.sourceUnitId || "",
      );
      const bounds = getWritingSentenceBounds(sourceText, range.start, range.end);
      correctionSentenceByIndex.set(
        range.itemIndex,
        knownSourceUnitIds.has(sourceUnitId)
          ? `${correctionsWithEvidence[range.itemIndex].type}:unit:${sourceUnitId}`
          : `${correctionsWithEvidence[range.itemIndex].type}:sentence:${bounds.start}:${bounds.end}`,
      );
    });

  evidence.forEach((item, evidenceIndex) => {
    if (consumedEvidence.has(evidenceIndex)) return;
    if (item.type !== "issue") return;
    if (!isLanguageEvidence(item)) return;
    const located = locateWritingReviewItemRanges(
      [item],
      sourceText,
      sourceUnits,
    )[0];
    if (!located) return;
    const bounds = getWritingSentenceBounds(
      sourceText,
      located.start,
      located.end,
    );
    const sourceUnitId = String(item.sourceUnitId || "");
    const sentenceKey = knownSourceUnitIds.has(sourceUnitId)
      ? `issue:unit:${sourceUnitId}`
      : `issue:sentence:${bounds.start}:${bounds.end}`;
    const correctionIndex = correctionsWithEvidence.findIndex(
      (_, index) => correctionSentenceByIndex.get(index) === sentenceKey,
    );
    if (correctionIndex < 0) return;

    const correction = correctionsWithEvidence[correctionIndex];
    correction.relatedEvidence = [
      ...(correction.relatedEvidence || []),
      {
        type: item.type,
        category: item.category,
        sourceUnitId: item.sourceUnitId,
        original: item.original,
        explanation: item.explanation,
        suggestion: item.suggestion,
        exampleSentence: item.exampleSentence,
      },
    ];
    correction.explanation ||= item.explanation;
    correction.suggestion ||= item.suggestion;
    correction.exampleSentence ||= item.exampleSentence;
    consumedEvidence.add(evidenceIndex);
  });

  const merged = [
    ...evidence.filter((_, index) => !consumedEvidence.has(index)),
    ...correctionsWithEvidence,
  ];

  return merged
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      // Locate cards independently: coaching and an error may share a quote.
      position: locateWritingReviewItemRanges([item], sourceText, sourceUnits)[0]?.start ?? Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) =>
      writingReviewPriority(left.item) - writingReviewPriority(right.item) ||
      left.position - right.position ||
      left.originalIndex - right.originalIndex,
    )
    .map(({ item }) => item);
};

export const getWritingGeneralEvaluationForDisplay = (
  general: unknown,
  legacyGeneral: unknown,
) => {
  if (typeof general === "string" && general.length > 0) return general;
  if (typeof legacyGeneral === "string") return legacyGeneral;
  return "";
};

export const getWritingReviewDetails = (
  item: Pick<
    WritingReviewItem,
    | "explanation"
    | "correctionReason"
    | "suggestion"
    | "corrected"
    | "corrections"
    | "relatedEvidence"
  >,
): string[] => {
  if (String(item.corrected || "").trim()) {
    const correctionDetails = (item.corrections || [])
      .map((correction) => String(correction.reason || "").trim())
      .filter(Boolean);
    const fallbackDetail =
      String(item.correctionReason || "").trim() ||
      String(item.explanation || "").trim() ||
      String(item.suggestion || "").trim();
    const relatedDetails = (item.relatedEvidence || []).flatMap((evidence) =>
      [evidence.explanation, evidence.suggestion]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    );
    const details = correctionDetails.length
      ? correctionDetails
      : fallbackDetail
        ? [fallbackDetail]
        : [];
    return [...details, ...relatedDetails].filter(
      (detail, index, values) => values.indexOf(detail) === index,
    );
  }

  const details = [item.explanation, item.correctionReason, item.suggestion]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return details.filter((detail, index) => details.indexOf(detail) === index);
};
