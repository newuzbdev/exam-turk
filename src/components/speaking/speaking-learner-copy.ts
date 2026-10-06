import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";

const MAX_LEARNER_COPY_CHARACTERS = 8_000;
const MAX_LEARNER_SENTENCE_CHARACTERS = 2_000;
const MAX_PRESENTATION_NORMALIZATION_CHARACTERS =
  MAX_LEARNER_COPY_CHARACTERS + MAX_LEARNER_SENTENCE_CHARACTERS;
// The longest mojibake fragment repaired by normalizeDisplayText occupies
// eight UTF-16 source units for one presentation character.
const MAX_LEGACY_SOURCE_UNITS_PER_CHARACTER = 8;
const MAX_LEARNER_COPY_SOURCE_CHARACTERS =
  MAX_PRESENTATION_NORMALIZATION_CHARACTERS *
  MAX_LEGACY_SOURCE_UNITS_PER_CHARACTER;

const boundedUnicodePrefix = (value: string, maxCharacters: number) => {
  const prefix = value.slice(0, maxCharacters);
  const trailingCodeUnit = prefix.charCodeAt(prefix.length - 1);
  return trailingCodeUnit >= 0xd800 && trailingCodeUnit <= 0xdbff
    ? prefix.slice(0, -1)
    : prefix;
};

const foldTurkishAscii = (value: string): string =>
  value
    .replace(/ç/gu, "c")
    .replace(/ğ/gu, "g")
    .replace(/ı/gu, "i")
    .replace(/ö/gu, "o")
    .replace(/ş/gu, "s")
    .replace(/ü/gu, "u");

const CONSONANT_ENDING_CASE_SUFFIXES = [
  "ı",
  "i",
  "u",
  "ü",
  "a",
  "e",
  "da",
  "de",
  "ta",
  "te",
  "dan",
  "den",
  "tan",
  "ten",
  "ın",
  "in",
  "un",
  "ün",
  "la",
  "le",
] as const;

const VOWEL_ENDING_CASE_SUFFIXES = [
  "yı",
  "yi",
  "yu",
  "yü",
  "ya",
  "ye",
  "da",
  "de",
  "dan",
  "den",
  "nın",
  "nin",
  "nun",
  "nün",
  "yla",
  "yle",
] as const;

const POSSESSED_NOUN_CASE_SUFFIXES = [
  ...CONSONANT_ENDING_CASE_SUFFIXES,
  ...VOWEL_ENDING_CASE_SUFFIXES,
  "nı",
  "ni",
  "nu",
  "nü",
  "na",
  "ne",
  "nda",
  "nde",
  "ndan",
  "nden",
] as const;

const CONSONANT_ENDING_POSSESSIVE_SUFFIXES = [
  "ım",
  "im",
  "um",
  "üm",
  "ın",
  "in",
  "un",
  "ün",
  "ı",
  "i",
  "u",
  "ü",
  "ımız",
  "imiz",
  "umuz",
  "ümüz",
  "ınız",
  "iniz",
  "unuz",
  "ünüz",
] as const;

const VOWEL_ENDING_POSSESSIVE_SUFFIXES = [
  "m",
  "n",
  "sı",
  "si",
  "su",
  "sü",
  "mız",
  "miz",
  "muz",
  "müz",
  "nız",
  "niz",
  "nuz",
  "nüz",
] as const;

const PLURAL_SUFFIXES = ["lar", "ler"] as const;

const FOLDED_CONSONANT_ENDING_CASE_SUFFIXES =
  CONSONANT_ENDING_CASE_SUFFIXES.map(foldTurkishAscii);
const FOLDED_VOWEL_ENDING_CASE_SUFFIXES =
  VOWEL_ENDING_CASE_SUFFIXES.map(foldTurkishAscii);
const FOLDED_POSSESSED_NOUN_CASE_SUFFIXES =
  POSSESSED_NOUN_CASE_SUFFIXES.map(foldTurkishAscii);
const FOLDED_CONSONANT_ENDING_POSSESSIVE_SUFFIXES =
  CONSONANT_ENDING_POSSESSIVE_SUFFIXES.map(foldTurkishAscii);
const FOLDED_VOWEL_ENDING_POSSESSIVE_SUFFIXES =
  VOWEL_ENDING_POSSESSIVE_SUFFIXES.map(foldTurkishAscii);
const FOLDED_PLURAL_SUFFIXES = PLURAL_SUFFIXES.map(foldTurkishAscii);

const FORBIDDEN_WRITING_STEMS = [
  { stem: "paragraf", vowelEnding: false },
  { stem: "kompozisyon", vowelEnding: false },
  { stem: "tez", vowelEnding: false },
  { stem: "yazı", vowelEnding: true },
  { stem: "yazma", vowelEnding: true },
  { stem: "noktalama", vowelEnding: true },
  { stem: "makale", vowelEnding: true },
] as const;

const FORBIDDEN_WRITING_DERIVATIVES = [
  { stem: "yazısal", vowelEnding: false },
] as const;

type ContextualWritingHeadParadigm = {
  stem: string;
  vowelInflectionStem: string;
  highVowel: "ı" | "i";
  lowVowel: "a" | "e";
  pluralSuffix: "lar" | "ler";
  locativeSuffix: "da" | "de" | "ta";
  ablativeSuffix: "dan" | "den" | "tan";
  instrumentalSuffix: "la" | "le";
  vowelEnding?: boolean;
};

const WRITING_DOMAIN_HEADS: readonly ContextualWritingHeadParadigm[] = [
  {
    stem: "anlatım",
    vowelInflectionStem: "anlatım",
    highVowel: "ı",
    lowVowel: "a",
    pluralSuffix: "lar",
    locativeSuffix: "da",
    ablativeSuffix: "dan",
    instrumentalSuffix: "la",
  },
  {
    stem: "cevap",
    vowelInflectionStem: "cevab",
    highVowel: "ı",
    lowVowel: "a",
    pluralSuffix: "lar",
    locativeSuffix: "ta",
    ablativeSuffix: "tan",
    instrumentalSuffix: "la",
  },
  {
    stem: "ifade",
    vowelInflectionStem: "ifade",
    highVowel: "i",
    lowVowel: "e",
    pluralSuffix: "ler",
    locativeSuffix: "de",
    ablativeSuffix: "den",
    instrumentalSuffix: "le",
    vowelEnding: true,
  },
  {
    stem: "metin",
    vowelInflectionStem: "metn",
    highVowel: "i",
    lowVowel: "e",
    pluralSuffix: "ler",
    locativeSuffix: "de",
    ablativeSuffix: "den",
    instrumentalSuffix: "le",
  },
  {
    stem: "yanıt",
    vowelInflectionStem: "yanıt",
    highVowel: "ı",
    lowVowel: "a",
    pluralSuffix: "lar",
    locativeSuffix: "ta",
    ablativeSuffix: "tan",
    instrumentalSuffix: "la",
  },
] as const;

const FORBIDDEN_ENGLISH_WRITING_PREFIXES = [
  "essay",
  "paragraph",
  "punctuation",
  "writing",
] as const;

const FORBIDDEN_ENGLISH_WRITING_TOKENS = new Set(["thesis", "theses"]);
const FORBIDDEN_INTERNAL_TOKEN_PREFIXES = [
  "provider",
  "metadata",
  "schemaversion",
  "promptversion",
  "scoreimpact",
  "excludedranges",
  "trustedtranscript",
  "evidenceid",
  "confidence",
  "disagreement",
  "reviewer",
  "inceleyici",
  "hakem",
] as const;
const PROVIDER_MODEL_NAME_PREFIXES = [
  "openai",
  "deepgram",
  "google",
  "gemini",
  "whisper",
  "gpt",
  "nova",
] as const;

type TokenRule = string | { prefix: string };

const includesSuffix = (suffixes: readonly string[], candidate: string) =>
  suffixes.some((suffix) => suffix === candidate);

const matchesPossessiveAndCaseSuffix = (
  suffix: string,
  possessiveSuffixes: readonly string[],
) =>
  possessiveSuffixes.some((possessive) => {
    if (suffix === possessive) return true;
    if (!suffix.startsWith(possessive)) return false;
    return includesSuffix(
      FOLDED_POSSESSED_NOUN_CASE_SUFFIXES,
      suffix.slice(possessive.length),
    );
  });

const matchesTurkishNounInflection = (
  token: string,
  stem: string,
  vowelEnding: boolean,
) => {
  const foldedToken = foldTurkishAscii(token);
  const foldedStem = foldTurkishAscii(stem);
  if (foldedToken === foldedStem) return true;
  if (!foldedToken.startsWith(foldedStem)) return false;
  const suffix = foldedToken.slice(foldedStem.length);
  const directCaseSuffixes = vowelEnding
    ? FOLDED_VOWEL_ENDING_CASE_SUFFIXES
    : FOLDED_CONSONANT_ENDING_CASE_SUFFIXES;
  const directPossessiveSuffixes = vowelEnding
    ? FOLDED_VOWEL_ENDING_POSSESSIVE_SUFFIXES
    : FOLDED_CONSONANT_ENDING_POSSESSIVE_SUFFIXES;
  if (includesSuffix(directCaseSuffixes, suffix)) return true;
  if (matchesPossessiveAndCaseSuffix(suffix, directPossessiveSuffixes)) {
    return true;
  }
  return FOLDED_PLURAL_SUFFIXES.some((plural) => {
    if (suffix === plural) return true;
    if (!suffix.startsWith(plural)) return false;
    const afterPlural = suffix.slice(plural.length);
    return (
      includesSuffix(FOLDED_CONSONANT_ENDING_CASE_SUFFIXES, afterPlural) ||
      matchesPossessiveAndCaseSuffix(
        afterPlural,
        FOLDED_CONSONANT_ENDING_POSSESSIVE_SUFFIXES,
      )
    );
  });
};

const COPULAR_SUFFIXES = ["dir", "tir"] as const;

const matchesTurkishNounOrPredicateInflection = (
  token: string,
  stem: string,
  vowelEnding: boolean,
) => {
  if (matchesTurkishNounInflection(token, stem, vowelEnding)) return true;
  const foldedToken = foldTurkishAscii(token);
  return COPULAR_SUFFIXES.some((suffix) => {
    if (!foldedToken.endsWith(suffix)) return false;
    return matchesTurkishNounInflection(
      foldedToken.slice(0, -suffix.length),
      stem,
      vowelEnding,
    );
  });
};

const addPossessedContextualHeadForms = (
  forms: Set<string>,
  possessedForm: string,
  paradigm: ContextualWritingHeadParadigm,
  thirdPerson: boolean,
) => {
  forms.add(possessedForm);
  if (thirdPerson) {
    forms.add(`${possessedForm}n${paradigm.highVowel}`);
    forms.add(`${possessedForm}n${paradigm.lowVowel}`);
    forms.add(`${possessedForm}n${paradigm.lowVowel === "a" ? "da" : "de"}`);
    forms.add(`${possessedForm}n${paradigm.lowVowel === "a" ? "dan" : "den"}`);
    forms.add(`${possessedForm}n${paradigm.highVowel}n`);
    forms.add(`${possessedForm}y${paradigm.instrumentalSuffix}`);
    return;
  }
  forms.add(`${possessedForm}${paradigm.highVowel}`);
  forms.add(`${possessedForm}${paradigm.lowVowel}`);
  forms.add(`${possessedForm}${paradigm.lowVowel === "a" ? "da" : "de"}`);
  forms.add(`${possessedForm}${paradigm.lowVowel === "a" ? "dan" : "den"}`);
  forms.add(`${possessedForm}${paradigm.highVowel}n`);
  forms.add(`${possessedForm}${paradigm.instrumentalSuffix}`);
};

const contextualWritingHeadForms = (
  paradigm: ContextualWritingHeadParadigm,
) => {
  const forms = new Set<string>([paradigm.stem]);
  const voicedLocative = paradigm.lowVowel === "a" ? "da" : "de";
  const voicedAblative = paradigm.lowVowel === "a" ? "dan" : "den";

  if (paradigm.vowelEnding) {
    forms.add(`${paradigm.stem}y${paradigm.highVowel}`);
    forms.add(`${paradigm.stem}y${paradigm.lowVowel}`);
    forms.add(`${paradigm.stem}n${paradigm.highVowel}n`);
    forms.add(`${paradigm.stem}y${paradigm.instrumentalSuffix}`);
  } else {
    forms.add(`${paradigm.vowelInflectionStem}${paradigm.highVowel}`);
    forms.add(`${paradigm.vowelInflectionStem}${paradigm.lowVowel}`);
    forms.add(`${paradigm.vowelInflectionStem}${paradigm.highVowel}n`);
    forms.add(`${paradigm.stem}${paradigm.instrumentalSuffix}`);
  }
  forms.add(`${paradigm.stem}${paradigm.locativeSuffix}`);
  forms.add(`${paradigm.stem}${paradigm.ablativeSuffix}`);

  const singularPossessiveBase = paradigm.vowelEnding
    ? paradigm.stem
    : `${paradigm.vowelInflectionStem}${paradigm.highVowel}`;
  const singularPossessives = [
    `${singularPossessiveBase}m`,
    `${singularPossessiveBase}n`,
    paradigm.vowelEnding
      ? `${paradigm.stem}s${paradigm.highVowel}`
      : singularPossessiveBase,
    `${singularPossessiveBase}m${paradigm.highVowel}z`,
    `${singularPossessiveBase}n${paradigm.highVowel}z`,
  ];
  singularPossessives.forEach((possessive, index) =>
    addPossessedContextualHeadForms(forms, possessive, paradigm, index === 2),
  );

  const pluralForm = `${paradigm.stem}${paradigm.pluralSuffix}`;
  forms.add(pluralForm);
  forms.add(`${pluralForm}${paradigm.highVowel}`);
  forms.add(`${pluralForm}${paradigm.lowVowel}`);
  forms.add(`${pluralForm}${voicedLocative}`);
  forms.add(`${pluralForm}${voicedAblative}`);
  forms.add(`${pluralForm}${paradigm.highVowel}n`);
  forms.add(`${pluralForm}${paradigm.instrumentalSuffix}`);

  const pluralPossessiveBase = `${pluralForm}${paradigm.highVowel}`;
  const pluralPossessives = [
    `${pluralPossessiveBase}m`,
    `${pluralPossessiveBase}n`,
    pluralPossessiveBase,
    `${pluralPossessiveBase}m${paradigm.highVowel}z`,
    `${pluralPossessiveBase}n${paradigm.highVowel}z`,
  ];
  pluralPossessives.forEach((possessive, index) =>
    addPossessedContextualHeadForms(forms, possessive, paradigm, index === 2),
  );
  return forms;
};

const WRITING_DOMAIN_HEAD_FORMS = WRITING_DOMAIN_HEADS.map(
  contextualWritingHeadForms,
);
const FOLDED_WRITING_DOMAIN_HEAD_FORMS = WRITING_DOMAIN_HEAD_FORMS.map(
  (forms) => new Set([...forms].map(foldTurkishAscii)),
);

const FORBIDDEN_WRITING_VERB_FORMS = new Set<string>([
  "yazmak",
  "yazip",
  "yazarak",
  "yazarken",
  "yazinca",
  "yaziniz",
  "yazmali",
  "yazmalisin",
  "yazmalisiniz",
  "yazmalidir",
  "yazdim",
  "yazdin",
  "yazdi",
  "yazdik",
  "yazdiniz",
  "yazdilar",
  "yaziyorum",
  "yaziyorsun",
  "yaziyor",
  "yaziyoruz",
  "yaziyorsunuz",
  "yaziyorlar",
  "yazacagim",
  "yazacaksin",
  "yazacak",
  "yazacagiz",
  "yazacaksiniz",
  "yazacaklar",
  "yazabilirim",
  "yazabilirsin",
  "yazabilir",
  "yazabiliriz",
  "yazabilirsiniz",
  "yazabilirler",
  "yazildi",
  "yazilmis",
  "yazilacak",
  "yazilmali",
  "noktalamak",
  "noktalayip",
  "noktalayarak",
  "noktalarken",
  "noktalayinca",
  "noktalayin",
  "noktalayiniz",
  "noktalamali",
  "noktalamalisiniz",
  "noktaladi",
  "noktaladiniz",
  "noktaliyor",
  "noktaliyorsunuz",
  "noktalayacak",
  "noktalayacaksiniz",
]);

const normalizedTokens = (value: string): string[] =>
  value.match(/[\p{L}\p{N}]+/gu) ?? [];

const containsBoundedTokenSequence = (
  tokens: string[],
  sequence: readonly TokenRule[],
) =>
  sequence.length > 0 &&
  tokens.some((_, start) =>
    sequence.every((rule, offset) => {
      const token = tokens[start + offset] ?? "";
      return typeof rule === "string"
        ? token === rule
        : token.startsWith(rule.prefix);
    }),
  );

const containsContextualWritingDerivative = (tokens: string[]) =>
  tokens.some(
    (token, index) =>
      foldTurkishAscii(token) === "yazili" &&
      FOLDED_WRITING_DOMAIN_HEAD_FORMS.some((forms) =>
        forms.has(foldTurkishAscii(tokens[index + 1] ?? "")),
      ),
  );

const isContextualWritingHeadForm = (token: string) =>
  FOLDED_WRITING_DOMAIN_HEAD_FORMS.some((forms) =>
    forms.has(foldTurkishAscii(token)),
  );

const containsBoundedWritingVerb = (tokens: string[]) =>
  tokens.some((token, index) => {
    const foldedToken = foldTurkishAscii(token);
    if (foldedToken === "yazin") {
      return isContextualWritingHeadForm(tokens[index - 1] ?? "");
    }
    return FORBIDDEN_WRITING_VERB_FORMS.has(foldedToken);
  });

const containsWritingLanguage = (tokens: string[]) =>
  containsContextualWritingDerivative(tokens) ||
  containsBoundedWritingVerb(tokens) ||
  tokens.some(
    (token) =>
      FORBIDDEN_WRITING_STEMS.some(({ stem, vowelEnding }) =>
        stem === "yazı" && foldTurkishAscii(token) === "yazin"
          ? false
          : matchesTurkishNounInflection(token, stem, vowelEnding),
      ) ||
      FORBIDDEN_WRITING_DERIVATIVES.some(({ stem, vowelEnding }) =>
        matchesTurkishNounInflection(token, stem, vowelEnding),
      ) ||
      FORBIDDEN_ENGLISH_WRITING_TOKENS.has(token) ||
      FORBIDDEN_ENGLISH_WRITING_PREFIXES.some((prefix) =>
        token.startsWith(prefix),
      ),
  );

const containsInternalReviewSequence = (tokens: string[]) =>
  tokens.some((token, index) => {
    const foldedToken = foldTurkishAscii(token);
    const next = tokens[index + 1] ?? "";

    if (foldedToken === "dahili") {
      return (
        matchesTurkishNounOrPredicateInflection(next, "not", false) ||
        matchesTurkishNounOrPredicateInflection(next, "ayrıntı", true) ||
        matchesTurkishNounOrPredicateInflection(next, "detay", false)
      );
    }
    if (foldedToken === "ic") {
      return matchesTurkishNounOrPredicateInflection(
        next,
        "kullanım",
        false,
      );
    }
    if (foldedToken === "insan") {
      return matchesTurkishNounOrPredicateInflection(
        next,
        "kontrol",
        false,
      );
    }
    if (matchesTurkishNounInflection(token, "inceleme", true)) {
      return (
        matchesTurkishNounOrPredicateInflection(next, "not", false) ||
        matchesTurkishNounOrPredicateInflection(next, "öneri", true)
      );
    }
    return false;
  });

const containsAboveC1Language = (tokens: string[]) =>
  tokens.includes("c2") ||
  containsBoundedTokenSequence(tokens, ["c1", "plus"]) ||
  containsBoundedTokenSequence(tokens, ["c1", { prefix: "üst" }]) ||
  containsBoundedTokenSequence(tokens, ["c1", { prefix: "üzer" }]) ||
  containsBoundedTokenSequence(tokens, ["c1", { prefix: "öte" }]) ||
  containsBoundedTokenSequence(tokens, ["c1", "above"]) ||
  containsBoundedTokenSequence(tokens, ["c1", "beyond"]);

const containsInternalLanguage = (tokens: string[], machineTokens: string[]) =>
  containsInternalReviewSequence(tokens) ||
  machineTokens.some((token) =>
    FORBIDDEN_INTERNAL_TOKEN_PREFIXES.some((prefix) =>
      token.startsWith(prefix),
    ),
  ) ||
  machineTokens.some((token) =>
    PROVIDER_MODEL_NAME_PREFIXES.some((prefix) => token.startsWith(prefix)),
  ) ||
  containsBoundedTokenSequence(tokens, [
    { prefix: "sağlayıcı" },
    { prefix: "güven" },
  ]) ||
  containsBoundedTokenSequence(tokens, [
    { prefix: "model" },
    { prefix: "güven" },
  ]) ||
  containsBoundedTokenSequence(tokens, [
    { prefix: "sağlayıcı" },
    { prefix: "uyuşmaz" },
  ]) ||
  containsBoundedTokenSequence(tokens, [
    { prefix: "sağlayıcı" },
    { prefix: "anlaşmaz" },
  ]) ||
  containsBoundedTokenSequence(machineTokens, [
    { prefix: "provider" },
    { prefix: "confidence" },
  ]) ||
  containsBoundedTokenSequence(machineTokens, [
    { prefix: "provider" },
    { prefix: "disagreement" },
  ]) ||
  containsBoundedTokenSequence(machineTokens, [
    "raw",
    { prefix: "disagreement" },
  ]) ||
  containsBoundedTokenSequence(tokens, ["ham", { prefix: "anlaşmaz" }]) ||
  containsBoundedTokenSequence(tokens, ["iç", "meta", "veri"]) ||
  containsBoundedTokenSequence(tokens, ["dahili", "meta", "veri"]);

const containsForbiddenLearnerCopy = (value: string) => {
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[‐‑‒–—]/gu, "-");
  const tokens = normalizedTokens(normalized);
  const machineTokens = tokens.map((token) => token.replace(/ı/gu, "i"));
  const levelTokens = normalizedTokens(normalized.replace(/\+/gu, " plus "));
  const scoreCopy =
    /\d+(?:[.,]\d+)?\s*(?:\/\s*75|puan(?:ı|a|dan|dır)?)/iu.test(
      normalized,
    ) ||
    tokens.includes("skor") ||
    tokens.includes("score") ||
    containsBoundedTokenSequence(tokens, ["ham", "puan"]) ||
    containsBoundedTokenSequence(tokens, ["standart", "puan"]) ||
    containsBoundedTokenSequence(tokens, ["standard", "score"]);
  return (
    containsWritingLanguage(tokens) ||
    containsAboveC1Language(levelTokens) ||
    containsInternalLanguage(tokens, machineTokens) ||
    scoreCopy
  );
};

export const sanitizeSpeakingLearnerCopy = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const boundedSource = boundedUnicodePrefix(
    value,
    MAX_LEARNER_COPY_SOURCE_CHARACTERS,
  );
  const normalizedDisplay = boundedUnicodePrefix(
    normalizeDisplayText(boundedSource),
    MAX_PRESENTATION_NORMALIZATION_CHARACTERS,
  );
  const normalizedPresentation = normalizeFeedbackText(
    normalizedDisplay,
  );
  const sentences = boundedUnicodePrefix(
    normalizedPresentation.normalize("NFKC"),
    MAX_LEARNER_COPY_CHARACTERS,
  )
    .replace(/\s+/gu, " ")
    .trim()
    .match(/[^.!?]+(?:[.!?]+|$)/gu);
  if (!sentences) return "";
  return boundedUnicodePrefix(
    sentences
      .map((sentence) =>
        boundedUnicodePrefix(
          sentence.trim(),
          MAX_LEARNER_SENTENCE_CHARACTERS,
        ),
      )
      .filter(
        (sentence) => sentence && !containsForbiddenLearnerCopy(sentence),
      )
      .join(" "),
    MAX_LEARNER_COPY_CHARACTERS,
  );
};
