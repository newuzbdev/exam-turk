import assert from "node:assert/strict";
import test from "node:test";
import { act, fakeWindowClock, loadOfflineComponent, mount } from "./helpers/offline-react.mjs";

const mediaState = new WeakMap();
const state = (audio) => {
  if (!mediaState.has(audio)) mediaState.set(audio, { paused: true, pauses: 0, fail: false });
  return mediaState.get(audio);
};
const mediaPrototype = window.HTMLMediaElement.prototype;
Object.defineProperty(mediaPrototype, "paused", { configurable: true, get() { return state(this).paused; } });
mediaPrototype.play = function () {
  if (state(this).fail) return Promise.reject(new Error("Playback unavailable"));
  const wasPaused = state(this).paused;
  state(this).paused = false;
  if (wasPaused) this.dispatchEvent(new Event("play"));
  return Promise.resolve();
};
mediaPrototype.pause = function () {
  const wasPaused = state(this).paused;
  state(this).paused = true;
  state(this).pauses += 1;
  if (!wasPaused) this.dispatchEvent(new Event("pause"));
};
HTMLElement.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => "blob:offline-listening";
URL.revokeObjectURL = () => {};

const { default: ListeningTranscriptEvidenceView } = await loadOfflineComponent(
  "src/components/results/ListeningTranscriptEvidenceView.tsx",
  {
    "@/services/overallTest.service": { overallTestService: { getListeningEvidenceAudioBlob: async () => new Blob(["audio"]) } },
    "@/config/runtime": { toApiUrl: (url) => url },
    "@/utils/mediaProtection": { protectedImageProps: () => ({}) },
  },
);
const firstSentence = "Birinci cümle.";
const secondSentence = "İkinci cümle.";
const sourceText = `${firstSentence} ${secondSentence}`;
const section = (partNumber, number) => ({
  sectionId: `section-${partNumber}`, partNumber, sourceText,
  questions: [{
    questionId: `q${number}`, number, partNumber, text: "Uygun cevabı seçin.", userAnswer: "A", isCorrect: true,
    answers: [{ variantText: "A", text: "Uygun cevap", correct: true }, { variantText: "B", text: "Diğer cevap", correct: false }],
    evidenceText: "Birinci", textStart: 0, textEnd: 7, audioStartMs: 1000, audioEndMs: 1500,
    explanation: `S${number} cevabının açıklaması.`,
  }],
  transcriptSegments: [
    { text: firstSentence, textStart: 0, textEnd: firstSentence.length, audioStartMs: 1000, audioEndMs: 2000 },
    { text: secondSentence, textStart: firstSentence.length + 1, textEnd: sourceText.length, audioStartMs: 3000, audioEndMs: 4000 },
  ],
});
const review = { sections: [section(1, 1), section(2, 9)] };

async function setup() {
  const clock = fakeWindowClock();
  const view = await mount(ListeningTranscriptEvidenceView, { props: { resultId: "result-1", review, onClose: () => {} } });
  const audio = view.container.querySelector("audio");
  assert.ok(audio, "The real review should load its audio element");
  const sentences = () => [...view.container.querySelectorAll(".listening-transcript-sentence-group")];
  return { ...view, audio, clock, sentences, async dispose() { await view.unmount(); clock.restore(); } };
}

test("part one keeps explanations accessible without quote marks and plays only the clicked sentence while paused", async () => {
  const view = await setup();
  try {
    assert.equal(view.container.querySelectorAll(".listening-transcript-evidence-label").length, 0);
    const explanation = view.container.querySelector("[data-listening-question-explanation]");
    assert.ok(explanation);
    await act(async () => explanation.click());
    assert.ok(view.container.textContent.includes("S1 cevabının açıklaması."));
    await act(async () => view.sentences()[0].click());
    assert.equal(view.audio.currentTime, 1);
    assert.equal(view.audio.paused, false);
    view.audio.currentTime = 1.9;
    await view.clock.advance(16);
    assert.equal(view.audio.paused, false);
    view.audio.currentTime = 2.03;
    await view.clock.advance(16);
    assert.equal(view.audio.paused, true);
    assert.equal(view.audio.currentTime, 2);
  } finally { await view.dispose(); }
});

test("clicking another sentence during a short preview replaces the clip and still stops at its end", async () => {
  const view = await setup();
  try {
    await act(async () => view.sentences()[0].click());
    await act(async () => view.sentences()[1].click());
    assert.equal(view.audio.currentTime, 3);
    view.audio.currentTime = 4.03;
    await view.clock.advance(16);
    assert.equal(view.audio.paused, true);
    assert.equal(view.audio.currentTime, 4);
  } finally { await view.dispose(); }
});

test("playback already started with the main controls continues beyond the selected sentence", async () => {
  const view = await setup();
  try {
    await act(async () => view.audio.play());
    await act(async () => view.sentences()[0].click());
    assert.equal(view.audio.currentTime, 1);
    view.audio.currentTime = 2.5;
    await act(async () => view.audio.dispatchEvent(new Event("timeupdate")));
    await view.clock.advance(32);
    assert.equal(view.audio.paused, false);
    assert.equal(view.audio.currentTime, 2.5);
  } finally { await view.dispose(); }
});

test("pausing a preview and pressing the main play control resumes continuous playback without the old stop point", async () => {
  const view = await setup();
  try {
    await act(async () => view.sentences()[0].click());
    await act(async () => view.audio.pause());
    await act(async () => view.audio.play());
    view.audio.currentTime = 2.5;
    await act(async () => view.audio.dispatchEvent(new Event("timeupdate")));
    await view.clock.advance(32);
    assert.equal(view.audio.paused, false);
  } finally { await view.dispose(); }
});

test("other parts keep their evidence links and use the full sentence boundary rather than a partial quote's end", async () => {
  const view = await setup();
  try {
    const partButton = [...view.container.querySelectorAll("button")].find((button) => button.textContent === "Bölüm 2");
    await act(async () => partButton.click());
    const evidence = view.container.querySelector(".listening-transcript-evidence-label");
    assert.ok(evidence);
    await act(async () => evidence.click());
    view.audio.currentTime = 1.75;
    await act(async () => view.audio.dispatchEvent(new Event("timeupdate")));
    assert.equal(view.audio.paused, false);
    view.audio.currentTime = 2.05;
    await act(async () => view.audio.dispatchEvent(new Event("timeupdate")));
    assert.equal(view.audio.paused, true);
    assert.equal(view.audio.currentTime, 2);
  } finally { await view.dispose(); }
});

test("a rejected play and closing the review clear the sentence watcher", async () => {
  const view = await setup();
  state(view.audio).fail = true;
  await act(async () => view.sentences()[0].click());
  assert.equal(view.audio.paused, true);
  state(view.audio).fail = false;
  await act(async () => view.audio.play());
  view.audio.currentTime = 2.5;
  await act(async () => view.audio.dispatchEvent(new Event("timeupdate")));
  assert.equal(view.audio.paused, false);
  await view.dispose();
  assert.equal(view.audio.paused, true);
  const pauses = state(view.audio).pauses;
  view.audio.dispatchEvent(new Event("timeupdate"));
  assert.equal(state(view.audio).pauses, pauses);
});

test("practice review loads its own audio without a mock result and keeps explanation opt-in", async () => {
  const clock = fakeWindowClock();
  const practiceReview = { sections: [section(4, 1)] };
  const view = await mount(ListeningTranscriptEvidenceView, { props: { review: practiceReview, practice: { audioUrl: '/practice-audio.mp3', correct: 1, total: 1 }, onClose: () => {} } });
  try {
    const audio = view.container.querySelector('audio');
    assert.equal(audio?.getAttribute('src'), '/practice-audio.mp3');
    assert.ok(view.container.querySelector('[aria-label="1 / 1 doğru"]'));
    assert.ok(audio.closest('header'), 'Practice audio stays inside the navbar');
    assert(!view.container.textContent.includes('Vurgulu cümleye dokunarak'));
    assert(!view.container.textContent.includes('S1 cevabının açıklaması.'));
    const evidence = view.container.querySelector('.listening-transcript-evidence-label');
    assert.ok(evidence);
    await act(async () => evidence.click());
    assert.equal(audio.currentTime, 1);
    assert.equal(audio.paused, false);
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    const explanation = view.container.querySelector('[data-listening-question-explanation]');
    assert.equal(explanation.textContent, 'Neden?');
    await act(async () => explanation.click());
    assert(view.container.textContent.includes('S1 cevabının açıklaması.'));
  } finally { await view.unmount(); clock.restore(); }
});

test("practice dictionary opens the reading-style meaning card without triggering sentence playback", async () => {
  const clock = fakeWindowClock();
  const view = await mount(ListeningTranscriptEvidenceView, { props: {
    review: { sections: [section(4, 1)] },
    practice: { audioUrl: '/practice-audio.mp3', correct: 1, total: 1, glossarySections: [{ sectionId: 'section-4', entries: [{ term: 'Birinci', baseForm: 'birinci', baseMeaning: 'Sıralamada ilk gelen.', definition: 'Sıralamada ilk gelen.' }] }] },
    onClose: () => {},
  } });
  try {
    const audio = view.container.querySelector('audio');
    await act(async () => view.container.querySelector('[aria-label="Sözlük"]').click());
    const word = view.container.querySelector('.practice-dictionary-word');
    assert.ok(word);
    assert.equal(word.closest('.listening-transcript-sentence-group'), null);
    await act(async () => word.click());
    assert.equal(audio.paused, true);
    assert.equal(audio.currentTime, 0);
    const card = view.container.querySelector('aside[aria-label="Sözlük"]');
    assert.match(card.textContent, /Temel biçim: birinci/);
    assert.match(card.textContent, /Sıralamada ilk gelen/);
    await act(async () => view.container.querySelector('[aria-label="Sözlük"]').click());
    assert.equal(view.container.querySelector('.practice-dictionary-word'), null);
    assert.ok(view.container.querySelector('.listening-transcript-sentence-group'));
  } finally { await view.unmount(); clock.restore(); }
});
