import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const store = await loadOfflineComponent('src/services/speakingPracticeDraft.store.ts');
const scope = owner => store.speakingPracticeDraftScope(owner, 'speaking-1', undefined, ['q-1']);
const draft = () => ({ version: 1, runId: 'saved-run', questionIndex: 1, updatedAt: Date.now(), recordings: {
  'q-1': { blob: new Blob(['original synthetic audio bytes'], { type: 'audio/webm' }), durationSeconds: 12 },
} });

test('browser-storage fallback restores audio bytes and the same evaluation run without copying to another owner or content', async () => {
  sessionStorage.clear();
  assert.equal(await store.saveSpeakingPracticeDraft(scope('a'), draft()), true);
  const restored = await store.loadSpeakingPracticeDraft(scope('a'));
  assert.equal(await restored.recordings['q-1'].blob.text(), 'original synthetic audio bytes');
  assert.equal(restored.runId, 'saved-run');
  assert.equal(restored.recordings['q-1'].durationSeconds, 12);
  assert.equal(await store.loadSpeakingPracticeDraft(scope('b')), null);
  assert.equal(await store.loadSpeakingPracticeDraft(store.speakingPracticeDraftScope('a', 'speaking-2', undefined, ['q-1'])), null);
  assert.equal(await store.loadSpeakingPracticeDraft(store.speakingPracticeDraftScope('a', 'speaking-1', 'another-context', ['q-1'])), null);
});

test('restart deletion waits for an in-flight audio write and does not resurrect the old run', async () => {
  sessionStorage.clear();
  const pending = store.saveSpeakingPracticeDraft(scope('a'), draft());
  const deleted = store.deleteSpeakingPracticeDraft(scope('a'));
  await Promise.all([pending, deleted]);
  assert.equal(await store.loadSpeakingPracticeDraft(scope('a')), null);
});

test('logout cleanup deletes only the leaving account audio drafts', async () => {
  sessionStorage.clear();
  await store.saveSpeakingPracticeDraft(scope('a'), draft());
  await store.saveSpeakingPracticeDraft(scope('b'), draft());
  await store.clearSpeakingPracticeDrafts('a');
  assert.equal(await store.loadSpeakingPracticeDraft(scope('a')), null);
  assert.equal((await store.loadSpeakingPracticeDraft(scope('b'))).runId, 'saved-run');
});
