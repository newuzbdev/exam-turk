export type SpeakingQuoteRange = { start: number; end: number };

const findUniqueOccurrence = (
  transcript: string,
  quote: string,
): SpeakingQuoteRange | null => {
  const start = transcript.indexOf(quote);
  if (start < 0 || transcript.indexOf(quote, start + 1) >= 0) return null;
  return { start, end: start + quote.length };
};

export function findSpeakingQuoteRange(transcript: string, quote: string): SpeakingQuoteRange | null {
  const text = quote.trim();
  if (!text) return null;
  const exact = findUniqueOccurrence(transcript, text);

  const lowerTranscript = transcript
    .replace(/[Iİ]/gu, "i")
    .toLocaleLowerCase("tr-TR");
  const lowerQuote = text
    .replace(/[Iİ]/gu, "i")
    .toLocaleLowerCase("tr-TR");
  const caseInsensitive = findUniqueOccurrence(lowerTranscript, lowerQuote);

  const tokens = lowerQuote.match(/[\p{L}\p{N}]+/gu) || [];
  if (tokens.length === 0) return null;
  const escapedTokens = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
  );
  const punctuationTolerant = new RegExp(
    escapedTokens.join("[^\\p{L}\\p{N}]+"),
    "gu",
  );
  const matches: SpeakingQuoteRange[] = [];
  let match: RegExpExecArray | null;
  while ((match = punctuationTolerant.exec(lowerTranscript)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const before = start > 0 ? lowerTranscript[start - 1] : "";
    const after = end < lowerTranscript.length ? lowerTranscript[end] : "";
    if (/\p{L}|\p{N}/u.test(before) || /\p{L}|\p{N}/u.test(after)) continue;
    matches.push({ start, end });
  }
  // A repeated or loosely matched quote is ambiguous. Leaving it unhighlighted
  // is safer than pointing the learner to the wrong part of their answer.
  if (matches.length !== 1) return null;
  if (exact?.start === matches[0].start) return exact;
  if (caseInsensitive?.start === matches[0].start) return caseInsensitive;
  return matches[0];
}

export default function SpeakingSelectedQuote({ text, start, range, register, tone = "neutral" }: {
  text: string;
  start: number;
  range: SpeakingQuoteRange | null;
  register?: (element: HTMLSpanElement | null) => void;
  tone?: "neutral" | "strength" | "development";
}) {
  if (!range || range.end <= start || range.start >= start + text.length) return <>{text}</>;
  const from = Math.max(0, range.start - start);
  const to = Math.min(text.length, range.end - start);
  return <>{text.slice(0, from)}<span
    ref={range.start >= start ? register : undefined}
    data-speaking-selected-quote
    data-speaking-selected-quote-tone={tone}
    className={
      tone === "strength"
        ? "box-decoration-clone rounded-[2px] bg-[#dfeedd]"
        : tone === "development"
          ? "box-decoration-clone rounded-[2px] bg-[#f4e7bf]"
          : "box-decoration-clone rounded-[2px] bg-[#ececea]"
    }
  >{text.slice(from, to)}</span>{text.slice(to)}</>;
}
