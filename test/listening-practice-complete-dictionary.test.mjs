import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
import { dictionaryWordPattern, normalizeWordKey } from '../src/pages/reading-practice/reading-practice-dictionary.ts';
const { PracticeDictionaryText } = await loadOfflineComponent('src/components/practice/PracticeDictionary.tsx');
for (const n of [1, 2]) test(`listening practice ${n}: every transcript word, including repeated common words, opens its own reading-style meaning`, async () => {
  const manifest = JSON.parse(readFileSync(new URL(`../../backend/scripts/data/listening-practice/pratik-${n}-part-4-20261016.json`, import.meta.url)));
  const section = manifest.practice.content.parts[0].sections[0];
  const words = Array.from(section.transcript.matchAll(dictionaryWordPattern), match => match[0]);
  const entries = section.glossaryEntries;
  let selected;
  const view = await mount(PracticeDictionaryText, { props: { text: section.transcript, source: section.transcript, offset: 0, entries, onSelect: entry => { selected = entry; } } });
  try {
    const buttons = [...view.container.querySelectorAll('button')];
    assert.equal(buttons.length, words.length);
    assert.equal(view.container.textContent, section.transcript);
    const counts = new Map();
    for (const [index, word] of words.entries()) {
      const key = normalizeWordKey(word);
      const occurrence = (counts.get(key) || 0) + 1;
      counts.set(key, occurrence);
      const entry = entries.find(candidate => normalizeWordKey(candidate.term) === key && candidate.occurrenceIndex === occurrence);
      assert.ok(entry, `${word}, use ${occurrence} is missing`);
      assert.equal(buttons[index].textContent, word);
      await act(async () => buttons[index].click());
      assert.deepEqual(selected, { term: word, baseForm: entry.baseForm, baseMeaning: entry.baseMeaning });
    }
    if (n === 1) {
      const uses = entries.filter(entry => normalizeWordKey(entry.term) === 'alan');
      assert.equal(uses[0].baseForm, 'alan');
      assert.equal(uses[1].baseForm, 'yer almak');
    }
  } finally { await view.unmount(); }
});
