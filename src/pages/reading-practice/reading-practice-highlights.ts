export type PracticeHighlight = { text: string; noteId?: string };

type HighlightSegment = {
  text: string;
  kind: "plain" | "highlight" | "note";
  noteId?: string;
};

/** Split overlapping selections without hiding a note inside a yellow highlight. */
export function splitPracticeHighlights(
  text: string,
  highlights: readonly PracticeHighlight[],
  activeNoteIds: ReadonlySet<string>,
): HighlightSegment[] {
  const lowerText = text.toLocaleLowerCase("tr");
  const ranges = highlights.flatMap((highlight) => {
    if (!highlight.text) return [];
    const start = lowerText.indexOf(highlight.text.toLocaleLowerCase("tr"));
    if (start < 0) return [];
    return [{
      start,
      end: start + highlight.text.length,
      noteId: highlight.noteId && activeNoteIds.has(highlight.noteId)
        ? highlight.noteId
        : undefined,
    }];
  });
  const boundaries = [...new Set([
    0, text.length, ...ranges.flatMap(({ start, end }) => [start, end]),
  ])].sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];
  boundaries.slice(0, -1).forEach((start, index) => {
    const end = boundaries[index + 1];
    const covering = ranges.filter((range) => range.start <= start && range.end >= end);
    const note = covering.find((range) => range.noteId);
    const segment: HighlightSegment = {
      text: text.slice(start, end),
      kind: note ? "note" : covering.length ? "highlight" : "plain",
      ...(note ? { noteId: note.noteId } : {}),
    };
    const previous = segments[segments.length - 1];
    if (previous?.kind === segment.kind && previous.noteId === segment.noteId) {
      previous.text += segment.text;
    } else {
      segments.push(segment);
    }
  });
  return segments;
}

/** Restore only locally saved text marks; malformed entries stay out of the renderer. */
export function restorePracticeHighlights(value: unknown): Record<string, PracticeHighlight[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([label, items]) => [label,
    Array.isArray(items) ? items.filter((item): item is PracticeHighlight =>
      !!item && typeof item.text === "string" && (item.noteId === undefined || typeof item.noteId === "string")) : [],
  ]));
}
