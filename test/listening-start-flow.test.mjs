import assert from 'node:assert/strict';
import test from 'node:test';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const preparation = await loadOfflineComponent('src/services/listeningPreparation.store.ts');
const { AudioPlayer } = await loadOfflineComponent('src/pages/listening-test/components/AudioPlayer.tsx');
const mediaPrototype = window.HTMLMediaElement.prototype;
const originalMedia = Object.fromEntries(['load', 'play', 'pause'].map(key => [key, mediaPrototype[key]]));
const played = [];
mediaPrototype.load = function () {};
mediaPrototype.play = function () { played.push(this); return Promise.resolve(); };
mediaPrototype.pause = function () {};
test.after(() => Object.assign(mediaPrototype, originalMedia));

test('prepared exam audio becomes ready only after the actual native player can play', async () => {
  assert.equal(typeof preparation.prepareListeningAudioPlayback, 'function', 'the warning page needs a reusable prepared audio player');
  const originalCreate = document.createElement.bind(document);
  let audio;
  document.createElement = function (name, options) {
    const element = originalCreate(name, options);
    if (name === 'audio') audio = element;
    return element;
  };
  try {
    let ready = false;
    const pending = preparation.prepareListeningAudioPlayback(new Blob(['exam-audio'])).then(value => { ready = true; return value; });
    await Promise.resolve();
    assert.equal(ready, false);
    assert.equal(played.length, 0, 'preparation must stay silent');
    audio.dispatchEvent(new Event('canplay'));
    const playback = await pending;
    assert.ok(playback.audio === audio, 'use the prepared native audio element');
    playback.dispose();
  } finally { document.createElement = originalCreate; }
});

test('prepared audio ownership transfers without stopping the player or resetting the start deadline', () => {
  const disposeCalls = [];
  const playback = { audio: document.createElement('audio'), objectUrl: 'blob:test', dispose: () => disposeCalls.push('disposed') };
  preparation.listeningPreparationStore.set('listening-transfer', 'local-token', { requiresStart: true }, new Blob(['audio']), playback);
  assert.equal(preparation.listeningPreparationStore.markStartRequested('listening-transfer', 'local-token'), true);
  const deadline = preparation.listeningPreparationStore.get('listening-transfer', 'local-token').startAtMs;
  assert.ok(deadline >= Date.now() + 2900 && deadline <= Date.now() + 3000);
  assert.equal(typeof preparation.listeningPreparationStore.take, 'function', 'the exam must take ownership of its prepared player');
  preparation.listeningPreparationStore.markStartRequested('listening-transfer', 'local-token');
  assert.equal(preparation.listeningPreparationStore.get('listening-transfer', 'local-token').startAtMs, deadline, 'a repeated request must not reset the countdown');
  const taken = preparation.listeningPreparationStore.take('listening-transfer', 'local-token');
  assert.ok(taken.playback === playback, 'transfer player ownership');
  assert.equal(taken.startAtMs, deadline);
  assert.equal(preparation.listeningPreparationStore.get('listening-transfer', 'local-token'), null);
  assert.deepEqual(disposeCalls, []);
});

test('a prepared native player starts once at 3 seconds and keeps its identity across timer activation', async () => {
  const now = Date.now();
  const audio = document.createElement('audio');
  audio.src = '/prepared-exam.mp3';
  Object.defineProperty(audio, 'readyState', { value: 3 });
  let activated = 0;
  const view = await mount(AudioPlayer, { props: {
    src: '/prepared-exam.mp3', preparedAudioElement: audio, startAtMs: now + 3000,
    autoPlay: true, manualStartRequired: true,
    onBeforeManualStart: async () => { activated += 1; }, onAudioEnded() {},
  } });
  try {
    assert.ok(view.container.querySelector('audio') === audio, 'do not create another locked audio element');
    await act(async () => new Promise(resolve => setTimeout(resolve, 2800)));
    assert.equal(played.filter(value => value === audio).length, 0);
    assert.equal(activated, 0);
    await act(async () => new Promise(resolve => setTimeout(resolve, 400)));
    assert.equal(played.filter(value => value === audio).length, 1);
    assert.equal(activated, 1, 'the server timer starts with playback, not during the 3 second delay');
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)));
    assert.equal(activated, 1);
  } finally { await view.unmount(); }
});

test('leaving before the delayed start does not play audio or start the exam timer', async () => {
  const audio = document.createElement('audio');
  let activated = false;
  const view = await mount(AudioPlayer, { props: {
    src: '/cancelled.mp3', preparedAudioElement: audio, startAtMs: Date.now() + 3000,
    autoPlay: true, manualStartRequired: true,
    onBeforeManualStart: async () => { activated = true; }, onAudioEnded() {},
  } });
  await view.unmount();
  await new Promise(resolve => setTimeout(resolve, 3100));
  assert.equal(played.includes(audio), false);
  assert.equal(activated, false);
});

test('the real warning page waits for preparation and navigates without starting the listening timer early', async () => {
  const prepared = deferred();
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'readyState', { value: 3 });
  let pendingSection = { next: { testType: 'LISTENING', testId: 'warning-test', path: '/listening-test/warning-test' }, totalCount: 1, completedCount: 0 };
  let timerStarts = 0;
  const playback = { audio, objectUrl: 'blob:warning', unlockFromUserGesture: async () => {}, dispose() {} };
  const preparedSection = { serverNow: new Date().toISOString(), testType: 'LISTENING', status: 'NOT_STARTED', requiresStart: true, audioDurationSeconds: 30, reviewDurationSeconds: 600 };
  const { default: Ready } = await loadOfflineComponent('src/pages/test/OverallSectionReadyPage.tsx', {
    '@/hooks/use-overall-section-heartbeat': { useOverallSectionHeartbeat() {} },
    '@/services/overallTest.service': {
      overallTestFlowStore: { getPendingNextSection: () => pendingSection, clearPendingNextSection: () => { pendingSection = null; } },
      overallTestTokenStore: { getByTestId: () => 'warning-local-token' },
      overallTestService: { prepareSectionForTest: () => prepared.promise, preloadListeningAudioForTest: async () => new Blob(['audio']), startSectionTimerForTest: async () => { timerStarts += 1; } },
      getOverallSectionTimerErrorMessage: error => error.message,
    },
    '@/services/listeningPreparation.store': { ...preparation, prepareListeningAudioPlayback: async () => playback, verifyListeningAudioBlob: async () => {} },
    './components/ListeningSoundCheck': { default: ({ onReadyChange }) => { React.useEffect(() => { onReadyChange(true); }, [onReadyChange]); return null; } },
    '@/utils/examFullscreen': { getExamFullscreenElement: () => null, clearExamPresentation: async () => true, activateExamPresentation() {}, requestExamFullscreen: async () => true },
  });
  const view = await mount(Ready);
  try {
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
    const startButton = () => [...view.container.querySelectorAll('button')].find(button => /Sınava başla|Ses hazırlanıyor/.test(button.textContent));
    assert.equal(startButton().disabled, true);
    await act(async () => prepared.resolve(preparedSection));
    assert.equal(startButton().disabled, false);
    await act(async () => startButton().click());
    assert.equal(timerStarts, 0, 'the 3 second delay must not consume listening or review time');
    const entry = preparation.listeningPreparationStore.get('warning-test', 'warning-local-token');
    assert.equal(entry.startRequested, true);
    assert.ok(entry.playback === playback, 'retain the prepared player');
  } finally { await view.unmount(); preparation.listeningPreparationStore.clear('warning-test'); }
});

const timerMath = await loadOfflineComponent('src/services/overallTest.service.ts');
async function listeningFixture({ id, requiresStart = true, width = 390 } = {}) {
  const mediaQueries = [];
  window.matchMedia = query => {
    const listeners = new Set();
    const media = { get matches() { return query.includes('min-width') ? width >= 1024 : width <= 767; }, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener), addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener) };
    mediaQueries.push({ media, listeners });
    return media;
  };
  const resize = async nextWidth => { width = nextWidth; await act(async () => mediaQueries.forEach(({ media, listeners }) => listeners.forEach(listener => listener(media)))); };
  const stats = { timerStarts: 0, downloads: 0, pending: null };
  const preparedSection = { serverNow: new Date().toISOString(), status: requiresStart ? 'NOT_STARTED' : 'IN_PROGRESS', testType: 'LISTENING', requiresStart, phase: requiresStart ? undefined : 'REVIEW', audioDurationSeconds: 30, reviewDurationSeconds: 600, remainingReviewSeconds: 600, remainingSeconds: 600 };
  const { default: Listening } = await loadOfflineComponent('src/components/listening-test/ListeningTestDemo.tsx', {
    '@/hooks/use-overall-section-heartbeat': { useOverallSectionHeartbeat() {} },
    '@/services/listeningPreparation.store': preparation,
    '@/services/listeningTest.service': {
      listeningTestService: { getTestWithFullData: async () => ({ id, title: 'Offline listening test', audioUrl: null, parts: [{ number: 1, sections: [{ questions: [{ id: 'question-1', number: 1, type: 'MULTIPLE_CHOICE', text: 'Dinlediğiniz konuşmanın konusu nedir?', answers: [{ id: 'a', variantText: 'A', answer: 'Okul' }, { id: 'b', variantText: 'B', answer: 'İş' }] }] }] }] }) },
      listeningSubmissionService: { getSessionResult: async () => null, getDraft: async () => ({ answers: {} }) },
    },
    '@/services/overallTest.service': {
      createBackendSyncedTimerState: timerMath.createBackendSyncedTimerState,
      getBackendSyncedRemainingSeconds: timerMath.getBackendSyncedRemainingSeconds,
      getOverallSectionTimerErrorCode: () => null,
      getOverallSectionTimerErrorMessage: error => error.message,
      overallTestTokenStore: { getByTestId: () => 'offline-listening-session' },
      overallTestFlowStore: {
        getOverallId: () => null, hasActive: () => true,
        getQueue: () => [{ testType: 'LISTENING', testId: id, path: `/listening-test/${id}` }],
        getInitialCount: () => 1,
        setPendingNextSection: value => { stats.pending = value; },
      },
      overallTestService: {
        prepareSectionForTest: async () => preparedSection,
        preloadListeningAudioForTest: async () => { stats.downloads += 1; throw new Error('Prepared audio must not be downloaded again'); },
        startSectionTimerForTest: async () => {
          stats.timerStarts += 1;
          const now = new Date().toISOString();
          return { ...preparedSection, phase: 'AUDIO', requiresStart: false, serverNow: now, audioStartedAt: now, audioEndsAt: new Date(Date.now() + 30_000).toISOString(), remainingAudioSeconds: 30, remainingSeconds: 630 };
        },
      },
    },
  });
  return { Listening, stats, preparedSection, resize };
}

for (const width of [390, 1440]) {
  test(`the real listening exam at ${width}px shows questions immediately and starts its timer once after the delay`, async () => {
    const id = `handoff-${width}`;
    const { Listening, stats, preparedSection } = await listeningFixture({ id, width });
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'readyState', { value: 3 });
    const paused = [];
    audio.pause = () => paused.push('pause');
    let disposed = 0;
    preparation.listeningPreparationStore.set(id, 'offline-listening-session', preparedSection, new Blob(['fixture']), { audio, objectUrl: `blob:${id}`, unlockFromUserGesture: async () => {}, dispose: () => { disposed += 1; } });
    preparation.listeningPreparationStore.markStartRequested(id, 'offline-listening-session');
    const view = await mount(Listening, { props: { testId: id } });
    try {
      assert.match(view.container.textContent, /Dinlediğiniz konuşmanın konusu nedir/);
      assert.doesNotMatch(view.container.textContent, /Dinleme sınavı hazır|Dinleme sınavını başlat/);
      assert.ok(view.container.querySelector('audio') === audio);
      assert.equal(stats.downloads, 0);
      assert.equal(stats.timerStarts, 0);
      assert.match(view.container.textContent, /Ses 3 saniye sonra başlayacak/);
      await act(async () => new Promise(resolve => setTimeout(resolve, 3100)));
      assert.equal(played.filter(value => value === audio).length, 1);
      assert.equal(stats.timerStarts, 1);
      assert.equal(paused.length, 0, 'timer-state updates must not pause the player');
      assert.equal(disposed, 0);
      assert.ok(view.container.querySelector('audio') === audio);
      assert.doesNotMatch(view.container.textContent, /Ses \d saniye sonra başlayacak/);
    } finally { await view.unmount(); }
    assert.equal(disposed, 1, 'release the transferred player on exit');
  });
}

test('a direct link to an unstarted listening attempt returns to the original warning without starting or downloading audio', async () => {
  const { Listening, stats } = await listeningFixture({ id: 'direct-unstarted' });
  const view = await mount(Listening, { props: { testId: 'direct-unstarted' } });
  try {
    assert.equal(stats.pending.next.path, '/listening-test/direct-unstarted');
    assert.equal(stats.pending.next.testType, 'LISTENING');
    assert.equal(stats.timerStarts, 0);
    assert.equal(stats.downloads, 0);
    assert.equal(view.container.querySelector('audio'), null);
    assert.doesNotMatch(view.container.textContent, /Dinleme sınavı hazır|Dinleme sınavını başlat/);
  } finally { await view.unmount(); }
});

test('resuming the existing review phase neither restarts audio nor spends its 10 minute allowance', async () => {
  const { Listening, stats } = await listeningFixture({ id: 'resume-review', requiresStart: false });
  const view = await mount(Listening, { props: { testId: 'resume-review' } });
  try {
    assert.equal(stats.timerStarts, 0);
    assert.equal(stats.downloads, 0);
    assert.equal(view.container.querySelector('audio'), null);
    assert.match(view.container.textContent, /10:00/);
    assert.match(view.container.textContent, /10 dakikalık kontrol süresi başladı/);
  } finally { await view.unmount(); }
});

test('a browser playback refusal keeps the exam timer stopped and exposes one inline retry', async () => {
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'readyState', { value: 3 });
  let refused = true, attempts = 0, timerStarts = 0;
  audio.play = async () => { attempts += 1; if (refused) throw new DOMException('User gesture required', 'NotAllowedError'); };
  const view = await mount(AudioPlayer, { props: {
    src: '/refused.mp3', preparedAudioElement: audio, startAtMs: Date.now() + 50,
    autoPlay: true, manualStartRequired: true,
    onBeforeManualStart: async () => { timerStarts += 1; }, onAudioEnded() {},
  } });
  try {
    await act(async () => new Promise(resolve => setTimeout(resolve, 150)));
    assert.equal(timerStarts, 0);
    assert.equal(attempts, 1);
    assert.match(view.container.textContent, /Ses başlatılmayı bekliyor/);
    const retry = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Sesi başlat');
    assert.ok(retry, 'retry remains available without another start page');
    refused = false;
    await act(async () => retry.click());
    assert.equal(timerStarts, 1);
    assert.equal(attempts, 2);
  } finally { await view.unmount(); }
});

test('a failed timer activation pauses prepared audio and allows a safe inline retry', async () => {
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'readyState', { value: 3 });
  let activations = 0, pauses = 0;
  audio.pause = () => { pauses += 1; };
  const view = await mount(AudioPlayer, { props: {
    src: '/activation-error.mp3', preparedAudioElement: audio, startAtMs: Date.now() + 50,
    autoPlay: true, manualStartRequired: true,
    onBeforeManualStart: async () => { activations += 1; if (activations === 1) throw new Error('Offline'); }, onAudioEnded() {},
  } });
  try {
    await act(async () => new Promise(resolve => setTimeout(resolve, 150)));
    assert.equal(activations, 1);
    assert.equal(pauses, 1);
    assert.equal(audio.currentTime, 0);
    const retry = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Yeniden dene');
    assert.ok(retry);
    await act(async () => retry.click());
    assert.equal(activations, 2);
    assert.equal(played.filter(value => value === audio).length, 2);
  } finally { await view.unmount(); }
});

test('switching responsive headers retains the playing native element, its position and the active server timer', async () => {
  const id = 'responsive-audio';
  const { Listening, stats, preparedSection, resize } = await listeningFixture({ id });
  const audio = document.createElement('audio');
  let paused = true, plays = 0, pauses = 0;
  Object.defineProperty(audio, 'readyState', { value: 3 });
  Object.defineProperty(audio, 'paused', { get: () => paused });
  audio.play = async () => { paused = false; plays += 1; };
  audio.pause = () => { paused = true; pauses += 1; };
  preparation.listeningPreparationStore.set(id, 'offline-listening-session', preparedSection, new Blob(['fixture']), { audio, objectUrl: `blob:${id}`, unlockFromUserGesture: async () => {}, dispose() { audio.pause(); } });
  preparation.listeningPreparationStore.markStartRequested(id, 'offline-listening-session');
  const view = await mount(Listening, { props: { testId: id } });
  try {
    await act(async () => new Promise(resolve => setTimeout(resolve, 3100)));
    assert.equal(stats.timerStarts, 1);
    assert.equal(plays, 1);
    audio.currentTime = 18;
    await resize(1440);
    assert.ok(view.container.querySelector('audio') === audio);
    assert.equal(audio.currentTime, 18);
    assert.equal(pauses, 0);
    assert.equal(plays, 1);
    await resize(390);
    assert.equal(audio.currentTime, 18);
    assert.equal(pauses, 0);
    assert.equal(stats.timerStarts, 1);
  } finally { await view.unmount(); }
});
