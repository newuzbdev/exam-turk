const REPLACEMENTS: Array<[string, string]> = [
  // Turkish letters (single-level mojibake)
  ['\u00C3\u00BC', '\u00FC'], // Ã¼ -> ü
  ['\u00C3\u0153', '\u00DC'], // Ãœ -> Ü
  ['\u00C3\u00B6', '\u00F6'], // Ã¶ -> ö
  ['\u00C3\u2013', '\u00D6'], // Ã– -> Ö
  ['\u00C3\u00A7', '\u00E7'], // Ã§ -> ç
  ['\u00C3\u2021', '\u00C7'], // Ã‡ -> Ç
  ['\u00C4\u00B1', '\u0131'], // Ä± -> ı
  ['\u00C4\u00B0', '\u0130'], // Ä° -> İ
  ['\u00C5\u0178', '\u015F'], // ÅŸ -> ş
  ['\u00C5\u009E', '\u015E'], // Å -> Ş
  ['\u00C4\u0178', '\u011F'], // ÄŸ -> ğ
  ['\u00C4\u009E', '\u011E'], // Ä -> Ğ

  // Double-encoded common fragments
  ['\u00C3\u0192\u00C2\u00BC', '\u00FC'],
  ['\u00C3\u0192\u00C5\u201C', '\u00DC'],
  ['\u00C3\u0192\u00C2\u00B6', '\u00F6'],
  ['\u00C3\u0192\u00E2\u20AC\u201C', '\u00D6'],
  ['\u00C3\u0192\u00C2\u00A7', '\u00E7'],
  ['\u00C3\u0192\u00E2\u20AC\u00A1', '\u00C7'],

  // Punctuation artifacts
  ['\u00C3\u00A2\u00E2\u201A\u00AC\u00E2\u201E\u00A2', '\u2019'],
  ['\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u201C', '\u201C'],
  ['\u00C3\u00A2\u00E2\u201A\u00AC\u00EF\u00BF\u00BD', '\u201D'],
  ['\u00C3\u00A2\u00E2\u201A\u00AC\u00E2\u20AC\u0153', '\u2013'],
  ['\u00C3\u00A2\u00E2\u201A\u00AC\u00E2\u20AC\u009D', '\u2014'],
  ['\u00E2\u20AC\u2122', '\u2019'],
  ['\u00E2\u20AC\u0153', '\u201C'],
  ['\u00E2\u20AC\u009D', '\u201D'],
  ['\u00E2\u20AC\u201C', '\u2013'],
  ['\u00E2\u20AC\u201D', '\u2014'],

  // Stray remnants
  ['\u00C2', ''],
];

const COLLAPSED_TURKISH_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /Genel performans seviyeniz\s+([A-Z0-9 ]+)\s+dzeyine karlk geliyor\./gi,
    'Genel performans seviyeniz $1 düzeyine karşılık geliyor.',
  ],
  [
    /Blm bazl puanlarnz\s+grev karlama,\s+tutarllk,\s+kelime kullanm ve dil bilgisi alanlarnda[^.]*gsteriyor\./gi,
    'Bölüm bazlı puanlarınız görev karşılama, tutarlılık, kelime kullanımı ve dil bilgisi alanlarında dengeli bir temeliniz olduğunu gösteriyor.',
  ],
  [
    /Bir sonraki denemede metin plann daha net kurup her paragrafta gerekeyi rnekle destekleyerek kaliteyi ykseltebilirsiniz\./gi,
    'Bir sonraki denemede metin planını daha net kurup her paragrafta gerekçeyi örnekle destekleyerek kaliteyi yükseltebilirsiniz.',
  ],
  [
    /Dzenli pratikle puannz istikrarl biimde artrabilirsiniz\./gi,
    'Düzenli pratikle puanınızı istikrarlı biçimde artırabilirsiniz.',
  ],
];

const repairCollapsedTurkish = (input: string) => {
  let out = input;
  for (const [pattern, replacement] of COLLAPSED_TURKISH_PHRASE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
};

const removeMixedFallbackBlocks = (input: string) => {
  let out = input;
  const genericBlock =
    /Genel performans görev anlama, içerik geliştirme ve dil kontrolü açısından dengeli bir potansiyel gösteriyor\.\s*Bir üst seviyeye geçmek için özellikle tutarlılık, dil bilgisi doğruluğu ve örnekle desteklenen argüman üretimine odaklanın\./gi;

  if (/Genel performans seviyeniz\s+[A-Z0-9 ]+\s+düzeyine karşılık geliyor\./i.test(out)) {
    out = out.replace(genericBlock, ' ');
  }

  return out.replace(/\s+/g, ' ').trim();
};

export const fixMojibake = (input: string) => {
  if (!input) return input;

  let out = String(input);
  for (const [fromEscaped, toEscaped] of REPLACEMENTS) {
    const from = JSON.parse(`"${fromEscaped}"`) as string;
    const to = JSON.parse(`"${toEscaped}"`) as string;
    out = out.split(from).join(to);
  }

  return out;
};

export const normalizeDisplayText = (value?: string | null) => {
  if (value === null || value === undefined) return '';
  return removeMixedFallbackBlocks(
    repairCollapsedTurkish(fixMojibake(String(value)))
      .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])\1{2,}/g, '$1')
      .replace(/\uFFFD/g, '')
      .trim(),
  );
};

const normalizeSentenceKey = (value: string) =>
  fixMojibake(String(value))
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const dedupeRepeatedSentences = (value?: string | null) => {
  const cleaned = normalizeDisplayText(value);
  if (!cleaned) return '';

  const parts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return cleaned;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const sentence of parts) {
    const key = normalizeSentenceKey(sentence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(sentence);
  }

  return out.join(' ').replace(/\s+/g, ' ').trim();
};

export const normalizeFeedbackText = (value?: string | null) =>
  dedupeRepeatedSentences(normalizeDisplayText(value));
