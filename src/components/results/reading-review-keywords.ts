import type { MockReviewQuestion } from "./evidence-review-utils";

export type ReadingKeywordRange = { start: number; end: number };
const normalize = (text: string) => text.toLocaleLowerCase("tr-TR");

// Only compare the author's evidence with the correct situation. These small
// phrase families cover explicit paraphrases; unmatched text stays unmarked.
const concepts = [
  "hafta\\s*son[\\p{L}]*",
  "cumartesi[\\p{L}]*",
  "pazar(?:\\s+gün[\\p{L}]*)?",
  "hafta\\s*içi",
  "iş\\s*çıkışı|mesai\\s*saatleri\\s*dışında|akşam[\\p{L}]*|günün\\s*her\\s*saati",
  "gece[\\p{L}]*|sabaha\\s*karşı|günün\\s*her\\s*saati|24\\s*saat|7/24",
  "ücretsiz[\\p{L}]*|ücret\\s*ödemeden|ücret\\s*alınmaz",
  "ucuz[\\p{L}]*|bütçe[\\p{L}]*|masraf[\\p{L}]*\\s+düşük|ücret[^.!?]{0,35}altında|indirim[\\p{L}]*",
  "şehir\\s*iç[\\p{L}]*|aynı\\s+şehir[\\p{L}]*",
  "şehirler\\s*arası|başka\\s+bir\\s+şeh[\\p{L}]*",
  "paketle[\\p{L}]*|koli\\s*hazırla[\\p{L}]*",
  "sigorta[\\p{L}]*|hasar[\\p{L}]*|zarar[\\p{L}]*\\s+karşıla[\\p{L}]*",
  "nem[\\p{L}]*",
  "hiç\\s+yüzme\\s+bil[\\p{L}]*|başlangıç[\\p{L}]*|ilk\\s+kez|başl[\\p{L}]*",
  "üye\\s*olma(?:dan|yan[\\p{L}]*)|üye\\s*değil[\\p{L}]*|üyelik\\s*(?:zorunlu\\s*değil[\\p{L}]*|gerekm[\\p{L}]*)",
  "ekipman[\\p{L}]*|malzeme[\\p{L}]*",
  "uzman[\\p{L}]*|fizyoterapist[\\p{L}]*",
  "bel\\s*(?:ve\\s+boyun\\s+)?ağrı[\\p{L}]*",
  "tırman[\\p{L}]*",
  "koş[\\p{L}]*",
  "çocu[\\p{L}]*|oğl[\\p{L}]*|kız[\\p{L}]*",
  "asansör[\\p{L}]*",
  "piyano[\\p{L}]*",
  "bilgisayar[\\p{L}]*",
  "kitap[\\p{L}]*",
  "mobilya[\\p{L}]*",
  "kendi\\s+(?:arac[\\p{L}]*|araba[\\p{L}]*)",
  "aynı\\s*gün|bugün",
  "(?:[1-9]\\.|yedinci|sekizinci)\\s*kat[\\p{L}]*",
];
// Directional paraphrases: a claimed detail is highlighted only if its matching
// source phrase is inside the author's evidence. Foreign nationality is never
// treated as proof of a native language.
const paraphrases: [string, string][] = [
  ["çok\\s+uluslu\\s+şirket", "yabancı\\s+ortaklı\\s+bir\\s+firma[\\p{L}]*"],
  ["yönetici[\\p{L}]*", "yönetici[\\p{L}]*"],
  ["resmî\\s+raporlama", "uygun\\s+bir\\s+üslupla"],
  ["müzakere|ikna\\s+edici\\s+sunum", "düşüncelerinizi\\s+daha\\s+etkili"],
  ["kural\\s+ezberlemekten", "kuralları"],
  ["serbest\\s+tartışma\\s+gruplar[\\p{L}]*", "sohbet"],
  ["ifade\\s+akıcılığ[\\p{L}]*", "duraks[\\p{L}]*"],
  ["korkusuzca", "daha\\s+rahat"],
];
const stopWords = new Set(
  "bir biri bu şu o ve ile için gibi daha çok her aynı bazı yalnızca sadece olarak olan olur olmak değil var yok yapmak etmek almak almakta kişi kişiler istiyor istiyorsunuz gerekir gerekiyor uygun önemli böyle yüzden kadar içinde günü günleri hafta yeni yeniden kendi başka birkaç hizmet hizmeti eşya eşyalar eşyalarınızı eşyalarını".split(
    " ",
  ),
);
const matches = (text: string, expression: string): ReadingKeywordRange[] => {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${expression})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return [...normalize(text).matchAll(pattern)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
  }));
};
const merge = (ranges: ReadingKeywordRange[]) =>
  ranges
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce<ReadingKeywordRange[]>((result, range) => {
      const previous = result[result.length - 1];
      if (previous && range.start <= previous.end)
        previous.end = Math.max(previous.end, range.end);
      else result.push({ ...range });
      return result;
    }, []);
const stem = (word: string) =>
  normalize(word).replace(
    /(?:larınız|leriniz|larımız|lerimiz|larının|lerinin|larını|lerini|lardan|lerden|lar|ler|ınız|iniz|unuz|ünüz|ından|inden|unda|ünde|daki|deki|dan|den|dır|dir|tır|tir|ya|ye|ını|ini|unu|ünü)$/u,
    "",
  );
const tokens = (text: string) =>
  [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({
    text: m[0],
    start: m.index!,
    end: m.index! + m[0].length,
  }));

export function buildReadingKeywordHighlights(
  question: MockReviewQuestion,
  source: string,
  answer = question.answers.find((a) => a.correct)?.text || "",
) {
  const sourceRanges: ReadingKeywordRange[] = [];
  const answerRanges: ReadingKeywordRange[] = [];
  const evidenceSpans = question.evidenceSpans?.length
    ? question.evidenceSpans
    : [question];
  const allowed = evidenceSpans.flatMap((span) => {
    const quote = String(span.evidenceText || "").trim();
    if (!quote) return [];
    const validPosition =
      Number.isInteger(span.textStart) &&
      Number.isInteger(span.textEnd) &&
      span.textStart >= 0 &&
      source.slice(span.textStart, span.textEnd) === quote;
    const start = validPosition ? span.textStart : source.indexOf(quote);
    return start < 0 ? [] : [{ start, end: start + quote.length }];
  });
  const inEvidence = (range: ReadingKeywordRange) =>
    allowed.some((span) => range.start >= span.start && range.end <= span.end);
  // A named day can support "weekend". Saturday and Sunday don't imply each other.
  const weekend = "hafta\\s*son[\\p{L}]*";
  const weekendDays = "cumartesi[\\p{L}]*|pazar(?:\\s+gün[\\p{L}]*)?";
  for (const [leftPattern, rightPattern] of [
    [weekend, weekendDays],
    [weekendDays, weekend],
    ...paraphrases,
  ]) {
    const left = matches(source, leftPattern).filter(inEvidence);
    const right = matches(answer, rightPattern);
    if (left.length && right.length) {
      sourceRanges.push(...left);
      answerRanges.push(...right);
    }
  }
  for (const concept of concepts) {
    const left = matches(source, concept).filter(inEvidence);
    const right = matches(answer, concept);
    if (left.length && right.length) {
      sourceRanges.push(...left);
      answerRanges.push(...right);
    }
  }
  const sourceTokens = tokens(source);
  for (const right of tokens(answer)) {
    const key = stem(right.text);
    if (
      key.length < 4 ||
      stopWords.has(normalize(right.text)) ||
      stopWords.has(key)
    )
      continue;
    const left = sourceTokens.filter(
      (token) => stem(token.text) === key && inEvidence(token),
    );
    if (left.length) {
      sourceRanges.push(...left);
      answerRanges.push(right);
    }
  }
  return {
    sourceRanges: merge(sourceRanges),
    answerRanges: merge(answerRanges),
  };
}

export function splitReadingKeywords(
  text: string,
  ranges: ReadingKeywordRange[],
) {
  const valid = merge(
    ranges.filter(
      (r) =>
        Number.isInteger(r.start) &&
        Number.isInteger(r.end) &&
        r.start >= 0 &&
        r.end > r.start &&
        r.end <= text.length,
    ),
  );
  const boundaries = [
    ...new Set([0, text.length, ...valid.flatMap((r) => [r.start, r.end])]),
  ].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, i) => ({
    text: text.slice(start, boundaries[i + 1]),
    highlighted: valid.some(
      (r) => r.start <= start && r.end >= boundaries[i + 1],
    ),
  }));
}
