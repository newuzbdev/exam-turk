import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { useNavigate } from 'react-router-dom';
import { React, Routes, Route, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
import { speakingPractice, speakingEvaluation } from './fixtures/speaking-practice-fixture.mjs';
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;
let owner = 'speaking-return-owner', member = false, serial = 0, lostResponse = false, denialCode = 'MEMBERSHIP_REQUIRED', forcedDenial = false;
const acceptedRuns = new Map();
const sessions = [], evaluations = [];
const open = { canOpen: true, isPublicFree: true, sourceKind: 'PUBLIC', remaining: { PRACTICE_AI: 0 }, blockedReason: null, endsAt: null };
const accessService = {
  getConfig: async () => ({ enabled: true }),
  getDecisions: async (targets, mode) => targets.map(target => ({ ...open, target,
    ...(mode === 'PAID' ? { canOpen: member, sourceKind: 'PAID', remaining: { PRACTICE_AI: member ? 2 : 0 }, blockedReason: member ? null : 'MEMBERSHIP_REQUIRED' } : {}),
  })),
  createSession: async (target, input = {}) => {
    const contextId = `normal-context-${++serial}`;
    sessions.push({ target, input, contextId });
    return { contextId, decision: open };
  },
};
const mocks = {
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: owner }, isAuthenticated: true }) },
  '@/hooks/use-billing-purchases': { useBillingPurchases: () => ({ data: [], isPending: false }) },
  '@/services/access.service': { accessService },
  '@/services/speakingPractice.service': { default: {
    list: async () => [{ ...speakingPractice, isFreeAccess: false, isPublicFree: true, isPublished: true, level: 'B1', estimatedMinutes: 20, createdAt: '2026-10-18' }],
    solve: async () => ({ ...structuredClone(speakingPractice), isFreeAccess: false, accessDecision: open }),
    getEvaluation: async (_id, runId) => {
      const attempt = acceptedRuns.get(runId);
      if (!attempt) throw { response: { status: 404 } };
      if (attempt.unavailable) throw new Error('status transport unavailable');
      return attempt;
    },
    evaluate: async (...args) => {
      evaluations.push(args);
      const durable = await draftStore.recoverSpeakingPracticeDraft(draftStore.speakingPracticeDraftScope(owner, args[0], sessions.at(-1).contextId, questions));
      assert.equal(durable.draft.runId, args[1]);
      assert.deepEqual(durable.draft.assessmentAttempt, { state: 'UNKNOWN', accessContextId: args[3].accessContextId }, 'original retry identity is durable before dispatch');
      if (lostResponse) {
        acceptedRuns.set(args[1], { status: 'COMPLETED', accessContextId: args[3].accessContextId, result: structuredClone(speakingEvaluation) });
        throw new Error('accepted response lost');
      }
      if (forcedDenial) { forcedDenial = false; throw { response: { status: 402, data: { message: 'AI_LIMIT' } } }; }
      if (!member) throw { response: { status: 402, data: { message: denialCode } } };
      return structuredClone(speakingEvaluation);
    },
  } },
  '@/services/writingPractice.service': { default: { list: async () => [] } },
  '@/services/listeningPractice.service': { default: { list: async () => [] } },
  '@/utils/examAudio': { ExamAudioController: class { async unlockFromUserGesture() { return true; } async playCue() {} async destroy() {} } },
};
const { default: List } = await loadOfflineComponent('src/components/practice/PracticeList.tsx', mocks);
const { default: Speaking } = await loadOfflineComponent('src/pages/speaking-practice/SpeakingPracticeTest.tsx', mocks);
const flush = () => act(async () => new Promise(resolve => setTimeout(resolve, 20)));
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function PricingBoundary() {
  const navigate = useNavigate();
  return React.createElement('button', { onClick: () => { member = true; navigate('/app/pratik'); } }, 'Abonelik sonrası kataloğa dön');
}
function Harness({ client }) {
  return React.createElement(QueryClientProvider, { client }, React.createElement(Routes, null,
    React.createElement(Route, { path: '/app/pratik', element: React.createElement(List, { domain: 'SPEAKING' }) }),
    React.createElement(Route, { path: '/app/pratik/konusma/:id', element: React.createElement(Speaking) }),
    React.createElement(Route, { path: '/app/fiyatlar', element: React.createElement(PricingBoundary) }),
  ));
}
function installRecorder() {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
  globalThis.MediaRecorder = class {
    state = 'inactive'; mimeType = 'audio/webm'; constructor(stream) { this.stream = stream; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['owned synthetic answer'], { type: this.mimeType }) }); queueMicrotask(() => this.onstop?.()); }
  };
}
for (const rejectionCode of ['MEMBERSHIP_REQUIRED', 'AI_LIMIT']) test(`speaking subscribe return preserves audio and ${rejectionCode} assessment intent`, async () => {
  denialCode = rejectionCode;
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner);
  serial = 0; member = false; lostResponse = false; acceptedRuns.clear(); sessions.length = 0; evaluations.length = 0;
  installRecorder();
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:subscription-return'; URL.revokeObjectURL = () => {};
  window.HTMLMediaElement.prototype.pause = function () {};
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = await mount(Harness, { props: { client }, route: '/app/pratik' });
  const click = label => act(async () => view.container.querySelector(`[aria-label="${label}"]`).click());
  try {
    await flush(); await act(async () => view.container.querySelector('article').click()); await flush();
    for (let i = 0; i < 2; i++) { await click('Kaydı başlat'); await click('Kaydı bitir'); await flush(); if (!i) await click('Sonraki soru'); }
    const question = view.container.querySelector('h2').textContent;
    assert.match(view.container.textContent, /2\s*\/\s*2\s*cevap kaydedildi/);
    await act(async () => button('Değerlendir').click()); await flush();
    assert.match(document.querySelector('[role="dialog"]').textContent, /Cevaplarınız korunuyor/);
    await act(async () => button('Abone Ol').click());
    assert.ok(button('Abonelik sonrası kataloğa dön'));
    await act(async () => button('Abonelik sonrası kataloğa dön').click()); await flush();
    await act(async () => view.container.querySelector('article').click()); await flush();
    assert.equal(sessions.length, 2, 'the catalog still creates fresh normal admission');
    assert.deepEqual(sessions.map(value => value.input), [{}, {}], 'a saved draft must not authorize a share or paid session');
    assert.match(view.container.textContent, /2\s*\/\s*2\s*cevap kaydedildi/);
    assert.equal(view.container.querySelector('h2').textContent, question);
    await act(async () => button('Değerlendir').click()); await flush();
    if (rejectionCode === 'MEMBERSHIP_REQUIRED') {
      assert.equal(evaluations[1][3].accessContextId, 'normal-context-2');
      assert.notEqual(evaluations[1][1], evaluations[0][1], 'known membership denial can move to the fresh admission');
    } else {
      assert.equal(evaluations[1][3].accessContextId, evaluations[0][3].accessContextId, 'AI_LIMIT keeps the original free-only assessment context after catalog return');
      assert.equal(evaluations[1][1], evaluations[0][1]);
    }
    assert.deepEqual(await Promise.all(evaluations[1][2].map(recording => recording.blob.text())), ['owned synthetic answer', 'owned synthetic answer']);
  } finally { await view.unmount(); client.clear(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
});

const draftStore = await loadOfflineComponent('src/services/speakingPracticeDraft.store.ts');
const ownedPointers = await loadOfflineComponent('src/utils/access-link-context.ts');
const questions = ['question-1', 'question-2'];
const savedDraft = (runId, updatedAt = Date.now()) => ({ version: 1, runId, questionIndex: 1, updatedAt,
  assessmentAttempt: { state: 'UNSUBMITTED' }, paidAccessContextId: 'old-paid-context', recordings: Object.fromEntries(questions.map(key => [key, { blob: new Blob(['owned saved audio']), durationSeconds: 2 }])) });

test('speaking draft recovery matches owner, content and all question IDs, and keeps an exact admission draft first', async () => {
  sessionStorage.clear();
  const scope = (account, content, context, keys = questions) => draftStore.speakingPracticeDraftScope(account, content, context, keys);
  const original = scope(owner, 'speaking-practice-1', 'old-share-context');
  await draftStore.saveSpeakingPracticeDraft(original, savedDraft('original'));
  for (const unrelated of [scope('foreign-owner', 'speaking-practice-1', 'new'), scope(owner, 'other-content', 'new'), scope(owner, 'speaking-practice-1', 'new', ['question-1', 'different-question'])]) {
    assert.equal(await draftStore.recoverSpeakingPracticeDraft(unrelated), null);
  }
  const fresh = scope(owner, 'speaking-practice-1', 'new');
  assert.equal((await draftStore.recoverSpeakingPracticeDraft(fresh)).sourceScope, original);
  await draftStore.saveSpeakingPracticeDraft(fresh, savedDraft('current-admission', Date.now() - 500));
  assert.equal((await draftStore.recoverSpeakingPracticeDraft(fresh)).draft.runId, 'current-admission');
});

test('speaking catalog recovers owned SHARE audio as work only, clears old paid authority and does not resurrect completed audio', async () => {
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner);
  serial = 0; member = true; lostResponse = false; acceptedRuns.clear(); sessions.length = 0; evaluations.length = 0;
  const target = { scope: 'PRACTICE_SPEAKING', targetId: 'speaking-practice-1' };
  const original = draftStore.speakingPracticeDraftScope(owner, target.targetId, 'old-share-context', questions);
  await draftStore.saveSpeakingPracticeDraft(original, savedDraft('old-share-run'));
  ownedPointers.saveOwnedAccess(owner, target, { target, contextId: 'old-share-context', redemptionId: 'old-share-redemption' });
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:recovered-share-work'; URL.revokeObjectURL = () => {};
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = await mount(Harness, { props: { client }, route: '/app/pratik' });
  try {
    await flush(); await act(async () => view.container.querySelector('article').click()); await flush();
    assert.equal(sessions.length, 1);
    assert.deepEqual(sessions[0].input, {});
    assert.match(view.container.textContent, /2\s*\/\s*2\s*cevap kaydedildi/);
    assert.equal(view.container.querySelector('h2').textContent, 'Bu etkinliği neden seviyorsunuz?');
    await act(async () => button('Değerlendir').click()); await flush();
    assert.equal(evaluations[0][3].accessContextId, 'normal-context-1');
    assert.notEqual(evaluations[0][1], 'old-share-run');
    assert.deepEqual(await Promise.all(evaluations[0][2].map(recording => recording.blob.text())), ['owned saved audio', 'owned saved audio']);
    assert.equal(await draftStore.recoverSpeakingPracticeDraft(draftStore.speakingPracticeDraftScope(owner, target.targetId, 'another-normal-context', questions)), null);
  } finally { await view.unmount(); client.clear(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
});

for (const status of ['COMPLETED', 'PENDING', 'ABSENT', 'UNAVAILABLE', 'FAILED']) {
  test(`speaking catalog return preserves uncertain accepted run when status is ${status}`, async () => {
    sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner);
    installRecorder();
    serial = 0; member = true; lostResponse = true; acceptedRuns.clear(); sessions.length = 0; evaluations.length = 0;
    const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:accepted-return'; URL.revokeObjectURL = () => {};
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const view = await mount(Harness, { props: { client }, route: '/app/pratik' });
    const click = label => act(async () => view.container.querySelector(`[aria-label="${label}"]`).click());
    try {
      await flush(); await act(async () => view.container.querySelector('article').click()); await flush();
      for (let i = 0; i < 2; i++) { await click('Kaydı başlat'); await click('Kaydı bitir'); await flush(); if (!i) await click('Sonraki soru'); }
      await act(async () => button('Değerlendir').click()); await flush();
      const original = evaluations[0];
      if (status === 'ABSENT') acceptedRuns.clear();
      else if (status === 'UNAVAILABLE') acceptedRuns.set(original[1], { unavailable: true });
      else if (status === 'PENDING' || status === 'FAILED') acceptedRuns.set(original[1], { status, accessContextId: original[3].accessContextId, result: null });
      await click('Çalışmadan çık'); await act(async () => button('Çık').click()); await flush();
      lostResponse = false;
      await act(async () => view.container.querySelector('article').click()); await flush();
      assert.equal(sessions.length, 2);
      assert.match(view.container.textContent, /2\s*\/\s*2\s*cevap kaydedildi/);
      if (status === 'COMPLETED') {
        assert.ok(button('Değerlendirildi'), 'the original cached result is restored');
        assert.equal(evaluations.length, 1, 'completed work does not send a new paid/provider request');
      } else {
        await act(async () => button('Değerlendir').click()); await flush();
        {
          assert.equal(evaluations[1][1], original[1], 'uncertain work retains its original run even before the first claim is visible');
          assert.equal(evaluations[1][3].accessContextId, original[3].accessContextId);
        }
        assert.deepEqual(await Promise.all(evaluations[1][2].map(recording => recording.blob.text())), await Promise.all(original[2].map(recording => recording.blob.text())));
      }
    } finally { await view.unmount(); client.clear(); lostResponse = false; acceptedRuns.clear(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
  });
}

test('speaking deliberate paid continuation rotates rejected free-only work after fresh PAID admission', async () => {
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner);
  installRecorder(); serial = 0; member = true; forcedDenial = true; lostResponse = false;
  acceptedRuns.clear(); sessions.length = 0; evaluations.length = 0;
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:explicit-paid-continuation'; URL.revokeObjectURL = () => {};
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = await mount(Harness, { props: { client }, route: '/app/pratik' });
  const click = label => act(async () => view.container.querySelector(`[aria-label="${label}"]`).click());
  try {
    await flush(); await act(async () => view.container.querySelector('article').click()); await flush();
    for (let i = 0; i < 2; i++) { await click('Kaydı başlat'); await click('Kaydı bitir'); await flush(); if (!i) await click('Sonraki soru'); }
    await act(async () => button('Değerlendir').click()); await flush();
    assert.ok(button('Üyeliğimle devam et'));
    await act(async () => button('Üyeliğimle devam et').click()); await flush();
    assert.deepEqual(sessions[1].input, { mode: 'PAID' });
    await act(async () => button('Değerlendir').click()); await flush();
    assert.notEqual(evaluations[1][1], evaluations[0][1]);
    assert.equal(evaluations[1][3].accessContextId, sessions[1].contextId);
    assert.deepEqual(await Promise.all(evaluations[1][2].map(recording => recording.blob.text())), await Promise.all(evaluations[0][2].map(recording => recording.blob.text())));
  } finally { await view.unmount(); client.clear(); forcedDenial = false; URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
});
