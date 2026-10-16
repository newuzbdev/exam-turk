import assert from "node:assert/strict";
import test from "node:test";
import {
  dictionaryWordPattern,
  normalizeWordKey,
  splitDictionaryText,
  wordOccurrenceAt,
} from "../src/pages/reading-practice/reading-practice-dictionary.ts";

test("reading dictionary keeps backend apostrophe and hyphen tokens intact", () => {
  const text = "Türkiye’nin, Türkiye'nin ve e-posta.";

  assert.deepEqual(
    Array.from(text.matchAll(dictionaryWordPattern), (match) => match[0]),
    ["Türkiye’nin", "Türkiye'nin", "ve", "e-posta"],
  );
  assert.deepEqual(
    splitDictionaryText("Türkiye’nin e-posta."),
    ["Türkiye’nin", " ", "e-posta", "."],
  );
});

test("reading dictionary keeps every apostrophe word in section 3 intact", () => {
  const text =
    "Norveç’in Svalbard’daki Suriye’deki Lübnan’a Svalbard’a Svalbard’a";

  assert.deepEqual(
    splitDictionaryText(text).filter((part) => part.trim()),
    [
      "Norveç’in",
      "Svalbard’daki",
      "Suriye’deki",
      "Lübnan’a",
      "Svalbard’a",
      "Svalbard’a",
    ],
  );
});

test("reading dictionary normalizes apostrophe variants like the backend", () => {
  assert.equal(normalizeWordKey("Türkiye’nin"), "türkiye nin");
  assert.equal(normalizeWordKey("Türkiye'nin"), "türkiye nin");
  assert.equal(normalizeWordKey("E-POSTA"), "e posta");

  const text = "Türkiye’nin tarihi ile Türkiye'nin ekonomisi";
  assert.equal(wordOccurrenceAt(text, "Türkiye'nin", 0), 1);
  assert.equal(
    wordOccurrenceAt(text, "Türkiye’nin", text.lastIndexOf("Türkiye")),
    2,
  );
});
